/**
 * Example React Component with Rate Limit Handling
 * 
 * This component demonstrates best practices for handling rate limits
 * in a React application, including:
 * - Displaying rate limit information to users
 * - Showing warnings when approaching limits
 * - Handling rate limit errors gracefully
 * - Implementing retry logic
 */

'use client';

import { useState, useEffect } from 'react';
import { apiRequestSimple, RateLimitInfo, isApproachingRateLimit, getTimeUntilReset } from '@/lib/api-client';

interface Track {
  id: string;
  meta: {
    title: string;
    artist: string;
  };
}

export default function RateLimitAwareComponent() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | undefined>();
  const [isRateLimited, setIsRateLimited] = useState(false);

  const fetchTracks = async () => {
    setLoading(true);
    setError(null);
    setIsRateLimited(false);

    const response = await apiRequestSimple<{ tracks: Track[] }>(
      '/api/leaderboard/hiphop'
    );

    setLoading(false);

    // Update rate limit info
    if (response.rateLimitInfo) {
      setRateLimitInfo(response.rateLimitInfo);
    }

    // Handle rate limiting
    if (response.isRateLimited) {
      setIsRateLimited(true);
      setError(response.error || 'Rate limit exceeded');
      return;
    }

    // Handle other errors
    if (response.error) {
      setError(response.error);
      return;
    }

    // Success
    if (response.data) {
      setTracks(response.data.tracks);
    }
  };

  // Auto-fetch on mount
  useEffect(() => {
    fetchTracks();
  }, []);

  // Calculate time until reset
  const timeUntilReset = getTimeUntilReset(rateLimitInfo);
  const isApproaching = isApproachingRateLimit(rateLimitInfo, 0.2);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-4">Rate Limit Aware Component</h1>
        
        {/* Rate Limit Status */}
        {rateLimitInfo && (
          <div className={`p-4 rounded-lg mb-4 ${
            isRateLimited 
              ? 'bg-red-50 border border-red-200' 
              : isApproaching 
              ? 'bg-yellow-50 border border-yellow-200' 
              : 'bg-green-50 border border-green-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">
                  {isRateLimited ? '🚫 Rate Limited' : isApproaching ? '⚠️ Approaching Limit' : '✅ Rate Limit Status'}
                </p>
                <p className="text-sm mt-1">
                  {rateLimitInfo.remaining} / {rateLimitInfo.limit} requests remaining
                </p>
                {timeUntilReset !== null && (
                  <p className="text-sm">
                    Resets in {timeUntilReset} seconds
                  </p>
                )}
              </div>
              
              {/* Visual indicator */}
              <div className="w-32">
                <div className="bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${
                      isRateLimited 
                        ? 'bg-red-500' 
                        : isApproaching 
                        ? 'bg-yellow-500' 
                        : 'bg-green-500'
                    }`}
                    style={{ 
                      width: `${(rateLimitInfo.remaining / rateLimitInfo.limit) * 100}%` 
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Warning when approaching limit */}
        {isApproaching && !isRateLimited && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-yellow-800">
              ⚠️ You're approaching the rate limit. Consider reducing the frequency of requests.
            </p>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <p className="text-red-800 font-semibold">Error</p>
            <p className="text-red-700">{error}</p>
            {isRateLimited && timeUntilReset !== null && (
              <p className="text-red-600 text-sm mt-2">
                Please wait {timeUntilReset} seconds before trying again.
              </p>
            )}
          </div>
        )}

        {/* Action button */}
        <button
          onClick={fetchTracks}
          disabled={loading || isRateLimited}
          className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
            loading || isRateLimited
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-500 text-white hover:bg-blue-600'
          }`}
        >
          {loading ? 'Loading...' : isRateLimited ? 'Rate Limited' : 'Fetch Tracks'}
        </button>
      </div>

      {/* Tracks display */}
      <div>
        <h2 className="text-xl font-semibold mb-3">Tracks ({tracks.length})</h2>
        {tracks.length > 0 ? (
          <div className="space-y-2">
            {tracks.slice(0, 10).map((track) => (
              <div key={track.id} className="p-3 bg-white rounded-lg border">
                <p className="font-semibold">{track.meta.title}</p>
                <p className="text-sm text-gray-600">{track.meta.artist}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No tracks loaded</p>
        )}
      </div>

      {/* Developer info */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h3 className="font-semibold mb-2">Developer Info</h3>
        <pre className="text-xs overflow-auto">
          {JSON.stringify({ rateLimitInfo, isRateLimited, error }, null, 2)}
        </pre>
      </div>
    </div>
  );
}

