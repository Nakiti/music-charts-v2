import { useEffect, useState } from 'react';
import { doc, onSnapshot, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useCurrentUser } from './useCurrentUser';

export const useFollowing = (
  targetUserId: string | null | undefined,
  targetUsername?: string | null,
  targetAvatar?: string | null
) => {
  const { user, profile } = useCurrentUser();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(true);

  const followerId = user?.uid ?? null;

  useEffect(() => {
    if (!followerId || !targetUserId) {
      setIsFollowing(false);
      setLoading(false);
      return;
    }

    const followId = `${followerId}_${targetUserId}`;
    const ref = doc(db, 'follows', followId);

    const unsubscribe = onSnapshot(
      ref,
      (snap) => {
        setIsFollowing(snap.exists());
        setLoading(false);
      },
      (error) => {
        console.error('[useFollowing] Error subscribing to follow doc', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [followerId, targetUserId]);

  const toggleFollow = async () => {
    if (!followerId || !targetUserId) {
      console.warn('[useFollowing] Cannot toggle follow without followerId and targetUserId');
      return;
    }

    const followId = `${followerId}_${targetUserId}`;
    const ref = doc(db, 'follows', followId);

    try {
      if (isFollowing) {
        await deleteDoc(ref);
      } else {
        await setDoc(ref, {
          followerId,
          followerUsername: profile?.username ?? null,
          followedId: targetUserId,
          followedUsername: targetUsername ?? null,
          followedAvatar: targetAvatar ?? null,
          createdAt: serverTimestamp(),
        });
      }
    } catch (error) {
      console.error('[useFollowing] Failed to toggle follow state', error);
    }
  };

  return { isFollowing, toggleFollow, loading };
};


