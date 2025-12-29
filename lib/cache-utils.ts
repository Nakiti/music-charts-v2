/**
 * Unified caching utilities for the application
 * 
 * Provides a consistent caching interface across all hooks and components.
 * Supports two-tier caching (memory + localStorage) with automatic cleanup.
 */

import { RateLimitInfo } from './api-client';

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  rateLimitInfo?: RateLimitInfo;
}

// Global in-memory cache
const memoryCache = new Map<string, CacheEntry>();

// Cache statistics for monitoring
export const cacheStats = {
  hits: 0,
  misses: 0,
  errors: 0,
  
  recordHit() {
    this.hits++;
  },
  
  recordMiss() {
    this.misses++;
  },
  
  recordError() {
    this.errors++;
  },
  
  getHitRate(): number {
    const total = this.hits + this.misses;
    return total > 0 ? (this.hits / total) * 100 : 0;
  },
  
  reset() {
    this.hits = 0;
    this.misses = 0;
    this.errors = 0;
  },
  
  toString(): string {
    return `Cache Stats - Hits: ${this.hits}, Misses: ${this.misses}, Hit Rate: ${this.getHitRate().toFixed(1)}%`;
  }
};

/**
 * Get data from cache (checks memory first, then localStorage)
 */
export function getCachedData<T>(
  key: string,
  ttlMs: number,
  useLocalStorage = true
): CacheEntry<T> | null {
  // Check memory cache first (fastest)
  const memEntry = memoryCache.get(key);
  if (memEntry && Date.now() - memEntry.timestamp < ttlMs) {
    cacheStats.recordHit();
    return memEntry as CacheEntry<T>;
  }
  
  // Check localStorage as fallback (persists across reloads)
  if (useLocalStorage && typeof window !== 'undefined') {
    try {
      const cached = localStorage.getItem(key);
      if (cached) {
        const entry: CacheEntry<T> = JSON.parse(cached);
        if (Date.now() - entry.timestamp < ttlMs) {
          // Restore to memory cache
          memoryCache.set(key, entry);
          cacheStats.recordHit();
          return entry;
        }
        // Expired, remove it
        localStorage.removeItem(key);
      }
    } catch (err) {
      console.warn('[Cache] Error reading from localStorage:', err);
      cacheStats.recordError();
    }
  }
  
  cacheStats.recordMiss();
  return null;
}

/**
 * Set data in cache (stores in both memory and localStorage)
 */
export function setCachedData<T>(
  key: string,
  data: T,
  useLocalStorage = true,
  rateLimitInfo?: RateLimitInfo
): void {
  const entry: CacheEntry<T> = {
    data,
    timestamp: Date.now(),
    rateLimitInfo,
  };
  
  // Store in memory cache
  memoryCache.set(key, entry);
  
  // Store in localStorage if enabled
  if (useLocalStorage && typeof window !== 'undefined') {
    try {
      localStorage.setItem(key, JSON.stringify(entry));
    } catch (err) {
      console.warn('[Cache] Error writing to localStorage:', err);
      cacheStats.recordError();
      // If localStorage is full, try to clear old entries
      if (err instanceof Error && err.name === 'QuotaExceededError') {
        clearOldCacheEntries(key.split('_')[0]); // Clear entries with same prefix
        // Try again
        try {
          localStorage.setItem(key, JSON.stringify(entry));
        } catch (retryErr) {
          console.error('[Cache] Failed to write after cleanup:', retryErr);
        }
      }
    }
  }
}

/**
 * Remove specific cache entry
 */
export function removeCachedData(key: string): void {
  memoryCache.delete(key);
  
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem(key);
    } catch (err) {
      console.warn('[Cache] Error removing from localStorage:', err);
    }
  }
}

/**
 * Clear all cache entries matching a prefix
 */
export function clearCacheByPrefix(prefix: string): void {
  // Clear from memory cache
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
  
  // Clear from localStorage
  if (typeof window !== 'undefined') {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(prefix)) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (err) {
      console.warn('[Cache] Error clearing localStorage by prefix:', err);
    }
  }
}

/**
 * Clear all app caches
 */
export function clearAllCaches(): void {
  memoryCache.clear();
  
  if (typeof window !== 'undefined') {
    try {
      // Clear all cache entries (those starting with known prefixes)
      const prefixes = ['chart_', 'profile_', 'track_', 'discovery_', 'chart_preview_'];
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && prefixes.some(prefix => key.startsWith(prefix))) {
          localStorage.removeItem(key);
        }
      }
    } catch (err) {
      console.warn('[Cache] Error clearing all caches:', err);
    }
  }
}

/**
 * Clear old cache entries (keep only recent ones)
 */
function clearOldCacheEntries(prefix: string, keepCount = 10): void {
  if (typeof window === 'undefined') return;
  
  try {
    const entries: Array<{ key: string; timestamp: number }> = [];
    
    // Collect all entries with this prefix
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        try {
          const data = localStorage.getItem(key);
          if (data) {
            const entry = JSON.parse(data);
            entries.push({ key, timestamp: entry.timestamp || 0 });
          }
        } catch (err) {
          // Invalid entry, remove it
          localStorage.removeItem(key);
        }
      }
    }
    
    // Sort by timestamp (newest first)
    entries.sort((a, b) => b.timestamp - a.timestamp);
    
    // Remove old entries (keep only recent ones)
    entries.slice(keepCount).forEach(entry => {
      localStorage.removeItem(entry.key);
      memoryCache.delete(entry.key);
    });
    
    // console.log(`[Cache] Cleaned up ${Math.max(0, entries.length - keepCount)} old ${prefix} entries`);
  } catch (err) {
    console.warn('[Cache] Error during cleanup:', err);
  }
}

/**
 * Get cache size information
 */
export function getCacheInfo(): {
  memoryCount: number;
  localStorageCount: number;
  localStorageSize: number;
} {
  const info = {
    memoryCount: memoryCache.size,
    localStorageCount: 0,
    localStorageSize: 0,
  };
  
  if (typeof window !== 'undefined') {
    try {
      const prefixes = ['chart_', 'profile_', 'track_', 'discovery_', 'chart_preview_'];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && prefixes.some(prefix => key.startsWith(prefix))) {
          info.localStorageCount++;
          const value = localStorage.getItem(key);
          if (value) {
            info.localStorageSize += value.length;
          }
        }
      }
    } catch (err) {
      console.warn('[Cache] Error getting cache info:', err);
    }
  }
  
  return info;
}

/**
 * Check if a cache entry exists and is valid
 */
export function hasCachedData(key: string, ttlMs: number): boolean {
  return getCachedData(key, ttlMs) !== null;
}

/**
 * Create a cache key from components
 */
export function createCacheKey(...parts: Array<string | number | undefined | null>): string {
  return parts
    .filter(part => part !== undefined && part !== null)
    .map(part => String(part))
    .join('_');
}

/**
 * Log cache statistics (for debugging)
 */
export function logCacheStats(): void {
  // console.log('[Cache]', cacheStats.toString());
  const info = getCacheInfo();
  // console.log('[Cache] Memory entries:', info.memoryCount);
  // console.log('[Cache] localStorage entries:', info.localStorageCount);
  // console.log('[Cache] localStorage size:', `${(info.localStorageSize / 1024).toFixed(2)} KB`);
}

// Expose cache stats globally for debugging
if (typeof window !== 'undefined') {
  (window as any).__cacheStats = cacheStats;
  (window as any).__logCacheStats = logCacheStats;
  (window as any).__clearAllCaches = clearAllCaches;
}

