import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ShieldAlert,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  FileText,
  Film,
  MessageSquare,
  User,
  Users,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
} from "lucide-react";
import { fetchReportsQueue } from "../api/adminApi";
import {
  PetoReportItem,
  ReportStatus,
  ReportPriority,
  ReportTargetType,
  ModerationMetrics,
  PaginationInfo,
} from "../types/admin";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

export const AdminModerationQueue: React.FC = () => {
  const [reports, setReports] = useState<PetoReportItem[]>([]);
  const [metrics, setMetrics] = useState<ModerationMetrics>({
    pendingCount: 0,
    underReviewCount: 0,
    escalatedCount: 0,
    resolvedCount: 0,
    totalCount: 0,
  });
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 15,
    totalCount: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [targetTypeFilter, setTargetTypeFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [search, setSearch] = useState<string>("");

  const loadReports = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchReportsQueue({
        status: statusFilter,
        targetType: targetTypeFilter,
        priority: priorityFilter,
        search: search.trim() || undefined,
        page,
        limit: 15,
      });

      setReports(res.reports);
      setMetrics(res.metrics);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load moderation queue.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReports(1);
  }, [statusFilter, targetTypeFilter, priorityFilter, search]);

  const getTargetIcon = (type: ReportTargetType) => {
    switch (type) {
      case "post":
        return <FileText className="w-4 h-4 text-primary" />;
      case "reel":
        return <Film className="w-4 h-4 text-purple-500" />;
      case "comment":
        return <MessageSquare className="w-4 h-4 text-amber-500" />;
      case "user":
        return <User className="w-4 h-4 text-emerald-500" />;
      case "community":
        return <Users className="w-4 h-4 text-indigo-500" />;
      default:
        return <ShieldAlert className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getPriorityBadge = (priority: ReportPriority) => {
    switch (priority) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-destructive/15 text-destructive border border-destructive/30 animate-pulse font-mono">
            Critical
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-mono">
            High
          </span>
        );
      case "MEDIUM":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 font-mono">
            Medium
          </span>
        );
      case "LOW":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider bg-muted text-muted-foreground border border-border font-mono">
            Low
          </span>
        );
    }
  };

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3 mr-1" /> Pending
          </span>
        );
      case "UNDER_REVIEW":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> In Review
          </span>
        );
      case "ESCALATED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
            <TrendingUp className="w-3 h-3 mr-1" /> Escalated
          </span>
        );
      case "RESOLVED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Resolved
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border">
            <XCircle className="w-3 h-3 mr-1" /> Rejected
          </span>
        );
    }
  };

  const statusTabs = [
    { label: "All Reports", value: "ALL", count: metrics.totalCount },
    { label: "Pending", value: "PENDING", count: metrics.pendingCount },
    { label: "Under Review", value: "UNDER_REVIEW", count: metrics.underReviewCount },
    { label: "Escalated", value: "ESCALATED", count: metrics.escalatedCount },
    { label: "Resolved", value: "RESOLVED", count: metrics.resolvedCount },
    { label: "Rejected", value: "REJECTED" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Content Moderation & Reports"
        description="Centralized triage queue for reviewing and taking action on reported posts, reels, comments, communities, and accounts."
        breadcrumbs={[
          { label: "Trust & Safety", href: "/moderation" },
          { label: "Moderation Queue" },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadReports(pagination.page)}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh Queue
          </Button>
        }
      />

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-amber-500/5 border-amber-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider font-heading">Pending Action</span>
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground mt-2 font-heading">{metrics.pendingCount}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Requires initial moderator review</div>
        </Card>

        <Card className="p-4 bg-primary/5 border-primary/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-primary uppercase tracking-wider font-heading">Under Review</span>
            <div className="p-2 rounded-xl bg-primary/15 text-primary">
              <RefreshCw className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground mt-2 font-heading">{metrics.underReviewCount}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Currently assigned to moderator</div>
        </Card>

        <Card className="p-4 bg-orange-500/5 border-orange-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider font-heading">Escalated</span>
            <div className="p-2 rounded-xl bg-orange-500/15 text-orange-600 dark:text-orange-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground mt-2 font-heading">{metrics.escalatedCount}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Flagged for senior administrator</div>
        </Card>

        <Card className="p-4 bg-emerald-500/5 border-emerald-500/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider font-heading">Resolved</span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-foreground mt-2 font-heading">{metrics.resolvedCount}</div>
          <div className="text-[11px] text-muted-foreground mt-1">Actions executed or dismissed</div>
        </Card>
      </div>

      {/* Main Filter & Table Container */}
      <Card className="overflow-hidden">
        {/* Status Tabs */}
        <div className="flex items-center border-b border-border overflow-x-auto px-4 pt-2 bg-muted/20">
          {statusTabs.map((tab) => {
            const active = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium text-xs whitespace-nowrap transition-colors cursor-pointer ${
                  active
                    ? "border-primary text-primary font-bold"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                      active ? "bg-primary/10 text-primary font-bold" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filter Controls Bar */}
        <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search reports by reason, target ID, or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 text-xs h-9"
            />
          </div>

          <div className="flex items-center space-x-3">
            {/* Target Type Filter */}
            <div className="flex items-center space-x-1.5 text-xs text-muted-foreground">
              <Filter className="w-3.5 h-3.5" />
              <span>Target:</span>
              <select
                value={targetTypeFilter}
                onChange={(e) => setTargetTypeFilter(e.target.value)}
                className="bg-background border border-input rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="ALL">All Content</option>
                <option value="post">Posts</option>
                <option value="reel">Reels</option>
                <option value="comment">Comments</option>
                <option value="user">Users</option>
                <option value="community">Communities</option>
              </select>
            </div>

            {/* Priority Filter */}
            <div className="flex items-center space-x-1.5 text-xs text-muted-foreground">
              <span>Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-background border border-input rounded-xl px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="ALL">All Priorities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="m-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Table Content */}
        {loading ? (
          <div className="p-12 text-center text-muted-foreground space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-xs font-medium">Loading moderation reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
            <div className="text-base font-bold text-foreground font-heading">No Reports in Queue</div>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              There are no reports matching your active filters. All clean!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Target</TableHead>
                  <TableHead>Reason &amp; Details</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Reporter</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reported</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    {/* Target Type & ID */}
                    <TableCell>
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 rounded-xl bg-muted/60 border border-border">
                          {getTargetIcon(report.target_type)}
                        </div>
                        <div>
                          <span className="font-semibold text-foreground capitalize block">
                            {report.target_type}
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {report.target_id.slice(0, 12)}...
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    {/* Reason & Description Snippet */}
                    <TableCell className="max-w-xs">
                      <div className="font-semibold text-foreground line-clamp-1">{report.reason}</div>
                      {report.description && (
                        <div className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">
                          {report.description}
                        </div>
                      )}
                    </TableCell>

                    {/* Priority */}
                    <TableCell>{getPriorityBadge(report.priority)}</TableCell>

                    {/* Reporter */}
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        {report.reporter.avatar_url ? (
                          <img
                            src={report.reporter.avatar_url}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover border border-border"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">
                            {report.reporter.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-foreground font-medium font-mono text-[11px]">
                          @{report.reporter.username}
                        </span>
                      </div>
                    </TableCell>

                    {/* Status */}
                    <TableCell>{getStatusBadge(report.status)}</TableCell>

                    {/* Date */}
                    <TableCell className="text-muted-foreground text-[11px] font-mono">
                      {new Date(report.created_at).toLocaleDateString()}
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        render={<Link to={`/moderation/${report.id}`} />}
                        className="h-7 text-xs px-2.5"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <div>
              Showing page <strong className="text-foreground">{pagination.page}</strong> of{" "}
              <strong className="text-foreground">{pagination.totalPages}</strong> ({pagination.totalCount} total)
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => loadReports(pagination.page - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadReports(pagination.page + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
