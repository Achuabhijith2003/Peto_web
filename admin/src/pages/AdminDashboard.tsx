import React, { useEffect, useState } from "react";
import { fetchDashboardOverview } from "../api/adminApi";
import {
  DashboardOverviewData,
  DashboardDateRange,
} from "../types/admin";
import { DashboardCharts } from "../components/dashboard/DashboardCharts";
import { OperationalWidgets } from "../components/dashboard/OperationalWidgets";
import {
  Users,
  Layers,
  Activity,
  ShieldAlert,
  HardDrive,
  Server,
  RefreshCw,
  TrendingUp,
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  X,
  MessageSquare,
} from "lucide-react";

export const AdminDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardOverviewData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Date Filter State
  const [selectedRange, setSelectedRange] = useState<DashboardDateRange>("30d");
  const [customStart, setCustomStart] = useState<string>("");
  const [customEnd, setCustomEnd] = useState<string>("");
  const [showCustomModal, setShowCustomModal] = useState<boolean>(false);

  const loadDashboard = async (forceRefresh: boolean = false) => {
    try {
      if (forceRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const overview = await fetchDashboardOverview({
        range: selectedRange,
        startDate: selectedRange === "custom" && customStart ? customStart : undefined,
        endDate: selectedRange === "custom" && customEnd ? customEnd : undefined,
        refresh: forceRefresh,
      });

      setData(overview);
    } catch (err: any) {
      console.error("[Dashboard] Load error:", err);
      setError(err.response?.data?.message || err.message || "Failed to retrieve dashboard analytics.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard(false);
  }, [selectedRange]);

  const handleApplyCustomDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStart || !customEnd) return;
    setSelectedRange("custom");
    setShowCustomModal(false);
    loadDashboard(true);
  };

  const rangePills: { label: string; value: DashboardDateRange }[] = [
    { label: "Today", value: "today" },
    { label: "7D", value: "7d" },
    { label: "30D", value: "30d" },
    { label: "3M", value: "3m" },
    { label: "6M", value: "6m" },
    { label: "1Y", value: "1y" },
  ];

  return (
    <div className="space-y-8">
      {/* Top Welcome & Control Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-black tracking-tight text-white">Operations Command Center</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              Live
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time platform overview, user velocities, content generation, and system health.
          </p>
        </div>

        {/* Date Filter Bar & Refresh */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Range Pills */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
            {rangePills.map((pill) => {
              const active = selectedRange === pill.value;
              return (
                <button
                  key={pill.value}
                  onClick={() => setSelectedRange(pill.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    active
                      ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {pill.label}
                </button>
              );
            })}

            {/* Custom Date Button */}
            <button
              onClick={() => setShowCustomModal(true)}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                selectedRange === "custom"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Calendar className="w-3.5 h-3.5 mr-1" />
              <span>{selectedRange === "custom" ? "Custom Range" : "Custom"}</span>
            </button>
          </div>

          {/* Refresh Button */}
          <button
            onClick={() => loadDashboard(true)}
            disabled={loading || refreshing}
            title="Bypass server cache and fetch fresh aggregates"
            className="flex items-center px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${refreshing || loading ? "animate-spin text-indigo-400" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !data ? (
        <div className="p-20 text-center text-slate-400 space-y-4">
          <RefreshCw className="w-10 h-10 animate-spin mx-auto text-indigo-400" />
          <p className="text-xs font-medium">Aggregating platform metrics and time-series data...</p>
        </div>
      ) : data ? (
        <>
          {/* Top KPI Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1: Users */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Users</span>
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-white font-mono">{data.metrics.users.total}</div>
                <div className="flex items-center space-x-2 mt-1.5">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    <ArrowUpRight className="w-3 h-3 mr-0.5" />
                    +{data.metrics.users.newInPeriod} new
                  </span>
                  <span className="text-[11px] text-slate-500">
                    {data.metrics.users.growthPct >= 0 ? `+${data.metrics.users.growthPct}%` : `${data.metrics.users.growthPct}%`} vs prev
                  </span>
                </div>
              </div>
            </div>

            {/* Card 2: Active Users */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Users</span>
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <Activity className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-white font-mono">{data.metrics.users.active}</div>
                <div className="flex items-center space-x-2 mt-1.5">
                  <span className="text-[11px] text-slate-400">
                    <strong className="text-cyan-400 font-mono">
                      {Math.round((data.metrics.users.active / Math.max(1, data.metrics.users.total)) * 100)}%
                    </strong>{" "}
                    of registered community
                  </span>
                </div>
              </div>
            </div>

            {/* Card 3: Content Creation */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Posts & Reels</span>
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
                  <Layers className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-white font-mono">
                  {data.metrics.content.totalPosts}
                </div>
                <div className="flex items-center space-x-2 mt-1.5">
                  <span className="text-[11px] text-purple-300">
                    {data.metrics.content.totalReels} Video Reels • {data.metrics.content.totalComments} Comments
                  </span>
                </div>
              </div>
            </div>

            {/* Card 4: Moderation Reports */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Reports Queue</span>
                <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
                  <ShieldAlert className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-white font-mono">
                  {data.metrics.moderation.pendingReports}
                </div>
                <div className="flex items-center space-x-2 mt-1.5">
                  <span className="text-[11px] text-slate-400">
                    {data.metrics.moderation.highPriorityReports > 0 ? (
                      <strong className="text-rose-400 font-bold">
                        {data.metrics.moderation.highPriorityReports} High Priority
                      </strong>
                    ) : (
                      "0 Critical"
                    )}{" "}
                    • {data.metrics.moderation.resolutionRatePct}% Resolved
                  </span>
                </div>
              </div>
            </div>

            {/* Card 5: Platform Interactions */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Engagement</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-white font-mono">
                  {data.metrics.engagement.totalInteractions.toLocaleString()}
                </div>
                <div className="flex items-center space-x-2 mt-1.5">
                  <span className="text-[11px] text-slate-400">
                    {data.metrics.engagement.totalLikes} Likes • {data.metrics.engagement.totalBookmarks} Bookmarks
                  </span>
                </div>
              </div>
            </div>

            {/* Card 6: Communities */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Communities</span>
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
                  <MessageSquare className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-white font-mono">
                  {data.metrics.content.totalCommunities}
                </div>
                <div className="flex items-center space-x-2 mt-1.5">
                  <span className="text-[11px] text-slate-400">Active public & private groups</span>
                </div>
              </div>
            </div>

            {/* Card 7: Media Storage Usage */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cloud Storage</span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <HardDrive className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-white font-mono">
                  {data.metrics.storage.formattedMB} <span className="text-base text-slate-400 font-sans">MB</span>
                </div>
                <div className="flex items-center space-x-2 mt-1.5">
                  <span className="text-[11px] text-slate-400">
                    {data.metrics.storage.mediaFilesCount} Media Files ({data.metrics.storage.imagesCount} Img / {data.metrics.storage.videosCount} Vid)
                  </span>
                </div>
              </div>
            </div>

            {/* Card 8: System Infrastructure */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl relative overflow-hidden flex flex-col justify-between space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">System Latency</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Server className="w-4 h-4" />
                </div>
              </div>
              <div>
                <div className="text-3xl font-extrabold text-emerald-400 font-mono">
                  {data.widgets.systemHealth.dbLatencyMs} <span className="text-base text-slate-400 font-sans">ms</span>
                </div>
                <div className="flex items-center space-x-2 mt-1.5">
                  <span className="text-[11px] text-slate-400">
                    Status: <strong className="text-emerald-400">{data.widgets.systemHealth.status}</strong> • Up {data.widgets.systemHealth.uptimeFormatted}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive SVG Charts Section */}
          <DashboardCharts
            userGrowth={data.trends.userGrowth}
            contentCreation={data.trends.contentCreation}
            engagement={data.trends.engagement}
            reports={data.trends.reports}
          />

          {/* Operational Widgets Grid (Reports, System Health, Audit, Users) */}
          <OperationalWidgets
            pendingReports={data.widgets.pendingReports}
            recentAdminActions={data.widgets.recentAdminActions}
            recentUsers={data.widgets.recentUsers}
            systemHealth={data.widgets.systemHealth}
            pendingAdsCount={data.metrics.monetization.pendingAds}
          />
        </>
      ) : null}

      {/* Custom Date Range Picker Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center">
                <Calendar className="w-4 h-4 mr-2 text-indigo-400" />
                Custom Analytics Range
              </h3>
              <button onClick={() => setShowCustomModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApplyCustomDate} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Start Date
                </label>
                <input
                  type="date"
                  required
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  End Date
                </label>
                <input
                  type="date"
                  required
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCustomModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors shadow-lg shadow-indigo-600/25 cursor-pointer"
                >
                  Apply Range
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
