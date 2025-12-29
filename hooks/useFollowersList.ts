import { useEffect, useState } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  DocumentData,
  QuerySnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface FollowerItem {
  id: string;
  followerId: string;
  followerUsername?: string | null;
  followerAvatar?: string | null;
  followedId: string;
  followedUsername?: string | null;
  createdAt?: any;
}

export const useFollowersList = (userId: string | null | undefined) => {
  const [followers, setFollowers] = useState<FollowerItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setFollowers([]);
      setLoading(false);
      return;
    }

    const baseRef = collection(db, 'follows');
    const q = query(
      baseRef,
      where('followedId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50) 
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const items: FollowerItem[] = snapshot.docs.map((doc) => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            followerId: data.followerId,
            followerUsername: data.followerUsername ?? null,
            followerAvatar: data.followerAvatar ?? null,
            followedId: data.followedId,
            followedUsername: data.followedUsername ?? null,
            createdAt: data.createdAt,
          };
        });

        setFollowers(items);
        setLoading(false);
      },
      (error) => {
        console.error('[useFollowersList] Error subscribing to followers', error);
        setFollowers([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { followers, loading };
};


