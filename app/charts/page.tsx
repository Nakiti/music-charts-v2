"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutGrid, Search, X 
} from 'lucide-react';
import ChartCard from '@/components/Charts/ChartCard';
import { useGenres } from '@/hooks/useGenres';
import { apiRequestSimple } from '@/lib/api-client';

const GENRES = [
  // === EDM GENRES (Prioritized) ===
  { id: 'hip-hop', title: 'Hip Hop', description: 'Classic and modern hip hop', order: 1, isActive: true, theme: { color: 'from-orange-600 to-red-600' } },
  { id: 'house', title: 'House', description: 'Classic four-on-the-floor house music', order: 2, isActive: true, theme: { color: 'from-blue-500 to-cyan-500' } },
  { id: 'rap', title: 'Rap', description: 'Lyrical rap and wordplay', order: 3, isActive: true, theme: { color: 'from-red-700 to-pink-700' } },
  { id: 'edm', title: 'EDM', description: 'The best EDM tracks.', order: 4, isActive: true, theme: { color: 'from-blue-600 to-indigo-600' } },
  { id: 'tech-house', title: 'Tech House', description: 'Techno-influenced house grooves', order: 5, isActive: true, theme: { color: 'from-cyan-600 to-teal-600' } },
  { id: 'bass-house', title: 'Bass House', description: 'Heavy basslines meet house rhythms', order: 6, isActive: true, theme: { color: 'from-teal-600 to-emerald-600' } },
  { id: 'deep-house', title: 'Deep House', description: 'Deep, soulful, and atmospheric house', order: 7, isActive: true, theme: { color: 'from-indigo-600 to-blue-600' } },
  { id: 'progressive-house', title: 'Progressive House', description: 'Melodic and progressive house journeys', order: 8, isActive: true, theme: { color: 'from-purple-500 to-blue-500' } },
  { id: 'techno', title: 'Techno', description: 'Driving techno beats and hypnotic grooves', order: 9, isActive: true, theme: { color: 'from-slate-700 to-gray-600' } },
  { id: 'trance', title: 'Trance', description: 'Uplifting and euphoric trance anthems', order: 10, isActive: true, theme: { color: 'from-purple-600 to-pink-600' } },
  { id: 'dubstep', title: 'Dubstep', description: 'Heavy bass and wobbling synths', order: 11, isActive: true, theme: { color: 'from-green-700 to-emerald-700' } },
  { id: 'dnb', title: 'DnB', description: 'Fast-paced drum and bass energy', order: 12, isActive: true, theme: { color: 'from-emerald-600 to-teal-600' } },
  { id: 'future-bass', title: 'Future Bass', description: 'Melodic and emotional bass music', order: 13, isActive: true, theme: { color: 'from-pink-500 to-purple-500' } },
  
  // === RAP/HIP-HOP GENRES (Prioritized) ===
  { id: 'trap', title: 'Trap', description: 'Hard-hitting trap beats', order: 14, isActive: true, theme: { color: 'from-purple-700 to-fuchsia-700' } },
  { id: 'drill', title: 'Drill', description: 'Dark and aggressive drill music', order: 15, isActive: true, theme: { color: 'from-gray-800 to-slate-800' } },
  
  // === CROSSOVER/URBAN ===
  { id: 'uk-garage', title: 'UK Garage', description: 'UK garage and 2-step grooves', order: 16, isActive: true, theme: { color: 'from-violet-600 to-purple-600' } },
  { id: 'afrobeats', title: 'Afrobeats', description: 'African rhythms and modern production', order: 17, isActive: true, theme: { color: 'from-orange-500 to-red-500' } },
  { id: 'rnb', title: 'R&B', description: 'Smooth rhythm and blues', order: 18, isActive: true, theme: { color: 'from-rose-600 to-pink-600' } },
  { id: 'disco', title: 'Disco', description: 'Groovy disco and funk', order: 19, isActive: true, theme: { color: 'from-yellow-500 to-orange-500' } },

  // === POP ===
  { id: 'pop', title: 'Pop', description: 'Mainstream pop hits', order: 20, isActive: true, theme: { color: 'from-pink-500 to-rose-500' } },
  { id: 'k-pop', title: 'K Pop', description: 'Korean pop music and culture', order: 21, isActive: true, theme: { color: 'from-fuchsia-500 to-pink-500' } },
  
  // === OTHER GENRES ===
  { id: 'rock', title: 'Rock', description: 'Classic and modern rock', order: 22, isActive: true, theme: { color: 'from-red-600 to-orange-600' } },
  { id: 'metal', title: 'Metal', description: 'Heavy metal and subgenres', order: 23, isActive: true, theme: { color: 'from-gray-800 to-red-900' } },
  { id: 'jazz', title: 'Jazz', description: 'Jazz and improvisation', order: 24, isActive: true, theme: { color: 'from-amber-700 to-yellow-700' } },
  { id: 'blues', title: 'Blues', description: 'Traditional and modern blues', order: 25, isActive: true, theme: { color: 'from-blue-700 to-indigo-700' } },
  { id: 'country', title: 'Country', description: 'Country and western', order: 26, isActive: true, theme: { color: 'from-yellow-600 to-amber-600' } },
  { id: 'folk', title: 'Folk', description: 'Folk and acoustic music', order: 27, isActive: true, theme: { color: 'from-green-600 to-lime-600' } },
  { id: 'reggae', title: 'Reggae', description: 'Reggae and dancehall rhythms', order: 28, isActive: true, theme: { color: 'from-lime-600 to-green-600' } },
  { id: 'indie', title: 'Indie', description: 'The best Indie tracks', order: 29, isActive: true, theme: { color: 'from-lime-600 to-green-600' } },
  { id: 'lofi', title: 'Lo-Fi', description: 'The best Lo-Fi tracks', order: 30, isActive: true, theme: { color: 'from-indigo-500 to-blue-400' } },
];

