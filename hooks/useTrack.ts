import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { Track } from '@/types';
import { db } from '@/lib/firebase';

export const useTrack = (trackId: string) => {
  const [track, setTrack] = useState<Track | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!trackId) return;

    setLoading(true);
    
    // Subscribe to real-time updates for this specific track
    const unsubscribe = onSnapshot(
      doc(db, 'tracks', trackId),
      (docSnap) => {
        if (docSnap.exists()) {
          // Flatten the data: ID + Data
          setTrack({ id: docSnap.id, ...docSnap.data() } as Track);
          setError(null);
        } else {
          setError("Track not found");
          setTrack(null);
        }
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching track:", err);
        setError("Failed to load track");
        setLoading(false);
      }
    );

    // Cleanup listener when component unmounts or ID changes
    return () => unsubscribe();
  }, [trackId]);

  return { track, loading, error };
};