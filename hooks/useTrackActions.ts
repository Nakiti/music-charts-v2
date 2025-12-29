import { useState } from 'react';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  doc, 
  updateDoc, 
  serverTimestamp,
  increment,
  getDocs,
  query,
  where,
  limit,
} from 'firebase/firestore';
import { useAuth } from './useAuth';
import { Track } from '@/types'; // Ensure you have your shared types
import { useCurrentUser } from './useCurrentUser';
import { trackNameToSlug, makeSlugUnique } from '@/lib/slug';
import { validateTrackTitle, validateArtistName } from '@/lib/validation';

export const useTrackActions = () => {
  const { user } = useAuth();
  const {profile} = useCurrentUser()
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const db = getFirestore();

  /**
   * Upload a new track
   * Handles initialization of stats and metadata
   */
  const uploadTrack = async (input: {
    title: string;
    artist: string;
    genre: string;
    cover: string;
    provider: 'YOUTUBE' | 'SOUNDCLOUD';
    externalId: string;
    dropTime: number; // Start time in seconds
  }) => {
    if (!user) throw new Error("Must be logged in to upload");
    
    setLoading(true);
    setError(null);

    try {
      // Validate track title and artist name
      const titleValidation = validateTrackTitle(input.title);
      if (!titleValidation.valid) {
        throw new Error(titleValidation.error);
      }

      const artistValidation = validateArtistName(input.artist);
      if (!artistValidation.valid) {
        throw new Error(artistValidation.error);
      }

      // First, enforce uniqueness by SoundCloud URL / externalId
      const tracksRef = collection(db, 'tracks');
      const q = query(
        tracksRef,
        where('meta.externalId', '==', input.externalId),
        limit(1)
      );
      const existingSnap = await getDocs(q);

      if (!existingSnap.empty) {
        throw new Error("This SoundCloud link has already been uploaded.");
      }

      // Generate slug for the track
      const baseSlug = trackNameToSlug(input.title);
      
      // Get existing slugs for this user to ensure uniqueness
      const userTracksQuery = query(
        tracksRef,
        where('uploaderUsername', '==', profile.username)
      );
      const userTracksSnap = await getDocs(userTracksQuery);
      const existingSlugs = userTracksSnap.docs
        .map(doc => doc.data().slug)
        .filter(Boolean) as string[];
      
      // Make slug unique
      const uniqueSlug = makeSlugUnique(baseSlug, existingSlugs);

      // Create the clean data object
      // Note: We initialize scores to 0. 
      // The 'trendScore' might need a Cloud Function to give it an initial "New Release" boost if desired.
      const newTrackData = {
        uploaderId: user.uid,
        uploaderUsername: profile.username,
        slug: uniqueSlug,
        status: 'ACTIVE',
        createdAt: serverTimestamp(),
        meta: {
          title: input.title.trim(),
          artist: input.artist.trim(),
          genre: input.genre,
          subGenre: "", // Optional
          provider: input.provider,
          externalId: input.externalId,
          dropTime: input.dropTime,
          cover: input.cover
        },
        stats: {
          votesFire: 0,
          votesPass: 0,
          totalVotes: 0,
          wilsonScore: 0,
          trendScore: 0
        }
      };

      const docRef = await addDoc(collection(db, 'tracks'), newTrackData);

      // Increment the user's upload count
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        'stats.uploads': increment(1)
      });

      return docRef.id; // Return ID; UI can combine with uploaderUsername/slug for /track/[username]/[slug]

    } catch (err: any) {
      console.error("Upload failed", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Edit an existing track
   * Only allows editing metadata, NOT stats
   */
  const updateTrack = async (trackId: string, updates: Partial<Track['metadata']> & { title?: string, artist?: string }) => {
    if (!user) throw new Error("Must be logged in");
    
    setLoading(true);
    setError(null);

    try {
      const trackRef = doc(db, 'tracks', trackId);
      
      // We map the flat input to the nested 'meta' field structure in Firestore
      // Using dot notation "meta.title" updates ONLY that field without overwriting the whole object
      const firestoreUpdates: any = {};
      if (updates.title) firestoreUpdates['meta.title'] = updates.title;
      if (updates.artist) firestoreUpdates['meta.artist'] = updates.artist;
      if (updates.dropTime) firestoreUpdates['meta.dropTime'] = updates.dropTime;
      if (updates.cover) firestoreUpdates['meta.cover'] = updates.cover;

      firestoreUpdates['updatedAt'] = serverTimestamp();

      await updateDoc(trackRef, firestoreUpdates);

    } catch (err: any) {
      console.error("Update failed", err);
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { uploadTrack, updateTrack, loading, error };
};