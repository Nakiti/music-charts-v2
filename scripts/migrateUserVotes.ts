import * as admin from 'firebase-admin';
import { readFileSync } from 'fs';
import { join } from 'path';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  readFileSync(join(__dirname, '../music-charts-b3ad5-firebase-adminsdk-fbsvc-fbf4bfb442.json'), 'utf-8')
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
});

const db = admin.firestore();

/**
 * One-time script to migrate existing votes to userVotes summary documents
 * Run this once after deploying the new architecture
 */
async function migrateUserVotes() {
  console.log('🚀 Starting user votes migration...\n');
  
  try {
    // Get all votes from Firestore
    const votesSnapshot = await db.collection('votes').get();
    console.log(`Found ${votesSnapshot.size} votes to process`);
    
    // Aggregate votes by user
    const userVotesMap = new Map<string, Set<string>>();
    
    votesSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const userId = data.userId;
      const trackId = data.trackId;
      
      if (!userId || !trackId) return;
      
      if (!userVotesMap.has(userId)) {
        userVotesMap.set(userId, new Set());
      }
      userVotesMap.get(userId)!.add(trackId);
    });
    
    console.log(`\nAggregated votes for ${userVotesMap.size} users`);
    console.log('Writing to userVotes collection...\n');
    
    // Write to userVotes collection in batches
    let processed = 0;
    let errors = 0;
    const batch = db.batch();
    let batchCount = 0;
    
    for (const [userId, trackIds] of userVotesMap.entries()) {
      try {
        const userVotesRef = db.collection('userVotes').doc(userId);
        
        batch.set(userVotesRef, {
          votedTrackIds: Array.from(trackIds),
          voteCount: trackIds.size,
          lastVote: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        batchCount++;
        processed++;
        
        // Commit batch every 500 operations (Firestore limit)
        if (batchCount >= 500) {
          await batch.commit();
          console.log(`Committed batch of ${batchCount} users (${processed}/${userVotesMap.size})`);
          batchCount = 0;
        }
        
      } catch (error) {
        console.error(`Error processing user ${userId}:`, error);
        errors++;
      }
    }
    
    // Commit remaining batch
    if (batchCount > 0) {
      await batch.commit();
      console.log(`Committed final batch of ${batchCount} users`);
    }
    
    console.log(`\n✅ User votes migration complete!`);
    console.log(`   - Migrated: ${processed} users`);
    console.log(`   - Errors: ${errors}`);
    console.log(`\nUser votes are now consolidated and ready!`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

migrateUserVotes();


