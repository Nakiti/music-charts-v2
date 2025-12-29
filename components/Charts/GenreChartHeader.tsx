import React from "react";
import Link from "next/link";
import { Trophy, Zap, Compass } from "lucide-react";

type Timeframe = "daily" | "weekly" | "monthly";

const getGenreColor = (g: string) => {
  switch (g) {
    case "edm":
      return "from-blue-600 to-indigo-900";
    case "hiphop":
      return "from-red-600 to-orange-900";
    default:
      return "from-purple-600 to-pink-900";
  }
};

interface GenreChartHeaderProps {
  genre: string;
  timeframe: Timeframe;
  trackCount: number;
}

const GenreChartHeader: React.FC<GenreChartHeaderProps> = ({
  genre,
  timeframe,
  trackCount,
}) => {
  return (
    <div
      className={`relative h-80 w-full overflow-hidden bg-gradient-to-b ${getGenreColor(
        genre
      )} to-zinc-950/50`}
    >
      <div className="absolute inset-0 bg-black/20" />
      <div className="relative h-full max-w-7xl mx-auto px-6 md:px-12 flex items-end pb-10 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="w-52 h-52 shadow-2xl shadow-black/50 rounded-lg overflow-hidden shrink-0 hidden md:block">
          <div
            className={`w-full h-full bg-gradient-to-br ${getGenreColor(
              genre
            )} flex items-center justify-center`}
          >
            <Trophy className="w-20 h-20 text-white/50" />
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-white/80">
            Official Leaderboard
          </span>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-white drop-shadow-xl capitalize">
            {genre} Top 50
          </h1>
          <p className="text-white/70 font-medium max-w-xl text-sm md:text-base mt-2">
            The definitive ranking of the best new {genre} music. Updated{" "}
            {timeframe} based on community votes and engagement velocity.
          </p>
          <div className="mt-4">
            <Link
              href={`/discover/${genre}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold transition-all hover:scale-105"
            >
              <Compass className="w-4 h-4" />
              <span>Enter Arena</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GenreChartHeader;


