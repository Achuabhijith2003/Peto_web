import axios from "axios";
import {
  AdminSession,
  AdminUserItem,
  AdminRole,
  AdminPermission,
  AuditLogItem,
  PaginationInfo,
} from "../types/admin";

export const getApiBaseUrl = (): string => {
  if (typeof window !== "undefined" && (window as any).__PETO_API_URL__) {
    const val = (window as any).__PETO_API_URL__;
    if (val && val !== "__VITE_API_URL_PLACEHOLDER__") {
      return val.replace(/\/+$/, "");
    }
  }
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("peto_api_url");
    if (saved) return saved.replace(/\/+$/, "");
  }
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/+$/, "");
  }
  return "/api";
};

export const adminApi = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

adminApi.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  const token =
    localStorage.getItem("peto_admin_token") ||
    localStorage.getItem("peto_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

adminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("peto_admin_token");
      localStorage.removeItem("peto_token");
      localStorage.removeItem("peto_user_token");
      sessionStorage.clear();
      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }
    }
    return Promise.reject(error);
  }
);

// Admin Auth & Profile
export async function adminLogin(email: string, password: string) {
  const baseUrl = getApiBaseUrl();
  const res = await axios.post(`${baseUrl}/auth/login`, {
    email,
    password,
  });
  return res.data;
}

export async function fetchAdminMe(): Promise<AdminSession> {
  const res = await adminApi.get("/admin/me");
  return res.data.data;
}

// Administrators Management
export async function fetchAdmins(page = 1, limit = 20, search = ""): Promise<{
  admins: AdminUserItem[];
  pagination: PaginationInfo;
}> {
  const params: Record<string, any> = { page, limit };
  if (search) params.search = search;
  const res = await adminApi.get("/admin/admins", { params });
  return {
    admins: res.data.data,
    pagination: res.data.pagination,
  };
}

export async function createAdmin(userId: string, roleId: string): Promise<AdminUserItem> {
  const res = await adminApi.post("/admin/admins", { userId, roleId });
  return res.data.data;
}

export async function updateAdmin(
  adminId: string,
  data: { roleId?: string; isActive?: boolean }
): Promise<AdminUserItem> {
  const res = await adminApi.patch(`/admin/admins/${adminId}`, data);
  return res.data.data;
}

export async function deleteAdmin(adminId: string): Promise<{ success: boolean; message: string }> {
  const res = await adminApi.delete(`/admin/admins/${adminId}`);
  return res.data;
}

// Roles & Permissions
export async function fetchRoles(): Promise<AdminRole[]> {
  const res = await adminApi.get("/admin/roles");
  return res.data.data;
}

export async function fetchPermissions(): Promise<AdminPermission[]> {
  const res = await adminApi.get("/admin/permissions");
  return res.data.data;
}

// Audit Logs
export async function fetchAuditLogs(filters: {
  page?: number;
  limit?: number;
  action?: string;
  adminUserId?: string;
  resourceType?: string;
}): Promise<{
  logs: AuditLogItem[];
  pagination: PaginationInfo;
}> {
  const res = await adminApi.get("/admin/audit-logs", { params: filters });
  return {
    logs: res.data.data,
    pagination: res.data.pagination,
  };
}

// User Management (Phase 2)
export async function fetchUsers(filters: import("../types/admin").UserFilters): Promise<{
  users: import("../types/admin").PetoUserItem[];
  pagination: PaginationInfo;
}> {
  const res = await adminApi.get("/admin/users", { params: filters });
  return {
    users: res.data.data,
    pagination: res.data.pagination,
  };
}

export async function fetchUserDetail(userId: string): Promise<import("../types/admin").PetoUserDetail> {
  const res = await adminApi.get(`/admin/users/${userId}`);
  return res.data.data;
}

export async function updateUserStatus(
  userId: string,
  data: {
    status: "ACTIVE" | "SUSPENDED" | "BANNED" | "DEACTIVATED" | "DELETED";
    reason?: string;
    suspendedUntil?: string | null;
  }
): Promise<any> {
  const res = await adminApi.patch(`/admin/users/${userId}/status`, data);
  return res.data;
}

export async function updateUserVerification(
  userId: string,
  verified: boolean
): Promise<any> {
  const res = await adminApi.patch(`/admin/users/${userId}/verification`, { verified });
  return res.data;
}

