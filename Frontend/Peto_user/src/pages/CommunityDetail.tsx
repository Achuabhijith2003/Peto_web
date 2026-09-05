import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Lock,
  Compass,
  Loader2,
  RefreshCw,
  Sparkles,
  ArrowLeft,
  Shield,
  Flag,
  X,
  CheckCircle2,
} from "lucide-react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/layout/Navbar";
import MobileBottomNav from "../components/social/MobileBottomNav";
import CommunityHeader from "../components/community/CommunityHeader";
import CommunityTabs from "../components/community/CommunityTabs";
import CommunityMemberItem from "../components/community/CommunityMemberItem";
import CommunityRulesAccordion from "../components/community/CommunityRulesAccordion";
import CommunityModPanel from "../components/community/CommunityModPanel";
import CreatePost from "../components/social/CreatePost";
import PostCard from "../components/social/PostCard";

const CommunityDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, openAuthModal } = useAuth();

  const [community, setCommunity] = useState<any>(null);
  const [loadingCommunity, setLoadingCommunity] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const [activeTab, setActiveTab] = useState<"discussion" | "members" | "about" | "moderation">("discussion");
  const [feedSort, setFeedSort] = useState<"new" | "popular">("new");

  // Discussions Feed State
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState<boolean>(false);
  const [postsPage, setPostsPage] = useState<number>(1);
  const [hasMorePosts, setHasMorePosts] = useState<boolean>(false);

  // Members State
  const [members, setMembers] = useState<any[]>([]);
  const [loadingMembers, setLoadingMembers] = useState<boolean>(false);
  const [membersPage, setMembersPage] = useState<number>(1);
  const [hasMoreMembers, setHasMoreMembers] = useState<boolean>(false);

  // Ban / Report Modal
  const [reportingItem, setReportingItem] = useState<{ postId?: string; userId?: string } | null>(null);
  const [reportReason, setReportReason] = useState<string>("spam");
  const [reportDescription, setReportDescription] = useState<string>("");
  const [submittingReport, setSubmittingReport] = useState<boolean>(false);
  const [reportSuccess, setReportSuccess] = useState<boolean>(false);

  // Ban Modal
  const [banningUser, setBanningUser] = useState<{ id: string; username: string } | null>(null);
  const [banReason, setBanReason] = useState<string>("");
  const [submittingBan, setSubmittingBan] = useState<boolean>(false);

  useEffect(() => {
    if (id) {
      fetchCommunity();
    }
  }, [id, user]);

  useEffect(() => {
    if (community?.id) {
      if (activeTab === "discussion" && !community.is_private_restricted) {
        fetchPosts(1, true);
      } else if (activeTab === "members") {
        fetchMembers(1, true);
      }
    }
  }, [community?.id, activeTab, feedSort]);

  const fetchCommunity = async () => {
    try {
      setLoadingCommunity(true);
      setErrorMsg("");
      const res = await api.get(`/communities/${id}`);
      if (res.data?.success) {
        setCommunity(res.data.data);
      }
    } catch (err: any) {
      console.error("Error fetching community:", err);
      setErrorMsg(err.response?.data?.message || "Community not found or inaccessible.");
    } finally {
      setLoadingCommunity(false);
    }
  };

  const fetchPosts = async (targetPage: number = 1, reset: boolean = false) => {
    if (!community?.id) return;
    try {
      setLoadingPosts(true);
      const res = await api.get(`/communities/${community.id}/posts`, {
        params: {
          page: targetPage,
          limit: 15,
          sort: feedSort,
        },
      });

      if (res.data?.success) {
        const newPosts = res.data.data?.posts || [];
        const pagination = res.data.data?.pagination || {};

        if (reset || targetPage === 1) {
          setPosts(newPosts);
        } else {
          setPosts((prev) => [...prev, ...newPosts]);
        }

        setHasMorePosts(targetPage < (pagination.totalPages || 1));
      }
    } catch (err) {
      console.error("Error fetching community posts:", err);
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchMembers = async (targetPage: number = 1, reset: boolean = false) => {
    if (!community?.id) return;
    try {
      setLoadingMembers(true);
      const res = await api.get(`/communities/${community.id}/members`, {
        params: {
          page: targetPage,
          limit: 20,
        },
      });

      if (res.data?.success) {
        const memberList = res.data.data?.members || [];
        const pagination = res.data.data?.pagination || {};

        if (reset || targetPage === 1) {
          setMembers(memberList);
        } else {
          setMembers((prev) => [...prev, ...memberList]);
        }

        setHasMoreMembers(targetPage < (pagination.totalPages || 1));
      }
    } catch (err) {
      console.error("Error fetching members:", err);
    } finally {
      setLoadingMembers(false);
    }
  };

  const handlePromoteModerator = async (targetUserId: string) => {
    try {
      await api.patch(`/communities/${community.id}/members/${targetUserId}/role`, {
        role: "moderator",
      });
      fetchMembers(1, true);
    } catch (err) {
      console.error("Error promoting moderator:", err);
    }
  };

  const handleDemoteModerator = async (targetUserId: string) => {
    try {
      await api.patch(`/communities/${community.id}/members/${targetUserId}/role`, {
        role: "member",
      });
      fetchMembers(1, true);
    } catch (err) {
      console.error("Error demoting moderator:", err);
    }
  };

  const handleBanSubmit = async () => {
    if (!banningUser || !banReason.trim()) return;
    try {
      setSubmittingBan(true);
      await api.post(`/communities/${community.id}/bans`, {
        user_id: banningUser.id,
        reason: banReason.trim(),
      });
      setBanningUser(null);
      setBanReason("");
      fetchMembers(1, true);
    } catch (err) {
      console.error("Error banning user:", err);
    } finally {
      setSubmittingBan(false);
    }
  };

  const handleReportSubmit = async () => {
    if (!reportingItem) return;
    try {
      setSubmittingReport(true);
      await api.post(`/communities/${community.id}/reports`, {
        post_id: reportingItem.postId || undefined,
        reported_user_id: reportingItem.userId || undefined,
        reason: reportReason,
        description: reportDescription.trim(),
      });
      setReportSuccess(true);
      setTimeout(() => {
        setReportSuccess(false);
        setReportingItem(null);
        setReportDescription("");
      }, 2000);
    } catch (err) {
      console.error("Error submitting report:", err);
    } finally {
      setSubmittingReport(false);
    }
  };

  if (loadingCommunity) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-amber-500" />
      </div>
    );
  }

  if (errorMsg || !community) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 pb-20">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 pt-16 text-center space-y-4">
          <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-3xl bg-amber-100 text-amber-700">
            <Compass size={28} />
          </div>
          <h2 className="font-headline text-2xl font-bold text-slate-900">Community Not Found</h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto">{errorMsg || "The community you requested does not exist or has been removed."}</p>
          <button
            type="button"
            onClick={() => navigate("/community")}
            className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-amber-600 transition cursor-pointer"
          >
            <ArrowLeft size={16} />
            <span>Back to Communities</span>
          </button>
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  const isOwner =
    community.viewer?.role === "owner" ||
    (Boolean(user?.id) && (community.owner_id === user?.id || community.owner?.id === user?.id));
  const isModerator = community.viewer?.role === "moderator";
  const isMember = isOwner || community.viewer?.is_member;
  const isPrivateRestricted = !isOwner && community.is_private_restricted;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-20 md:pb-10 font-sans">
      <Navbar />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Back link */}
        <button
          type="button"
          onClick={() => navigate("/community")}
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-amber-600 transition cursor-pointer"
        >
          <ArrowLeft size={14} />
          <span>All Communities</span>
        </button>

        {/* Community Header */}
        <CommunityHeader
          community={community}
          onCommunityUpdated={(updated: any) => setCommunity(updated)}
          onOpenSettings={() => setActiveTab("moderation")}
        />

        {/* Tab Navigation */}
        <CommunityTabs
          activeTab={activeTab}
          onChangeTab={(tab: "discussion" | "members" | "about" | "moderation") => setActiveTab(tab)}
          showModTab={isOwner || isModerator}
          memberCount={community.member_count}
          rulesCount={community.rules?.length || 0}
        />

        {/* TAB 1: DISCUSSIONS / FEED */}
        {activeTab === "discussion" && (
          <div>
            {isPrivateRestricted ? (
              <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center shadow-xs space-y-4">
                <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-3xl bg-amber-100 text-amber-700">
                  <Lock size={28} />
                </div>
                <div className="max-w-md mx-auto space-y-1">
                  <h3 className="font-headline text-lg font-bold text-slate-900">Private Community</h3>
                  <p className="text-xs text-slate-500">
                    Discussions and members are restricted to active community members. Request to join to participate.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Posts Feed Column */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Create Post Widget inside Community */}
                  {isMember ? (
                    <CreatePost
                      communityId={community.id}
                      communityName={community.name}
                      onPostCreated={() => fetchPosts(1, true)}
                    />
                  ) : (
                    <div className="rounded-3xl border border-amber-200/80 bg-amber-50/60 p-5 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <Sparkles size={20} className="text-amber-600 shrink-0" />
                        <p className="text-xs font-medium text-amber-900">
                          Join this community to start discussions and post stories!
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          if (!user) {
                            openAuthModal("join the community");
                            return;
                          }
                          const res = await api.post(`/communities/${community.id}/join`);
                          if (res.data?.status === "active") {
                            setCommunity((prev: any) => ({
                              ...prev,
                              member_count: (prev.member_count || 0) + 1,
                              viewer: { ...prev.viewer, is_member: true, status: "active", role: "member" },
                            }));
                          }
                        }}
                        className="rounded-xl bg-amber-500 px-4 py-2 text-xs font-bold text-white hover:bg-amber-600 transition cursor-pointer shrink-0"
                      >
                        Join Now
                      </button>
                    </div>
                  )}

                  {/* Feed Sorting Options */}
                  <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                    <h4 className="font-headline font-bold text-sm text-slate-900">
                      Community Discussions
                    </h4>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setFeedSort("new")}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                          feedSort === "new" ? "bg-amber-100 text-amber-800" : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        Newest
                      </button>
                      <button
                        type="button"
                        onClick={() => setFeedSort("popular")}
                        className={`rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                          feedSort === "popular" ? "bg-amber-100 text-amber-800" : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        Top Rated
                      </button>
                    </div>
                  </div>

                  {/* Posts List */}
                  {loadingPosts && posts.length === 0 ? (
                    <div className="space-y-4">
                      {[1, 2].map((i) => (
                        <div key={i} className="h-48 rounded-3xl bg-white p-6 shadow-xs animate-pulse space-y-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-slate-100" />
                            <div className="space-y-1.5 flex-1">
                              <div className="h-3.5 w-28 rounded bg-slate-100" />
                              <div className="h-2.5 w-16 rounded bg-slate-100" />
                            </div>
                          </div>
                          <div className="h-12 w-full rounded bg-slate-100" />
                        </div>
                      ))}
                    </div>
                  ) : posts.length > 0 ? (
                    <div className="space-y-6">
                      {posts.map((post) => (
                        <PostCard key={post.id} post={post} />
                      ))}

                      {hasMorePosts && (
                        <div className="flex justify-center pt-2">
                          <button
                            type="button"
                            disabled={loadingPosts}
                            onClick={() => {
                              const next = postsPage + 1;
                              setPostsPage(next);
                              fetchPosts(next, false);
                            }}
                            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                          >
                            {loadingPosts ? <Loader2 size={14} className="animate-spin text-amber-500" /> : <RefreshCw size={14} />}
                            <span>Load More Discussions</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-slate-100 bg-white p-10 text-center shadow-xs space-y-3">
                      <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                        <Sparkles size={22} />
                      </div>
                      <h4 className="font-headline font-bold text-base text-slate-900">
                        Be the first to start a discussion!
                      </h4>
                      <p className="text-xs text-slate-400 max-w-sm mx-auto">
                        Share questions, stories, or photos with fellow community members.
                      </p>
                    </div>
                  )}
                </div>

                {/* Right Sticky Sidebar: Rules & Info Summary */}
                <div className="hidden lg:block space-y-6">
                  <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xs space-y-4">
                    <div className="flex items-center gap-2">
                      <Shield size={18} className="text-amber-500" />
                      <h4 className="font-headline font-bold text-sm text-slate-900">About Community</h4>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {community.description || "A safe and friendly space for pet enthusiasts."}
                    </p>

                    <div className="pt-3 border-t border-slate-100 text-xs space-y-2 text-slate-500">
                      <div className="flex justify-between">
                        <span>Category:</span>
                        <strong className="text-slate-800">{community.category}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Created:</span>
                        <strong className="text-slate-800">{new Date(community.created_at).toLocaleDateString()}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Privacy:</span>
                        <strong className="text-slate-800 capitalize">{community.visibility}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Rules Sidebar Snippet */}
                  {community.rules && community.rules.length > 0 && (
                    <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xs space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="font-headline font-bold text-sm text-slate-900">Community Rules</h4>
                        <button
                          type="button"
                          onClick={() => setActiveTab("about")}
                          className="text-xs font-bold text-amber-600 hover:text-amber-700 cursor-pointer"
                        >
                          View All
                        </button>
                      </div>

                      <div className="space-y-2">
                        {community.rules.slice(0, 3).map((r: any, idx: number) => (
                          <div key={r.id || idx} className="rounded-xl bg-slate-50 p-2.5 text-xs text-slate-700">
                            <span className="font-bold text-slate-900 mr-1.5">{idx + 1}.</span>
                            {r.title}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MEMBERS */}
        {activeTab === "members" && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-headline font-bold text-base text-slate-900">
                Community Members ({community.member_count || 1})
              </h3>
            </div>

            {loadingMembers && members.length === 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-20 rounded-2xl bg-white p-4 shadow-xs animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {members.map((member) => (
                    <CommunityMemberItem
                      key={member.id}
                      member={member}
                      viewerRole={community.viewer?.role}
                      onPromoteModerator={handlePromoteModerator}
                      onDemoteModerator={handleDemoteModerator}
                      onBanMember={(userId: string, username: string) => setBanningUser({ id: userId, username })}
                    />
                  ))}
                </div>

                {hasMoreMembers && (
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      disabled={loadingMembers}
                      onClick={() => {
                        const next = membersPage + 1;
                        setMembersPage(next);
                        fetchMembers(next, false);
                      }}
                      className="rounded-2xl border border-slate-200 bg-white px-5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      Load More Members
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ABOUT & RULES */}
        {activeTab === "about" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <CommunityRulesAccordion
                communityId={community.id}
                rules={community.rules || []}
                canEdit={isOwner}
                onRulesUpdated={() => fetchCommunity()}
              />
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-xs space-y-4">
                <h4 className="font-headline font-bold text-sm text-slate-900">Community Founder</h4>
                {community.owner && (
                  <div
                    onClick={() => navigate(`/profile/${community.owner.id}`)}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 hover:bg-amber-50 transition cursor-pointer"
                  >
                    <div className="h-11 w-11 rounded-2xl overflow-hidden bg-amber-100 font-bold text-amber-700 flex items-center justify-center">
                      {community.owner.avatar_url && community.owner.avatar_url !== "null" ? (
                        <img src={community.owner.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        community.owner.username?.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h5 className="font-bold text-xs text-slate-900">{community.owner.full_name || community.owner.username}</h5>
                      <p className="text-[11px] text-slate-400">@{community.owner.username}</p>
                    </div>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 text-xs space-y-2 text-slate-500">
                  <div className="flex justify-between">
                    <span>Category:</span>
                    <strong className="text-slate-800">{community.category}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span>Visibility:</span>
                    <strong className="text-slate-800 capitalize">{community.visibility}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: MODERATION DASHBOARD */}
        {activeTab === "moderation" && (isOwner || isModerator) && (
          <CommunityModPanel communityId={community.id} isOwner={isOwner} />
        )}
      </main>

      <MobileBottomNav />

      {/* Ban User Modal */}
      {banningUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-headline font-bold text-base text-slate-900">
                Ban @{banningUser.username}
              </h3>
              <button
                type="button"
                onClick={() => setBanningUser(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Banned members cannot view private discussions, create posts, leave comments, or re-join this community.
            </p>

            <textarea
              rows={3}
              placeholder="State the reason for banning this user..."
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              className="w-full rounded-2xl bg-slate-50 p-3.5 text-xs text-slate-900 outline-none border border-slate-200 focus:border-rose-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBanningUser(null)}
                className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingBan || !banReason.trim()}
                onClick={handleBanSubmit}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {submittingBan ? "Banning..." : "Confirm Ban"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {reportingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flag size={18} className="text-rose-500" />
                <h3 className="font-headline font-bold text-base text-slate-900">Submit Report</h3>
              </div>
              <button
                type="button"
                onClick={() => setReportingItem(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={18} />
              </button>
            </div>

            {reportSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 size={36} className="text-emerald-500 mx-auto" />
                <h4 className="font-bold text-sm text-slate-900">Report Submitted</h4>
                <p className="text-xs text-slate-500">Community moderators will review this item shortly.</p>
              </div>
            ) : (
              <div className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Reason</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full rounded-xl bg-slate-50 px-3 py-2.5 text-xs text-slate-900 outline-none border border-slate-200"
                  >
                    <option value="spam">Spam</option>
                    <option value="harassment">Harassment / Bullying</option>
                    <option value="hate">Hate Speech</option>
                    <option value="misinformation">Misinformation</option>
                    <option value="inappropriate">Inappropriate Content</option>
                    <option value="off-topic">Off-Topic</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Description (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Provide additional details..."
                    value={reportDescription}
                    onChange={(e) => setReportDescription(e.target.value)}
                    className="w-full rounded-xl bg-slate-50 p-3 text-xs text-slate-900 outline-none border border-slate-200"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setReportingItem(null)}
                    className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={submittingReport}
                    onClick={handleReportSubmit}
                    className="rounded-xl bg-amber-500 px-5 py-2 text-xs font-bold text-white hover:bg-amber-600"
                  >
                    {submittingReport ? "Submitting..." : "Submit Report"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityDetail;
