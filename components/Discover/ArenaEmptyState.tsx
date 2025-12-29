import React from "react";
import Link from "next/link";
import { Music2, LayoutGrid, Compass, Upload, ArrowRight, Home } from "lucide-react";

interface ArenaEmptyStateProps {
  genre: string;
}

const ArenaEmptyState: React.FC<ArenaEmptyStateProps> = ({ genre }) => {
  const capitalizedGenre = genre.charAt(0).toUpperCase() + genre.slice(1);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-6">
      <div className="max-w-2xl w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        {/* Visual Element */}
        <div className="relative flex justify-center">
          <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-sky-600/20 rounded-full blur-3xl" />
          <div className="relative w-32 h-32 bg-gradient-to-br from-white/10 to-sky-600/20 rounded-3xl border border-white/10 flex items-center justify-center backdrop-blur-sm">
            <Music2 className="w-16 h-16 text-sky-400/60" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-4">
          <h2 className="text-3xl md:text-4xl font-black tracking-tighter text-white">
            Arena Complete
          </h2>
          <p className="text-lg text-zinc-400 max-w-md mx-auto leading-relaxed">
            You've listened to all available tracks in{" "}
            <span className="font-semibold text-white capitalize">{genre}</span>.
            Explore other parts of the platform or check back later for new tracks.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-stretch sm:items-center pt-4">
          <Link
            href={`/charts/${genre}`}
            className="group flex items-center justify-center gap-3 px-6 py-4 bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 rounded-2xl text-white font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-sky-900/20"
          >
            <LayoutGrid className="w-5 h-5" />
            <span>View {capitalizedGenre} Charts</span>
            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </Link>

          <Link
            href="/discover"
            className="group flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-white/10 to-sky-600/20 hover:from-white/20 hover:to-sky-600/30 border border-sky-500/30 hover:border-sky-500/50 rounded-2xl text-white font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-sky-900/30"
          >
            <Compass className="w-5 h-5" />
            <span>Discover Other Genres</span>
            <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ArenaEmptyState;

