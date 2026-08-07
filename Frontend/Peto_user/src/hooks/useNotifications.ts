import { useState, useEffect, useCallback } from "react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

export interface NotificationItem {
  id: string;
  recipient_id: string;
  actor_id?: string;
  post_id?: string;
  comment_id?: string;
  type: "like" | "comment" | "reply" | "follow" | "mention" | "post" | "system";
  message: string;
  is_read: boolean;
  created_at: string;
  actor?: {
    id: string;
    username: string;
    full_name: string;
    avatar_url: string;
    verified: boolean;
  };
}

export interface NotificationSettings {
  likes_enabled: boolean;
  comments_enabled: boolean;
  follows_enabled: boolean;
  mentions_enabled: boolean;
  push_enabled: boolean;
  sound_enabled: boolean;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    likes_enabled: true,
    comments_enabled: true,
    follows_enabled: true,
    mentions_enabled: true,
    push_enabled: true,
    sound_enabled: true,
  });
  const [pushSubscribed, setPushSubscribed] = useState<boolean>(false);

  // Sound alert helper
  const playNotificationSound = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
      gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.3);
    } catch {
      // Audio playback fallback
    }
  }, []);

  // Fetch initial notifications via Backend API
  const fetchNotifications = useCallback(async (pageNum = 1) => {
    if (!user) return;
    try {
      setLoading(true);
      const [resNotifs, resUnread, resSettings] = await Promise.all([
        api.get(`/notifications?page=${pageNum}&limit=15`),
        api.get("/notifications/unread-count"),
        api.get("/notifications/settings"),
      ]);

      if (resNotifs.data?.success) {
        if (pageNum === 1) {
          setNotifications(resNotifs.data.data);
        } else {
          setNotifications((prev) => [...prev, ...resNotifs.data.data]);
        }
        setHasMore(resNotifs.data.pagination?.hasMore || false);
        setPage(pageNum);
      }

      if (resUnread.data?.success) {
        setUnreadCount(resUnread.data.unread);
      }

      if (resSettings.data?.success && resSettings.data.settings) {
        setSettings(resSettings.data.settings);
      }
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Mark a single notification as read via Backend API
  const markAsRead = async (id: string) => {
    try {
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, is_read: true } : item))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));

      await api.patch(`/notifications/${id}/read`);
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  // Mark all notifications as read via Backend API
  const markAllAsRead = async () => {
    try {
      setNotifications((prev) => prev.map((item) => ({ ...item, is_read: true })));
      setUnreadCount(0);

      await api.patch("/notifications/read-all");
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  // Remove a notification via Backend API
  const removeNotification = async (id: string) => {
    try {
      const targetNotif = notifications.find((item) => item.id === id);
      setNotifications((prev) => prev.filter((item) => item.id !== id));

      if (targetNotif && !targetNotif.is_read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }

      await api.delete(`/notifications/${id}`);
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  // Update notification settings via Backend API
  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    try {
      setSettings((prev) => ({ ...prev, ...newSettings }));
      await api.put("/notifications/settings", newSettings);
    } catch (err) {
      console.error("Failed to update notification settings:", err);
    }
  };

  // Web Push Subscription via Backend API
  const requestPushPermission = async (): Promise<boolean> => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      alert("Push notifications are not supported in this browser.");
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        alert("Push notification permission denied.");
        return false;
      }

      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      // Get VAPID public key from backend API
      const keyRes = await api.get("/notifications/push/vapid-key");
      if (!keyRes.data?.publicKey) {
        throw new Error("VAPID key unavailable");
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: keyRes.data.publicKey,
      });

      // Send subscription object to Backend API
      await api.post("/notifications/push/subscribe", subscription.toJSON());
      setPushSubscribed(true);
      return true;
    } catch (err) {
      console.error("Push registration error:", err);
      return false;
    }
  };

  // Polling & Lifecycle (communicates exclusively with Backend Express API)
  useEffect(() => {
    if (!user?.id) return;

    fetchNotifications(1);

    // Periodic unread check via backend API every 15 seconds
    const interval = setInterval(async () => {
      try {
        const resUnread = await api.get("/notifications/unread-count");
        if (resUnread.data?.success) {
          setUnreadCount((prevCount) => {
            const newCount = resUnread.data.unread;
            if (newCount > prevCount && settings.sound_enabled) {
              playNotificationSound();
            }
            return newCount;
          });
        }
      } catch {
        // Silent API polling fallback
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [user?.id, fetchNotifications, settings.sound_enabled, playNotificationSound]);

  return {
    notifications,
    unreadCount,
    loading,
    hasMore,
    page,
    settings,
    pushSubscribed,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
    updateSettings,
    requestPushPermission,
  };
};
