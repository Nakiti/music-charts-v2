import React, { useState, useMemo } from "react";
import {
  Play,
  Pause,
  Flame,
  X,
  Keyboard,
  Share2,
  MapPin,
  Users,
  ChevronRight,
  Trophy,
  Loader2,
} from "lucide-react";
import Visualizer from "@/components/Discover/Visualizer";
import VoteTooltip from "@/components/Discover/VoteToolTip";
import Link from "next/link";
import TrackSocialShareModal from "@/components/Studio/TrackSocialShareModal";
import { trackNameToSlug } from "@/lib/slug";

interface GenreArenaStageProps {
  genre: string;
  currentTrack: any;
  isPlaying: boolean;
  hasVoted: boolean;
  isVoting: boolean;
  voteAnimation: "fire" | "pass" | null;
  togglePlay: () => void;
  handleVote: (type: "FIRE" | "PASS") => void;
  soundcloudUrl?: string;
  iframeRef: React.RefObject<HTMLIFrameElement | null>;
  coverUrl?: string | null;
  widgetReady?: boolean;
  isMobile?: boolean;
  mobilePlayInitiated?: boolean;
  hasUserInteracted?: boolean;
}

const GenreArenaStage: React.FC<GenreArenaStageProps> = ({
  genre,
  currentTrack,
  isPlaying,
  hasVoted,
  isVoting,
  voteAnimation,
  togglePlay,
  handleVote,
  soundcloudUrl,
  iframeRef,
  coverUrl,
  widgetReady = true,
  isMobile = false,
  mobilePlayInitiated = false,
  hasUserInteracted = false,
}) => {
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  
  // Mobile detection fallback (in case parent doesn't pass it)
  const isMobileDevice = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
  }, []);
  
  const isOnMobile = isMobile || isMobileDevice;

  const trackTitle = currentTrack?.meta?.title || "Untitled Track";
  const trackCover = coverUrl || currentTrack?.meta?.cover || currentTrack?.cover || "";
  
  const trackUrl = useMemo(() => {
    if (!currentTrack?.uploaderUsername || !trackTitle) return "";
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    // Use slug field if available, otherwise generate from title
    const slugPart = currentTrack.slug || trackNameToSlug(trackTitle);
    return `${origin}/track/${currentTrack.uploaderUsername}/${slugPart}`;
  }, [currentTrack?.uploaderUsername, currentTrack?.slug, trackTitle]);

  return (
    <section className="col-span-1 md:col-span-6 relative flex flex-col items-center justify-center p-6 md:p-12 bg-gradient-to-b from-zinc-900/50 to-zinc-950">
      {/* Genre Tag with Navigation */}
      <div className="absolute top-4 md:top-6 left-1/2 -translate-x-1/2 flex flex-col sm:flex-row items-center gap-2 sm:gap-3 z-20">
        <div className="flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
          <span className="text-xs font-bold tracking-widest uppercase text-zinc-300">
            {genre}
          </span>
        </div>
        <Link
          href={`/charts/${genre}`}
          className="flex items-center gap-2 px-3 sm:px-4 py-1.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md text-white text-xs font-semibold transition-all hover:scale-105 whitespace-nowrap"
        >
          <Trophy className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">View Charts</span>
          <span className="sm:hidden">Charts</span>
        </Link>
      </div>

      {/* THE PLAYER CARD */}
      <div className="w-full max-w-md aspect-[4/5] md:aspect-square relative group perspective-1000">
        {/* The Card Container */}
        <div
          className={`relative w-full h-full bg-zinc-900 rounded-3xl border border-white/10 shadow-2xl overflow-hidden transition-all duration-500 transform ${
            voteAnimation === "fire"
              ? "translate-x-20 rotate-6 opacity-0"
              : voteAnimation === "pass"
              ? "-translate-x-20 -rotate-6 opacity-0"
              : "translate-x-0 rotate-0 opacity-100"
          }`}
        >
          {/* Album Art (Always Visible) */}
          <div className="absolute inset-0">
            <img
              src={
                coverUrl ||
                currentTrack.meta?.cover ||
                currentTrack.cover ||
                "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&fit=crop"
              }
              className="w-full h-full object-cover"
              alt={currentTrack.meta?.title || "Track cover"}
            />
            {/* Subtle Gradient Overlay for Text Legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent" />
          </div>

          {/* Loading Overlay - Shows while widget initializes */}
          {!widgetReady && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-10">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-10 h-10 text-sky-400 animate-spin" />
                <p className="text-sm font-semibold text-white tracking-wide">
                  Initializing player...
                </p>
              </div>
            </div>
          )}

          {/* "Click to Start" Overlay */}
          {/* Mobile: Shows on every track when not playing (autoplay blocked by browsers) */}
          {/* Desktop: Shows only on first track when not playing, then autoplays subsequent tracks */}
          {widgetReady && (isOnMobile || !hasUserInteracted) && !isPlaying && (
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center z-20 pointer-events-none">
              <button
                onClick={togglePlay}
                className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-white/10 hover:bg-white/20 border-2 border-white/30 backdrop-blur-md transition-all active:scale-95 shadow-2xl pointer-events-auto"
              >
                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center shadow-lg">
                  <Play className="w-10 h-10 text-white fill-current pl-1" />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-white font-bold text-xl">
                    {isOnMobile ? 'Tap to Play' : 'Click to Start'}
                  </span>
                  <span className="text-white/70 text-sm">
                    {isOnMobile ? 'Start the track' : 'Begin playback'}
                  </span>
                </div>
              </button>
            </div>
          )}

          {/* Visualizer Overlay (Bottom) */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent pt-24 pb-6 px-6">
            <div className="w-full flex flex-col gap-4">
              {/* Track & Artist Info (Always Visible) */}
              <div>
                <Link
                  href={`/track/${currentTrack.uploaderUsername}/${currentTrack.slug || trackNameToSlug(currentTrack.meta.title)}`}
                  className="block group/title"
                >
                  <h2 className="text-3xl font-black text-white truncate mb-1 drop-shadow-md group-hover/title:text-sky-400 transition-colors cursor-pointer">
                    {currentTrack.meta.title}
                  </h2>
                </Link>

                <Link
                  href={`/u/${currentTrack.uploaderUsername}`}
                  className="group/artist inline-flex items-center gap-3 hover:bg-white/10 p-2 -ml-2 rounded-lg transition-colors"
                >
                  {/* Small Avatar */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-white to-sky-500 flex items-center justify-center text-xs font-bold border border-white/20">
                    {/* {currentTrack.meta.artist} */}
                  </div>
                  <div>
                    <p className="text-lg font-bold text-sky-400 group-hover/artist:text-sky-300 flex items-center gap-2">
                      {currentTrack.meta.artist}
                      <ChevronRight className="w-4 h-4 opacity-0 group-hover/artist:opacity-100 transition-opacity" />
                    </p>
                    <div className="flex items-center gap-3 text-xs text-zinc-400">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />{" "}
                        {currentTrack.location || "Unknown"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" />{" "}
                        {typeof currentTrack.followers === "number"
                          ? currentTrack.followers.toLocaleString()
                          : "—"}
                      </span>
                    </div>
                  </div>
                </Link>

                {/* Mini Bio */}
                <p className="mt-3 text-sm text-zinc-300 line-clamp-2 leading-relaxed opacity-90">
                  {currentTrack.bio ||
                    "New to the arena. Be the first to help this track climb the charts."}
                </p>
              </div>

              {/* Visualizer Bars */}
              <Visualizer isPlaying={isPlaying} />
            </div>
          </div>

          {/* Top Controls */}
          <div className="absolute top-4 right-4 flex gap-2">
            <button
              onClick={() => setIsShareModalOpen(true)}
              className="p-2 rounded-full bg-black/40 hover:bg-white/20 backdrop-blur-md transition-colors text-white"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Floating Tooltips (Desktop Only) */}
        {/* <VoteTooltip side="left" icon={X} />
        <VoteTooltip side="right" icon={Flame} /> */}
      </div>

      {/* SoundCloud Player (hidden, autoplays on track load) */}
      {soundcloudUrl && (
        <iframe
          key={currentTrack.id}
          ref={iframeRef}
          title="SoundCloud Player"
          width="0"
          height="0"
          style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
          scrolling="no"
          frameBorder="no"
          allow="autoplay *; encrypted-media *;"
          src={`https://w.soundcloud.com/player/?url=${encodeURIComponent(
            soundcloudUrl
          )}&auto_play=false&hide_related=true&show_comments=false&show_user=false&show_reposts=false&show_teaser=false&visual=false&sharing=false&buying=false&mobile=${isOnMobile ? 'true' : 'false'}`}
        />
      )}

      {/* CONTROLS */}
      <div className="mt-8 flex items-center gap-8">
        {/* Pass Button */}
        <button
          onClick={() => handleVote("PASS")}
          disabled={hasVoted || isVoting || !widgetReady}
          className="group flex flex-col items-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="w-16 h-16 rounded-full border border-red-500/30 bg-red-500/10 flex items-center justify-center group-hover:bg-red-500 group-hover:shadow-[0_0_30px_-5px_rgba(239,68,68,0.5)] transition-all duration-300">
            <X className="w-8 h-8 text-red-500 group-hover:text-white transition-colors" />
          </div>
          <span className="text-xs font-bold text-zinc-500 tracking-widest group-hover:text-red-500 transition-colors">
            PASS
          </span>
        </button>

        {/* Play/Pause (Small) */}
        <button
          onClick={togglePlay}
          className="w-12 h-12 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 fill-current" />
          ) : (
            <Play className="w-5 h-5 fill-current pl-1" />
          )}
        </button>

        {/* Fire Button */}
        <button
          onClick={() => handleVote("FIRE")}
          disabled={hasVoted || isVoting || !widgetReady}
          className="group flex flex-col items-center gap-2 transition-transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="w-16 h-16 rounded-full border border-green-500/30 bg-green-500/10 flex items-center justify-center group-hover:bg-green-500 group-hover:shadow-[0_0_30px_-5px_rgba(34,197,94,0.5)] transition-all duration-300">
            <Flame className="w-8 h-8 text-green-500 group-hover:text-white fill-current transition-colors" />
          </div>
          <span className="text-xs font-bold text-zinc-500 tracking-widest group-hover:text-green-500 transition-colors">
            FIRE
          </span>
        </button>
      </div>

      {/* Keyboard Hint */}
      <div className="absolute bottom-6 flex items-center gap-2 text-xs text-zinc-600 font-mono hidden md:flex">
        <Keyboard className="w-3 h-3" />
        <span>Use Arrow Keys to Vote</span>
      </div>

      {/* Share Modal */}
      {isShareModalOpen && trackUrl && (
        <TrackSocialShareModal
          trackTitle={trackTitle}
          trackCover={trackCover}
          trackUrl={trackUrl}
          onClose={() => setIsShareModalOpen(false)}
        />
      )}
    </section>
  );
};

export default GenreArenaStage;


