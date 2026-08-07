import React, { useState } from "react";
import { Bell, Settings, CheckCheck, Trash2, Heart, MessageSquare, UserPlus, AtSign, Loader2 } from "lucide-react";
import { useNotifications, type NotificationItem } from "../../hooks/useNotifications";
import NotificationSettingsModal from "./NotificationSettingsModal";

const NotificationPanel: React.FC = () => {
  const {
    notifications,
    unreadCount,
    loading,
    hasMore,
    page,
    settings,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
    updateSettings,
    requestPushPermission,
  } = useNotifications();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState<number>(5);

  const getNotificationIcon = (type: NotificationItem["type"]) => {
    switch (type) {
      case "like":
        return <Heart size={16} className="text-rose-500 fill-rose-500" />;
      case "comment":
      case "reply":
        return <MessageSquare size={16} className="text-blue-500" />;
      case "follow":
        return <UserPlus size={16} className="text-emerald-500" />;
      case "mention":
        return <AtSign size={16} className="text-purple-500" />;
      default:
        return <Bell size={16} className="text-amber-500" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSeconds < 60) return "Just now";
    if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
    if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
    return `${Math.floor(diffSeconds / 86400)}d ago`;
  };

  const visibleNotifications = notifications.slice(0, visibleCount);
  const canLoadMore = visibleCount < notifications.length || hasMore;

  const handleReadMore = () => {
    if (visibleCount < notifications.length) {
      setVisibleCount((prev) => prev + 5);
    } else if (hasMore) {
      fetchNotifications(page + 1);
      setVisibleCount((prev) => prev + 5);
    }
  };

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm border border-slate-100">
      {/* Header */}
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell size={20} className="text-slate-800" />
            {unreadCount > 0 && (
              <span className="absolute -top-1.5 -right-2 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-sm">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>
          <h3 className="font-headline font-bold text-slate-900 text-base">Notifications</h3>
        </div>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              title="Mark all as read"
              className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl transition"
            >
              <CheckCheck size={14} />
              Read All
            </button>
          )}

          <button
            onClick={() => setIsSettingsOpen(true)}
            title="Notification Settings"
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Notifications Body */}
      {loading && notifications.length === 0 ? (
        <div className="flex items-center justify-center py-8 text-slate-400">
          <Loader2 size={24} className="animate-spin text-amber-500" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-2xl bg-slate-50 p-6 text-center text-slate-400">
          <Bell size={28} className="mx-auto mb-2 opacity-40 text-slate-400" />
          <p className="text-sm font-medium">No notifications yet</p>
          <p className="text-xs text-slate-400 mt-1">We'll notify you when someone interacts with you.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleNotifications.map((item) => (
            <div
              key={item.id}
              onClick={() => !item.is_read && markAsRead(item.id)}
              className={`group relative flex items-start gap-3 rounded-2xl p-3.5 transition cursor-pointer border ${
                item.is_read
                  ? "bg-slate-50/60 border-transparent hover:bg-slate-100/80"
                  : "bg-amber-50/50 border-amber-200/60 hover:bg-amber-50"
              }`}
            >
              {/* Actor Avatar / Icon */}
              <div className="relative shrink-0">
                {item.actor?.avatar_url ? (
                  <img
                    src={item.actor.avatar_url}
                    alt={item.actor.username || "User"}
                    className="h-10 w-10 rounded-full object-cover border border-slate-200"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-600 font-bold text-sm">
                    {item.actor?.username ? item.actor.username[0].toUpperCase() : "P"}
                  </div>
                )}
                <span className="absolute -bottom-1 -right-1 rounded-full bg-white p-0.5 shadow-sm">
                  {getNotificationIcon(item.type)}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 text-xs text-slate-700 leading-relaxed pr-6">
                <p>
                  <span className="font-bold text-slate-900">
                    {item.actor?.full_name || item.actor?.username || "Someone"}
                  </span>{" "}
                  {item.message}
                </p>
                <span className="mt-1 block text-[10px] text-slate-400">
                  {formatTimeAgo(item.created_at)}
                </span>
              </div>

              {/* Actions */}
              <div className="absolute right-2 top-3.5 hidden group-hover:flex items-center gap-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeNotification(item.id);
                  }}
                  className="rounded-lg p-1 text-slate-400 hover:bg-rose-100 hover:text-rose-600 transition"
                  title="Delete notification"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}

          {/* Read More Button */}
          {canLoadMore && (
            <div className="pt-2 text-center">
              <button
                onClick={handleReadMore}
                disabled={loading}
                className="w-full rounded-2xl bg-amber-50 px-4 py-2 text-xs font-bold text-amber-700 hover:bg-amber-100 transition shadow-sm border border-amber-100 flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 size={13} className="animate-spin text-amber-500" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <span>Read More</span>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Settings Modal */}
      <NotificationSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={updateSettings}
        onRequestPush={requestPushPermission}
      />
    </div>
  );
};

export default NotificationPanel;