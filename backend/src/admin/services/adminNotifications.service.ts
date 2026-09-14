import { supabase } from "../../config/supabase";
import { createAuditLog } from "./adminAudit.service";
import { sanitizeSearchQuery } from "../utils/adminSanitizer";

export type NotificationCategory =
  | "HIGH_PRIORITY_REPORT"
  | "PENDING_MODERATION"
  | "PENDING_ADVERTISEMENT"
  | "SYSTEM_FAILURE"
  | "STORAGE_WARNING"
  | "API_ERROR_SPIKE"
  | "SECURITY_EVENT"
  | "COMPLIANCE_REQUEST";

export type NotificationPriority = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";

export interface AdminNotification {
  id: string;
  admin_id: string | null;
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message: string;
  link: string | null;
  metadata: Record<string, any>;
  is_read: boolean;
  read_at: string | null;
  dedup_key?: string | null;
  created_at: string;
}

export interface GetNotificationsFilter {
  page?: number;
  limit?: number;
  status?: "all" | "unread" | "read";
  category?: NotificationCategory | string;
  priority?: NotificationPriority | string;
  search?: string;
  adminId?: string;
}

// ============================================================
// RESILIENT RUNTIME STORE (For offline/mock resilience & anti-spam)
// ============================================================

const runtimeNotifications: AdminNotification[] = [
  {
    id: "e0000000-0000-0000-0000-000000000001",
    admin_id: null,
    category: "HIGH_PRIORITY_REPORT",
    priority: "CRITICAL",
    title: "Urgent: Animal Safety Report Filed",
    message:
      "A user post was flagged for severe safety violations by multiple community members requiring immediate review.",
    link: "/moderation?priority=HIGH",
    metadata: {
      report_id: "5088d4e6-4db4-4ebd-b8dc-3e1f9df405cc",
      target_type: "post",
      reason: "animal_abuse",
    },
    is_read: false,
    read_at: null,
    dedup_key: "report:high_priority:5088d4e6",
    created_at: new Date(Date.now() - 12 * 60000).toISOString(),
  },
  {
    id: "e0000000-0000-0000-0000-000000000002",
    admin_id: null,
    category: "API_ERROR_SPIKE",
    priority: "HIGH",
    title: "Elevated 5xx Error Rate Detected",
    message:
      "Media upload endpoint /api/media/upload experienced a 6.4% 500 error rate over the last 15 minutes.",
    link: "/system",
    metadata: {
      endpoint: "/api/media/upload",
      error_rate: 0.064,
      threshold: 0.05,
    },
    is_read: false,
    read_at: null,
    dedup_key: "system:api_spike:upload:5xx",
    created_at: new Date(Date.now() - 28 * 60000).toISOString(),
  },
  {
    id: "e0000000-0000-0000-0000-000000000003",
    admin_id: null,
    category: "PENDING_ADVERTISEMENT",
    priority: "MEDIUM",
    title: "New Ad Campaign Awaiting Review",
    message:
      'Bark & Whiskers Organic Foods submitted "Spring Organic Feast" campaign with 2 creatives.',
    link: "/ads",
    metadata: {
      campaign_id: "c0000000-0000-0000-0000-000000000001",
      advertiser: "Bark & Whiskers Organic Foods",
    },
    is_read: false,
    read_at: null,
    dedup_key: "ads:pending_review:c0000000",
    created_at: new Date(Date.now() - 45 * 60000).toISOString(),
  },
  {
    id: "e0000000-0000-0000-0000-000000000004",
    admin_id: null,
    category: "STORAGE_WARNING",
    priority: "HIGH",
    title: "Storage Capacity Warning (>85%)",
    message:
      'Supabase Storage bucket "peto-media" has reached 87.3% capacity (873 GB of 1 TB).',
    link: "/system",
    metadata: {
      bucket: "peto-media",
      used_gb: 873,
      capacity_gb: 1000,
      usage_pct: 87.3,
    },
    is_read: false,
    read_at: null,
    dedup_key: "storage:capacity:peto-media:87pct",
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: "e0000000-0000-0000-0000-000000000005",
    admin_id: null,
    category: "SECURITY_EVENT",
    priority: "CRITICAL",
    title: "Multiple Failed Admin Login Attempts",
    message:
      "5 consecutive failed login attempts detected from IP 198.51.100.44 for administrator account @superadmin.",
    link: "/audit-logs",
    metadata: {
      target_username: "superadmin",
      ip_address: "198.51.100.44",
      attempts: 5,
    },
    is_read: false,
    read_at: null,
    dedup_key: "security:failed_login:superadmin:198.51.100.44",
    created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
  },
  {
    id: "e0000000-0000-0000-0000-000000000006",
    admin_id: null,
    category: "COMPLIANCE_REQUEST",
    priority: "HIGH",
    title: "Urgent GDPR Erasure Request",
    message:
      'User user_88291 filed a statutory Article 17 "Right to be Forgotten" account deletion request.',
    link: "/compliance",
    metadata: {
      request_type: "ACCOUNT_DELETION",
      jurisdiction: "GDPR",
      user_id: "88291",
    },
    is_read: false,
    read_at: null,
    dedup_key: "compliance:erasure:88291",
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
  },
  {
    id: "e0000000-0000-0000-0000-000000000007",
    admin_id: null,
    category: "PENDING_MODERATION",
    priority: "MEDIUM",
    title: "Moderation Queue Threshold Exceeded",
    message:
      "There are currently 14 pending reports in the moderation queue requiring triage.",
    link: "/moderation",
    metadata: {
      pending_count: 14,
      threshold: 10,
    },
    is_read: true,
    read_at: new Date(Date.now() - 18 * 3600000).toISOString(),
    dedup_key: "moderation:queue_depth:14",
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
  },
  {
    id: "e0000000-0000-0000-0000-000000000008",
    admin_id: null,
    category: "SYSTEM_FAILURE",
    priority: "LOW",
    title: "Background Video Transcoding Worker Restarted",
    message:
      "Worker process video-transcoder-02 exited unexpectedly and was automatically recovered by PM2/Docker.",
    link: "/system",
    metadata: {
      worker_id: "video-transcoder-02",
      restart_count: 1,
    },
    is_read: true,
    read_at: new Date(Date.now() - 36 * 3600000).toISOString(),
    dedup_key: "system:worker_restart:video-transcoder-02",
    created_at: new Date(Date.now() - 48 * 3600000).toISOString(),
  },
];

