"use client";

import React, { useState } from "react";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useUserProfile } from "@/hooks/useProfile";
import { useParams } from "next/navigation";
import ProfileHeader from "@/components/Profile/ProfileHeader";
import ProfileTabs from "@/components/Profile/ProfileTabs";
import ProfileSignIn from "@/components/Profile/ProfileSignIn";

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<
    "uploads" | "collection" | "followers" | "following" | "stats"
  >("uploads");

  const { username } = useParams<{ username: string }>();
  const { user, profile: currentUserProfile, loading: authLoading } = useCurrentUser();
  const {
    profile: viewedProfile,
    uploads,
    loading,
    error,
    userId: viewedUserId,
  } = useUserProfile(username);

  const viewedUid = viewedUserId ?? null;

  if (username === "null" || username === "undefined") {
    return <ProfileSignIn />
  }

  // Show sign in component if user is not logged in (after auth loading completes)
  if (!authLoading && !user) {
    return <ProfileSignIn />
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-purple-500/30">
        <div className="max-w-7xl mx-auto px-6 md:px-12 pt-24">
          <div className="flex items-center justify-center h-40 text-zinc-500 text-sm">
            Loading profile...
          </div>
        </div>
      </div>
    );
  }

  if (!loading && (error === "User not found." || !viewedProfile)) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-purple-500/30">
        <div className="max-w-7xl mx-auto px-6 md:px-12 pt-24">
          <div className="rounded-2xl border border-white/10 bg-zinc-900/60 px-6 py-10 text-center">
            <p className="text-xl font-semibold text-white mb-2">
              This user does not exist.
            </p>
            <p className="text-sm text-zinc-500">
              Double-check the username and try again.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isOwnProfile =
    !!(
      user &&
      currentUserProfile &&
      viewedProfile &&
      currentUserProfile.username === viewedProfile.username
    );

  const profileToShow = isOwnProfile && currentUserProfile ? currentUserProfile : viewedProfile;
  const website = profileToShow && ((profileToShow as any).website ||
    (profileToShow as any).socials?.website ||
    (profileToShow as any).links?.website);

  const twitter = profileToShow && ((profileToShow as any).twitter ||
      (profileToShow as any).socials?.twitter ||
      (profileToShow as any).links?.twitter);

  const instagram = profileToShow && ((profileToShow as any).instagram ||
      (profileToShow as any).socials?.instagram ||
      (profileToShow as any).links?.instagram);

  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-purple-500/30">
      {profileToShow && (
        <main className="pb-20">
          <ProfileHeader
            profile={profileToShow}
            isOwnProfile={isOwnProfile}
            user={user}
            viewedUid={viewedUid}
            viewedProfileUsername={viewedProfile?.username}
            viewedProfileAvatar={(viewedProfile as any)?.avatar ?? null}
            twitter={twitter}
            instagram={instagram}
            website={website}
            uploadsCount={uploads?.length || 0}
          />

          <ProfileTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            profile={profileToShow}
            username={username}
            isOwnProfile={isOwnProfile}
            uploads={uploads}
            viewedUid={viewedUid}
          />
        </main>
      )}
    </div>
  );
}
