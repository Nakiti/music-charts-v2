"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useDiscovery } from "@/hooks/useDiscovery";
import { useVoting } from "@/hooks/useVoting";
import { useParams } from "next/navigation";
import { useLiveActivity } from "@/hooks/useLiveActivity";
import SessionSidebar from "@/components/Discover/SessionSidebar";
import GenreArenaStage from "@/components/Discover/GenreArenaStage";
import LiveActivitySidebar from "@/components/Discover/LiveActivitySidebar";
import ArenaEmptyState from "@/components/Discover/ArenaEmptyState";

export default function GenreArenaPage() {
  const params = useParams<{ genre?: string }>();
  const genre = params?.genre || "hiphop";
  const { currentTrack, next, loading, markAsVoted } = useDiscovery(genre);
  const { castVote, isVoting } = useVoting();
  const { items: liveActivity } = useLiveActivity(genre);

  const [isPlaying, setIsPlaying] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [sessionHistory, setSessionHistory] = useState<any[]>([]);
  const [sessionLikes, setSessionLikes] = useState<any[]>([]);
  const [voteAnimation, setVoteAnimation] = useState<"fire" | "pass" | null>(null);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [widgetReady, setWidgetReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const widgetRef = useRef<any | null>(null);

  const togglePlay = useCallback(() => {
    const widget = widgetRef.current;

    if (!widget) {
      setIsPlaying((prev) => !prev);
      return;
    }

    if (isPlaying) {
      widget.pause();
      setIsPlaying(false);
    } else {
      widget.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const soundcloudUrl = currentTrack?.meta?.externalId as string | undefined;
  const dropTimeMs = (currentTrack?.meta?.dropTime ?? 15) * 1000;

  // Preload SoundCloud Widget API on mount to reduce first track load time
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const SC = (window as any).SC;
    
    if (!SC || !SC.Widget) {
      const script = document.createElement('script');
      script.src = 'https://w.soundcloud.com/player/api.js';
      script.async = true;
      document.body.appendChild(script);
      
      return () => {
        if (script.parentNode) {
          script.parentNode.removeChild(script);
        }
      };
    }
  }, []);

  const handleVote = useCallback(
    async (type: "FIRE" | "PASS") => {
      if (hasVoted || isVoting || !currentTrack) return;

      setVoteAnimation(type.toLowerCase() as "fire" | "pass");
      setHasVoted(true);

      const trackWithCover = {
        ...currentTrack,
        meta: {
          ...(currentTrack.meta || {}),
          cover: coverUrl || currentTrack.meta?.cover,
        },
      };

      setSessionHistory((prev) =>
        [{ ...trackWithCover, vote: type }, ...prev].slice(0, 5)
      );
      if (type === "FIRE") {
        setSessionLikes((prev) => [trackWithCover, ...prev].slice(0, 6));
      }

      try {
        await castVote(currentTrack.id, type, {
          trackTitle: currentTrack.meta?.title,
          trackArtist: currentTrack.meta?.artist,
          trackCover: currentTrack.meta?.cover,
          soundcloudUrl,
          genre,
        });
        
        markAsVoted(currentTrack.id);
        
        next();
      } catch (error) {
        console.error("Failed to cast vote", error);
      } finally {
        setTimeout(() => {
          setVoteAnimation(null);
          setHasVoted(false);
          setIsPlaying(true);
        }, 800);
      }
    },
    [castVote, currentTrack, hasVoted, isVoting, next, genre, markAsVoted, coverUrl, soundcloudUrl]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handleVote("PASS");
      if (e.key === "ArrowRight") handleVote("FIRE");
      if (e.key === " ") {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleVote, togglePlay]);

  // Fetch album art / track cover via SoundCloud oEmbed using the track URL
  useEffect(() => {
    let aborted = false;

    const fetchCover = async () => {
      if (!soundcloudUrl) {
        setCoverUrl(null);
        return;
      }

      try {
        const res = await fetch(
          `https://soundcloud.com/oembed?format=json&url=${encodeURIComponent(
            soundcloudUrl
          )}`
        );

        if (!res.ok) {
          console.error("Failed to fetch SoundCloud oEmbed data", res.status);
          return;
        }

        const data = await res.json();
        if (!aborted && data?.thumbnail_url) {
          setCoverUrl(data.thumbnail_url as string);
        }
      } catch (err) {
        if (!aborted) {
          console.error("Error fetching SoundCloud oEmbed data", err);
        }
      }
    };

    fetchCover();

    return () => {
      aborted = true;
    };
  }, [soundcloudUrl]);

  useEffect(() => {
    if (!soundcloudUrl || !iframeRef.current) return;

    setWidgetReady(false);
    let script: HTMLScriptElement | null = null;
    let widgetInstance: any = null;
    const SC = (window as any).SC;

    const initWidget = () => {
      if (!SC || !SC.Widget || !iframeRef.current) return;
      if (widgetRef.current) {
        try {
          widgetRef.current.unbind(SC.Widget.Events.READY);
        } catch (e) {
        }
      }

      widgetInstance = SC.Widget(iframeRef.current);
      widgetRef.current = widgetInstance;

      widgetInstance.bind(SC.Widget.Events.READY, () => {
        if (widgetRef.current) {
          widgetRef.current.seekTo(dropTimeMs);
          widgetRef.current.play();
          setIsPlaying(true);
          setWidgetReady(true);
        }
      });
    };

    if (typeof window === 'undefined') return;

    if (SC && SC.Widget) {
      initWidget();
    } else {
      script = document.createElement('script');
      script.src = 'https://w.soundcloud.com/player/api.js';
      script.onload = initWidget;
      document.body.appendChild(script);
    }

    return () => {
      if (widgetInstance && SC && SC.Widget) {
        try {
          widgetInstance.unbind(SC.Widget.Events.READY);
        } catch (e) {
        }
      }
      widgetRef.current = null;
      
      if (script && script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [soundcloudUrl, dropTimeMs]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <p className="text-zinc-500 text-sm uppercase tracking-[0.3em]">
          Loading {genre} Arena...
        </p>
      </div>
    );
  }

  if (!currentTrack) {
    return <ArenaEmptyState genre={genre} />;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans overflow-hidden selection:bg-purple-500/30">
      <main className="pt-0 h-screen grid grid-cols-1 md:grid-cols-12 gap-0 divide-y md:divide-y-0 md:divide-x divide-white/5">
        <SessionSidebar
          sessionHistory={sessionHistory}
          sessionLikes={sessionLikes}
        />

        <GenreArenaStage
          genre={genre}
          currentTrack={currentTrack}
          isPlaying={isPlaying}
          hasVoted={hasVoted}
          isVoting={isVoting}
          voteAnimation={voteAnimation}
          togglePlay={togglePlay}
          handleVote={handleVote}
          soundcloudUrl={soundcloudUrl}
          iframeRef={iframeRef}
          coverUrl={coverUrl}
          widgetReady={widgetReady}
        />

        <LiveActivitySidebar liveActivity={liveActivity} />
      </main>
    </div>
  );
}