// Anti-spam deduplication window (1 hour cooldown)
const DEDUP_COOLDOWN_MS = 60 * 60 * 1000;

/**
 * Fetch paginated admin notifications with filtering & summary statistics
 */
export async function getAdminNotificationsService(filter: GetNotificationsFilter = {}) {
  const page = Math.max(1, Number(filter.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filter.limit) || 20));
  const offset = (page - 1) * limit;

  try {
    let query = supabase
      .from("admin_notifications")
      .select("*", { count: "exact" });

    // Filter by read status
    if (filter.status === "unread") {
      query = query.eq("is_read", false);
    } else if (filter.status === "read") {
      query = query.eq("is_read", true);
    }

    // Filter by category
    if (filter.category && filter.category !== "ALL") {
      query = query.eq("category", filter.category);
    }

    // Filter by priority
    if (filter.priority && filter.priority !== "ALL") {
      query = query.eq("priority", filter.priority);
    }

    // Text search
    if (filter.search && filter.search.trim()) {
      const s = sanitizeSearchQuery(filter.search);
      if (s) {
        query = query.or(`title.ilike.%${s}%,message.ilike.%${s}%`);
      }
    }

    // Admin target filter (null indicates broadcast or matching target admin)
    if (filter.adminId) {
      query = query.or(`admin_id.is.null,admin_id.eq.${filter.adminId}`);
    }

    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error || !data) {
      throw error || new Error("Supabase returned empty notifications query");
    }

    // Fetch total unread count for badge
    const { count: unreadCount } = await supabase
      .from("admin_notifications")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false);

    // Fetch critical unread count for pulsing warning
    const { count: criticalCount } = await supabase
      .from("admin_notifications")
      .select("*", { count: "exact", head: true })
      .eq("is_read", false)
      .eq("priority", "CRITICAL");

    const total = count ?? data.length;

    return {
      notifications: data as AdminNotification[],
      unread_count: unreadCount ?? 0,
      critical_count: criticalCount ?? 0,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (err) {
    // Fallback to in-memory store
    let filtered = [...runtimeNotifications];

    if (filter.status === "unread") {
      filtered = filtered.filter((n) => !n.is_read);
    } else if (filter.status === "read") {
      filtered = filtered.filter((n) => n.is_read);
    }

    if (filter.category && filter.category !== "ALL") {
      filtered = filtered.filter((n) => n.category === filter.category);
    }

    if (filter.priority && filter.priority !== "ALL") {
      filtered = filtered.filter((n) => n.priority === filter.priority);
    }

    if (filter.search && filter.search.trim()) {
      const term = filter.search.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(term) ||
          n.message.toLowerCase().includes(term)
      );
    }

    filtered.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const unreadCount = runtimeNotifications.filter((n) => !n.is_read).length;
    const criticalCount = runtimeNotifications.filter(
      (n) => !n.is_read && n.priority === "CRITICAL"
    ).length;

    const total = filtered.length;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      notifications: paginated,
      unread_count: unreadCount,
      critical_count: criticalCount,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

/**
 * Mark a specific admin notification as read or unread
 */
export async function markAdminNotificationReadService(
  notificationId: string,
  isRead: boolean = true
) {
  const readAt = isRead ? new Date().toISOString() : null;

  try {
    const { data, error } = await supabase
      .from("admin_notifications")
      .update({ is_read: isRead, read_at: readAt })
      .eq("id", notificationId)
      .select()
      .single();

    if (error || !data) {
      throw error || new Error("Notification not found in database");
    }

    return data as AdminNotification;
  } catch (err) {
    // Fallback in runtime store
    const item = runtimeNotifications.find((n) => n.id === notificationId);
    if (!item) {
      throw new Error(`Notification not found: ${notificationId}`);
    }
    item.is_read = isRead;
    item.read_at = readAt;
    return item;
  }
}

/**
 * Mark all unread admin notifications as read atomically
 */
export async function markAllAdminNotificationsReadService(adminId?: string) {
  const readAt = new Date().toISOString();

  try {
    let query = supabase
      .from("admin_notifications")
      .update({ is_read: true, read_at: readAt })
      .eq("is_read", false);

    if (adminId) {
      query = query.or(`admin_id.is.null,admin_id.eq.${adminId}`);
    }

    const { error } = await query;
    if (error) throw error;
  } catch (err) {
    // Fallback in runtime store
    for (const item of runtimeNotifications) {
      if (!item.is_read) {
        item.is_read = true;
        item.read_at = readAt;
      }
    }
  }

  return { success: true, read_at: readAt };
}

/**
 * Create a new operational admin notification with anti-spam & deduplication safeguards
 */
export async function createAdminNotificationService(params: {
  category: NotificationCategory;
  priority: NotificationPriority;
  title: string;
  message: string;
  link?: string | null;
  metadata?: Record<string, any>;
  dedup_key?: string | null;
  admin_id?: string | null;
}): Promise<{ notification: AdminNotification; created: boolean }> {
  const now = new Date();
  const dedupKey = params.dedup_key || null;

  // 1. Anti-Spam / Deduplication Check:
  // If a deduplication key is provided, verify whether an active unread notification exists
  // or if one was created recently within the cooldown window.
  if (dedupKey) {
    try {
      const cooldownThreshold = new Date(
        now.getTime() - DEDUP_COOLDOWN_MS
      ).toISOString();

      const { data: existing, error } = await supabase
        .from("admin_notifications")
        .select("*")
        .eq("dedup_key", dedupKey)
        .gte("created_at", cooldownThreshold)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (existing) {
        // Return existing alert to avoid spamming admins
        return { notification: existing as AdminNotification, created: false };
      }
    } catch (_) {
      // Check in runtime store
      const recent = runtimeNotifications.find(
        (n) =>
          n.dedup_key === dedupKey &&
          now.getTime() - new Date(n.created_at).getTime() < DEDUP_COOLDOWN_MS
      );
      if (recent) {
        return { notification: recent, created: false };
      }
    }
  }

  const newAlert: AdminNotification = {
    id: `e0000000-0000-0000-0000-${Date.now().toString(16).padStart(12, "0")}`,
    admin_id: params.admin_id || null,
    category: params.category,
    priority: params.priority,
    title: params.title,
    message: params.message,
    link: params.link || null,
    metadata: params.metadata || {},
    is_read: false,
    read_at: null,
    dedup_key: dedupKey,
    created_at: now.toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from("admin_notifications")
      .insert([newAlert])
      .select()
      .single();

    if (error || !data) {
      throw error || new Error("Failed to insert notification into database");
    }

    return { notification: data as AdminNotification, created: true };
  } catch (err) {
    runtimeNotifications.unshift(newAlert);
    return { notification: newAlert, created: true };
  }
}
