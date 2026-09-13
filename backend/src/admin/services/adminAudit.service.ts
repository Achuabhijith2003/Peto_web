import { Request } from "express";
import { supabase } from "../../config/supabase";
import { AuditLogInput } from "../admin.types";

/**
 * Extract client IP address from Express request
 */
export function getClientIp(req?: Request): string | null {
  if (!req) return null;
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string") {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress || null;
}

/**
 * Extract client User-Agent string
 */
export function getUserAgent(req?: Request): string | null {
  if (!req) return null;
  const ua = req.headers["user-agent"];
  return typeof ua === "string" ? ua : null;
}

/**
 * Creates an immutable record in admin_audit_logs.
 * Asynchronous and resilient — failures do not halt caller execution.
 */
export async function createAuditLog(
  input: AuditLogInput,
  req?: Request
): Promise<void> {
  try {
    const ipAddress = input.ipAddress || getClientIp(req);
    const userAgent = input.userAgent || getUserAgent(req);

    const { error } = await supabase.from("admin_audit_logs").insert({
      admin_id: input.adminId || null,
      admin_user_id: input.adminUserId || null,
      action: input.action,
      resource_type: input.resourceType,
      resource_id: input.resourceId || null,
      details: input.details || {},
      ip_address: ipAddress,
      user_agent: userAgent,
    });

    if (error) {
      console.error("[AuditLogService] Failed to persist audit log entry:", error.message);
    }
  } catch (err: any) {
    console.error("[AuditLogService] Unexpected error persisting audit log:", err.message);
  }
}

/**
 * Fetch paginated and filtered audit logs
 */
export async function getAuditLogsService(filters: {
  page?: number;
  limit?: number;
  action?: string;
  adminUserId?: string;
  resourceType?: string;
  startDate?: string;
  endDate?: string;
}) {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("admin_audit_logs")
    .select(`
      id,
      admin_id,
      admin_user_id,
      action,
      resource_type,
      resource_id,
      details,
      ip_address,
      user_agent,
      created_at,
      admin_user:profiles!admin_audit_logs_admin_user_id_fkey(
        id,
        username,
        full_name,
        avatar_url
      )
    `, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (filters.action) {
    query = query.eq("action", filters.action);
  }

  if (filters.adminUserId) {
    query = query.eq("admin_user_id", filters.adminUserId);
  }

  if (filters.resourceType) {
    query = query.eq("resource_type", filters.resourceType);
  }

  if (filters.startDate) {
    query = query.gte("created_at", filters.startDate);
  }

  if (filters.endDate) {
    query = query.lte("created_at", filters.endDate);
  }

  const { data, count, error } = await query;

  if (error) {
    // If the table doesn't exist yet, return descriptive error
    if (error.code === "PGRST205" || error.message.includes("Could not find the table")) {
      throw new Error("Admin audit logs table not found. Please execute database migration 11.");
    }
    throw error;
  }

  return {
    logs: data || [],
    pagination: {
      page,
      limit,
      totalCount: count || 0,
      totalPages: Math.ceil((count || 0) / limit),
    },
  };
}
