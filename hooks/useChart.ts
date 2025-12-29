import { useState, useEffect, useRef } from 'react';
import {collection, query, where, orderBy, limit, getDocs} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Track } from '@/types';
import { useRealtimeLeaderboard } from './useRealtimeLeaderboard';
import { getCachedData, setCachedData, createCacheKey } from '@/lib/cache-utils';
import { apiRequestSimple, RateLimitInfo } from '@/lib/api-client';

/**
 * Get ISO week number using the standard algorithm
 * Week 1 is the first week with at least 4 days in January
 * This MUST match the backend calculation exactly
 */
const getISOWeekNumber = (date: Date): { year: number; week: number } => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7; 
  d.setUTCDate(d.getUTCDate() + 4 - dayNum); 
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return { year: d.getUTCFullYear(), week: weekNo };
};

/**
 * Format date as YYYY-MM-DD in local timezone (not UTC)
 * This ensures the date matches the timezone where the backend cron job runs
 * MUST match the backend formatDateLocal function exactly
 */
const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getChartPeriodString = (
  timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly',
  date: Date
): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');

  switch (timeframe) {
    case 'weekly': {
      const { year: weekYear, week } = getISOWeekNumber(date);
      return `${weekYear}-W${week}`;
    }
    case 'monthly':
      return `${year}-${month}`;
    case 'yearly':
      return String(year);
    case 'daily':
    default:
      return formatDateLocal(date);
  }
};

