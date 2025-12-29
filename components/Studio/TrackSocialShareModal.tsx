"use client";

import { useState } from "react";
import { X, Twitter, Instagram, Copy, CheckCircle2 } from "lucide-react";

interface TrackSocialShareModalProps {
  trackTitle: string;
  trackCover: string;
  trackUrl: string;
  onClose: () => void;
}

const TrackSocialShareModal: React.FC<TrackSocialShareModalProps> = ({
  trackTitle,
  trackCover,
  trackUrl,
  onClose,
}) => {
  const [copiedPlatform, setCopiedPlatform] = useState<"instagram" | "twitter" | null>(null);

  const baseMessage = `Vote for my track "${trackTitle}" on ChartBreaker!`;

  const instagramCaption = `${baseMessage}\n\n${trackUrl}`;
  const twitterText = `${baseMessage} ${trackUrl}`;

  const copyForPlatform = async (platform: "instagram" | "twitter") => {
    const text = platform === "instagram" ? instagramCaption : twitterText;

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        setCopiedPlatform(platform);
        setTimeout(() => setCopiedPlatform(null), 2000);
      } catch (err) {
        console.error("[TrackSocialShareModal] Failed to copy text", err);
      }
    }
  };

  const shareOnTwitter = () => {
    const intentUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
      twitterText
    )}`;
    if (typeof window !== "undefined") {
      window.open(intentUrl, "_blank");
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-zinc-950/95 p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-5 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-black tracking-tight text-white">
              Share your track
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Post on social to get your friends to vote for your track.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-zinc-900 p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Track preview */}
        <div className="mb-6 flex items-center gap-4 rounded-2xl border border-white/10 bg-zinc-900/60 p-3">
          <div className="h-16 w-16 overflow-hidden rounded-xl bg-zinc-800">
            <img
              src={trackCover}
              alt={trackTitle}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Track
            </p>
            <p className="truncate text-lg font-bold text-white">{trackTitle}</p>
            <p className="mt-1 line-clamp-2 text-xs text-zinc-500">
              {baseMessage}
            </p>
          </div>
        </div>

        {/* Platforms */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Instagram card */}
          <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-br from-white/10 via-sky-500/20 to-sky-600/10 p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-white to-sky-500 text-black">
                <Instagram className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Instagram</p>
                <p className="text-xs text-zinc-400">Story / Feed caption</p>
              </div>
            </div>
            <div className="mb-3 rounded-xl bg-zinc-950/70 p-3 text-xs text-zinc-200">
              <p className="font-semibold text-white">Preview</p>
              <p className="mt-1 whitespace-pre-line text-zinc-300">
                {instagramCaption}
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyForPlatform("instagram")}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"
            >
              {copiedPlatform === "instagram" ? (
                <>
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                  Copied caption
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy caption
                </>
              )}
            </button>
          </div>

          {/* Twitter / X card */}
          <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-gradient-to-br from-sky-500/20 via-zinc-900/40 to-slate-700/30 p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-white">
                <Twitter className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Twitter</p>
                <p className="text-xs text-zinc-400">Post with link</p>
              </div>
            </div>
            <div className="mb-3 rounded-xl bg-zinc-950/70 p-3 text-xs text-zinc-200">
              <p className="font-semibold text-white">Preview</p>
              <p className="mt-1 text-zinc-300">{twitterText}</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={shareOnTwitter}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-sky-500 px-3 py-2 text-xs font-semibold text-white hover:bg-sky-400"
              >
                <Twitter className="h-4 w-4" />
                Share on Twitter
              </button>
              <button
                type="button"
                onClick={() => copyForPlatform("twitter")}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-white hover:bg-white/15"
              >
                {copiedPlatform === "twitter" ? (
                  <>
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy text
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackSocialShareModal;


