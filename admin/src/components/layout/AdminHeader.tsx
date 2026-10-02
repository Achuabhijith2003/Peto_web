import React, { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { StatusBadge } from "../ui/StatusBadge";
import { ThemeSwitcher } from "./ThemeSwitcher";
import {
  Shield,
  LogOut,
  ChevronDown,
  Clock,
  Bell,
  CheckCheck,
  ShieldAlert,
  AlertOctagon,
  HardDrive,
  Activity,
  Lock,
  Scale,
  Megaphone,
  FileText,
  Menu,
  User,
  Sliders,
  History,
} from "lucide-react";
import {
  fetchAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
} from "../../api/adminApi";
import { AdminNotificationItem, AdminNotificationCategory } from "../../types/admin";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface AdminHeaderProps {
  onOpenMobileSidebar?: () => void;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ onOpenMobileSidebar }) => {
  const { admin, logout } = useAdminAuth();
  const navigate = useNavigate();

  // Profile menu state
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Notification state
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const [notifications, setNotifications] = useState<AdminNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [criticalCount, setCriticalCount] = useState<number>(0);
  const [notifFilter, setNotifFilter] = useState<"all" | "unread" | "critical">("all");
  const [markingAll, setMarkingAll] = useState<boolean>(false);

  // Load notifications
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

    const interval = setInterval(loadNotifications, 30000);
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

  // Click outside listener for notification and profile dropdowns
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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

  const getCategoryIcon = (category: AdminNotificationCategory) => {
    switch (category) {
      case "HIGH_PRIORITY_REPORT":
        return <ShieldAlert className="size-4 text-rose-500" />;
      case "PENDING_MODERATION":
        return <FileText className="size-4 text-amber-500" />;
      case "PENDING_ADVERTISEMENT":
        return <Megaphone className="size-4 text-pink-500" />;
      case "SYSTEM_FAILURE":
        return <AlertOctagon className="size-4 text-rose-500" />;
      case "STORAGE_WARNING":
        return <HardDrive className="size-4 text-amber-500" />;
      case "API_ERROR_SPIKE":
        return <Activity className="size-4 text-orange-500" />;
      case "SECURITY_EVENT":
        return <Lock className="size-4 text-red-500" />;
      case "COMPLIANCE_REQUEST":
        return <Scale className="size-4 text-purple-500" />;
      default:
        return <Bell className="size-4 text-primary" />;
    }
  };

  const formatTimeAgo = (dateStr: string) => {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const filteredNotifications = notifications.filter((n) => {
    if (notifFilter === "unread") return !n.is_read;
    if (notifFilter === "critical") return n.priority === "CRITICAL";
    return true;
  });

  return (
    <header className="h-14 bg-card/80 backdrop-blur-md border-b border-border px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left side: Mobile Toggle & Network Status */}
      <div className="flex items-center gap-3">
        {onOpenMobileSidebar && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenMobileSidebar}
            className="md:hidden size-8 text-muted-foreground"
            title="Open Menu"
          >
            <Menu className="size-4" />
          </Button>
        )}

        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-emerald-700 dark:text-emerald-400 font-medium text-[11px]">
            Operational Network
          </span>
          <span className="text-muted-foreground font-mono text-[10px]">v1.0</span>
        </div>
      </div>

      {/* Right side: Quick Theme, Notifications Bell & Admin User Menu */}
      <div className="flex items-center gap-2">
        {/* Quick Theme Switcher */}
        <ThemeSwitcher variant="icon" />

        {/* Admin Notification Bell */}
        <div className="relative" ref={notifRef}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              setNotifOpen(!notifOpen);
              if (!notifOpen) loadNotifications();
            }}
            aria-label="Admin Notifications"
            className="relative size-8 text-muted-foreground hover:text-foreground"
          >
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <span
                className={cn(
                  "absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center text-white",
                  criticalCount > 0
                    ? "bg-destructive animate-pulse"
                    : "bg-primary"
                )}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </Button>

          {/* Notification Dropdown */}
          {notifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-popover text-popover-foreground border border-border rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/30">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-foreground">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                      {unreadCount} unread
                    </span>
                  )}
                </div>

                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    disabled={markingAll}
                    className="text-[11px] text-primary hover:underline font-medium flex items-center gap-1 transition-colors disabled:opacity-50"
                  >
                    <CheckCheck className="size-3" />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="px-3 py-1.5 flex items-center gap-1 border-b border-border bg-muted/20 text-xs">
                {(["all", "unread", "critical"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setNotifFilter(tab)}
                    className={cn(
                      "px-2.5 py-0.5 rounded-md text-[11px] font-medium transition-colors capitalize",
                      notifFilter === tab
                        ? "bg-background text-foreground shadow-xs font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Notification List */}
              <div className="max-h-80 overflow-y-auto divide-y divide-border/60">
                {filteredNotifications.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    No {notifFilter !== "all" ? notifFilter : ""} notifications
                  </div>
                ) : (
                  filteredNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={cn(
                        "p-3.5 hover:bg-muted/50 cursor-pointer transition-colors flex items-start gap-3",
                        !notif.is_read && "bg-primary/5"
                      )}
                    >
                      <div className="size-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        {getCategoryIcon(notif.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1 mb-0.5">
                          <span className={cn("text-xs font-semibold truncate", !notif.is_read ? "text-foreground" : "text-muted-foreground")}>
                            {notif.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                            {formatTimeAgo(notif.created_at)}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                          {notif.message}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="p-2 border-t border-border bg-muted/20 text-center">
                <Link
                  to="/notifications"
                  onClick={() => setNotifOpen(false)}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  View All Notifications
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Admin User Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <button
            type="button"
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1 pl-2 rounded-xl border border-border/80 hover:bg-muted/60 transition-colors text-left focus:outline-none focus:ring-2 focus:ring-ring/30"
            aria-label="Admin Profile Menu"
            aria-expanded={profileOpen}
          >
            <div className="hidden sm:block text-right">
              <span className="text-xs font-semibold text-foreground block leading-tight truncate max-w-[120px]">
                {admin?.fullName || admin?.username || "Admin"}
              </span>
              <span className="text-[10px] text-muted-foreground block font-mono">
                {admin?.role?.name || "Administrator"}
              </span>
            </div>
            <Avatar className="size-7 rounded-lg border border-border">
              <AvatarFallback className="text-[11px] font-bold bg-primary/10 text-primary">
                {(admin?.fullName || admin?.username || "A").substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <ChevronDown
              className={cn(
                "size-3 text-muted-foreground shrink-0 mr-1 transition-transform duration-200",
                profileOpen && "rotate-180"
              )}
            />
          </button>

          {profileOpen && (
            <div className="absolute right-0 mt-2 w-60 bg-popover text-popover-foreground border border-border rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="p-3 border-b border-border bg-muted/20">
                <div className="flex flex-col space-y-1">
                  <p className="text-xs font-bold leading-none text-foreground truncate">
                    {admin?.fullName || admin?.username}
                  </p>
                  <p className="text-[11px] leading-none text-muted-foreground font-mono truncate">
                    @{admin?.username}
                  </p>
                  <div className="pt-1.5 flex items-center gap-2">
                    <StatusBadge type="role" value={admin?.role?.name || "Admin"} />
                  </div>
                </div>
              </div>

              <div className="p-1.5 space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate("/system");
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-medium text-foreground hover:bg-muted rounded-xl transition-colors text-left"
                >
                  <Sliders className="size-3.5 text-muted-foreground" />
                  <span>System Settings</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    navigate("/audit-logs");
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-medium text-foreground hover:bg-muted rounded-xl transition-colors text-left"
                >
                  <History className="size-3.5 text-muted-foreground" />
                  <span>Audit Trail</span>
                </button>
              </div>

              <div className="p-2 border-t border-border bg-muted/10">
                <button
                  type="button"
                  onClick={() => {
                    setProfileOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 rounded-xl transition-colors text-left"
                >
                  <LogOut className="size-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;
