import Link from "next/link";
import { useEffect, useState, memo } from "react";
import { Loader2, ArrowRight, Play } from "lucide-react";
import { apiRequestSimple, RateLimitInfo } from "@/lib/api-client";

const CACHE_DURATION_MS = 10 * 1000; // 10 seconds - reduced for fresher preview data
const CACHE_KEY_PREFIX = 'chart_preview_';

interface CacheEntry {
  data: any[];
  timestamp: number;
  rateLimitInfo?: RateLimitInfo;
}

const memoryCache = new Map<string, CacheEntry>();

const getCachedData = (genre: string, timeframe: string): CacheEntry | null => {
  const cacheKey = `${CACHE_KEY_PREFIX}${genre}_${timeframe}`;
  
  const memEntry = memoryCache.get(cacheKey);
  if (memEntry && Date.now() - memEntry.timestamp < CACHE_DURATION_MS) {
    return memEntry;
  }
  
  if (typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const entry: CacheEntry = JSON.parse(cached);
        if (Date.now() - entry.timestamp < CACHE_DURATION_MS) {
          memoryCache.set(cacheKey, entry);
          return entry;
        }
        localStorage.removeItem(cacheKey);
      }
    } catch (err) {
      console.warn('Error reading from cache:', err);
    }
  }
  
  return null;
};

const setCachedData = (genre: string, timeframe: string, data: any[], rateLimitInfo?: RateLimitInfo) => {
  const cacheKey = `${CACHE_KEY_PREFIX}${genre}_${timeframe}`;
  const entry: CacheEntry = {
    data,
    timestamp: Date.now(),
    rateLimitInfo,
  };
  
  memoryCache.set(cacheKey, entry);
  
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(entry));
    } catch (err) {
      console.warn('Error writing to cache:', err);
    }
  }
};

const useChartPreview = (genre: string, timeframe: string, skipFetch = false) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(!skipFetch);
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | undefined>();

  useEffect(() => {
    if (skipFetch) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    
    const fetchPreview = async () => {
      const cached = getCachedData(genre, timeframe);
      if (cached) {
        if (!cancelled) {
          setData(cached.data);
          setRateLimitInfo(cached.rateLimitInfo);
          setLoading(false);
        }
        // For very fresh cache (< 5 seconds), trust it completely
        // Otherwise, fetch in background to update if needed
        if (Date.now() - cached.timestamp < 5000) {
          return;
        }
      }
      
      try {
        const response = await apiRequestSimple<{ tracks: any[] }>(
          `/api/leaderboard/${genre}?limit=3`
        );
        
        if (cancelled) return;
        
        if (response.rateLimitInfo) {
          setRateLimitInfo(response.rateLimitInfo);
        }
        
        if (response.isRateLimited) {
          console.warn('Chart preview rate limited:', response.error);
          const staleCache = memoryCache.get(`${CACHE_KEY_PREFIX}${genre}_${timeframe}`);
          if (staleCache) {
            setData(staleCache.data);
          }
          return;
        }
        
        if (response.data?.tracks) {
          const tracks = response.data.tracks.slice(0, 3);
          setData(tracks);
          setCachedData(genre, timeframe, tracks, response.rateLimitInfo);
        } else if (response.error) {
          console.error('Error fetching chart preview:', response.error);
        }
      } catch (err) {
        if (!cancelled) {
          console.error('Error fetching chart preview:', err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchPreview();
    
    return () => {
      cancelled = true;
    };
  }, [genre, timeframe, skipFetch]);

  return { data, loading, rateLimitInfo };
};

const ChartCard = memo(({
  config,
  timeframe,
  previewTracks,
}: {
  config: { id: string; title: string; theme: { color: string } };
  timeframe: string;
  previewTracks?: any[]; // Optional: if provided, use these instead of fetching
}) => {
  // Only fetch if preview tracks are not provided
  const { data: fetchedTracks, loading, rateLimitInfo } = useChartPreview(
    config.id, 
    timeframe,
    previewTracks !== undefined // Skip fetch if preview tracks provided
  );
  // Use provided preview tracks if available, otherwise use fetched tracks
  const tracks = previewTracks !== undefined ? previewTracks : fetchedTracks;
  const isLoading = previewTracks !== undefined ? false : loading;

  const topTrack = tracks[0];

  const getCoverFor = (track: any): string => {
    if (!track) return "/window.svg";

    const meta = track.meta || {};
    const rawCover =
      (typeof track.cover === "string" && track.cover.trim().length > 0
        ? track.cover
        : undefined) ||
      (typeof meta.cover === "string" && meta.cover.trim().length > 0
        ? meta.cover
        : undefined);

    return rawCover && rawCover.trim().length > 0
      ? rawCover
      : "/window.svg";
  };

  if (isLoading) {
    return (
      <div className="relative h-64 bg-zinc-900 rounded-3xl border border-white/5 overflow-hidden animate-pulse">
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-zinc-700 animate-spin" />
        </div>
      </div>
    );
  }

  return (
      <Link href={`/charts/${config.id}`} className="group relative bg-zinc-900 rounded-3xl border border-white/5 overflow-hidden hover:border-white/20 hover:translate-y-[-4px] transition-all duration-300 shadow-xl hover:shadow-2xl">
        <div className={`absolute top-0 left-0 right-0 h-32 bg-gradient-to-br ${config.theme.color} opacity-50 group-hover:opacity-70 transition-opacity`} />  
        <div className="p-6 relative z-10 flex flex-col h-full">          
          <div className="flex justify-between items-start mb-6">
            <h3 className="text-2xl font-black tracking-tight text-white group-hover:text-purple-100 transition-colors">
              {config.title}
            </h3>
            <div className="p-2 bg-white/5 rounded-full group-hover:bg-white/10 transition-colors">
              <ArrowRight className="w-5 h-5 text-zinc-400 group-hover:text-white" />
            </div>
          </div>
          {topTrack && (
            <div className="mb-6">
              <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-3 shadow-lg group-hover:shadow-purple-500/20 transition-all">
                <img
                  src={getCoverFor(topTrack)}
                  alt={topTrack.meta?.title || 'Track cover'}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Play className="w-12 h-12 text-white fill-current drop-shadow-xl" />
                </div>
              </div>
              <div>
                <h4 className="font-bold text-white truncate">{topTrack.meta?.title || 'Unknown'}</h4>
                <p className="text-sm text-zinc-400 truncate">{topTrack.meta?.artist || 'Unknown Artist'}</p>
              </div>
            </div>
          )}
          <div className="mt-auto space-y-3 pt-4 border-t border-white/5">
            {tracks.slice(1, 3).map((track: any) => (
              <div key={track.id || track.rank} className="flex items-center gap-3">
                <span className="text-sm font-mono font-bold text-zinc-600 w-4 text-center">
                  {track.rank}
                </span>
                <img
                  src={getCoverFor(track)}
                  className="w-8 h-8 rounded bg-zinc-800 object-cover"
                  alt={track.meta?.title || ''}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-300 truncate group-hover:text-white transition-colors">
                    {track.meta?.title || 'Unknown'}
                  </p>
                  <p className="text-[10px] text-zinc-500 truncate">{track.meta?.artist || 'Unknown Artist'}</p>
                </div>
                <span className="text-xs font-mono text-zinc-500">{track.score || 0}</span>
              </div>
            ))}
          </div>
        </div>
      </Link>
    );
});

ChartCard.displayName = 'ChartCard';

export default ChartCard