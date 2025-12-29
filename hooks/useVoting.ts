import { useState } from 'react';
import { signInAnonymously } from 'firebase/auth';
import {
  doc,
  runTransaction,
  collection,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { useAuth } from './useAuth'; // Assuming you have an auth hook
import { auth, db } from '@/lib/firebase';
import { useCurrentUser } from './useCurrentUser';

type ActivityMeta = {
  trackTitle?: string;
  genre?: string;
  /** Optional extra fields used for likes denormalization */
  trackArtist?: string;
  trackCover?: string;
  soundcloudUrl?: string;
};

export const useVoting = () => {
  const [isVoting, setIsVoting] = useState(false);
  const { user } = useAuth();
  const { profile } = useCurrentUser();

  const castVote = async (
    trackId: string,
    voteType: 'FIRE' | 'PASS',
    meta?: ActivityMeta
  ) => {
    console.log('[useVoting] castVote called', {
      trackId,
      voteType,
      meta,
      hasUser: !!user,
    });

    setIsVoting(true);

    // Allow guests to vote: if there is no user, transparently create an anonymous account.
    let currentUser = user;

    if (!currentUser) {
      console.warn('[useVoting] No authenticated user, attempting anonymous sign-in for guest vote.');
      try {
        const userCredential = await signInAnonymously(auth);
        currentUser = userCredential.user;
        console.log('[useVoting] Anonymous sign-in completed', {
          hasUser: !!currentUser,
          uid: currentUser?.uid,
        });
        
        // Wait for auth state to propagate - use a more reliable approach
        // Check auth state directly rather than arbitrary timeout
        let retries = 0;
        while (!auth.currentUser && retries < 10) {
          await new Promise(resolve => setTimeout(resolve, 100));
          retries++;
        }
      } catch (anonError) {
        console.error('[useVoting] Anonymous sign-in failed, aborting vote.', anonError);
        setIsVoting(false);
        return;
      }
    }

    if (!currentUser) {
      console.error('[useVoting] Still no user after anonymous sign-in, aborting vote.');
      setIsVoting(false);
      return;
    }

    const trackRef = doc(db, 'tracks', trackId);
    const voteRef = doc(db, 'votes', `${currentUser.uid}_${trackId}`);
    // Dedicated collection to persist which songs a user has liked
    const likeRef = doc(db, 'userLikes', `${currentUser.uid}_${trackId}`);

    try {
      console.log('[useVoting] Starting vote transaction', {
        userId: currentUser.uid,
        trackId,
        voteType,
      });

      await runTransaction(db, async transaction => {
        // === ALL READS MUST COME FIRST ===
        
        // 1. Check if user already voted to prevent spam
        const voteDoc = await transaction.get(voteRef);
        if (voteDoc.exists()) {
          console.warn('[useVoting] User has already voted on this track', {
            userId: currentUser.uid,
            trackId,
          });
          throw new Error('Already voted');
        }

        // 2. Verify the track exists
        const trackDoc = await transaction.get(trackRef);
        if (!trackDoc.exists()) {
          console.error('[useVoting] Track does not exist', { trackId });
          throw new Error('Track not found');
        }

        // === NOW ALL WRITES ===
        
        // 3. Record the vote
        const voteData = {
          userId: currentUser.uid,
          trackId,
          voteType,
          timestamp: serverTimestamp(),
        };
        console.log('[useVoting] Setting vote document', {
          voteRefPath: voteRef.path,
          voteData,
          expectedDocId: `${currentUser.uid}_${trackId}`,
        });
        transaction.set(voteRef, voteData);

        // Cloud Function will handle updating track stats, Wilson score, and Redis
        // This keeps client-side updates minimal and cheap at scale

        // 4. If this was a FIRE vote, also persist a like document for this user/track
        // Store minimal data - track details will be fetched from tracks collection when needed
        if (voteType === 'FIRE') {
          transaction.set(likeRef, {
            userId: currentUser.uid,
            trackId,
            createdAt: serverTimestamp(),
          });
        }
      });

      console.log('[useVoting] Vote transaction committed successfully', {
        userId: currentUser.uid,
        trackId,
        voteType,
      });

      // After the vote transaction succeeds, record a lightweight activity item
      try {
        await addDoc(collection(db, 'activity'), {
          userId: currentUser.uid,
          username: profile?.username || currentUser.displayName || 'Anonymous',
          trackId,
          trackTitle: meta?.trackTitle || null,
          soundcloudUrl: meta?.soundcloudUrl || null,
          genre: meta?.genre || null,
          action: voteType,
          createdAt: serverTimestamp(),
        });
        console.log('[useVoting] Activity logged successfully');
      } catch (activityError) {
        console.error('[useVoting] Failed to log activity (non-critical)', activityError);
        // Don't throw - activity logging is optional
      }
    } catch (error) {
      const err: any = error;
      console.error('[useVoting] Vote failed', error);
      if (err && err.code) {
        console.error('[useVoting] Firestore error details', {
          code: err.code,
          message: err.message,
        });
      }
    } finally {
      console.log('[useVoting] Vote flow finished, resetting isVoting flag');
      setIsVoting(false);
    }
  };

  return { castVote, isVoting };
};