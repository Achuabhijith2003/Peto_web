import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AdminLogin } from "../pages/AdminLogin";
import { AdminLayout } from "../components/layout/AdminLayout";
import { ProtectedAdminRoute } from "../components/auth/ProtectedAdminRoute";
import { AdminDashboard } from "../pages/AdminDashboard";
import { AdminAdmins } from "../pages/AdminAdmins";
import { AdminRoles } from "../pages/AdminRoles";
import { AdminAuditLogs } from "../pages/AdminAuditLogs";
import { AdminUsers } from "../pages/AdminUsers";
import { AdminUserDetail } from "../pages/AdminUserDetail";
import { AdminModerationQueue } from "../pages/AdminModerationQueue";
import { AdminReportDetail } from "../pages/AdminReportDetail";
import { AdminAnalytics } from "../pages/AdminAnalytics";
import { AdminSystem } from "../pages/AdminSystem";
import { AdminCompliance } from "../pages/AdminCompliance";
import { AdminAds } from "../pages/AdminAds";
import { AdminNotifications } from "../pages/AdminNotifications";
import { AdminPlaceholder } from "../pages/AdminPlaceholder";
import { AdminUnauthorized } from "../pages/AdminUnauthorized";
import { AdminNotFound } from "../pages/AdminNotFound";

export const AppRoutes: React.FC = () => {
  return (
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

          {/* Future Roadmap Section Placeholders */}
          <Route path="/placeholder/:section" element={<AdminPlaceholder />} />

          {/* Access Control Feedback */}
          <Route path="/unauthorized" element={<AdminUnauthorized />} />

          {/* 404 Catch-all */}
          <Route path="*" element={<AdminNotFound />} />
        </Route>
      </Route>
    </Routes>
  );
};
