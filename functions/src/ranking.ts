import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';
import { CollectionReference } from 'firebase-admin/firestore';
import { updateTrackScore, getRedisClient } from './redis';

if (admin.apps.length === 0) {
    admin.initializeApp();
}

const db = admin.firestore();
const TRACKS_COLLECTION: CollectionReference = db.collection('tracks');
const LEADERBOARDS_COLLECTION: CollectionReference = db.collection('leaderboards');


/**
 * Calculates the Wilson Score (Quality/Confidence Score).
 * Returns the lower bound of the Wilson confidence interval (0-100).
 * 
 * @param upvotes - Number of positive votes (FIRE votes)
 * @param total - Total number of votes
 * @returns Wilson score as a percentage (0-100)
 */
const calculateWilsonScore = (upvotes: number, total: number): number => {
    // Validation: Handle edge cases
    if (total === 0) return 0;
    if (upvotes < 0) {
        console.warn(`[Wilson] Negative upvotes (${upvotes}), clamping to 0`);
        upvotes = 0;
    }
    if (total < 0) {
        console.warn(`[Wilson] Negative total (${total}), returning 0`);
        return 0;
    }
    
    // Critical validation: fires cannot exceed total
    if (upvotes > total) {
        console.error(`[Wilson] Invalid: fires (${upvotes}) > total (${total}). Capping fires to total.`);
        upvotes = total; // Cap at total to prevent invalid calculation
    }
    
    const z = 1.96; // 95% confidence interval
    const phat = upvotes / total;
    
    // Calculate Wilson score lower bound
    // Formula: (p̂ + z²/(2n) - z√((p̂(1-p̂) + z²/(4n))/n)) / (1 + z²/n)
    const zSquared = z * z;
    const denominator = 1 + zSquared / total;
    const sqrtTerm = (phat * (1 - phat) + zSquared / (4 * total)) / total;
    
    // Guard against negative square root (shouldn't happen with valid inputs, but defensive)
    if (sqrtTerm < 0) {
        console.error(`[Wilson] Negative square root term: ${sqrtTerm}. Using phat as fallback.`);
        const fallbackScore = phat;
        return parseFloat((Math.max(0, Math.min(1, fallbackScore)) * 100).toFixed(2));
    }
    
    const numerator = phat + zSquared / (2 * total) - z * Math.sqrt(sqrtTerm);
    const score = numerator / denominator;
    
    // Clamp score to valid range (0-1) to handle any floating point errors
    const clampedScore = Math.max(0, Math.min(1, score));
    
    // Check for invalid values
    if (isNaN(clampedScore) || !isFinite(clampedScore)) {
        console.error(`[Wilson] Invalid score result: ${clampedScore} for upvotes=${upvotes}, total=${total}`);
        // Fallback to simple percentage if calculation fails
        return parseFloat((Math.max(0, Math.min(1, phat)) * 100).toFixed(2));
    }
    
    // Return as percentage (0-100) with 2 decimal precision for better ranking
    return parseFloat((clampedScore * 100).toFixed(2));
};

/**
 * Calculates the "Gravity Score" for trending.
 */
const calculateTrendScore = (wilsonScore: number, totalVotes: number, postedTime: admin.firestore.Timestamp): number => {
    const hoursSincePost = (Date.now() - postedTime.toMillis()) / (1000 * 60 * 60);
    
    const scoreComponent = wilsonScore * 10 + totalVotes; 
    const decayFactor = 1.5; 
    
    const timeComponent = Math.pow(hoursSincePost + 2, decayFactor);
    
    return scoreComponent / timeComponent;
};

/**
 * Extract cover URL from track data, checking all possible locations
 * Priority: metadata.cover > cover > meta.cover
 */
const extractCoverUrl = (data: any): string => {
    // Check all possible cover locations in priority order
    if (data?.metadata?.cover && typeof data.metadata.cover === 'string' && data.metadata.cover.trim().length > 0) {
        return data.metadata.cover;
    }
    if (data?.cover && typeof data.cover === 'string' && data.cover.trim().length > 0) {
        return data.cover;
    }
    if (data?.meta?.cover && typeof data.meta.cover === 'string' && data.meta.cover.trim().length > 0) {
        return data.meta.cover;
    }
    return '';
};

/**
 * Get ISO week number using the standard algorithm
 * Week 1 is the first week with at least 4 days in January
 */
