import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  getDocs,
  DocumentData 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Track } from '@/types'; // Assuming shared types are here
import { getCachedData, setCachedData, createCacheKey } from '@/lib/cache-utils';

export interface UserProfileData {
    profile: DocumentData | null;
    uploads: Track[];
    loading: boolean;
    error: string | null;
    userId: string | null;
}

export const useUserProfile = (username: string | undefined): UserProfileData => {
  const [profile, setProfile] = useState<DocumentData | null>(null);
  const [uploads, setUploads] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!username) {
        setLoading(false);
        setError("No username provided.");
        setProfile(null);
        setUploads([]);
        setUserId(null);
        return;
      }
      
      // Check cache first
      const cacheKey = createCacheKey('profile', username);
      const CACHE_TTL = 5 * 60 * 1000; // 5 minutes - profiles don't change frequently
      
      const cached = getCachedData<{
        profile: DocumentData;
        uploads: Track[];
        userId: string;
      }>(cacheKey, CACHE_TTL);
      
      if (cached) {
        setProfile(cached.data.profile);
        setUploads(cached.data.uploads);
        setUserId(cached.data.userId);
        setLoading(false);
        setError(null);
        return;
      }
      
      setLoading(true);
      setError(null);
      setUserId(null);
      let uploaderId: string | null = null;
      
      try {
        // 1. Find User UID using the public username (indexed query)
        const userQuery = query(
            collection(db, 'users'), 
            where('username', '==', username), 
            limit(1)
        );
        const userSnap = await getDocs(userQuery);
        
        if (userSnap.empty) {
          setError("User not found.");
          setProfile(null);
          setUploads([]);
          setUserId(null);
          return;
        }

        // Extract the UID and Profile Data
        const userDoc = userSnap.docs[0];
        uploaderId = userDoc.id; // This is the user's UID
        const profileData = userDoc.data();
        setUserId(uploaderId);
        setProfile(profileData);

        // 2. Get their Uploads (using the UID)
        const uploadsQ = query(
          collection(db, 'tracks'), 
          where('uploaderId', '==', uploaderId),
          orderBy('createdAt', 'desc')
        );
        
        let uploadsSnap;
        let uploadsData: Track[] = [];
        
        try {
          uploadsSnap = await getDocs(uploadsQ);
          uploadsData = uploadsSnap.docs.map(d => ({id: d.id, ...d.data()} as Track));
        } catch (queryErr: any) {
          // Handle missing composite index gracefully
          if (queryErr?.code === 'failed-precondition' || queryErr?.message?.includes('index')) {
            console.warn("Composite index missing for uploads query, using simpler query");
            // Fallback: query without orderBy (less efficient but works)
            const simpleQuery = query(
              collection(db, 'tracks'),
              where('uploaderId', '==', uploaderId)
            );
            uploadsSnap = await getDocs(simpleQuery);
            // Sort in memory
            const sortedDocs = uploadsSnap.docs.sort((a, b) => {
              const aTime = a.data().createdAt?.toMillis() || 0;
              const bTime = b.data().createdAt?.toMillis() || 0;
              return bTime - aTime; // Descending order
            });
            uploadsData = sortedDocs.map(d => ({id: d.id, ...d.data()} as Track));
          } else {
            throw queryErr;
          }
        }
        
        setUploads(uploadsData);
        
        // Cache the complete profile data
        setCachedData(cacheKey, {
          profile: profileData,
          uploads: uploadsData,
          userId: uploaderId,
        }, true);
        
      } catch (err) {
        console.error("Error fetching profile data:", err);
        setError("Failed to load profile data.");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [username]);

  return { profile, uploads, loading, error, userId };
};