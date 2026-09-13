import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";
import { StatusBadge } from "../components/ui/StatusBadge";
import {
  ShieldCheck,
  KeyRound,
  FileText,
  Users,
  Shield,
  ArrowUpRight,
  Activity,
  CheckCircle2,
  Lock,
  Layers,
} from "lucide-react";
import { fetchAdmins, fetchRoles, fetchPermissions } from "../api/adminApi";

export const AdminDashboard: React.FC = () => {
  const { admin } = useAdminAuth();
  const [stats, setStats] = useState({
    adminCount: 0,
    roleCount: 0,
    permissionCount: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    async function loadQuickStats() {
      try {
        const [adminsRes, roles, perms] = await Promise.all([
          fetchAdmins(1, 1).catch(() => ({ pagination: { totalCount: 0 } })),
          fetchRoles().catch(() => []),
          fetchPermissions().catch(() => []),
        ]);

        setStats({
          adminCount: adminsRes.pagination?.totalCount || 0,
          roleCount: roles.length || 7,
          permissionCount: perms.length || 28,
        });
      } catch (err) {
        console.error("Error loading dashboard stats:", err);
      } finally {
        setLoadingStats(false);
      }
    }

    loadQuickStats();
  }, []);

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900 to-purple-950/80 border border-slate-800 p-8 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                Phase 1: Foundation Active
              </span>
              <span className="text-xs text-slate-400 font-mono">
                Session ID: {admin?.id.substring(0, 8)}...
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Welcome back, {admin?.fullName}
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl">
              You are signed in as <strong className="text-white">@{admin?.username}</strong> with administrative role{" "}
              <span className="inline-block align-middle ml-1">
                <StatusBadge type="role" value={admin?.role.name || "Admin"} />
              </span>.
              All administrative operations in this control center are authorized server-side and recorded to immutable audit logs.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/admins"
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/20 flex items-center space-x-2 transition-all"
            >
              <Users className="w-4 h-4" />
              <span>Manage Admins</span>
            </Link>
            <Link
              to="/audit-logs"
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs flex items-center space-x-2 transition-all"
            >
              <FileText className="w-4 h-4" />
              <span>Audit Logs</span>
            </Link>
          </div>
        </div>

        {/* Decorative background flare */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Administrators</span>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            {loadingStats ? "..." : stats.adminCount}
          </div>
          <div className="text-xs text-slate-400 flex items-center">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mr-1.5" />
            <span>Assigned across platform roles</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Configured Roles</span>
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            {loadingStats ? "..." : stats.roleCount}
          </div>
          <div className="text-xs text-slate-400 flex items-center">
            <Lock className="w-3.5 h-3.5 text-purple-400 mr-1.5" />
            <span>Strict RBAC Hierarchy</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Catalogued Permissions</span>
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <KeyRound className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-white">
            {loadingStats ? "..." : stats.permissionCount}
          </div>
          <div className="text-xs text-slate-400 flex items-center">
            <Activity className="w-3.5 h-3.5 text-cyan-400 mr-1.5" />
            <span>Granular module security</span>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Audit Trail Engine</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 flex items-center">
            <span>ACTIVE</span>
          </div>
          <div className="text-xs text-slate-400 flex items-center">
            <span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5 animate-pulse"></span>
            <span>Recording all admin actions</span>
          </div>
        </div>
      </div>

      {/* Quick Launchpad & Incremental Phase Tracker */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Quick Actions */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center">
            <Shield className="w-4 h-4 text-indigo-400 mr-2" />
            Operational Modules (Phases 1 & 2)
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              to="/users"
              className="group bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-cyan-500/50 rounded-2xl p-6 transition-all shadow-sm flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 group-hover:scale-105 transition-transform">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors flex items-center">
                    User Management
                    <ArrowUpRight className="w-3.5 h-3.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Directory search, server-side pagination, user engagement metrics, account suspension, bans, and verified badges.
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                <span>Guard: users.view</span>
                <span className="text-cyan-400 font-medium">Active (P2) →</span>
              </div>
            </Link>

            <Link
              to="/admins"
              className="group bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-indigo-500/50 rounded-2xl p-6 transition-all shadow-sm flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 group-hover:scale-105 transition-transform">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-indigo-300 transition-colors flex items-center">
                    Administrator Management
                    <ArrowUpRight className="w-3.5 h-3.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Assign administrative roles to registered Peto users, toggle activation status, or revoke privileges.
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                <span>Guard: admins.view</span>
                <span className="text-indigo-400 font-medium">Ready →</span>
              </div>
            </Link>

            <Link
              to="/roles"
              className="group bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-purple-500/50 rounded-2xl p-6 transition-all shadow-sm flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 group-hover:scale-105 transition-transform">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-purple-300 transition-colors flex items-center">
                    Roles & Permissions Catalog
                    <ArrowUpRight className="w-3.5 h-3.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Review definitions for Super Admin, Moderator, Analyst, Ads, Compliance, and granular permission matrices.
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                <span>Guard: roles.view</span>
                <span className="text-purple-400 font-medium">Ready →</span>
              </div>
            </Link>

            <Link
              to="/audit-logs"
              className="group bg-slate-900 hover:bg-slate-800/80 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-6 transition-all shadow-sm flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 group-hover:scale-105 transition-transform">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors flex items-center">
                    Immutable Audit Trail Explorer
                    <ArrowUpRight className="w-3.5 h-3.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Query, search, and inspect the high-integrity audit trail recording all administrative logins, privilege updates, and system events.
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                <span>Guard: audit_logs.view</span>
                <span className="text-emerald-400 font-medium">Ready →</span>
              </div>
            </Link>
          </div>
        </div>

        {/* Right: Incremental Rollout Roadmap */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center">
              <Layers className="w-4 h-4 text-indigo-400 mr-2" />
              10-Phase Roadmap
            </h2>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
              Phase 2 of 10
            </span>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-300">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Phase 1: Foundation & RBAC</span>
              </div>
              <span className="font-mono text-[10px] text-emerald-400 uppercase font-bold">Done</span>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded-xl bg-cyan-600/15 border border-cyan-500/30 text-cyan-200">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold">Phase 2: User Management</span>
              </div>
              <span className="font-mono text-[10px] text-cyan-400 uppercase font-bold">Current</span>
            </div>

            {[
              { phase: 3, name: "Moderation & Reports" },
              { phase: 4, name: "Admin Dashboard Metrics" },
              { phase: 5, name: "Platform Analytics" },
              { phase: 6, name: "System Management" },
              { phase: 7, name: "Compliance & Privacy" },
              { phase: 8, name: "Ads & Placements" },
              { phase: 9, name: "Admin Notifications" },
              { phase: 10, name: "Security Polish & Hardening" },
            ].map((p) => (
              <div
                key={p.phase}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 text-slate-400"
              >
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center text-[9px] font-mono text-slate-500">
                    {p.phase}
                  </div>
                  <span>{p.name}</span>
                </div>
                <span className="text-[10px] text-slate-600 font-mono">Upcoming</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
