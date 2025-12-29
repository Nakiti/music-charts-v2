import React, { useEffect, useState } from "react";
import { Play, MoreHorizontal } from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { fbFunctions } from "@/lib/firebase";
import { useRouter } from "next/navigation";

interface ProfileUploadsTabProps {
  uploads: any[] | undefined;
}

const ProfileUploadsTab: React.FC<ProfileUploadsTabProps> = ({ uploads }) => {
  const [coverMap, setCoverMap] = useState<Record<string, string>>({});
  const router = useRouter()

  const formatFirestoreDate = (date: any) => {
    if (!date) return '';
  
    if (typeof date.toDate === 'function') {
      return date.toDate().toLocaleDateString();
    }
  
    if (date.seconds) {
      return new Date(date.seconds * 1000).toLocaleDateString();
    }
  
    return new Date(date).toLocaleDateString();
  };

  const getCoverForUpload = (track: any): string => {
    if (!track) {
      return "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&fit=crop&q=80";
    }

    const override =
      (track.id && coverMap[track.id as string]) || undefined;
    const meta = track.meta || {};

    const rawCover =
      override ||
      (typeof track.cover === "string" && track.cover.trim().length > 0
        ? track.cover
        : undefined) ||
      (typeof meta.cover === "string" && meta.cover.trim().length > 0
        ? meta.cover
        : undefined);

    return rawCover && rawCover.trim().length > 0
      ? rawCover
      : "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&fit=crop&q=80";
  };

  useEffect(() => {
    if (!Array.isArray(uploads) || uploads.length === 0) return;

    const scTracks = uploads.filter(
      (track: any) =>
        track?.meta?.provider === "SOUNDCLOUD" && track?.meta?.externalId
    );

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
        console.error("Failed to fetch SoundCloud covers for profile uploads", err);
      }
    };

    fetchCovers();
  }, [uploads]);

  if (!uploads || uploads.length === 0) {
    return (
      <div className="text-xs text-zinc-500">
        No uploads yet. Once you upload tracks, they will appear here.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-2">
      {uploads.map((track: any) => (
        <div
          key={track.id}
          className="group flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5 cursor-pointer"
          onClick={() => router.push(`/track/${track.uploaderUsername}/${track.slug}`)}
        >
          <div className="relative w-12 h-12 flex-shrink-0">
            <img
              src={getCoverForUpload(track)}
              className="w-full h-full rounded object-cover"
              alt=""
            />
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded">
              <Play className="w-5 h-5 fill-current text-white" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white truncate">{track.meta.title}</h3>
            <p className="text-xs text-zinc-500">
              Posted{" "}
              {formatFirestoreDate(track.createdAt)}
            </p>
          </div>

          <div className="hidden md:flex items-center gap-6 px-4">
            <div className="text-right">
              <div className="text-sm font-bold text-white">
                {track.stats?.totalVotes ?? 0}
              </div>
              <div className="text-[10px] text-zinc-500 uppercase">Plays</div>
            </div>
            <div className="text-right w-16">
              <div className="text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-white to-sky-400">
                {track.stats && track.stats.totalVotes > 0
                  ? `${Math.round(
                      (track.stats.votesFire / track.stats.totalVotes) * 100
                    )}%`
                  : "—"}
              </div>
              <div className="text-[10px] text-zinc-500 uppercase">Fire</div>
            </div>
          </div>

          <div className="opacity-0 group-hover:opacity-100 transition-opacity px-2">
            <button className="p-2 hover:bg-white/10 rounded-full text-zinc-400 hover:text-white">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProfileUploadsTab;