export default function ChartsHubPage() {
  const [timeframe] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewsMap, setPreviewsMap] = useState<Record<string, any[]>>({});
  const [previewsLoading, setPreviewsLoading] = useState(true);

  const globalChart = useMemo(() => ({ 
    id: 'global', 
    title: 'Global Top 50', 
    theme: {
      color: 'from-white to-sky-600'
    },
  }), []);

  const allCharts = useMemo(() => [globalChart, ...GENRES], [globalChart]);
  
  const filteredCharts = useMemo(() => 
    allCharts.filter(chart =>
      chart.title.toLowerCase().includes(searchQuery.toLowerCase())
    ),
    [allCharts, searchQuery]
  );

  // Fetch all chart previews in a single batch request
  useEffect(() => {
    const fetchAllPreviews = async () => {
      setPreviewsLoading(true);
      try {
        // Get all genre IDs (including 'global')
        const genreIds = ['global', ...GENRES.map(g => g.id)];
        const genresParam = genreIds.join(',');
        
        const response = await apiRequestSimple<{ previews: Array<{ genre: string; tracks: any[] }> }>(
          `/api/charts/previews?genres=${genresParam}&timeframe=${timeframe}&limit=3`
        );

        if (response.data?.previews) {
          // Convert array to map for easy lookup
          const map: Record<string, any[]> = {};
          response.data.previews.forEach((preview) => {
            map[preview.genre] = preview.tracks;
          });
          setPreviewsMap(map);
        }
      } catch (err) {
        console.error('Error fetching chart previews:', err);
      } finally {
        setPreviewsLoading(false);
      }
    };

    fetchAllPreviews();
  }, [timeframe]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-sky-500/30">
      <main className="pt-4 pb-20 px-6 max-w-7xl mx-auto">
        
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="text-5xl font-black tracking-tighter text-white">
              Official Charts.
            </h1>
            <p className="text-lg text-zinc-400 font-medium">
              The highest rated tracks, decided by the people.
            </p>
          </div>

          <div className="w-full md:w-auto flex flex-col gap-4 items-stretch md:items-end">
            <div className="w-full md:w-80 relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-white to-sky-500 rounded-full opacity-20 group-hover:opacity-40 blur transition-opacity" />
              <div className="relative flex items-center bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2.5 focus-within:border-sky-500/50 transition-colors">
                <Search className="w-4 h-4 text-zinc-500 mr-3" />
                <input 
                  type="text"
                  placeholder="Search charts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-white placeholder-zinc-500 w-full text-sm font-medium"
                />
                {searchQuery && (
                  <button type="button" onClick={() => setSearchQuery('')}>
                    <X className="w-4 h-4 text-zinc-500 hover:text-white transition-colors" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-6 flex items-center gap-2">
            <LayoutGrid className="w-4 h-4" /> All Leaderboards
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
            {previewsLoading && Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="relative h-[22rem] bg-zinc-900 rounded-3xl border border-white/5 overflow-hidden">
                {/* Shimmer effect */}
                <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                
                {/* Gradient header */}
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-zinc-700 to-zinc-800 opacity-50" />
                
                {/* Content skeleton */}
                <div className="p-6 relative z-10 flex flex-col h-full">
                  {/* Title and icon */}
                  <div className="flex justify-between items-start mb-6">
                    <div className="h-7 w-32 bg-zinc-800 rounded-lg" />
                    <div className="w-9 h-9 bg-zinc-800 rounded-full" />
                  </div>
                  
                  {/* Large cover image */}
                  <div className="mb-6">
                    <div className="aspect-square w-full rounded-xl bg-zinc-800 mb-3" />
                    <div className="h-5 w-3/4 bg-zinc-800 rounded mb-2" />
                    <div className="h-4 w-1/2 bg-zinc-800 rounded" />
                  </div>
                  
                  {/* Bottom tracks */}
                  <div className="mt-auto space-y-3 pt-4 border-t border-white/5">
                    {[1, 2].map((j) => (
                      <div key={j} className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-zinc-800 rounded" />
                        <div className="w-8 h-8 bg-zinc-800 rounded" />
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3.5 w-3/4 bg-zinc-800 rounded" />
                          <div className="h-2.5 w-1/2 bg-zinc-800 rounded" />
                        </div>
                        <div className="h-3 w-8 bg-zinc-800 rounded" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            {!previewsLoading && filteredCharts.map((chart) => (
              <ChartCard 
                key={chart.id} 
                config={chart} 
                timeframe={timeframe}
                previewTracks={previewsMap[chart.id]}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}