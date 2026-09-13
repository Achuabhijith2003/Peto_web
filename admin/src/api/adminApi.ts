import axios from "axios";
import {
  AdminSession,
  AdminUserItem,
  AdminRole,
  AdminPermission,
  AuditLogItem,
  PaginationInfo,
} from "../types/admin";

const API_BASE_URL = import.meta.env.VITE_API_URL || "/api";

export const adminApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

adminApi.interceptors.request.use((config) => {
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
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(error);
  }
);

// Admin Auth & Profile
export async function adminLogin(email: string, password: string) {
  const res = await axios.post(`${API_BASE_URL}/auth/login`, {
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




