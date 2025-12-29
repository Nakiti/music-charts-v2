/**
 * API Route Rate Limiting Utilities
 * 
 * These utilities work in Node.js runtime (API routes) and provide
 * rate limiting without requiring Edge Runtime compatibility.
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Redis connection
let redis: Redis | null = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
} catch (err) {
  console.warn('[API RateLimit] Redis initialization failed:', err);
}

// Rate limiters for different route types
const rateLimiters = {
  // Standard API routes (30 req/min)
  standard: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, '60 s'),
        analytics: true,
        prefix: 'api:ratelimit:standard',
      })
    : null,

  // Discovery API routes (60 req/min) - higher limit for frequent polling
  discovery: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(60, '60 s'),
        analytics: true,
        prefix: 'api:ratelimit:discovery',
      })
    : null,

  // Admin routes (20 req/min) - lower limit for admin operations
  admin: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, '60 s'),
        analytics: true,
        prefix: 'api:ratelimit:admin',
      })
    : null,

  // Leaderboard routes (100 req/min) - higher limit since it's cached
  leaderboard: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, '60 s'),
        analytics: true,
        prefix: 'api:ratelimit:leaderboard',
      })
    : null,
};

/**
 * Get identifier for rate limiting from request
 */
function getIdentifier(request: Request): string {
  // Try to get user ID from Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    try {
      const token = authHeader.replace('Bearer ', '');
      const parts = token.split('.');
      if (parts.length === 3) {
        // Decode JWT payload
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        const userId = payload.user_id || payload.sub;
        if (userId) {
          return `user:${userId}`;
        }
      }
    } catch (err) {
      // Continue to IP-based limiting
    }
  }

  // Fall back to IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  const ip = forwarded?.split(',')[0] ?? realIp ?? 'anonymous';
  return `ip:${ip}`;
}

/**
 * Check rate limit for a request
 * Returns null if rate limiting is disabled or if under limit
 * Returns NextResponse with 429 if rate limited
 */
export async function checkRateLimit(
  request: Request,
  type: 'standard' | 'discovery' | 'admin' | 'leaderboard' = 'standard'
): Promise<NextResponse | null> {
  const ratelimiter = rateLimiters[type];
  
  // If rate limiting is not configured, allow request
  if (!ratelimiter) {
    return null;
  }

  try {
    const identifier = getIdentifier(request);
    const { success, limit, reset, remaining, pending } = await ratelimiter.limit(identifier);

    // Wait for pending promises
    await pending;

    if (!success) {
      // Rate limited
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      
      return NextResponse.json(
        {
          error: 'Too many requests',
          message: 'You have exceeded the rate limit. Please try again later.',
          retryAfter,
        },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': reset.toString(),
            'Retry-After': retryAfter.toString(),
          }
        }
      );
    }

    // Under limit - return null to indicate success
    // Note: Headers will be added by addRateLimitHeaders()
    return null;
  } catch (error) {
    // If rate limiting fails, allow the request
    console.error('[API RateLimit] Error checking rate limit:', error);
    return null;
  }
}

/**
 * Add rate limit headers to a successful response
 */
export async function addRateLimitHeaders(
  request: Request,
  response: NextResponse,
  type: 'standard' | 'discovery' | 'admin' | 'leaderboard' = 'standard'
): Promise<NextResponse> {
  const ratelimiter = rateLimiters[type];
  
  if (!ratelimiter) {
    return response;
  }

  try {
    const identifier = getIdentifier(request);
    const { limit, reset, remaining } = await ratelimiter.limit(identifier);

    // Add headers to response
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', remaining.toString());
    response.headers.set('X-RateLimit-Reset', reset.toString());

    return response;
  } catch (error) {
    console.error('[API RateLimit] Error adding headers:', error);
    return response;
  }
}

/**
 * Helper to wrap an API route handler with rate limiting
 */
export function withRateLimit<T extends any[]>(
  handler: (...args: T) => Promise<Response>,
  type: 'standard' | 'discovery' | 'admin' | 'leaderboard' = 'standard'
) {
  return async (...args: T): Promise<Response> => {
    // First argument should be the request
    const request = args[0] as Request;
    
    // Check rate limit
    const rateLimitResponse = await checkRateLimit(request, type);
    if (rateLimitResponse) {
      return rateLimitResponse;
    }

    // Call the actual handler
    const response = await handler(...args);

    // Add rate limit headers if it's a NextResponse
    if (response instanceof NextResponse) {
      return await addRateLimitHeaders(request, response, type);
    }

    return response;
  };
}

/**
 * Check if rate limiting is enabled
 */
export function isRateLimitingEnabled(): boolean {
  return redis !== null;
}

