import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { AdminSession } from "../types/admin";
import { adminLogin, fetchAdminMe } from "../api/adminApi";

interface AdminAuthContextType {
  admin: AdminSession | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  hasPermission: (permissionCode: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  refreshAdmin: () => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadCurrentAdmin = useCallback(async () => {
    const token =
      localStorage.getItem("peto_admin_token") ||
      localStorage.getItem("peto_token");

    if (!token) {
      setAdmin(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const session = await fetchAdminMe();
      setAdmin(session);
    } catch (err: any) {
      console.warn("[AdminAuthContext] Failed to load admin profile:", err.message);
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Failed to verify administrative authorization.";
      setError(msg);
      // If 403 (e.g. user is not admin or suspended), clear invalid admin session
      if (err.response?.status === 403 || err.response?.status === 401) {
        localStorage.removeItem("peto_admin_token");
        localStorage.removeItem("peto_token");
        localStorage.removeItem("peto_user_token");
        sessionStorage.clear();
        setAdmin(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrentAdmin();
  }, [loadCurrentAdmin]);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    setError(null);
    try {
      const loginRes = await adminLogin(email, pass);
      const token = loginRes.token || loginRes.session?.access_token;

      if (!token) {
        throw new Error("Login failed: Authentication token was not returned.");
      }

      localStorage.setItem("peto_admin_token", token);
      localStorage.setItem("peto_token", token);

      // Verify admin authorization
      const session = await fetchAdminMe();
      setAdmin(session);
    } catch (err: any) {
      localStorage.removeItem("peto_admin_token");
      localStorage.removeItem("peto_token");
      localStorage.removeItem("peto_user_token");
      sessionStorage.clear();
      setAdmin(null);
      const msg =
        err.response?.data?.message ||
        err.message ||
        "Administrative login failed.";
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("peto_admin_token");
    localStorage.removeItem("peto_token");
    localStorage.removeItem("peto_user_token");
    sessionStorage.clear();
    setAdmin(null);
    setError(null);
    window.location.replace("/login");
  };

  const hasPermission = (permissionCode: string): boolean => {
    if (!admin) return false;
    if (admin.role.name === "Super Admin") return true;
    return admin.permissions.includes(permissionCode);
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!admin) return false;
    if (admin.role.name === "Super Admin") return true;
    return permissions.some((p) => admin.permissions.includes(p));
  };

  return (
    <AdminAuthContext.Provider
      value={{
        admin,
        loading,
        error,
        isAuthenticated: !!admin,
        hasPermission,
        hasAnyPermission,
        login,
        logout,
        refreshAdmin: loadCurrentAdmin,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within an AdminAuthProvider");
  }
  return context;
};
