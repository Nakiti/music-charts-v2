import React from "react";
import ProfileTabsNav from "./ProfileTabsNav";
import ProfileUploadsTab from "./ProfileUploadsTab";
import ProfileCollectionTab from "./ProfileCollectionTab";
import ProfileFollowersTab from "./ProfileFollowersTab";
import ProfileFollowingTab from "./ProfileFollowingTab";
import ProfileStatsTab from "./ProfileStatsTab";

type TabKey = "uploads" | "collection" | "followers" | "following" | "stats";

interface ProfileTabsProps {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
  profile: any;
  username: string;
  isOwnProfile: boolean;
  uploads: any[] | undefined;
  viewedUid: string | null;
}

const ProfileTabs: React.FC<ProfileTabsProps> = ({
  activeTab,
  setActiveTab,
  profile,
  username,
  isOwnProfile,
  uploads,
  viewedUid,
}) => {
  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 mt-8">
      <ProfileTabsNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* --- TAB CONTENT: UPLOADS --- */}
      {activeTab === "uploads" && (
        <ProfileUploadsTab uploads={uploads} />
      )}

      {/* --- TAB CONTENT: COLLECTION --- */}
      {activeTab === "collection" && (
        <ProfileCollectionTab username={username} />
      )}

      {/* --- TAB CONTENT: FOLLOWERS --- */}
      {activeTab === "followers" && (
        <ProfileFollowersTab
          viewedUid={viewedUid}
          isOwnProfile={isOwnProfile}
          username={profile.username}
        />
      )}

      {/* --- TAB CONTENT: FOLLOWING --- */}
      {activeTab === "following" && (
        <ProfileFollowingTab
          viewedUid={viewedUid}
          isOwnProfile={isOwnProfile}
          username={profile.username}
        />
      )}

      {/* --- TAB CONTENT: STATS --- */}
      {activeTab === "stats" && (
        <ProfileStatsTab viewedUid={viewedUid} uploads={uploads} />
      )}
    </div>
  );
};

export default ProfileTabs;


