import { useEffect, useState } from "react";
import api from "../utils/api";
import Navbar from "../components/layout/Navbar";
import LeftSidebar from "../components/social/LeftSidebar";
import RightSidebar from "../components/social/RightSidebar";
import SocialLayout from "../components/social/SocialLayout";
import MobileBottomNav from "../components/social/MobileBottomNav";
import FloatingChatButton from "../components/social/FloatingChatButton";
import PostCard from "../components/social/PostCard";

const BookmarksCenter = () => {
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBookmarks = async () => {
      try {
        const response = await api.get("/my/bookmarks");
        setPosts(response.data.bookmarks || response.data.data || response.data.posts || []);
      } catch (error) {
        console.error("Failed to fetch bookmarks", error);
      } finally {
        setLoading(false);
      }
    };
    fetchBookmarks();
  }, []);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-8">
        <h2 className="text-2xl font-bold">Your Bookmarks</h2>
        <p className="text-gray-500 mt-2">All your saved posts in one place.</p>
      </div>

      {loading ? (
        <div className="text-center py-10">Loading bookmarks...</div>
      ) : posts.length > 0 ? (
        posts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))
      ) : (
        <div className="text-center py-10 text-gray-500 bg-white rounded-2xl shadow-sm">
          No bookmarks yet.
        </div>
      )}
    </div>
  );
};

const Bookmarks = () => {
  return (
    <main className="min-h-screen bg-slate-100">
      <Navbar />

      <SocialLayout
        left={<LeftSidebar />}
        center={<BookmarksCenter />}
        right={<RightSidebar />}
      />

      <FloatingChatButton />
      <MobileBottomNav />
    </main>
  );
};

export default Bookmarks;
