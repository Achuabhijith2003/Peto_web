import { Request } from "express";
import { supabase } from "../../config/supabase";
import { AdminSessionContext } from "../admin.types";
import { createAuditLog } from "./adminAudit.service";
import { sanitizeSearchQuery } from "../utils/adminSanitizer";

export interface UserListFilters {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  verified?: string | boolean;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  startDate?: string;
  endDate?: string;
}

/**
 * Fetch paginated, filtered, and sorted users list
 */
export async function getUsersListService(filters: UserListFilters) {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const validSortColumns: Record<string, string> = {
    created_at: "created_at",
    username: "username",
    full_name: "full_name",
    followers_count: "followers_count",
    posts_count: "posts_count",
  };

  const sortColumn = validSortColumns[filters.sortBy || "created_at"] || "created_at";
  const ascending = filters.sortOrder === "asc";

  let query = supabase
    .from("profiles")
    .select(
      `
      id,
      username,
      full_name,
      avatar_url,
      phone,
      location,
      verified,
      followers_count,
      following_count,
      posts_count,
      created_at,
      updated_at,
      is_online,
      last_seen
    `,
      { count: "exact" }
    )
    .order(sortColumn, { ascending })
    .range(from, to);

  // Search filter
  if (filters.search && filters.search.trim()) {
    const q = sanitizeSearchQuery(filters.search);
    if (q) {
      query = query.or(`username.ilike.%${q}%,full_name.ilike.%${q}%`);
    }
  }

  // Verification filter
  if (filters.verified !== undefined && filters.verified !== "" && filters.verified !== "ALL") {
    const isVerified = String(filters.verified) === "true";
    query = query.eq("verified", isVerified);
  }

  // Date range filters
  if (filters.startDate) {
    query = query.gte("created_at", filters.startDate);
  }
  if (filters.endDate) {
    query = query.lte("created_at", filters.endDate);
  }

  const { data, count, error } = await query;

  if (error) {
    throw error;
  }

  const userList = data || [];
  const userIds = userList.map((u: any) => u.id);

  const followMap = new Map<string, number>();
  const followingMap = new Map<string, number>();
  const postMap = new Map<string, number>();
  const statusMap = new Map<string, { status: string; reason?: string; suspendedUntil?: string }>();

  if (userIds.length > 0) {
    const [followsRes, followingRes, postsRes, auditLogsRes] = await Promise.all([
      supabase.from("follows").select("following_id").in("following_id", userIds),
      supabase.from("follows").select("follower_id").in("follower_id", userIds),
      supabase.from("posts").select("user_id").in("user_id", userIds),
      supabase
        .from("admin_audit_logs")
        .select("resource_id, action, details, created_at")
        .eq("resource_type", "user")
        .in("resource_id", userIds)
        .in("action", ["USER_SUSPENDED", "USER_BANNED", "USER_RESTORED", "USER_STATUS_CHANGED"])
        .order("created_at", { ascending: true }),
    ]);

    for (const f of followsRes.data || []) {
      followMap.set(f.following_id, (followMap.get(f.following_id) || 0) + 1);
    }

    for (const f of followingRes.data || []) {
      followingMap.set(f.follower_id, (followingMap.get(f.follower_id) || 0) + 1);
    }

    for (const p of postsRes.data || []) {
      postMap.set(p.user_id, (postMap.get(p.user_id) || 0) + 1);
    }

    // Process audit logs in chronological order so the latest status wins
    for (const log of auditLogsRes.data || []) {
      const uId = log.resource_id;
      if (!uId) continue;
      if (log.action === "USER_SUSPENDED") {
        statusMap.set(uId, {
          status: "SUSPENDED",
          reason: log.details?.reason,
          suspendedUntil: log.details?.suspendedUntil,
        });
      } else if (log.action === "USER_BANNED") {
        statusMap.set(uId, {
          status: "BANNED",
          reason: log.details?.reason,
        });
      } else if (log.action === "USER_RESTORED") {
        statusMap.set(uId, {
          status: "ACTIVE",
        });
      } else if (log.action === "USER_STATUS_CHANGED" && log.details?.newStatus) {
        statusMap.set(uId, {
          status: log.details.newStatus,
          reason: log.details?.reason,
          suspendedUntil: log.details?.suspendedUntil,
        });
      }
    }
  }

  let users = userList.map((u: any) => {
    const fallback = statusMap.get(u.id);
    const resolvedStatus = u.status || fallback?.status || "ACTIVE";
    return {
      ...u,
      status: resolvedStatus,
      status_reason: u.status_reason || fallback?.reason || null,
      suspended_until: u.suspended_until || fallback?.suspendedUntil || null,
      followers_count: followMap.get(u.id) ?? u.followers_count ?? 0,
      following_count: followingMap.get(u.id) ?? u.following_count ?? 0,
      posts_count: postMap.get(u.id) ?? u.posts_count ?? 0,
    };
  });

  // Status filter (applied in memory or query if column exists)
  if (filters.status && filters.status !== "ALL") {
    users = users.filter((u: any) => u.status === filters.status);
  }

  return {
    users,
    pagination: {
      page,
      limit,
      totalCount: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}

/**
 * Fetch extensive user profile, engagement statistics, moderation history, and reports
 */
export async function getUserDetailService(userId: string) {
  // 1. Fetch Profile
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (profileErr || !profile) {
    throw new Error("User not found.");
  }

  // 2. Fetch Auth Account info via Supabase Admin API (email, status)
  let authUser: any = null;
  try {
    const { data: authData } = await supabase.auth.admin.getUserById(userId);
    if (authData?.user) {
      authUser = {
        email: authData.user.email,
        emailConfirmedAt: authData.user.email_confirmed_at,
        lastSignInAt: authData.user.last_sign_in_at,
        bannedUntil: (authData.user as any).banned_until || null,
        createdAt: authData.user.created_at,
      };
    }
  } catch (err: any) {
    console.warn("[getUserDetailService] Could not fetch auth user details:", err.message);
  }

  // 3. Exact counts for posts, followers, following, and reels
  const [followersRes, followingRes, postsRes, reelsRes] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", userId),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", userId),
    supabase.from("posts").select("*", { count: "exact", head: true }).eq("user_id", userId),
    supabase
      .from("posts")
      .select("id, media!inner(type)", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("media.type", "video"),
  ]);

  // 4. Reports filed against this user or by this user
  let reportsAgainst: any[] = [];
  let reportsFiled: any[] = [];
  try {
    const [repAgainstRes, repFiledRes] = await Promise.all([
      supabase
        .from("community_reports")
        .select(`
          id,
          reason,
          description,
          status,
          created_at,
          reporter:profiles!community_reports_reporter_id_fkey(username, full_name)
        `)
        .eq("reported_user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("community_reports")
        .select(`
          id,
          reason,
          description,
          status,
          created_at
        `)
        .eq("reporter_id", userId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    reportsAgainst = repAgainstRes.data || [];
    reportsFiled = repFiledRes.data || [];
  } catch (e: any) {
    console.warn("[getUserDetailService] Could not fetch community reports:", e.message);
  }

  // 5. Moderation history from admin_audit_logs
  let moderationHistory: any[] = [];
  try {
    const { data: historyData } = await supabase
      .from("admin_audit_logs")
      .select(`
        id,
        action,
        details,
        created_at,
        admin_user:profiles!admin_audit_logs_admin_user_id_fkey(
          username,
          full_name
        )
      `)
      .eq("resource_type", "user")
      .eq("resource_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    moderationHistory = historyData || [];
  } catch (e: any) {
    console.warn("[getUserDetailService] Could not fetch audit history:", e.message);
  }

  // 6. Check if this user holds an administrative role
  const { data: adminRecord } = await supabase
    .from("admin_users")
    .select(`
      id,
      is_active,
      role:admin_roles(name)
    `)
    .eq("user_id", userId)
    .maybeSingle();

  // 7. Resolve status fallback from moderation history if profiles.status column doesn't exist yet
  let resolvedStatus = profile.status || "ACTIVE";
  let resolvedReason = profile.status_reason || null;
  let resolvedSuspendedUntil = profile.suspended_until || null;

  if ((!profile.status || profile.status === "ACTIVE") && moderationHistory.length > 0) {
    const statusLogs = moderationHistory.filter((l: any) =>
      ["USER_SUSPENDED", "USER_BANNED", "USER_RESTORED", "USER_STATUS_CHANGED"].includes(l.action)
    );
    if (statusLogs.length > 0) {
      const latest = statusLogs[0];
      if (latest.action === "USER_SUSPENDED") {
        resolvedStatus = "SUSPENDED";
        resolvedReason = latest.details?.reason || null;
        resolvedSuspendedUntil = latest.details?.suspendedUntil || null;
      } else if (latest.action === "USER_BANNED") {
        resolvedStatus = "BANNED";
        resolvedReason = latest.details?.reason || null;
      } else if (latest.action === "USER_RESTORED") {
        resolvedStatus = "ACTIVE";
      } else if (latest.action === "USER_STATUS_CHANGED" && latest.details?.newStatus) {
        resolvedStatus = latest.details.newStatus;
        resolvedReason = latest.details?.reason || null;
        resolvedSuspendedUntil = latest.details?.suspendedUntil || null;
      }
    }
  }

  return {
    profile: {
      ...profile,
      status: resolvedStatus,
      status_reason: resolvedReason,
      suspended_until: resolvedSuspendedUntil,
    },
    auth: authUser,
    metrics: {
      followersCount: followersRes.count ?? profile.followers_count ?? 0,
      followingCount: followingRes.count ?? profile.following_count ?? 0,
      postsCount: postsRes.count ?? profile.posts_count ?? 0,
      reelsCount: reelsRes.count ?? 0,
    },
    adminRole: adminRecord ? {
      adminId: adminRecord.id,
      isActive: adminRecord.is_active,
      roleName: (adminRecord.role as any)?.name || "Admin",
    } : null,
    reports: {
      against: reportsAgainst,
      filed: reportsFiled,
    },
    moderationHistory,
  };
}

/**
 * Update user status (ACTIVE, SUSPENDED, BANNED, DEACTIVATED) with mandatory reason for restrictions
 */
export async function updateUserStatusService(
  targetUserId: string,
  input: {
    status: "ACTIVE" | "SUSPENDED" | "BANNED" | "DEACTIVATED" | "DELETED";
    reason?: string;
    suspendedUntil?: string | null;
  },
  currentAdmin: AdminSessionContext,
  req?: Request
) {
  const { status, reason, suspendedUntil } = input;

  const validStatuses = ["ACTIVE", "SUSPENDED", "BANNED", "DEACTIVATED", "DELETED"];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
  }

  // Require reason for destructive or restrictive actions
  if ((status === "SUSPENDED" || status === "BANNED" || status === "DEACTIVATED") && (!reason || !reason.trim())) {
    throw new Error(`A justification reason is required when placing an account in ${status} status.`);
  }

  // Prevent modifying oneself
  if (targetUserId === currentAdmin.userId) {
    throw new Error("Administrators cannot alter their own account status.");
  }

  // Fetch target profile
  const { data: targetProfile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, username, full_name, verified")
    .eq("id", targetUserId)
    .single();

  if (profileErr || !targetProfile) {
    throw new Error("Target user not found.");
  }

  // Update in profiles table (resilient fallback if status columns not yet added)
  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  try {
    const { error: updateErr } = await supabase
      .from("profiles")
      .update({
        status,
        status_reason: reason?.trim() || null,
        status_updated_at: new Date().toISOString(),
        suspended_until: suspendedUntil || null,
        ...updates,
      })
      .eq("id", targetUserId);

    if (updateErr) {
      // If columns don't exist yet, warn and update updated_at
      console.warn("[updateUserStatusService] Update warning:", updateErr.message);
    }
  } catch (err: any) {
    console.error("[updateUserStatusService] Error updating profile status:", err.message);
  }

  // If Banned or Suspended, invalidate active Supabase sessions
  if (status === "BANNED" || status === "SUSPENDED") {
    try {
      await supabase.auth.admin.signOut(targetUserId);
    } catch (e: any) {
      console.warn("[updateUserStatusService] Could not revoke user auth sessions:", e.message);
    }
  }

  // Audit Log Action determination
  let auditAction = "USER_STATUS_CHANGED";
  if (status === "SUSPENDED") auditAction = "USER_SUSPENDED";
  else if (status === "BANNED") auditAction = "USER_BANNED";
  else if (status === "ACTIVE") auditAction = "USER_RESTORED";

  await createAuditLog(
    {
      adminId: currentAdmin.id,
      adminUserId: currentAdmin.userId,
      action: auditAction,
      resourceType: "user",
      resourceId: targetUserId,
      details: {
        targetUsername: targetProfile.username,
        targetFullName: targetProfile.full_name,
        newStatus: status,
        reason: reason?.trim() || null,
        suspendedUntil: suspendedUntil || null,
      },
    },
    req
  );

  return {
    userId: targetUserId,
    username: targetProfile.username,
    status,
    reason: reason?.trim() || null,
    suspendedUntil: suspendedUntil || null,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Toggle verified badge on user profile
 */
export async function updateUserVerificationService(
  targetUserId: string,
  verified: boolean,
  currentAdmin: AdminSessionContext,
  req?: Request
) {
  const { data: targetProfile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, username, full_name, verified")
    .eq("id", targetUserId)
    .single();

  if (profileErr || !targetProfile) {
    throw new Error("Target user not found.");
  }

  const { data: updatedProfile, error: updateErr } = await supabase
    .from("profiles")
    .update({
      verified,
      updated_at: new Date().toISOString(),
    })
    .eq("id", targetUserId)
    .select("id, username, full_name, verified")
    .single();

  if (updateErr) {
    throw updateErr;
  }

  const action = verified ? "USER_VERIFIED" : "USER_UNVERIFIED";

  await createAuditLog(
    {
      adminId: currentAdmin.id,
      adminUserId: currentAdmin.userId,
      action,
      resourceType: "user",
      resourceId: targetUserId,
      details: {
        targetUsername: targetProfile.username,
        verified,
        previousState: targetProfile.verified,
      },
    },
    req
  );

  return updatedProfile;
}
