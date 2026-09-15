import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AdminLogin } from "../pages/AdminLogin";
import { AdminLayout } from "../components/layout/AdminLayout";
import { ProtectedAdminRoute } from "../components/auth/ProtectedAdminRoute";
import { AdminUnauthorized } from "../pages/AdminUnauthorized";
import { AdminNotFound } from "../pages/AdminNotFound";

// Code-splitting / Lazy loading all operational module pages for minimal initial bundle size
const AdminDashboard = React.lazy(() =>
  import("../pages/AdminDashboard").then((m) => ({ default: m.AdminDashboard }))
);
const AdminAdmins = React.lazy(() =>
  import("../pages/AdminAdmins").then((m) => ({ default: m.AdminAdmins }))
);
const AdminRoles = React.lazy(() =>
  import("../pages/AdminRoles").then((m) => ({ default: m.AdminRoles }))
);
const AdminAuditLogs = React.lazy(() =>
  import("../pages/AdminAuditLogs").then((m) => ({ default: m.AdminAuditLogs }))
);
const AdminUsers = React.lazy(() =>
  import("../pages/AdminUsers").then((m) => ({ default: m.AdminUsers }))
);
const AdminUserDetail = React.lazy(() =>
  import("../pages/AdminUserDetail").then((m) => ({ default: m.AdminUserDetail }))
);
const AdminModerationQueue = React.lazy(() =>
  import("../pages/AdminModerationQueue").then((m) => ({ default: m.AdminModerationQueue }))
);
const AdminReportDetail = React.lazy(() =>
  import("../pages/AdminReportDetail").then((m) => ({ default: m.AdminReportDetail }))
);
const AdminAnalytics = React.lazy(() =>
  import("../pages/AdminAnalytics").then((m) => ({ default: m.AdminAnalytics }))
);
const AdminSystem = React.lazy(() =>
  import("../pages/AdminSystem").then((m) => ({ default: m.AdminSystem }))
);
const AdminCompliance = React.lazy(() =>
  import("../pages/AdminCompliance").then((m) => ({ default: m.AdminCompliance }))
);
const AdminAds = React.lazy(() =>
  import("../pages/AdminAds").then((m) => ({ default: m.AdminAds }))
);
const AdminPayments = React.lazy(() =>
  import("../pages/AdminPayments").then((m) => ({ default: m.AdminPayments }))
);
const AdminRegions = React.lazy(() =>
  import("../pages/AdminRegions").then((m) => ({ default: m.AdminRegions }))
);
const AdminNotifications = React.lazy(() =>
  import("../pages/AdminNotifications").then((m) => ({ default: m.AdminNotifications }))
);
const AdminVerifications = React.lazy(() =>
  import("../pages/AdminVerifications").then((m) => ({ default: m.AdminVerifications }))
);
const AdminPlaceholder = React.lazy(() =>
  import("../pages/AdminPlaceholder").then((m) => ({ default: m.AdminPlaceholder }))
);

const AdminPageLoading: React.FC = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="flex flex-col items-center space-y-3">
      <div className="w-8 h-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      <span className="text-xs font-medium text-slate-400">Loading module...</span>
    </div>
  </div>
);

export const AppRoutes: React.FC = () => {
  return (
    <Suspense fallback={<AdminPageLoading />}>
      <Routes>
        {/* Public Admin Auth */}
        <Route path="/login" element={<AdminLogin />} />

        {/* Protected Admin Routes within Layout */}
        <Route element={<ProtectedAdminRoute />}>
          <Route element={<AdminLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<AdminDashboard />} />

            {/* Phase 9: Admin Notification Center */}
            <Route path="/notifications" element={<AdminNotifications />} />

            {/* Phase 3: Content Moderation & Reports */}
            <Route
              path="/moderation"
              element={<ProtectedAdminRoute requiredPermission="reports.view" />}
            >
              <Route index element={<AdminModerationQueue />} />
              <Route path=":id" element={<AdminReportDetail />} />
            </Route>
            <Route path="/reports" element={<Navigate to="/moderation" replace />} />
            <Route path="/reports/:id" element={<Navigate to="/moderation/:id" replace />} />

            {/* Phase 2: User Management */}
            <Route
              path="/users"
              element={<ProtectedAdminRoute requiredPermission="users.view" />}
            >
              <Route index element={<AdminUsers />} />
              <Route path=":id" element={<AdminUserDetail />} />
            </Route>

            {/* Phase 1 Core Operational Modules */}
            <Route
              path="/admins"
              element={<ProtectedAdminRoute requiredPermission="admins.view" />}
            >
              <Route index element={<AdminAdmins />} />
            </Route>

            <Route
              path="/roles"
              element={<ProtectedAdminRoute requiredPermission="roles.view" />}
            >
              <Route index element={<AdminRoles />} />
            </Route>

            <Route
              path="/audit-logs"
              element={<ProtectedAdminRoute requiredPermission="audit_logs.view" />}
            >
              <Route index element={<AdminAuditLogs />} />
            </Route>

            {/* Phase 5: Analytics & Intelligence */}
            <Route
              path="/analytics"
              element={<ProtectedAdminRoute requiredPermission="analytics.view" />}
            >
              <Route index element={<AdminAnalytics />} />
            </Route>

            {/* Phase 6: System Management & Infrastructure */}
            <Route
              path="/system"
              element={<ProtectedAdminRoute requiredPermission="system.view" />}
            >
              <Route index element={<AdminSystem />} />
            </Route>

            {/* Phase 7: Compliance & Legal Management */}
            <Route
              path="/compliance"
              element={<ProtectedAdminRoute requiredPermission="compliance.view" />}
            >
              <Route index element={<AdminCompliance />} />
            </Route>

            {/* Phase 8: Advertising Platform */}
            <Route
              path="/ads"
              element={<ProtectedAdminRoute requiredPermission="ads.view" />}
            >
              <Route index element={<AdminAds />} />
            </Route>

            {/* Global Monetization & Payments */}
            <Route
              path="/payments"
              element={<ProtectedAdminRoute requiredPermission="ads.view" />}
            >
              <Route index element={<AdminPayments />} />
            </Route>

            {/* Regional Control Center */}
            <Route
              path="/regions"
              element={<ProtectedAdminRoute requiredPermission="system.view" />}
            >
              <Route index element={<AdminRegions />} />
            </Route>

            {/* Partner & Identity Verifications (Phase 9) */}
            <Route
              path="/verifications"
              element={<ProtectedAdminRoute requiredPermission="ads.view" />}
            >
              <Route index element={<AdminVerifications />} />
            </Route>

            {/* Future Roadmap Section Placeholders */}
            <Route path="/placeholder/:section" element={<AdminPlaceholder />} />

            {/* Access Control Feedback */}
            <Route path="/unauthorized" element={<AdminUnauthorized />} />

            {/* 404 Catch-all */}
            <Route path="*" element={<AdminNotFound />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
};
