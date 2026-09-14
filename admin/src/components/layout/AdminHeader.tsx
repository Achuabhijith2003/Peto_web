import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { StatusBadge } from "../ui/StatusBadge";
import {
  Shield,
  LogOut,
  ChevronDown,
  KeyRound,
  Clock,
  Bell,
  CheckCheck,
  ExternalLink,
  ShieldAlert,
  AlertOctagon,
  HardDrive,
  Activity,
  Lock,
  Scale,
  Megaphone,
  FileText,
} from "lucide-react";
import {
  fetchAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
} from "../../api/adminApi";
import { AdminNotificationItem, AdminNotificationCategory } from "../../types/admin";

export const AdminHeader: React.FC = () => {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();

  // Profile dropdown state
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Notification dropdown state
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [criticalCount, setCriticalCount] = useState<number>(0);
  const [notifFilter, setNotifFilter] = useState<"all" | "unread" | "critical">("all");
  const [markingAll, setMarkingAll] = useState<boolean>(false);

  // Load notifications (visibility-aware to conserve resources)
  const loadNotifications = useCallback(async () => {
    if (!admin) return;
    if (typeof document !== "undefined" && document.visibilityState === "hidden") {
      return;
    }
    try {
      const res = await fetchAdminNotifications({ limit: 10 });
      setNotifications(res.notifications);
      setUnreadCount(res.unread_count);
      setCriticalCount(res.critical_count);
    } catch (_) {
      // Graceful silence on background polling
    }
  }, [admin]);

  useEffect(() => {
    if (!admin) return;
    loadNotifications();

    const interval = setInterval(loadNotifications, 30000); // 30s background check
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        loadNotifications();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [loadNotifications, admin]);

  // Click outside listener for both dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Mark single notification read & optionally navigate
  const handleNotificationClick = async (notif: AdminNotificationItem) => {
    if (!notif.is_read) {
      try {
        await markAdminNotificationRead(notif.id, true);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
        if (notif.priority === "CRITICAL") {
          setCriticalCount((prev) => Math.max(0, prev - 1));
        }
      } catch (err) {
        console.error("Failed to mark notification read:", err);
      }
    }

    setNotifOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  // Mark all notifications read
  const handleMarkAllRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
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
        return <ShieldAlert className="w-4 h-4 text-rose-400" />;
      case "PENDING_MODERATION":
        return <FileText className="w-4 h-4 text-amber-400" />;
      case "PENDING_ADVERTISEMENT":
        return <Megaphone className="w-4 h-4 text-pink-400" />;
      case "SYSTEM_FAILURE":
        return <AlertOctagon className="w-4 h-4 text-rose-500" />;
      case "STORAGE_WARNING":
        return <HardDrive className="w-4 h-4 text-amber-400" />;
      case "API_ERROR_SPIKE":
        return <Activity className="w-4 h-4 text-orange-400" />;
      case "SECURITY_EVENT":
        return <Lock className="w-4 h-4 text-red-400" />;
      case "COMPLIANCE_REQUEST":
        return <Scale className="w-4 h-4 text-purple-400" />;
      default:
        return <Bell className="w-4 h-4 text-indigo-400" />;
    }
  };

  // Format relative timestamp
  const formatTimeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  // Filter dropdown items
  const filteredNotifications = notifications.filter((n) => {
    if (notifFilter === "unread") return !n.is_read;
    if (notifFilter === "critical") return n.priority === "CRITICAL";
    return true;
  });

  return (
    <header className="h-16 bg-white/90 backdrop-blur border-b border-[#e2e8f8] px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left side: System status & Environment */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-[#e8f7f0] border border-[#a3e5c7] text-xs">
          <span className="w-2 h-2 rounded-full bg-[#006c49] animate-pulse"></span>
          <span className="text-[#006c49] font-medium font-heading">Peto Operational Network</span>
          <span className="text-[#006c49]/70 font-mono text-[10px]">v1.0-alpha</span>
        </div>
      </div>

      {/* Right side: Notifications Bell & Admin Profile */}
      <div className="flex items-center space-x-3">
        {/* Phase 9: Admin Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setNotifOpen(!notifOpen);
              if (!notifOpen) loadNotifications();
            }}
            aria-label="Admin Notifications"
            className="relative p-2 rounded-xl text-[#534434] hover:text-[#151c27] hover:bg-[#f0f3ff] transition-colors border border-transparent hover:border-[#dae2f3]"
          >
            <Bell className="w-5 h-5" />

            {/* Unread badge with priority pulse */}
            {unreadCount > 0 && (
              <span
                className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white ${
                  criticalCount > 0
                    ? "bg-[#ba1a1a] animate-pulse shadow-md shadow-[#ba1a1a]/30"
                    : "bg-[#f59e0b] shadow-sm"
                }`}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-96 bg-white border border-[#e2e8f8] rounded-2xl shadow-level-3 py-0 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Dropdown Header */}
              <div className="px-4 py-3 bg-white border-b border-[#e2e8f8] flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-[#151c27] font-heading">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#fff3d6] text-[#855300] border border-[#fbd988]">
                      {unreadCount} unread
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    disabled={markingAll}
                    className="text-xs text-[#0058be] hover:text-[#2170e4] font-medium flex items-center space-x-1 transition-colors disabled:opacity-50"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="px-3 pt-2 pb-1.5 flex items-center space-x-1 border-b border-[#e2e8f8] bg-[#f9f9ff] text-xs">
                <button
                  onClick={() => setNotifFilter("all")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    notifFilter === "all"
                      ? "bg-white text-[#0058be] shadow-xs border border-[#bed7fc] font-semibold"
                      : "text-[#534434] hover:text-[#151c27]"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setNotifFilter("unread")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    notifFilter === "unread"
                      ? "bg-white text-[#0058be] shadow-xs border border-[#bed7fc] font-semibold"
                      : "text-[#534434] hover:text-[#151c27]"
                  }`}
                >
                  Unread ({unreadCount})
                </button>
                <button
                  onClick={() => setNotifFilter("critical")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    notifFilter === "critical"
                      ? "bg-[#ffdad6] text-[#ba1a1a] shadow-xs border border-[#ffb4ab] font-semibold"
                      : "text-[#534434] hover:text-[#151c27]"
                  }`}
                >
                  Critical ({criticalCount})
                </button>
              </div>

              {/* Notification List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-[#e2e8f8]">
                {filteredNotifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[#534434] text-xs">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#534434]" />
                    <p className="font-semibold text-[#151c27] font-heading">No notifications found</p>
                    <p className="text-[11px] text-[#534434] mt-0.5">
                      {notifFilter === "unread"
                        ? "All caught up! No unread notifications."
                        : "No alerts match this filter."}
                    </p>
                  </div>
                ) : (
                  filteredNotifications.map((n) => (
                    <div
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className={`p-3.5 hover:bg-[#f0f3ff] transition-colors cursor-pointer flex items-start space-x-3 ${
                        !n.is_read ? "bg-[#f9f9ff]" : "bg-white"
                      }`}
                    >
                      {/* Category Icon */}
                      <div
                        className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center border ${
                          n.priority === "CRITICAL"
                            ? "bg-[#ffdad6] border-[#ffb4ab] text-[#ba1a1a]"
                            : n.priority === "HIGH"
                            ? "bg-[#fff3d6] border-[#fbd988] text-[#855300]"
                            : "bg-[#f0f3ff] border-[#dae2f3] text-[#0058be]"
                        }`}
                      >
                        {getCategoryIcon(n.category)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-xs truncate ${
                              !n.is_read ? "text-[#151c27] font-bold" : "text-[#534434] font-medium"
                            }`}
                          >
                            {n.title}
                          </span>
                          {!n.is_read && (
                            <span className="w-2 h-2 rounded-full bg-[#f59e0b] shrink-0 ml-2"></span>
                          )}
                        </div>

                        <p className="text-[11px] text-[#534434] line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>

                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-[#e2e8f8] text-[10px] text-[#534434]/70">
                          <span className="font-mono">{formatTimeAgo(n.created_at)}</span>
                          {n.link && (
                            <span className="text-[#0058be] font-medium flex items-center space-x-0.5 hover:underline">
                              <span>Action</span>
                              <ExternalLink className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Dropdown Footer: Link to Full Notifications Center */}
              <div className="p-2.5 bg-[#f9f9ff] border-t border-[#e2e8f8] text-center">
                <Link
                  to="/notifications"
                  onClick={() => setNotifOpen(false)}
                  className="inline-flex items-center justify-center space-x-1.5 text-xs font-semibold text-[#0058be] hover:text-[#2170e4] transition-colors w-full py-1.5 rounded-lg hover:bg-white"
                >
                  <span>Open Notification Center</span>
                  <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        {admin && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center space-x-3 p-1.5 pr-3 rounded-xl hover:bg-[#f0f3ff] transition-colors border border-transparent hover:border-[#dae2f3]"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#0058be] text-white flex items-center justify-center font-bold text-sm shadow-xs">
                {admin.avatarUrl ? (
                  <img
                    src={admin.avatarUrl}
                    alt={admin.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  admin.fullName.charAt(0).toUpperCase()
                )}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-[#151c27] leading-tight">
                  {admin.fullName}
                </div>
                <div className="text-[11px] text-[#534434]">@{admin.username}</div>
              </div>
              <ChevronDown className="w-4 h-4 text-[#534434]" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-[#e2e8f8] rounded-2xl shadow-level-3 py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-3 border-b border-[#e2e8f8]">
                  <p className="text-xs text-[#534434] font-medium">Signed in as</p>
                  <p className="text-sm font-bold text-[#151c27] font-heading truncate">{admin.fullName}</p>
                  <p className="text-xs text-[#534434] font-mono truncate mb-2">@{admin.username}</p>
                  <div className="flex items-center justify-between pt-1">
                    <StatusBadge type="role" value={admin.role.name} />
                    <span className="text-[11px] text-[#0058be] flex items-center font-mono font-medium">
                      <KeyRound className="w-3 h-3 mr-1" />
                      {admin.role.name === "Super Admin" ? "All Permissions" : `${admin.permissions.length} perms`}
                    </span>
                  </div>
                </div>

                <div className="px-4 py-2 text-[11px] text-[#534434] space-y-1 border-b border-[#e2e8f8]">
                  <div className="flex items-center text-[#534434]">
                    <Clock className="w-3.5 h-3.5 mr-2 text-[#534434]/60" />
                    <span>Last Login: {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleTimeString() : "Current Session"}</span>
                  </div>
                  <div className="flex items-center text-[#534434]">
                    <Shield className="w-3.5 h-3.5 mr-2 text-[#006c49]" />
                    <span>RBAC: Server-Side Enforced</span>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-semibold text-[#ba1a1a] hover:bg-[#ffdad6]/40 hover:text-[#93000a] flex items-center transition-colors"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out of Admin Control Center
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
