import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Track } from '@/types';

interface LeaderboardData {
  genre: string;
  timeframe: string;
  updatedAt: Date | null;
  trackCount: number;
  tracks: Track[];
}

/**
 * Real-time leaderboard hook using Firestore onSnapshot
 * Updates automatically when leaderboard changes (every 2 minutes from Cloud Function)
 * Much more efficient than polling!
 */
export const useRealtimeLeaderboard = (genre: string) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasReceivedSnapshot, setHasReceivedSnapshot] = useState(false);
  
  useEffect(() => {
    // Don't set up listener if genre is empty
    if (!genre) {
      setTracks([]);
      setLoading(false);
      setError(null);
      setHasReceivedSnapshot(false);
      return;
    }
    
    // Reset states when genre changes
    setLoading(true);
    setError(null);
    setHasReceivedSnapshot(false);
    
    // console.log(`[useRealtimeLeaderboard] Setting up listener for ${genre}`);
    
    // Listen to live leaderboard summary document
    const unsubscribe = onSnapshot(
      doc(db, 'leaderboards_live', `${genre}_daily`),
      {
        includeMetadataChanges: false, // Only listen to actual data changes
      },
      (snapshot) => {
        setHasReceivedSnapshot(true);
        if (snapshot.exists()) {
          const data = snapshot.data() as LeaderboardData;
          setTracks(data.tracks || []);
          setUpdatedAt(data.updatedAt ? new Date(data.updatedAt as any) : null);
          setLoading(false);
          
          // console.log(`[useRealtimeLeaderboard] ✅ Real-time update for ${genre}: ${data.tracks?.length || 0} tracks from leaderboards_live/${genre}_daily`);
        } else {
          // Silently handle missing document - fallback will be used
          // console.log(`[useRealtimeLeaderboard] ⚠️ No document found for ${genre} at leaderboards_live/${genre}_daily`);
          setTracks([]);
          setLoading(false);
        }
      },
      (err) => {
        console.error(`[useRealtimeLeaderboard] Error listening to ${genre}:`, err);
        setError(err.message);
        setLoading(false);
        setHasReceivedSnapshot(true);
      }
    );
    
    // Cleanup listener on unmount or genre change
    return () => {
      // console.log(`[useRealtimeLeaderboard] Cleaning up listener for ${genre}`);
      unsubscribe();
    };
  }, [genre]);
  
  return { tracks, loading: loading || !hasReceivedSnapshot, updatedAt, error };
};

