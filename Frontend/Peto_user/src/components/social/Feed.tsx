import { useEffect, useState, useRef, useCallback } from "react";
import api from "../../utils/api";
import CreatePost from "./CreatePost";
import PostCard from "./PostCard";
import OnlineFriends from "./OnlineFriends";
import SuggestedFriends from "./SuggestedFriends";
import { Loader2, CheckCircle2, RefreshCw } from "lucide-react";

const POSTS_PER_PAGE = 7;

const PostSkeleton = () => (
    <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100/80 animate-pulse space-y-4">
        <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-slate-200" />
            <div className="space-y-2 flex-1">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-3 bg-slate-100 rounded w-1/5" />
            </div>
        </div>
        <div className="space-y-2 pt-2">
            <div className="h-4 bg-slate-100 rounded w-full" />
            <div className="h-4 bg-slate-100 rounded w-4/5" />
        </div>
        <div className="h-56 bg-slate-100 rounded-2xl w-full" />
    </div>
);

const Feed = () => {
    const [posts, setPosts] = useState<any[]>([]);
    const [page, setPage] = useState<number>(1);
    const [loading, setLoading] = useState<boolean>(true);
    const [loadingMore, setLoadingMore] = useState<boolean>(false);
    const [hasMore, setHasMore] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);

    const observerTarget = useRef<HTMLDivElement | null>(null);

    const fetchFeedPosts = useCallback(async (pageNum: number, isRefresh: boolean = false) => {
        try {
            if (isRefresh) {
                setRefreshing(true);
            } else if (pageNum > 1) {
                setLoadingMore(true);
            } else {
                setLoading(true);
            }

            const response = await api.get(`/posts/feed?page=${pageNum}&limit=${POSTS_PER_PAGE}`);
            const fetchedPosts: any[] = response.data?.posts || [];
            const pagination = response.data?.pagination;

            if (isRefresh || pageNum === 1) {
                setPosts(fetchedPosts);
            } else {
                setPosts((prev) => {
                    const existingIds = new Set(prev.map((p) => p.id));
                    const newUnique = fetchedPosts.filter((p) => !existingIds.has(p.id));
                    return [...prev, ...newUnique];
                });
            }

            setPage(pageNum);

            // Determine if more posts are available
            if (fetchedPosts.length < POSTS_PER_PAGE) {
                setHasMore(false);
            } else if (pagination?.totalPages && pageNum >= pagination.totalPages) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }
        } catch (error) {
            console.error("Error fetching feed:", error);
        } finally {
            setLoading(false);
            setLoadingMore(false);
            setRefreshing(false);
        }
    }, []);

    // Initial load of first 7 posts
    useEffect(() => {
        fetchFeedPosts(1, false);
    }, [fetchFeedPosts]);

    // IntersectionObserver for Instagram-like infinite scrolling
    useEffect(() => {
        if (loading || loadingMore || !hasMore) return;

        const target = observerTarget.current;
        if (!target) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
                    fetchFeedPosts(page + 1, false);
                }
            },
            {
                rootMargin: "300px",
                threshold: 0.1,
            }
        );

        observer.observe(target);

        return () => {
            observer.unobserve(target);
        };
    }, [page, hasMore, loading, loadingMore, fetchFeedPosts]);

    const handlePostCreated = () => {
        // Reset to page 1 to load the newly created post at the top
        fetchFeedPosts(1, true);
    };

    return (
        <section className="space-y-6">
            <CreatePost onPostCreated={handlePostCreated} />

            {/* Mobile Online Friends */}
            <div className="lg:hidden">
                <OnlineFriends />
            </div>

            {/* Initial Loading Skeleton */}
            {loading && posts.length === 0 ? (
                <div className="space-y-6">
                    <PostSkeleton />
                    <PostSkeleton />
                </div>
            ) : posts.length > 0 ? (
                <div className="space-y-6">
                    {posts.map((post, index) => (
                        <div key={post.id} className="space-y-6">
                            <PostCard post={post} />

                            {/* Insert Suggested Friends on mobile after post 2 or at the end if fewer posts */}
                            {(index === 1 || (posts.length < 2 && index === posts.length - 1)) && (
                                <div className="lg:hidden">
                                    <SuggestedFriends />
                                </div>
                            )}
                        </div>
                    ))}

                    {/* Infinite Scroll Trigger Sentinel */}
                    <div ref={observerTarget} className="h-4 w-full" />

                    {/* Bottom Loading Indicator while loading next 7 posts */}
                    {loadingMore && (
                        <div className="flex items-center justify-center gap-2.5 py-6 text-amber-600">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            <span className="text-sm font-medium text-slate-500">Loading more posts...</span>
                        </div>
                    )}

                    {/* Instagram-style All Caught Up footer */}
                    {!hasMore && (
                        <div className="rounded-3xl border border-slate-200/80 bg-white/80 backdrop-blur-sm p-8 text-center my-4 shadow-sm">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 mb-3 shadow-inner">
                                <CheckCircle2 size={26} />
                            </div>
                            <h4 className="font-headline font-bold text-slate-900 text-base">You're all caught up</h4>
                            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                                You've seen all the recent posts from everyone in the Peto community.
                            </p>
                            <button
                                onClick={() => fetchFeedPosts(1, true)}
                                disabled={refreshing}
                                className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 transition"
                            >
                                <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
                                Refresh Feed
                            </button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="text-center py-12 bg-white rounded-3xl border border-slate-100 p-8 shadow-sm">
                        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
                            <CheckCircle2 size={24} />
                        </div>
                        <h4 className="font-headline font-bold text-slate-800 text-base">No posts yet</h4>
                        <p className="text-xs text-slate-500 mt-1">Be the first to share a moment with your pets!</p>
                    </div>
                    <div className="lg:hidden">
                        <SuggestedFriends />
                    </div>
                </div>
            )}
        </section>
    );
};

export default Feed;