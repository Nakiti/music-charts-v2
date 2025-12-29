import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import * as admin from 'firebase-admin';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * Triggered whenever a follow document is created or deleted.
 * Keeps users.stats.followers and users.stats.following in sync.
 */
export const onFollowWritten = onDocumentWritten('follows/{followId}', async (event) => {
  const before = event.data?.before;
  const after = event.data?.after;

  if (!before?.exists && after?.exists) {
    const data = after.data();
    if (!data) return;

    const followerId = data.followerId as string | undefined;
    const followedId = data.followedId as string | undefined;

    if (!followerId || !followedId) {
      console.warn('[onFollowWritten] Missing followerId or followedId on create', { followerId, followedId });
      return;
    }

    const followerRef = db.collection('users').doc(followerId);
    const followedRef = db.collection('users').doc(followedId);

    await db.runTransaction(async (tx) => {
      tx.update(followerRef, {
        'stats.following': admin.firestore.FieldValue.increment(1),
      });
      tx.update(followedRef, {
        'stats.followers': admin.firestore.FieldValue.increment(1),
      });
    });

    console.log('[onFollowWritten] Follow created', { followerId, followedId });
    return;
  }

  if (before?.exists && !after?.exists) {
    const data = before.data();
    if (!data) return;

    const followerId = data.followerId as string | undefined;
    const followedId = data.followedId as string | undefined;

    if (!followerId || !followedId) {
      console.warn('[onFollowWritten] Missing followerId or followedId on delete', { followerId, followedId });
      return;
    }

    const followerRef = db.collection('users').doc(followerId);
    const followedRef = db.collection('users').doc(followedId);

    await db.runTransaction(async (tx) => {
      tx.update(followerRef, {
        'stats.following': admin.firestore.FieldValue.increment(-1),
      });
      tx.update(followedRef, {
        'stats.followers': admin.firestore.FieldValue.increment(-1),
      });
    });
  }
});


