import { useState } from 'react';
import { doc, updateDoc, setDoc, getFirestore, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { useAuth } from './useAuth';

export const useUserActions = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const db = getFirestore();

  /**
   * Create the initial profile in Firestore after Auth Registration
   * Called manually after createUserWithEmailAndPassword succeeds
   */
  const createProfile = async (uid: string, data: { username: string; email: string }) => {
    setLoading(true);
    try {
      const userRef = doc(db, 'users', uid);
      
      await setDoc(userRef, {
        username: data.username,
        email: data.email,
        bio: '',
        avatar: '', // Default avatar logic can go here
        location: '',
        isArtist: false,
        joinedAt: serverTimestamp(),
        stats: {
          followers: 0,
          following: 0,
          uploads: 0,
          votesCast: 0,
          fireRate: 0 // Will be calculated later
        }
      });
    } catch (error) {
      console.error("Profile creation failed", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (data: { bio?: string; location?: string; avatar?: string; banner?: string; website?: string; twitter?: string; instagram?: string }) => {
    if (!user) throw new Error("Must be logged in");
    
    setLoading(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      
      // Update only allowed fields
      await updateDoc(userRef, {
        ...data,
        updatedAt: serverTimestamp() // Use server timestamp for consistency
      });
      
    } catch (error) {
      console.error("Profile update failed", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Upload a new avatar image file to Firebase Storage and update
   * the user's Firestore profile with the resulting download URL.
   */
  const uploadAvatar = async (file: File) => {
    if (!user) throw new Error("Must be logged in");

    setLoading(true);
    try {
      const extension = file.name.split('.').pop() || 'jpg';
      const avatarRef = ref(
        storage,
        `users/profile_images/${user.uid}/avatar.${extension}`
      );

      await uploadBytes(avatarRef, file, {
        contentType: file.type,
      });

      const downloadURL = await getDownloadURL(avatarRef);

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        avatar: downloadURL,
        updatedAt: serverTimestamp(),
      });

      return downloadURL;
    } catch (error) {
      console.error("Avatar upload failed", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Upload a new banner image file to Firebase Storage and update
   * the user's Firestore profile with the resulting download URL.
   */
  const uploadBanner = async (file: File) => {
    if (!user) throw new Error("Must be logged in");

    setLoading(true);
    try {
      const extension = file.name.split('.').pop() || 'jpg';
      const bannerRef = ref(
        storage,
        `users/profile_images/${user.uid}/banner.${extension}`
      );

      await uploadBytes(bannerRef, file, {
        contentType: file.type,
      });

      const downloadURL = await getDownloadURL(bannerRef);

      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        banner: downloadURL,
        updatedAt: serverTimestamp(),
      });

      return downloadURL;
    } catch (error) {
      console.error("Banner upload failed", error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { createProfile, updateProfile, uploadAvatar, uploadBanner, loading };
};