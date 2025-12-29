import * as admin from 'firebase-admin';
import { getAdminDb } from '../lib/firebase-admin';

/**
 * Migration script to optimize userLikes collection
 * 
 * This script:
 * 1. Removes redundant track metadata from userLikes documents
 * 2. Keeps only userId, trackId, and createdAt
 * 3. Verifies track exists before migration
 * 
 * Run with: npm run migrate-likes
 * or: tsx scripts/migrateUserLikes.ts
 */
async function migrateUserLikes() {
  console.log('🚀 Starting userLikes migration to minimal structure...\n');
  
  try {
    const adminDb = getAdminDb();
    
    // Get all userLikes documents
    const likesSnapshot = await adminDb.collection('userLikes').get();
    console.log(`Found ${likesSnapshot.size} likes to process\n`);
    
    let processed = 0;
    let skipped = 0;
    let errors = 0;
    const batch = adminDb.batch();
    let batchCount = 0;
    
    for (const likeDoc of likesSnapshot.docs) {
      try {
        const data = likeDoc.data();
        const trackId = data.trackId || likeDoc.id.split('_')[1];
        const userId = data.userId || likeDoc.id.split('_')[0];
        
        if (!trackId || !userId) {
          console.warn(`⚠️  Skipping like ${likeDoc.id}: missing trackId or userId`);
          skipped++;
          continue;
        }
        
        // Verify track exists
        const trackDoc = await adminDb.collection('tracks').doc(trackId).get();
        if (!trackDoc.exists) {
          console.warn(`⚠️  Track ${trackId} not found, skipping like ${likeDoc.id}`);
          skipped++;
          continue;
        }
        
        // Check if already migrated (has only userId, trackId, createdAt)
        const hasOnlyEssentialFields = 
          Object.keys(data).length === 3 &&
          data.userId &&
          data.trackId &&
          data.createdAt &&
          !data.trackTitle &&
          !data.trackArtist &&
          !data.trackCover &&
          !data.genre &&
          !data.soundcloudUrl &&
          !data.username;
        
        if (hasOnlyEssentialFields) {
          // Already migrated, skip
          continue;
        }
        
        // Update to minimal structure
        const likeRef = adminDb.collection('userLikes').doc(likeDoc.id);
        
        // Prepare update with essential fields and field deletions
        const updateData: any = {
          userId: userId,
          trackId: trackId,
        };
        
        // Preserve createdAt if it exists, otherwise use serverTimestamp
        if (data.createdAt) {
          updateData.createdAt = data.createdAt;
        } else {
          updateData.createdAt = admin.firestore.FieldValue.serverTimestamp();
        }
        
        // Add field deletions
        if (data.trackTitle) updateData.trackTitle = admin.firestore.FieldValue.delete();
        if (data.trackArtist) updateData.trackArtist = admin.firestore.FieldValue.delete();
        if (data.trackCover) updateData.trackCover = admin.firestore.FieldValue.delete();
        if (data.genre) updateData.genre = admin.firestore.FieldValue.delete();
        if (data.soundcloudUrl) updateData.soundcloudUrl = admin.firestore.FieldValue.delete();
        if (data.username) updateData.username = admin.firestore.FieldValue.delete();
        
        batch.update(likeRef, updateData);
        
        batchCount++;
        processed++;
        
        // Commit batch every 500 operations (Firestore limit)
        if (batchCount >= 500) {
          await batch.commit();
          console.log(`✅ Committed batch of ${batchCount} likes (${processed}/${likesSnapshot.size})`);
          batchCount = 0;
        }
        
      } catch (error) {
        console.error(`❌ Error processing like ${likeDoc.id}:`, error);
        errors++;
      }
    }
    
    // Commit remaining batch
    if (batchCount > 0) {
      await batch.commit();
      console.log(`✅ Committed final batch of ${batchCount} likes`);
    }
    
    console.log(`\n✅ UserLikes migration complete!`);
    console.log(`   - Processed: ${processed} likes`);
    console.log(`   - Skipped: ${skipped} likes (missing data or already migrated)`);
    console.log(`   - Errors: ${errors}`);
    console.log(`\n💾 Storage savings: ~${Math.round(processed * 0.7)} KB (estimated)`);
    console.log(`\nUserLikes are now optimized and ready!`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

migrateUserLikes();

