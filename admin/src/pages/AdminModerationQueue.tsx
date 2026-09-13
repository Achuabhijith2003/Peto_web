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
        return <FileText className="w-4 h-4 text-cyan-400" />;
      case "reel":
        return <Film className="w-4 h-4 text-purple-400" />;
      case "comment":
        return <MessageSquare className="w-4 h-4 text-amber-400" />;
      case "user":
        return <User className="w-4 h-4 text-emerald-400" />;
      case "community":
        return <Users className="w-4 h-4 text-indigo-400" />;
      default:
        return <ShieldAlert className="w-4 h-4 text-slate-400" />;
    }
  };

  const getPriorityBadge = (priority: ReportPriority) => {
    switch (priority) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
            Critical
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
            High
          </span>
        );
      case "MEDIUM":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            Medium
          </span>
        );
      case "LOW":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
            Low
          </span>
        );
    }
  };

  const getStatusBadge = (status: ReportStatus) => {
    switch (status) {
      case "PENDING":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/30">
            <Clock className="w-3 h-3 mr-1 text-amber-400" /> Pending
          </span>
        );
      case "UNDER_REVIEW":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
            <RefreshCw className="w-3 h-3 mr-1 text-cyan-400 animate-spin" /> In Review
          </span>
        );
      case "ESCALATED":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-300 border border-purple-500/30">
            <TrendingUp className="w-3 h-3 mr-1 text-purple-400" /> Escalated
          </span>
        );
      case "RESOLVED":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" /> Resolved
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            <XCircle className="w-3 h-3 mr-1 text-slate-400" /> Rejected
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center">
            <ShieldAlert className="w-7 h-7 mr-3 text-rose-400" />
            Content Moderation & Reports
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Centralized queue for reviewing and taking action on reported posts, reels, comments, communities, and accounts.
          </p>
        </div>
        <button
          onClick={() => loadReports(pagination.page)}
          className="inline-flex items-center px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors shadow-sm cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-2 ${loading ? "animate-spin" : ""}`} />
          Refresh Queue
        </button>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900 border border-amber-500/20 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-300 uppercase tracking-wider">Pending Action</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">{metrics.pendingCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Requires initial moderator review</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-cyan-500/20 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-cyan-300 uppercase tracking-wider">Under Review</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <RefreshCw className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">{metrics.underReviewCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Currently assigned to moderator</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-purple-500/20 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-purple-300 uppercase tracking-wider">Escalated</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">{metrics.escalatedCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Flagged for senior administrator</div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900 border border-emerald-500/20 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">Resolved</span>
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-bold text-white mt-2 font-mono">{metrics.resolvedCount}</div>
          <div className="text-[11px] text-slate-400 mt-1">Actions executed or dismissed</div>
        </div>
      </div>

      {/* Main Filter & Table Container */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Status Tabs */}
        <div className="flex items-center border-b border-slate-800 overflow-x-auto px-4 pt-2">
          {statusTabs.map((tab) => {
            const active = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium text-xs whitespace-nowrap transition-colors cursor-pointer ${
                  active
                    ? "border-indigo-500 text-white font-semibold"
                    : "border-transparent text-slate-400 hover:text-slate-200"
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                      active ? "bg-indigo-500/30 text-indigo-200" : "bg-slate-800 text-slate-400"
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
        <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/60">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search reports by reason, target ID, or notes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center space-x-3">
            {/* Target Type Filter */}
            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
              <Filter className="w-3.5 h-3.5" />
              <span>Target:</span>
              <select
                value={targetTypeFilter}
                onChange={(e) => setTargetTypeFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
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
            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
              <span>Priority:</span>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
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
          <div className="m-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Table Content */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-indigo-400" />
            <p className="text-xs">Loading moderation reports...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-400/80 mx-auto" />
            <div className="text-base font-semibold text-slate-200">No Reports in Queue</div>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              There are no reports matching your active filters. All clean!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-400 border-b border-slate-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-6 py-3.5">Target</th>
                  <th className="px-6 py-3.5">Reason & Details</th>
                  <th className="px-6 py-3.5">Priority</th>
                  <th className="px-6 py-3.5">Reporter</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Reported</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {reports.map((report) => (
                  <tr key={report.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* Target Type & ID */}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2.5">
                        <div className="p-2 rounded-xl bg-slate-800 border border-slate-700/60">
                          {getTargetIcon(report.target_type)}
                        </div>
                        <div>
                          <span className="font-semibold text-white capitalize block">
                            {report.target_type}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {report.target_id.slice(0, 12)}...
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Reason & Description Snippet */}
                    <td className="px-6 py-4 max-w-xs">
                      <div className="font-semibold text-slate-200 line-clamp-1">{report.reason}</div>
                      {report.description && (
                        <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {report.description}
                        </div>
                      )}
                    </td>

                    {/* Priority */}
                    <td className="px-6 py-4">{getPriorityBadge(report.priority)}</td>

                    {/* Reporter */}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        {report.reporter.avatar_url ? (
                          <img
                            src={report.reporter.avatar_url}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400">
                            {report.reporter.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="text-slate-300 font-medium font-mono text-[11px]">
                          @{report.reporter.username}
                        </span>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4">{getStatusBadge(report.status)}</td>

                    {/* Date */}
                    <td className="px-6 py-4 text-slate-400 text-[11px]">
                      {new Date(report.created_at).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <Link
                        to={`/moderation/${report.id}`}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1.5" />
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing page <strong className="text-white">{pagination.page}</strong> of{" "}
              <strong className="text-white">{pagination.totalPages}</strong> ({pagination.totalCount} total)
            </div>
            <div className="flex items-center space-x-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => loadReports(pagination.page - 1)}
                className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 text-slate-200 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadReports(pagination.page + 1)}
                className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 text-slate-200 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
