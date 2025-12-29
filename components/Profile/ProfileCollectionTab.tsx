import React, { useEffect, useState } from "react";
import { Play } from "lucide-react";
import { useLikes } from "@/hooks/useLikes";
import { httpsCallable } from "firebase/functions";
import { fbFunctions } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { trackNameToSlug } from "@/lib/slug";

interface ProfileCollectionTabProps {
  username: string;
}

const ProfileCollectionTab: React.FC<ProfileCollectionTabProps> = ({username}) => {
  const {
    likes,
    loading: likesLoading,
    hasMore: hasMoreLikes,
    loadMore,
  } = useLikes(username);
  const router = useRouter()

  const [coverMap, setCoverMap] = useState<Record<string, string>>({});

  const getCoverForLike = (like: any): string => {
    if (!like) {
      return "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&fit=crop&q=80";
    }

    const override =
      (like.id && coverMap[like.id as string]) || undefined;

    const rawCover =
      override ||
      (typeof like.trackCover === "string" && like.trackCover.trim().length > 0
        ? like.trackCover
        : undefined);

    return rawCover && rawCover.trim().length > 0
      ? rawCover
      : "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=100&fit=crop&q=80";
  };

  useEffect(() => {
    if (!Array.isArray(likes) || likes.length === 0) return;

    const withUrl = likes.filter(
      (like: any) => typeof like.soundcloudUrl === "string" && like.soundcloudUrl.length > 0
    );

    if (withUrl.length === 0) return;

    const idToUrl: Record<string, string> = {};
    const urls: string[] = [];

    withUrl.forEach((like: any) => {
      const likeId = like.id;
      const url = like.soundcloudUrl as string | undefined;

      if (!likeId || !url) return;
      if (idToUrl[likeId]) return;

      idToUrl[likeId] = url;
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

        withUrl.forEach((like: any) => {
          const likeId = like.id;
          const url = idToUrl[likeId];
          if (!likeId || !url) return;

          const imageUrl = (data as Record<string, string | null>)[url];
          if (imageUrl) {
            next[likeId] = imageUrl;
          }
        });

        if (Object.keys(next).length > 0) {
          setCoverMap((prev) => ({ ...prev, ...next }));
        }
      } catch (err) {
        console.error("Failed to fetch SoundCloud covers for profile collection", err);
      }
    };

    fetchCovers();
  }, [likes]);

  return (
    <div className="min-h-[160px]">
      {likesLoading && likes.length === 0 && (
        <div className="text-xs text-zinc-500">Loading collection...</div>
      )}
      {!likesLoading && likes.length === 0 && (
        <div className="text-xs text-zinc-500">
          No liked tracks yet. Start voting FIRE on tracks to fill your
          collection.
        </div>
      )}
      {likes.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {likes.map((like) => {
            const title = like.trackTitle || "Untitled Track";
            const artist = like.trackArtist || "Unknown Artist";
            const cover = getCoverForLike(like);

            return (
              <div
                key={like.id}
                className="group relative bg-zinc-900 rounded-xl overflow-hidden hover:bg-zinc-800 transition-all p-1 cursor-pointer"
                onClick={() => {
                  const slugPart = like.slug || trackNameToSlug(like.trackTitle || '');
                  router.push(`/track/${like.uploaderUsername}/${slugPart}`)
                }}
              >
                <div className="aspect-square rounded-lg overflow-hidden mb-3 relative shadow-lg">
                  <img
                    src={cover}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    alt={title}
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors flex items-end p-2 opacity-0 group-hover:opacity-100">
                    <div className="p-2 bg-gradient-to-br from-white to-sky-500 rounded-full text-black shadow-lg transform translate-y-2 group-hover:translate-y-0 transition-transform">
                      <Play className="w-4 h-4 fill-current" />
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-white truncate text-sm">
                    {title}
                  </h4>
                  <p className="text-xs text-zinc-500 truncate">{artist}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {hasMoreLikes && !likesLoading && (
        <div className="mt-4">
          <button
            type="button"
            onClick={loadMore}
            className="text-xs px-3 py-1.5 rounded-full bg-zinc-900 border border-white/10 text-zinc-300 hover:bg-zinc-800"
          >
            Load more
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileCollectionTab;


