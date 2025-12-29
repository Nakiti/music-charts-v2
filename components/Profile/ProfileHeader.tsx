import React, { useState } from "react";
import {
  Upload,
  MapPin,
  Calendar,
  Link as LinkIcon,
  Twitter,
  Instagram,
  CheckCircle2,
  MoreHorizontal,
  Pencil,
  Check,
  X,
} from "lucide-react";
import { useUserActions } from "@/hooks/useProfileActions";
import { useFollowing } from "@/hooks/useFollowing";
import { useUserStats } from "@/hooks/useUserStats";

const FALLBACK_AVATAR =
  "https://media.istockphoto.com/id/1147544807/vector/thumbnail-image-vector-graphic.jpg?s=612x612&w=0&k=20&c=rnCKVbdxqkjlcs3xH87-9gocETqpspHFXu5dIGB4wuM=";
const FALLBACK_BANNER =
  "https://media.istockphoto.com/id/1147544807/vector/thumbnail-image-vector-graphic.jpg?s=612x612&w=0&k=20&c=rnCKVbdxqkjlcs3xH87-9gocETqpspHFXu5dIGB4wuM=";

interface ProfileHeaderProps {
  profile: any;
  isOwnProfile: boolean;
  user: any | null;
  viewedUid: string | null;
  viewedProfileUsername?: string;
  viewedProfileAvatar?: string | null;
  twitter?: string | null;
  instagram?: string | null;
  website?: string | null;
  uploadsCount?: number;
}

