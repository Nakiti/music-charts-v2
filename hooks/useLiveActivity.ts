import { useEffect, useState } from 'react';
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface LiveActivityItem {
  id: string;
  userId: string;
  username: string;
  trackId: string;
  trackTitle: string;
  genre: string;
  action: 'FIRE' | 'PASS';
  createdAt?: Date;
}

export const useLiveActivity = (genre?: string) => {
  const [items, setItems] = useState<LiveActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  // const db = getFirestore();

  useEffect(() => {
    const baseRef = collection(db, 'activity');

    const q = genre
      ? query(
          baseRef,
          where('genre', '==', genre),
          orderBy('createdAt', 'desc'),
          limit(7)
        )
      : query(baseRef, orderBy('createdAt', 'desc'), limit(7));

    const unsubscribe = onSnapshot(
      q, 
      snapshot => {
        const next: LiveActivityItem[] = snapshot.docs.map(doc => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            userId: data.userId,
            username: data.username,
            trackId: data.trackId,
            trackTitle: data.trackTitle,
            genre: data.genre,
            action: data.action,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : undefined,
          };
        });

        setItems(next);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching live activity:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [genre]);

  console.log("activity ", items)

  return { items, loading };
};


