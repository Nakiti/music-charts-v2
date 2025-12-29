import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, getDocs, getFirestore } from 'firebase/firestore';
import { Genre } from '@/types';
import { db } from '@/lib/firebase';

export const useGenres = () => {
  const [genres, setGenres] = useState<Genre[]>([]);
  const [loading, setLoading] = useState(true);
  // const db = getFirestore();

  useEffect(() => {
    const fetchGenres = async () => {
      setLoading(true);
      try {
        // Fetch only active genres, sorted by your manual order
        const q = query(
          collection(db, 'genres'),
        //   where('isActive', '==', true),
          orderBy('order', 'asc')
        );
        
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as Genre));
        
        console.log("genres data", data)
        setGenres(data);
      } catch (err) {
        console.error("Failed to load genres", err);
      } finally {
        setLoading(false);
      }
    };

    fetchGenres();
  }, []);

  return { genres, loading };
};