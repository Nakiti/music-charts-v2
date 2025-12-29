"use client";

import React, { useState } from 'react';
import { Search, Upload, LayoutGrid, Compass, User, Zap, X } from 'lucide-react';
import { useGenres } from '@/hooks/useGenres';
import Link from 'next/link';

export default function DiscoverPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const {genres, loading} = useGenres()

  console.log("genres ", genres)

  const filteredGenres = genres.filter(genre => 
    genre.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-sky-500/30">
      <main className="pt-8 pb-20 px-6 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-8">
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white">
              Discover.
            </h1>
            <p className="text-xl text-zinc-400 max-w-lg leading-relaxed font-medium">
              Explore the sonic landscape. Choose a genre to enter the Arena and start voting.
            </p>
          </div>
          <div className="w-full md:w-1/3 relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-white to-sky-500 rounded-full opacity-20 group-hover:opacity-40 blur transition-opacity" />
            <div className="relative flex items-center bg-zinc-900 border border-zinc-800 rounded-full px-4 py-3 focus-within:border-sky-500/50 transition-colors">
              <Search className="w-5 h-5 text-zinc-500 mr-3" />
              <input 
                type="text"
                placeholder="Search genres..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none outline-none text-white placeholder-zinc-500 w-full font-medium"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')}>
                  <X className="w-4 h-4 text-zinc-500 hover:text-white transition-colors" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {!loading &&  filteredGenres.map((genre) => (
            <Link key={genre.id} href={`/discover/${genre.id}`} className="relative group overflow-hidden rounded-2xl bg-zinc-800 transition-all duration-300 h-40 border-none hover:scale-[1.02] hover:shadow-2xl hover:shadow-sky-900/20 cursor-pointer">
              <div className={`absolute inset-0 bg-gradient-to-br ${genre.theme.color} opacity-60 group-hover:opacity-80 transition-opacity duration-500`} />
              <div className="absolute inset-0 flex items-center justify-center p-4">
                <h4 className="text-2xl md:text-3xl font-black tracking-tighter z-10 drop-shadow-xl rotate-[-2deg] group-hover:rotate-0 group-hover:scale-110 transition-all duration-300 text-white text-center">
                  {genre.title}
                </h4>
              </div>
              <div className="absolute -top-8 -left-8 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-colors pointer-events-none opacity-0 group-hover:opacity-100 duration-500" />
              <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-black/20 rounded-full blur-2xl transition-colors pointer-events-none" />
            </Link>
          ))}
        </div>
        {!loading && filteredGenres.length === 0 && (
          <div className="text-center py-20">
            <p className="text-zinc-500 text-lg">No genres found for "{searchQuery}". Try "Trap" or "House".</p>
          </div>
        )}
      </main>
    </div>
  );
}