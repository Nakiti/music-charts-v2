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

export interface FollowingItem {
  id: string;
  followerId: string;
  followerUsername?: string | null;
  followedId: string;
  followedUsername?: string | null;
  followedAvatar?: string | null;
  createdAt?: any;
}

export const useFollowingList = (userId: string | null | undefined) => {
  const [following, setFollowing] = useState<FollowingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setFollowing([]);
      setLoading(false);
      return;
    }

    const baseRef = collection(db, 'follows');
    const q = query(
      baseRef,
      where('followerId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50) 
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot: QuerySnapshot<DocumentData>) => {
        const items: FollowingItem[] = snapshot.docs.map((doc) => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            followerId: data.followerId,
            followerUsername: data.followerUsername ?? null,
            followedId: data.followedId,
            followedUsername: data.followedUsername ?? null,
            followedAvatar: data.followedAvatar ?? null,
            createdAt: data.createdAt,
          };
        });

        setFollowing(items);
        setLoading(false);
      },
      (error) => {
        console.error('[useFollowingList] Error subscribing to follows', error);
        setFollowing([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { following, loading };
};


