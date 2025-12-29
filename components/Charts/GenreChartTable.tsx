import React, { useState } from "react";
import {
  Calendar,
  Share2,
  ExternalLink,
} from "lucide-react";
import { useRouter } from "next/navigation";
import TrackSocialShareModal from "@/components/Studio/TrackSocialShareModal";

export type Trend = "up" | "down" | "same";

export interface ChartTrack {
  id: string;
  rank: number;
  title: string;
  artist: string;
  genre: string;
  cover: string;
  score: number;
  votes: number;
  trend: Trend;
  movement: number;
  duration: string;
  isViral: boolean;
  streak: string;
  peak: number;
  velocity: string | null;
  // Optional fields that mirror underlying Firestore track data
  uploaderUsername?: string;
  externalUrl?: string | null;
  trackUrl?: string; // precomputed internal URL like /track/[username]/[track-name]
}

interface GenreChartTableProps {
  tracks: ChartTrack[];
  loading: boolean;
  error: boolean;
}

const GenreChartTable: React.FC<GenreChartTableProps> = ({
  tracks,
  loading,
  error,
}) => {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [shareTrack, setShareTrack] = useState<ChartTrack | null>(null);
  const router = useRouter();

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-8">
      {/* Table Header: Layout: Rank | Track | Peak | Streak | Velocity | Score | Votes | Share | Link */}
      <div className="grid grid-cols-[auto_1fr_auto_auto] md:grid-cols-[40px_3fr_1fr_1fr_1fr_1fr_1fr_40px_40px] gap-4 px-4 pb-2 border-b border-white/10 text-xs font-bold text-zinc-500 uppercase tracking-widest sticky top-36 bg-zinc-950 z-30">
        <div className="text-center">#</div>
        <div>Title</div>
        <div className="hidden md:block text-center text-zinc-600">Peak</div>
        <div className="hidden md:block text-center text-zinc-600">Streak</div>
        <div className="hidden md:block text-right text-zinc-600">Genre</div>
        <div className="hidden md:block text-right">Score</div>
        <div className="hidden md:block text-right">Votes</div>
        <div className="hidden md:flex items-center justify-end">
          <Share2 className="w-4 h-4 ml-auto" />
        </div>
        <div className="flex items-center justify-end">
          <ExternalLink className="w-4 h-4 ml-auto" />
        </div>
      </div>

      <div className="space-y-1 mt-2">
        {loading && (
          <>
            {Array.from({ length: 10 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-[auto_1fr_auto_auto] md:grid-cols-[40px_3fr_1fr_1fr_1fr_1fr_1fr_40px_40px] gap-4 items-center px-4 py-3 rounded-lg bg-white/5 animate-pulse"
              >
                {/* # */}
                <div className="h-5 w-5 bg-zinc-800 rounded" />
                {/* Title */}
                <div className="h-5 w-40 bg-zinc-800 rounded" />
                {/* Peak (md only) */}
                <div className="hidden md:block h-5 w-10 bg-zinc-800 rounded" />
                {/* Streak (md only) */}
                <div className="hidden md:block h-5 w-10 bg-zinc-800 rounded" />
                {/* Growth (md only) */}
                <div className="hidden md:block h-5 w-12 bg-zinc-800 rounded" />
                {/* Fire % (md only) */}
                <div className="hidden md:block h-5 w-12 bg-zinc-800 rounded" />
                {/* Votes (md only) */}
                <div className="hidden md:block h-5 w-12 bg-zinc-800 rounded" />
                {/* Share */}
                <div className="h-5 w-5 bg-zinc-800 rounded ml-auto" />
                {/* External link */}
                <div className="h-5 w-5 bg-zinc-800 rounded ml-auto" />
              </div>
            ))}
          </>
        )}

        {!loading && error && (
          <div className="px-4 py-6 rounded-lg bg-red-500/10 border border-red-500/40 text-sm text-red-200">
            Failed to load chart data. Please try again later.
          </div>
        )}

        {!loading && !error && tracks.length === 0 && (
          <div className="px-4 py-6 rounded-lg bg-zinc-900/60 border border-white/5 text-sm text-zinc-300">
            No tracks found for this chart yet.
          </div>
        )}

        {!loading &&
          !error &&
          tracks.map((track, index) => (
            <div
              key={track.id}
              className="group grid grid-cols-[auto_1fr_auto_auto] md:grid-cols-[40px_3fr_1fr_1fr_1fr_1fr_1fr_40px_40px] gap-4 items-center px-4 py-3 rounded-lg hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 cursor-pointer"
              onClick={() => {
                if (track.trackUrl) {
                  router.push(track.trackUrl);
                }
              }}
            >
              {/* 1. Rank Column */}
              <div className="flex flex-col items-center justify-center w-full">
                <span
                  className={`text-lg font-bold ${
                    index + 1 <= 3 ? "text-green-500" : "text-zinc-500"
                  } `}
                >
                  {index + 1}
                </span>
                {/* <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setPlayingId(playingId === track.id ? null : track.id);
                  }}
                  className="hidden group-hover:flex w-8 h-8 items-center justify-center text-white"
                >
                  {playingId === track.id ? (
                    <Pause className="w-4 h-4 fill-current" />
                  ) : (
                    <Play className="w-4 h-4 fill-current" />
                  )}
                </button> */}

                {/* Movement Indicator */}
                {/* <div className="flex items-center gap-0.5 mt-1 group-hover:hidden">
                  {track.trend === "up" && (
                    <ArrowUp className="w-2 h-2 text-green-500" />
                  )}
                  {track.trend === "down" && (
                    <ArrowDown className="w-2 h-2 text-red-500" />
                  )}
                  {track.trend === "same" && (
                    <Minus className="w-2 h-2 text-zinc-600" />
                  )}
                  {track.trend !== "same" && (
                    <span
                      className={`text-[9px] font-mono ${
                        track.trend === "up"
                          ? "text-green-500"
                          : "text-red-500"
                      }`}
                    >
                      {track.movement}
                    </span>
                  )}
                </div> */}
              </div>

              {/* 2. Track Info */}
              <div className="flex items-center gap-4 min-w-0">
                <img
                  src={track.cover}
                  alt={track.title}
                  className="w-12 h-12 rounded object-cover shadow-lg group-hover:shadow-purple-500/20 transition-all"
                />
                <div className="min-w-0">
                  <h3
                    className={`font-bold truncate ${
                      playingId === track.id ? "text-green-500" : "text-white"
                    }`}
                  >
                    {track.title}
                  </h3>
                  <p className="text-xs text-zinc-500 truncate">{track.artist}</p>
                  {/* <div className="flex items-center gap-2 text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">
                        <span className="truncate">{track.artist}</span>
                        {track.isViral && (
                          <span className="hidden lg:flex items-center gap-1 text-[10px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20">
                            <Flame className="w-3 h-3 fill-current" /> Viral
                          </span>
                        )}
                      </div> */}
                </div>
              </div>

              {/* 3. Peak (Desktop) */}
              <div className="hidden md:flex items-center justify-center text-sm font-mono text-zinc-500">
                {track.peak}
              </div>

              {/* 4. Streak (Desktop) */}
              <div className="hidden md:flex items-center justify-center text-sm font-mono text-zinc-400 gap-1">
                <Calendar className="w-3 h-3 text-zinc-600" />
                {track.streak}
              </div>

              {/* 5. Velocity/Growth (Desktop) */}
              <div
                className={`hidden md:flex items-center justify-end text-sm font-mono font-bold ${
                  track.isViral ? "text-green-400" : "text-zinc-500"
                }`}
              >
                {track.genre.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                {/* {track.velocity && (
                  <>
                    {track.velocity.startsWith("+") ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : track.velocity.startsWith("-") ? (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    ) : null}
                  </>
                )}
                {track.velocity} */}
              </div>

              {/* 6. Score (Desktop) */}
              <div className="hidden md:flex items-center justify-end gap-1">
                <span className="font-mono font-bold text-white">
                  {track.score}
                </span>
                {/* <div className="w-1 h-1 rounded-full bg-purple-500 shadow-[0_0_5px_rgba(168,85,247,0.8)]" /> */}
              </div>

              {/* 7. Votes (Desktop) */}
              <div className="hidden md:flex items-center justify-end text-sm text-zinc-400 font-mono">
                {track.votes.toLocaleString()}
              </div>

              {/* 8. Share */}
              <div className="flex items-center justify-end">
                <button
                  className="p-1.5 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShareTrack(track);
                  }}
                  aria-label="Share track"
                >
                  <Share2 className="w-4 h-4" />
                </button>
              </div>

              {/* 9. External Link */}
              <div className="flex items-center justify-end">
                {track.externalUrl && (
                  <button
                    className="p-1.5 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      window.open(
                        track.externalUrl as string,
                        "_blank",
                        "noopener,noreferrer"
                      );
                    }}
                    aria-label="Open in external provider"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
      </div>

      {shareTrack && (
        <TrackSocialShareModal
          trackTitle={shareTrack.title}
          trackCover={shareTrack.cover}
          trackUrl={
            typeof window !== "undefined"
              ? `${window.location.origin}${shareTrack.trackUrl ?? ""}`
              : shareTrack.trackUrl ?? ""
          }
          onClose={() => setShareTrack(null)}
        />
      )}
    </div>
  );
};

export default GenreChartTable;


