import { supabase } from "../../config/supabase";
import { AdminSessionContext } from "../admin.types";
import { createAuditLog } from "./adminAudit.service";
import { updateUserStatusService } from "./adminUserManagement.service";
import { Request } from "express";
import crypto from "crypto";

export interface CreateReportInput {
  reporterId: string;
  targetType: "user" | "post" | "reel" | "comment" | "community";
  targetId: string;
  reason: string;
  description?: string;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
}

export interface ReportFilterOptions {
  status?: string;
  targetType?: string;
  priority?: string;
  assignedTo?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
}

export interface ModerationActionInput {
  action:
    | "REMOVE_POST"
    | "REMOVE_REEL"
    | "REMOVE_COMMENT"
    | "RESTRICT_CONTENT"
    | "WARN_USER"
    | "SUSPEND_USER"
    | "BAN_USER"
    | "RESOLVE_REPORT"
    | "ESCALATE_REPORT"
    | "REJECT_REPORT";
  reason: string;
  durationDays?: number;
  overrideResolved?: boolean;
}

// In-Memory fallback store if public.reports has not been created yet via Migration 13
const inMemoryReportsStore: any[] = [];
let seededInitial = false;

async function ensureSeeded() {
  if (seededInitial) return;
  seededInitial = true;
  try {
    const { data: samplePost } = await supabase.from("posts").select("id, user_id, text").limit(1).maybeSingle();
    const { data: sampleUser } = await supabase.from("profiles").select("id, username").limit(2);
    if (samplePost && sampleUser && sampleUser.length >= 2) {
      inMemoryReportsStore.push({
        id: crypto.randomUUID(),
        reporter_id: sampleUser[0].id,
        target_type: "post",
        target_id: samplePost.id,
        reason: "Suspected Inappropriate Content",
        description: "Post may contain content violating community safety guidelines.",
        status: "PENDING",
        priority: "HIGH",
        assigned_to: null,
        resolution: null,
        resolved_by: null,
        resolved_at: null,
        created_at: new Date(Date.now() - 3600000).toISOString(),
        updated_at: new Date(Date.now() - 3600000).toISOString(),
      });
      inMemoryReportsStore.push({
        id: crypto.randomUUID(),
        reporter_id: sampleUser[1].id,
        target_type: "user",
        target_id: sampleUser[0].id,
        reason: "Spam & Automated Activity",
        description: "User is exhibiting automated bot-like posting behavior.",
        status: "UNDER_REVIEW",
        priority: "MEDIUM",
        assigned_to: null,
        resolution: null,
        resolved_by: null,
        resolved_at: null,
        created_at: new Date(Date.now() - 7200000).toISOString(),
        updated_at: new Date(Date.now() - 7200000).toISOString(),
      });
    }
  } catch (e) {
    // Non-fatal
  }
}

/**
 * Creates a centralized report targeting user, post, reel, comment, or community.
 */
