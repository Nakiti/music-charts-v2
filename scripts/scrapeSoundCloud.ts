/**
 * SoundCloud Scraping Script (Enhanced with Quality Filters)
 * 
 * This script scrapes SoundCloud for tracks by genre and saves them to a local JSON file
 * for review before importing to Firestore.
 * 
 * Usage:
 *   npm run scrape-soundcloud
 * 
 * Environment Variables:
 *   TRACKS_PER_GENRE - Number of tracks to scrape per genre (default: 15)
 *   GENRES - Comma-separated list of genre IDs to scrape (default: all genres)
 *   MIN_PLAY_COUNT - Minimum play count (default: 1000)
 *   MIN_DURATION_SEC - Minimum duration in seconds (default: 60)
 *   MAX_DURATION_SEC - Maximum duration in seconds (default: 600)
 * 
 * Examples:
 *   # Scrape 20 tracks per genre for all genres
 *   TRACKS_PER_GENRE=20 npm run scrape-soundcloud
 * 
 *   # Scrape only house and techno genres with strict filters
 *   GENRES=house,techno MIN_PLAY_COUNT=5000 MIN_DURATION_SEC=120 npm run scrape-soundcloud
 * 
 * Note: Tracks are saved to scripts/scraped-tracks.json for review.
 * Use the review interface at /admin/review-tracks to approve/reject tracks.
 */

import * as admin from 'firebase-admin';
import SoundCloud from 'soundcloud-scraper';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

// Initialize admin with your service account (only needed for genre fetching)
import serviceAccount from '../music-charts-b3ad5-firebase-adminsdk-fbsvc-fbf4bfb442.json' assert { type: 'json' };
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount)
});

const db = admin.firestore();

// Initialize SoundCloud client with error handling
let client: SoundCloud.Client;
try {
  client = new SoundCloud.Client();
} catch (error: any) {
  console.error('❌ Failed to initialize SoundCloud client:', error);
  process.exit(1);
}

// Quality filter configuration
interface QualityFilters {
  minPlayCount: number;
  minDurationSec: number;
  maxDurationSec: number;
  requireThumbnail: boolean;
}

// Default quality filters (relaxed to get more tracks)
const DEFAULT_FILTERS: QualityFilters = {
  minPlayCount: 100,       // Lowered from 1000 to get more tracks
  minDurationSec: 30,      // Lowered from 60s to include shorter tracks
  maxDurationSec: 900,     // Increased from 600s to include longer tracks
  requireThumbnail: false  // Don't require thumbnail to get more tracks
};

