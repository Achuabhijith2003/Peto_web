import React, { useEffect, useState } from "react";
import { fetchDashboardOverview } from "../api/adminApi";
import {
  DashboardOverviewData,
  DashboardDateRange,
} from "../types/admin";
import { DashboardCharts } from "../components/dashboard/DashboardCharts";
import { OperationalWidgets } from "../components/dashboard/OperationalWidgets";
import { MetricCard } from "../components/dashboard/MetricCard";
import { PageHeader } from "../components/layout/PageHeader";
import { LoadingState } from "../components/common/LoadingState";
import { ErrorState } from "../components/common/ErrorState";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

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
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Operations Command Center"
        description="Real-time platform overview, user velocities, content generation, and system telemetry."
        badge={
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            Live
          </span>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {/* Range Pills */}
            <div className="flex items-center p-0.5 rounded-xl bg-muted/60 border border-border">
              {rangePills.map((pill) => {
                const active = selectedRange === pill.value;
                return (
                  <button
                    key={pill.value}
                    type="button"
                    onClick={() => setSelectedRange(pill.value)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                      active
                        ? "bg-card text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {pill.label}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setShowCustomModal(true)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer",
                  selectedRange === "custom"
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Calendar className="size-3" />
                <span>{selectedRange === "custom" ? "Custom" : "Date"}</span>
              </button>
            </div>

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadDashboard(true)}
              disabled={loading || refreshing}
              title="Bypass server cache and fetch fresh aggregates"
              className="gap-1.5"
            >
              <RefreshCw className={cn("size-3.5", (refreshing || loading) && "animate-spin text-primary")} />
              <span>Refresh</span>
            </Button>
          </div>
        }
      />

      {/* Error Alert */}
      {error && (
        <ErrorState
          title="Could not load dashboard data"
          message={error}
          onRetry={() => loadDashboard(true)}
        />
      )}

      {/* Loading Skeleton */}
      {loading && !data ? (
        <div className="space-y-6">
          <LoadingState type="cards" />
          <LoadingState type="table" rows={6} />
        </div>
      ) : data ? (
        <>
          {/* Top KPI Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Users"
              value={data.metrics.users.total.toLocaleString()}
              description={`+${data.metrics.users.newInPeriod} in selected period`}
              trend={{
                value: `${data.metrics.users.growthPct >= 0 ? "+" : ""}${data.metrics.users.growthPct}% vs prev`,
                positive: data.metrics.users.growthPct >= 0,
              }}
              icon={<Users className="size-4" />}
              variant="primary"
            />

            <MetricCard
              title="Active Users"
              value={data.metrics.users.active.toLocaleString()}
              description={`${Math.round((data.metrics.users.active / Math.max(1, data.metrics.users.total)) * 100)}% of total users`}
              trend={{ value: "Engagement", neutral: true }}
              icon={<Activity className="size-4" />}
              variant="info"
            />

            <MetricCard
              title="Posts & Reels"
              value={data.metrics.content.totalPosts.toLocaleString()}
              description={`${data.metrics.content.totalReels} Video Reels · ${data.metrics.content.totalComments} Comments`}
              icon={<Layers className="size-4" />}
              variant="success"
            />

            <MetricCard
              title="Reports Queue"
              value={data.metrics.moderation.pendingReports}
              description={`${data.metrics.moderation.highPriorityReports} High Priority · ${data.metrics.moderation.resolutionRatePct}% Resolved`}
              variant={data.metrics.moderation.highPriorityReports > 0 ? "danger" : "default"}
              icon={<ShieldAlert className="size-4" />}
            />

            <MetricCard
              title="Interactions"
              value={data.metrics.engagement.totalInteractions.toLocaleString()}
              description={`${data.metrics.engagement.totalLikes.toLocaleString()} Likes · ${data.metrics.engagement.totalBookmarks.toLocaleString()} Bookmarks`}
              icon={<TrendingUp className="size-4" />}
              variant="warning"
            />

            <MetricCard
              title="Communities"
              value={data.metrics.content.totalCommunities}
              description="Active public & private pet circles"
              icon={<MessageSquare className="size-4" />}
              variant="default"
            />

            <MetricCard
              title="Cloud Media"
              value={`${data.metrics.storage.formattedMB} MB`}
              description={`${data.metrics.storage.mediaFilesCount} files (${data.metrics.storage.imagesCount} Img / ${data.metrics.storage.videosCount} Vid)`}
              icon={<HardDrive className="size-4" />}
              variant="default"
            />

            <MetricCard
              title="Database Ping"
              value={`${data.widgets.systemHealth.dbLatencyMs} ms`}
              description={`Status: ${data.widgets.systemHealth.status} · Uptime: ${data.widgets.systemHealth.uptimeFormatted}`}
              icon={<Server className="size-4" />}
              variant="success"
            />
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

      {/* Custom Date Range Picker Dialog */}
      <Dialog open={showCustomModal} onOpenChange={setShowCustomModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold font-heading">
              <Calendar className="size-4 text-primary" />
              Custom Analytics Range
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleApplyCustomDate} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Start Date
              </label>
              <Input
                type="date"
                required
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                End Date
              </label>
              <Input
                type="date"
                required
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
              />
            </div>

            <DialogFooter className="mt-4 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowCustomModal(false)}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm">
                Apply Range
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
