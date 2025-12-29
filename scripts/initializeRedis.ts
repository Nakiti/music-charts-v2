import * as admin from 'firebase-admin';
import { Redis } from '@upstash/redis';
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

// Initialize Redis
const redis = new Redis({
  url: 'https://amusing-squirrel-36744.upstash.io',
  token: 'AY-IAAIncDFmMmJiZjVmZTY4ZDU0ZWZkYmQ3OTFhMjBiNTE0ODk1NnAxMzY3NDQ',
});

/**
 * One-time script to initialize Redis with existing Firestore data
 * Run this once after deploying the new architecture
 */
async function initializeRedis() {
  console.log('🚀 Starting Redis initialization from Firestore...\n');
  
  try {
    // Get all tracks from Firestore
    const tracksSnapshot = await db.collection('tracks').get();
    console.log(`Found ${tracksSnapshot.size} tracks to process`);
    
    let processed = 0;
    let errors = 0;
    
    for (const trackDoc of tracksSnapshot.docs) {
      try {
        const data = trackDoc.data();
        const trackId = trackDoc.id;
        const genre = data.meta?.genre || 'unknown';
        const votesFire = data.stats?.votesFire || 0;
        const totalVotes = data.stats?.totalVotes || 0;
        const wilsonScore = data.stats?.wilsonScore || 0;
        
        // Set vote counts in Redis
        await redis.set(`track:${trackId}:fires`, votesFire);
        await redis.set(`track:${trackId}:total`, totalVotes);
        
        // Add to leaderboards
        const redisScore = Math.round(wilsonScore * 1000);
        
        await Promise.all([
          redis.zadd(`leaderboard:${genre}:daily`, {
            score: redisScore,
            member: trackId,
          }),
          redis.zadd(`leaderboard:global:daily`, {
            score: redisScore,
            member: trackId,
          }),
        ]);
        
        processed++;
        
        if (processed % 10 === 0) {
          console.log(`Processed ${processed}/${tracksSnapshot.size} tracks...`);
        }
        
      } catch (error) {
        console.error(`Error processing track ${trackDoc.id}:`, error);
        errors++;
      }
    }
    
    console.log(`\n✅ Redis initialization complete!`);
    console.log(`   - Processed: ${processed} tracks`);
    console.log(`   - Errors: ${errors}`);
    console.log(`\nRedis is now ready for production use!`);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  }
}

// Check for required environment variables
// if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
//   console.error('❌ Missing Redis environment variables!');
//   console.error('   Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN');
//   process.exit(1);
// }

initializeRedis();


