import { useState, useEffect, useCallback, useRef } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  startAfter,
  getDoc,
  doc,
  DocumentData,
  QueryDocumentSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Shape of a persisted like document in Firestore (minimal structure)
export interface LikeDocument {
  id: string;          // like document id (userId_trackId)
  userId: string;
  trackId: string;
  createdAt?: any;
  // Legacy fields (for backward compatibility during migration)
  username?: string | null;
  trackTitle?: string | null;
  trackArtist?: string | null;
  trackCover?: string | null;
  genre?: string | null;
  soundcloudUrl?: string | null;
}

// Shape of a liked track with full track data (for UI)
export interface LikedTrack {
  id: string;
  userId: string;
  trackId: string;
  createdAt?: any;
  // Track data from tracks collection
  trackTitle?: string | null;
  trackArtist?: string | null;
  trackCover?: string | null;
  genre?: string | null;
  soundcloudUrl?: string | null;
  uploaderUsername?: string | null;
  slug?: string | null;
}

export const useLikes = (username: string | undefined) => {
  const [likes, setLikes] = useState<LikedTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const lastDocRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  
  // Keep ref in sync with state
  useEffect(() => {
    lastDocRef.current = lastDoc;
  }, [lastDoc]);

  // First, get userId from username
  useEffect(() => {
    const fetchUserId = async () => {
      if (!username) {
        setUserId(null);
        return;
      }

      try {
        const userQuery = query(
          collection(db, 'users'),
          where('username', '==', username),
          limit(1)
        );
        const userSnap = await getDocs(userQuery);
        
        if (!userSnap.empty) {
          setUserId(userSnap.docs[0].id);
        } else {
          setUserId(null);
        }
      } catch (err) {
        console.error('Error fetching userId from username:', err);
        setUserId(null);
      }
    };

    fetchUserId();
  }, [username]);

  const fetchLikes = useCallback(async (isNextPage = false) => {
    if (!userId) {
      setLikes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Query by userId (new approach) or fallback to username (legacy)
      let q = query(
        collection(db, 'userLikes'),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc'),
        limit(20)
      );

      // Use ref to avoid dependency issues
      const currentLastDoc = lastDocRef.current;
      if (isNextPage && currentLastDoc) {
        q = query(q, startAfter(currentLastDoc));
      }

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        if (isNextPage) {
          setHasMore(false);
        } else {
          setLikes([]);
        }
        setLoading(false);
        return;
      }

      // Extract like documents
      const likeDocs: LikeDocument[] = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...(doc.data() as Omit<LikeDocument, 'id'>),
      }));

      // Batch fetch track details
      const trackIds = likeDocs.map(like => like.trackId).filter(Boolean);
      const trackPromises = trackIds.map(trackId => 
        getDoc(doc(db, 'tracks', trackId)).catch(err => {
          console.warn(`Failed to fetch track ${trackId}:`, err);
          return null;
        })
      );
      
      const trackSnapshots = await Promise.all(trackPromises);

      // Merge like data with track data
      const likesWithTracks: LikedTrack[] = likeDocs.map((like, index) => {
        const trackDoc = trackSnapshots[index];
        const trackData = trackDoc?.exists() ? trackDoc.data() : null;

        // Use track data from tracks collection if available, otherwise fallback to legacy fields
        return {
          id: like.id,
          userId: like.userId,
          trackId: like.trackId,
          createdAt: like.createdAt,
          trackTitle: trackData?.title || trackData?.meta?.title || like.trackTitle || null,
          trackArtist: trackData?.artist || trackData?.meta?.artist || like.trackArtist || null,
          trackCover: trackData?.cover || trackData?.meta?.cover || like.trackCover || null,
          genre: trackData?.genre || trackData?.meta?.genre || like.genre || null,
          soundcloudUrl: trackData?.metadata?.externalId || trackData?.meta?.externalId || like.soundcloudUrl || null,
          uploaderUsername: trackData?.uploaderUsername || null,
          slug: trackData?.slug || null,
        };
      });

      if (isNextPage) {
        setLikes((prev) => [...prev, ...likesWithTracks]);
      } else {
        setLikes(likesWithTracks);
      }

      setLastDoc(snapshot.docs[snapshot.docs.length - 1] || null);
      setHasMore(snapshot.docs.length === 20);
    } catch (err) {
      console.error('Error fetching likes:', err);
      // Fallback: try legacy query by username if userId query fails
      if (!isNextPage) {
        try {
          let legacyQ = query(
            collection(db, 'userLikes'),
            where('username', '==', username),
            orderBy('createdAt', 'desc'),
            limit(20)
          );
          const legacySnapshot = await getDocs(legacyQ);
          const legacyLikes = legacySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as any),
          })) as LikedTrack[];
          setLikes(legacyLikes);
          setLastDoc(legacySnapshot.docs[legacySnapshot.docs.length - 1] || null);
          setHasMore(legacySnapshot.docs.length === 20);
        } catch (legacyErr) {
          console.error('Legacy query also failed:', legacyErr);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [userId, username]);

  // Fetch likes when userId is available
  useEffect(() => {
    if (userId) {
      setLikes([]);
      setLastDoc(null);
      lastDocRef.current = null;
      setHasMore(true);
      fetchLikes(false);
    } else if (userId === null && username) {
      // userId fetch completed but user not found
      setLikes([]);
      setLoading(false);
    }
    // Only depend on userId and username, not fetchLikes to avoid infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, username]);

  return { likes, loading, hasMore, loadMore: () => fetchLikes(true) };
};