// Genre to SoundCloud search term mapping (expanded for more results)
const genreSearchTerms: Record<string, string[]> = {
  'house': [
    'house music 2025', 'house music 2024', 'deep house', 'tech house', 'classic house', 
    'vocal house', 'soulful house', 'french house', 'chicago house', 'lofi house', 
    'summer house mix', 'underground house', 'house id', 'classic 90s house', 'afro house'
  ],
  'tech-house': [
    'tech house 2025', 'tech house 2024', 'minimal tech house', 'groove tech house', 
    'tech house id', 'tech house remix', 'tech house original', 'tech house beat', 
    'modern tech house', 'rolling tech house', 'bass tech house', 'latin tech house'
  ],
  'bass-house': [
    'bass house 2025', 'bass house 2024', 'g-house', 'uk bass', 'bass house drop', 
    'night bass style', 'bass house remix', 'dirty house', 'confession style house'
  ],
  'deep-house': [
    'deep house 2025', 'deep house 2024', 'soulful deep house', 'jazzy house', 
    'deep house vibes', 'deep house original', 'melodic deep house', 'classic deep house'
  ],
  'progressive-house': [
    'progressive house 2025', 'prog house 2024', 'melodic progressive house', 
    'progressive house mix', 'progressive house track', 'festival progressive house'
  ],
  'techno': [
    'techno 2025', 'techno 2024', 'berlin techno', 'hard techno', 'industrial techno', 
    'melodic techno', 'dark techno', 'hypnotic techno', 'peak time techno', 'acid techno', 
    'techno id', 'detroit techno', 'raw techno', 'dub techno', 'minimal techno'
  ],
  'melodic-techno': [
    'melodic techno 2025', 'melodic techno 2024', 'afterlife style', 'ethereal techno', 
    'melodic techno mix', 'melodic techno original', 'progressive techno', 'melodic id'
  ],
  'trance': [
    'trance 2025', 'trance 2024', 'uplifting trance', 'psytrance', 'progressive trance', 
    'classic trance', 'vocal trance', 'acid trance', 'dream trance', 'trance id', 
    'hard trance', 'goa trance', 'anjuna style trance'
  ],
  'dubstep': [
    'dubstep 2025', 'dubstep 2024', 'riddim', 'melodic dubstep', 'deep dubstep', 
    'classic dubstep', 'heavy dubstep', 'dubstep drop', 'dubstep id', 'tearout', 
    'wonky dubstep', '140 bpm dubstep'
  ],
  'dnb': [
    'drum and bass 2025', 'dnb 2024', 'liquid dnb', 'neurofunk', 'jump up dnb', 
    'jungle dnb', 'rollers dnb', 'heavy dnb', 'atmospheric dnb', 'intelligent dnb', 
    'dnb vocal', '174bpm', 'halftime dnb'
  ],
  'jungle': [
    'jungle music 2025', 'classic jungle', 'amen break jungle', '90s jungle', 
    'ragga jungle', 'intelligent jungle', 'atmospheric jungle', 'jungle revival'
  ],
  'future-bass': [
    'future bass 2025', 'future bass 2024', 'melodic future bass', 'kawaii future bass', 
    'future bass remix', 'future bass id', 'future bass drop', 'anime future bass'
  ],
  'hip-hop': [
    'hip hop 2025', 'hip hop 2024', 'underground hip hop', '90s hip hop', 'lofi hip hop', 
    'instrumental hip hop', 'boom bap', 'conscious hip hop', 'jazz hop', 'old school hip hop', 
    'hip hop beat', 'east coast hip hop', 'west coast hip hop', 'phonk', 'hip hop'
  ],
  'rap': [
    'rap 2025', 'rap 2024', 'underground rap', 'mumble rap', 'lyrical rap', 'trap rap', 
    'cloud rap', 'hard rap', 'rap instrumental', 'freestyle rap', 'melodic rap', 'rap'
  ],
  'trap': [
    'trap music 2025', 'trap 2024', 'hard trap', 'melodic trap', 'trap id', 'trap beat', 
    'edm trap', 'hybrid trap', 'phonk trap', 'wave trap', 'trap remix'
  ],
  'drill': [
    'drill 2025', 'drill 2024', 'uk drill', 'brooklyn drill', 'chicago drill', 
    'drill beat', 'drill instrumental', 'melodic drill', 'dark drill'
  ],
  'lofi-hip-hop': [
    'lofi 2025', 'lo-fi 2024', 'lofi hip hop', 'lofi beat', 'lofi chill', 
    'lofi study', 'lofi sleep', 'jazz lofi', 'chillhop', 'lofi rain'
  ],
  'boom-bap': [
    'boom bap 2025', 'boom bap 2024', 'boom bap beat', 'boom bap instrumental', 
    '90s boom bap', 'classic boom bap', 'gritty boom bap', 'lofi boom bap'
  ],
  'uk-garage': [
    'uk garage 2025', 'ukg 2024', 'speed garage', '2step garage', 'future garage', 
    'ukg id', 'bassline', 'uk garage remix', 'garage house', '90s ukg'
  ],
  'afrobeats': [
    'afrobeats 2025', 'afrobeat 2024', 'amapiano 2025', 'afro house', 'afro pop', 
    'naija afrobeats', 'ghanaian afrobeats', 'afrobeats mix', 'afro fusion'
  ],
  'rnb': [
    'r&b 2025', 'rnb 2024', 'contemporary rnb', '90s rnb', 'slow jams', 'neo soul', 
    'alt rnb', 'rnb instrumental', 'vocal rnb', 'smooth rnb'
  ],
  'disco': [
    'disco 2025', 'nu disco', 'classic disco', 'italo disco', 'disco house', 
    '80s disco', 'disco funk', 'disco remix', 'french touch'
  ],
  'pop': [
    'pop 2025', 'pop 2024', 'indie pop', 'electro pop', 'synth pop', 'pop rock', 
    'dance pop', 'hyperpop', 'pop instrumental', 'alt pop'
  ],
  'k-pop': [
    'k-pop 2025', 'kpop 2024', 'korean pop', 'k-pop track', 'k-pop idol', 'k-pop instrumental'
  ],
  'rock': [
    'rock 2025', 'rock 2024', 'indie rock', 'alternative rock', 'hard rock', 
    'classic rock', 'psychedelic rock', 'punk rock', 'soft rock', 'garage rock'
  ],
  'metal': [
    'metal 2025', 'heavy metal', 'death metal', 'black metal', 'thrash metal', 
    'metalcore', 'nu metal', 'progressive metal', 'doom metal', 'metal id'
  ],
  'jazz': [
    'jazz 2025', 'jazz music', 'jazz instrumental', 'smooth jazz', 'bebop', 
    'fusion jazz', 'vocal jazz', 'modern jazz', 'jazz hop'
  ],
  'blues': [
    'blues 2025', 'blues music', 'blues guitar', 'delta blues', 'chicago blues', 
    'electric blues', 'blues rock', 'classic blues'
  ],
  'country': [
    'country 2025', 'country music', 'country pop', 'outlaw country', 'modern country', 
    'country song', 'bluegrass', 'americana'
  ],
  'folk': [
    'folk 2025', 'folk music', 'indie folk', 'acoustic folk', 'folk song', 
    'traditional folk', 'contemporary folk', 'psychedelic folk'
  ],
  'reggae': [
    'reggae 2025', 'reggae music', 'dancehall', 'roots reggae', 'reggaeton', 
    'dub reggae', 'reggae remix', 'classic reggae'
  ],
  'edm': [
    'edm 2025', 'edm 2024', 'festival edm', 'big room edm', 'mainstage edm', 
    'edm remix', 'edm mashup', 'electronic dance music', 'dance hits 2025', 
    'edm id', 'gaming edm', 'party edm', 'electro house edm', 'slap house'
  ],
};

