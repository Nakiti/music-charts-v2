"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { useTrack } from "@/hooks/useTrack";
import { useAuth } from "@/hooks/useAuth";
import { useVoting } from "@/hooks/useVoting";
import { collection, getDocs, getFirestore, limit, query, where } from "firebase/firestore";
import { useParams, useRouter } from "next/navigation";
import TrackHero from "@/components/Track/TrackHero";
import TrackMainSection from "@/components/Track/TrackMainSection";
import TrackStatsSidebar from "@/components/Track/TrackStatsSidebar";
import { slugToTrackName } from "@/lib/slug";

export default function SingleTrackPage() {
  const params = useParams()
  const router = useRouter();
  const username = (params.username as string) || '';
  const trackname = (params.trackname as string) || '';

  const [resolvedTrackId, setResolvedTrackId] = useState<string | null>(null);
  const [slugLoading, setSlugLoading] = useState(true);
  const [slugError, setSlugError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrackId = async () => {
      if (!username || !trackname) return;

      try {
        const db = getFirestore();
        const tracksRef = collection(db, "tracks");
        
        // Try to find track by slug (new method)
        let q = query(
          tracksRef,
          where("uploaderUsername", "==", username),
          where("slug", "==", trackname),
          limit(1)
        );
        let snap = await getDocs(q);

        // If slug query fails, fall back to title-based lookup (for backwards compatibility)
        if (snap.empty) {
          const decodedTrackName = slugToTrackName(trackname);
          
          q = query(
            tracksRef,
            where("uploaderUsername", "==", username),
            where("meta.title", "==", decodedTrackName),
            limit(1)
          );
          snap = await getDocs(q);

          // Final fallback: case-insensitive title match
          if (snap.empty) {
            const allUserTracksQuery = query(
              tracksRef,
              where("uploaderUsername", "==", username)
            );
            const allSnap = await getDocs(allUserTracksQuery);
            
            const matchingDoc = allSnap.docs.find(doc => {
              const title = doc.data()?.meta?.title || '';
              return title.toLowerCase().trim() === decodedTrackName.toLowerCase().trim();
            });

            if (matchingDoc) {
              setResolvedTrackId(matchingDoc.id);
              setSlugError(null);
            } else {
              setResolvedTrackId(null);
              setSlugError("Track not found.");
            }
          } else {
            setResolvedTrackId(snap.docs[0].id);
            setSlugError(null);
          }
        } else {
          setResolvedTrackId(snap.docs[0].id);
          setSlugError(null);
        }
      } catch (err) {
        console.error("Error resolving track from slug", err);
        setResolvedTrackId(null);
        setSlugError("Failed to load track.");
      } finally {
        setSlugLoading(false);
      }
    };

    fetchTrackId();
  }, [username, trackname]);

  const { track, loading: trackLoading, error: trackError } = useTrack(resolvedTrackId || "");
  const { user, loading: authLoading } = useAuth();
  const { castVote, isVoting } = useVoting();

  const [voted, setVoted] = useState(false);
  const isLoading = slugLoading || trackLoading || authLoading;
  const loadError = slugError || trackError;

  const handleVote = async (type: "FIRE" | "PASS") => {
    if (!user || isVoting || voted || !resolvedTrackId || !track) return;

    try {
      await castVote(resolvedTrackId, type, {
        trackTitle: track.meta?.title,
        genre: track.meta?.genre,
        trackArtist: track.meta?.artist,
        trackCover: (track as any).cover || track.meta?.cover,
        soundcloudUrl: track.meta?.externalId,
      });
      setVoted(true);
      
      const genre = track.meta?.genre || 'global';
      setTimeout(() => {
        router.push(`/discover/${genre}`);
      }, 500); 
    } catch (e) {
      console.error("Voting error:", e);
      alert("Failed to record vote. You may have already voted.");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center pt-20">
        <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
      </div>
    );
  }

  if (loadError || !track) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center flex-col pt-20">
        <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
        <h1 className="text-3xl text-white font-bold">Track Not Found (404)</h1>
        <p className="text-zinc-400 mt-2">
          The track "{trackname}" by {username} does not exist.
        </p>
        <Link
          href="/discover"
          className="mt-6 text-purple-400 hover:underline flex items-center gap-2"
        >
          Go to Arena <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  const embedSrc =
    track.meta?.provider === "SOUNDCLOUD" && track.meta?.externalId
      ? `https://w.soundcloud.com/player/?url=${encodeURIComponent(
          track.meta.externalId
        )}&color=%23ff5500&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=true&visual=true#t=${track.meta.dropTime || 0}`
      : "";

  const fireScore = (track.stats.wilsonScore || 0).toFixed(1);
  const isOwner = user?.uid === track.uploaderId;

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-purple-500/30">
      <main className="pb-20">
        <TrackHero
          genre={track.meta?.genre}
          title={track.meta?.title}
          artist={track.meta?.artist}
          username={username}
          coverUrl={track.meta?.cover}
          metadata={(track as any).metadata}
        />

        <div className="max-w-7xl mx-auto px-6 md:px-12 mt-[-40px] relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
          <TrackMainSection
            embedSrc={embedSrc}
            user={user}
            voted={voted}
            isVoting={isVoting}
            isOwner={isOwner}
            onVoteFire={() => handleVote("FIRE")}
            resolvedTrackId={resolvedTrackId}
            username={username}
            genre={track.meta?.genre}
            createdAt={(track as any).createdAt}
            chart={(track as any).chart}
            displayStats={(track as any).displayStats}
            trackTitle={track.meta?.title}
            trackSlug={track.slug}
            trackCover={
              (track as any).metadata?.cover || 
              (track as any).cover || 
              track.meta?.cover || 
              'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&fit=crop'
            }
          />

          <TrackStatsSidebar
            fireScore={fireScore}
            totalVotes={track.stats.totalVotes}
            trendScore={track.stats.trendScore}
            votesFire={track.stats.votesFire || 0}
            votesPass={track.stats.votesPass || 0}
            peak={(track as any).peak}
            streak={(track as any).streak}
            movement={(track as any).movement}
            velocity={(track as any).velocity}
            createdAt={(track as any).createdAt}
            displayStats={(track as any).displayStats}
            genre={track.meta?.genre}
          />
        </div>
      </main>
    </div>
  );
}