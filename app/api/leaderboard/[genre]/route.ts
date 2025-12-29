import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { checkRateLimit } from '@/lib/api-ratelimit';

let redis: Redis | null = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
} catch (err) {
  console.warn('[API] Redis initialization failed, will use Firestore fallback only:', err);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ genre: string }> }
) {
  // Check rate limit first
  const rateLimitResponse = await checkRateLimit(request, 'leaderboard');
  if (rateLimitResponse) {
    return rateLimitResponse;
  }

  let genre: string = 'unknown';
  try {
    const resolvedParams = await params;
    genre = resolvedParams.genre;
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');
    
    // For daily charts, prefer leaderboards_live (most up-to-date, updated every 2 min)
    // This ensures consistency with the leaderboard page
    try {
      const { doc, getDoc } = await import('firebase/firestore');
      const liveDoc = await getDoc(doc(db, 'leaderboards_live', `${genre}_daily`));
      
      if (liveDoc.exists()) {
        const liveData = liveDoc.data();
        const tracks = (liveData.tracks || []).slice(0, limit);
        
        if (tracks.length > 0) {
          return NextResponse.json(
            { tracks, updatedAt: liveData.updatedAt?.toMillis() || Date.now(), source: 'leaderboards_live' },
            {
              headers: {
                'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
              }
            }
          );
        }
      }
    } catch (liveErr) {
      console.warn('[API] Failed to fetch from leaderboards_live, falling back:', liveErr);
      // Continue to Redis/Firestore fallback
    }
    
    // Fallback to Redis (if leaderboards_live is unavailable)
    let redisData: any = null;
    if (redis) {
      try {
        const key = `leaderboard:${genre}:daily`;
        redisData = await redis.zrange(key, 0, limit - 1, { 
          rev: true,
          withScores: true 
        });
      } catch (redisErr) {
        console.warn('[API] Redis query failed, falling back to Firestore:', redisErr);
        redisData = null;
      }
    }
    
    // 2. If Redis is empty or unavailable, fall back to Firestore query
    // Upstash returns flat array [value1, score1, value2, score2, ...] when withScores: true
    if (!redisData || !Array.isArray(redisData) || redisData.length === 0) {
      
      const { collection, query: firestoreQuery, where, orderBy, limit: firestoreLimit, getDocs } = await import('firebase/firestore');
      let q;
      if (genre === 'global') {
        q = firestoreQuery(
          collection(db, 'tracks'),
          orderBy('stats.wilsonScore', 'desc'),
          firestoreLimit(limit)
        );
      } else {
        q = firestoreQuery(
          collection(db, 'tracks'),
          where('meta.genre', '==', genre),
          orderBy('stats.wilsonScore', 'desc'),
          firestoreLimit(limit)
        );
      }
      
      let snapshot;
      try {
        snapshot = await getDocs(q);
      } catch (firestoreErr: any) {
        if (firestoreErr?.code === 'failed-precondition' || firestoreErr?.message?.includes('index')) {
          const simpleQuery = firestoreQuery(
            collection(db, 'tracks'),
            where('meta.genre', '==', genre),
            firestoreLimit(500) // Get more to sort in memory
          );
          snapshot = await getDocs(simpleQuery);
        } else {
          throw firestoreErr;
        }
      }
      
      let tracks = snapshot.docs.map((doc: any, index: number) => {
        const data = doc.data();
        return {
          id: doc.id,
          rank: index + 1,
          score: data.stats?.wilsonScore || 0,
          ...data
        };
      });
      
      if (genre !== 'global') {
        tracks = tracks.sort((a, b) => (b.score || 0) - (a.score || 0)).slice(0, limit);
        tracks = tracks.map((track, index) => ({
          ...track,
          rank: index + 1
        }));
      }
      
      tracks = tracks.map((trackData: any) => {
        const data = trackData;
        if (genre === 'global') {
          // For global charts, check top-level fields first
          trackData.peak = data.peak || data.displayStats?.global?.peak || data.chart?.global?.peakRank;
          trackData.streak = data.streak || data.displayStats?.global?.streak;
          trackData.movement = data.movement ?? data.displayStats?.global?.movement ?? data.chart?.global?.movement;
          trackData.velocity = data.velocity || data.displayStats?.global?.velocity || data.chart?.global?.velocity;
        } else if (data.displayStats?.[genre]) {
          // For genre-specific charts
          trackData.peak = data.displayStats[genre].peak;
          trackData.streak = data.displayStats[genre].streak;
          trackData.movement = data.displayStats[genre].movement;
          trackData.velocity = data.displayStats[genre].velocity;
        }
        return trackData;
      });
      
      if (tracks.length < limit) {
        const existingTrackIds = new Set(tracks.map(t => t.id));
        const needed = limit - tracks.length;
                
        try {
          let additionalSnapshot;
          
          try {
            let additionalQuery;
            if (genre === 'global') {
              additionalQuery = firestoreQuery(
                collection(db, 'tracks'),
                orderBy('createdAt', 'desc'),
                firestoreLimit(needed * 3) 
              );
            } else {
              additionalQuery = firestoreQuery(
                collection(db, 'tracks'),
                where('meta.genre', '==', genre),
                orderBy('createdAt', 'desc'),
                firestoreLimit(needed * 3)
              );
            }
            additionalSnapshot = await getDocs(additionalQuery);
          } catch (orderError: any) {
            console.warn(`[API] Failed to order by createdAt for ${genre}, trying orderBy wilsonScore:`, orderError?.message);
            try {
              let additionalQuery;
              if (genre === 'global') {
                additionalQuery = firestoreQuery(
                  collection(db, 'tracks'),
                  orderBy('stats.wilsonScore', 'desc'),
                  firestoreLimit(needed * 3)
                );
              } else {
                additionalQuery = firestoreQuery(
                  collection(db, 'tracks'),
                  where('meta.genre', '==', genre),
                  orderBy('stats.wilsonScore', 'desc'),
                  firestoreLimit(needed * 3)
                );
              }
              additionalSnapshot = await getDocs(additionalQuery);
            } catch (queryError: any) {
              console.error(`[API] Failed to fetch additional tracks for ${genre}:`, queryError?.message);
              throw queryError;
            }
          }
          
          const additionalTracks: any[] = [];
          
          for (const trackDoc of additionalSnapshot.docs) {
            if (additionalTracks.length >= needed) break;
            if (!existingTrackIds.has(trackDoc.id)) {
              const data = trackDoc.data();
              additionalTracks.push({
                id: trackDoc.id,
                rank: tracks.length + additionalTracks.length + 1,
                score: data.stats?.wilsonScore || 0,
                ...data
              });
              existingTrackIds.add(trackDoc.id);
            }
          }
          
          tracks.push(...additionalTracks);          
          tracks.forEach((track, index) => {
            track.rank = index + 1;
          });
        } catch (error: any) {
          console.error(`[API] Failed to fetch additional tracks for ${genre} leaderboard:`, error?.message || error);
        }
      }
      
      return NextResponse.json(
        { tracks, updatedAt: Date.now(), source: 'firestore' },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
          }
        }
      );
    }
    
    // 3. Parse Redis data (Upstash returns flat array format: [value1, score1, value2, score2, ...])
    const trackIds: string[] = [];
    const scores: number[] = [];
    
    if (Array.isArray(redisData) && redisData.length > 0) {
      if (typeof redisData[0] === 'string') {
        for (let i = 0; i < redisData.length; i += 2) {
          if (i + 1 < redisData.length) {
            const trackId = redisData[i] as string;
            const score = Number(redisData[i + 1]);
            if (trackId && !isNaN(score)) {
              trackIds.push(trackId);
              scores.push(score / 1000); 
            }
          }
        }
      } else {
        redisData.forEach((item: any) => {
          if (item && typeof item === 'object') {
            const trackId = item.value || item.member;
            const score = Number(item.score || 0);
            if (trackId && !isNaN(score)) {
              trackIds.push(trackId);
              scores.push(score / 1000);
            }
          }
        });
      }
    }
    
    if (trackIds.length !== scores.length) {
      console.warn('[API] Mismatch between trackIds and scores length, falling back to Firestore');
      const { collection, query: firestoreQuery, where, orderBy, limit: firestoreLimit, getDocs } = await import('firebase/firestore');
      let q;
      if (genre === 'global') {
        q = firestoreQuery(
          collection(db, 'tracks'),
          orderBy('stats.wilsonScore', 'desc'),
          firestoreLimit(limit)
        );
      } else {
        q = firestoreQuery(
          collection(db, 'tracks'),
          where('meta.genre', '==', genre),
          orderBy('stats.wilsonScore', 'desc'),
          firestoreLimit(limit)
        );
      }
      const snapshot = await getDocs(q);
      let tracks = snapshot.docs.map((doc: any, index: number) => {
        const data = doc.data();
        return {
          id: doc.id,
          rank: index + 1,
          score: data.stats?.wilsonScore || 0,
          ...data
        };
      });
      
      // For all leaderboards, ensure we always have 50 tracks
      // If we have fewer than 50, fill with any additional tracks
      if (tracks.length < limit) {
        const existingTrackIds = new Set(tracks.map(t => t.id));
        const needed = limit - tracks.length;        
        try {
          let additionalSnapshot;
          
          try {
            let additionalQuery;
            if (genre === 'global') {
              additionalQuery = firestoreQuery(
                collection(db, 'tracks'),
                orderBy('createdAt', 'desc'),
                firestoreLimit(needed * 3) 
              );
            } else {
              additionalQuery = firestoreQuery(
                collection(db, 'tracks'),
                where('meta.genre', '==', genre),
                orderBy('createdAt', 'desc'),
                firestoreLimit(needed * 3)
              );
            }
            additionalSnapshot = await getDocs(additionalQuery);
          } catch (orderError: any) {
            console.warn(`[API] Failed to order by createdAt for ${genre}, trying orderBy wilsonScore:`, orderError?.message);
            try {
              let additionalQuery;
              if (genre === 'global') {
                additionalQuery = firestoreQuery(
                  collection(db, 'tracks'),
                  orderBy('stats.wilsonScore', 'desc'),
                  firestoreLimit(needed * 3)
                );
              } else {
                additionalQuery = firestoreQuery(
                  collection(db, 'tracks'),
                  where('meta.genre', '==', genre),
                  orderBy('stats.wilsonScore', 'desc'),
                  firestoreLimit(needed * 3)
                );
              }
              additionalSnapshot = await getDocs(additionalQuery);
            } catch (queryError: any) {
              console.error(`[API] Failed to fetch additional tracks for ${genre}:`, queryError?.message);
              throw queryError;
            }
          }
          
          const additionalTracks: any[] = [];
          
          for (const trackDoc of additionalSnapshot.docs) {
            if (additionalTracks.length >= needed) break;
            if (!existingTrackIds.has(trackDoc.id)) {
              const data = trackDoc.data();
              additionalTracks.push({
                id: trackDoc.id,
                rank: tracks.length + additionalTracks.length + 1,
                score: data.stats?.wilsonScore || 0,
                ...data
              });
              existingTrackIds.add(trackDoc.id);
            }
          }          
          tracks.push(...additionalTracks);
          tracks.forEach((track, index) => {
            track.rank = index + 1;
          });
        } catch (error: any) {
          console.error(`[API] Failed to fetch additional tracks for ${genre} leaderboard:`, error?.message || error);
        }
      }
      
      return NextResponse.json(
        { tracks, updatedAt: Date.now(), source: 'firestore' },
        {
          headers: {
            'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
          }
        }
      );
    }
    
    // 4. Get track metadata from Firestore
    const tracks: any[] = [];
    for (let i = 0; i < trackIds.length; i += 10) {
      const batch = trackIds.slice(i, i + 10);
      const trackDocs = await Promise.all(
        batch.map((id: string) => getDoc(doc(db, 'tracks', id)))
      );
      
      trackDocs.forEach((trackDoc: any, idx: number) => {
        if (trackDoc.exists()) {
          const data = trackDoc.data();
          const rank = i + idx + 1;
          
          tracks.push({
            id: trackDoc.id,
            rank,
            score: scores[i + idx],
            ...data
          });
        }
      });
    }
    
    // 5. For all leaderboards, ensure we always have 50 tracks
    if (tracks.length < limit) {
      const existingTrackIds = new Set(tracks.map(t => t.id));
      const needed = limit - tracks.length;
            
      try {
        const { collection, query: firestoreQuery, where, orderBy, limit: firestoreLimit, getDocs } = await import('firebase/firestore');        
        let additionalSnapshot;
        
        try {
          let additionalQuery;
          if (genre === 'global') {
            additionalQuery = firestoreQuery(
              collection(db, 'tracks'),
              orderBy('createdAt', 'desc'),
              firestoreLimit(needed * 3) 
            );
          } else {
            additionalQuery = firestoreQuery(
              collection(db, 'tracks'),
              where('meta.genre', '==', genre),
              orderBy('createdAt', 'desc'),
              firestoreLimit(needed * 3)
            );
          }
          additionalSnapshot = await getDocs(additionalQuery);
        } catch (orderError: any) {
          console.warn(`[API] Failed to order by createdAt for ${genre}, trying orderBy wilsonScore:`, orderError?.message);
          try {
            let additionalQuery;
            if (genre === 'global') {
              additionalQuery = firestoreQuery(
                collection(db, 'tracks'),
                orderBy('stats.wilsonScore', 'desc'),
                firestoreLimit(needed * 3)
              );
            } else {
              additionalQuery = firestoreQuery(
                collection(db, 'tracks'),
                where('meta.genre', '==', genre),
                orderBy('stats.wilsonScore', 'desc'),
                firestoreLimit(needed * 3)
              );
            }
            additionalSnapshot = await getDocs(additionalQuery);
          } catch (queryError: any) {
            console.error(`[API] Failed to fetch additional tracks for ${genre}:`, queryError?.message);
            throw queryError;
          }
        }
        
        const additionalTracks: any[] = [];
        
        for (const trackDoc of additionalSnapshot.docs) {
          if (additionalTracks.length >= needed) break;
          if (!existingTrackIds.has(trackDoc.id)) {
            const data = trackDoc.data();
            additionalTracks.push({
              id: trackDoc.id,
              rank: tracks.length + additionalTracks.length + 1,
              score: data.stats?.wilsonScore || 0,
              ...data
            });
            existingTrackIds.add(trackDoc.id);
          }
        }
         
        tracks.push(...additionalTracks);    
        tracks.forEach((track, index) => {
          track.rank = index + 1;
        });
      } catch (error: any) {
        console.error(`[API] Failed to fetch additional tracks for ${genre} leaderboard:`, error?.message || error);
      }
    }
    
    const response = NextResponse.json(
      { tracks, updatedAt: Date.now(), source: 'redis' },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '99',
          'X-RateLimit-Reset': String(Date.now() + 60000),
        }
      }
    );
    return response;
    
  } catch (error: any) {
    console.error('[API] Leaderboard error:', error);
    console.error('[API] Error details:', {
      message: error?.message,
      stack: error?.stack,
      genre: genre || 'unknown',
    });
    return NextResponse.json(
      { 
        error: 'Failed to fetch leaderboard',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}