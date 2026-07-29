import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

import Navbar from "../components/layout/Navbar";
import LeftSidebar from "../components/social/LeftSidebar";
import RightSidebar from "../components/social/RightSidebar";
import SocialLayout from "../components/social/SocialLayout";
import MobileBottomNav from "../components/social/MobileBottomNav";
import FloatingChatButton from "../components/social/FloatingChatButton";
import PostCard from "../components/social/PostCard";

const ProfileCenter = ({ userId }: { userId?: string }) => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchId = userId || user?.id;

  useEffect(() => {
    if (!fetchId) return;
    
    const fetchProfile = async () => {
      try {
        const [profileRes, postsRes] = await Promise.all([
          api.get(`/users/${fetchId}`),
          api.get(`/posts/users/${fetchId}/posts`)
        ]);
        setProfile(profileRes.data.data);
        setPosts(postsRes.data.posts || []);
      } catch (error: any) {
        console.error("Failed to fetch profile", error);
        if (error.response?.status === 404 && (!userId || userId === user?.id)) {
          window.location.href = "/create-profile";
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [fetchId, userId, user?.id]);

  if (loading) return <div className="p-8 text-center">Loading profile...</div>;
  if (!profile) return <div className="p-8 text-center text-red-500">Profile not found. Please create one.</div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
        <div className="px-6 pb-6">
          <div className="flex justify-between items-end -mt-14 mb-4">
            <div className="w-28 h-28 rounded-full border-4 border-white bg-white overflow-hidden shadow-md flex items-center justify-center">
              <img 
                src={(profile.avatar_url && profile.avatar_url !== "null") ? profile.avatar_url : `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || profile.username || 'user')}&background=random`} 
                alt={profile.username}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name || profile.username || 'user')}&background=random`;
                }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-slate-900">{profile.full_name || profile.username}</h2>
            <p className="text-slate-500 text-sm">@{profile.username}</p>
            {profile.bio && <p className="pt-2 text-slate-700 leading-relaxed">{profile.bio}</p>}
            
            <div className="pt-4 flex flex-wrap gap-6 text-sm text-slate-600">
              {profile.location && <span>📍 {profile.location}</span>}
              {profile.website && (
                <span>
                  🔗{" "}
                  <a href={profile.website.startsWith("http") ? profile.website : `https://${profile.website}`} className="text-blue-600 hover:underline" target="_blank" rel="noreferrer">
                    {profile.website}
                  </a>
                </span>
              )}
            </div>
            
            <div className="pt-6 flex gap-8 border-t border-slate-100 mt-6">
              <div className="text-center">
                <span className="block font-bold text-lg text-slate-800">{profile.posts_count || posts.length}</span>
                <span className="text-xs text-slate-500 font-medium">Posts</span>
              </div>
              <div className="text-center">
                <span className="block font-bold text-lg text-slate-800">{profile.followers_count || 0}</span>
                <span className="text-xs text-slate-500 font-medium">Followers</span>
              </div>
              <div className="text-center">
                <span className="block font-bold text-lg text-slate-800">{profile.following_count || 0}</span>
                <span className="text-xs text-slate-500 font-medium">Following</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-xl font-bold px-2">Posts</h3>
        {posts.length > 0 ? (
          posts.map(post => <PostCard key={post.id} post={post} />)
        ) : (
          <p className="text-gray-500 text-center py-8 bg-white rounded-2xl shadow-sm">No posts yet.</p>
        )}
      </div>
    </div>
  );
};

const Profile = () => {
  const { id } = useParams<{ id: string }>();

  return (
    <main className="min-h-screen bg-slate-100">
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
