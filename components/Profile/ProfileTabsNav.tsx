import React from "react";

type TabKey = "uploads" | "collection" | "followers" | "following" | "stats";

interface ProfileTabsNavProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
}

const ProfileTabsNav: React.FC<ProfileTabsNavProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <div className="flex gap-8 border-b border-white/10 mb-8">
      <button
        onClick={() => onTabChange("uploads")}
        className={`pb-4 text-sm font-bold uppercase tracking-widest border-b-2 transition-colors ${
          activeTab === "uploads"
            ? "text-white border-sky-500"
            : "text-zinc-500 border-transparent hover:text-zinc-300"
        }`}
      >
        Uploads
      </button>
      <button
        onClick={() => onTabChange("collection")}
        className={`pb-4 text-sm font-bold uppercase tracking-widest border-b-2 transition-colors ${
          activeTab === "collection"
            ? "text-white border-sky-500"
            : "text-zinc-500 border-transparent hover:text-zinc-300"
        }`}
      >
        Collection
      </button>
      <button
        onClick={() => onTabChange("followers")}
        className={`pb-4 text-sm font-bold uppercase tracking-widest border-b-2 transition-colors ${
          activeTab === "followers"
            ? "text-white border-sky-500"
            : "text-zinc-500 border-transparent hover:text-zinc-300"
        }`}
      >
        Followers
      </button>
      <button
        onClick={() => onTabChange("following")}
        className={`pb-4 text-sm font-bold uppercase tracking-widest border-b-2 transition-colors ${
          activeTab === "following"
            ? "text-white border-sky-500"
            : "text-zinc-500 border-transparent hover:text-zinc-300"
        }`}
      >
        Following
      </button>
      {/* <button
        onClick={() => onTabChange("stats")}
        className={`pb-4 text-sm font-bold uppercase tracking-widest border-b-2 transition-colors ${
          activeTab === "stats"
            ? "text-white border-sky-500"
            : "text-zinc-500 border-transparent hover:text-zinc-300"
        }`}
      >
        Stats
      </button> */}
    </div>
  );
};

export default ProfileTabsNav;


