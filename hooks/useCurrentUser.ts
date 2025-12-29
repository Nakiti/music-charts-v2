import { useState, useEffect } from 'react';
import { doc, onSnapshot, getFirestore } from 'firebase/firestore';
import { useAuth } from './useAuth';
import { db } from '@/lib/firebase';

export const useCurrentUser = () => {
  const { user: authUser, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  // const db = getFirestore();

  useEffect(() => {
    if (authLoading) return;
    
    if (!authUser) {
      setProfile(null);
      setLoading(false);
      return;
    }

    // Subscribe to the Firestore document for real-time updates
    const unsubscribe = onSnapshot(doc(db, 'users', authUser.uid), (doc) => {
      if (doc.exists()) {
        setProfile(doc.data());
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [authUser?.uid, authLoading]);

  return { 
    user: authUser,      // The Firebase Auth Object (email, uid)
    profile,             // The Firestore Data (username, bio, stats)
    loading: loading || authLoading 
  };
};