import { useEffect, useState, useCallback } from "react";
import { useParams } from "react-router-dom";
import { UserPlus, UserCheck, Loader2 } from "lucide-react";
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
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl shadow-sm">
        <Loader2 size={32} className="animate-spin text-amber-500 mb-2" />
        <p className="text-sm font-medium text-slate-500">Loading profile details...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl shadow-sm text-red-500">
        Profile not found. Please check username or create one.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Profile Header Card */}
      <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-slate-100">
        <div className="h-36 bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400"></div>
        <div className="px-6 pb-6">
          <div className="flex justify-between items-end -mt-16 mb-4">
            <div className="w-28 h-28 rounded-full border-4 border-white bg-white overflow-hidden shadow-md flex items-center justify-center">
              <img
                src={
                  profile.avatar_url && profile.avatar_url !== "null"
                    ? profile.avatar_url
                    : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                        profile.full_name || profile.username || "user"
                      )}&background=random`
                }
                alt={profile.username}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    profile.full_name || profile.username || "user"
                  )}&background=random`;
                }}
              />
            </div>

            {/* Follow Button for Other Profiles */}
            {!isOwnProfile && (
              <button
                onClick={handleToggleFollow}
                disabled={followActionLoading}
                className="rounded-xl bg-blue-600 px-6 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 text-sm transition"
              >
                {followActionLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : isFollowing ? (
                  <>
                    <UserCheck size={16} />
                    Following
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    Follow
                  </>
                )}
              </button>
            )}
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-slate-900">
              {profile.full_name || profile.username}
            </h2>
            <p className="text-slate-500 text-sm font-medium">@{profile.username}</p>
            {profile.bio && <p className="pt-2 text-slate-700 leading-relaxed text-sm">{profile.bio}</p>}

            <div className="pt-3 flex flex-wrap gap-6 text-xs text-slate-600 font-medium">
              {profile.location && <span>📍 {profile.location}</span>}
              {profile.website && (
                <span>
                  🔗{" "}
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
                    {profile.website}
                  </a>
                </span>
              )}
            </div>

            {/* Interactive Stats Block */}
            <div className="pt-6 flex gap-8 border-t border-slate-100 mt-6">
              <div className="text-center cursor-default">
                <span className="block font-bold text-lg text-slate-800">
                  {profile.posts_count || posts.length}
                </span>
                <span className="text-xs text-slate-500 font-semibold">Posts</span>
              </div>

              {/* Followers Counter -> Clickable Modal */}
              <div
                onClick={() => openFollowModal("Followers")}
                className="text-center cursor-pointer group hover:opacity-80 transition"
              >
                <span className="block font-bold text-lg text-slate-800 group-hover:text-amber-600 transition">
                  {followersList.length}
                </span>
                <span className="text-xs text-slate-500 font-semibold group-hover:text-amber-600 transition">
                  Followers
                </span>
              </div>

              {/* Following Counter -> Clickable Modal */}
              <div
                onClick={() => openFollowModal("Following")}
                className="text-center cursor-pointer group hover:opacity-80 transition"
              >
                <span className="block font-bold text-lg text-slate-800 group-hover:text-amber-600 transition">
                  {followingList.length}
                </span>
                <span className="text-xs text-slate-500 font-semibold group-hover:text-amber-600 transition">
                  Following
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Posts Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-slate-800 px-2">Posts ({posts.length})</h3>
        {posts.length > 0 ? (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <div className="text-slate-400 text-center py-10 bg-white rounded-3xl shadow-sm text-sm">
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