// User Search (for assigning admins)
export async function searchPetoUsers(query: string): Promise<any[]> {
  if (!query || query.length < 2) return [];
  const res = await adminApi.get("/users/search", { params: { q: query, limit: 10 } });
  return res.data.data || res.data || [];
}

// Phase 3 Content Moderation & Reports APIs
export async function fetchReportsQueue(filters: import("../types/admin").ReportFilters = {}): Promise<{
  reports: import("../types/admin").PetoReportItem[];
  metrics: import("../types/admin").ModerationMetrics;
  pagination: PaginationInfo;
}> {
  const res = await adminApi.get("/admin/reports", { params: filters });
  return {
    reports: res.data.data,
    metrics: res.data.metrics,
    pagination: res.data.pagination,
  };
}

export async function fetchReportDetail(reportId: string): Promise<import("../types/admin").PetoReportDetail> {
  const res = await adminApi.get(`/admin/reports/${reportId}`);
  return res.data.data;
}

export async function updateReportApi(
  reportId: string,
  data: {
    status?: "PENDING" | "UNDER_REVIEW" | "RESOLVED" | "REJECTED" | "ESCALATED";
    priority?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    assignedTo?: string | null;
    resolution?: string;
  }
): Promise<any> {
  const res = await adminApi.patch(`/admin/reports/${reportId}`, data);
  return res.data.data;
}

export async function executeModerationActionApi(
  reportId: string,
  data: {
    action: import("../types/admin").ModerationActionType;
    reason: string;
    durationDays?: number;
    overrideResolved?: boolean;
  }
): Promise<any> {
  const res = await adminApi.post(`/admin/reports/${reportId}/action`, data);
  return res.data;
}

export async function createReportApi(data: {
  reporterId?: string;
  targetType: string;
  targetId: string;
  reason: string;
  description?: string;
  priority?: string;
}): Promise<any> {
  const res = await adminApi.post("/admin/reports", data);
  return res.data;
}

// Phase 4 Dashboard API
export async function fetchDashboardOverview(params: {
  range?: import("../types/admin").DashboardDateRange;
  startDate?: string;
  endDate?: string;
  refresh?: boolean;
} = {}): Promise<import("../types/admin").DashboardOverviewData> {
  const res = await adminApi.get("/admin/dashboard", { params });
  return res.data.data;
}

// ==============================================================
// PHASE 5: ANALYTICS & INTELLIGENCE API METHODS
// ==============================================================

export interface AnalyticsQueryFilter {
  range?: import("../types/admin").AnalyticsRange;
  startDate?: string;
  endDate?: string;
}

export async function fetchAnalyticsOverview(
  params: AnalyticsQueryFilter = {}
): Promise<import("../types/admin").AnalyticsOverviewData> {
  const res = await adminApi.get("/admin/analytics/overview", { params });
  return res.data.data;
}

export async function fetchUserAnalytics(
  params: AnalyticsQueryFilter = {}
): Promise<import("../types/admin").UserAnalyticsData> {
  const res = await adminApi.get("/admin/analytics/users", { params });
  return res.data.data;
}

export async function fetchEngagementAnalytics(
  params: AnalyticsQueryFilter = {}
): Promise<import("../types/admin").EngagementAnalyticsData> {
  const res = await adminApi.get("/admin/analytics/engagement", { params });
  return res.data.data;
}

export async function fetchContentAnalytics(
  params: AnalyticsQueryFilter = {}
): Promise<import("../types/admin").ContentAnalyticsData> {
  const res = await adminApi.get("/admin/analytics/content", { params });
  return res.data.data;
}

export async function fetchReelsAnalytics(
  params: AnalyticsQueryFilter = {}
): Promise<import("../types/admin").ReelsAnalyticsData> {
  const res = await adminApi.get("/admin/analytics/reels", { params });
  return res.data.data;
}

export async function fetchCommunitiesAnalytics(
  params: AnalyticsQueryFilter = {}
): Promise<import("../types/admin").CommunitiesAnalyticsData> {
  const res = await adminApi.get("/admin/analytics/communities", { params });
  return res.data.data;
}

export async function fetchRetentionAnalytics(
  params: AnalyticsQueryFilter = {}
): Promise<import("../types/admin").RetentionAnalyticsData> {
  const res = await adminApi.get("/admin/analytics/retention", { params });
  return res.data.data;
}

