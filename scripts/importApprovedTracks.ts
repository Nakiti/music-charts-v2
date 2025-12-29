/**
 * Batch Import Approved Tracks to Firestore
 * 
 * This script imports tracks that have been approved in the review interface
 * from the local JSON file to Firestore.
 * 
 * Usage:
 *   npm run import-approved-tracks
 * 
 * The script will:
 * 1. Load tracks from scripts/scraped-tracks.json
 * 2. Filter for tracks where approved === true
 * 3. Check if tracks already exist in Firestore
 * 4. Batch import approved tracks
 * 5. Update the JSON file to mark imported tracks
 */

import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// Initialize admin with your service account
import serviceAccount from '../music-charts-b3ad5-firebase-adminsdk-fbsvc-fbf4bfb442.json' assert { type: 'json' };
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
});

const db = admin.firestore();

// System user ID for scraped tracks
const SYSTEM_USER_ID = 'system-scraper'; // TODO: Replace with actual system user UID

interface ScrapedTrack {
  url: string;
  title: string;
  artist: string;
  genre: string;
  thumbnail: string;
  duration: number;
  playCount: number;
  likes: number;
  scrapedAt: string;
  approved?: boolean;
  rejected?: boolean;
  rejectionReason?: string;
  imported?: boolean;
  importedAt?: string;
}

/**
 * Load scraped tracks from JSON file
 */
function loadScrapedTracks(): ScrapedTrack[] {
  const filePath = path.join(__dirname, 'scraped-tracks.json');
  
  if (!fs.existsSync(filePath)) {
    console.error('❌ scraped-tracks.json not found. Run the scraping script first.');
    process.exit(1);
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('❌ Error loading tracks:', error);
    process.exit(1);
  }
}

/**
 * Save scraped tracks to JSON file
 */
function saveScrapedTracks(tracks: ScrapedTrack[]): void {
  const filePath = path.join(__dirname, 'scraped-tracks.json');
  
  try {
    fs.writeFileSync(filePath, JSON.stringify(tracks, null, 2), 'utf-8');
  } catch (error) {
    console.error('❌ Error saving tracks:', error);
    throw error;
  }
}

/**
 * Check if track already exists in Firestore
 */
async function trackExists(externalId: string): Promise<boolean> {
  try {
    const snapshot = await db.collection('tracks')
      .where('meta.externalId', '==', externalId)
      .limit(1)
      .get();
    
    return !snapshot.empty;
  } catch (error) {
    console.error(`  ⚠️  Error checking if track exists:`, error);
    return false;
  }
}

/**
 * Import a single track to Firestore
 */
async function importTrackToFirestore(track: ScrapedTrack): Promise<boolean> {
  try {
    // Check if track already exists
    if (await trackExists(track.url)) {
      console.log(`  ⏭️  Track already exists: ${track.title} by ${track.artist}`);
      return false;
    }

    // Create track document
    const trackData = {
      uploaderId: SYSTEM_USER_ID,
      uploaderUsername: 'system',
      status: 'ACTIVE',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      meta: {
        title: track.title,
        artist: track.artist,
        genre: track.genre,
        subGenre: '',
        provider: 'SOUNDCLOUD',
        externalId: track.url,
        dropTime: 0, // Default to start of track
        cover: track.thumbnail
      },
      metadata: {
        provider: 'SOUNDCLOUD',
        externalId: track.url,
        dropTime: 0,
        cover: track.thumbnail
      },
      stats: {
        votesFire: 0,
        votesPass: 0,
        totalVotes: 0,
        wilsonScore: 0,
        trendScore: 0
      },
      // Initialize chart and displayStats structures (empty until track gets ranked)
      chart: {},
      displayStats: {}
    };

    await db.collection('tracks').add(trackData);
    console.log(`  ✅ Imported: ${track.title} by ${track.artist}`);
    return true;
  } catch (error: any) {
    console.error(`  ❌ Error importing track ${track.url}:`, error.message);
    return false;
  }
}

/**
 * Main function to import approved tracks
 */
async function main() {
  console.log('🚀 Starting batch import of approved tracks...\n');

  // Load tracks from JSON
  const allTracks = loadScrapedTracks();
  console.log(`📂 Loaded ${allTracks.length} tracks from JSON\n`);

  // Filter for approved tracks that haven't been imported yet
  const approvedTracks = allTracks.filter(
    track => track.approved === true && !track.imported
  );

  if (approvedTracks.length === 0) {
    console.log('ℹ️  No approved tracks to import.');
    console.log('   Make sure to approve tracks in the review interface first.\n');
    process.exit(0);
  }

  console.log(`📊 Found ${approvedTracks.length} approved tracks to import\n`);

  let importedCount = 0;
  let skippedCount = 0;
  const updatedTracks = [...allTracks];

  // Import tracks in batches
  const BATCH_SIZE = 10;
  for (let i = 0; i < approvedTracks.length; i += BATCH_SIZE) {
    const batch = approvedTracks.slice(i, i + BATCH_SIZE);
    console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} tracks)...`);

    for (const track of batch) {
      const imported = await importTrackToFirestore(track);
      
      if (imported) {
        importedCount++;
        // Mark as imported in the tracks array
        const trackIndex = updatedTracks.findIndex(t => t.url === track.url);
        if (trackIndex !== -1) {
          updatedTracks[trackIndex] = {
            ...updatedTracks[trackIndex],
            imported: true,
            importedAt: new Date().toISOString()
          };
        }
      } else {
        skippedCount++;
      }

      // Small delay between imports
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Wait between batches
    if (i + BATCH_SIZE < approvedTracks.length) {
      console.log('⏳ Waiting 2 seconds before next batch...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  // Save updated tracks back to JSON
  saveScrapedTracks(updatedTracks);

  console.log('\n' + '='.repeat(50));
  console.log(`🎉 Import complete!`);
  console.log(`📊 Tracks imported: ${importedCount}`);
  console.log(`📊 Tracks skipped: ${skippedCount}`);
  console.log(`📊 Total approved: ${approvedTracks.length}`);
  console.log('='.repeat(50) + '\n');

  process.exit(0);
}

// Run the script
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});