interface SoundCloudTrack {
  url: string;
  title: string;
  author: string;
  thumbnail?: string;
  duration?: number;
  playCount?: number;
  likes?: number;
  createdAt?: string;
}

interface ScrapedTrack {
  url: string;
  title: string;
  artist: string;
  genre: string;
  thumbnail: string;
  duration: number; // in seconds
  playCount: number;
  likes: number;
  scrapedAt: string;
  approved?: boolean;
  rejected?: boolean;
  rejectionReason?: string;
}

/**
 * Get detailed track info from SoundCloud
 */
async function getTrackDetails(url: string): Promise<Partial<SoundCloudTrack> | null> {
  try {
    const track: any = await client.getSongInfo(url);
    
    return {
      playCount: track.playCount || 0,
      likes: track.likes || 0,
      duration: track.duration ? Math.floor(track.duration / 1000) : undefined, // Convert ms to seconds
      thumbnail: track.thumbnail || (track as any).artwork_url || '',
      createdAt: (track as any).createdAt || undefined
    };
  } catch (error: any) {
    console.error(`  ⚠️  Error fetching track details for ${url}:`, error.message);
    return null;
  }
}

/**
 * Apply quality filters to a track
 */
function passesQualityFilters(track: ScrapedTrack, filters: QualityFilters): { passes: boolean; reason?: string } {
  // Check play count
  if (track.playCount < filters.minPlayCount) {
    return { 
      passes: false, 
      reason: `Play count (${track.playCount}) below minimum (${filters.minPlayCount})` 
    };
  }

  // Check duration
  if (track.duration < filters.minDurationSec) {
    return { 
      passes: false, 
      reason: `Duration (${track.duration}s) below minimum (${filters.minDurationSec}s)` 
    };
  }

  if (track.duration > filters.maxDurationSec) {
    return { 
      passes: false, 
      reason: `Duration (${track.duration}s) above maximum (${filters.maxDurationSec}s)` 
    };
  }

  // Check thumbnail
  if (filters.requireThumbnail && !track.thumbnail) {
    return { 
      passes: false, 
      reason: 'Missing thumbnail' 
    };
  }

  return { passes: true };
}