const getISOWeekNumber = (date: Date): { year: number; week: number } => {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum); 
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return { year: d.getUTCFullYear(), week: weekNo };
};

/**
 * Generate period ID for charts (must match frontend calculation)
 */
const getPeriodId = (timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly', date?: Date): string => {
    const now = date || new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    switch (timeframe) {
        case 'weekly': {
            const { year: weekYear, week } = getISOWeekNumber(now);
            return `${weekYear}-W${week}`;
        }
        case 'monthly':
            return `${year}-${String(month).padStart(2, '0')}`;
        case 'yearly':
            return String(year);
        default:
            return now.toISOString().split('T')[0];
    }
};

/**
 * Get the start and end times for a period
 * For scheduled jobs: 
 * - Weekly runs Monday 00:00, captures previous Monday-Sunday
 * - Monthly runs 1st of month, captures previous month
 * - Yearly runs Jan 1st, captures previous year
 */
const getPeriodBounds = (timeframe: 'weekly' | 'monthly' | 'yearly'): { start: Date; end: Date; periodId: string } => {
    const now = new Date();
    const start = new Date();
    const end = new Date();

    switch (timeframe) {
        case 'weekly': {
            const dayOfWeek = now.getDay();
            const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1; 
            start.setDate(now.getDate() - daysToLastMonday - 7); 
            start.setHours(0, 0, 0, 0);
            
            end.setTime(start.getTime());
            end.setDate(start.getDate() + 6); 
            end.setHours(23, 59, 59, 999);
            
            const periodId = getPeriodId('weekly', start);
            return { start, end, periodId };
        }
        case 'monthly': {
            const prevMonth = new Date(now);
            prevMonth.setMonth(now.getMonth() - 1);
            
            start.setFullYear(prevMonth.getFullYear());
            start.setMonth(prevMonth.getMonth());
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            
            end.setFullYear(prevMonth.getFullYear());
            end.setMonth(prevMonth.getMonth() + 1);
            end.setDate(0); 
            end.setHours(23, 59, 59, 999);
            
            const periodId = getPeriodId('monthly', start);
            return { start, end, periodId };
        }
        case 'yearly': {
            const prevYear = now.getFullYear() - 1;
            
            start.setFullYear(prevYear);
            start.setMonth(0);
            start.setDate(1);
            start.setHours(0, 0, 0, 0);
            
            end.setFullYear(prevYear);
            end.setMonth(11);
            end.setDate(31);
            end.setHours(23, 59, 59, 999);
            
            const periodId = getPeriodId('yearly', start);
            return { start, end, periodId };
        }
    }
};

// --- CORE LOGIC: SNAPSHOT GENERATION (Long-term charts) ---

