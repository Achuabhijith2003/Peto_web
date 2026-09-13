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

  // Load notifications
  const loadNotifications = useCallback(async () => {
    try {
      const res = await fetchAdminNotifications({ limit: 10 });
      setNotifications(res.notifications);
      setUnreadCount(res.unread_count);
      setCriticalCount(res.critical_count);
    } catch (_) {
      // Graceful silence on background polling
    }
  }, []);

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // 30s background check
    return () => clearInterval(interval);
  }, [loadNotifications]);

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
    <header className="h-16 bg-slate-900/80 backdrop-blur border-b border-slate-800 px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Left side: System status & Environment */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="text-slate-300 font-medium">Peto Operational Network</span>
          <span className="text-slate-500 font-mono text-[10px]">v1.0-alpha</span>
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
            className="relative p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-700"
          >
            <Bell className="w-5 h-5" />

            {/* Unread badge with priority pulse */}
            {unreadCount > 0 && (
              <span
                className={`absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center text-white ${
                  criticalCount > 0
                    ? "bg-rose-600 animate-pulse shadow-lg shadow-rose-600/40"
                    : "bg-indigo-600 shadow-md shadow-indigo-600/30"
                }`}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown */}
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-96 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl py-0 z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Dropdown Header */}
              <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-bold text-slate-100">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {unreadCount} unread
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    disabled={markingAll}
                    className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center space-x-1 transition-colors disabled:opacity-50"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="px-3 pt-2 pb-1.5 flex items-center space-x-1 border-b border-slate-800/60 bg-slate-950/40 text-xs">
                <button
                  onClick={() => setNotifFilter("all")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    notifFilter === "all"
                      ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setNotifFilter("unread")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    notifFilter === "unread"
                      ? "bg-indigo-600/20 text-indigo-400 border border-indigo-500/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Unread ({unreadCount})
                </button>
                <button
                  onClick={() => setNotifFilter("critical")}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    notifFilter === "critical"
                      ? "bg-rose-600/20 text-rose-400 border border-rose-500/30"
                      : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Critical ({criticalCount})
                </button>
              </div>

              {/* Notification List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/50">
                {filteredNotifications.length === 0 ? (
                  <div className="px-4 py-8 text-center text-slate-500 text-xs">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                    <p className="font-medium text-slate-400">No notifications found</p>
                    <p className="text-[11px] text-slate-600 mt-0.5">
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
                      className={`p-3.5 hover:bg-slate-800/60 transition-colors cursor-pointer flex items-start space-x-3 ${
                        !n.is_read ? "bg-slate-800/25" : ""
                      }`}
                    >
                      {/* Category Icon */}
                      <div
                        className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center border ${
                          n.priority === "CRITICAL"
                            ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                            : n.priority === "HIGH"
                            ? "bg-orange-500/10 border-orange-500/30 text-orange-400"
                            : "bg-slate-800 border-slate-700 text-slate-300"
                        }`}
                      >
                        {getCategoryIcon(n.category)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-xs font-semibold truncate ${
                              !n.is_read ? "text-slate-100" : "text-slate-300"
                            }`}
                          >
                            {n.title}
                          </span>
                          {!n.is_read && (
                            <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 ml-2"></span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {n.message}
                        </p>

                        <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-800/40 text-[10px] text-slate-500">
                          <span className="font-mono">{formatTimeAgo(n.created_at)}</span>
                          {n.link && (
                            <span className="text-indigo-400 flex items-center space-x-0.5">
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
              <div className="p-2.5 bg-slate-900 border-t border-slate-800 text-center">
                <Link
                  to="/notifications"
                  onClick={() => setNotifOpen(false)}
                  className="inline-flex items-center justify-center space-x-1.5 text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors w-full py-1.5 rounded-lg hover:bg-slate-800/50"
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
              className="flex items-center space-x-3 p-1.5 pr-3 rounded-lg hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-700"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400 font-semibold text-sm">
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
                <div className="text-xs font-semibold text-slate-200 leading-tight">
                  {admin.fullName}
                </div>
                <div className="text-[11px] text-slate-400">@{admin.username}</div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {dropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-4 py-3 border-b border-slate-800">
                  <p className="text-xs text-slate-400 font-medium">Signed in as</p>
                  <p className="text-sm font-bold text-slate-100 truncate">{admin.fullName}</p>
                  <p className="text-xs text-slate-400 font-mono truncate mb-2">@{admin.username}</p>
                  <div className="flex items-center justify-between pt-1">
                    <StatusBadge type="role" value={admin.role.name} />
                    <span className="text-[11px] text-indigo-400 flex items-center font-mono">
                      <KeyRound className="w-3 h-3 mr-1" />
                      {admin.role.name === "Super Admin" ? "All Permissions" : `${admin.permissions.length} perms`}
                    </span>
                  </div>
                </div>

                <div className="px-4 py-2 text-[11px] text-slate-400 space-y-1 border-b border-slate-800">
                  <div className="flex items-center text-slate-400">
                    <Clock className="w-3.5 h-3.5 mr-2 text-slate-500" />
                    <span>Last Login: {admin.lastLoginAt ? new Date(admin.lastLoginAt).toLocaleTimeString() : "Current Session"}</span>
                  </div>
                  <div className="flex items-center text-slate-400">
                    <Shield className="w-3.5 h-3.5 mr-2 text-slate-500" />
                    <span>RBAC: Server-Side Enforced</span>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      logout();
                    }}
                    className="w-full px-4 py-2 text-left text-xs font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 flex items-center transition-colors"
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
