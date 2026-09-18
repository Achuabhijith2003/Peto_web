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
import {
  getPolicies,
  getPolicyDetail,
  createPolicyDraft,
  updatePolicyDraft,
  publishPolicy,
  getPolicyVersions,
  rollbackPolicy,
  getAdminPolicyPdf,
  getDataRequests,
  getDataRequestDetail,
  createDataRequest,
  updateDataRequestStatus,
  getRetentionPolicies,
  updateRetentionPolicy,
  getComplianceAuditLogs,
} from "./controllers/adminCompliance.controller";
import {
  getAdvertisersHandler,
  getAdvertiserDetailHandler,
  createAdvertiserHandler,
  updateAdvertiserStatusHandler,
  getCampaignsHandler,
  getCampaignDetailHandler,
  createCampaignHandler,
  updateCampaignStatusHandler,
  getPendingReviewQueueHandler,
  reviewCampaignActionHandler,
  reviewCreativeActionHandler,
  getAdsAnalyticsSummaryHandler,
} from "./controllers/adminAds.controller";
import {
  getAdminNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  createNotificationHandler,
} from "./controllers/adminNotifications.controller";
import {
  getAdminRegionsHandler,
  updateAdminRegionHandler,
} from "../regions/regional.controller";
import {
  getAdminTransactionsHandler,
  refundTransactionHandler,
} from "../payments/payment.controller";
import { adminRateLimiter } from "./middleware/adminRateLimiter.middleware";

const router = Router();

// Protect admin control panel with rate limiting (120 req/min)
router.use(adminRateLimiter());

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
router.post("/reports", requirePermission("reports.manage"), createReport);
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

// Compliance & Legal Management (Phase 7)
router.get("/compliance/policies", requirePermission("compliance.view"), getPolicies);
router.post("/compliance/policies", requirePermission("compliance.manage"), createPolicyDraft);
router.get("/compliance/policies/:id", requirePermission("compliance.view"), getPolicyDetail);
router.patch("/compliance/policies/:id", requirePermission("compliance.manage"), updatePolicyDraft);
router.post("/compliance/policies/:id/publish", requirePermission("compliance.manage"), publishPolicy);
router.get("/compliance/policies/:id/versions", requirePermission("compliance.view"), getPolicyVersions);
router.post("/compliance/policies/:id/rollback", requirePermission("compliance.manage"), rollbackPolicy);
router.get("/compliance/policies/:id/pdf", requirePermission("compliance.view"), getAdminPolicyPdf);

router.get("/compliance/data-requests", requirePermission("compliance.view"), getDataRequests);
router.post("/compliance/data-requests", requirePermission("compliance.manage"), createDataRequest);
router.get("/compliance/data-requests/:id", requirePermission("compliance.view"), getDataRequestDetail);
router.patch("/compliance/data-requests/:id/status", requirePermission("compliance.manage"), updateDataRequestStatus);

router.get("/compliance/retention", requirePermission("compliance.view"), getRetentionPolicies);
router.patch("/compliance/retention/:category", requirePermission("compliance.manage"), updateRetentionPolicy);

router.get("/compliance/audit-logs", requirePermission("compliance.view"), getComplianceAuditLogs);

// Advertising Platform (Phase 8)
router.get("/ads/advertisers", requirePermission("ads.view"), getAdvertisersHandler);
router.post("/ads/advertisers", requirePermission("ads.manage"), createAdvertiserHandler);
router.get("/ads/advertisers/:id", requirePermission("ads.view"), getAdvertiserDetailHandler);
router.patch("/ads/advertisers/:id/status", requirePermission("ads.manage"), updateAdvertiserStatusHandler);

router.get("/ads/campaigns", requirePermission("ads.view"), getCampaignsHandler);
router.post("/ads/campaigns", requirePermission("ads.manage"), createCampaignHandler);
router.get("/ads/campaigns/:id", requirePermission("ads.view"), getCampaignDetailHandler);
router.patch("/ads/campaigns/:id/status", requirePermission("ads.manage"), updateCampaignStatusHandler);

router.get("/ads/review-queue", requirePermission("ads.view"), getPendingReviewQueueHandler);
router.post("/ads/campaigns/:id/review", requirePermission("ads.manage"), reviewCampaignActionHandler);
router.post("/ads/creatives/:id/review", requirePermission("ads.manage"), reviewCreativeActionHandler);

router.get("/ads/analytics", requirePermission("ads.view"), getAdsAnalyticsSummaryHandler);

// Unified Ads Control Center & External Demand Management
import {
  getAdControlCenterHandler,
  updateAdControlCenterHandler,
  emergencyStopHandler,
  getProviderHealthHandler,
  getAdProvidersHandler,
  updateAdProviderHandler,
  getExternalAdsAnalyticsHandler,
  getCombinedAdsAnalyticsHandler,
} from "./controllers/adminAdsControl.controller";

router.get("/ads/control-center", requirePermission("ads.view"), getAdControlCenterHandler);
router.patch("/ads/control-center", requirePermission("ads.manage"), updateAdControlCenterHandler);
router.post("/ads/control-center/emergency-stop", requirePermission("ads.manage"), emergencyStopHandler);
router.get("/ads/provider-health", requirePermission("ads.view"), getProviderHealthHandler);
router.get("/ads/providers", requirePermission("ads.view"), getAdProvidersHandler);
router.patch("/ads/providers/:id", requirePermission("ads.manage"), updateAdProviderHandler);
router.get("/ads/analytics/external", requirePermission("ads.view"), getExternalAdsAnalyticsHandler);
router.get("/ads/analytics/combined", requirePermission("ads.view"), getCombinedAdsAnalyticsHandler);

// Global Regional Monetization Configuration (Phase 1)
router.get("/regions", requirePermission("system.view"), getAdminRegionsHandler);
router.patch("/regions/:code", requirePermission("system.manage"), updateAdminRegionHandler);

import {
  getAdminVerificationQueueHandler,
  getAdminVerificationDetailHandler,
  getAdminSignedDocumentUrlHandler,
  reviewVerificationApplicationHandler,
} from "./controllers/adminVerification.controller";

// Payment Administration & Ledger (Phases 2-4)
router.get("/payments/transactions", requirePermission("ads.view"), getAdminTransactionsHandler);
router.post("/payments/refund", requirePermission("ads.manage"), refundTransactionHandler);

// Partner & Identity Verification Management (Phase 9)
router.get(
  "/verifications",
  requireAnyPermission("verification.view", "ads.view"),
  getAdminVerificationQueueHandler
);
router.get(
  "/verifications/:id",
  requireAnyPermission("verification.view", "ads.view"),
  getAdminVerificationDetailHandler
);
router.get(
  "/verifications/:id/documents/:docId/view-token",
  requireAnyPermission("verification.documents.view", "ads.manage"),
  getAdminSignedDocumentUrlHandler
);
router.post(
  "/verifications/:id/review",
  requireAnyPermission("verification.review", "ads.manage"),
  reviewVerificationApplicationHandler
);

// Admin Notifications & Operational Alerts (Phase 9)
router.get("/notifications", getAdminNotifications);
router.patch("/notifications/:id/read", markNotificationRead);
router.post("/notifications/mark-all-read", markAllNotificationsRead);
router.post("/notifications", requirePermission("system.manage"), createNotificationHandler);

export default router;