export const useChart = (
  genre: string,
  timeframe: 'daily' | 'weekly' | 'monthly' | 'yearly',
  selectedDate?: Date | null
) => {
  const [data, setData] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitInfo, setRateLimitInfo] = useState<RateLimitInfo | undefined>();
  const fetchInProgressRef = useRef(false); 

  const isToday = (date: Date | null): boolean => {
    if (!date) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate.getTime() === today.getTime();
  };
  
  const isLiveDaily = timeframe === 'daily' && (!selectedDate || isToday(selectedDate));
  const { tracks: liveTracksData, loading: liveLoading, error: liveError } = useRealtimeLeaderboard(
    isLiveDaily ? genre : '' 
  );

  useEffect(() => {
    //console.log(`[useChart] ${genre} | timeframe: ${timeframe} | selectedDate: ${selectedDate ? selectedDate.toISOString().split('T')[0] : 'null'} | isLiveDaily: ${isLiveDaily}`);
  }, [genre, timeframe, selectedDate, isLiveDaily]);

  useEffect(() => {
    if (fetchInProgressRef.current) return;
    
    setLoading(true);
    setError(null);

    if (isLiveDaily) {
      //console.log(`[useChart] ${genre} | Using LIVE DAILY path | liveLoading: ${liveLoading} | liveError: ${!!liveError} | liveTracksData length: ${liveTracksData.length}`);
      
      if (liveLoading) {
        // console.log(`[useChart] ${genre} | Still loading from real-time listener, waiting...`);
        setLoading(true);
        setError(null);
        return;
      }
      
      if (liveError) {
        //console.log(`[useChart] ${genre} | Real-time error, falling back to API: ${liveError}`);
        const cacheKey = createCacheKey('chart', genre, timeframe, 'current');
        const CACHE_TTL = 60 * 1000; // 60 seconds
        
        const cached = getCachedData<Track[]>(cacheKey, CACHE_TTL);
        if (cached) {
          // console.log(`[useChart] ${genre} | Using CACHED data (after real-time error)`);
          setData(cached.data);
          setRateLimitInfo(cached.rateLimitInfo);
          setLoading(false);
          setError(null);
          return;
        }
        
        fetchInProgressRef.current = true;
        const fetchFromAPI = async () => {
          try {
            //console.log(`[useChart] ${genre} | Fetching from API (real-time error fallback): /api/leaderboard/${genre}`);
            const response = await apiRequestSimple<{ tracks: Track[] }>(
              `/api/leaderboard/${genre}?limit=50`
            );
            
            if (response.rateLimitInfo) {
              setRateLimitInfo(response.rateLimitInfo);
            }
            
            if (response.isRateLimited) {
              console.warn('Chart API rate limited');
              setError('Rate limited. Please wait a moment.');
              setLoading(false);
              return;
            }
            
            if (response.data?.tracks) {
              const tracks = response.data.tracks;
              //console.log(`[useChart] ${genre} | API SUCCESS: Received ${tracks.length} tracks`);
              setData(tracks);
              setLoading(false);
              setError(null);
              setCachedData(cacheKey, tracks, true, response.rateLimitInfo);
            } else if (response.error) {
              //console.log(`[useChart] ${genre} | API ERROR: ${response.error}`);
              setError(response.error);
              setLoading(false);
            }
          } catch (err) {
            //console.error(`[useChart] ${genre} | Error fetching chart from API fallback:`, err);
            setError('Failed to load chart data');
            setLoading(false);
          } finally {
            fetchInProgressRef.current = false;
          }
        };
        fetchFromAPI();
        return;
      }
      
      // If real-time data exists, use it (this is the primary path)
      if (liveTracksData.length > 0) {
        // console.log(`[useChart] ${genre} | ✅ Using REAL-TIME data: ${liveTracksData.length} tracks (with streak & peak)`);
        setData(liveTracksData);
        setLoading(false);
        setError(null);
        return;
      }
      
      // Real-time listener has finished loading but has no data
      // This means the leaderboards_live document doesn't exist yet
      // Only NOW should we fall back to API
      // console.log(`[useChart] ${genre} | ⚠️ Real-time listener finished but data empty, trying API fallback`);
      
      // Real-time data is empty, fallback to API route (which handles Redis + Firestore)
      // Check cache first before making API call
      if (!fetchInProgressRef.current) {
        const cacheKey = createCacheKey('chart', genre, timeframe, 'current');
        const CACHE_TTL = 60 * 1000; // 60 seconds
        
        // Try cache first
        const cached = getCachedData<Track[]>(cacheKey, CACHE_TTL);
        if (cached) {
          //console.log(`[useChart] ${genre} | Using CACHED data (empty real-time fallback)`);
          setData(cached.data);
          setRateLimitInfo(cached.rateLimitInfo);
          setLoading(false);
          setError(null);
          return;
        }
        
        fetchInProgressRef.current = true;
        const fetchFromAPI = async () => {
          try {
            // console.log(`[useChart] ${genre} | Fetching from API (empty real-time): /api/leaderboard/${genre}`);
            // Use rate-limit-aware API client
            const response = await apiRequestSimple<{ tracks: Track[] }>(
              `/api/leaderboard/${genre}?limit=50`
            );
            
            if (response.rateLimitInfo) {
              setRateLimitInfo(response.rateLimitInfo);
            }
            
            if (response.isRateLimited) {
              console.warn('Chart API rate limited, using stale cache if available');
              setError('Rate limited. Please wait a moment.');
              setLoading(false);
              return;
            }
            
            if (response.data?.tracks) {
              const tracks = response.data.tracks;
              // console.log(`[useChart] ${genre} | API SUCCESS: Received ${tracks.length} tracks`);
              setData(tracks);
              setLoading(false);
              setError(null);
              // Cache the result
              setCachedData(cacheKey, tracks, true, response.rateLimitInfo);
            } else if (response.error) {
              // console.log(`[useChart] ${genre} | API ERROR: ${response.error}`);
              setError(response.error);
              setLoading(false);
            }
          } catch (err) {
            console.error(`[useChart] ${genre} | Error fetching chart from API fallback:`, err);
            setError('Failed to load chart data');
            setLoading(false);
          } finally {
            fetchInProgressRef.current = false;
          }
        };
        fetchFromAPI();
      }
      return;
    }

    const fetchHistorical = async () => {
      try {
        const dateToQuery = selectedDate || new Date();
        const effectiveTimeframe = timeframe === 'daily' ? 'daily' : timeframe;
        const periodId = getChartPeriodString(effectiveTimeframe, dateToQuery);
        
        // console.log(`[useChart] ${genre} | Fetching HISTORICAL snapshot | timeframe: ${effectiveTimeframe} | periodId: ${periodId}`);
        
        // Cache key for historical data
        const cacheKey = createCacheKey('chart', genre, effectiveTimeframe, periodId);
        const CACHE_TTL = 5 * 60 * 1000; // 5 minutes for historical data (doesn't change)
        
        // Check cache first
        const cached = getCachedData<Track[]>(cacheKey, CACHE_TTL);
        if (cached) {
          // console.log(`[useChart] ${genre} | Using CACHED historical data`);
          setData(cached.data);
          setRateLimitInfo(cached.rateLimitInfo);
          setLoading(false);
          setError(null);
          return;
        }

        const q = query(
          collection(db, 'leaderboards'),
          where('type', '==', effectiveTimeframe.toUpperCase()),
          where('genre', '==', genre),
          where('periodId', '==', periodId),
          limit(1)
        );

        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const chartDoc = snapshot.docs[0].data();
          const tracks = chartDoc.tracks as Track[];
          // console.log(`[useChart] ${genre} | HISTORICAL data found: ${tracks.length} tracks from Firestore leaderboards collection`);
          setData(tracks);
          // Cache historical data (longer TTL since it doesn't change)
          setCachedData(cacheKey, tracks, true);
        } else {
          // console.log(`[useChart] ${genre} | No historical data found for period ${periodId}`);
          setData([]); // No chart generated yet for this specific period
        }
      } catch (err) {
        console.error(`[useChart] ${genre} | Error fetching historical chart:`, err);
        setError('Failed to load chart data');
      } finally {
        setLoading(false);
      }
    };

    fetchHistorical();
  }, [genre, timeframe, selectedDate, isLiveDaily, liveTracksData, liveLoading, liveError]);

  return { data, loading, error, rateLimitInfo };
};