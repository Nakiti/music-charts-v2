import React from "react";
import Link from "next/link";
import { useFollowingList } from "@/hooks/useFollowingList";

interface ProfileFollowingTabProps {
  viewedUid: string | null;
  isOwnProfile: boolean;
  username: string;
}

const ProfileFollowingTab: React.FC<ProfileFollowingTabProps> = ({
  viewedUid,
  isOwnProfile,
  username,
}) => {
  const { following, loading: followingListLoading} = useFollowingList(viewedUid);

  return (
    <div className="min-h-[160px]">
      {followingListLoading && (
        <div className="text-xs text-zinc-500">Loading following...</div>
      )}
      {!followingListLoading && following.length === 0 && (
        <div className="text-xs text-zinc-500">
          {isOwnProfile
            ? "You are not following anyone yet."
            : `${username} is not following anyone yet.`}
        </div>
      )}
      {following.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {following.map((f) => {
            const createdAtText =
              f.createdAt?.toDate && typeof f.createdAt.toDate === "function"
                ? f.createdAt.toDate().toLocaleDateString()
                : null;
            return (
              <Link
                key={f.id}
                href={`/u/${f.followedUsername}`}
                className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-900/70 hover:bg-zinc-800 border border-white/5 transition-colors"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0">
                  <img
                    src={
                      f.followedAvatar ||
                      "https://media.istockphoto.com/id/1147544807/vector/thumbnail-image-vector-graphic.jpg?s=612x612&w=0&k=20&c=rnCKVbdxqkjlcs3xH87-9gocETqpspHFXu5dIGB4wuM="
                    }
                    alt={f.followedUsername || "User avatar"}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-white truncate">
                    {f.followedUsername || "Unknown user"}
                  </div>
                  {createdAtText && (
                    <div className="text-[11px] text-zinc-500">
                      Following since {createdAtText}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProfileFollowingTab;


