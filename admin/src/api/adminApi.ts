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


