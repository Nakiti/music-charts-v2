import React from "react";
import Link from "next/link";
import { useFollowersList } from "@/hooks/useFollowersList";

interface ProfileFollowersTabProps {
  viewedUid: string | null;
  isOwnProfile: boolean;
  username: string;
}

const ProfileFollowersTab: React.FC<ProfileFollowersTabProps> = ({
  viewedUid,
  isOwnProfile,
  username,
}) => {
  const { followers, loading: followersListLoading } = useFollowersList(viewedUid);

  return (
    <div className="min-h-[160px]">
      {followersListLoading && (
        <div className="text-xs text-zinc-500">Loading followers...</div>
      )}
      {!followersListLoading && followers.length === 0 && (
        <div className="text-xs text-zinc-500">
          {isOwnProfile
            ? "You don't have any followers yet."
            : `${username} doesn't have any followers yet.`}
        </div>
      )}
      {followers.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {followers.map((f) => {
            const createdAtText =
              f.createdAt?.toDate && typeof f.createdAt.toDate === "function"
                ? f.createdAt.toDate().toLocaleDateString()
                : null;
            return (
              <Link
                key={f.id}
                href={`/u/${f.followerUsername}`}
                className="flex items-center gap-3 p-3 rounded-2xl bg-zinc-900/70 hover:bg-zinc-800 border border-white/5 transition-colors"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden bg-zinc-800 flex-shrink-0">
                  <img
                    src={
                      f.followerAvatar ||
                      "https://media.istockphoto.com/id/1147544807/vector/thumbnail-image-vector-graphic.jpg?s=612x612&w=0&k=20&c=rnCKVbdxqkjlcs3xH87-9gocETqpspHFXu5dIGB4wuM="
                    }
                    alt={f.followerUsername || "User avatar"}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-white truncate">
                    {f.followerUsername || "Unknown user"}
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

export default ProfileFollowersTab;


