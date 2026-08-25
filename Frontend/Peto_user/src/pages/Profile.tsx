import { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { UserPlus, UserCheck, Loader2, Edit3, MapPin, Link as LinkIcon } from "lucide-react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

import Navbar from "../components/layout/Navbar";
import LeftSidebar from "../components/social/LeftSidebar";
import RightSidebar from "../components/social/RightSidebar";
import SocialLayout from "../components/social/SocialLayout";
import MobileBottomNav from "../components/social/MobileBottomNav";
import FloatingChatButton from "../components/social/FloatingChatButton";
import PostCard from "../components/social/PostCard";
import FollowListModal, { type FollowUserItem } from "../components/social/FollowListModal";

const ProfileCenter = ({ userId }: { userId?: string }) => {
  const { user: currentUser, openAuthModal } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [followersList, setFollowersList] = useState<FollowUserItem[]>([]);
  const [followingList, setFollowingList] = useState<FollowUserItem[]>([]);
  const [isFollowing, setIsFollowing] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [followActionLoading, setFollowActionLoading] = useState(false);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<"Followers" | "Following">("Followers");

  const fetchId = userId || currentUser?.id;
  const isOwnProfile = !userId || userId === currentUser?.id;

  const fetchProfileData = useCallback(async () => {
    if (!fetchId) return;

    try {
      setLoading(true);
      const [profileRes, postsRes, followersRes, followingRes] = await Promise.allSettled([
        api.get(`/users/${fetchId}`),
        api.get(`/posts/users/${fetchId}/posts`),
        api.get(`/user/${fetchId}/followers`),
        api.get(`/user/${fetchId}/following`),
      ]);

      if (profileRes.status === "fulfilled" && profileRes.value.data?.data) {
        setProfile(profileRes.value.data.data);
      }

      if (postsRes.status === "fulfilled") {
        setPosts(postsRes.value.data?.posts || []);
      }

      if (followersRes.status === "fulfilled" && followersRes.value.data?.data) {
        const raw = followersRes.value.data.data;
        const formatted = raw.map((item: any) => item.follower || item);
        setFollowersList(formatted);
      }

      if (followingRes.status === "fulfilled" && followingRes.value.data?.data) {
        const raw = followingRes.value.data.data;
        const formatted = raw.map((item: any) => item.following || item);
        setFollowingList(formatted);
      }

      if (!isOwnProfile) {
        try {
          const statusRes = await api.get(`/user/${fetchId}/follow-status`);
          setIsFollowing(statusRes.data?.isFollowing || false);
        } catch {
          setIsFollowing(false);
        }
      }
    } catch (error: any) {
      console.error("Failed to fetch profile data:", error);
      if (error.response?.status === 404 && isOwnProfile) {
        window.location.href = "/create-profile";
      }
    } finally {
      setLoading(false);
    }
  }, [fetchId, isOwnProfile]);

  useEffect(() => {
    fetchProfileData();
  }, [fetchProfileData]);

  const handleToggleFollow = async () => {
    if (!currentUser) {
      openAuthModal("follow pet parents");
      return;
    }
    if (!fetchId || isOwnProfile) return;
    setFollowActionLoading(true);

    const nextState = !isFollowing;
    setIsFollowing(nextState);

    try {
      if (isFollowing) {
        await api.delete(`/user/${fetchId}/follow`);
      } else {
        await api.post(`/user/${fetchId}/follow`);
      }
      fetchProfileData();
    } catch (err) {
      console.error("Follow toggle error:", err);
      setIsFollowing(isFollowing);
    } finally {
      setFollowActionLoading(false);
    }
  };

  const openFollowModal = (type: "Followers" | "Following") => {
    setModalType(type);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white rounded-xl border border-slate-200/80 shadow-card">
        <Loader2 size={24} className="animate-spin text-slate-600 mb-2" />
        <p className="text-xs font-medium text-slate-500">Loading profile details...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6 text-center bg-white rounded-xl border border-slate-200/80 shadow-card text-rose-600 text-xs font-medium">
        Profile not found. Please check username or create one.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Profile Header Card */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-card overflow-hidden">
        <div className="h-32 sm:h-40 w-full bg-slate-100 relative overflow-hidden border-b border-slate-100">
          {profile.cover_url && profile.cover_url !== "null" ? (
            <img
              src={profile.cover_url}
              alt="Cover photo"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-linear-to-br from-slate-100 via-slate-50 to-slate-200/60 flex items-center justify-center">
              <div className="w-full h-full opacity-40 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]" />
            </div>
          )}
        </div>
        <div className="px-5 pb-5 relative z-10">
          <div className="flex justify-between items-end -mt-10 sm:-mt-12 mb-3">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl border-2 border-white bg-slate-100 overflow-hidden shadow-micro flex items-center justify-center shrink-0 relative z-20 font-bold text-slate-700 text-lg">
              <img
                src={
                  profile.avatar_url && profile.avatar_url !== "null"
                    ? profile.avatar_url
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        profile.full_name || profile.username || "user"
                      )}&background=f1f5f9&color=334155`
                }
                alt={profile.username}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    profile.full_name || profile.username || "user"
                  )}&background=f1f5f9&color=334155`;
                }}
              />
            </div>

            {/* Edit Profile Button for Own Profile or Follow Button for Other Profiles */}
            {isOwnProfile ? (
              <Link
                to="/edit-profile"
                className="rounded-lg border border-slate-200/80 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-micro flex items-center gap-1.5 active:scale-[0.98]"
              >
                <Edit3 size={14} className="text-slate-500" />
                <span>Edit Profile</span>
              </Link>
            ) : (
              <button
                onClick={handleToggleFollow}
                disabled={followActionLoading}
                className={`rounded-lg px-4 py-1.5 font-semibold text-xs transition flex items-center gap-1.5 shadow-micro ${
                  isFollowing
                    ? "bg-slate-100 text-slate-700 hover:bg-slate-200/70 border border-slate-200/60"
                    : "bg-slate-900 text-white hover:bg-slate-800 border border-slate-950/20 active:scale-[0.98]"
                }`}
              >
                {followActionLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : isFollowing ? (
                  <>
                    <UserCheck size={14} />
                    <span>Following</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={14} />
                    <span>Follow</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              {profile.full_name || profile.username}
            </h2>
            <p className="text-slate-500 text-xs font-mono">@{profile.username}</p>
            {profile.bio && <p className="pt-1.5 text-slate-600 leading-relaxed text-xs sm:text-sm">{profile.bio}</p>}

            <div className="pt-2 flex flex-wrap gap-4 text-xs text-slate-500 font-medium">
              {profile.location && (
                <span className="flex items-center gap-1">
                  <MapPin size={13} className="text-slate-400" />
                  <span>{profile.location}</span>
                </span>
              )}
              {profile.website && (
                <span className="flex items-center gap-1">
                  <LinkIcon size={13} className="text-slate-400" />
                  <a
                    href={
                      profile.website.startsWith("http")
                        ? profile.website
                        : `https://${profile.website}`
                    }
                    className="text-amber-600 hover:underline font-semibold"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {profile.website.replace(/^https?:\/\//, "")}
                  </a>
                </span>
              )}
            </div>

            {/* Interactive Stats Block */}
            <div className="pt-4 flex gap-6 border-t border-slate-100 mt-4">
              <div className="text-left cursor-default">
                <span className="block font-bold text-base text-slate-900">
                  {profile.posts_count || posts.length}
                </span>
                <span className="text-[11px] text-slate-500 font-medium">Posts</span>
              </div>

              {/* Followers Counter -> Clickable Modal */}
              <div
                onClick={() => openFollowModal("Followers")}
                className="text-left cursor-pointer group"
              >
                <span className="block font-bold text-base text-slate-900 group-hover:text-amber-600 transition-colors">
                  {followersList.length}
                </span>
                <span className="text-[11px] text-slate-500 font-medium group-hover:text-amber-600 transition-colors">
                  Followers
                </span>
              </div>

              {/* Following Counter -> Clickable Modal */}
              <div
                onClick={() => openFollowModal("Following")}
                className="text-left cursor-pointer group"
              >
                <span className="block font-bold text-base text-slate-900 group-hover:text-amber-600 transition-colors">
                  {followingList.length}
                </span>
                <span className="text-[11px] text-slate-500 font-medium group-hover:text-amber-600 transition-colors">
                  Following
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Posts Section */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-900 tracking-tight px-1">
          Posts ({posts.length})
        </h3>
        {posts.length > 0 ? (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <div className="text-slate-400 text-center py-8 bg-white rounded-xl border border-slate-200/80 shadow-card text-xs">
            No posts shared yet.
          </div>
        )}
      </div>

      {/* Followers / Following List Modal */}
      <FollowListModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalType}
        followers={followersList}
        following={followingList}
        onFollowStateChange={fetchProfileData}
      />
    </div>
  );
};

const Profile = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />

      <SocialLayout
        left={<LeftSidebar />}
        center={<ProfileCenter userId={id} />}
        right={<RightSidebar />}
      />

      <FloatingChatButton />
      <MobileBottomNav />
    </main>
  );
};

export default Profile;

