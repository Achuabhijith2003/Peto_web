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
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ffdad6] text-[#ba1a1a] border border-[#ffb4ab] animate-pulse">
            <AlertTriangle className="w-3 h-3 mr-1 text-[#ba1a1a]" />
            CRITICAL
          </span>
        );
      case "HIGH":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#fff3d6] text-[#855300] border border-[#fbd988]">
            HIGH
          </span>
        );
      case "MEDIUM":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#feece0] text-[#855300] border border-[#fed1b4]">
            MEDIUM
          </span>
        );
      case "LOW":
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#f0f3ff] text-[#534434] border border-[#dae2f3]">
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
            <div className="w-10 h-10 rounded-2xl bg-[#feece0] border border-[#fed1b4] flex items-center justify-center text-[#855300] shadow-xs">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-[#151c27] font-heading flex items-center">
                Admin Notification Center
                {unreadCount > 0 && (
                  <span className="ml-2.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#fff3d6] text-[#855300] border border-[#fbd988]">
                    {unreadCount} Unread
                  </span>
                )}
              </h1>
              <p className="text-xs text-[#534434] mt-0.5">
                Real-time operational alerts, high-priority moderation, and infrastructure warnings
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => loadNotifications(pagination.page)}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#f0f3ff] text-[#151c27] text-xs font-semibold border border-[#e2e8f8] shadow-xs transition-colors flex items-center space-x-1.5 cursor-pointer"
            title="Refresh alerts"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-[#0058be]" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleMarkAllRead}
            disabled={markingAll || unreadCount === 0}
            className="px-4 py-2 rounded-xl bg-[#0058be] hover:bg-[#2170e4] disabled:opacity-50 text-white text-xs font-semibold shadow-sm transition-all flex items-center space-x-1.5 cursor-pointer"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark All as Read</span>
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-[#e2e8f8] shadow-level-1 flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#e7eefe] border border-[#bed7fc] flex items-center justify-center text-[#0058be]">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#151c27] font-heading tracking-tight">{pagination.totalCount}</div>
            <div className="text-xs text-[#534434] font-medium">Total Alerts Tracked</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#e2e8f8] shadow-level-1 flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#fff3d6] border border-[#fbd988] flex items-center justify-center text-[#855300]">
            <Eye className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#855300] font-heading tracking-tight">{unreadCount}</div>
            <div className="text-xs text-[#534434] font-medium">Awaiting Action (Unread)</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#e2e8f8] shadow-level-1 flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#ffdad6] border border-[#ffb4ab] flex items-center justify-center text-[#ba1a1a]">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#ba1a1a] font-heading tracking-tight">{criticalCount}</div>
            <div className="text-xs text-[#534434] font-medium">Critical Priority Alerts</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-[#e2e8f8] shadow-level-1 flex items-center space-x-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#e8f7f0] border border-[#a3e5c7] flex items-center justify-center text-[#006c49]">
            <Check className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-[#006c49] font-heading tracking-tight">
              {Math.max(0, pagination.totalCount - unreadCount)}
            </div>
            <div className="text-xs text-[#534434] font-medium">Resolved / Acknowledged</div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-[#e2e8f8] shadow-level-1 space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Status Tabs */}
          <div className="flex items-center space-x-1.5 p-1 bg-[#f0f3ff] rounded-xl border border-[#e2e8f8] text-xs font-medium w-fit">
            <button
              onClick={() => setStatusFilter("all")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                statusFilter === "all"
                  ? "bg-white text-[#0058be] font-semibold shadow-xs border border-[#bed7fc]"
                  : "text-[#534434] hover:text-[#151c27]"
              }`}
            >
              All Alerts
            </button>
            <button
              onClick={() => setStatusFilter("unread")}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1 cursor-pointer ${
                statusFilter === "unread"
                  ? "bg-white text-[#0058be] font-semibold shadow-xs border border-[#bed7fc]"
                  : "text-[#534434] hover:text-[#151c27]"
              }`}
            >
              <span>Unread</span>
              {unreadCount > 0 && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]"></span>
              )}
            </button>
            <button
              onClick={() => setStatusFilter("read")}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                statusFilter === "read"
                  ? "bg-white text-[#0058be] font-semibold shadow-xs border border-[#bed7fc]"
                  : "text-[#534434] hover:text-[#151c27]"
              }`}
            >
              Read
            </button>
          </div>

          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-[#534434] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notifications by title or message..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-[#f0f3ff] border border-[#dae2f3] text-xs text-[#151c27] placeholder-[#534434]/60 focus:outline-none focus:bg-white focus:border-[#0058be] transition-colors"
            />
          </div>
        </div>

        {/* Dimension Selectors */}
        <div className="flex flex-wrap items-center gap-2.5 pt-2 border-t border-[#e2e8f8] text-xs">
          <div className="flex items-center space-x-1 text-[#534434] font-medium mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg bg-[#f0f3ff] border border-[#dae2f3] text-[#151c27] text-xs focus:outline-none focus:bg-white focus:border-[#0058be]"
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
            className="px-2.5 py-1.5 rounded-lg bg-[#f0f3ff] border border-[#dae2f3] text-[#151c27] text-xs focus:outline-none focus:bg-white focus:border-[#0058be]"
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
              className="text-xs text-[#0058be] hover:text-[#2170e4] font-semibold ml-auto transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-2.5">
        {loading && notifications.length === 0 ? (
          <div className="py-16 text-center text-[#534434] text-xs">
            <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin text-[#0058be]" />
            <p className="font-semibold text-[#151c27] font-heading">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-white border border-[#e2e8f8] shadow-level-1 text-[#534434]">
            <Bell className="w-12 h-12 mx-auto mb-3 text-[#534434]/40" />
            <p className="text-sm font-semibold text-[#151c27] font-heading">No alerts match your criteria</p>
            <p className="text-xs text-[#534434] mt-1 max-w-sm mx-auto">
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
                    ? "bg-white border-[#bed7fc] shadow-level-2"
                    : "bg-white border-[#e2e8f8] shadow-level-1 hover:border-[#dae2f3]"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                    {/* Category Icon Container */}
                    <div
                      className={`w-10 h-10 rounded-xl shrink-0 flex items-center justify-center border ${
                        n.priority === "CRITICAL"
                          ? "bg-[#ffdad6] border-[#ffb4ab] text-[#ba1a1a]"
                          : n.priority === "HIGH"
                          ? "bg-[#fff3d6] border-[#fbd988] text-[#855300]"
                          : "bg-[#f0f3ff] border-[#dae2f3] text-[#0058be]"
                      }`}
                    >
                      {getCategoryIcon(n.category)}
                    </div>

                    {/* Headline and body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span
                          className={`text-sm truncate ${
                            !n.is_read ? "text-[#151c27] font-bold font-heading" : "text-[#151c27] font-medium"
                          }`}
                        >
                          {n.title}
                        </span>

                        {renderPriorityBadge(n.priority)}

                        <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#f0f3ff] text-[#534434] border border-[#dae2f3]">
                          {n.category.replaceAll("_", " ")}
                        </span>

                        {!n.is_read && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-[#f59e0b] text-white">
                            NEW
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#534434] leading-relaxed max-w-3xl">
                        {n.message}
                      </p>

                      {/* Metadata Details Toggle */}
                      {n.metadata && Object.keys(n.metadata).length > 0 && (
                        <div className="mt-2.5">
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : n.id)}
                            className="text-[11px] text-[#0058be] hover:text-[#2170e4] flex items-center space-x-1 font-semibold transition-colors cursor-pointer"
                          >
                            <Info className="w-3 h-3" />
                            <span>{isExpanded ? "Hide Metadata" : "Inspect Metadata Details"}</span>
                          </button>

                          {isExpanded && (
                            <div className="mt-2 p-3 rounded-xl bg-[#f9f9ff] border border-[#e2e8f8] text-[11px] font-mono text-[#151c27] max-w-xl overflow-x-auto">
                              <pre>{JSON.stringify(n.metadata, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions & Timestamp */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-[#e2e8f8]">
                    <span className="text-[11px] text-[#534434] font-mono" title={new Date(n.created_at).toLocaleString()}>
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
                          className="px-2.5 py-1.5 rounded-lg bg-[#e7eefe] hover:bg-[#d5e3fc] text-[#0058be] border border-[#bed7fc] text-xs font-semibold transition-colors flex items-center space-x-1 cursor-pointer"
                        >
                          <span>Take Action</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      )}

                      <button
                        onClick={(e) => handleToggleRead(n, e)}
                        className={`p-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center cursor-pointer ${
                          n.is_read
                            ? "bg-[#f0f3ff] hover:bg-[#e2e8f8] border-[#dae2f3] text-[#534434]"
                            : "bg-[#e8f7f0] hover:bg-[#c9f1de] border-[#a3e5c7] text-[#006c49]"
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
        <div className="p-4 rounded-2xl bg-white border border-[#e2e8f8] shadow-level-1 flex items-center justify-between text-xs text-[#534434]">
          <div>
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of{" "}
            {pagination.totalCount} notifications
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => loadNotifications(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-lg bg-[#f0f3ff] hover:bg-[#e2e8f8] disabled:opacity-40 text-[#151c27] disabled:hover:bg-[#f0f3ff] transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-mono text-[#151c27] font-semibold px-1">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => loadNotifications(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="p-1.5 rounded-lg bg-[#f0f3ff] hover:bg-[#e2e8f8] disabled:opacity-40 text-[#151c27] disabled:hover:bg-[#f0f3ff] transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
