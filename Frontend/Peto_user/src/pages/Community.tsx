import { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Flame,
  Clock,
  Sparkles,
  Users,
  Compass,
  Loader2,
  RefreshCw,
} from "lucide-react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/layout/Navbar";
import MobileBottomNav from "../components/social/MobileBottomNav";
import CommunityCard from "../components/community/CommunityCard";
import CommunitySidebar from "../components/community/CommunitySidebar";
import CreateCommunityModal from "../components/community/CreateCommunityModal";

const TABS = [
  { id: "for_you", label: "For You", icon: Sparkles },
  { id: "popular", label: "Popular", icon: Flame },
  { id: "new", label: "New", icon: Clock },
  { id: "joined", label: "Joined", icon: Users },
];

const Community = () => {
  const { user, openAuthModal } = useAuth();

  const [activeTab, setActiveTab] = useState<string>("for_you");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  const [communities, setCommunities] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch communities when tab, category, or debounced search changes
  useEffect(() => {
    fetchCommunities(1, true);
  }, [activeTab, selectedCategory, debouncedSearch, user]);

  const fetchCommunities = async (targetPage: number = 1, reset: boolean = false) => {
    try {
      setLoading(true);

      let sortParam = "popular";
      if (activeTab === "new") sortParam = "new";
      if (activeTab === "joined") sortParam = "joined";
      if (activeTab === "for_you") sortParam = "popular";

      const params: any = {
        page: targetPage,
        limit: 12,
        sort: sortParam,
      };

      if (selectedCategory && selectedCategory.toLowerCase() !== "all") {
        params.category = selectedCategory;
      }

      if (debouncedSearch.trim()) {
        params.search = debouncedSearch.trim();
      }

      // If "For You" tab and user logged in without search, we can use suggestions or query
      let res;
      if (activeTab === "for_you" && user && !debouncedSearch && selectedCategory === "All") {
        res = await api.get("/communities?sort=popular&limit=12");
      } else {
        res = await api.get("/communities", { params });
      }

      if (res.data?.success) {
        const commData = res.data.data?.communities || [];
        const pagination = res.data.data?.pagination || {};

        if (reset || targetPage === 1) {
          setCommunities(commData);
        } else {
          setCommunities((prev) => [...prev, ...commData]);
        }

        setHasMore(targetPage < (pagination.totalPages || 1));
      }
    } catch (err) {
      console.error("Error loading communities:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchCommunities(nextPage, false);
    }
  };

  const handleTabChange = (tabId: string) => {
    if (tabId === "joined" && !user) {
      openAuthModal("see the communities you have joined");
      return;
    }
    setActiveTab(tabId);
    setPage(1);
  };

  const handleCategorySelect = (category: string) => {
    setSelectedCategory(category);
    setPage(1);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 md:pb-10 font-sans">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Top Header & Search Bar Banner */}
        <div className="relative mb-8 overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 p-6 sm:p-10 text-white shadow-md">
          <div className="absolute -right-10 -bottom-10 h-48 w-48 rounded-full bg-white/10 blur-2xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3.5 py-1 text-xs font-bold backdrop-blur-md">
              <Compass size={14} className="text-amber-200" />
              <span>Explore Pet Communities</span>
            </div>

            <h1 className="font-headline text-2xl sm:text-4xl font-extrabold tracking-tight">
              Connect with Passionate Pet Communities
            </h1>

            <p className="text-xs sm:text-sm text-amber-100/90 leading-relaxed max-w-xl">
              Join discussion groups, share heartwarming moments, exchange care tips, and build lasting friendships with pet parents worldwide.
            </p>

            {/* Search and Action Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="Search communities by name, topic, or breed..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-2xl bg-white pl-11 pr-4 py-3 text-xs sm:text-sm text-slate-900 placeholder-slate-400 shadow-sm outline-none border-2 border-transparent focus:border-amber-300 focus:ring-4 focus:ring-amber-200/50 transition"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!user) {
                    openAuthModal("create your own pet community");
                    return;
                  }
                  setIsCreateModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-slate-800 transition cursor-pointer shrink-0"
              >
                <Plus size={18} />
                <span>Create Community</span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Layout: 2 Columns on Desktop */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Feed Column (3 cols) */}
          <div className="lg:col-span-3 space-y-6">
            {/* Tabs Navigation */}
            <div className="flex items-center justify-between border-b border-slate-200/80 bg-white rounded-2xl p-1.5 shadow-xs overflow-x-auto no-scrollbar">
              <div className="flex items-center gap-1">
                {TABS.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => handleTabChange(tab.id)}
                      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                        isActive
                          ? "bg-amber-500 text-white shadow-xs"
                          : "text-slate-600 hover:bg-amber-50 hover:text-amber-700"
                      }`}
                    >
                      <Icon size={15} />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>

              {selectedCategory !== "All" && (
                <div className="hidden sm:flex items-center gap-2 pr-2">
                  <span className="text-xs text-slate-400">Category:</span>
                  <span className="rounded-lg bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                    {selectedCategory}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory("All")}
                    className="text-xs text-slate-400 hover:text-rose-500"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Communities Grid */}
            {loading && communities.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div
                    key={n}
                    className="h-64 rounded-3xl border border-slate-100 bg-white p-4 shadow-xs animate-pulse space-y-4"
                  >
                    <div className="h-28 w-full rounded-2xl bg-slate-100" />
                    <div className="h-4 w-3/4 rounded bg-slate-100" />
                    <div className="h-3 w-1/2 rounded bg-slate-100" />
                  </div>
                ))}
              </div>
            ) : communities.length > 0 ? (
              <div className="space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                  {communities.map((community) => (
                    <CommunityCard
                      key={community.id}
                      community={community}
                      onJoinChange={(id: string, status: string) => {
                        setCommunities((prev) =>
                          prev.map((c) =>
                            c.id === id
                              ? {
                                  ...c,
                                  viewer: {
                                    ...c.viewer,
                                    is_member: status === "active",
                                    status: status === "left" ? null : (status as any),
                                  },
                                }
                              : c
                          )
                        );
                      }}
                    />
                  ))}
                </div>

                {/* Load More Button */}
                {hasMore && (
                  <div className="flex justify-center pt-4">
                    <button
                      type="button"
                      disabled={loading}
                      onClick={handleLoadMore}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 hover:border-slate-300 transition cursor-pointer"
                    >
                      {loading ? (
                        <Loader2 size={16} className="animate-spin text-amber-500" />
                      ) : (
                        <RefreshCw size={16} />
                      )}
                      <span>Load More Communities</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Useful Empty States */
              <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-100 bg-white p-12 text-center shadow-xs space-y-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-100 text-amber-700">
                  <Compass size={28} />
                </div>
                <div className="max-w-md space-y-1">
                  <h3 className="font-headline text-lg font-bold text-slate-900">
                    {debouncedSearch
                      ? `No communities matching "${debouncedSearch}"`
                      : activeTab === "joined"
                      ? "You haven't joined any communities yet."
                      : "No communities found in this category."}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {debouncedSearch
                      ? "Try searching with different keywords or create a new community for this topic!"
                      : activeTab === "joined"
                      ? "Explore trending groups or find companions tailored to your pet breed."
                      : "Be the leader! Create the very first community for this category."}
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  {(debouncedSearch || selectedCategory !== "All") && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCategory("All");
                      }}
                      className="rounded-2xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) {
                        openAuthModal("create a community");
                        return;
                      }
                      setIsCreateModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-2xl bg-amber-500 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-amber-600 transition cursor-pointer"
                  >
                    <Plus size={16} />
                    <span>Create Community</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Desktop Right Sidebar (1 col) */}
          <div className="hidden lg:block lg:col-span-1">
            <div className="sticky top-20">
              <CommunitySidebar
                activeCategory={selectedCategory}
                onSelectCategory={handleCategorySelect}
                onCreateClick={() => setIsCreateModalOpen(true)}
              />
            </div>
          </div>
        </div>
      </main>

      <MobileBottomNav />

      {/* Create Community Wizard Modal */}
      <CreateCommunityModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          fetchCommunities(1, true);
        }}
      />
    </div>
  );
};

export default Community;