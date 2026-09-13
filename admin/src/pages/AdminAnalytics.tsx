import React, { useEffect, useState, useCallback } from "react";
import {
  BarChart3,
  Users,
  TrendingUp,
  Video,
  Heart,
  MessageSquare,
  Bookmark,
  DollarSign,
  Download,
  RefreshCw,
  Sparkles,
  Award,
  Globe,
  Smartphone,
  Eye,
  Clock,
  Layers,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import {
  fetchAnalyticsOverview,
  fetchUserAnalytics,
  fetchEngagementAnalytics,
  fetchContentAnalytics,
  fetchReelsAnalytics,
  fetchCommunitiesAnalytics,
  fetchRetentionAnalytics,
  fetchRevenueAnalytics,
  downloadAnalyticsCsv,
  AnalyticsQueryFilter,
} from "../api/adminApi";
import {
  AnalyticsRange,
  AnalyticsOverviewData,
  UserAnalyticsData,
  EngagementAnalyticsData,
  ContentAnalyticsData,
  ReelsAnalyticsData,
  CommunitiesAnalyticsData,
  RetentionAnalyticsData,
  RevenueAnalyticsData,
} from "../types/admin";

type AnalyticsSection =
  | "overview"
  | "users"
  | "engagement"
  | "content"
  | "reels"
  | "communities"
  | "retention"
  | "revenue";

export const AdminAnalytics: React.FC = () => {
  const [activeSection, setActiveSection] = useState<AnalyticsSection>("overview");
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Section Data States
  const [overviewData, setOverviewData] = useState<AnalyticsOverviewData | null>(null);
  const [userData, setUserData] = useState<UserAnalyticsData | null>(null);
  const [engagementData, setEngagementData] = useState<EngagementAnalyticsData | null>(null);
  const [contentData, setContentData] = useState<ContentAnalyticsData | null>(null);
  const [reelsData, setReelsData] = useState<ReelsAnalyticsData | null>(null);
  const [communitiesData, setCommunitiesData] = useState<CommunitiesAnalyticsData | null>(null);
  const [retentionData, setRetentionData] = useState<RetentionAnalyticsData | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueAnalyticsData | null>(null);

  const loadActiveSection = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const filter: AnalyticsQueryFilter = { range };

    try {
      switch (activeSection) {
        case "overview": {
          const res = await fetchAnalyticsOverview(filter);
          setOverviewData(res);
          break;
        }
        case "users": {
          const res = await fetchUserAnalytics(filter);
          setUserData(res);
          break;
        }
        case "engagement": {
          const res = await fetchEngagementAnalytics(filter);
          setEngagementData(res);
          break;
        }
        case "content": {
          const res = await fetchContentAnalytics(filter);
          setContentData(res);
          break;
        }
        case "reels": {
          const res = await fetchReelsAnalytics(filter);
          setReelsData(res);
          break;
        }
        case "communities": {
          const res = await fetchCommunitiesAnalytics(filter);
          setCommunitiesData(res);
          break;
        }
        case "retention": {
          const res = await fetchRetentionAnalytics(filter);
          setRetentionData(res);
          break;
        }
        case "revenue": {
          const res = await fetchRevenueAnalytics(filter);
          setRevenueData(res);
          break;
        }
      }
    } catch (err: any) {
      console.error("Failed to load analytics data:", err);
      setError(err.response?.data?.message || err.message || "Failed to load analytics data.");
    } finally {
      setIsLoading(false);
    }
  }, [activeSection, range]);

  useEffect(() => {
    loadActiveSection();
  }, [loadActiveSection]);

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      await downloadAnalyticsCsv(activeSection, { range });
    } catch (err: any) {
      alert("Failed to export CSV: " + (err.message || "Unknown error"));
    } finally {
      setIsExporting(false);
    }
  };

  const sections: Array<{ id: AnalyticsSection; label: string; icon: any }> = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "users", label: "Users & Demographics", icon: Users },
    { id: "engagement", label: "Engagement", icon: Heart },
    { id: "content", label: "Content & Creators", icon: Layers },
    { id: "reels", label: "Reels & Watch Time", icon: Video },
    { id: "communities", label: "Communities", icon: Globe },
    { id: "retention", label: "Retention Cohorts", icon: TrendingUp },
    { id: "revenue", label: "Monetization & ARPU", icon: DollarSign },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/20">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Peto Intelligence & Analytics
                <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Pre-aggregated Engine
                </span>
              </h1>
              <p className="text-sm text-slate-400">
                Audited metrics, cohort retention, and platform performance data.
              </p>
            </div>
          </div>
        </div>

        {/* Global Controls: Range selector and Export */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Range Pills */}
          <div className="flex items-center bg-slate-800/80 p-1 rounded-xl border border-slate-700/60">
            {(["24h", "7d", "30d", "90d", "1y", "all"] as AnalyticsRange[]).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  range === r
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => loadActiveSection()}
            disabled={isLoading}
            className="p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700/60 transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-indigo-400" : ""}`} />
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCsv}
            disabled={isExporting || isLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            {isExporting ? "Exporting..." : "Export CSV"}
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-slate-800">
        {sections.map((sec) => {
          const Icon = sec.icon;
          const isActive = activeSection === sec.id;
          return (
            <button
              key={sec.id}
              onClick={() => setActiveSection(sec.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 shadow-sm"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-indigo-400" : "text-slate-500"}`} />
              {sec.label}
            </button>
          );
        })}
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading state indicator */}
      {isLoading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-4">
          <div className="w-10 h-10 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Aggregating intelligence datasets...</p>
        </div>
      ) : (
        <div>
          {/* SECTION 1: OVERVIEW */}
          {activeSection === "overview" && overviewData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  label="Total Platform Users"
                  value={overviewData.summary.totalUsers.toLocaleString()}
                  sub={`+${overviewData.summary.newUsersPeriod.toLocaleString()} in range`}
                  icon={Users}
                  color="indigo"
                />
                <MetricCard
                  label="Active Users in Range"
                  value={overviewData.summary.activeUsersPeriod.toLocaleString()}
                  sub={`${((overviewData.summary.activeUsersPeriod / Math.max(overviewData.summary.totalUsers, 1)) * 100).toFixed(1)}% of userbase`}
                  icon={TrendingUp}
                  color="emerald"
                />
                <MetricCard
                  label="Total Content Created"
                  value={(overviewData.summary.totalPosts + overviewData.summary.totalReels).toLocaleString()}
                  sub={`${overviewData.summary.totalPosts.toLocaleString()} posts • ${overviewData.summary.totalReels.toLocaleString()} reels`}
                  icon={Layers}
                  color="amber"
                />
                <MetricCard
                  label="Estimated Media Storage"
                  value={`${overviewData.summary.estimatedStorageMB.toLocaleString()} MB`}
                  sub="Active S3/Supabase storage"
                  icon={Sparkles}
                  color="violet"
                />
              </div>

              {/* Engagement Activity Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Period Likes</p>
                    <p className="text-2xl font-bold text-white mt-1">{overviewData.activitySummary.periodLikes.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl">
                    <Heart className="w-5 h-5" />
                  </div>
                </div>
                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Period Comments</p>
                    <p className="text-2xl font-bold text-white mt-1">{overviewData.activitySummary.periodComments.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                </div>
                <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Period Bookmarks</p>
                    <p className="text-2xl font-bold text-white mt-1">{overviewData.activitySummary.periodBookmarks.toLocaleString()}</p>
                  </div>
                  <div className="p-3 bg-purple-500/10 text-purple-400 rounded-xl">
                    <Bookmark className="w-5 h-5" />
                  </div>
                </div>
              </div>

              {/* Timeline Trend Table */}
              <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-indigo-400" />
                  Daily Growth & Content Distribution
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                        <th className="py-3 px-4">Date</th>
                        <th className="py-3 px-4 text-right">New Users</th>
                        <th className="py-3 px-4 text-right">Posts</th>
                        <th className="py-3 px-4 text-right">Reels</th>
                        <th className="py-3 px-4 text-right">Interactions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {overviewData.growthTrend.slice(-10).map((row) => (
                        <tr key={row.date} className="hover:bg-slate-800/30">
                          <td className="py-3 px-4 font-mono text-slate-300">{row.date}</td>
                          <td className="py-3 px-4 text-right font-medium text-indigo-400">+{row.newUsers}</td>
                          <td className="py-3 px-4 text-right text-slate-300">{row.newPosts}</td>
                          <td className="py-3 px-4 text-right text-slate-300">{row.newReels}</td>
                          <td className="py-3 px-4 text-right font-medium text-emerald-400">{row.interactions.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: USERS & DEMOGRAPHICS */}
          {activeSection === "users" && userData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  label="Daily Active Users (DAU)"
                  value={userData.metrics.dau.toLocaleString()}
                  sub="Last 24h active logins/events"
                  icon={Users}
                  color="indigo"
                />
                <MetricCard
                  label="Weekly Active (WAU)"
                  value={userData.metrics.wau.toLocaleString()}
                  sub="Past 7 days active"
                  icon={Users}
                  color="violet"
                />
                <MetricCard
                  label="Monthly Active (MAU)"
                  value={userData.metrics.mau.toLocaleString()}
                  sub="Past 30 days active"
                  icon={TrendingUp}
                  color="emerald"
                />
                <MetricCard
                  label="DAU / MAU Stickiness"
                  value={`${((userData.metrics.dau / Math.max(userData.metrics.mau, 1)) * 100).toFixed(1)}%`}
                  sub="Platform retention ratio"
                  icon={Sparkles}
                  color="amber"
                />
              </div>

              {/* Status breakdown & Platform cards */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Account Status Distribution */}
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                  <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    Account Status Distribution
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                      <span className="text-xs text-slate-300">Active Accounts</span>
                      <span className="text-sm font-bold text-emerald-400">{userData.metrics.activeUsers.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                      <span className="text-xs text-slate-300">Suspended Accounts</span>
                      <span className="text-sm font-bold text-amber-400">{userData.metrics.suspendedAccounts.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                      <span className="text-xs text-slate-300">Banned Accounts</span>
                      <span className="text-sm font-bold text-rose-400">{userData.metrics.bannedAccounts.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-700/40">
                      <span className="text-xs text-slate-300">Deleted Accounts</span>
                      <span className="text-sm font-bold text-slate-400">{userData.metrics.deletedAccounts.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Platform Distribution */}
                <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                  <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-indigo-400" />
                    Client Platform Breakdown
                  </h3>
                  <div className="space-y-4">
                    {userData.platformDistribution.map((p) => (
                      <div key={p.platform} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-slate-300">{p.platform}</span>
                          <span className="text-indigo-400">{p.percentage}% ({p.count})</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
                            style={{ width: `${p.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 3: ENGAGEMENT */}
          {activeSection === "engagement" && engagementData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  label="Total Likes"
                  value={engagementData.totals.likes.toLocaleString()}
                  sub="Content endorsements"
                  icon={Heart}
                  color="rose"
                />
                <MetricCard
                  label="Total Comments"
                  value={engagementData.totals.comments.toLocaleString()}
                  sub="Discussions generated"
                  icon={MessageSquare}
                  color="blue"
                />
                <MetricCard
                  label="Reel & Post Views"
                  value={(engagementData.totals.postViews + engagementData.totals.reelViews).toLocaleString()}
                  sub={`${engagementData.totals.reelViews.toLocaleString()} reel plays`}
                  icon={Eye}
                  color="amber"
                />
                <MetricCard
                  label="Reel Watch Time"
                  value={`${Math.round(engagementData.totals.reelWatchTimeSeconds / 60).toLocaleString()} mins`}
                  sub={`Avg ${engagementData.totals.avgWatchTimePerReelSeconds}s / play`}
                  icon={Clock}
                  color="violet"
                />
              </div>

              {/* Interaction Share Breakdown */}
              <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Interaction Type Distribution
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {engagementData.breakdown.map((item) => (
                    <div key={item.type} className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/40">
                      <p className="text-xs text-slate-400 uppercase font-semibold">{item.type}</p>
                      <p className="text-xl font-bold text-white mt-1">{item.count.toLocaleString()}</p>
                      <p className="text-xs text-indigo-400 font-medium mt-1">{item.percentage}% of interactions</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: CONTENT & CREATORS */}
          {activeSection === "content" && contentData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  label="Posts Velocity"
                  value={`${contentData.metrics.postsPerDay}/day`}
                  sub={`${contentData.metrics.totalPosts.toLocaleString()} lifetime posts`}
                  icon={Layers}
                  color="indigo"
                />
                <MetricCard
                  label="Reels Velocity"
                  value={`${contentData.metrics.reelsPerDay}/day`}
                  sub={`${contentData.metrics.totalReels.toLocaleString()} lifetime reels`}
                  icon={Video}
                  color="violet"
                />
                <MetricCard
                  label="Images Uploaded"
                  value={contentData.mediaDistribution.images.toLocaleString()}
                  sub="Photos in media pipeline"
                  icon={Sparkles}
                  color="emerald"
                />
                <MetricCard
                  label="Videos Uploaded"
                  value={contentData.mediaDistribution.videos.toLocaleString()}
                  sub={`Image/Video ratio: ${contentData.mediaDistribution.ratio}`}
                  icon={Video}
                  color="amber"
                />
              </div>

              {/* Creator Leaderboard */}
              <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Award className="w-4 h-4 text-amber-400" />
                  Top Creator Leaderboard
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                        <th className="py-3 px-4">Rank</th>
                        <th className="py-3 px-4">Creator</th>
                        <th className="py-3 px-4 text-right">Posts Published</th>
                        <th className="py-3 px-4 text-right">Total Likes Received</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {contentData.topCreators.map((creator, idx) => (
                        <tr key={creator.authorId} className="hover:bg-slate-800/30">
                          <td className="py-3 px-4 font-bold text-slate-400">
                            {idx === 0 && <span className="text-amber-400 font-extrabold">🥇 #1</span>}
                            {idx === 1 && <span className="text-slate-300 font-bold">🥈 #2</span>}
                            {idx === 2 && <span className="text-amber-600 font-bold">🥉 #3</span>}
                            {idx > 2 && `#${idx + 1}`}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-xs uppercase">
                                {creator.author?.username?.[0] || "U"}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-200">
                                  {creator.author?.full_name || creator.author?.username || "Peto User"}
                                </p>
                                <p className="text-[11px] text-slate-400">@{creator.author?.username || "unknown"}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-300">
                            {creator.postCount.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-rose-400">
                            ❤️ {creator.totalLikes.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 5: REELS & VIDEO PERFORMANCE */}
          {activeSection === "reels" && reelsData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  label="Total Reel Views"
                  value={reelsData.metrics.totalViews.toLocaleString()}
                  sub="Short-form plays"
                  icon={Video}
                  color="violet"
                />
                <MetricCard
                  label="Cumulative Watch Time"
                  value={`${Math.round(reelsData.metrics.totalWatchTimeSeconds / 60).toLocaleString()} min`}
                  sub="Time spent watching"
                  icon={Clock}
                  color="indigo"
                />
                <MetricCard
                  label="Avg Watch Time"
                  value={`${reelsData.metrics.avgWatchTimeSeconds}s`}
                  sub="Per video view"
                  icon={TrendingUp}
                  color="emerald"
                />
                <MetricCard
                  label="Completion Rate"
                  value={`${reelsData.metrics.completionRatePct}%`}
                  sub="Watched to completion"
                  icon={Sparkles}
                  color="amber"
                />
              </div>

              {/* Top Performing Reels */}
              <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Video className="w-4 h-4 text-violet-400" />
                  Top Performing Short-form Reels
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                        <th className="py-3 px-4">Caption / Title</th>
                        <th className="py-3 px-4">Creator</th>
                        <th className="py-3 px-4 text-right">Plays / Views</th>
                        <th className="py-3 px-4 text-right">Likes</th>
                        <th className="py-3 px-4 text-right">Comments</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {reelsData.topReels.map((reel) => (
                        <tr key={reel.id} className="hover:bg-slate-800/30">
                          <td className="py-3 px-4 font-medium text-slate-200 max-w-xs truncate">
                            {reel.caption || "Untitled Reel"}
                          </td>
                          <td className="py-3 px-4 text-slate-400 font-mono">
                            @{reel.author?.username || "creator"}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-violet-400">
                            {reel.views.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right text-rose-400">
                            {reel.likes.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right text-blue-400">
                            {reel.comments.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 6: COMMUNITIES */}
          {activeSection === "communities" && communitiesData && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  label="Total Communities"
                  value={communitiesData.metrics.totalCommunities.toLocaleString()}
                  sub="Active public & private groups"
                  icon={Globe}
                  color="indigo"
                />
                <MetricCard
                  label="Total Memberships"
                  value={communitiesData.metrics.totalMemberships.toLocaleString()}
                  sub="User-group connections"
                  icon={Users}
                  color="emerald"
                />
                <MetricCard
                  label="Active Groups in Range"
                  value={communitiesData.metrics.activeCommunitiesCount.toLocaleString()}
                  sub="With new posts or members"
                  icon={TrendingUp}
                  color="violet"
                />
                <MetricCard
                  label="Avg Group Size"
                  value={`${communitiesData.metrics.avgMembersPerCommunity} members`}
                  sub="Members per community"
                  icon={Sparkles}
                  color="amber"
                />
              </div>

              {/* Top Communities Table */}
              <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <Globe className="w-4 h-4 text-emerald-400" />
                  Most Active Communities
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                        <th className="py-3 px-4">Community Name</th>
                        <th className="py-3 px-4 text-right">Members</th>
                        <th className="py-3 px-4 text-right">Posts Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {communitiesData.topCommunities.map((c) => (
                        <tr key={c.id} className="hover:bg-slate-800/30">
                          <td className="py-3 px-4 font-semibold text-slate-200">
                            {c.name}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-emerald-400">
                            {c.memberCount.toLocaleString()}
                          </td>
                          <td className="py-3 px-4 text-right text-slate-300">
                            {c.postCount.toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 7: RETENTION COHORT MATRIX */}
          {activeSection === "retention" && retentionData && (
            <div className="space-y-6">
              {/* Cohort Averages */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  label="Avg Day 1 Retention"
                  value={`${retentionData.averages.d1}%`}
                  sub="Next-day return rate"
                  icon={TrendingUp}
                  color="indigo"
                />
                <MetricCard
                  label="Avg Day 7 Retention"
                  value={`${retentionData.averages.d7}%`}
                  sub="Weekly return rate"
                  icon={TrendingUp}
                  color="violet"
                />
                <MetricCard
                  label="Avg Day 14 Retention"
                  value={`${retentionData.averages.d14}%`}
                  sub="Bi-weekly stickiness"
                  icon={TrendingUp}
                  color="amber"
                />
                <MetricCard
                  label="Avg Day 30 Retention"
                  value={`${retentionData.averages.d30}%`}
                  sub="Monthly persistent cohort"
                  icon={TrendingUp}
                  color="emerald"
                />
              </div>

              {/* Retention Heatmap Table */}
              <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                    Weekly Registration Retention Heatmap
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="w-3 h-3 rounded bg-emerald-500/80 inline-block" /> &gt; 40%
                    <span className="w-3 h-3 rounded bg-indigo-500/80 inline-block ml-2" /> 20-40%
                    <span className="w-3 h-3 rounded bg-slate-700/80 inline-block ml-2" /> &lt; 20%
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase">
                        <th className="py-3 px-4">Cohort Week</th>
                        <th className="py-3 px-4 text-right">Users Registered</th>
                        <th className="py-3 px-4 text-center">Day 1</th>
                        <th className="py-3 px-4 text-center">Day 7</th>
                        <th className="py-3 px-4 text-center">Day 14</th>
                        <th className="py-3 px-4 text-center">Day 30</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {retentionData.cohorts.map((c) => (
                        <tr key={c.cohortWeek} className="hover:bg-slate-800/30">
                          <td className="py-3 px-4 font-mono text-slate-300 font-medium">
                            {c.cohortWeek}
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-slate-300">
                            {c.cohortSize.toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <RetentionCell pct={c.d1Pct} />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <RetentionCell pct={c.d7Pct} />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <RetentionCell pct={c.d14Pct} />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <RetentionCell pct={c.d30Pct} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SECTION 8: REVENUE & MONETIZATION READINESS */}
          {activeSection === "revenue" && revenueData && (
            <div className="space-y-6">
              {/* Readiness Checks */}
              <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  Phase 6 Monetization Architecture Readiness
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/40 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-white">Ad Delivery Engine</p>
                      <p className="text-[11px] text-slate-400">Phase 6 Schema Ready</p>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/40 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-white">Payment & Stripe Webhooks</p>
                      <p className="text-[11px] text-slate-400">Ready for Subscriptions</p>
                    </div>
                  </div>
                  <div className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/40 flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-white">Premium Verification</p>
                      <p className="text-[11px] text-slate-400">Badge & Tiers Support</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Estimates Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard
                  label="Monetizable DAU"
                  value={revenueData.estimates.estimatedMonetizableDAU.toLocaleString()}
                  sub={`Audience: ${revenueData.estimates.totalAudience.toLocaleString()}`}
                  icon={Users}
                  color="indigo"
                />
                <MetricCard
                  label="Estimated Ad RPM"
                  value={`$${revenueData.estimates.estimatedRPM.toFixed(2)}`}
                  sub="Per 1,000 feed impressions"
                  icon={TrendingUp}
                  color="violet"
                />
                <MetricCard
                  label="Est. Monthly Revenue"
                  value={`$${revenueData.estimates.estimatedMonthlyRevenueUSD.toLocaleString()}`}
                  sub="Based on current DAU"
                  icon={DollarSign}
                  color="emerald"
                />
                <MetricCard
                  label="Estimated ARPU"
                  value={`$${revenueData.estimates.estimatedARPU.toFixed(2)}`}
                  sub="Average Revenue Per User"
                  icon={Sparkles}
                  color="amber"
                />
              </div>

              {/* Growth Projections */}
              <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800">
                <h3 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  Quarterly Projected Monetization Runway
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {revenueData.projections.map((proj) => (
                    <div key={proj.month} className="p-4 bg-slate-800/40 rounded-xl border border-slate-700/40">
                      <p className="text-xs text-slate-400 font-semibold">{proj.month}</p>
                      <p className="text-xl font-bold text-emerald-400 mt-1">${proj.projectedRevenueUSD.toLocaleString()} / mo</p>
                      <p className="text-xs text-slate-400 mt-1">{proj.projectedDAU.toLocaleString()} Projected DAU</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Helper metric card component
const MetricCard: React.FC<{
  label: string;
  value: string;
  sub: string;
  icon: any;
  color: "indigo" | "emerald" | "amber" | "violet" | "rose" | "blue";
}> = ({ label, value, sub, icon: Icon, color }) => {
  const colorMap = {
    indigo: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    amber: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    violet: "text-violet-400 bg-violet-500/10 border-violet-500/20",
    rose: "text-rose-400 bg-rose-500/10 border-rose-500/20",
    blue: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  };

  return (
    <div className="bg-slate-900/60 p-5 rounded-2xl border border-slate-800 relative overflow-hidden backdrop-blur-md hover:border-slate-700 transition">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-400">{label}</span>
        <div className={`p-2 rounded-xl border ${colorMap[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-2xl font-extrabold text-white tracking-tight">{value}</p>
        <p className="text-xs text-slate-400 mt-1">{sub}</p>
      </div>
    </div>
  );
};

// Helper retention heatmap cell
const RetentionCell: React.FC<{ pct: number }> = ({ pct }) => {
  let bg = "bg-slate-800/60 text-slate-400";
  if (pct >= 40) {
    bg = "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30";
  } else if (pct >= 25) {
    bg = "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30";
  } else if (pct >= 10) {
    bg = "bg-amber-500/20 text-amber-300 border border-amber-500/30";
  }

  return (
    <span className={`inline-block px-3 py-1 rounded-lg text-xs font-bold font-mono ${bg}`}>
      {pct}%
    </span>
  );
};

export default AdminAnalytics;
