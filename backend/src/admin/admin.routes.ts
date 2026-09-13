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

// Audit Logs
router.get("/audit-logs", requirePermission("audit_logs.view"), getAuditLogs);

export default router;