const generateSnapshot = async (timeframe: 'weekly' | 'monthly' | 'yearly', genre: string = 'global') => {
    const { start: startTime, end: endTime, periodId } = getPeriodBounds(timeframe);
    const chartId = `${genre}_${timeframe}_${periodId}`;
    
    let genreTrackIds: Set<string> | null = null;
    if (genre !== 'global') {
        const tracksQuery = TRACKS_COLLECTION.where('meta.genre', '==', genre);
        const tracksSnapshot = await tracksQuery.get();
        genreTrackIds = new Set(tracksSnapshot.docs.map(doc => doc.id));
        
        if (genreTrackIds.size === 0) {
            const emptyChart = {
                periodId,
                genre,
                type: timeframe.toUpperCase(),
                generatedAt: admin.firestore.FieldValue.serverTimestamp(),
                startTime: admin.firestore.Timestamp.fromDate(startTime),
                endTime: admin.firestore.Timestamp.fromDate(endTime),
                tracks: [],
            };
            await LEADERBOARDS_COLLECTION.doc(chartId).set(emptyChart);
            return;
        }
    }

    const votesRef = db.collection('votes');
    const votesQuery = votesRef
        .where('timestamp', '>=', startTime)
        .where('timestamp', '<=', endTime);
    const votesSnapshot = await votesQuery.get();
        
    const trackScores: { [trackId: string]: { fire: number; pass: number; total: number } } = {};
    votesSnapshot.forEach(doc => {
        const data = doc.data();
        const trackId = data.trackId;
        const voteType = data.voteType;

        if (genreTrackIds !== null && !genreTrackIds.has(trackId)) {
            return;
        }

        if (!trackScores[trackId]) {
            trackScores[trackId] = { fire: 0, pass: 0, total: 0 };
        }
        trackScores[trackId].total += 1;
        if (voteType === 'FIRE') {
            trackScores[trackId].fire += 1;
        } else {
            trackScores[trackId].pass += 1;
        }
    });

    const rankedTracks: { trackId: string; score: number; totalVotes: number }[] = [];
    
    Object.keys(trackScores).forEach(id => {
        const { fire, total } = trackScores[id];
        
        if (total >= 5) { 
            const finalScore = calculateWilsonScore(fire, total);
            rankedTracks.push({ trackId: id, score: finalScore, totalVotes: total });
        }
    });

    rankedTracks.sort((a, b) => b.score - a.score); 
    const top50TrackIds = rankedTracks.slice(0, 50).map(t => t.trackId);

    const metadataMap: { [key: string]: any } = {};
    if (top50TrackIds.length > 0) {
        const metadataRefs = top50TrackIds.map(id => TRACKS_COLLECTION.doc(id));
        const metadataSnaps = await db.getAll(...metadataRefs);

        metadataSnaps.forEach(snap => {
            if (snap.exists) {
                const data = snap.data();
                if (data) {
                    const genreChart = data.chart?.[genre] || {};
                    
                    const coverUrl = extractCoverUrl(data);
                    
                    metadataMap[snap.id] = {
                        title: data.meta?.title || 'N/A',
                        artist: data.meta?.artist || 'N/A',
                        cover: coverUrl,
                        genre: data.meta?.genre,
                        totalVotes: data.stats?.totalVotes || 0,
                        peakRank: genreChart.peakRank || null,
                        streakDays: genreChart.streakDays || 0,
                        movement: genreChart.movement || 0,
                        velocity: genreChart.velocity || '0%',
                    };
                }
            }
        });
    }

    const finalChart = {
        periodId,
        genre,
        type: timeframe.toUpperCase(),
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        startTime: admin.firestore.Timestamp.fromDate(startTime),
        endTime: admin.firestore.Timestamp.fromDate(endTime),
        tracks: rankedTracks.slice(0, 50).map((t, index) => {
            const meta = metadataMap[t.trackId] || {};
            const streakDays = meta.streakDays || 0;
            const streakLabel = streakDays === 1 ? '1 day' : `${streakDays} days`;
            
            return {
                id: t.trackId,  // Changed from trackId to id for consistency
                rank: index + 1,
                score: t.score,
                title: meta.title || 'N/A',
                artist: meta.artist || 'N/A',
                cover: meta.cover || '',
                genre: meta.genre || '',
                totalVotes: t.totalVotes, 
                peak: meta.peakRank || index + 1,
                streak: streakLabel,
                movement: meta.movement || 0,
                velocity: meta.velocity || '0%',
            };
        }),
    };

    await LEADERBOARDS_COLLECTION.doc(chartId).set(finalChart);
    console.log(`[Snapshot] Successfully deployed ${timeframe} chart for ${genre} with ${finalChart.tracks.length} entries (Period: ${periodId}).`);
};

// --- EVENT-DRIVEN (REAL-TIME) TRIGGER ---

/**
 * Complete list of all active genres (hardcoded for reliability)
 * This list should match the genres in scripts/addGenres.ts
 */
const ALL_GENRES = [
    'house',
    'tech-house',
    'bass-house',
    'deep-house',
    'progressive-house',
    'techno',
    'trance',
    'dubstep',
    'dnb',
    'future-bass',
    'hip-hop',
    'rap',
    'trap',
    'drill',
    'uk-garage',
    'afrobeats',
    'rnb',
    'disco',
    'pop',
    'k-pop',
    'rock',
    'metal',
    'jazz',
    'blues',
    'country',
    'folk',
    'reggae',
];

/**
 * Get all active genres (hardcoded list)
 */
const getAllGenres = async (): Promise<string[]> => {
    return ALL_GENRES;
};

/**
 * DAILY METRICS JOB:
 * Runs once per day (via `chartDailyUpdate`) to:
 * - Freeze a DAILY snapshot in the `leaderboards` collection for each genre/global.
 * - Update per-track chart history fields such as peak rank, streak, movement, and velocity.
 *
 * This powers historical daily charts and richer stats on the live charts page.
 */

