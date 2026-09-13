import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAdminAuth } from "../../context/AdminAuthContext";
import { LoadingSpinner } from "../ui/LoadingSpinner";

interface ProtectedAdminRouteProps {
  requiredPermission?: string;
}

export const ProtectedAdminRoute: React.FC<ProtectedAdminRouteProps> = ({
  requiredPermission,
}) => {
  const { admin, loading, isAuthenticated, hasPermission } = useAdminAuth();

  if (loading) {
    return <LoadingSpinner fullScreen message="Authenticating Peto administrator..." />;
  }

  if (!isAuthenticated || !admin) {
    return <Navigate to="/login" replace />;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};
