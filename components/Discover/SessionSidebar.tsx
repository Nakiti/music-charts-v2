import React from "react";
import { History, Heart, Play } from "lucide-react";
import Link from "next/link";
import { trackNameToSlug } from "@/lib/slug";

interface SessionSidebarProps {
  sessionHistory: any[];
  sessionLikes: any[];
}

const SessionSidebar: React.FC<SessionSidebarProps> = ({ sessionHistory, sessionLikes }) => {
  // Cap displayed items to fit without scrollbars
  const MAX_HISTORY_ITEMS = 5;
  const MAX_LIKES_ITEMS = 6;
  const displayedHistory = sessionHistory.slice(0, MAX_HISTORY_ITEMS);
  const displayedLikes = sessionLikes.slice(0, MAX_LIKES_ITEMS);

  const getTrackUrl = (track: any) => {
    const username = track.uploaderUsername || "";
    const title = track.meta?.title || track.title || "";
    if (!username || !title) return "#";
    // Use slug if available, otherwise generate from title
    const slugPart = track.slug || trackNameToSlug(title);
    return `/track/${username}/${slugPart}`;
  };
  
  return (
    <aside className="hidden md:flex md:col-span-3 flex-col bg-zinc-900/30 h-full overflow-hidden">
      {/* Section 1: History */}
      <div className="flex-1 p-6 border-b border-white/5 min-h-0 overflow-hidden">
        <div className="flex items-center gap-2 mb-6 text-zinc-400 uppercase text-xs font-bold tracking-widest">
          <History className="w-4 h-4" /> Session History
        </div>
        <div className="space-y-4">
          {displayedHistory.length === 0 && (
            <div className="text-zinc-600 text-sm italic">
              No tracks rated yet.
            </div>
          )}
          {displayedHistory.map((track: any, i) => {
            const meta = track.meta || {};
            const title = meta.title || track.title || "Untitled Track";
            const artist = meta.artist || track.artist || "Unknown Artist";
            const cover =
              meta.cover ||
              track.cover ||
              "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=80&fit=crop";
            const trackUrl = getTrackUrl(track);

            return (
              <Link
                key={i}
                href={trackUrl}
                className="flex items-center gap-3 group opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
              >
                <img
                  src={cover}
                  className="w-10 h-10 rounded bg-zinc-800 object-cover"
                  alt={title}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-white group-hover:text-purple-400 transition-colors">
                    {title}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">{artist}</p>
                </div>
                <span
                  className={`text-xs font-bold ${
                    track.vote === "FIRE"
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {track.vote}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Section 2: Likes */}
      <div className="flex-1 p-6 min-h-0 overflow-hidden">
        <div className="flex items-center gap-2 mb-6 text-zinc-400 uppercase text-xs font-bold tracking-widest">
          <Heart className="w-4 h-4" /> My Likes
        </div>
        <div className="space-y-3">
          {displayedLikes.length === 0 && (
            <div className="text-zinc-600 text-sm italic">
              No liked tracks yet.
            </div>
          )}
          {displayedLikes.map((track: any, i) => {
            const meta = track.meta || {};
            const title = meta.title || track.title || "Untitled Track";
            const artist = meta.artist || "Unknown"
            const cover =
              meta.cover ||
              track.cover ||
              "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=80&fit=crop";
            const trackUrl = getTrackUrl(track);

            return (
              <Link
                key={i}
                href={trackUrl}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 transition-colors cursor-pointer group"
              >
                <div className="relative w-12 h-12">
                  <img
                    src={cover}
                    className="w-full h-full rounded bg-zinc-800 object-cover"
                    alt={title}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded">
                    <Play className="w-4 h-4 text-white fill-current" />
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-white group-hover:text-purple-400 transition-colors">
                    {title}
                  </p>
                  <p className="text-xs text-zinc-500 truncate">{artist}</p>
                  {/* <div className="flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 border border-white/5">
                      Spotify
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-400 border border-white/5">
                      YT
                    </span>
                  </div> */}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </aside>
  );
};

export default SessionSidebar;


