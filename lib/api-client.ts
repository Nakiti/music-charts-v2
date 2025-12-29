/**
 * API Client with Rate Limit Handling
 * 
 * This utility provides a wrapper around fetch that automatically handles
 * rate limiting responses and provides retry logic with exponential backoff.
 */

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  rateLimitInfo?: RateLimitInfo;
  isRateLimited?: boolean;
}

export class RateLimitError extends Error {
  constructor(
    message: string,
    public retryAfter: number,
    public rateLimitInfo: RateLimitInfo
  ) {
    super(message);
    this.name = 'RateLimitError';
  }
}

/**
 * Extract rate limit information from response headers
 */
function extractRateLimitInfo(headers: Headers): RateLimitInfo | undefined {
  const limit = headers.get('X-RateLimit-Limit');
  const remaining = headers.get('X-RateLimit-Remaining');
  const reset = headers.get('X-RateLimit-Reset');

  if (limit && remaining && reset) {
    return {
      limit: parseInt(limit, 10),
      remaining: parseInt(remaining, 10),
      reset: parseInt(reset, 10),
    };
  }

  return undefined;
}

/**
 * Make an API request with automatic rate limit handling
 * 
 * @param url - The API endpoint URL
 * @param options - Fetch options
 * @param retryOptions - Retry configuration
 * @returns Promise with the response data and rate limit info
 */
export async function apiRequest<T = any>(
  url: string,
  options: RequestInit = {},
  retryOptions: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
  } = {}
): Promise<ApiResponse<T>> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
  } = retryOptions;

  let lastError: Error | null = null;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      const rateLimitInfo = extractRateLimitInfo(response.headers);

      // Handle rate limiting
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60', 10);
        const errorData = await response.json().catch(() => ({}));

        // If this is our last attempt, throw the error
        if (attempt === maxRetries) {
          throw new RateLimitError(
            errorData.message || 'Rate limit exceeded',
            retryAfter,
            rateLimitInfo!
          );
        }

        // Wait for the retry-after period (or exponential backoff, whichever is longer)
        const waitTime = Math.min(Math.max(retryAfter * 1000, delay), maxDelay);
        console.warn(`[API] Rate limited. Retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, waitTime));
        delay *= 2; // Exponential backoff
        continue;
      }

      // Handle other errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          rateLimitInfo,
        };
      }

      // Success
      const data = await response.json();
      return {
        data,
        rateLimitInfo,
      };

    } catch (error) {
      lastError = error as Error;

      // If it's a RateLimitError and we've exhausted retries, return it
      if (error instanceof RateLimitError) {
        return {
          error: error.message,
          isRateLimited: true,
          rateLimitInfo: error.rateLimitInfo,
        };
      }

      // For network errors, retry with exponential backoff
      if (attempt < maxRetries) {
        console.warn(`[API] Request failed. Retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2;
        continue;
      }
    }
  }

  // All retries exhausted
  return {
    error: lastError?.message || 'Request failed after multiple retries',
  };
}

/**
 * React hook-friendly API request function
 * 
 * This version doesn't automatically retry, making it suitable for use in
 * React hooks where you want more control over the retry logic.
 */
export async function apiRequestSimple<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, options);
    const rateLimitInfo = extractRateLimitInfo(response.headers);

    if (response.status === 429) {
      const errorData = await response.json().catch(() => ({}));
      return {
        error: errorData.message || 'Rate limit exceeded',
        isRateLimited: true,
        rateLimitInfo,
      };
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        error: errorData.error || `HTTP ${response.status}: ${response.statusText}`,
        rateLimitInfo,
      };
    }

    const data = await response.json();
    return {
      data,
      rateLimitInfo,
    };
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Request failed',
    };
  }
}

/**
 * Check if we're approaching the rate limit
 * 
 * @param rateLimitInfo - Rate limit information from response headers
 * @param threshold - Percentage threshold (0-1) to consider "approaching"
 * @returns true if remaining requests are below the threshold
 */
export function isApproachingRateLimit(
  rateLimitInfo: RateLimitInfo | undefined,
  threshold: number = 0.2
): boolean {
  if (!rateLimitInfo) return false;
  
  const percentageRemaining = rateLimitInfo.remaining / rateLimitInfo.limit;
  return percentageRemaining <= threshold;
}

/**
 * Get time until rate limit resets
 * 
 * @param rateLimitInfo - Rate limit information from response headers
 * @returns Seconds until reset, or null if no info available
 */
export function getTimeUntilReset(
  rateLimitInfo: RateLimitInfo | undefined
): number | null {
  if (!rateLimitInfo) return null;
  
  const now = Date.now();
  const resetTime = rateLimitInfo.reset;
  const secondsUntilReset = Math.max(0, Math.ceil((resetTime - now) / 1000));
  
  return secondsUntilReset;
}