const updateDailyMetrics = async (): Promise<void> => {
    const todayId = getPeriodId('daily'); 

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayId = yesterday.toISOString().split('T')[0];
    const activeGenres = await getAllGenres();
    const dailyGenres = ['global', ...activeGenres];

    for (const genre of dailyGenres) {
        try {
            let tracksQuery: admin.firestore.Query = TRACKS_COLLECTION;
            if (genre !== 'global') {
                tracksQuery = tracksQuery.where('meta.genre', '==', genre);
            }
            // Use wilsonScore (not trendScore) to match live leaderboards
            tracksQuery = tracksQuery.orderBy('stats.wilsonScore', 'desc').limit(50);

            const tracksSnap = await tracksQuery.get();

            if (tracksSnap.empty) {
                continue;
            }

            const batch = db.batch();
            const snapshotTracks: any[] = [];

            tracksSnap.docs.forEach((docSnap, index) => {
                const data = docSnap.data() as any;
                const stats = data.stats || {};
                const meta = data.meta || {};
                const chart = data.chart || {};
                const genreChart = (chart[genre] || {}) as any;

                const trackId = docSnap.id;
                const currentRank = index + 1;

                // For global charts, read from top-level fields first (where we write them)
                // For genre charts, read from chart[genre] nested fields
                let prevPeakRank: number | null;
                let prevStreakDays: number;
                let lastSeenDate: string | null;
                let lastRank: number | null;
                
                if (genre === 'global') {
                    // Global: check top-level fields first, then fall back to chart.global
                    prevPeakRank = typeof data.peak === 'number' ? data.peak : 
                                   typeof genreChart.peakRank === 'number' ? genreChart.peakRank : null;
                    prevStreakDays = typeof data.streakDays === 'number' ? data.streakDays :
                                     typeof genreChart.streakDays === 'number' ? genreChart.streakDays : 0;
                    lastSeenDate = typeof data.lastSeenDate === 'string' ? data.lastSeenDate :
                                   typeof genreChart.lastSeenDate === 'string' ? genreChart.lastSeenDate : null;
                    lastRank = typeof data.lastRank === 'number' ? data.lastRank :
                               typeof genreChart.lastRank === 'number' ? genreChart.lastRank : null;
                } else {
                    // Genre-specific: read from chart[genre]
                    prevPeakRank = typeof genreChart.peakRank === 'number' ? genreChart.peakRank : null;
                    prevStreakDays = typeof genreChart.streakDays === 'number' ? genreChart.streakDays : 0;
                    lastSeenDate = typeof genreChart.lastSeenDate === 'string' ? genreChart.lastSeenDate : null;
                    lastRank = typeof genreChart.lastRank === 'number' ? genreChart.lastRank : null;
                }
                
                const newPeakRank = prevPeakRank === null ? currentRank : Math.min(prevPeakRank, currentRank);

                let newStreakDays: number;
                if (lastSeenDate === yesterdayId) {
                    newStreakDays = prevStreakDays + 1;
                } else {
                    newStreakDays = 1;
                }

                const movement = lastRank !== null && typeof lastRank === 'number' ? lastRank - currentRank : 0;

                let velocity = '0%';
                if (lastRank !== null && lastRank > 0 && movement !== 0) {
                    const pct = Math.round((movement / lastRank) * 100);
                    if (pct > 0) {
                        velocity = `+${pct}%`;
                    } else if (pct < 0) {
                        velocity = `${pct}%`;
                    }
                }

                const streakLabel = newStreakDays === 1 ? '1 day' : `${newStreakDays} days`;
                const coverUrl = extractCoverUrl(data);
                const updateData: any = {
                    [`chart.${genre}.peakRank`]: newPeakRank,
                    [`chart.${genre}.peakDate`]: admin.firestore.FieldValue.serverTimestamp(),
                    [`chart.${genre}.streakDays`]: newStreakDays,
                    [`chart.${genre}.lastRank`]: currentRank,
                    [`chart.${genre}.lastSeenDate`]: todayId,
                    [`chart.${genre}.movement`]: movement,
                    [`chart.${genre}.velocity`]: velocity,
                    [`displayStats.${genre}.peak`]: newPeakRank,
                    [`displayStats.${genre}.streak`]: streakLabel,
                    [`displayStats.${genre}.movement`]: movement,
                    [`displayStats.${genre}.velocity`]: velocity,
                };

                if (genre === 'global') {
                    // For global charts, also write to top-level fields for backwards compatibility
                    updateData.peak = newPeakRank;
                    updateData.streak = streakLabel;
                    updateData.streakDays = newStreakDays;
                    updateData.lastRank = currentRank;
                    updateData.lastSeenDate = todayId;
                    updateData.movement = movement;
                    updateData.velocity = velocity;
                }

                batch.update(docSnap.ref, updateData);

                snapshotTracks.push({
                    id: trackId,  // Changed from trackId to id for consistency
                    rank: currentRank,
                    score: typeof stats.wilsonScore === 'number' ? stats.wilsonScore : 0,
                    title: meta.title ?? 'N/A',
                    artist: meta.artist ?? 'N/A',
                    cover: coverUrl,
                    genre: meta.genre || '',  // Add genre field
                    totalVotes: typeof stats.totalVotes === 'number' ? stats.totalVotes : 0,
                    movement,
                    peak: newPeakRank,
                    streak: streakLabel,
                    velocity,
                });
            });

            const chartId = `${genre}_daily_${todayId}`;
            const finalChart = {
                periodId: todayId,
                genre,
                type: 'DAILY' as const,
                generatedAt: admin.firestore.FieldValue.serverTimestamp(),
                tracks: snapshotTracks,
            };

            batch.set(LEADERBOARDS_COLLECTION.doc(chartId), finalChart);

            await batch.commit();
        } catch (err) {
            console.error(
                `[DailyUpdate] Failed processing genre=${genre} for ${todayId}`,
                err
            );
        }
    }
};

