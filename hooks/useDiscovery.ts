import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { db } from '@/lib/firebase';

export const useDiscovery = (genre: string) => {
  const [queue, setQueue] = useState<any[]>([]);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [votedTrackIds, setVotedTrackIds] = useState<Set<string>>(new Set());
  const [votedTracksLoaded, setVotedTracksLoaded] = useState(false);
  
  // CRITICAL: Continuously validate that queue and currentTrack don't contain voted tracks
  // This runs whenever votedTrackIds changes to catch any race conditions
  useEffect(() => {
    if (votedTrackIds.size === 0) return;
    
    setQueue(prevQueue => {
      const current = currentTrackRef.current;
      const votedTracksInQueue = prevQueue.filter(track => votedTrackIds.has(track.id));
      
      if (votedTracksInQueue.length > 0 || (current && votedTrackIds.has(current.id))) {
        const filtered = prevQueue.filter(track => !votedTrackIds.has(track.id));
        if (current && votedTrackIds.has(current.id)) {
          const nextTrack = filtered.find(track => !votedTrackIds.has(track.id)) || null;
          setCurrentTrack(nextTrack);
        }
        return filtered;
      }
      return prevQueue; // No changes needed
    });
  }, [votedTrackIds]);

  const hasFetchedTracksRef = useRef<string | null>(null);
  const lastDocIdRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);
  const votedTrackIdsRef = useRef<Set<string>>(new Set());
  const currentTrackRef = useRef<any>(null);
  const previousVotedIdsRef = useRef<Set<string>>(new Set()); // Track previous voted IDs to detect changes
  const isInitialSnapshotRef = useRef(true); // Track if this is the first snapshot
  const isInitializingRef = useRef(false); // Track if we're currently initializing tracks
  const auth = getAuth();

  // Keep refs in sync with state
  useEffect(() => {
    votedTrackIdsRef.current = votedTrackIds;
  }, [votedTrackIds]);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
    
    // CRITICAL: If current track is voted on, immediately remove it
    if (currentTrack && votedTrackIds.has(currentTrack.id)) {
      setQueue(prevQueue => {
        const filteredQueue = prevQueue.filter(track => !votedTrackIds.has(track.id) && track.id !== currentTrack.id);
        const nextTrack = filteredQueue.find(track => !votedTrackIds.has(track.id)) || null;
        setCurrentTrack(nextTrack);
        return filteredQueue;
      });
    }
  }, [currentTrack, votedTrackIds]);

  // Helper function to fetch tracks with server-side filtering
  const fetchTracks = useCallback(async (isInitial = false): Promise<any[]> => {
    if (isFetchingRef.current) return [];
    isFetchingRef.current = true;

    if (isInitial) {
      setLoading(true);
    }

    try {
      const user = auth.currentUser;
      let token: string | null = null;
      
      if (user) {
        try {
          token = await user.getIdToken();
        } catch (error) {
          // Silent fail - token not required for unauthenticated users
        }
      }

      const params = new URLSearchParams({
        genre,
        limit: '15',
      });

      if (lastDocIdRef.current && !isInitial) {
        params.append('lastDocId', lastDocIdRef.current);
      }

      const response = await fetch(`/api/discovery/tracks?${params.toString()}`, {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const { tracks, lastDocId } = data;

      // Simple filter: remove any tracks whose ID is in votedTrackIds
      const currentVotedIds = votedTrackIdsRef.current;
      const filteredTracks = (tracks || []).filter((track: any) => !currentVotedIds.has(track.id));

      if (lastDocId) {
        lastDocIdRef.current = lastDocId;
      } else {
        lastDocIdRef.current = null;
      }

      return filteredTracks;
    } catch (error) {
      console.error('[useDiscovery] Error fetching tracks:', error);
      return [];
    } finally {
      isFetchingRef.current = false;
      if (isInitial) {
        setLoading(false);
      }
    }
  }, [genre, auth]);

  // 1. Listen to user's voted tracks from consolidated summary document (real-time updates)
  useEffect(() => {
    setVotedTracksLoaded(false);
    isInitialSnapshotRef.current = true; // Reset on user change
    previousVotedIdsRef.current = new Set();
    const user = auth.currentUser;
    
    if (!user) {
      setVotedTrackIds(new Set());
      setVotedTracksLoaded(true);
      return;
    }

    const userVotesRef = doc(db, 'userVotes', user.uid);
    const unsubscribe = onSnapshot(
      userVotesRef,
      (snapshot) => {
        // Get votedTrackIds array from document
        const votedIds = snapshot.exists() 
          ? (snapshot.data()?.votedTrackIds || [])
          : [];
        
        // Convert to Set for O(1) lookup, ensuring all values are strings
        const votedIdsSet = new Set<string>(
          (votedIds as unknown[]).filter((id): id is string => typeof id === 'string')
        );
        
        // Only filter queue if this is NOT the initial snapshot AND there are new votes
        const isInitial = isInitialSnapshotRef.current;
        const previousIds = previousVotedIdsRef.current;
        
        // Detect new votes (tracks that weren't in the previous set)
        const newVotes = Array.from(votedIdsSet).filter((id: string) => !previousIds.has(id));
        
        // Update state
        setVotedTrackIds(votedIdsSet);
        previousVotedIdsRef.current = votedIdsSet;
        
        // Only filter queue on subsequent updates (not initial load) and only if there are new votes
        if (!isInitial && newVotes.length > 0) {
          // Filter out newly voted tracks from queue
          setQueue(prevQueue => {
            const filteredQueue = prevQueue.filter(track => !votedIdsSet.has(track.id));
            
            // If current track was voted on, advance to next
            const current = currentTrackRef.current;
            if (current && votedIdsSet.has(current.id)) {
              // Find the first unvoted track in the filtered queue
              const nextUnvotedTrack = filteredQueue.find(track => !votedIdsSet.has(track.id)) || null;
              setCurrentTrack(nextUnvotedTrack);
            }
            
            return filteredQueue;
          });
        }
        
        // Only run defensive check on subsequent updates (not initial snapshot or during initialization)
        // On initial snapshot, tracks haven't been loaded yet, so don't clear currentTrack
        // During initialization, we're still setting up tracks, so don't interfere
        if (!isInitial && !isInitializingRef.current) {
          const current = currentTrackRef.current;
          if (current && votedIdsSet.has(current.id)) {
            // Current track was voted on, find next unvoted track from queue
            setQueue(prevQueue => {
              const filteredQueue = prevQueue.filter(track => !votedIdsSet.has(track.id));
              const nextUnvotedTrack = filteredQueue.find(track => !votedIdsSet.has(track.id)) || null;
              setCurrentTrack(nextUnvotedTrack);
              return filteredQueue;
            });
          }
        }
        
        isInitialSnapshotRef.current = false;
        setVotedTracksLoaded(true);
      },
      (error) => {
        console.error('[useDiscovery] Error listening to voted tracks:', error);
        setVotedTrackIds(new Set());
        previousVotedIdsRef.current = new Set();
        setVotedTracksLoaded(true);
        isInitialSnapshotRef.current = false;
      }
    );

    return () => unsubscribe();
  }, [auth.currentUser?.uid]);

  // 2. Initial Fetch - fetch tracks when vote status is loaded, refetch only when genre changes
  useEffect(() => {
    if (!votedTracksLoaded) {
      return;
    }

    const genreKey = genre;
    if (hasFetchedTracksRef.current === genreKey) {
      return;
    }

    lastDocIdRef.current = null;

    const initializeTracks = async () => {
      isInitializingRef.current = true;
      hasFetchedTracksRef.current = genreKey;
      
      // Ensure we have the latest voted tracks before fetching
      await new Promise(resolve => setTimeout(resolve, 0));
      
      const unvotedTracks = await fetchTracks(true);
      
      // Simple filter: remove any tracks whose ID is in votedTrackIds
      const currentVotedIds = votedTrackIdsRef.current;
      const finalTracks = unvotedTracks.filter((track: any) => !currentVotedIds.has(track.id));
      
      if (finalTracks.length > 0) {
        setQueue(finalTracks);
        setCurrentTrack(finalTracks[0]);
      } else {
        setQueue([]);
        setCurrentTrack(null);
      }
      
      isInitializingRef.current = false;
    };

    initializeTracks();
  }, [genre, votedTracksLoaded, fetchTracks]);

  // 3. The "Next" Action with prefetching
  const next = useCallback(() => {
    setQueue(prevQueue => {
      const current = currentTrackRef.current;
      const currentVotedIds = votedTrackIdsRef.current;
      
      // Filter out voted tracks and remove current track
      const filteredQueue = prevQueue.filter(track => !currentVotedIds.has(track.id));
      const nextQueue = filteredQueue[0]?.id === current?.id ? filteredQueue.slice(1) : filteredQueue;
      const nextTrack = nextQueue[0] || null;
      const needsPrefetch = nextQueue.length < 5 && !isFetchingRef.current;
      
      if (nextTrack) {
        setCurrentTrack(nextTrack);
      } else if (needsPrefetch) {
        // Keep current track visible while prefetching, unless it's voted
        if (current && currentVotedIds.has(current.id)) {
          setCurrentTrack(null);
        }
      } else {
        setCurrentTrack(null);
      }

      // Prefetch more tracks if needed
      if (needsPrefetch) {
        fetchTracks(false).then(newTracks => {
          if (newTracks && newTracks.length > 0) {
            const latestVotedIds = votedTrackIdsRef.current;
            const filteredTracks = newTracks.filter((track: any) => !latestVotedIds.has(track.id));
            
            if (filteredTracks.length > 0) {
              setQueue(prev => {
                const cleanPrev = prev.filter(track => !latestVotedIds.has(track.id));
                const updatedQueue = [...cleanPrev, ...filteredTracks];
                
                setCurrentTrack((prevTrack: any) => {
                  if (!prevTrack || latestVotedIds.has(prevTrack.id)) {
                    return updatedQueue[0] || null;
                  }
                  return prevTrack;
                });
                
                return updatedQueue;
              });
            } else {
              setCurrentTrack((prev: any) => (prev && !latestVotedIds.has(prev.id)) ? prev : null);
            }
          } else {
            setCurrentTrack((prev: any) => (prev && !currentVotedIds.has(prev.id)) ? prev : null);
          }
        }).catch(err => {
          console.error('[useDiscovery] Error prefetching tracks:', err);
        });
      }

      return nextQueue;
    });
  }, [fetchTracks]);

  // 4. Mark track as voted (for real-time updates within session)
  const markAsVoted = useCallback((trackId: string) => {
    setVotedTrackIds(prev => {
      const updated = new Set([...prev, trackId]);
      votedTrackIdsRef.current = updated;
      return updated;
    });
    
    setQueue(prev => prev.filter(track => track.id !== trackId));
  }, []);

  return { currentTrack, next, loading, markAsVoted };
};