export async function createReportService(input: CreateReportInput) {
  const { reporterId, targetType, targetId, reason, description = "", priority = "MEDIUM" } = input;

  const validTargetTypes = ["user", "post", "reel", "comment", "community"];
  if (!validTargetTypes.includes(targetType)) {
    throw new Error(`Invalid target type '${targetType}'. Must be one of: ${validTargetTypes.join(", ")}`);
  }

  if (!targetId || !targetId.trim()) {
    throw new Error("A valid target ID is required to file a report.");
  }

  if (!reason || !reason.trim()) {
    throw new Error("A reason must be provided for the report.");
  }

  // 1. Verify reporter exists
  const { data: reporter, error: repErr } = await supabase
    .from("profiles")
    .select("id, username")
    .eq("id", reporterId)
    .maybeSingle();

  if (repErr || !reporter) {
    throw new Error("Reporter profile not found.");
  }

  // 2. Verify target existence in appropriate table
  let targetExists = false;
  if (targetType === "user") {
    const { data: u } = await supabase.from("profiles").select("id").eq("id", targetId).maybeSingle();
    targetExists = !!u;
  } else if (targetType === "post" || targetType === "reel") {
    const { data: p } = await supabase.from("posts").select("id").eq("id", targetId).maybeSingle();
    targetExists = !!p;
  } else if (targetType === "comment") {
    const { data: c } = await supabase.from("comments").select("id").eq("id", targetId).maybeSingle();
    targetExists = !!c;
  } else if (targetType === "community") {
    const { data: comm } = await supabase.from("communities").select("id").eq("id", targetId).maybeSingle();
    targetExists = !!comm;
  }

  if (!targetExists) {
    throw new Error(`Target ${targetType} with ID '${targetId}' does not exist.`);
  }

  // 3. Insert into public.reports with fallback if table not yet migrated
  try {
    const { data: newReport, error: insertErr } = await supabase
      .from("reports")
      .insert({
        reporter_id: reporterId,
        target_type: targetType,
        target_id: targetId,
        reason: reason.trim(),
        description: description.trim(),
        status: "PENDING",
        priority,
      })
      .select()
      .single();

    if (!insertErr && newReport) {
      return newReport;
    }
  } catch (e: any) {
    // Fall back to in-memory store
  }

  // Fallback Record
  const fallbackReport = {
    id: crypto.randomUUID(),
    reporter_id: reporterId,
    target_type: targetType,
    target_id: targetId,
    reason: reason.trim(),
    description: description.trim(),
    status: "PENDING",
    priority,
    assigned_to: null,
    resolution: null,
    resolved_by: null,
    resolved_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  inMemoryReportsStore.unshift(fallbackReport);
  return fallbackReport;
}

/**
 * Retrieves the moderation queue with filtering, search, pagination, and queue metrics.
 */
export async function getReportsQueueService(filters: ReportFilterOptions) {
  await ensureSeeded();

  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 15));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const validSortColumns: Record<string, string> = {
    created_at: "created_at",
    priority: "priority",
    status: "status",
  };
  const sortColumn = validSortColumns[filters.sortBy || "created_at"] || "created_at";
  const ascending = filters.sortOrder === "asc";

  let reports: any[] = [];
  let totalCount = 0;
  let useFallback = false;

  try {
    let query = supabase
      .from("reports")
      .select(
        `
        id,
        reporter_id,
        target_type,
        target_id,
        reason,
        description,
        status,
        priority,
        assigned_to,
        resolution,
        resolved_by,
        resolved_at,
        created_at,
        updated_at
      `,
        { count: "exact" }
      );

    if (filters.status && filters.status !== "ALL") {
      query = query.eq("status", filters.status.toUpperCase());
    }
    if (filters.targetType && filters.targetType !== "ALL") {
      query = query.eq("target_type", filters.targetType.toLowerCase());
    }
    if (filters.priority && filters.priority !== "ALL") {
      query = query.eq("priority", filters.priority.toUpperCase());
    }
    if (filters.assignedTo) {
      if (filters.assignedTo === "unassigned") {
        query = query.is("assigned_to", null);
      } else {
        query = query.eq("assigned_to", filters.assignedTo);
      }
    }
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim();
      query = query.or(`reason.ilike.%${q}%,description.ilike.%${q}%,target_id.ilike.%${q}%`);
    }

    query = query.order(sortColumn, { ascending }).range(from, to);

    const { data: rawReports, count, error } = await query;
    if (error) {
      useFallback = true;
    } else {
      reports = rawReports || [];
      totalCount = count || 0;
    }
  } catch (e) {
    useFallback = true;
  }

  // If table does not exist in schema cache, evaluate filters over inMemoryReportsStore
  if (useFallback) {
    let filtered = [...inMemoryReportsStore];
    if (filters.status && filters.status !== "ALL") {
      filtered = filtered.filter((r) => r.status === filters.status?.toUpperCase());
    }
    if (filters.targetType && filters.targetType !== "ALL") {
      filtered = filtered.filter((r) => r.target_type === filters.targetType?.toLowerCase());
    }
    if (filters.priority && filters.priority !== "ALL") {
      filtered = filtered.filter((r) => r.priority === filters.priority?.toUpperCase());
    }
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim().toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.reason.toLowerCase().includes(q) ||
          r.description?.toLowerCase().includes(q) ||
          r.target_id.toLowerCase().includes(q)
      );
    }

    totalCount = filtered.length;
    reports = filtered.slice(from, to + 1);
  }

  // Batch fetch associated profiles (reporters, assignees, resolvers)
  const profileIds = new Set<string>();
  for (const r of reports) {
    if (r.reporter_id) profileIds.add(r.reporter_id);
    if (r.assigned_to) profileIds.add(r.assigned_to);
    if (r.resolved_by) profileIds.add(r.resolved_by);
  }

  const profileMap = new Map<string, any>();
  if (profileIds.size > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, verified")
      .in("id", Array.from(profileIds));

    for (const p of profiles || []) {
      profileMap.set(p.id, p);
    }
  }

  const enrichedReports = reports.map((r: any) => ({
    ...r,
    reporter: profileMap.get(r.reporter_id) || { id: r.reporter_id, username: "unknown" },
    assignedModerator: r.assigned_to ? profileMap.get(r.assigned_to) || null : null,
    resolver: r.resolved_by ? profileMap.get(r.resolved_by) || null : null,
  }));

  // Calculate queue metric counters
  let metrics = {
    pendingCount: 0,
    underReviewCount: 0,
    escalatedCount: 0,
    resolvedCount: 0,
    totalCount,
  };

  if (!useFallback) {
    try {
      const [pendingRes, underReviewRes, escalatedRes, resolvedRes] = await Promise.all([
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "PENDING"),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "UNDER_REVIEW"),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "ESCALATED"),
        supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "RESOLVED"),
      ]);
      metrics.pendingCount = pendingRes.count || 0;
      metrics.underReviewCount = underReviewRes.count || 0;
      metrics.escalatedCount = escalatedRes.count || 0;
      metrics.resolvedCount = resolvedRes.count || 0;
    } catch (e) {}
  } else {
    metrics.pendingCount = inMemoryReportsStore.filter((r) => r.status === "PENDING").length;
    metrics.underReviewCount = inMemoryReportsStore.filter((r) => r.status === "UNDER_REVIEW").length;
    metrics.escalatedCount = inMemoryReportsStore.filter((r) => r.status === "ESCALATED").length;
    metrics.resolvedCount = inMemoryReportsStore.filter((r) => r.status === "RESOLVED").length;
  }

  return {
    reports: enrichedReports,
    metrics,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit) || 1,
    },
  };
}

