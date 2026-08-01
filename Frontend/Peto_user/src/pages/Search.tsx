import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Search as SearchIcon, Users, FileText, CheckCircle2, UserPlus, UserCheck, X, Loader2, PawPrint } from "lucide-react";
import api from "../utils/api";
import Navbar from "../components/layout/Navbar";
import LeftSidebar from "../components/social/LeftSidebar";
import RightSidebar from "../components/social/RightSidebar";
import MobileBottomNav from "../components/social/MobileBottomNav";
import PostCard from "../components/social/PostCard";
import { useAuth } from "../context/AuthContext";

export interface UserSearchResult {
  id: string;
  username: string;
  full_name: string;
  avatar_url?: string;
  verified?: boolean;
  bio?: string;
  followersCount: number;
  isFollowing: boolean;
}

const SearchPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const queryParam = searchParams.get("q") || "";
  const [query, setQuery] = useState(queryParam);
  const [activeTab, setActiveTab] = useState<"all" | "users" | "posts">("all");
  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [followLoadingMap, setFollowLoadingMap] = useState<Record<string, boolean>>({});

  // Sync state with URL query param
  useEffect(() => {
    setQuery(queryParam);
  }, [queryParam]);

  // Execute Search API call
  const performSearch = useCallback(async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setUsers([]);
      setPosts([]);
      return;
    }

    setLoading(true);
    try {
      const [usersRes, postsRes] = await Promise.allSettled([
        api.get(`/users/search?q=${encodeURIComponent(searchTerm)}`),
        api.get(`/posts/search?q=${encodeURIComponent(searchTerm)}`),
      ]);

      if (usersRes.status === "fulfilled" && usersRes.value.data?.success) {
        setUsers(usersRes.value.data.data || []);
      } else {
        setUsers([]);
      }

      if (postsRes.status === "fulfilled" && postsRes.value.data?.success) {
        setPosts(postsRes.value.data.data || []);
      } else {
        setPosts([]);
      }
    } catch (err) {
      console.error("Search failed:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced search on input change
  useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        setSearchParams({ q: query }, { replace: true });
        performSearch(query);
      } else {
        setUsers([]);
        setPosts([]);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [query, setSearchParams, performSearch]);

  // Toggle follow/unfollow user
  const handleToggleFollow = async (userId: string, isFollowing: boolean, e: React.MouseEvent) => {
    e.stopPropagation();
    setFollowLoadingMap((prev) => ({ ...prev, [userId]: true }));

    // Optimistic UI update
    setUsers((prev) =>
      prev.map((u) =>
        u.id === userId
          ? {
              ...u,
              isFollowing: !isFollowing,
              followersCount: isFollowing ? u.followersCount - 1 : u.followersCount + 1,
            }
          : u
      )
    );

    try {
      if (isFollowing) {
        await api.delete(`/user/${userId}/follow`);
      } else {
        await api.post(`/user/${userId}/follow`);
      }
    } catch (err) {
      console.error("Follow action failed:", err);
      // Revert optimistic update
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, isFollowing } : u))
      );
    } finally {
      setFollowLoadingMap((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const handleUserClick = (userId: string) => {
    navigate(`/profile/${userId}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          {/* Left Sidebar */}
          <LeftSidebar />

          {/* Center Search Workspace */}
          <section className="space-y-6 lg:col-span-2">
            {/* Search Input Card */}
            <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
              <div className="relative flex items-center">
                <SearchIcon size={20} className="absolute left-4 text-slate-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search pet parents, @usernames, posts, topics..."
                  className="w-full rounded-2xl bg-slate-100 py-3.5 pl-12 pr-10 text-sm font-medium outline-none transition focus:bg-slate-50 focus:ring-2 focus:ring-amber-400/50"
                  autoFocus
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="absolute right-4 rounded-full p-1 text-slate-400 hover:bg-slate-200 transition"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="mt-4 flex items-center gap-2 border-b border-slate-100 pb-2">
                <button
                  onClick={() => setActiveTab("all")}
                  className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                    activeTab === "all"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <PawPrint size={14} />
                  All Results ({users.length + posts.length})
                </button>
                <button
                  onClick={() => setActiveTab("users")}
                  className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                    activeTab === "users"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Users size={14} />
                  People ({users.length})
                </button>
                <button
                  onClick={() => setActiveTab("posts")}
                  className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                    activeTab === "posts"
                      ? "bg-amber-500 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <FileText size={14} />
                  Posts ({posts.length})
                </button>
              </div>
            </div>

            {/* Results Section */}
            {loading ? (
              <div className="flex flex-col items-center justify-center rounded-3xl bg-white py-16 shadow-sm">
                <Loader2 size={32} className="animate-spin text-amber-500 mb-3" />
                <p className="text-sm font-medium text-slate-500">Searching Peto network...</p>
              </div>
            ) : !query.trim() ? (
              <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
                <SearchIcon size={40} className="mx-auto mb-3 text-amber-500/40" />
                <h3 className="text-base font-bold text-slate-800">Search Peto</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Type a username, name, or keywords above to discover pet owners, friends, and community posts.
                </p>
              </div>
            ) : users.length === 0 && posts.length === 0 ? (
              <div className="rounded-3xl bg-white p-12 text-center shadow-sm">
                <PawPrint size={40} className="mx-auto mb-3 text-slate-300" />
                <h3 className="text-base font-bold text-slate-800">No results found</h3>
                <p className="text-xs text-slate-400 mt-1">
                  We couldn't find anything matching "<span className="font-semibold">{query}</span>".
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Users Section */}
                {(activeTab === "all" || activeTab === "users") && users.length > 0 && (
                  <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Users size={16} className="text-amber-500" />
                        Pet Parents ({users.length})
                      </h3>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                      {users.map((u) => (
                        <div
                          key={u.id}
                          onClick={() => handleUserClick(u.id)}
                          className="group flex items-center justify-between rounded-2xl bg-slate-50 p-4 transition hover:bg-amber-50/60 hover:shadow-sm cursor-pointer border border-transparent hover:border-amber-200/50"
                        >
                          <div className="flex items-center gap-3.5 overflow-hidden">
                            {/* Avatar */}
                            <div className="relative shrink-0">
                              {u.avatar_url && u.avatar_url !== "null" ? (
                                <img
                                  src={u.avatar_url}
                                  alt={u.username}
                                  className="h-12 w-12 rounded-full object-cover border border-slate-200"
                                />
                              ) : (
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 text-amber-700 font-bold text-base">
                                  {u.username ? u.username[0].toUpperCase() : "U"}
                                </div>
                              )}
                            </div>

                            {/* User Info */}
                            <div className="truncate">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-sm text-slate-900 truncate group-hover:text-amber-600 transition">
                                  {u.full_name || u.username}
                                </span>
                                {u.verified && (
                                  <CheckCircle2 size={15} className="text-blue-500 shrink-0 fill-blue-50" />
                                )}
                              </div>
                              <p className="text-xs text-slate-500 font-medium truncate">@{u.username}</p>
                              {u.bio && (
                                <p className="text-xs text-slate-600 mt-0.5 truncate max-w-xs">{u.bio}</p>
                              )}
                              <span className="inline-block mt-1 text-[10px] font-semibold text-slate-400">
                                {u.followersCount} follower{u.followersCount !== 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>

                          {/* Action Button */}
                          {currentUser?.id !== u.id && (
                            <button
                              onClick={(e) => handleToggleFollow(u.id, u.isFollowing, e)}
                              disabled={followLoadingMap[u.id]}
                              className={`ml-3 shrink-0 flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition ${
                                u.isFollowing
                                  ? "bg-slate-200 text-slate-700 hover:bg-slate-300"
                                  : "bg-amber-500 text-white hover:bg-amber-600 shadow-sm"
                              }`}
                            >
                              {followLoadingMap[u.id] ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : u.isFollowing ? (
                                <>
                                  <UserCheck size={14} />
                                  Following
                                </>
                              ) : (
                                <>
                                  <UserPlus size={14} />
                                  Follow
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Posts Section */}
                {(activeTab === "all" || activeTab === "posts") && posts.length > 0 && (
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 px-2">
                      <FileText size={16} className="text-amber-500" />
                      Matching Posts ({posts.length})
                    </h3>
                    {posts.map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Right Sidebar */}
          <RightSidebar />
        </div>
      </main>

      <MobileBottomNav />
    </div>
  );
};

export default SearchPage;