export async function fetchRevenueAnalytics(
  params: AnalyticsQueryFilter = {}
): Promise<import("../types/admin").RevenueAnalyticsData> {
  const res = await adminApi.get("/admin/analytics/revenue", { params });
  return res.data.data;
}

/**
 * Triggers a browser download of an RFC 4180 CSV export for any analytics section
 */
export async function downloadAnalyticsCsv(
  section: string,
  params: AnalyticsQueryFilter = {}
): Promise<void> {
  const res = await adminApi.get("/admin/analytics/export", {
    params: { ...params, section, format: "csv" },
    responseType: "blob",
  });

  const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
  const downloadUrl = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  const dateStr = new Date().toISOString().split("T")[0];
  link.setAttribute("download", `peto-${section}-analytics-${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(downloadUrl);
}

// ==============================================================
// PHASE 6: SYSTEM MANAGEMENT, TELEMETRY & FEATURE FLAGS API
// ==============================================================

export async function fetchSystemHealth(): Promise<import("../types/admin").SystemHealthReport> {
  const res = await adminApi.get("/admin/system/health");
  return res.data.data;
}

export async function fetchApiMetrics(): Promise<import("../types/admin").ApiTelemetryMetrics> {
  const res = await adminApi.get("/admin/system/api-metrics");
  return res.data.data;
}

export async function fetchStorageMetrics(): Promise<import("../types/admin").StorageAnalyticsData> {
  const res = await adminApi.get("/admin/system/storage");
  return res.data.data;
}

export async function fetchFeatureFlags(): Promise<import("../types/admin").FeatureFlagItem[]> {
  const res = await adminApi.get("/admin/system/flags");
  return res.data.data;
}

export async function createFeatureFlag(data: {
  key: string;
  name: string;
  description?: string;
  isEnabled?: boolean;
}): Promise<import("../types/admin").FeatureFlagItem> {
  const res = await adminApi.post("/admin/system/flags", data);
  return res.data.data;
}

export async function updateFeatureFlag(
  id: string,
  data: {
    name?: string;
    description?: string;
    isEnabled?: boolean;
  }
): Promise<import("../types/admin").FeatureFlagItem> {
  const res = await adminApi.patch(`/admin/system/flags/${id}`, data);
  return res.data.data;
}

export async function deleteFeatureFlag(id: string): Promise<{ success: boolean; id: string }> {
  const res = await adminApi.delete(`/admin/system/flags/${id}`);
  return res.data.data;
}

export async function fetchMaintenanceMode(): Promise<import("../types/admin").MaintenanceModeState> {
  const res = await adminApi.get("/admin/system/maintenance");
  return res.data.data;
}

export async function updateMaintenanceMode(data: {
  isEnabled: boolean;
  message?: string;
  allowedIps?: string[];
}): Promise<import("../types/admin").MaintenanceModeState> {
  const res = await adminApi.post("/admin/system/maintenance", data);
  return res.data.data;
}

// ============================================================
// COMPLIANCE & LEGAL APIS (PHASE 7)
// ============================================================

export async function fetchCompliancePolicies(
  policyType?: string,
  status?: string
): Promise<import("../types/admin").CompliancePolicyItem[]> {
  const params: Record<string, any> = {};
  if (policyType && policyType !== "ALL") params.policyType = policyType;
  if (status && status !== "ALL") params.status = status;

  const res = await adminApi.get("/admin/compliance/policies", { params });
  return res.data.data;
}

export async function fetchPolicyDetail(
  id: string
): Promise<import("../types/admin").CompliancePolicyItem> {
  const res = await adminApi.get(`/admin/compliance/policies/${id}`);
  return res.data.data;
}

export async function createPolicyDraft(data: {
  policyType: string;
  title: string;
  version: string;
  content: string;
  summaryOfChanges?: string;
}): Promise<import("../types/admin").CompliancePolicyItem> {
  const res = await adminApi.post("/admin/compliance/policies", data);
  return res.data.data;
}

export async function publishPolicy(
  id: string
): Promise<import("../types/admin").CompliancePolicyItem> {
  const res = await adminApi.post(`/admin/compliance/policies/${id}/publish`);
  return res.data.data;
}

export async function updatePolicyDraft(
  id: string,
  data: {
    title?: string;
    version?: string;
    content?: string;
    summaryOfChanges?: string;
    effectiveDate?: string;
    regionCode?: string;
    requiresAcknowledgement?: boolean;
  }
): Promise<import("../types/admin").CompliancePolicyItem> {
  const res = await adminApi.patch(`/admin/compliance/policies/${id}`, data);
  return res.data.data;
}

export async function fetchPolicyVersions(
  id: string
): Promise<import("../types/admin").CompliancePolicyItem[]> {
  const res = await adminApi.get(`/admin/compliance/policies/${id}/versions`);
  return res.data.data;
}

export async function rollbackPolicy(
  id: string,
  targetVersion: string
): Promise<import("../types/admin").CompliancePolicyItem> {
  const res = await adminApi.post(`/admin/compliance/policies/${id}/rollback`, { targetVersion });
  return res.data.data;
}

export function getAdminPolicyPdfUrl(id: string): string {
  const baseURL = adminApi.defaults.baseURL || "http://localhost:5000/api";
  const token =
    localStorage.getItem("peto_admin_token") ||
    localStorage.getItem("peto_token") ||
    "";
  const query = token ? `?token=${encodeURIComponent(token)}` : "";
  return `${baseURL}/admin/compliance/policies/${id}/pdf${query}`;
}

export async function downloadAdminPolicyPdf(id: string, filename?: string): Promise<void> {
  const res = await adminApi.get(`/admin/compliance/policies/${id}/pdf`, {
    responseType: "blob",
  });
  const blob = new Blob([res.data], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename || `policy-${id}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}


export async function fetchDataRequests(params?: {
  status?: string;
  requestType?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  requests: import("../types/admin").ComplianceDataRequestItem[];
  pagination: import("../types/admin").PaginationInfo;
}> {
  const res = await adminApi.get("/admin/compliance/data-requests", { params });
  return {
    requests: res.data.data,
    pagination: res.data.pagination,
  };
}

export async function fetchDataRequestDetail(
  id: string
): Promise<import("../types/admin").ComplianceDataRequestItem> {
  const res = await adminApi.get(`/admin/compliance/data-requests/${id}`);
  return res.data.data;
}

export async function createDataRequest(data: {
  userId?: string;
  requestType: string;
  details?: string;
  verificationStatus?: string;
}): Promise<import("../types/admin").ComplianceDataRequestItem> {
  const res = await adminApi.post("/admin/compliance/data-requests", data);
  return res.data.data;
}

export async function updateDataRequestStatus(
  id: string,
  data: {
    status: string;
    resolutionNotes?: string;
  }
): Promise<import("../types/admin").ComplianceDataRequestItem> {
  const res = await adminApi.patch(`/admin/compliance/data-requests/${id}/status`, data);
  return res.data.data;
}

export async function fetchRetentionPolicies(): Promise<
  import("../types/admin").ComplianceRetentionPolicyItem[]
> {
  const res = await adminApi.get("/admin/compliance/retention");
  return res.data.data;
}

export async function updateRetentionPolicy(
  category: string,
  data: {
    retentionDays?: number;
    autoPurgeEnabled?: boolean;
    description?: string;
    legalBasis?: string;
  }
): Promise<import("../types/admin").ComplianceRetentionPolicyItem> {
  const res = await adminApi.patch(`/admin/compliance/retention/${category}`, data);
  return res.data.data;
}

export async function fetchComplianceAuditLogs(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<{
  logs: import("../types/admin").AuditLogItem[];
  pagination: import("../types/admin").PaginationInfo;
}> {
  const res = await adminApi.get("/admin/compliance/audit-logs", { params });
  return {
    logs: res.data.data,
    pagination: res.data.pagination,
  };
}

// ============================================================
// PHASE 8: ADVERTISING PLATFORM API
// ============================================================

export async function fetchAdvertisers(params?: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  advertisers: import("../types/admin").AdvertiserItem[];
  pagination: import("../types/admin").PaginationInfo;
}> {
  const res = await adminApi.get("/admin/ads/advertisers", { params });
  return {
    advertisers: res.data.advertisers || [],
    pagination: res.data.pagination,
  };
}

export async function fetchAdvertiserDetail(
  id: string
): Promise<import("../types/admin").AdvertiserItem> {
  const res = await adminApi.get(`/admin/ads/advertisers/${id}`);
  return res.data;
}

export async function createAdvertiser(data: {
  companyName: string;
  contactName: string;
  contactEmail: string;
  websiteUrl?: string;
  industry?: string;
  notes?: string;
  initialBalance?: number;
}): Promise<import("../types/admin").AdvertiserItem> {
  const res = await adminApi.post("/admin/ads/advertisers", data);
  return res.data;
}

export async function updateAdvertiserStatus(
  id: string,
  status: import("../types/admin").AdvertiserStatus
): Promise<import("../types/admin").AdvertiserItem> {
  const res = await adminApi.patch(`/admin/ads/advertisers/${id}/status`, { status });
  return res.data;
}

export async function fetchCampaigns(params?: {
  status?: string;
  objective?: string;
  advertiserId?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  campaigns: import("../types/admin").AdCampaignItem[];
  pagination: import("../types/admin").PaginationInfo;
}> {
  const res = await adminApi.get("/admin/ads/campaigns", { params });
  return {
    campaigns: res.data.campaigns || [],
    pagination: res.data.pagination,
  };
}

export async function fetchCampaignDetail(
  id: string
): Promise<import("../types/admin").AdCampaignItem> {
  const res = await adminApi.get(`/admin/ads/campaigns/${id}`);
  return res.data;
}

export async function createCampaign(data: {
  advertiserId: string;
  name: string;
  objective: import("../types/admin").CampaignObjective;
  budgetType?: "DAILY" | "LIFETIME";
  totalBudget: number;
  dailyBudget?: number;
  startDate?: string;
  endDate?: string;
  targeting?: any;
  creative?: any;
}): Promise<import("../types/admin").AdCampaignItem> {
  const res = await adminApi.post("/admin/ads/campaigns", data);
  return res.data;
}

export async function updateCampaignStatus(
  id: string,
  status: import("../types/admin").CampaignStatus
): Promise<import("../types/admin").AdCampaignItem> {
  const res = await adminApi.patch(`/admin/ads/campaigns/${id}/status`, { status });
  return res.data;
}

export async function fetchPendingReviewQueue(params?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  queue: import("../types/admin").AdCampaignItem[];
  pagination: import("../types/admin").PaginationInfo;
}> {
  const res = await adminApi.get("/admin/ads/review-queue", { params });
  return {
    queue: res.data.queue || [],
    pagination: res.data.pagination,
  };
}

export async function reviewCampaignAction(
  id: string,
  data: {
    action: "APPROVE" | "REJECT" | "REQUEST_CHANGES";
    reason?: string;
    feedback?: string;
  }
): Promise<{ message: string; campaign: import("../types/admin").AdCampaignItem }> {
  const res = await adminApi.post(`/admin/ads/campaigns/${id}/review`, data);
  return res.data;
}

export async function reviewCreativeAction(
  id: string,
  data: {
    action: "APPROVE" | "REJECT" | "REQUEST_CHANGES";
    reason?: string;
    feedback?: string;
  }
): Promise<{ message: string; creative: import("../types/admin").AdCreativeItem }> {
  const res = await adminApi.post(`/admin/ads/creatives/${id}/review`, data);
  return res.data;
}

export async function fetchAdsAnalyticsSummary(params?: {
  timeframe?: "7d" | "30d" | "90d" | "all";
  campaignId?: string;
}): Promise<import("../types/admin").AdAnalyticsSummary> {
  const res = await adminApi.get("/admin/ads/analytics", { params });
  return res.data;
}

// Phase 9: Admin Notification Center API
export async function fetchAdminNotifications(params?: {
  page?: number;
  limit?: number;
  status?: "all" | "unread" | "read";
  category?: string;
  priority?: string;
  search?: string;
}): Promise<{
  notifications: import("../types/admin").AdminNotificationItem[];
  unread_count: number;
  critical_count: number;
  pagination: import("../types/admin").PaginationInfo;
}> {
  const res = await adminApi.get("/admin/notifications", { params });
  const pag = res.data.pagination || {};
  return {
    notifications: res.data.data,
    unread_count: res.data.unread_count,
    critical_count: res.data.critical_count,
    pagination: {
      page: pag.page || 1,
      limit: pag.limit || 20,
      totalCount: pag.totalCount ?? pag.total ?? 0,
      totalPages: pag.totalPages || 1,
    },
  };
}

export async function markAdminNotificationRead(
  id: string,
  isRead: boolean = true
): Promise<import("../types/admin").AdminNotificationItem> {
  const res = await adminApi.patch(`/admin/notifications/${id}/read`, {
    is_read: isRead,
  });
  return res.data.data;
}

export async function markAllAdminNotificationsRead(): Promise<{
  success: boolean;
  message: string;
}> {
  const res = await adminApi.post("/admin/notifications/mark-all-read");
  return res.data;
}

// Global Regional Configuration (Phase 1)
export async function fetchAdminRegions(): Promise<{
  success: boolean;
  regions: any[];
}> {
  const res = await adminApi.get("/admin/regions");
  return res.data;
}

export async function updateAdminRegion(
  code: string,
  updates: Record<string, any>
): Promise<{
  success: boolean;
  message: string;
  region: any;
}> {
  const res = await adminApi.patch(`/admin/regions/${code}`, updates);
  return res.data;
}

// Payment Administration & Ledger (Phases 2-4)
export async function fetchAdminTransactions(params?: {
  advertiserId?: string;
  status?: string;
  provider?: string;
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  transactions: any[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}> {
  const res = await adminApi.get("/admin/payments/transactions", { params });
  return res.data;
}

export async function refundPaymentTransaction(data: {
  transactionId: string;
  amount?: number;
  reason?: string;
}): Promise<{
  success: boolean;
  message: string;
  refund: any;
}> {
  const res = await adminApi.post("/admin/payments/refund", data);
  return res.data;
}

// Partner & Identity Verification (Phase 9)
export async function fetchAdminVerifications(params?: {
  status?: string;
  country?: string;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<{
  success: boolean;
  items: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const res = await adminApi.get("/admin/verifications", { params });
  return res.data;
}

export async function fetchAdminVerificationDetail(id: string): Promise<{
  success: boolean;
  application: any;
}> {
  const res = await adminApi.get(`/admin/verifications/${id}`);
  return res.data;
}

export async function fetchAdminSignedDocumentUrl(
  id: string,
  docId: string
): Promise<{
  success: boolean;
  signed_url: string;
  expires_in_seconds: number;
  document_type: string;
}> {
  const res = await adminApi.get(`/admin/verifications/${id}/documents/${docId}/view-token`);
  return res.data;
}

export async function reviewAdminVerification(
  id: string,
  data: {
    action: "APPROVE" | "REJECT" | "REQUEST_INFORMATION" | "SUSPEND" | "REVOKE";
    notes?: string;
    rejectionReason?: string;
  }
): Promise<{
  success: boolean;
  message: string;
  application: any;
}> {
  const res = await adminApi.post(`/admin/verifications/${id}/review`, data);
  return res.data;
}

// ============================================================
// UNIFIED ADS CONTROL CENTER & EXTERNAL ANALYTICS APIS
// ============================================================

export async function fetchAdControlCenter(): Promise<{
  success: boolean;
  controls: any;
  providerHealth: any[];
}> {
  const res = await adminApi.get("/admin/ads/control-center");
  return res.data;
}

export async function updateAdControlCenter(
  updates: Record<string, any>,
  reason?: string
): Promise<{
  success: boolean;
  controls: any;
  message: string;
}> {
  const res = await adminApi.patch("/admin/ads/control-center", { updates, reason });
  return res.data;
}

export async function triggerEmergencyStop(
  scope: "ALL" | "INTERNAL" | "EXTERNAL",
  reason: string
): Promise<{
  success: boolean;
  controls: any;
  message: string;
}> {
  const res = await adminApi.post("/admin/ads/control-center/emergency-stop", { scope, reason });
  return res.data;
}

export async function fetchAdProviderHealth(): Promise<{
  success: boolean;
  providers: any[];
}> {
  const res = await adminApi.get("/admin/ads/provider-health");
  return res.data;
}

export async function fetchExternalAdsAnalytics(
  days = 30,
  provider = "ALL"
): Promise<{
  success: boolean;
  timeframe: string;
  totals: any;
  dailyTrends: any[];
}> {
  const res = await adminApi.get(`/admin/ads/analytics/external?days=${days}&provider=${provider}`);
  return res.data;
}

export async function fetchCombinedAdsAnalytics(): Promise<{
  success: boolean;
  comparison: any;
}> {
  const res = await adminApi.get("/admin/ads/analytics/combined");
  return res.data;
}