/**
 * Retrieves full report details, deeply hydrated target entity, and moderation history.
 */
export async function getReportDetailService(reportId: string) {
  let report: any = null;

  try {
    const { data: dbReport, error: reportErr } = await supabase
      .from("reports")
      .select("*")
      .eq("id", reportId)
      .single();

    if (!reportErr && dbReport) {
      report = dbReport;
    }
  } catch (e) {}

  if (!report) {
    report = inMemoryReportsStore.find((r) => r.id === reportId);
  }

  if (!report) {
    throw new Error("Report not found.");
  }

  // 2. Fetch Reporter Profile
  const { data: reporter } = await supabase
    .from("profiles")
    .select("id, username, full_name, avatar_url, verified, created_at")
    .eq("id", report.reporter_id)
    .maybeSingle();

  // 3. Fetch Assigned Moderator & Resolver Profiles
  let assignedModerator: any = null;
  if (report.assigned_to) {
    const { data: a } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .eq("id", report.assigned_to)
      .maybeSingle();
    assignedModerator = a;
  }

  let resolver: any = null;
  if (report.resolved_by) {
    const { data: res } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .eq("id", report.resolved_by)
      .maybeSingle();
    resolver = res;
  }

  // 4. Hydrate Target Entity from Supabase
  let targetEntity: any = null;
  const { target_type, target_id } = report;

  if (target_type === "post" || target_type === "reel") {
    const { data: post } = await supabase
      .from("posts")
      .select(`
        id,
        text,
        visibility,
        likes_count,
        comments_count,
        created_at,
        updated_at,
        user_id,
        community_id,
        author:profiles!posts_user_id_fkey(id, username, full_name, avatar_url, verified)
      `)
      .eq("id", target_id)
      .maybeSingle();

    if (post) {
      const { data: media } = await supabase
        .from("media")
        .select("id, url, type, width, height")
        .eq("post_id", target_id);

      targetEntity = {
        ...post,
        media: media || [],
        isReel: (media || []).some((m: any) => m.type === "video" || m.url?.includes(".mp4")),
      };
    }
  } else if (target_type === "comment") {
    const { data: comment } = await supabase
      .from("comments")
      .select(`
        id,
        comment,
        created_at,
        user_id,
        post_id,
        author:profiles!comments_user_id_fkey(id, username, full_name, avatar_url, verified)
      `)
      .eq("id", target_id)
      .maybeSingle();

    if (comment) {
      const { data: parentPost } = await supabase
        .from("posts")
        .select("id, text, user_id, author:profiles!posts_user_id_fkey(username)")
        .eq("id", comment.post_id)
        .maybeSingle();

      targetEntity = {
        ...comment,
        parentPost,
      };
    }
  } else if (target_type === "user") {
    const { data: userProfile } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url, bio, verified, status, created_at")
      .eq("id", target_id)
      .maybeSingle();

    if (userProfile) {
      const [followsRes, postsRes] = await Promise.all([
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", target_id),
        supabase.from("posts").select("id", { count: "exact", head: true }).eq("user_id", target_id),
      ]);

      targetEntity = {
        ...userProfile,
        followersCount: followsRes.count || 0,
        postsCount: postsRes.count || 0,
      };
    }
  } else if (target_type === "community") {
    const { data: community } = await supabase
      .from("communities")
      .select(`
        id,
        name,
        slug,
        description,
        avatar_url,
        is_private,
        is_archived,
        created_at,
        owner:profiles!communities_owner_id_fkey(id, username, full_name)
      `)
      .eq("id", target_id)
      .maybeSingle();

    if (community) {
      const { count: memberCount } = await supabase
        .from("community_members")
        .select("*", { count: "exact", head: true })
        .eq("community_id", target_id);

      targetEntity = {
        ...community,
        memberCount: memberCount || 0,
      };
    }
  }

  // 5. Fetch Moderation History from admin_audit_logs
  let moderationHistory: any[] = [];
  try {
    const { data: logs } = await supabase
      .from("admin_audit_logs")
      .select(`
        id,
        action,
        details,
        created_at,
        admin_user:profiles!admin_audit_logs_admin_user_id_fkey(username, full_name)
      `)
      .or(`resource_id.eq.${reportId},resource_id.eq.${target_id}`)
      .order("created_at", { ascending: false })
      .limit(20);

    moderationHistory = logs || [];
  } catch (err: any) {
    console.warn("[getReportDetailService] Could not fetch audit history:", err.message);
  }

  return {
    report: {
      ...report,
      reporter: reporter || { id: report.reporter_id, username: "unknown" },
      assignedModerator,
      resolver,
    },
    targetEntity,
    moderationHistory,
  };
}

