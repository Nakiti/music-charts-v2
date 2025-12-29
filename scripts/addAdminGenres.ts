import * as admin from 'firebase-admin';

// Initialize admin with your service account
// You can download the service account key from Firebase Console > Project Settings > Service Accounts
import serviceAccountJson from '../music-charts-b3ad5-firebase-adminsdk-fbsvc-fbf4bfb442.json' assert { type: 'json' };
admin.initializeApp({
  credential: admin.credential.cert(serviceAccountJson as admin.ServiceAccount)
});

const db = admin.firestore();

const genres = [
  // === EDM GENRES (Prioritized) ===
  { id: 'house', title: 'House', description: 'Classic four-on-the-floor house music', order: 1, isActive: true, theme: { color: 'from-blue-500 to-cyan-500' } },
  { id: 'tech-house', title: 'Tech House', description: 'Techno-influenced house grooves', order: 2, isActive: true, theme: { color: 'from-cyan-600 to-teal-600' } },
  { id: 'bass-house', title: 'Bass House', description: 'Heavy basslines meet house rhythms', order: 3, isActive: true, theme: { color: 'from-teal-600 to-emerald-600' } },
  { id: 'deep-house', title: 'Deep House', description: 'Deep, soulful, and atmospheric house', order: 4, isActive: true, theme: { color: 'from-indigo-600 to-blue-600' } },
  { id: 'progressive-house', title: 'Progressive House', description: 'Melodic and progressive house journeys', order: 5, isActive: true, theme: { color: 'from-purple-500 to-blue-500' } },
  { id: 'techno', title: 'Techno', description: 'Driving techno beats and hypnotic grooves', order: 6, isActive: true, theme: { color: 'from-slate-700 to-gray-600' } },
  { id: 'melodic-techno', title: 'Melodic Techno', description: 'Emotional and melodic techno soundscapes', order: 7, isActive: true, theme: { color: 'from-slate-600 to-blue-700' } },
  { id: 'trance', title: 'Trance', description: 'Uplifting and euphoric trance anthems', order: 8, isActive: true, theme: { color: 'from-purple-600 to-pink-600' } },
  { id: 'dubstep', title: 'Dubstep', description: 'Heavy bass and wobbling synths', order: 9, isActive: true, theme: { color: 'from-green-700 to-emerald-700' } },
  { id: 'dnb', title: 'DnB', description: 'Fast-paced drum and bass energy', order: 10, isActive: true, theme: { color: 'from-emerald-600 to-teal-600' } },
  { id: 'jungle', title: 'Jungle', description: 'Breakbeat hardcore and jungle vibes', order: 11, isActive: true, theme: { color: 'from-lime-600 to-emerald-600' } },
  { id: 'future-bass', title: 'Future Bass', description: 'Melodic and emotional bass music', order: 12, isActive: true, theme: { color: 'from-pink-500 to-purple-500' } },
  
  // === RAP/HIP-HOP GENRES (Prioritized) ===
  { id: 'hip-hop', title: 'Hip Hop', description: 'Classic and modern hip hop', order: 13, isActive: true, theme: { color: 'from-orange-600 to-red-600' } },
  { id: 'rap', title: 'Rap', description: 'Lyrical rap and wordplay', order: 14, isActive: true, theme: { color: 'from-red-700 to-pink-700' } },
  { id: 'trap', title: 'Trap', description: 'Hard-hitting trap beats', order: 15, isActive: true, theme: { color: 'from-purple-700 to-fuchsia-700' } },
  { id: 'drill', title: 'Drill', description: 'Dark and aggressive drill music', order: 16, isActive: true, theme: { color: 'from-gray-800 to-slate-800' } },
  { id: 'lofi-hip-hop', title: 'Lo-fi Hip Hop', description: 'Chill and relaxing lo-fi beats', order: 17, isActive: true, theme: { color: 'from-amber-500 to-orange-500' } },
  { id: 'boom-bap', title: 'Boom Bap', description: 'Classic boom bap hip hop', order: 18, isActive: true, theme: { color: 'from-yellow-700 to-orange-700' } },
  
  // === CROSSOVER/URBAN ===
  { id: 'uk-garage', title: 'UK Garage', description: 'UK garage and 2-step grooves', order: 19, isActive: true, theme: { color: 'from-violet-600 to-purple-600' } },
  { id: 'afrobeats', title: 'Afrobeats', description: 'African rhythms and modern production', order: 20, isActive: true, theme: { color: 'from-orange-500 to-red-500' } },
  { id: 'rnb', title: 'R&B', description: 'Smooth rhythm and blues', order: 21, isActive: true, theme: { color: 'from-rose-600 to-pink-600' } },
  { id: 'disco', title: 'Disco', description: 'Groovy disco and funk', order: 22, isActive: true, theme: { color: 'from-yellow-500 to-orange-500' } },
  
  // === POP ===
  { id: 'pop', title: 'Pop', description: 'Mainstream pop hits', order: 23, isActive: true, theme: { color: 'from-pink-500 to-rose-500' } },
  { id: 'k-pop', title: 'K Pop', description: 'Korean pop music and culture', order: 24, isActive: true, theme: { color: 'from-fuchsia-500 to-pink-500' } },
  
  // === OTHER GENRES ===
  { id: 'rock', title: 'Rock', description: 'Classic and modern rock', order: 25, isActive: true, theme: { color: 'from-red-600 to-orange-600' } },
  { id: 'metal', title: 'Metal', description: 'Heavy metal and subgenres', order: 26, isActive: true, theme: { color: 'from-gray-800 to-red-900' } },
  { id: 'jazz', title: 'Jazz', description: 'Jazz and improvisation', order: 27, isActive: true, theme: { color: 'from-amber-700 to-yellow-700' } },
  { id: 'blues', title: 'Blues', description: 'Traditional and modern blues', order: 28, isActive: true, theme: { color: 'from-blue-700 to-indigo-700' } },
  { id: 'country', title: 'Country', description: 'Country and western', order: 29, isActive: true, theme: { color: 'from-yellow-600 to-amber-600' } },
  { id: 'folk', title: 'Folk', description: 'Folk and acoustic music', order: 30, isActive: true, theme: { color: 'from-green-600 to-lime-600' } },
  { id: 'reggae', title: 'Reggae', description: 'Reggae and dancehall rhythms', order: 31, isActive: true, theme: { color: 'from-lime-600 to-green-600' } },
];

async function addGenres() {
  console.log(`🚀 Starting to add ${genres.length} genres to Firestore...\n`);
  
  try {
    for (const genre of genres) {
      const { id, ...data } = genre; // Separate id from data
      await db.collection('genres').doc(id).set(data);
      console.log(`✅ [${genre.order}] Added: ${genre.title}`);
    }
    console.log('\n🎉 All genres added successfully!');
    console.log(`📊 Total genres: ${genres.length}`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding genres:', error);
    process.exit(1);
  }
}

addGenres();