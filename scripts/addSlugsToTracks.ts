/**
 * Migration Script: Add slugs to existing tracks
 * 
 * This script:
 * 1. Fetches all tracks from Firestore
 * 2. Generates a unique slug for each track based on title
 * 3. Handles collisions by appending numbers (track-name, track-name-2, etc.)
 * 4. Updates each track with its slug
 * 
 * Usage:
 *   npx ts-node scripts/addSlugsToTracks.ts
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';
import * as path from 'path';

// Import slug functions inline since we're using ts-node
function convertEmojisToText(text: string): string {
  const EMOJI_TO_TEXT: Record<string, string> = {
    '🔥': 'fire',
    '💯': '100',
    '💀': 'skull',
    '💊': 'pill',
    '🎵': 'music',
    '🎶': 'notes',
    '🎤': 'mic',
    '🎧': 'headphones',
    '🎸': 'guitar',
    '🎹': 'piano',
    '🥁': 'drums',
    '🎺': 'trumpet',
    '🎷': 'sax',
    '🎻': 'violin',
    '💃': 'dance',
    '🕺': 'dance',
    '🎉': 'party',
    '🎊': 'celebration',
    '⭐': 'star',
    '✨': 'sparkle',
    '💫': 'dizzy',
    '🌟': 'star',
    '💎': 'diamond',
    '👑': 'crown',
    '🚀': 'rocket',
    '💥': 'boom',
    '⚡': 'lightning',
    '🌊': 'wave',
    '🔊': 'loud',
    '📢': 'announce',
    '💰': 'money',
    '💸': 'money',
    '❤️': 'love',
    '💙': 'love',
    '💚': 'love',
    '💛': 'love',
    '💜': 'love',
    '🖤': 'love',
    '🤍': 'love',
    '😈': 'devil',
    '👿': 'devil',
    '😎': 'cool',
    '🤑': 'money',
    '🤯': 'mind-blown',
    '😤': 'triumph',
    '💪': 'strong',
    '🙏': 'pray',
    '🌙': 'moon',
    '☀️': 'sun',
    '🌞': 'sun',
    '🌈': 'rainbow',
    '🔮': 'crystal',
    '👻': 'ghost',
    '💣': 'bomb',
    '🎯': 'target',
    '🏆': 'trophy',
    '🥇': 'gold',
    '🥈': 'silver',
    '🥉': 'bronze',
  };

  let result = text;
  for (const [emoji, textEquiv] of Object.entries(EMOJI_TO_TEXT)) {
    result = result.replace(new RegExp(emoji, 'g'), ` ${textEquiv} `);
  }
  result = result.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]|[\u{1F100}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{FE00}-\u{FE0F}]|[\u{1F1E0}-\u{1F1FF}]/gu, ' ');
  return result;
}

function normalizeUnicode(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function trackNameToSlug(trackName: string): string {
  if (!trackName) return '';
  
  let slug = trackName;
  slug = convertEmojisToText(slug);
  slug = normalizeUnicode(slug);
  slug = slug.toLowerCase();
  slug = slug.replace(/&/g, ' and ');
  slug = slug.replace(/[^a-z0-9]+/g, '-');
  slug = slug.replace(/-+/g, '-');
  slug = slug.replace(/^-+|-+$/g, '');
  
  if (!slug) return 'untitled';
  return slug;
}

function makeSlugUnique(baseSlug: string, existingSlugs: string[]): string {
  if (!existingSlugs.includes(baseSlug)) {
    return baseSlug;
  }
  
  let counter = 2;
  let uniqueSlug = `${baseSlug}-${counter}`;
  
  while (existingSlugs.includes(uniqueSlug)) {
    counter++;
    uniqueSlug = `${baseSlug}-${counter}`;
  }
  
  return uniqueSlug;
}

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '../music-charts-b3ad5-firebase-adminsdk-fbsvc-fbf4bfb442.json');
const serviceAccount = require(serviceAccountPath);

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount as admin.ServiceAccount),
  });
}

const db = getFirestore();

interface TrackData {
  id: string;
  meta?: {
    title?: string;
  };
  uploaderUsername?: string;
  slug?: string;
}

async function addSlugsToTracks() {
  console.log('🚀 Starting migration: Adding slugs to tracks...\n');

  try {
    // Fetch all tracks
    const tracksSnapshot = await db.collection('tracks').get();
    console.log(`📊 Found ${tracksSnapshot.size} tracks to process\n`);

    if (tracksSnapshot.empty) {
      console.log('✅ No tracks found. Migration complete.');
      return;
    }

    // Group tracks by username to handle slug uniqueness per user
    const tracksByUser: Record<string, TrackData[]> = {};
    
    tracksSnapshot.docs.forEach(doc => {
      const data = doc.data();
      const username = data.uploaderUsername || 'unknown';
      
      if (!tracksByUser[username]) {
        tracksByUser[username] = [];
      }
      
      tracksByUser[username].push({
        id: doc.id,
        meta: data.meta,
        uploaderUsername: data.uploaderUsername,
        slug: data.slug,
      });
    });

    console.log(`👥 Processing tracks for ${Object.keys(tracksByUser).length} users\n`);

    let totalUpdated = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    // Process each user's tracks
    for (const [username, tracks] of Object.entries(tracksByUser)) {
      console.log(`\n📂 Processing user: ${username} (${tracks.length} tracks)`);
      
      const existingSlugs: string[] = [];
      
      for (const track of tracks) {
        // Skip if slug already exists
        if (track.slug) {
          console.log(`  ⏭️  Skipped: Track ${track.id} already has slug "${track.slug}"`);
          existingSlugs.push(track.slug);
          totalSkipped++;
          continue;
        }

        const title = track.meta?.title || 'untitled';
        const baseSlug = trackNameToSlug(title);
        const uniqueSlug = makeSlugUnique(baseSlug, existingSlugs);
        
        try {
          // Update the track with the slug
          await db.collection('tracks').doc(track.id).update({
            slug: uniqueSlug,
          });
          
          existingSlugs.push(uniqueSlug);
          totalUpdated++;
          
          console.log(`  ✅ Updated: "${title}" → "${uniqueSlug}"`);
          
          // Add a small delay to avoid overwhelming Firestore
          await new Promise(resolve => setTimeout(resolve, 50));
          
        } catch (error) {
          totalErrors++;
          console.error(`  ❌ Error updating track ${track.id}:`, error);
        }
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(50));
    console.log(`✅ Successfully updated: ${totalUpdated} tracks`);
    console.log(`⏭️  Skipped (already had slug): ${totalSkipped} tracks`);
    console.log(`❌ Errors: ${totalErrors} tracks`);
    console.log(`📊 Total processed: ${tracksSnapshot.size} tracks`);
    console.log('='.repeat(50));
    console.log('\n✨ Migration complete!\n');

  } catch (error) {
    console.error('\n❌ Migration failed with error:', error);
    process.exit(1);
  }
}

// Run the migration
addSlugsToTracks()
  .then(() => {
    console.log('👋 Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });

