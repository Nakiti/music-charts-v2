import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb, verifyIdToken } from '@/lib/firebase-admin'; // Use the new getter
import { checkRateLimit } from '@/lib/api-ratelimit';

export async function GET(request: NextRequest) {
  const rateLimitResponse = await checkRateLimit(request, 'discovery');
  if (rateLimitResponse) return rateLimitResponse;

  // Initialize DB instance for this request
  

  try {
    const db = getAdminDb(); 
    const { searchParams } = new URL(request.url);
    const genre = searchParams.get('genre') || 'hiphop';
    const limit = parseInt(searchParams.get('limit') || '15', 10);
    const lastDocId = searchParams.get('lastDocId') || null;

    let userId: string | null = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const decoded = await verifyIdToken(token);
      if (decoded) userId = decoded.uid;
    }

    let votedTrackIds = new Set<string>();
    if (userId) {
      try {
        // Change adminDb -> db
        const userVotesDoc = await db.collection('userVotes').doc(userId).get();
        if (userVotesDoc.exists) {
          votedTrackIds = new Set(userVotesDoc.data()?.votedTrackIds || []);
        }
      } catch (error) {
        console.error('[API] Error fetching user votes:', error);
      }
    }

    const fetchLimit = limit * 3; 
    let trackDocs: any[];
    
    if (lastDocId) {
      // Change adminDb -> db
      let tracksQuery = db
        .collection('tracks')
        .where('meta.genre', '==', genre)
        .where('status', '==', 'ACTIVE')
        .orderBy('createdAt', 'desc');
      
      const lastDoc = await db.collection('tracks').doc(lastDocId).get();
      if (lastDoc.exists) tracksQuery = tracksQuery.startAfter(lastDoc);
      
      const snapshot = await tracksQuery.limit(fetchLimit).get();
      trackDocs = snapshot.docs;
    } else {
      // Change adminDb -> db
      const poolSize = Math.min(200, fetchLimit * 4);
      const poolSnapshot = await db
        .collection('tracks')
        .where('meta.genre', '==', genre)
        .where('status', '==', 'ACTIVE')
        .limit(poolSize)
        .get();
      
      const shuffledDocs = [...poolSnapshot.docs].sort(() => Math.random() - 0.5);
      trackDocs = shuffledDocs.slice(0, fetchLimit);
    }

    const unvotedTracks = trackDocs
      .filter(doc => !votedTrackIds.has(doc.id))
      .slice(0, limit)
      .map(doc => ({ id: doc.id, ...doc.data() }));

    const lastDoc = trackDocs.find(d => d.id === unvotedTracks[unvotedTracks.length - 1]?.id);
    const hasMore = trackDocs.length === fetchLimit && unvotedTracks.length === limit;

    return NextResponse.json({
      tracks: unvotedTracks.sort(() => Math.random() - 0.5),
      lastDocId: lastDoc?.id || null,
      hasMore,
    });
  } catch (error) {
    console.error('[API] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}