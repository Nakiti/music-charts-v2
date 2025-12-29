import Link from "next/link";
import { useState, useMemo } from "react";
import {
  Flame,
  Edit3,
  Share2,
  MoreHorizontal,
  Calendar,
  Trophy,
  Music2,
} from "lucide-react";
import TrackSocialShareModal from "@/components/Studio/TrackSocialShareModal";
import { trackNameToSlug } from "@/lib/slug";

interface TrackMainSectionProps {
  embedSrc: string;
  user: any | null;
  voted: boolean;
  isVoting: boolean;
  isOwner: boolean;
  onVoteFire: () => void;
  resolvedTrackId: string | null;
  username: string | string[];
  genre?: string;
  createdAt?: any;
  chart?: any;
  displayStats?: any;
  trackTitle?: string;
  trackCover?: string;
  trackSlug?: string; // Add slug prop
}

const TrackMainSection = ({
  embedSrc,
  user,
  voted,
  isVoting,
  isOwner,
  onVoteFire,
  resolvedTrackId,
  username,
  genre,
  createdAt,
  chart,
  displayStats,
  trackTitle,
  trackCover,
  trackSlug,
}: TrackMainSectionProps) => {
  const canVote = !!user && !voted && !isVoting;
  const [showShareModal, setShowShareModal] = useState(false);

  // Generate track URL using slug if available, otherwise generate from title
  const trackUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/track/${username}/${trackSlug || trackNameToSlug(trackTitle || '')}` 
    : '';

  // Find the best peak rank across all genres (memoized to prevent recalculation on every render)
  const bestPeak = useMemo((): { rank: number; genre: string } | null => {
    if (!chart && !displayStats) return null;
    
    let bestPeak: number | null = null;
    let bestGenre = 'global';
    
    // Check displayStats
    if (displayStats) {
      Object.entries(displayStats).forEach(([genreName, stats]: [string, any]) => {
        if (stats.peak && (!bestPeak || stats.peak < bestPeak)) {
          bestPeak = stats.peak;
          bestGenre = genreName;
        }
      });
    }
    
    // Check chart data
    if (chart) {
      Object.entries(chart).forEach(([genreName, chartData]: [string, any]) => {
        if (chartData.peakRank && (!bestPeak || chartData.peakRank < bestPeak)) {
          bestPeak = chartData.peakRank;
          bestGenre = genreName;
        }
      });
    }
    
    return bestPeak ? { rank: bestPeak, genre: bestGenre } : null;
  }, [chart, displayStats]);

  return (
    <div className="lg:col-span-2 space-y-6">
      {/* 1. EMBED PLAYER */}
      <div className="aspect-video w-full bg-zinc-900 rounded-xl overflow-hidden shadow-2xl border border-white/10">
        {embedSrc ? (
          <iframe
            width="100%"
            height="100%"
            scrolling="no"
            frameBorder="no"
            allow="autoplay"
            src={embedSrc}
            className="w-full h-full"
          ></iframe>
        ) : (
          <div className="h-full flex items-center justify-center text-zinc-600">
            Invalid Media Source
          </div>
        )}
      </div>

      {/* 2. VOTE/ACTION BAR */}
      <div className="flex items-center justify-between p-4 bg-zinc-900 rounded-xl border border-white/10 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={onVoteFire}
            disabled={!canVote}
            className={`px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2 transition-all ${
              !user
                ? "bg-zinc-700 text-zinc-500 cursor-not-allowed"
                : voted
                ? "bg-green-500/20 text-green-400 border border-green-500"
                : "bg-green-500 hover:bg-green-400 text-black shadow-md"
            }`}
          >
            <Flame className="w-4 h-4 fill-current" />
            {voted ? "VOTED FIRE" : "VOTE FIRE"}
          </button>
          {isOwner && resolvedTrackId && (
            <Link
              href={`/studio/${resolvedTrackId}/edit`}
              className="px-3 py-2 text-sm text-zinc-400 hover:text-white transition-colors border border-zinc-700 rounded-full flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" /> Edit Metadata
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3 text-zinc-400 text-sm">
          <button 
            onClick={() => setShowShareModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-800 hover:bg-zinc-700 text-white transition-colors"
          >
            <Share2 className="w-4 h-4" />
            <span className="font-medium">Share</span>
          </button>
          {/* <button className="hover:text-white p-2">
            <MoreHorizontal className="w-5 h-5" />
          </button> */}
        </div>
      </div>

      {/* Share Modal */}
      {showShareModal && trackTitle && trackCover && (
        <TrackSocialShareModal
          trackTitle={trackTitle}
          trackCover={trackCover}
          trackUrl={trackUrl}
          onClose={() => setShowShareModal(false)}
        />
      )}

      {/* 3. TRACK HISTORY/LIFESPAN */}
      <div className="pt-4 border-t border-white/5 space-y-4">
        <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-400">
          Track Information
        </h3>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-zinc-900 p-4 rounded-xl border border-white/5">
            <p className="text-zinc-500 text-xs uppercase font-bold mb-1">
              Uploaded
            </p>
            <p className="text-white font-medium flex items-center gap-1">
              <Calendar className="w-4 h-4 text-sky-400" />
              {createdAt ? (
                new Date(createdAt.seconds * 1000).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })
              ) : (
                'N/A'
              )}
            </p>
          </div>
          <div className="bg-zinc-900 p-4 rounded-xl border border-white/5">
            <p className="text-zinc-500 text-xs uppercase font-bold mb-1">
              Best Peak Rank
            </p>
            <p className="text-white font-medium flex items-center gap-1">
              <Trophy className="w-4 h-4 text-yellow-400 fill-current" />
              {bestPeak ? (
                <>
                  #{bestPeak.rank} {bestPeak.genre.charAt(0).toUpperCase() + bestPeak.genre.slice(1)}
                </>
              ) : (
                'Not Charted'
              )}
            </p>
          </div>
          <div className="bg-zinc-900 p-4 rounded-xl border border-white/5">
            <p className="text-zinc-500 text-xs uppercase font-bold mb-1">
              Genre
            </p>
            <p className="text-white font-medium flex items-center gap-1">
              <Music2 className="w-4 h-4 text-pink-400" /> {genre || 'N/A'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackMainSection;


