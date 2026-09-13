import React from "react";
import { Link } from "react-router-dom";
import { ShieldAlert, ArrowLeft } from "lucide-react";
import { useAdminAuth } from "../context/AdminAuthContext";
import { StatusBadge } from "../components/ui/StatusBadge";

export const AdminUnauthorized: React.FC = () => {
  const { admin } = useAdminAuth();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-6 shadow-sm">
      <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto shadow-lg shadow-rose-500/10">
        <ShieldAlert className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <span className="text-xs font-mono px-3 py-1 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30">
          HTTP 403 — Forbidden
        </span>
        <h1 className="text-2xl font-black text-white tracking-tight pt-1">
          Access Denied
        </h1>
        <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
          Your administrative account does not hold the necessary RBAC permission to access this resource or execute this operation.
        </p>
      </div>

      {admin && (
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 text-left space-y-2 font-mono">
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Your Current Role:</span>
            <StatusBadge type="role" value={admin.role.name} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500">Granted Permissions:</span>
            <span className="text-indigo-400">{admin.permissions.length} perms</span>
          </div>
        </div>
      )}

      <div className="pt-2">
        <Link
          to="/dashboard"
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>
      </div>
    </div>
  );
};