/**
 * Search SoundCloud for tracks by genre using the scraper
 * Continues searching until limit is reached or all search terms exhausted
 */
async function searchSoundCloudByGenre(
  genre: string, 
  searchTerms: string[], 
  limit: number = 500
): Promise<SoundCloudTrack[]> {
  const tracks: SoundCloudTrack[] = [];
  const seenUrls = new Set<string>();

  console.log(`  🔍 Searching with ${searchTerms.length} search terms, target: ${limit} tracks...`);

  // Continue searching until we have enough tracks or run out of search terms
  for (const searchTerm of searchTerms) {
    // Stop if we've reached the limit
    if (tracks.length >= limit) {
      console.log(`  ✨ Reached target of ${limit} tracks`);
      break;
    }

    try {
      console.log(`  🔍 Searching for "${searchTerm}"... (${tracks.length}/${limit} so far)`);
      
      // Validate search term
      if (!searchTerm || typeof searchTerm !== 'string' || searchTerm.trim().length === 0) {
        console.log(`    ⚠️  Invalid search term, skipping`);
        continue;
      }
      
      // Use SoundCloud scraper to search with timeout
      let searchResults: any;
      try {
        // Add a timeout to prevent hanging
        const searchPromise = client.search(searchTerm.trim(), 'track');
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Search timeout after 30 seconds')), 30000)
        );
        
        searchResults = await Promise.race([searchPromise, timeoutPromise]);
      } catch (searchError: any) {
        // If search fails, log and continue to next search term
        const errorMsg = searchError?.message || searchError?.toString() || 'Unknown error';
        console.error(`    ⚠️  Search API error for "${searchTerm}": ${errorMsg}`);
        
        // If it's a specific error we can handle, log more details
        if (errorMsg.includes('split')) {
          console.error(`    💡 This might be a library issue. Trying next search term...`);
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait before next search
        continue;
      }

      // Handle different possible return formats
      let resultsArray: any[] = [];
      
      if (Array.isArray(searchResults)) {
        resultsArray = searchResults;
      } else if (searchResults && typeof searchResults === 'object') {
        // Check if results are nested in a property
        if (Array.isArray(searchResults.tracks)) {
          resultsArray = searchResults.tracks;
        } else if (Array.isArray(searchResults.collection)) {
          resultsArray = searchResults.collection;
        } else if (Array.isArray(searchResults.results)) {
          resultsArray = searchResults.results;
        } else {
          console.log(`    ⚠️  Unexpected result format from "${searchTerm}"`);
          await new Promise(resolve => setTimeout(resolve, 1500));
          continue;
        }
      } else if (!searchResults) {
        console.log(`    ⚠️  No results returned from "${searchTerm}"`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        continue;
      }

      if (resultsArray.length > 0) {
        let addedFromThisSearch = 0;
        
        for (const result of resultsArray) {
          // Stop if we've reached the limit
          if (tracks.length >= limit) break;

          // Skip if result is null/undefined
          if (!result || typeof result !== 'object') continue;

          // Extract URL from result
          let url: string | null = null;
          
          try {
            if (result.url) {
              url = result.url;
            } else if (result.permalink_url) {
              url = result.permalink_url;
            } else if (result.permalink) {
              url = typeof result.permalink === 'string' 
                ? (result.permalink.startsWith('http') ? result.permalink : `https://soundcloud.com${result.permalink}`)
                : null;
            } else if (result.user && result.user.permalink && result.permalink) {
              const userPermalink = typeof result.user.permalink === 'string' ? result.user.permalink : '';
              const trackPermalink = typeof result.permalink === 'string' ? result.permalink : '';
              if (userPermalink && trackPermalink) {
                url = `https://soundcloud.com/${userPermalink}/${trackPermalink}`;
              }
            }
          } catch (urlError: any) {
            // Skip this result if URL extraction fails
            continue;
          }

          if (url && !seenUrls.has(url)) {
            seenUrls.add(url);
            try {
              tracks.push({
                url: url,
                title: result.title || 'Untitled',
                author: result.author?.name || result.user?.username || result.user?.full_name || 'Unknown Artist',
                thumbnail: result.thumbnail || result.artwork_url || result.user?.avatar_url || '',
                duration: result.duration ? Math.floor(result.duration / 1000) : 0 // Convert ms to seconds
              });
              addedFromThisSearch++;
            } catch (pushError: any) {
              console.error(`    ⚠️  Error adding track:`, pushError.message);
            }
          }
        }
        
        console.log(`    ✅ Added ${addedFromThisSearch} new tracks from "${searchTerm}" (${resultsArray.length} total results)`);
      } else {
        console.log(`    ⚠️  Empty results array from "${searchTerm}"`);
      }
    } catch (error: any) {
      console.error(`  ⚠️  Error searching for "${searchTerm}":`, error.message || error);
      console.error(`    Stack:`, error.stack);
    }

    // Rate limiting - wait between searches (reduced delay for faster scraping)
    if (tracks.length < limit) {
      await new Promise(resolve => setTimeout(resolve, 1500));
    }
  }

  console.log(`  📊 Total unique tracks found: ${tracks.length}`);
  return tracks.slice(0, limit);
}

/**
 * Get track metadata from SoundCloud oEmbed API
 */
async function getTrackMetadata(url: string): Promise<{ title: string; author: string; thumbnail: string } | null> {
  try {
    const oembedUrl = `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(url)}`;
    const response = await fetch(oembedUrl);
    
    if (!response.ok) {
      return null;
    }

    const data = await response.json() as any;
    
    // Parse title and author from HTML
    const $ = cheerio.load(data.html || '');
    const title = data.title || '';
    const author = data.author_name || 'Unknown Artist';
    const thumbnail = data.thumbnail_url || '';

    return { title, author, thumbnail };
  } catch (error) {
    console.error(`  ⚠️  Error fetching metadata for ${url}:`, error);
    return null;
  }
}

/**
 * Load existing scraped tracks from JSON file
 */
function loadScrapedTracks(): ScrapedTrack[] {
  const filePath = path.join(__dirname, 'scraped-tracks.json');
  
  if (!fs.existsSync(filePath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('⚠️  Error loading existing tracks:', error);
    return [];
  }
}

/**
 * Save scraped tracks to JSON file
 */
function saveScrapedTracks(tracks: ScrapedTrack[]): void {
  const filePath = path.join(__dirname, 'scraped-tracks.json');
  
  try {
    fs.writeFileSync(filePath, JSON.stringify(tracks, null, 2), 'utf-8');
    console.log(`\n  💾 Saved ${tracks.length} tracks to ${filePath}`);
  } catch (error) {
    console.error('❌ Error saving tracks:', error);
    throw error;
  }
}

/**
 * Scrape tracks for a specific genre
 * Continues searching until we have enough tracks that pass filters
 */
async function scrapeGenre(
  genreId: string, 
  tracksPerGenre: number = 20,
  filters: QualityFilters
): Promise<ScrapedTrack[]> {
  console.log(`\n🎵 Scraping genre: ${genreId}`);
  console.log('='.repeat(50));

  const searchTerms = genreSearchTerms[genreId] || [genreId];
  const newTracks: ScrapedTrack[] = [];
  const processedUrls = new Set<string>();
  let searchRound = 0;
  const maxSearchRounds = searchTerms.length; // Try up to 5 rounds of searching

  try {
    // Continue searching until we have enough tracks or run out of search rounds
    while (newTracks.length < tracksPerGenre && searchRound < maxSearchRounds) {
      searchRound++;
      const remainingNeeded = tracksPerGenre - newTracks.length;
      const searchTarget = Math.max(remainingNeeded * 5, 1000); // Search for 5x what we need
      
      console.log(`\n  🔄 Search round ${searchRound}/${maxSearchRounds} (need ${remainingNeeded} more tracks)`);
      
      // Search for tracks
      const tracks = await searchSoundCloudByGenre(genreId, searchTerms, searchTarget);
      console.log(`  📊 Found ${tracks.length} tracks from search`);

      // Filter out already processed tracks
      const unprocessedTracks = tracks.filter(t => !processedUrls.has(t.url));
      console.log(`  📊 ${unprocessedTracks.length} new tracks to process`);

      if (unprocessedTracks.length === 0) {
        console.log(`  ⚠️  No new tracks found, trying different search terms...`);
        break;
      }

      // Process each track
      let processedInRound = 0;
      for (let i = 0; i < unprocessedTracks.length; i++) {
        const track = unprocessedTracks[i];
        
        // Stop if we have enough
        if (newTracks.length >= tracksPerGenre) {
          console.log(`  ✨ Reached target of ${tracksPerGenre} tracks`);
          break;
        }

        processedUrls.add(track.url);
        
        // Show progress every 10 tracks
        if (i % 10 === 0) {
          console.log(`  [${i + 1}/${unprocessedTracks.length}] Processing... (${newTracks.length}/${tracksPerGenre} passed filters)`);
        }

        try {
          // Get enhanced metadata from oEmbed
          const metadata = await getTrackMetadata(track.url);
          
          // Get detailed track info (play count, likes, etc.)
          const details = await getTrackDetails(track.url);
          
          // Use metadata if available, otherwise use track data
          const title = metadata?.title || track.title || 'Untitled';
          const artist = metadata?.author || track.author || 'Unknown Artist';
          const cover = metadata?.thumbnail || details?.thumbnail || track.thumbnail || '';

          // Parse artist from title if needed (format: "Artist - Title")
          let finalTitle = title;
          let finalArtist = artist;
          
          if (title.includes(' - ')) {
            const parts = title.split(' - ');
            if (parts.length >= 2) {
              finalArtist = parts[0].trim();
              finalTitle = parts.slice(1).join(' - ').trim();
            }
          }

          // Create scraped track object
          const scrapedTrack: ScrapedTrack = {
            url: track.url,
            title: finalTitle,
            artist: finalArtist,
            genre: genreId,
            thumbnail: cover,
            duration: details?.duration || track.duration || 0,
            playCount: details?.playCount || 0,
            likes: details?.likes || 0,
            scrapedAt: new Date().toISOString()
          };

          // Apply quality filters
          const filterResult = passesQualityFilters(scrapedTrack, filters);
          
          if (filterResult.passes) {
            newTracks.push(scrapedTrack);
            processedInRound++;
            
            // Only log every 10th approved track to reduce console spam
            if (processedInRound % 10 === 0 || newTracks.length === tracksPerGenre) {
              console.log(`  ✅ ${newTracks.length}/${tracksPerGenre} passed filters (latest: ${finalTitle} by ${finalArtist})`);
            }
          }
        } catch (error: any) {
          // Silently continue on errors to speed up processing
          if (i % 50 === 0) {
            console.error(`  ⚠️  Error processing track ${i + 1}:`, error.message);
          }
        }

        // Reduced rate limiting - only wait every 5th track to speed up
        if (i % 5 === 0 && i < unprocessedTracks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`  📊 Round ${searchRound} complete: ${processedInRound} new tracks passed filters (total: ${newTracks.length}/${tracksPerGenre})`);

      // If we still don't have enough, wait a bit before next round
      if (newTracks.length < tracksPerGenre && searchRound < maxSearchRounds) {
        console.log(`  ⏳ Waiting 3 seconds before next search round...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }
  } catch (error: any) {
    console.error(`  ❌ Error scraping genre ${genreId}:`, error.message);
  }

  console.log(`\n  ✅ Genre ${genreId} complete: ${newTracks.length} tracks scraped (passed filters, target was ${tracksPerGenre})`);
  return newTracks;
}

/**
 * Main function to scrape all genres
 */
async function main() {
  console.log('🚀 Starting SoundCloud scraping script (with quality filters)...\n');

  // Load quality filters from environment
  const filters: QualityFilters = {
    minPlayCount: parseInt(process.env.MIN_PLAY_COUNT || String(DEFAULT_FILTERS.minPlayCount), 10),
    minDurationSec: parseInt(process.env.MIN_DURATION_SEC || String(DEFAULT_FILTERS.minDurationSec), 10),
    maxDurationSec: parseInt(process.env.MAX_DURATION_SEC || String(DEFAULT_FILTERS.maxDurationSec), 10),
    requireThumbnail: process.env.REQUIRE_THUMBNAIL !== 'false'
  };

  console.log('📋 Quality Filters:');
  console.log(`   - Min play count: ${filters.minPlayCount}`);
  console.log(`   - Min duration: ${filters.minDurationSec}s`);
  console.log(`   - Max duration: ${filters.maxDurationSec}s`);
  console.log(`   - Require thumbnail: ${filters.requireThumbnail}\n`);

  // Get all genres from Firestore
  let genres: { id: string; title: string }[] = [];
  
  try {
    const genresSnapshot = await db.collection('genres').get();
    genres = genresSnapshot.docs.map(doc => ({
      id: doc.id,
      title: doc.data().title || doc.id
    }));
    console.log(`📚 Found ${genres.length} genres in Firestore\n`);
  } catch (error) {
    console.error('❌ Error fetching genres:', error);
    // Fallback to genre IDs from the mapping
    genres = Object.keys(genreSearchTerms).map(id => ({ id, title: id }));
    console.log(`📚 Using ${genres.length} genres from mapping\n`);
  }

  // Configuration
  const TRACKS_PER_GENRE = parseInt(process.env.TRACKS_PER_GENRE || '500000', 10);
  const GENRES_TO_SCRAPE = process.env.GENRES ? process.env.GENRES.split(',') : null;

  const genresToProcess = GENRES_TO_SCRAPE 
    ? genres.filter(g => GENRES_TO_SCRAPE.includes(g.id))
    : genres;

  console.log(`📊 Configuration:`);
  console.log(`   - Tracks per genre: ${TRACKS_PER_GENRE}`);
  console.log(`   - Genres to scrape: ${genresToProcess.length}`);
  if (GENRES_TO_SCRAPE) {
    console.log(`   - Specific genres: ${GENRES_TO_SCRAPE.join(', ')}`);
  }
  console.log('');

  // Load existing tracks
  const existingTracks = loadScrapedTracks();
  const existingUrls = new Set(existingTracks.map(t => t.url));
  console.log(`📂 Loaded ${existingTracks.length} existing tracks from JSON\n`);

  // Scrape each genre
  const allNewTracks: ScrapedTrack[] = [];
  
  for (const genre of genresToProcess) {
    // Scrape genre and get tracks
    const newTracks = await scrapeGenre(genre.id, TRACKS_PER_GENRE, filters);
    
    // Filter out tracks that already exist
    const uniqueNewTracks = newTracks.filter(track => !existingUrls.has(track.url));
    
    if (uniqueNewTracks.length > 0) {
      allNewTracks.push(...uniqueNewTracks);
      // Update existing URLs set to avoid duplicates within this run
      uniqueNewTracks.forEach(track => existingUrls.add(track.url));
    }
    
    // Wait between genres to avoid rate limiting
    if (genresToProcess.indexOf(genre) < genresToProcess.length - 1) {
      console.log('\n⏳ Waiting 5 seconds before next genre...\n');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }

  // Merge new tracks with existing ones
  const allTracks = [...existingTracks, ...allNewTracks];
  
  // Save to JSON file
  if (allNewTracks.length > 0) {
    saveScrapedTracks(allTracks);
    console.log(`\n📊 Summary:`);
    console.log(`   - New tracks scraped: ${allNewTracks.length}`);
    console.log(`   - Total tracks in file: ${allTracks.length}`);
  } else {
    console.log(`\n📊 No new tracks to save (all were duplicates or filtered out)`);
  }

  // Refactor: Let me fix the scrapeGenre function to properly return tracks
  // Actually, I need to rethink this - let me create a better structure

  console.log('\n' + '='.repeat(50));
  console.log(`🎉 Scraping complete!`);
  console.log(`📊 Genres processed: ${genresToProcess.length}`);
  console.log(`\n💡 Next steps:`);
  console.log(`   1. Review tracks at: http://localhost:3000/admin/review-tracks`);
  console.log(`   2. Or use: npm run import-approved-tracks`);
  console.log('='.repeat(50) + '\n');

  process.exit(0);
}

// Run the script
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
