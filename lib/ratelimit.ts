import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

/**
 * Rate limiting configuration for the application
 * 
 * Different limits are applied based on the route and user type:
 * - Standard API routes: 30 requests per 60 seconds
 * - Discovery API (frequent polling): 60 requests per 60 seconds
 * - Admin routes: 20 requests per 60 seconds
 * - Leaderboard (cached): 100 requests per 60 seconds
 */

let redis: Redis | null = null;

// Initialize Redis connection
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
} catch (err) {
  console.warn('[RateLimit] Redis initialization failed:', err);
}

// Rate limiters for different route types
export const rateLimiters = {
  // Standard API routes (30 req/min)
  standard: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(30, '60 s'),
        analytics: true,
        prefix: 'ratelimit:standard',
      })
    : null,

  // Discovery API routes (60 req/min) - higher limit for frequent polling
  discovery: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(60, '60 s'),
        analytics: true,
        prefix: 'ratelimit:discovery',
      })
    : null,

  // Admin routes (20 req/min) - lower limit for admin operations
  admin: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, '60 s'),
        analytics: true,
        prefix: 'ratelimit:admin',
      })
    : null,

  // Leaderboard routes (100 req/min) - higher limit since it's cached
  leaderboard: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, '60 s'),
        analytics: true,
        prefix: 'ratelimit:leaderboard',
      })
    : null,
};

/**
 * Get the appropriate rate limiter based on the pathname
 */
export function getRateLimiter(pathname: string): Ratelimit | null {
  if (pathname.startsWith('/api/admin')) {
    return rateLimiters.admin;
  }
  
  if (pathname.startsWith('/api/discovery')) {
    return rateLimiters.discovery;
  }
  
  if (pathname.startsWith('/api/leaderboard')) {
    return rateLimiters.leaderboard;
  }
  
  // Default to standard rate limiter for other API routes
  return rateLimiters.standard;
}

/**
 * Get a unique identifier for rate limiting
 * Priority: User ID (if authenticated) > IP address
 */
export function getRateLimitIdentifier(
  request: Request,
  userId?: string
): string {
  // If user is authenticated, use their ID
  if (userId) {
    return `user:${userId}`;
  }
  
  // Otherwise, use IP address
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  const ip = forwarded?.split(',')[0] ?? realIp ?? 'anonymous';
  return `ip:${ip}`;
}

/**
 * Check if rate limiting is enabled (requires Redis connection)
 */
export function isRateLimitingEnabled(): boolean {
  return redis !== null;
}

