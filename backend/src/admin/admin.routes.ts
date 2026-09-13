import { Router } from "express";
import { requireAdminAuth, requirePermission, requireAnyPermission } from "./middleware/adminAuth.middleware";
import { getAdminMe } from "./controllers/adminAuth.controller";
import {
  getAdmins,
  createAdmin,
  updateAdmin,
  deleteAdmin,
  getRoles,
  getPermissions,
} from "./controllers/adminManagement.controller";
import { getAuditLogs } from "./controllers/adminAudit.controller";
import {
  getUsers,
  getUserDetail,
  updateUserStatus,
  updateUserVerification,
} from "./controllers/adminUserManagement.controller";
import {
  getReports,
  getReportDetail,
  updateReport,
  executeAction,
  createReport,
} from "./controllers/adminModeration.controller";
import { getDashboardOverview } from "./controllers/adminDashboard.controller";
import {
  getOverview,
  getUsers as getUsersAnalytics,
  getEngagement,
  getContent,
  getReels,
  getCommunities,
  getRetention,
  getRevenue,
  exportAnalytics,
  trackEvent,
} from "./controllers/adminAnalytics.controller";
import {
  getSystemHealth,
  getApiMetrics,
  getStorageAnalytics,
  getFeatureFlags,
  createFeatureFlag,
  updateFeatureFlag,
  deleteFeatureFlag,
  getMaintenanceMode,
  updateMaintenanceMode,
} from "./controllers/adminSystem.controller";

const router = Router();

// All admin routes mandate active administrator authentication
router.use(requireAdminAuth);

// Admin Profile & Permissions
router.get("/me", getAdminMe);

// Executive Dashboard (Phase 4)
router.get("/dashboard", getDashboardOverview);

// Roles & Permissions Catalog
router.get("/roles", requirePermission("roles.view"), getRoles);
router.get("/permissions", requirePermission("roles.view"), getPermissions);

// Administrator Management
router.get("/admins", requirePermission("admins.view"), getAdmins);
router.post("/admins", requirePermission("admins.create"), createAdmin);
router.patch("/admins/:id", requirePermission("admins.update"), updateAdmin);
router.delete("/admins/:id", requirePermission("admins.update"), deleteAdmin);

// User Management (Phase 2)
router.get("/users", requirePermission("users.view"), getUsers);
router.get("/users/:id", requirePermission("users.view"), getUserDetail);
router.patch(
  "/users/:id/status",
  requireAnyPermission("users.suspend", "users.ban", "users.edit"),
  updateUserStatus
);
router.patch(
  "/users/:id/verification",
  requirePermission("users.verify"),
  updateUserVerification
);

// Content Moderation & Reports (Phase 3)
router.get("/reports", requirePermission("reports.view"), getReports);
router.post("/reports", createReport);
router.get("/reports/:id", requirePermission("reports.view"), getReportDetail);
router.patch("/reports/:id", requirePermission("reports.manage"), updateReport);
router.post("/reports/:id/action", requirePermission("reports.manage"), executeAction);

// Analytics & Reports (Phase 5)
router.get("/analytics/overview", requirePermission("analytics.view"), getOverview);
router.get("/analytics/users", requirePermission("analytics.view"), getUsersAnalytics);
router.get("/analytics/engagement", requirePermission("analytics.view"), getEngagement);
router.get("/analytics/content", requirePermission("analytics.view"), getContent);
router.get("/analytics/reels", requirePermission("analytics.view"), getReels);
router.get("/analytics/communities", requirePermission("analytics.view"), getCommunities);
router.get("/analytics/retention", requirePermission("analytics.view"), getRetention);
router.get("/analytics/revenue", requirePermission("analytics.view"), getRevenue);
router.get("/analytics/export", requirePermission("analytics.view"), exportAnalytics);
router.post("/analytics/track", trackEvent);

// Audit Logs
router.get("/audit-logs", requirePermission("audit_logs.view"), getAuditLogs);

// System Management, Telemetry & Maintenance (Phase 6)
router.get("/system/health", requirePermission("system.view"), getSystemHealth);
router.get("/system/api-metrics", requirePermission("system.view"), getApiMetrics);
router.get("/system/storage", requirePermission("system.view"), getStorageAnalytics);
router.get("/system/flags", requirePermission("feature_flags.view"), getFeatureFlags);
router.post("/system/flags", requirePermission("feature_flags.manage"), createFeatureFlag);
router.patch("/system/flags/:id", requirePermission("feature_flags.manage"), updateFeatureFlag);
router.delete("/system/flags/:id", requirePermission("feature_flags.manage"), deleteFeatureFlag);
router.get("/system/maintenance", requirePermission("system.view"), getMaintenanceMode);
router.post("/system/maintenance", requirePermission("system.manage"), updateMaintenanceMode);

export default router;
