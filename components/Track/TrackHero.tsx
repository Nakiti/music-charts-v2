import Link from "next/link";
import { ChevronRight, Youtube, Music, ExternalLink } from "lucide-react";

interface TrackHeroProps {
  genre?: string;
  title?: string;
  artist?: string;
  username: string | string[];
  coverUrl?: string;
  metadata?: {
    provider?: 'YOUTUBE' | 'SOUNDCLOUD';
    externalId?: string;
  };
}

const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1549497042-171b3064e432?w=1200&fit=crop";

const TrackHero = ({
  genre,
  title,
  artist,
  username,
  coverUrl,
  metadata,
}: TrackHeroProps) => {
  const getProviderIcon = () => {
    if (metadata?.provider === 'YOUTUBE') {
      return <Youtube className="w-4 h-4" />;
    } else if (metadata?.provider === 'SOUNDCLOUD') {
      return <Music className="w-4 h-4" />;
    }
    return null;
  };

  const getProviderLink = () => {
    if (metadata?.provider === 'SOUNDCLOUD' && metadata?.externalId) {
      return metadata.externalId;
    }
    return null;
  };

  return (
    <div className="relative h-64 w-full bg-gradient-to-b from-white/10 to-zinc-950/50">
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative h-full max-w-7xl mx-auto px-6 md:px-12 flex items-center pb-10 gap-8">
        <div className="flex flex-col gap-2 pt-16">
          <div className="flex items-center gap-3">
            {genre && (
              <span className="text-sm font-bold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-white to-sky-400/80">
                {genre} TRACK
              </span>
            )}
            {metadata?.provider && (
              <div className="flex items-center gap-1 text-xs font-medium text-zinc-400 bg-zinc-900/50 px-2 py-1 rounded-full border border-white/10">
                {getProviderIcon()}
                <span>{metadata.provider}</span>
              </div>
            )}
          </div>
          {title && (
            <h1 className="text-5xl md:text-6xl font-black tracking-tighter text-white drop-shadow-xl">
              {title}
            </h1>
          )}
          <div className="flex items-center gap-4">
            {artist && (
              <Link
                href={`/u/${username}`}
                className="text-2xl font-medium text-white/90 hover:text-sky-400 transition-colors flex items-center gap-2 group"
              >
                {artist}
                <ChevronRight className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" />
              </Link>
            )}
            {getProviderLink() && (
              <a
                href={getProviderLink()!}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-sky-400 hover:text-sky-300 transition-colors flex items-center gap-1 group"
              >
                View Original
                <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackHero;


