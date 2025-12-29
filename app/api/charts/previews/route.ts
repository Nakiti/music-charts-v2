import { NextResponse } from 'next/server';
import { doc, getDoc, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

/**
 * Optimized batch endpoint for fetching chart previews
 * Fetches top 3 tracks for multiple genres in a single request
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const genresParam = searchParams.get('genres');
    const timeframe = searchParams.get('timeframe') || 'daily';
    const previewLimit = parseInt(searchParams.get('limit') || '3', 10);

    if (!genresParam) {
      return NextResponse.json(
        { error: 'genres parameter is required' },
        { status: 400 }
      );
    }

    const genres = genresParam.split(',').filter(Boolean);
    
    if (genres.length === 0) {
      return NextResponse.json({ previews: [] });
    }

    // Fetch all previews in parallel
    const previewPromises = genres.map(async (genre) => {
      try {
        // For daily charts, prefer leaderboards_live (most up-to-date)
        if (timeframe === 'daily') {
          try {
            const liveDoc = await getDoc(doc(db, 'leaderboards_live', `${genre}_daily`));
            
            if (liveDoc.exists()) {
              const liveData = liveDoc.data();
              const tracks = (liveData.tracks || []).slice(0, previewLimit);
              
              if (tracks.length > 0) {
                return {
                  genre,
                  tracks,
                  source: 'leaderboards_live'
                };
              }
            }
          } catch (liveErr) {
            // Fall through to Firestore query
            console.warn(`[Previews] Failed to fetch from leaderboards_live for ${genre}:`, liveErr);
          }
        }

        // Fallback to optimized Firestore query
        // For previews, we only need top 3, so use a simple query
        let q;
        if (genre === 'global') {
          q = query(
            collection(db, 'tracks'),
            orderBy('stats.wilsonScore', 'desc'),
            limit(previewLimit)
          );
        } else {
          q = query(
            collection(db, 'tracks'),
            where('meta.genre', '==', genre),
            orderBy('stats.wilsonScore', 'desc'),
            limit(previewLimit)
          );
        }

        let snapshot;
        try {
          snapshot = await getDocs(q);
        } catch (firestoreErr: any) {
          // If index doesn't exist, try without orderBy
          if (firestoreErr?.code === 'failed-precondition' || firestoreErr?.message?.includes('index')) {
            const simpleQuery = query(
              collection(db, 'tracks'),
              where('meta.genre', '==', genre),
              limit(50) // Get more to sort in memory
            );
            snapshot = await getDocs(simpleQuery);
          } else {
            throw firestoreErr;
          }
        }

        let tracks = snapshot.docs.map((doc, index) => {
          const data = doc.data();
          return {
            id: doc.id,
            rank: index + 1,
            score: data.stats?.wilsonScore || 0,
            ...data
          };
        });

        // If we had to fetch without orderBy, sort in memory
        if (genre !== 'global' && tracks.length > 0) {
          tracks = tracks
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .slice(0, previewLimit)
            .map((track, index) => ({
              ...track,
              rank: index + 1
            }));
        }

        // Add chart metadata
        tracks = tracks.map((trackData: any) => {
          if (genre === 'global') {
            trackData.peak = trackData.peak || trackData.displayStats?.global?.peak || trackData.chart?.global?.peakRank;
            trackData.streak = trackData.streak || trackData.displayStats?.global?.streak;
            trackData.movement = trackData.movement ?? trackData.displayStats?.global?.movement ?? trackData.chart?.global?.movement;
            trackData.velocity = trackData.velocity || trackData.displayStats?.global?.velocity || trackData.chart?.global?.velocity;
          } else if (trackData.displayStats?.[genre]) {
            trackData.peak = trackData.displayStats[genre].peak;
            trackData.streak = trackData.displayStats[genre].streak;
            trackData.movement = trackData.displayStats[genre].movement;
            trackData.velocity = trackData.displayStats[genre].velocity;
          }
          return trackData;
        });

        return {
          genre,
          tracks,
          source: 'firestore'
        };
      } catch (err) {
        console.error(`[Previews] Error fetching preview for ${genre}:`, err);
        return {
          genre,
          tracks: [],
          error: err instanceof Error ? err.message : 'Unknown error'
        };
      }
    });

    const previews = await Promise.all(previewPromises);

    return NextResponse.json(
      { previews },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30',
        }
      }
    );
  } catch (error: any) {
    console.error('[Previews] Batch endpoint error:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch chart previews',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined
      },
      { status: 500 }
    );
  }
}

