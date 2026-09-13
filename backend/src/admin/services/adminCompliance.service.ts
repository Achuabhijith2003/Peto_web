import { supabase } from "../../config/supabase";
import { createAuditLog } from "./adminAudit.service";

export type PolicyType =
  | "TERMS_OF_SERVICE"
  | "PRIVACY_POLICY"
  | "COMMUNITY_GUIDELINES"
  | "CONTENT_POLICY"
  | "ADVERTISING_POLICY"
  | "COOKIE_POLICY";

export type PolicyStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export type DataRequestType =
  | "DATA_ACCESS"
  | "DATA_EXPORT"
  | "ACCOUNT_DELETION"
  | "DATA_CORRECTION"
  | "PRIVACY_REQUEST";

export type DataRequestStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "REJECTED";

export type RetentionCategory =
  | "DELETED_USERS"
  | "DELETED_POSTS"
  | "DELETED_MEDIA"
  | "REPORTS"
  | "MODERATION_RECORDS"
  | "AUDIT_LOGS";

// Default policies fallback for resilient operations
export const DEFAULT_COMPLIANCE_POLICIES = [
  {
    id: "default-tos-1",
    policy_type: "TERMS_OF_SERVICE" as PolicyType,
    title: "Terms of Service",
    version: "1.0.0",
    status: "PUBLISHED" as PolicyStatus,
    content: `# Peto Terms of Service\n\n**Effective Date: January 1, 2026**\n\nWelcome to Peto! By accessing or using our mobile application, website, and services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.\n\n### 1. User Eligibility\nYou must be at least 13 years old to create an account on Peto. By registering, you warrant that all information provided is accurate and truthful.\n\n### 2. Community Standards\nYou agree not to post content that depicts animal cruelty, illegal wildlife trade, harassment, hate speech, or sexually explicit material.\n\n### 3. Account Termination\nPeto reserves the right to suspend or terminate accounts that violate our community standards or pose a security risk.\n\n### 4. Contact\nFor questions regarding these Terms, contact legal@peto.app.`,
    summary_of_changes: "Initial official release of Peto Terms of Service.",
    published_at: "2026-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "default-pp-1",
    policy_type: "PRIVACY_POLICY" as PolicyType,
    title: "Privacy Policy",
    version: "1.0.0",
    status: "PUBLISHED" as PolicyStatus,
    content: `# Peto Privacy Policy\n\n**Effective Date: January 1, 2026**\n\nYour privacy is paramount to us. This Privacy Policy explains how Peto collects, uses, protects, and discloses personal information.\n\n### 1. Information Collected\nWe collect information you provide directly (username, profile details, pet information, uploaded photos and videos) and usage data (interactions, likes, bookmarks).\n\n### 2. How Information is Used\nTo deliver social features, suggest relevant pet communities, ensure community safety, and prevent fraudulent activity.\n\n### 3. Your Rights (GDPR & CCPA)\nYou have the right to request access to your data, request data exports, correct inaccuracies, or request permanent account deletion via our Privacy Center.\n\n### 4. Data Security\nWe employ TLS encryption and enterprise database access controls to safeguard your data.`,
    summary_of_changes: "Initial official release of Peto Privacy Policy.",
    published_at: "2026-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "default-cg-1",
    policy_type: "COMMUNITY_GUIDELINES" as PolicyType,
    title: "Community Guidelines",
    version: "1.0.0",
    status: "PUBLISHED" as PolicyStatus,
    content: `# Peto Community Guidelines\n\n**Effective Date: January 1, 2026**\n\nPeto is dedicated to creating a safe, loving, and supportive space for pets and pet parents.\n\n### 1. Animal Welfare First\nWe maintain zero tolerance for animal neglect, animal cruelty, abusive training methods, or illegal animal fighting.\n\n### 2. Kindness & Respect\nTreat fellow pet lovers with empathy. Bullying, hate speech, and personal harassment will result in immediate suspension.\n\n### 3. Authentic Content\nShare genuine stories and advice. Misleading medical advice or deceptive commercial scams are strictly prohibited.`,
    summary_of_changes: "Initial official release of Peto Community Guidelines.",
    published_at: "2026-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "default-cp-1",
    policy_type: "CONTENT_POLICY" as PolicyType,
    title: "Content & Media Policy",
    version: "1.0.0",
    status: "PUBLISHED" as PolicyStatus,
    content: `# Peto Content & Media Policy\n\n**Effective Date: January 1, 2026**\n\nThis policy outlines acceptable media formats, copyright standards, and prohibited visual content across posts, reels, and comments.\n\n### 1. Intellectual Property\nOnly upload photos, videos, and media that you own or have explicit permission to share.\n\n### 2. Sensitive Content\nGraphic injury depictions or hazardous animal situations will be removed or restricted behind warning screens.\n\n### 3. Moderation Enforcement\nContent flagged by users undergoes review by human moderators and automated safety filters.`,
    summary_of_changes: "Initial official release of Peto Content Policy.",
    published_at: "2026-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "default-ap-1",
    policy_type: "ADVERTISING_POLICY" as PolicyType,
    title: "Advertising & Promotion Policy",
    version: "1.0.0",
    status: "PUBLISHED" as PolicyStatus,
    content: `# Peto Advertising Policy\n\n**Effective Date: January 1, 2026**\n\nGuidelines for sponsored content, advertisements, and community promotions on Peto.\n\n### 1. Prohibited Products\nWe prohibit advertising for non-certified pet pharmaceuticals, puppy mills, aggressive commercial breeding, and untested supplements.\n\n### 2. Transparency\nAll sponsored content and paid campaigns must clearly declare sponsor attribution.\n\n### 3. Compliance Review\nAll ad creatives are pre-screened for compliance before delivery.`,
    summary_of_changes: "Initial official release of Peto Advertising Policy.",
    published_at: "2026-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "default-ck-1",
    policy_type: "COOKIE_POLICY" as PolicyType,
    title: "Cookie & Tracking Policy",
    version: "1.0.0",
    status: "PUBLISHED" as PolicyStatus,
    content: `# Peto Cookie Policy\n\n**Effective Date: January 1, 2026**\n\nExplanation of cookies, local storage, and tracking technologies utilized on the Peto web platform.\n\n### 1. Essential Cookies\nRequired for authentication, session continuity, and account security.\n\n### 2. Functional & Analytical Storage\nUsed to remember preferences (e.g. theme, volume) and gather aggregate performance metrics to improve response times.\n\n### 3. Managing Cookies\nYou can control or disable non-essential cookies through your browser settings.`,
    summary_of_changes: "Initial official release of Peto Cookie Policy.",
    published_at: "2026-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
];

// Default retention categories fallback
export const DEFAULT_RETENTION_POLICIES = [
  {
    category: "DELETED_USERS" as RetentionCategory,
    name: "Deleted User Accounts",
    retention_days: 30,
    description: "Grace period allowing users to recover accidentally closed accounts before personal identifiable information (PII) is permanently scrubbed or anonymized.",
    legal_basis: "GDPR Art. 17 (Right to erasure) with standard 30-day operational recovery grace period.",
    auto_purge_enabled: false,
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    category: "DELETED_POSTS" as RetentionCategory,
    name: "Deleted Posts & Comments",
    retention_days: 30,
    description: "Soft-deleted posts and commentary retained temporarily for abuse prevention, moderation review, and audit reconciliation.",
    legal_basis: "Legitimate interests (fraud prevention, platform security) prior to hard deletion.",
    auto_purge_enabled: false,
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    category: "DELETED_MEDIA" as RetentionCategory,
    name: "Orphaned & Deleted Media",
    retention_days: 14,
    description: "Storage retention window for image and video blobs marked for deletion before storage bucket cleanup tasks run.",
    legal_basis: "Storage management and operational hygiene.",
    auto_purge_enabled: false,
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    category: "REPORTS" as RetentionCategory,
    name: "User Content Reports",
    retention_days: 365,
    description: "Retention duration for user-submitted safety reports to track repeat offense patterns and evaluate moderation accuracy.",
    legal_basis: "Platform safety, community defense, and recurring harassment prevention.",
    auto_purge_enabled: false,
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    category: "MODERATION_RECORDS" as RetentionCategory,
    name: "Moderator Action Records",
    retention_days: 730,
    description: "Administrative moderation decisions, suspension histories, and ban logs preserved for dispute resolution and transparency.",
    legal_basis: "Legal defense, regulatory accountability, and DSA compliance records.",
    auto_purge_enabled: false,
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    category: "AUDIT_LOGS" as RetentionCategory,
    name: "Administrative Audit Logs",
    retention_days: 90,
    description: "Immutable administrative action logs kept for security monitoring, forensics, and compliance verification.",
    legal_basis: "SOC2 / ISO 27001 operational security and administrative audit requirements.",
    auto_purge_enabled: false,
    updated_at: "2026-01-01T00:00:00Z",
  },
];

// In-memory runtime cache for resilience if database schema is awaiting execution
let runtimePolicies = [...DEFAULT_COMPLIANCE_POLICIES];
let runtimeDataRequests: any[] = [];
let runtimeRetentionPolicies = [...DEFAULT_RETENTION_POLICIES];

// ============================================================
// 1. POLICIES SERVICES
// ============================================================

export async function getPoliciesService(filters?: {
  policyType?: string;
  status?: string;
}) {
  try {
    let query = supabase
      .from("compliance_policies")
      .select(`
        id,
        policy_type,
        title,
        version,
        status,
        content,
        summary_of_changes,
        published_at,
        created_by,
        created_at,
        updated_at,
        creator:profiles!compliance_policies_created_by_fkey(id, username, full_name)
      `)
      .order("created_at", { ascending: false });

    if (filters?.policyType && filters.policyType !== "ALL") {
      query = query.eq("policy_type", filters.policyType);
    }
    if (filters?.status && filters.status !== "ALL") {
      query = query.eq("status", filters.status);
    }

    const { data, error } = await query;
    if (error) throw error;
    if (data && data.length > 0) return data;
  } catch (err: any) {
    // Fallback to runtime policies
  }

  let result = [...runtimePolicies];
  if (filters?.policyType && filters.policyType !== "ALL") {
    result = result.filter((p) => p.policy_type === filters.policyType);
  }
  if (filters?.status && filters.status !== "ALL") {
    result = result.filter((p) => p.status === filters.status);
  }
  return result;
}

export async function getPolicyDetailService(id: string) {
  try {
    const { data, error } = await supabase
      .from("compliance_policies")
      .select(`
        id,
        policy_type,
        title,
        version,
        status,
        content,
        summary_of_changes,
        published_at,
        created_by,
        created_at,
        updated_at,
        creator:profiles!compliance_policies_created_by_fkey(id, username, full_name)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    if (data) return data;
  } catch (err: any) {
    // Fallback check
  }

  const found = runtimePolicies.find((p) => p.id === id);
  if (!found) {
    const error: any = new Error("Policy document not found.");
    error.status = 404;
    throw error;
  }
  return found;
}

export async function createPolicyDraftService(
  input: {
    policyType: string;
    title: string;
    version: string;
    content: string;
    summaryOfChanges?: string;
  },
  adminUserId?: string
) {
  const { policyType, title, version, content, summaryOfChanges = "" } = input;

  if (!policyType || !title || !version || !content) {
    const error: any = new Error("Missing required fields: policyType, title, version, and content are mandatory.");
    error.status = 400;
    throw error;
  }

  const payload = {
    policy_type: policyType,
    title: title.trim(),
    version: version.trim(),
    status: "DRAFT" as PolicyStatus,
    content: content.trim(),
    summary_of_changes: summaryOfChanges.trim(),
    created_by: adminUserId || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from("compliance_policies")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    await createAuditLog({
      adminId: adminUserId,
      action: "POLICY_DRAFT_CREATED",
      resourceType: "COMPLIANCE_POLICY",
      resourceId: data.id,
      details: { policyType, version, title },
    });

    return data;
  } catch (err: any) {
    // Fallback to runtime
    const newPolicy = {
      id: `policy-${Date.now()}`,
      ...payload,
      published_at: undefined,
    };
    runtimePolicies.unshift(newPolicy as any);

    await createAuditLog({
      adminId: adminUserId,
      action: "POLICY_DRAFT_CREATED",
      resourceType: "COMPLIANCE_POLICY",
      resourceId: newPolicy.id,
      details: { policyType, version, title, note: "Recorded in runtime store" },
    });

    return newPolicy;
  }
}

export async function publishPolicyService(id: string, adminUserId?: string) {
  const now = new Date().toISOString();

  // First fetch policy
  const policy = await getPolicyDetailService(id);

  try {
    // 1. Archive any current PUBLISHED policy of this type
    await supabase
      .from("compliance_policies")
      .update({ status: "ARCHIVED", updated_at: now })
      .eq("policy_type", policy.policy_type)
      .eq("status", "PUBLISHED");

    // 2. Mark this policy as PUBLISHED
    const { data, error } = await supabase
      .from("compliance_policies")
      .update({
        status: "PUBLISHED",
        published_at: now,
        updated_at: now,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await createAuditLog({
      adminId: adminUserId,
      action: "POLICY_PUBLISHED",
      resourceType: "COMPLIANCE_POLICY",
      resourceId: id,
      details: {
        policyType: policy.policy_type,
        version: policy.version,
        title: policy.title,
      },
    });

    return data;
  } catch (err: any) {
    // Runtime fallback
    runtimePolicies.forEach((p) => {
      if (p.policy_type === policy.policy_type && p.status === "PUBLISHED") {
        p.status = "ARCHIVED";
        p.updated_at = now;
      }
    });

    const target = runtimePolicies.find((p) => p.id === id);
    if (target) {
      target.status = "PUBLISHED";
      target.published_at = now;
      target.updated_at = now;
    }

    await createAuditLog({
      adminId: adminUserId,
      action: "POLICY_PUBLISHED",
      resourceType: "COMPLIANCE_POLICY",
      resourceId: id,
      details: {
        policyType: policy.policy_type,
        version: policy.version,
        title: policy.title,
      },
    });

    return target;
  }
}

// ============================================================
// 2. DATA PRIVACY REQUESTS SERVICES
// ============================================================

export async function getDataRequestsService(filters?: {
  status?: string;
  requestType?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, Number(filters?.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters?.limit) || 20));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  try {
    let query = supabase
      .from("compliance_data_requests")
      .select(`
        id,
        user_id,
        request_type,
        status,
        details,
        verification_status,
        resolution_notes,
        processed_by,
        created_at,
        updated_at,
        completed_at,
        user:profiles!compliance_data_requests_user_id_fkey(id, username, full_name, avatar_url),
        processor:profiles!compliance_data_requests_processed_by_fkey(id, username, full_name)
      `, { count: "exact" })
      .order("created_at", { ascending: false });

    if (filters?.status && filters.status !== "ALL") {
      query = query.eq("status", filters.status);
    }
    if (filters?.requestType && filters.requestType !== "ALL") {
      query = query.eq("request_type", filters.requestType);
    }

    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      requests: data || [],
      pagination: {
        page,
        limit,
        total: count || (data ? data.length : 0),
        totalPages: Math.ceil((count || 0) / limit) || 1,
      },
    };
  } catch (err: any) {
    // Fallback to runtime store
    let filtered = [...runtimeDataRequests];
    if (filters?.status && filters.status !== "ALL") {
      filtered = filtered.filter((r) => r.status === filters.status);
    }
    if (filters?.requestType && filters.requestType !== "ALL") {
      filtered = filtered.filter((r) => r.request_type === filters.requestType);
    }

    const total = filtered.length;
    const paginated = filtered.slice(from, to + 1);

    return {
      requests: paginated,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }
}

export async function getDataRequestDetailService(id: string) {
  try {
    const { data, error } = await supabase
      .from("compliance_data_requests")
      .select(`
        id,
        user_id,
        request_type,
        status,
        details,
        verification_status,
        resolution_notes,
        processed_by,
        created_at,
        updated_at,
        completed_at,
        user:profiles!compliance_data_requests_user_id_fkey(id, username, full_name, avatar_url),
        processor:profiles!compliance_data_requests_processed_by_fkey(id, username, full_name)
      `)
      .eq("id", id)
      .single();

    if (error) throw error;
    if (data) return data;
  } catch (err: any) {
    // Fallback
  }

  const found = runtimeDataRequests.find((r) => r.id === id);
  if (!found) {
    const error: any = new Error("Data request not found.");
    error.status = 404;
    throw error;
  }
  return found;
}

export async function createDataRequestService(
  input: {
    userId?: string;
    requestType: string;
    details?: string;
    verificationStatus?: string;
  },
  adminUserId?: string
) {
  const { userId, requestType, details = "", verificationStatus = "VERIFIED" } = input;

  const validTypes: DataRequestType[] = [
    "DATA_ACCESS",
    "DATA_EXPORT",
    "ACCOUNT_DELETION",
    "DATA_CORRECTION",
    "PRIVACY_REQUEST",
  ];

  if (!validTypes.includes(requestType as DataRequestType)) {
    const error: any = new Error(`Invalid requestType. Supported types: ${validTypes.join(", ")}`);
    error.status = 400;
    throw error;
  }

  const payload = {
    user_id: userId || null,
    request_type: requestType,
    status: "PENDING" as DataRequestStatus,
    details: details.trim(),
    verification_status: verificationStatus,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    const { data, error } = await supabase
      .from("compliance_data_requests")
      .insert(payload)
      .select()
      .single();

    if (error) throw error;

    await createAuditLog({
      adminId: adminUserId,
      action: "DATA_REQUEST_CREATED",
      resourceType: "DATA_REQUEST",
      resourceId: data.id,
      details: { userId, requestType, status: "PENDING" },
    });

    return data;
  } catch (err: any) {
    const newReq = {
      id: `req-${Date.now()}`,
      ...payload,
      user: userId ? { id: userId, username: "user", full_name: "Peto User" } : null,
      processor: null,
      completed_at: null,
    };
    runtimeDataRequests.unshift(newReq);

    await createAuditLog({
      adminId: adminUserId,
      action: "DATA_REQUEST_CREATED",
      resourceType: "DATA_REQUEST",
      resourceId: newReq.id,
      details: { userId, requestType, status: "PENDING" },
    });

    return newReq;
  }
}

export async function updateDataRequestStatusService(
  id: string,
  input: {
    status: string;
    resolutionNotes?: string;
  },
  adminUserId?: string
) {
  const { status, resolutionNotes = "" } = input;

  const validStatuses: DataRequestStatus[] = ["PENDING", "PROCESSING", "COMPLETED", "REJECTED"];
  if (!validStatuses.includes(status as DataRequestStatus)) {
    const error: any = new Error(`Invalid status. Supported statuses: ${validStatuses.join(", ")}`);
    error.status = 400;
    throw error;
  }

  const now = new Date().toISOString();
  const isCompleted = status === "COMPLETED" || status === "REJECTED";

  const updateFields: any = {
    status,
    resolution_notes: resolutionNotes.trim(),
    processed_by: adminUserId || null,
    updated_at: now,
    completed_at: isCompleted ? now : null,
  };

  try {
    const { data, error } = await supabase
      .from("compliance_data_requests")
      .update(updateFields)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    await createAuditLog({
      adminId: adminUserId,
      action: "DATA_REQUEST_STATUS_UPDATED",
      resourceType: "DATA_REQUEST",
      resourceId: id,
      details: { status, resolutionNotes },
    });

    return data;
  } catch (err: any) {
    const target = runtimeDataRequests.find((r) => r.id === id);
    if (!target) {
      const error: any = new Error("Data request not found.");
      error.status = 404;
      throw error;
    }

    Object.assign(target, updateFields);

    await createAuditLog({
      adminId: adminUserId,
      action: "DATA_REQUEST_STATUS_UPDATED",
      resourceType: "DATA_REQUEST",
      resourceId: id,
      details: { status, resolutionNotes },
    });

    return target;
  }
}

// ============================================================
// 3. RETENTION POLICIES SERVICES
// ============================================================

export async function getRetentionPoliciesService() {
  try {
    const { data, error } = await supabase
      .from("compliance_retention_policies")
      .select(`
        id,
        category,
        name,
        retention_days,
        description,
        legal_basis,
        auto_purge_enabled,
        updated_by,
        updated_at,
        updater:profiles!compliance_retention_policies_updated_by_fkey(id, username, full_name)
      `)
      .order("retention_days", { ascending: true });

    if (error) throw error;
    if (data && data.length > 0) return data;
  } catch (err: any) {
    // Fallback
  }

  return runtimeRetentionPolicies;
}

export async function updateRetentionPolicyService(
  category: string,
  input: {
    retentionDays?: number;
    autoPurgeEnabled?: boolean;
    description?: string;
    legalBasis?: string;
  },
  adminUserId?: string
) {
  const { retentionDays, autoPurgeEnabled, description, legalBasis } = input;

  const updateFields: any = {
    updated_by: adminUserId || null,
    updated_at: new Date().toISOString(),
  };

  if (retentionDays !== undefined) {
    if (retentionDays < 1 || retentionDays > 3650) {
      const error: any = new Error("retentionDays must be between 1 and 3650 days (10 years).");
      error.status = 400;
      throw error;
    }
    updateFields.retention_days = Number(retentionDays);
  }

  if (autoPurgeEnabled !== undefined) {
    updateFields.auto_purge_enabled = Boolean(autoPurgeEnabled);
  }
  if (description !== undefined) {
    updateFields.description = description.trim();
  }
  if (legalBasis !== undefined) {
    updateFields.legal_basis = legalBasis.trim();
  }

  try {
    const { data, error } = await supabase
      .from("compliance_retention_policies")
      .update(updateFields)
      .eq("category", category)
      .select()
      .single();

    if (error) throw error;

    await createAuditLog({
      adminId: adminUserId,
      action: "RETENTION_POLICY_UPDATED",
      resourceType: "RETENTION_POLICY",
      resourceId: category,
      details: { category, updateFields },
    });

    return data;
  } catch (err: any) {
    const target = runtimeRetentionPolicies.find((r) => r.category === category);
    if (!target) {
      const error: any = new Error(`Retention category "${category}" not found.`);
      error.status = 404;
      throw error;
    }

    Object.assign(target, updateFields);

    await createAuditLog({
      adminId: adminUserId,
      action: "RETENTION_POLICY_UPDATED",
      resourceType: "RETENTION_POLICY",
      resourceId: category,
      details: { category, updateFields },
    });

    return target;
  }
}

// ============================================================
// 4. COMPLIANCE AUDIT TRAIL SERVICE
// ============================================================

export async function getComplianceAuditLogsService(filters?: {
  page?: number;
  limit?: number;
  search?: string;
}) {
  const page = Math.max(1, Number(filters?.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters?.limit) || 20));
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  try {
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
        admin:profiles!admin_audit_logs_admin_user_id_fkey(id, username, full_name)
      `, { count: "exact" })
      .in("resource_type", ["COMPLIANCE_POLICY", "DATA_REQUEST", "RETENTION_POLICY", "COMPLIANCE"])
      .order("created_at", { ascending: false });

    if (filters?.search) {
      query = query.ilike("action", `%${filters.search}%`);
    }

    query = query.range(from, to);

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      logs: data || [],
      pagination: {
        page,
        limit,
        total: count || (data ? data.length : 0),
        totalPages: Math.ceil((count || 0) / limit) || 1,
      },
    };
  } catch (err: any) {
    // If join fails or table is fresh, query without join
    const fallback = await supabase
      .from("admin_audit_logs")
      .select("*", { count: "exact" })
      .in("resource_type", ["COMPLIANCE_POLICY", "DATA_REQUEST", "RETENTION_POLICY", "COMPLIANCE"])
      .order("created_at", { ascending: false })
      .range(from, to);

    return {
      logs: fallback.data || [],
      pagination: {
        page,
        limit,
        total: fallback.count || (fallback.data ? fallback.data.length : 0),
        totalPages: Math.ceil((fallback.count || 0) / limit) || 1,
      },
    };
  }
}
