import { useState, useEffect, useCallback } from "react";
import api from "../utils/api";
import { supabase } from "../utils/supabaseClient";
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

  // Fetch initial notifications
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

  // Mark single notification as read
  const markAsRead = async (notificationId: string) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      await api.patch(`/notifications/${notificationId}/read`);
    } catch (err) {
      console.error("Failed to mark notification read:", err);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    try {
      await api.patch("/notifications/read-all");
    } catch (err) {
      console.error("Failed to mark all notifications read:", err);
    }
  };

  // Delete a notification
  const removeNotification = async (notificationId: string) => {
    setNotifications((prev) => {
      const target = prev.find((n) => n.id === notificationId);
      if (target && !target.is_read) {
        setUnreadCount((cnt) => Math.max(0, cnt - 1));
      }
      return prev.filter((n) => n.id !== notificationId);
    });

    try {
      await api.delete(`/notifications/${notificationId}`);
    } catch (err) {
      console.error("Failed to delete notification:", err);
    }
  };

  // Update Notification Settings
  const updateSettings = async (newSettings: Partial<NotificationSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);

    try {
      await api.put("/notifications/settings", updated);
    } catch (err) {
      console.error("Failed to update notification settings:", err);
    }
  };

  // Web Push Registration
  const requestPushPermission = async () => {
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

      const swReg = await navigator.serviceWorker.register("/sw.js");
      const vapidRes = await api.get("/notifications/vapid-key");
      const publicKey = vapidRes.data?.publicKey;

      if (!publicKey) return false;

      const subscription = await swReg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });

      const subJSON = subscription.toJSON();
      await api.post("/notifications/push-subscribe", {
        endpoint: subJSON.endpoint,
        keys: subJSON.keys,
        user_agent: navigator.userAgent,
      });

      setPushSubscribed(true);
      updateSettings({ push_enabled: true });
      return true;
    } catch (err) {
      console.error("Push registration error:", err);
      return false;
    }
  };

  // Realtime Supabase Subscription & Lifecycle
  useEffect(() => {
    if (!user?.id) return;

    fetchNotifications(1);

    // Supabase Realtime channel subscription
    const channel = supabase
      .channel(`realtime:notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotif = payload.new as NotificationItem;

          // Fetch full notification with actor details
          api.get(`/notifications?page=1&limit=1`).then((res) => {
            if (res.data?.success && res.data.data.length > 0) {
              const fullNotif = res.data.data[0];
              setNotifications((prev) => [fullNotif, ...prev]);
            } else {
              setNotifications((prev) => [newNotif, ...prev]);
            }
          });

          setUnreadCount((prev) => prev + 1);

          if (settings.sound_enabled) {
            playNotificationSound();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