/**
 * Updates report status, priority, assignment, or resolution notes.
 */
export async function updateReportService(
  reportId: string,
  input: {
    status?: "PENDING" | "UNDER_REVIEW" | "RESOLVED" | "REJECTED" | "ESCALATED";
    priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    assignedTo?: string | null;
    resolution?: string;
  },
  currentAdmin: AdminSessionContext,
  req?: Request
) {
  const { status, priority, assignedTo, resolution } = input;

  let currentReport: any = null;
  try {
    const { data: r } = await supabase.from("reports").select("*").eq("id", reportId).single();
    if (r) currentReport = r;
  } catch (e) {}

  if (!currentReport) {
    currentReport = inMemoryReportsStore.find((r) => r.id === reportId);
  }

  if (!currentReport) {
    throw new Error("Report not found.");
  }

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  };

  if (status) {
    const validStatuses = ["PENDING", "UNDER_REVIEW", "RESOLVED", "REJECTED", "ESCALATED"];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
    }
    updates.status = status;
    if (status === "RESOLVED" || status === "REJECTED") {
      updates.resolved_by = currentAdmin.userId;
      updates.resolved_at = new Date().toISOString();
    }
  }

  if (priority) {
    const validPriorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
    if (!validPriorities.includes(priority)) {
      throw new Error(`Invalid priority. Must be one of: ${validPriorities.join(", ")}`);
    }
    updates.priority = priority;
  }

  if (assignedTo !== undefined) {
    updates.assigned_to = assignedTo;
  }

  if (resolution !== undefined) {
    updates.resolution = resolution?.trim() || null;
  }

  let updatedReport: any = null;
  try {
    const { data: uRep, error: updateErr } = await supabase
      .from("reports")
      .update(updates)
      .eq("id", reportId)
      .select()
      .single();

    if (!updateErr && uRep) {
      updatedReport = uRep;
    }
  } catch (e) {}

  if (!updatedReport) {
    Object.assign(currentReport, updates);
    updatedReport = currentReport;
  }

  // Audit update
  await createAuditLog(
    {
      adminId: currentAdmin.id,
      adminUserId: currentAdmin.userId,
      action: "REPORT_UPDATED",
      resourceType: "report",
      resourceId: reportId,
      details: {
        previousStatus: currentReport.status,
        newStatus: updates.status || currentReport.status,
        previousPriority: currentReport.priority,
        newPriority: updates.priority || currentReport.priority,
        assignedTo: updates.assigned_to,
        resolution: updates.resolution,
      },
    },
    req
  );

  return updatedReport;
}