const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  profile,
  isOwnProfile,
  user,
  viewedUid,
  viewedProfileUsername,
  viewedProfileAvatar,
  twitter,
  instagram,
  website,
  uploadsCount = 0,
}) => {
  const [activeTab] = useState<"uploads" | "collection" | "followers" | "following" | "stats">(
    "uploads"
  ); // local, not used here but kept to mirror original intent if needed later

  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioDraft, setBioDraft] = useState("");
  const [isEditingBanner, setIsEditingBanner] = useState(false);
  const [bannerDraft, setBannerDraft] = useState("");
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [locationDraft, setLocationDraft] = useState("");
  const [isEditingWebsite, setIsEditingWebsite] = useState(false);
  const [websiteDraft, setWebsiteDraft] = useState("");
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const [avatarDraft, setAvatarDraft] = useState("");
  const [isEditingTwitter, setIsEditingTwitter] = useState(false);
  const [twitterDraft, setTwitterDraft] = useState("");
  const [isEditingInstagram, setIsEditingInstagram] = useState(false);
  const [instagramDraft, setInstagramDraft] = useState("");

  const {
    updateProfile,
    uploadAvatar,
    uploadBanner,
    loading: updatingProfile,
  } = useUserActions();

  const {
    isFollowing,
    toggleFollow,
    loading: followingLoading,
  } = useFollowing(viewedUid, viewedProfileUsername, viewedProfileAvatar ?? null);

  const userStats = useUserStats(viewedUid, uploadsCount);

  const joinedText = profile?.joinedAt
    ? (profile.joinedAt.toDate
        ? profile.joinedAt.toDate().toLocaleDateString()
        : new Date(profile.joinedAt).toLocaleDateString())
    : "";

  return (
    <div className="relative">
      {/* Banner Image */}
      <div className="h-64 w-full overflow-hidden relative">
        <img
          src={profile.banner || FALLBACK_BANNER}
          alt="Banner"
          className="w-full h-full object-cover opacity-60"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-zinc-950" />
        {isOwnProfile && !isEditingBanner && (
          <button
            type="button"
            onClick={() => {
              setIsEditingBanner(true);
              setBannerDraft(profile.banner || "");
            }}
            className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-900/80 border border-white/20 text-xs text-zinc-100 hover:bg-zinc-800"
          >
            <Pencil className="w-3 h-3" />
            <span className="hidden sm:inline">Edit banner</span>
          </button>
        )}
        {isOwnProfile && isEditingBanner && (
          <div className="absolute top-4 right-4 bg-zinc-900/95 border border-white/10 rounded-xl p-3 shadow-xl w-80 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-zinc-400">
                Upload a new banner image or use a direct image URL. A
                placeholder is used when no banner is set.
              </p>
              <button
                type="button"
                onClick={() => {
                  setIsEditingBanner(false);
                  setBannerDraft("");
                }}
                className="p-1 rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 flex-shrink-0"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <label className="inline-flex items-center gap-2 px-2 py-1.5 rounded-md bg-zinc-800/80 border border-white/10 text-xs text-zinc-200 cursor-pointer hover:bg-zinc-800">
                <Upload className="w-3 h-3" />
                <span>Upload banner</span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    try {
                      await uploadBanner(file);
                      setIsEditingBanner(false);
                      setBannerDraft("");
                    } catch (err) {
                      console.error(err);
                    } finally {
                      e.target.value = "";
                    }
                  }}
                  disabled={updatingProfile}
                />
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={bannerDraft}
                  onChange={(e) => setBannerDraft(e.target.value)}
                  className="flex-1 bg-zinc-800 text-xs rounded-md px-2 py-1 border border-white/10 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="https://your-image-url.com/banner.jpg"
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await updateProfile({ banner: bannerDraft.trim() || "" });
                      setIsEditingBanner(false);
                    } catch (e) {
                      console.error(e);
                    }
                  }}
                  disabled={updatingProfile}
                  className="p-1.5 rounded-full bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative -mt-20">
        <div className="flex flex-col md:flex-row items-end gap-8">
          {/* Avatar */}
          <div className="relative group">
            <div className="w-40 h-40 rounded-full border-4 border-zinc-950 overflow-hidden bg-zinc-900 shadow-2xl">
              <img
                src={profile.avatar || FALLBACK_AVATAR}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
              {isOwnProfile && !isEditingAvatar && (
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingAvatar(true);
                    setAvatarDraft(profile.avatar || "");
                  }}
                  className="absolute bottom-2 left-2 bg-zinc-900/80 hover:bg-zinc-800 text-white p-1.5 rounded-full border border-white/20 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>
            {isOwnProfile && isEditingAvatar && (
              <div className="absolute -bottom-28 left-0 bg-zinc-900 border border-white/10 rounded-xl p-3 shadow-xl w-72 space-y-3">
                <div className="text-xs text-zinc-400">
                  Update your profile picture by uploading an image or using a
                  direct image URL.
                </div>
                <div className="flex flex-col gap-2">
                  <label className="inline-flex items-center gap-2 px-2 py-1.5 rounded-md bg-zinc-800/80 border border-white/10 text-xs text-zinc-200 cursor-pointer hover:bg-zinc-800">
                    <Upload className="w-3 h-3" />
                    <span>Upload image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          await uploadAvatar(file);
                          setIsEditingAvatar(false);
                          setAvatarDraft("");
                        } catch (err) {
                          console.error(err);
                        } finally {
                          e.target.value = "";
                        }
                      }}
                      disabled={updatingProfile}
                    />
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={avatarDraft}
                      onChange={(e) => setAvatarDraft(e.target.value)}
                      className="flex-1 bg-zinc-800 text-xs rounded-md px-2 py-1 border border-white/10 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      placeholder="https://your-image-url.com/avatar.jpg"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await updateProfile({ avatar: avatarDraft.trim() || "" });
                          setIsEditingAvatar(false);
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                      disabled={updatingProfile}
                      className="p-1.5 rounded-full bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingAvatar(false);
                        setAvatarDraft("");
                      }}
                      className="p-1.5 rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            )}
            {profile.isArtist && (
              <div
                className="absolute bottom-2 right-2 bg-gradient-to-br from-white to-sky-500 text-black p-1.5 rounded-full border-4 border-zinc-950 shadow-sm"
                title="Verified Artist"
              >
                <CheckCircle2 className="w-5 h-5" />
              </div>
            )}
          </div>

          {/* Info Block */}
          <div className="flex-1 mb-2">
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-2">
              <h1 className="text-4xl font-black tracking-tight text-white">
                {profile.username}
              </h1>
            </div>

            <div className="mb-4 max-w-2xl">
              {isEditingBio ? (
                <div className="flex flex-col gap-2">
                  <textarea
                    value={bioDraft}
                    onChange={(e) => setBioDraft(e.target.value)}
                    rows={3}
                    className="w-full bg-zinc-900/80 border border-white/10 rounded-xl px-3 py-2 text-sm text-zinc-100 resize-none focus:outline-none focus:ring-2 focus:ring-sky-500"
                    placeholder="Add a short bio about yourself"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await updateProfile({ bio: bioDraft.trim() });
                          setIsEditingBio(false);
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                      disabled={updatingProfile}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/20 text-green-400 text-xs font-semibold hover:bg-green-500/30 disabled:opacity-50"
                    >
                      <Check className="w-3 h-3" />
                      Save
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingBio(false);
                        setBioDraft("");
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-zinc-800 text-zinc-400 text-xs font-semibold hover:bg-zinc-700"
                    >
                      <X className="w-3 h-3" />
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <p className="text-zinc-400 font-medium flex-1">
                    {profile.bio ||
                      (isOwnProfile
                        ? "Add a short bio so people know who you are."
                        : "")}
                  </p>
                  {isOwnProfile && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingBio(true);
                        setBioDraft(profile.bio || "");
                      }}
                      className="mt-0.5 p-1.5 rounded-full bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-6 text-sm text-zinc-500 font-medium">
              {/* Location */}
              {isEditingLocation ? (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <input
                    type="text"
                    value={locationDraft}
                    onChange={(e) => setLocationDraft(e.target.value)}
                    className="bg-zinc-900/80 border-b border-white/20 px-1.5 py-0.5 text-xs text-zinc-100 focus:outline-none focus:border-sky-500"
                    placeholder="Add location"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await updateProfile({ location: locationDraft.trim() });
                        setIsEditingLocation(false);
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    disabled={updatingProfile}
                    className="p-1 rounded-full bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingLocation(false);
                      setLocationDraft("");
                    }}
                    className="p-1 rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  <span>
                    {profile.location ||
                      (isOwnProfile ? "Add location" : "")}
                  </span>
                  {isOwnProfile && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingLocation(true);
                        setLocationDraft(profile.location || "");
                      }}
                      className="ml-1 p-1 rounded-full bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </span>
              )}

              {/* Website */}
              {isEditingWebsite ? (
                <span className="flex items-center gap-1.5">
                  <LinkIcon className="w-4 h-4" />
                  <input
                    type="text"
                    value={websiteDraft}
                    onChange={(e) => setWebsiteDraft(e.target.value)}
                    className="bg-zinc-900/80 border-b border-white/20 px-1.5 py-0.5 text-xs text-zinc-100 focus:outline-none focus:border-sky-500"
                    placeholder="https://your-site.com"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await updateProfile({ website: websiteDraft.trim() });
                        setIsEditingWebsite(false);
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    disabled={updatingProfile}
                    className="p-1 rounded-full bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingWebsite(false);
                      setWebsiteDraft("");
                    }}
                    className="p-1 rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <LinkIcon className="w-4 h-4" />
                  {website ? (
                    <a
                      href={website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-transparent bg-clip-text bg-gradient-to-r from-white to-sky-400 hover:underline cursor-pointer"
                    >
                      {website}
                    </a>
                  ) : (
                    isOwnProfile && (
                      <span className="text-zinc-500">Add website</span>
                    )
                  )}
                  {isOwnProfile && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingWebsite(true);
                        setWebsiteDraft(website || "");
                      }}
                      className="ml-1 p-1 rounded-full bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  )}
                </span>
              )}

              {/* Joined date (non-editable) */}
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" /> Joined {joinedText}
              </span>
            </div>

            {/* Social link editors (owner only) */}
            {isOwnProfile && (
              <div className="mt-4  flex flex-col gap-2 text-xs text-zinc-500">
                {isEditingTwitter && (
                  <div className="flex items-center gap-2">
                    <Twitter className="w-4 h-4" />
                    <input
                      type="text"
                      value={twitterDraft}
                      onChange={(e) => setTwitterDraft(e.target.value)}
                      className="flex-1 bg-zinc-900/80 border-b border-white/20 px-1.5 py-0.5 text-xs text-zinc-100 focus:outline-none focus:border-sky-500"
                      placeholder="https://twitter.com/your-handle"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await updateProfile({ twitter: twitterDraft.trim() });
                          setIsEditingTwitter(false);
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                      disabled={updatingProfile}
                      className="p-1 rounded-full bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingTwitter(false);
                        setTwitterDraft("");
                      }}
                      className="p-1 rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {isEditingInstagram && (
                  <div className="flex items-center gap-2">
                    <Instagram className="w-4 h-4" />
                    <input
                      type="text"
                      value={instagramDraft}
                      onChange={(e) => setInstagramDraft(e.target.value)}
                      className="flex-1 bg-zinc-900/80 border-b border-white/20 px-1.5 py-0.5 text-xs text-zinc-100 focus:outline-none focus:border-sky-500"
                      placeholder="https://instagram.com/your-handle"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await updateProfile({
                            instagram: instagramDraft.trim(),
                          });
                          setIsEditingInstagram(false);
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                      disabled={updatingProfile}
                      className="p-1 rounded-full bg-green-500/20 text-green-400 hover:bg-green-500/30 disabled:opacity-50"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditingInstagram(false);
                        setInstagramDraft("");
                      }}
                      className="p-1 rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-3 mb-4 w-full md:w-auto mt-4">
              {!isOwnProfile && (
                <button
                  type="button"
                  disabled={followingLoading || !user}
                  onClick={() => {
                    if (!user) {
                      window.location.href = "/login";
                      return;
                    }
                    toggleFollow();
                  }}
                  className={`flex-1 md:flex-none px-6 py-1 rounded-full font-bold text-md hover:scale-105 transition-transform shadow-lg shadow-white/10 ${
                    isFollowing
                      ? "bg-zinc-900 text-white border border-white/20"
                      : "bg-white text-black"
                  }`}
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
              )}
              <div className="flex gap-2">
                {
                  <a
                    href={twitter || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-full bg-zinc-900 border border-white/10 hover:bg-white/10 hover:text-white text-zinc-400 transition-colors"
                  >
                    <Twitter className="w-5 h-5" />
                  </a>
                }
                {
                  <a
                    href={instagram || undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2.5 rounded-full bg-zinc-900 border border-white/10 hover:bg-white/10 hover:text-white text-zinc-400 transition-colors"
                  >
                    <Instagram className="w-5 h-5" />
                  </a>
                }
                {isOwnProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingTwitter(true);
                      setTwitterDraft(twitter || "");
                      setIsEditingInstagram(true);
                      setInstagramDraft(instagram || "");
                    }}
                    className="p-2.5 rounded-full bg-zinc-900 border border-white/10 hover:bg-white/10 hover:text-white text-zinc-400 transition-colors"
                  >
                    <Pencil className="w-5 h-5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-8 md:gap-16 mt-8 py-6 border-y border-white/5 overflow-x-auto">
          <div>
            <div className="text-2xl font-black text-white">
              {userStats.loading ? "..." : userStats.followers}
            </div>
            <div className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
              Followers
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white">
              {userStats.loading ? "..." : userStats.uploads}
            </div>
            <div className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
              Tracks
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white">
              {userStats.loading ? "..." : userStats.votesCast}
            </div>
            <div className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
              Votes Cast
            </div>
          </div>
          <div className="hidden md:block">
            <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-sky-400">
              {userStats.loading ? "..." : `${userStats.fireRate}%`}
            </div>
            <div className="text-xs uppercase tracking-widest text-zinc-500 font-bold">
              Fire Rate
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;


