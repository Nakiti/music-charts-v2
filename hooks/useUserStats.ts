import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  getDocs,
  getCountFromServer,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface UserStats {
  followers: number;
  uploads: number;
  votesCast: number;
  fireRate: number; // Percentage of FIRE votes (0-100)
  loading: boolean;
}

export const useUserStats = (userId: string | null, uploadsCount: number = 0): UserStats => {
  const [stats, setStats] = useState<UserStats>({
    followers: 0,
    uploads: uploadsCount,
    votesCast: 0,
    fireRate: 0,
    loading: true,
  });

  useEffect(() => {
    const fetchStats = async () => {
      if (!userId) {
        setStats({
          followers: 0,
          uploads: uploadsCount,
          votesCast: 0,
          fireRate: 0,
          loading: false,
        });
        return;
      }

      try {
        // 1. Get followers count
        let followers = 0;
        try {
          const followsQuery = query(
            collection(db, 'follows'),
            where('followingId', '==', userId)
          );
          const followsSnapshot = await getCountFromServer(followsQuery);
          followers = followsSnapshot.data().count;
        } catch (err) {
          console.warn('Failed to fetch followers count:', err);
        }

        // 2. Get votes count and calculate fire rate
        let votesCast = 0;
        let fireVotes = 0;
        try {
          const votesQuery = query(
            collection(db, 'votes'),
            where('userId', '==', userId)
          );
          const votesSnapshot = await getDocs(votesQuery);
          votesCast = votesSnapshot.size;
          
          // Count FIRE votes
          votesSnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.voteType === 'FIRE') {
              fireVotes++;
            }
          });
        } catch (err) {
          console.warn('Failed to fetch votes:', err);
        }

        // 3. Calculate fire rate percentage
        const fireRate = votesCast > 0 ? Math.round((fireVotes / votesCast) * 100) : 0;

        setStats({
          followers,
          uploads: uploadsCount,
          votesCast,
          fireRate,
          loading: false,
        });
      } catch (error) {
        console.error('Error fetching user stats:', error);
        setStats({
          followers: 0,
          uploads: uploadsCount,
          votesCast: 0,
          fireRate: 0,
          loading: false,
        });
      }
    };

    fetchStats();
  }, [userId, uploadsCount]);

  return stats;
};

