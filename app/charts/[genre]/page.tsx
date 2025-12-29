"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useChart } from "@/hooks/useChart";
import { useParams } from "next/navigation";
import { httpsCallable } from "firebase/functions";
import { fbFunctions } from "@/lib/firebase";
import GenreChartHeader from "@/components/Charts/GenreChartHeader";
import GenreChartControls from "@/components/Charts/GenreChartControls";
import GenreChartTable, {
  ChartTrack,
} from "@/components/Charts/GenreChartTable";
import { trackNameToSlug } from "@/lib/slug";

type Timeframe = "daily" | "weekly" | "monthly";

export default function GenreChartPage() {
  const params = useParams();
  const rawGenre = (params as Record<string, string | string[] | undefined>)?.genre;
  const genre = (Array.isArray(rawGenre) ? rawGenre[0] : rawGenre) || "hiphop";
  const [timeframe, setTimeframe] = useState<Timeframe>("daily");
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [coverMap, setCoverMap] = useState<Record<string, string>>({});

  const { data: rawTracks, loading, error } = useChart(
    genre,
    timeframe,
    selectedDate
  );

  const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = day === 0 ? -6 : 1 - day; 
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const getMonthStart = (date: Date): Date => {
    const d = new Date(date);
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const handleTimeframeChange = (t: Timeframe) => {
    setTimeframe(t);
    if (t === "daily") {
      setSelectedDate(null);
    } else {
      const now = new Date();
      if (t === "weekly") {
        setSelectedDate(getWeekStart(now));
      } else if (t === "monthly") {
        setSelectedDate(getMonthStart(now));
      }
    }
  };

  const shiftPeriod = (direction: "prev" | "next") => {
    setSelectedDate((current) => {
      const base = current ?? new Date();
      
      if (timeframe === "daily") {
        const next = new Date(base);
        next.setDate(base.getDate() + (direction === "prev" ? -1 : 1));
        next.setHours(0, 0, 0, 0);
        return next;
      } else if (timeframe === "weekly") {
        const weekStart = getWeekStart(base);
        const next = new Date(weekStart);
        next.setDate(weekStart.getDate() + (direction === "prev" ? -7 : 7));
        return next;
      } else if (timeframe === "monthly") {
        const monthStart = getMonthStart(base);
        const next = new Date(monthStart);
        next.setMonth(monthStart.getMonth() + (direction === "prev" ? -1 : 1));
        return next;
      }

      return base;
    });
  };

  const canGoForward = useMemo(() => {
    if (!selectedDate) return false;
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    if (timeframe === "daily") {
      const selected = new Date(selectedDate);
      selected.setHours(0, 0, 0, 0);
      const tomorrow = new Date(selected);
      tomorrow.setDate(selected.getDate() + 1);
      return tomorrow <= now;
    } else if (timeframe === "weekly") {
      const weekStart = getWeekStart(selectedDate);
      const nextWeek = new Date(weekStart);
      nextWeek.setDate(weekStart.getDate() + 7);
      return nextWeek <= getWeekStart(now);
    } else if (timeframe === "monthly") {
      const monthStart = getMonthStart(selectedDate);
      const nextMonth = new Date(monthStart);
      nextMonth.setMonth(monthStart.getMonth() + 1);
      return nextMonth <= getMonthStart(now);
    }

    return false;
  }, [selectedDate, timeframe]);

  const periodLabel = useMemo(() => {
    if (timeframe === "daily") {
      if (!selectedDate) return "Today";
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(selectedDate);
      selected.setHours(0, 0, 0, 0);
      
      if (selected.getTime() === today.getTime()) {
        return "Today";
      }
      
      return selected.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: selected.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      });
    }

    const date = selectedDate ?? new Date();

    if (timeframe === "weekly") {
      const monday = getWeekStart(date);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      const fmt = (dt: Date, includeYear = false) =>
        dt.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          ...(includeYear ? { year: "numeric" } : {}),
        });

      const currentYear = new Date().getFullYear();
      const mondayYear = monday.getFullYear();
      const sundayYear = sunday.getFullYear();
      const showYear = sundayYear !== currentYear || mondayYear !== sundayYear;

      if (mondayYear === sundayYear) {
        return `Week of ${fmt(monday)} – ${fmt(sunday, showYear)}`;
      } else {
        return `Week of ${fmt(monday, true)} – ${fmt(sunday, true)}`;
      }
    }

    if (timeframe === "monthly") {
      const monthStart = getMonthStart(date);
      return monthStart.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
      });
    }

    return "";
  }, [timeframe, selectedDate]);

  useEffect(() => {
    if (!Array.isArray(rawTracks) || rawTracks.length === 0) return;

    const scTracks = rawTracks.filter(
      (track) => track?.meta?.provider === "SOUNDCLOUD" && track?.meta?.externalId
    );

    if (scTracks.length === 0) {
        return; 
    }

    if (scTracks.length === 0) return;

    const idToUrl: Record<string, string> = {};
    const urls: string[] = [];

    scTracks.forEach((track: any) => {
      const trackId = track.id;
      const url = track.meta?.externalId as string | undefined;

      if (!trackId || !url) return;
      if (idToUrl[trackId]) return;

      idToUrl[trackId] = url;
      urls.push(url);
    });

    if (urls.length === 0) {
        // console.log("DEBUG: Mapped URLs list is empty.");
        return; 
    }
    if (urls.length === 0) return;

    const fetchCovers = async () => {
      try {
        const getSoundcloudCovers = httpsCallable<
          { urls: string[] },
          { [url: string]: string | null }
        >(fbFunctions, "getSoundcloudCovers");

        const res = await getSoundcloudCovers({ urls });
        const data = res.data || {};

        const next: Record<string, string> = {};

        scTracks.forEach((track: any) => {
          const trackId = track.id;
          const url = idToUrl[trackId];
          if (!trackId || !url) return;

          const imageUrl = (data as Record<string, string | null>)[url];
          if (imageUrl) {
            next[trackId] = imageUrl;
          }
        });

        if (Object.keys(next).length > 0) {
          setCoverMap((prev) => ({ ...prev, ...next }));
        }
      } catch (err) {
        console.error("Failed to fetch SoundCloud covers", err);
      }
    };

    fetchCovers();
  }, [rawTracks]);

  const tracks: ChartTrack[] = useMemo(() => {
    if (!Array.isArray(rawTracks)) return [];

    // Debug logging for first track (disabled in production)
    // if (rawTracks.length > 0 && genre === 'global') {
    //   const track: any = rawTracks[0];
    //   console.log('[Track Structure Debug] First track FULL:', {
    //     id: track.id,
    //     trackId: track.trackId,
    //     'meta.genre': track.meta?.genre,
    //     genre: track.genre,
    //     peak: track.peak,
    //     'displayStats?.global?.peak': track.displayStats?.global?.peak,
    //     'chart?.global?.peakRank': track.chart?.global?.peakRank,
    //     streak: track.streak,
    //     'displayStats?.global?.streak': track.displayStats?.global?.streak,
    //     'chart?.global?.streakDays': track.chart?.global?.streakDays,
    //     rank: track.rank,
    //     score: track.score,
    //     title: track.title || track.meta?.title,
    //   });
    // }

    const sortedTracks = [...rawTracks].sort((a: any, b: any) => {
      const scoreA = typeof a.stats?.wilsonScore === "number"
        ? a.stats.wilsonScore
        : typeof a.score === "number"
        ? a.score
        : 0;
      const scoreB = typeof b.stats?.wilsonScore === "number"
        ? b.stats.wilsonScore
        : typeof b.score === "number"
        ? b.score
        : 0;
      return scoreB - scoreA; 
    });

    return sortedTracks.slice(0, 50).map((track: any, index: number) => {
      // Handle both id (live leaderboards & new snapshots) and trackId (old snapshots)
      const trackId = track.id || track.trackId;
      
      const title = track.meta?.title ?? track.title ?? "Untitled";
      const artist = track.meta?.artist ?? track.artist ?? "Unknown Artist";
      const coverOverride = (trackId && coverMap[trackId as string]) || undefined;
      
      // Use track.genre directly (all tracks should have this now)
      const trackGenre = track.genre || track.meta?.genre || genre;

      const rawCover =
        coverOverride ||
        (typeof track.cover === "string" && track.cover.trim().length > 0
          ? track.cover
          : undefined) ||
        (typeof track.meta?.cover === "string" &&
        track.meta.cover.trim().length > 0
          ? track.meta.cover
          : undefined);

      const cover = rawCover && rawCover.trim().length > 0 ? rawCover : "/window.svg";
      const votes: number = track.stats?.totalVotes ?? track.totalVotes ?? track.votes ?? 0;
      const score: number =
        typeof track.stats?.wilsonScore === "number"
          ? Math.round(track.stats.wilsonScore)
          : typeof track.score === "number"
          ? track.score
          : 0;

      const trendScore =
        typeof track.stats?.trendScore === "number"
          ? track.stats.trendScore
          : 0;
      const trend: ChartTrack["trend"] = trendScore > 0.05 ? "up" : trendScore < -0.05 ? "down" : "same";

      const movement: number =
        typeof track.movement === "number"
          ? track.movement
          : Math.max(1, 5 - index);

      const duration: string = track.duration ?? "--:--";
      const isViral: boolean =
        typeof track.isViral === "boolean"
          ? track.isViral
          : trend === "up" && score >= 70;
      
      // Handle streak from both structures:
      // - Historical snapshots: track.streak (string like "5 days")
      // - Live leaderboards: track.streak (if exists)
      const streak: string = track.streak ?? "—";
      
      // Handle peak from both structures:
      // - Historical snapshots: track.peak
      // - Live leaderboards: track.peak (if exists)
      const peak: number =
        typeof track.peak === "number" ? track.peak : index + 1;

      const velocity: string | null =
        typeof track.velocity === "string"
          ? track.velocity
          : trend === "up"
          ? "+10%"
          : trend === "down"
          ? "-5%"
          : "0%";

      const uploaderUsername: string = track.uploaderUsername ?? "unknown-user";

      const externalUrl: string | null = track.meta?.externalId ?? track.metadata?.externalId ?? null;

      const encodedUsername = encodeURIComponent(uploaderUsername);
      // Use slug if available, otherwise generate from title
      const titleSlug = track.slug || trackNameToSlug(title);
      const trackUrl = `/track/${encodedUsername}/${titleSlug}`;

      const rank = typeof track.rank === "number" && track.rank > 0
        ? track.rank
        : index + 1;

      const mapped: ChartTrack = {
        id: trackId ?? `${trackGenre}-${index + 1}`,
        rank,
        title,
        artist,
        genre: trackGenre,
        cover,
        score,
        votes,
        trend,
        movement,
        duration,
        isViral,
        streak,
        peak,
        velocity,
        uploaderUsername,
        externalUrl,
        trackUrl,
      };
      return mapped;
    });
  }, [rawTracks, genre, coverMap]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-purple-500/30">
      <main className="pt pb-20">
        <GenreChartHeader
          genre={genre}
          timeframe={timeframe}
          trackCount={tracks.length}
        />

        <GenreChartControls
          timeframe={timeframe}
          selectedDate={selectedDate}
          onSelectedDateChange={setSelectedDate}
          onTimeframeChange={handleTimeframeChange}
          canGoForward={canGoForward}
          periodLabel={periodLabel}
          loading={loading}
          error={!!error}
          onPrevPeriod={() => shiftPeriod("prev")}
          onNextPeriod={() => shiftPeriod("next")}
        />

        <GenreChartTable tracks={tracks} loading={loading} error={!!error} />
      </main>
    </div>
  );
}


