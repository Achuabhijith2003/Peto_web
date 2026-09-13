import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CheckCheck,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  AlertOctagon,
  HardDrive,
  Activity,
  Lock,
  Scale,
  Megaphone,
  FileText,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Check,
  Eye,
  Info,
} from "lucide-react";
import {
  fetchAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
} from "../api/adminApi";
import {
  AdminNotificationItem,
  AdminNotificationCategory,
  AdminNotificationPriority,
  PaginationInfo,
} from "../types/admin";

export const AdminNotifications: React.FC = () => {
  const navigate = useNavigate();

  // Data & State
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [criticalCount, setCriticalCount] = useState<number>(0);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 15,
    totalCount: 0,
    totalPages: 1,
  });

  // Filters
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  const [loading, setLoading] = useState<boolean>(true);
  const [markingAll, setMarkingAll] = useState<boolean>(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load notifications from API
  const loadNotifications = useCallback(
    async (pageNumber = 1) => {
      try {
        setLoading(true);
        const res = await fetchAdminNotifications({
          page: pageNumber,
          limit: 15,
          status: statusFilter,
          category: categoryFilter !== "ALL" ? categoryFilter : undefined,
          priority: priorityFilter !== "ALL" ? priorityFilter : undefined,
          search: debouncedSearch.trim() ? debouncedSearch.trim() : undefined,
        });

        setNotifications(res.notifications);
        setUnreadCount(res.unread_count);
        setCriticalCount(res.critical_count);
        setPagination(res.pagination);
      } catch (err) {
        console.error("Failed to load admin notifications:", err);
      } finally {
        setLoading(false);
      }
    },
    [statusFilter, categoryFilter, priorityFilter, debouncedSearch]
  );

  useEffect(() => {
    loadNotifications(1);
  }, [loadNotifications]);

  // Mark single notification read toggle
  const handleToggleRead = async (notif: AdminNotificationItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = !notif.is_read;
    try {
      await markAdminNotificationRead(notif.id, newStatus);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: newStatus } : n))
      );
      setUnreadCount((prev) => (newStatus ? Math.max(0, prev - 1) : prev + 1));
      if (notif.priority === "CRITICAL") {
        setCriticalCount((prev) => (newStatus ? Math.max(0, prev - 1) : prev + 1));
      }
    } catch (err) {
      console.error("Failed to toggle notification read status:", err);
    }
  };

  // Mark all notifications read
  const handleMarkAllRead = async () => {
    try {
      setMarkingAll(true);
      await markAllAdminNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
      setCriticalCount(0);
    } catch (err) {
      console.error("Failed to mark all notifications read:", err);
    } finally {
      setMarkingAll(false);
    }
  };

  // Helper for category icons
  const getCategoryIcon = (category: AdminNotificationCategory) => {
    switch (category) {
      case "HIGH_PRIORITY_REPORT":
        return <ShieldAlert className="w-5 h-5 text-rose-400" />;
      case "PENDING_MODERATION":
        return <FileText className="w-5 h-5 text-amber-400" />;
      case "PENDING_ADVERTISEMENT":
        return <Megaphone className="w-5 h-5 text-pink-400" />;
      case "SYSTEM_FAILURE":
        return <AlertOctagon className="w-5 h-5 text-rose-500" />;
      case "STORAGE_WARNING":
        return <HardDrive className="w-5 h-5 text-amber-400" />;
      case "API_ERROR_SPIKE":
        return <Activity className="w-5 h-5 text-orange-400" />;
      case "SECURITY_EVENT":
        return <Lock className="w-5 h-5 text-red-400" />;
      case "COMPLIANCE_REQUEST":
        return <Scale className="w-5 h-5 text-purple-400" />;
      default:
        return <Bell className="w-5 h-5 text-indigo-400" />;
    }
  };

  // Helper for priority badges
  const renderPriorityBadge = (priority: AdminNotificationPriority) => {
    switch (priority) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
            <AlertTriangle className="w-3 h-3 mr-1 text-rose-400" />
            CRITICAL
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/20 text-orange-300 border border-orange-500/40">
            HIGH
          </span>
        );
      case "MEDIUM":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
            MEDIUM
          </span>
        );
      case "LOW":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-700/50 text-slate-300 border border-slate-600/40">
            LOW
          </span>
        );
    }
  };

  // Relative time helper
  const formatTimeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Bulk Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center">
                Admin Notification Center
                {unreadCount > 0 && (
                  <span className="ml-2.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {unreadCount} Unread
                  </span>
                )}
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time operational alerts, high-priority moderation, and infrastructure warnings
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => loadNotifications(pagination.page)}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700/60 transition-colors flex items-center space-x-1.5"
            title="Refresh alerts"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-indigo-400" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleMarkAllRead}
            disabled={markingAll || unreadCount === 0}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition-all flex items-center space-x-1.5"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark All as Read</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-white tracking-tight">{pagination.totalCount}</div>
            <div className="text-xs text-slate-400 font-medium">Total Alerts Tracked</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-amber-300 tracking-tight">{unreadCount}</div>
            <div className="text-xs text-slate-400 font-medium">Awaiting Action (Unread)</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-rose-300 tracking-tight">{criticalCount}</div>
            <div className="text-xs text-slate-400 font-medium">Critical Priority Alerts</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Check className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-emerald-300 tracking-tight">
              {Math.max(0, pagination.totalCount - unreadCount)}
            </div>
            <div className="text-xs text-slate-400 font-medium">Resolved / Acknowledged</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center space-x-1.5 p-1 bg-slate-950/60 rounded-xl border border-slate-800 text-xs font-medium w-fit">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === "all"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All Alerts
            </button>
            <button
              onClick={() => setStatusFilter("unread")}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1 ${
                statusFilter === "unread"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
              )}
            </button>
            <button
              onClick={() => setStatusFilter("read")}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                statusFilter === "read"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Read
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications by title or message..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
        </div>

        {/* Dimension Selectors */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-slate-800/60 text-xs">
          <div className="flex items-center space-x-1 text-slate-400 font-medium mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Categories</option>
            <option value="HIGH_PRIORITY_REPORT">High-Priority Reports</option>
            <option value="PENDING_MODERATION">Pending Moderation</option>
            <option value="PENDING_ADVERTISEMENT">Pending Advertisements</option>
            <option value="SYSTEM_FAILURE">System Failures</option>
            <option value="STORAGE_WARNING">Storage Warnings</option>
            <option value="API_ERROR_SPIKE">API Error Spikes</option>
            <option value="SECURITY_EVENT">Security Events</option>
            <option value="COMPLIANCE_REQUEST">Compliance Requests</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-300 text-xs focus:outline-none focus:border-indigo-500"
          >
            <option value="ALL">All Priorities</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {(categoryFilter !== "ALL" || priorityFilter !== "ALL" || searchQuery) && (
            <button
              onClick={() => {
                setCategoryFilter("ALL");
                setPriorityFilter("ALL");
                setSearchQuery("");
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 ml-auto transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {loading && notifications.length === 0 ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-indigo-500/60" />
            <p className="font-medium text-slate-400">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-slate-900/40 border border-slate-800/60 text-slate-500">
            <Bell className="w-12 h-12 mx-auto mb-3 text-slate-600" />
            <p className="text-sm font-semibold text-slate-300">No alerts match your criteria</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Everything is running smoothly or no notifications match the selected category and priority filters.
            </p>
          </div>
        ) : (
          notifications.map((n) => {
            const isExpanded = expandedId === n.id;
            return (
              <div
                key={n.id}
                className={`p-4 rounded-2xl border transition-all ${
                  !n.is_read
                    ? "bg-slate-900/90 border-slate-700/80 shadow-md shadow-indigo-950/10"
                    : "bg-slate-900/40 border-slate-800/60 hover:border-slate-700/60"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                    {/* Category Icon Container */}
                    <div
                      className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center border ${
                        n.priority === "CRITICAL"
                          ? "bg-rose-500/10 border-rose-500/30 text-rose-400 shadow-sm shadow-rose-500/20"
                          : n.priority === "HIGH"
                          ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
                          : "bg-slate-800/80 border-slate-700 text-slate-300"
                      }`}
                    >
                      {getCategoryIcon(n.category)}
                    </div>

                    {/* Headline and body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className={`text-sm font-semibold truncate ${
                            !n.is_read ? "text-white" : "text-slate-300"
                          }`}
                        >
                          {n.title}
                        </span>

                        {renderPriorityBadge(n.priority)}

                        <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                          {n.category.replaceAll("_", " ")}
                        </span>

                        {!n.is_read && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500 text-white">
                            NEW
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                        {n.message}
                      </p>

                      {/* Metadata Details Toggle */}
                      {n.metadata && Object.keys(n.metadata).length > 0 && (
                        <div className="mt-2.5">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : n.id)}
                            className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 font-medium transition-colors"
                          >
                            <Info className="w-3 h-3" />
                            <span>{isExpanded ? "Hide Metadata" : "Inspect Metadata Details"}</span>
                          </button>

                          {isExpanded && (
                            <div className="mt-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-slate-300 max-w-xl overflow-x-auto">
                              <pre>{JSON.stringify(n.metadata, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions & Timestamp */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                    <span className="text-[11px] text-slate-500 font-mono" title={new Date(n.created_at).toLocaleString()}>
                      {formatTimeAgo(n.created_at)}
                    </span>

                    <div className="flex items-center space-x-2">
                      {n.link && (
                        <button
                          onClick={() => {
                            if (!n.is_read) {
                              markAdminNotificationRead(n.id, true);
                            }
                            navigate(n.link!);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-medium transition-colors flex items-center space-x-1"
                        >
                          <span>Take Action</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}

                      <button
                        onClick={(e) => handleToggleRead(n, e)}
                        className={`p-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center ${
                          n.is_read
                            ? "bg-slate-800/60 hover:bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
                            : "bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-400"
                        }`}
                        title={n.is_read ? "Mark as unread" : "Mark as read"}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination Footer */}
      {pagination.totalPages > 1 && (
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{" "}
            {pagination.totalCount} notifications
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => loadNotifications(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 disabled:hover:bg-slate-800 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-slate-300 px-1">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => loadNotifications(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 disabled:hover:bg-slate-800 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
