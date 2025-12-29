import React from 'react';
import { Upload, ChevronRight, PlayCircle, TrendingUp, Globe, BarChart2 } from 'lucide-react';
import Link from 'next/link';

const CHART_BOXES = [
  { id: 'daily', title: 'Top 50 Daily', subtitle: 'Updated every 24h', link: '/charts/global', bgColor: 'from-purple-600 to-blue-500', icon: TrendingUp },
  { id: 'hiphop', title: 'Top 50 Hip Hop', subtitle: 'Most popular hip hop', link: '/charts/hip-hop', bgColor: 'from-pink-600 to-orange-500', icon: Globe },
  { id: 'house', title: 'Top 50 House', subtitle: 'Community favorites', link: '/charts/house', bgColor: 'from-green-600 to-teal-500', icon: BarChart2 },
];

const DISCOVER_BOXES = [
  { id: 'hiphop', title: 'Hip Hop', link: '/discover/hip-hop', bgColor: 'from-red-600 to-pink-600' },
  { id: 'edm', title: 'EDM', link: '/discover/edm', bgColor: 'from-blue-600 to-indigo-600' },
  { id: 'trap', title: 'Trap', link: '/discover/trap', bgColor: 'from-yellow-600 to-orange-600' },
  { id: 'house', title: 'House', link: '/discover/house', bgColor: 'from-teal-600 to-green-600' },
  { id: 'drill', title: 'Drill', link: '/discover/drill', bgColor: 'from-gray-700 to-gray-900' },
  { id: 'dubstep', title: 'Dubstep', link: '/discover/dubstep', bgColor: 'from-purple-700 to-indigo-900' },
  { id: 'lofi', title: 'Lo-Fi', link: '/discover/lofi', bgColor: 'from-indigo-500 to-blue-400' },
  { id: 'pop', title: 'Pop', link: '/discover/pop', bgColor: 'from-pink-500 to-rose-400' },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen bg-zinc-950 text-white overflow-hidden font-sans">
      <main className="flex-1 overflow-y-auto  p-8">
        <div className="flex flex-col mb-10">
          <h2 className="text-4xl font-bold tracking-tight mb-4">Welcome to the Sounboard.</h2>
          <p className="text-xl max-w-3xl">The community-driven engine for music discovery. Cast your vote on random tracks and build the definitive leaderboard for the next generation of artists.</p>
        </div>
        <section className="mb-12">
          <Link href="/charts" className="group flex items-center gap-2 mb-6 w-fit">
            <h3 className="text-2xl font-bold group-hover:underline decoration-zinc-500 decoration-2 underline-offset-4">Official Charts</h3>
            <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-white transition-colors" />
          </Link>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {CHART_BOXES.map((chart) => (
              <Link key={chart.id} href={chart.link} className="relative group overflow-hidden rounded-lg bg-zinc-900 hover:bg-zinc-800 transition-all duration-300 p-6 flex flex-col justify-between h-40 border border-white/5 hover:border-white/10 shadow-lg">
                <div className={`absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r ${chart.bgColor}`} />
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xl font-bold mb-1 text-white group-hover:text-purple-200 transition-colors">{chart.title}</h4>
                    <p className="text-xs text-zinc-400 font-medium uppercase tracking-wider">{chart.subtitle}</p>
                  </div>
                  <chart.icon className="w-6 h-6 text-zinc-600 group-hover:text-white transition-colors" />
                </div>                
                <PlayCircle className="self-end w-10 h-10 text-purple-500 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0" />
              </Link>
            ))}
          </div>
        </section>
        <section>
          <Link href="/discover" className="group flex items-center gap-2 mb-6 w-fit">
            <h3 className="text-2xl font-bold group-hover:underline decoration-zinc-500 decoration-2 underline-offset-4">Discover by Genre</h3>
            <ChevronRight className="w-5 h-5 text-zinc-500 group-hover:text-white transition-colors" />
          </Link>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {DISCOVER_BOXES.map((genre) => (
              <Link key={genre.id} href={genre.link} className="relative group overflow-hidden rounded-lg bg-zinc-800 transition-all duration-300 h-28 border-none hover:scale-[1.02]">
                <div className={`absolute inset-0 bg-gradient-to-br ${genre.bgColor} opacity-60 group-hover:opacity-80 transition-opacity`} />
                <div className="absolute inset-0 flex items-center justify-center p-4">
                  <h4 className="text-2xl font-black tracking-tighter z-10 drop-shadow-lg rotate-[-3deg] group-hover:rotate-0 transition-transform duration-300">{genre.title}</h4>
                </div>
                <div className="absolute -bottom-4 -right-4 w-16 h-16 bg-white/10 rounded-full blur-xl group-hover:bg-white/20 transition-colors" />
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}