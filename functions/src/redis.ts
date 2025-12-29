import { Redis } from '@upstash/redis';

let redisClient: Redis | null = null;

/**
 * Get Redis client instance (lazy initialization)
 * In Cloud Functions v2, secrets are available via process.env
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    
    if (!url || !token) {
      throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set as secrets');
    }
    
    redisClient = new Redis({
      url,
      token,
    });
  }
  
  return redisClient;
}

/**
 * Leaderboard key structure:
 * - Daily: leaderboard:{genre}:daily
 * - Weekly: leaderboard:{genre}:weekly:{year}-W{week}
 * - Monthly: leaderboard:{genre}:monthly:{year}-{month}
 */

export interface LeaderboardEntry {
  trackId: string;
  score: number;
  rank: number;
}

/**
 * Update a track's score in the leaderboard
 * Redis sorted sets: higher scores = higher rank
 */
export async function updateTrackScore(
  genre: string,
  trackId: string,
  wilsonScore: number,
  timeframe: 'daily' | 'weekly' | 'monthly' = 'daily'
): Promise<void> {
  const redis = getRedisClient();
  const key = getLeaderboardKey(genre, timeframe);
  
  const redisScore = Math.round(wilsonScore * 1000);
  await redis.zadd(key, { score: redisScore, member: trackId });
  
  const ttl = timeframe === 'daily' ? 60 * 60 * 25 :timeframe === 'weekly' ? 60 * 60 * 24 * 8 : 60 * 60 * 24 * 32;
  await redis.expire(key, ttl);
}

/**
 * Get top N tracks from leaderboard
 */
export async function getLeaderboard(
  genre: string,
  limit: number = 50,
  timeframe: 'daily' | 'weekly' | 'monthly' = 'daily'
): Promise<LeaderboardEntry[]> {
  const redis = getRedisClient();
  const key = getLeaderboardKey(genre, timeframe);
  
  const results = await redis.zrange(key, 0, limit - 1, { 
    rev: true, 
    withScores: true 
  }) as Array<{ score: number; value: string }>;
  
  return results.map((item: { score: number; value: string }, index: number) => ({
    trackId: item.value,
    score: item.score / 1000, 
    rank: index + 1
  }));
}

/**
 * Get a specific track's rank in the leaderboard
 */
export async function getTrackRank(
  genre: string,
  trackId: string,
  timeframe: 'daily' | 'weekly' | 'monthly' = 'daily'
): Promise<number | null> {
  const redis = getRedisClient();
  const key = getLeaderboardKey(genre, timeframe);  
  const rank = await redis.zrevrank(key, trackId);
  
  return rank !== null ? rank + 1 : null;
}

/**
 * Remove a track from leaderboard (if banned, etc.)
 */
export async function removeTrack(
  genre: string,
  trackId: string,
  timeframe: 'daily' | 'weekly' | 'monthly' = 'daily'
): Promise<void> {
  const redis = getRedisClient();
  const key = getLeaderboardKey(genre, timeframe);
  await redis.zrem(key, trackId);
}

/**
 * Helper to generate consistent keys
 */
function getLeaderboardKey(genre: string, timeframe: string): string {
  const now = new Date();
  
  switch (timeframe) {
    case 'daily':
      return `leaderboard:${genre}:daily`;
    
    case 'weekly':
      const weekNum = getWeekNumber(now);
      return `leaderboard:${genre}:weekly:${now.getFullYear()}-W${weekNum}`;
    
    case 'monthly':
      const month = String(now.getMonth() + 1).padStart(2, '0');
      return `leaderboard:${genre}:monthly:${now.getFullYear()}-${month}`;
    
    default:
      return `leaderboard:${genre}:daily`;
  }
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}
