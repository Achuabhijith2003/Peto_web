import React, { useState, useEffect } from "react";
import { fetchRoles, fetchPermissions } from "../api/adminApi";
import { AdminRole, AdminPermission } from "../types/admin";
import { StatusBadge } from "../components/ui/StatusBadge";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import {
  ShieldCheck,
  Lock,
  AlertCircle,
} from "lucide-react";

export const AdminRoles: React.FC = () => {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [permissions, setPermissions] = useState<AdminPermission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"roles" | "matrix">("roles");

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [rolesRes, permsRes] = await Promise.all([
          fetchRoles(),
          fetchPermissions(),
        ]);
        setRoles(rolesRes);
        setPermissions(permsRes);
      } catch (err: any) {
        setError(err.message || "Failed to load roles and permissions.");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading RBAC Roles and Permissions Catalog..." />;
  }

  // Group permissions by module
  const permsByModule = permissions.reduce((acc, p) => {
    if (!acc[p.module]) acc[p.module] = [];
    acc[p.module].push(p);
    return acc;
  }, {} as Record<string, AdminPermission[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center">
            <ShieldCheck className="w-6 h-6 mr-2.5 text-purple-400" />
            Roles & Permissions Matrix
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            System RBAC structure and granular permission boundaries enforcing platform security.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 self-start">
          <button
            onClick={() => setActiveTab("roles")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "roles"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Role Cards ({roles.length})
          </button>
          <button
            onClick={() => setActiveTab("matrix")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "matrix"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Permissions Matrix ({permissions.length})
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Role Cards View */}
      {activeTab === "roles" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {roles.map((role) => (
            <div
              key={role.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <StatusBadge type="role" value={role.name} />
                  {role.is_system && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 flex items-center">
                      <Lock className="w-2.5 h-2.5 mr-1" />
                      SYSTEM
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 leading-relaxed min-h-[36px]">
                  {role.description}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-800/80">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-semibold text-slate-300">Granted Permissions</span>
                  <span className="font-mono text-indigo-400 text-[11px]">
                    {role.name === "Super Admin" ? "All System Permissions" : `${role.permissions?.length || 0} granted`}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto pr-1">
                  {role.name === "Super Admin" ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30">
                      * (Wildcard - Unrestricted Access)
                    </span>
                  ) : (
                    role.permissions?.map((p) => (
                      <span
                        key={p.code}
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700"
                      >
                        {p.code}
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Permissions Matrix View */}
      {activeTab === "matrix" && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden space-y-6 p-6">
          <div className="text-xs text-slate-400">
            Peto RBAC defines <strong className="text-white">{permissions.length} granular permissions</strong> grouped across{" "}
            <strong className="text-white">{Object.keys(permsByModule).length} functional modules</strong>.
          </div>

          <div className="space-y-6">
            {Object.entries(permsByModule).map(([moduleName, perms]) => (
              <div key={moduleName} className="space-y-2.5">
                <div className="flex items-center space-x-2 border-b border-slate-800 pb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                    {moduleName} Module
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    ({perms.length} permissions)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {perms.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold text-slate-200">
                          {p.code}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-snug">
                        {p.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