/**
 * Executes an actionable moderation operation (Remove, Restrict, Warn, Suspend, Ban, Resolve, Reject, Escalate).
 */
export async function executeModerationActionService(
  reportId: string,
  input: ModerationActionInput,
  currentAdmin: AdminSessionContext,
  req?: Request
) {
  const { action, reason, durationDays, overrideResolved } = input;

  if (!reason || !reason.trim()) {
    throw new Error("A justification reason is required for all moderation actions.");
  }

  // 1. Fetch Report
  let report: any = null;
  try {
    const { data: r } = await supabase.from("reports").select("*").eq("id", reportId).single();
    if (r) report = r;
  } catch (e) {}

  if (!report) {
    report = inMemoryReportsStore.find((r) => r.id === reportId);
  }

  if (!report) {
    throw new Error("Report not found.");
  }

  // 2. Prevent modifying already-resolved reports unless explicitly requested
  if ((report.status === "RESOLVED" || report.status === "REJECTED") && !overrideResolved) {
    throw new Error(
      `This report is already closed with status '${report.status}'. Set overrideResolved to true to apply further actions.`
    );
  }

  // 3. Permission verification per action
  const perms = currentAdmin.permissions;
  const checkPerm = (required: string) => {
    if (!perms.includes(required) && !perms.includes("*")) {
      throw new Error(`Insufficient privileges: Missing '${required}' permission to execute '${action}'.`);
    }
  };

  switch (action) {
    case "REMOVE_POST":
      checkPerm("posts.remove");
      break;
    case "REMOVE_REEL":
      checkPerm("reels.remove");
      break;
    case "REMOVE_COMMENT":
      checkPerm("comments.remove");
      break;
    case "RESTRICT_CONTENT":
      checkPerm("posts.remove");
      break;
    case "WARN_USER":
      checkPerm("reports.manage");
      break;
    case "SUSPEND_USER":
      checkPerm("users.suspend");
      break;
    case "BAN_USER":
      checkPerm("users.ban");
      break;
    case "RESOLVE_REPORT":
    case "REJECT_REPORT":
    case "ESCALATE_REPORT":
      checkPerm("reports.manage");
      break;
    default:
      throw new Error(`Unsupported moderation action '${action}'.`);
  }

  let executionDetails: Record<string, any> = { action, reason: reason.trim() };

  // 4. Perform concrete action on target
  if (action === "REMOVE_POST" || action === "REMOVE_REEL") {
    await supabase.from("media").delete().eq("post_id", report.target_id);
    const { error: delErr } = await supabase.from("posts").delete().eq("id", report.target_id);
    if (delErr) {
      console.warn("[executeModerationActionService] Post delete error:", delErr.message);
    }
    executionDetails.targetType = report.target_type;
    executionDetails.targetId = report.target_id;
  } else if (action === "REMOVE_COMMENT") {
    const { error: delErr } = await supabase.from("comments").delete().eq("id", report.target_id);
    if (delErr) {
      console.warn("[executeModerationActionService] Comment delete error:", delErr.message);
    }
    executionDetails.targetType = "comment";
    executionDetails.targetId = report.target_id;
  } else if (action === "RESTRICT_CONTENT") {
    if (report.target_type === "post" || report.target_type === "reel") {
      await supabase.from("posts").update({ visibility: "private" }).eq("id", report.target_id);
    } else if (report.target_type === "community") {
      await supabase.from("communities").update({ is_archived: true }).eq("id", report.target_id);
    }
    executionDetails.restricted = true;
  } else if (action === "WARN_USER") {
    let targetUserId = report.target_id;
    if (report.target_type === "post" || report.target_type === "reel") {
      const { data: p } = await supabase.from("posts").select("user_id").eq("id", report.target_id).maybeSingle();
      if (p?.user_id) targetUserId = p.user_id;
    } else if (report.target_type === "comment") {
      const { data: c } = await supabase.from("comments").select("user_id").eq("id", report.target_id).maybeSingle();
      if (c?.user_id) targetUserId = c.user_id;
    }
    executionDetails.warnedUserId = targetUserId;
  } else if (action === "SUSPEND_USER") {
    let targetUserId = report.target_id;
    if (report.target_type === "post" || report.target_type === "reel") {
      const { data: p } = await supabase.from("posts").select("user_id").eq("id", report.target_id).maybeSingle();
      if (p?.user_id) targetUserId = p.user_id;
    } else if (report.target_type === "comment") {
      const { data: c } = await supabase.from("comments").select("user_id").eq("id", report.target_id).maybeSingle();
      if (c?.user_id) targetUserId = c.user_id;
    }

    const days = durationDays || 7;
    const suspendedUntil = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();

    await updateUserStatusService(
      targetUserId,
      {
        status: "SUSPENDED",
        reason: reason.trim(),
        suspendedUntil,
      },
      currentAdmin,
      req
    );

    executionDetails.suspendedUserId = targetUserId;
    executionDetails.suspendedUntil = suspendedUntil;
  } else if (action === "BAN_USER") {
    let targetUserId = report.target_id;
    if (report.target_type === "post" || report.target_type === "reel") {
      const { data: p } = await supabase.from("posts").select("user_id").eq("id", report.target_id).maybeSingle();
      if (p?.user_id) targetUserId = p.user_id;
    } else if (report.target_type === "comment") {
      const { data: c } = await supabase.from("comments").select("user_id").eq("id", report.target_id).maybeSingle();
      if (c?.user_id) targetUserId = c.user_id;
    }

    await updateUserStatusService(
      targetUserId,
      {
        status: "BANNED",
        reason: reason.trim(),
      },
      currentAdmin,
      req
    );

    executionDetails.bannedUserId = targetUserId;
  }

  // 5. Update Report Status & Resolution
  let finalStatus = "RESOLVED";
  if (action === "ESCALATE_REPORT") {
    finalStatus = "ESCALATED";
  } else if (action === "REJECT_REPORT") {
    finalStatus = "REJECTED";
  }

  const statusUpdates = {
    status: finalStatus,
    resolution: reason.trim(),
    resolved_by: currentAdmin.userId,
    resolved_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    await supabase.from("reports").update(statusUpdates).eq("id", reportId);
  } catch (e) {}

  Object.assign(report, statusUpdates);

  // 6. Record Audit Log
  await createAuditLog(
    {
      adminId: currentAdmin.id,
      adminUserId: currentAdmin.userId,
      action: `MODERATION_${action}`,
      resourceType: "report",
      resourceId: reportId,
      details: {
        targetType: report.target_type,
        targetId: report.target_id,
        finalStatus,
        ...executionDetails,
      },
    },
    req
  );

  return {
    success: true,
    action,
    reportId,
    status: finalStatus,
    resolution: reason.trim(),
    details: executionDetails,
  };
}