/**
 * Runs instantly when a vote is added. Recalculates Wilson/Trend Score and updates the track document.
 * This powers the 'live' daily charts.
 */
export const onVoteUpdate = onDocumentWritten(
    {
        document: 'votes/{voteId}',
        secrets: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
    },
    async (event) => {
    // We only care about CREATING new votes (i.e., when a user votes)
    if (!event.data?.after.exists || event.data?.before.exists) {
        return; 
    }

    const voteData = event.data.after.data();
    if (!voteData || !voteData.trackId || !voteData.voteType || !voteData.userId) {
        return;
    }
    
    const { trackId, voteType, userId } = voteData;
    const trackRef = TRACKS_COLLECTION.doc(trackId);

    try {
        const trackDoc = await trackRef.get();
        
        if (!trackDoc.exists) {
            console.warn(`Track ${trackId} not found for vote processing.`);
            return;
        }

        const trackData = trackDoc.data()!;
        const genre = trackData.meta?.genre || 'unknown';
        
        const redis = getRedisClient();
        await redis.incr(`track:${trackId}:total`);
        if (voteType === 'FIRE') {
            await redis.incr(`track:${trackId}:fires`);
        }
        
        const [firesResult, totalResult] = await Promise.all([
            redis.get(`track:${trackId}:fires`),
            redis.get(`track:${trackId}:total`),
        ]);
        
        const votesFire = parseInt(String(firesResult || '0'), 10);
        const totalVotes = parseInt(String(totalResult || '0'), 10);
        
        if (isNaN(votesFire) || isNaN(totalVotes)) {
            console.error(`[Vote] Invalid vote counts for ${trackId}: fires=${firesResult}, total=${totalResult}`);
            return; 
        }
        
        const wilsonScore = calculateWilsonScore(votesFire, totalVotes);
        
        // Update Redis leaderboards (Firestore will be synced every 5 minutes)
        await Promise.all([
            updateTrackScore(genre, trackId, wilsonScore),
            updateTrackScore('global', trackId, wilsonScore),
        ]);
        
        await db.collection('userVotes').doc(userId).set({
            votedTrackIds: admin.firestore.FieldValue.arrayUnion(trackId),
            voteCount: admin.firestore.FieldValue.increment(1),
            lastVote: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
                
    } catch (error) {
        console.error('[Vote] Failed to process vote:', error);
        throw error;
    }
});


// --- SCHEDULER EXPORTS ---

/**
 * SYNC JOB: Syncs Redis vote counts back to Firestore every 5 minutes
 * This ensures Firestore remains the source of truth and can rebuild Redis if needed
 */
export const syncRedisToFirestore = onSchedule(
    {
        schedule: 'every 5 minutes',
        timeZone: 'America/New_York',
        secrets: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
    },
    async () => {
        console.log('[Sync] Starting Redis → Firestore sync');
        
        try {
            const redis = getRedisClient();
            const trackIds = new Set<string>();
            
            const leaderboards = ['global'];
            const genresSnapshot = await db.collection('genres').get();
            genresSnapshot.docs.forEach(doc => leaderboards.push(doc.id));
            
            for (const leaderboard of leaderboards) {
                const key = `leaderboard:${leaderboard}:daily`;
                const rankings = await redis.zrange(key, 0, -1) as string[];
                rankings.forEach(id => trackIds.add(id));
            }
                        
            const trackIdsArray = Array.from(trackIds);
            let synced = 0;
            let errors = 0;
            
            for (let i = 0; i < trackIdsArray.length; i += 500) {
                const batch = db.batch();
                const batchIds = trackIdsArray.slice(i, i + 500);
                
                for (const trackId of batchIds) {
                    try {
                        const [firesStr, totalStr, trackDoc] = await Promise.all([
                            redis.get(`track:${trackId}:fires`),
                            redis.get(`track:${trackId}:total`),
                            TRACKS_COLLECTION.doc(trackId).get(),
                        ]);
                        
                        if (!trackDoc.exists) {
                            console.warn(`[Sync] Track ${trackId} not found in Firestore`);
                            continue;
                        }
                        
                        const votesFire = parseInt(firesStr as string || '0', 10);
                        const totalVotes = parseInt(totalStr as string || '0', 10);
                        
                        if (totalVotes === 0) continue;
                        if (isNaN(votesFire) || isNaN(totalVotes)) {
                            console.warn(`[Sync] Invalid vote counts for ${trackId}: fires=${firesStr}, total=${totalStr}`);
                            continue;
                        }
                        
                        const trackData = trackDoc.data()!;
                        const wilsonScore = calculateWilsonScore(votesFire, totalVotes);
                        const trendScore = calculateTrendScore(wilsonScore, totalVotes, trackData.createdAt);
                        
                        batch.update(TRACKS_COLLECTION.doc(trackId), {
                            'stats.votesFire': votesFire,
                            'stats.totalVotes': totalVotes,
                            'stats.wilsonScore': wilsonScore,
                            'stats.trendScore': trendScore,
                            'syncedAt': admin.firestore.FieldValue.serverTimestamp(),
                        });
                        
                        synced++;
                    } catch (error) {
                        console.error(`[Sync] Error processing track ${trackId}:`, error);
                        errors++;
                    }
                }
                
                await batch.commit();
            }            
        } catch (error) {
            console.error('[Sync] Fatal error:', error);
            throw error;
        }
    }
);

/**
 * LIVE LEADERBOARDS: Updates summary documents for real-time listeners every 2 minutes
 * Clients use onSnapshot on these documents for instant updates
 */
export const updateLiveLeaderboards = onSchedule(
    {
        schedule: 'every 2 minutes',
        timeZone: 'America/New_York',
        secrets: ['UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN'],
    },
    async () => {
        try {
            const genresSnapshot = await db.collection('genres').where('isActive', '==', true).get();
            const genres = ['global', ...genresSnapshot.docs.map(doc => doc.id)];
            
            await Promise.all(genres.map(async (genre) => {
                try {
                    // SIMPLIFIED: Just query Firestore directly for top tracks
                    let tracks: any[] = [];
                    
                    try {
                        let query;
                        if (genre === 'global') {
                            query = TRACKS_COLLECTION
                                .orderBy('stats.wilsonScore', 'desc')
                                .limit(50);
                        } else {
                            query = TRACKS_COLLECTION
                                .where('meta.genre', '==', genre)
                                .orderBy('stats.wilsonScore', 'desc')
                                .limit(50);
                        }
                        
                        const snapshot = await query.get();
                        
                        tracks = snapshot.docs.map((doc, index) => {
                            const data = doc.data();
                            const trackData: any = {
                                id: doc.id,
                                rank: index + 1,
                                score: data.stats?.wilsonScore || 0,
                                title: data.meta?.title || 'Unknown',
                                artist: data.meta?.artist || 'Unknown',
                                cover: extractCoverUrl(data),
                                genre: data.meta?.genre || '',
                                provider: data.meta?.provider,
                                externalId: data.meta?.externalId,
                                dropTime: data.meta?.dropTime || 0,
                                uploaderId: data.uploaderId,
                                uploaderUsername: data.uploaderUsername,
                                stats: data.stats,
                                meta: data.meta,
                            };
                            
                            // Add display stats (peak, streak, movement, velocity)
                            if (genre === 'global') {
                                // For global, check top-level fields first, then displayStats.global or chart.global
                                trackData.peak = data.peak || data.displayStats?.global?.peak || data.chart?.global?.peakRank || (index + 1);
                                trackData.streak = data.streak || data.displayStats?.global?.streak || 
                                    (data.chart?.global?.streakDays === 1 ? '1 day' : 
                                     data.chart?.global?.streakDays ? `${data.chart.global.streakDays} days` : '1 day');
                                trackData.movement = data.movement ?? data.displayStats?.global?.movement ?? data.chart?.global?.movement ?? 0;
                                trackData.velocity = data.velocity || data.displayStats?.global?.velocity || data.chart?.global?.velocity || '0%';
                            } else {
                                // For genre-specific charts, check displayStats[genre] or chart[genre]
                                const genreStats = data.displayStats?.[genre] || data.chart?.[genre] || {};
                                trackData.peak = genreStats.peak || genreStats.peakRank || (index + 1);
                                trackData.streak = genreStats.streak || 
                                    (genreStats.streakDays === 1 ? '1 day' : 
                                     genreStats.streakDays ? `${genreStats.streakDays} days` : '1 day');
                                trackData.movement = genreStats.movement ?? 0;
                                trackData.velocity = genreStats.velocity || '0%';
                            }
                            
                            return trackData;
                        });
                        
                        console.log(`[LiveLeaderboards] Fetched ${tracks.length} tracks for ${genre} from Firestore`);
                        
                    } catch (queryError: any) {
                        console.error(`[LiveLeaderboards] Query failed for ${genre}:`, queryError?.message);
                    }
                    
                    // Fill to 50 if needed
                    const existingTrackIds = new Set(tracks.map(t => t.id));
                    if (tracks.length < 50) {
                        const needed = 50 - tracks.length;
                        try {
                            let additionalQuery;
                            try {
                                // PRIMARY: Order by wilsonScore to get highest-voted tracks
                                if (genre === 'global') {
                                    additionalQuery = TRACKS_COLLECTION
                                        .orderBy('stats.wilsonScore', 'desc')
                                        .limit(needed * 2);
                                } else {
                                    additionalQuery = TRACKS_COLLECTION
                                        .where('meta.genre', '==', genre)
                                        .orderBy('stats.wilsonScore', 'desc')
                                        .limit(needed * 2);
                                }
                            } catch {
                                // FALLBACK: If wilsonScore index doesn't exist, try createdAt
                                console.warn(`[LiveLeaderboards] wilsonScore query failed for ${genre}, falling back to createdAt`);
                                if (genre === 'global') {
                                    additionalQuery = TRACKS_COLLECTION
                                        .orderBy('createdAt', 'desc')
                                        .limit(needed * 2);
                                } else {
                                    additionalQuery = TRACKS_COLLECTION
                                        .where('meta.genre', '==', genre)
                                        .orderBy('createdAt', 'desc')
                                        .limit(needed * 2);
                                }
                            }
                            
                            const additionalSnapshot = await additionalQuery.get();
                            const additionalTracks: any[] = [];
                            
                            for (const trackDoc of additionalSnapshot.docs) {
                                if (additionalTracks.length >= needed) break;
                                if (!existingTrackIds.has(trackDoc.id)) {
                                    const data = trackDoc.data();
                                    const trackData: any = {
                                        id: trackDoc.id,
                                        rank: tracks.length + additionalTracks.length + 1,
                                        score: data.stats?.wilsonScore || 0,
                                        title: data.meta?.title || 'Unknown',
                                        artist: data.meta?.artist || 'Unknown',
                                        cover: extractCoverUrl(data),
                                        genre: data.meta?.genre || '',
                                        provider: data.meta?.provider,
                                        externalId: data.meta?.externalId,
                                        dropTime: data.meta?.dropTime || 0,
                                        uploaderId: data.uploaderId,
                                        uploaderUsername: data.uploaderUsername,
                                        stats: data.stats,
                                        meta: data.meta,
                                    };
                                    
                                    // Add display stats for additional tracks
                                    if (genre === 'global') {
                                        trackData.peak = data.peak || data.displayStats?.global?.peak || data.chart?.global?.peakRank || (tracks.length + additionalTracks.length + 1);
                                        trackData.streak = data.streak || data.displayStats?.global?.streak || 
                                            (data.chart?.global?.streakDays === 1 ? '1 day' : 
                                             data.chart?.global?.streakDays ? `${data.chart.global.streakDays} days` : '1 day');
                                        trackData.movement = data.movement ?? data.displayStats?.global?.movement ?? data.chart?.global?.movement ?? 0;
                                        trackData.velocity = data.velocity || data.displayStats?.global?.velocity || data.chart?.global?.velocity || '0%';
                                    } else {
                                        const genreStats = data.displayStats?.[genre] || data.chart?.[genre] || {};
                                        trackData.peak = genreStats.peak || genreStats.peakRank || (tracks.length + additionalTracks.length + 1);
                                        trackData.streak = genreStats.streak || 
                                            (genreStats.streakDays === 1 ? '1 day' : 
                                             genreStats.streakDays ? `${genreStats.streakDays} days` : '1 day');
                                        trackData.movement = genreStats.movement ?? 0;
                                        trackData.velocity = genreStats.velocity || '0%';
                                    }
                                    
                                    additionalTracks.push(trackData);
                                    existingTrackIds.add(trackDoc.id);
                                }
                            }                            
                            tracks.push(...additionalTracks);                            
                            // Sort all tracks by score (descending) to ensure proper ranking
                            tracks.sort((a, b) => (b.score || 0) - (a.score || 0));
                            // Update ranks after sorting
                            tracks.forEach((track, index) => {
                                track.rank = index + 1;
                            });
                        } catch (error) {
                            console.warn(`[LiveLeaderboards] Failed to fetch additional tracks for ${genre}:`, error);
                        }
                    }
                    
                    // Final sort to ensure all tracks are in correct order regardless of source
                    tracks.sort((a, b) => (b.score || 0) - (a.score || 0));
                    tracks.forEach((track, index) => {
                        track.rank = index + 1;
                    });
                    
                    await db.collection('leaderboards_live').doc(`${genre}_daily`).set({
                        genre,
                        timeframe: 'daily',
                        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                        trackCount: tracks.length,
                        tracks,
                    });                                        
                } catch (error) {
                    console.error(`[LiveLeaderboards] Error updating ${genre}:`, error);
                }
            }));                        
        } catch (error) {
            console.error('[LiveLeaderboards] Fatal error:', error);
            throw error;
        }
    }
);

/**
 * DAILY JOB: Updates track history (Peak, Streak, Velocity) and saves the daily trend snapshot.
 * (Runs once daily to freeze metrics for historical comparison).
 */
export const chartDailyUpdate = onSchedule(
    { schedule: '0 0 * * *', timeZone: 'America/Los_Angeles' },
    async () => { await updateDailyMetrics(); }
);

/**
 * WEEKLY JOB: Generates the static Weekly Snapshot (Global and Genre-Specific).
 */
export const chartWeeklyGlobal = onSchedule(
    { schedule: '0 0 * * 1', timeZone: 'America/Los_Angeles' },
    async () => { 
        const activeGenres = await getAllGenres();
        const genres = ['global', ...activeGenres];
        
        for (const genre of genres) { 
            await generateSnapshot('weekly', genre); 
        }
    }
);

/**
 * MONTHLY JOB: Generates the static Monthly Snapshot (Global and Genre-Specific).
 */
export const chartMonthlyGlobal = onSchedule(
    { schedule: '0 0 1 * *', timeZone: 'America/Los_Angeles' },
    async () => { 
        const activeGenres = await getAllGenres();
        const genres = ['global', ...activeGenres];
        
        for (const genre of genres) { 
            await generateSnapshot('monthly', genre); 
        }
    }
);

/**
 * YEARLY JOB: Generates the static Yearly Snapshot (Global and Genre-Specific).
 */
export const chartYearlyGlobal = onSchedule(
    { schedule: '0 0 1 1 *', timeZone: 'America/Los_Angeles' },
    async () => { 
        const activeGenres = await getAllGenres();
        const genres = ['global', ...activeGenres];
        
        for (const genre of genres) { 
            await generateSnapshot('yearly', genre); 
        }
    }
);