import React from "react";
import { CheckCircle2, ShieldAlert, AlertTriangle } from "lucide-react";

interface StatusBadgeProps {
  type: "role" | "status" | "action" | "verification";
  value: string | boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, value }) => {
  if (type === "verification") {
    const isVerified = value === true || String(value).toLowerCase() === "true";
    return isVerified ? (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
        <CheckCircle2 className="w-3 h-3 mr-1 text-cyan-400" />
        Verified
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] text-slate-400 border border-slate-700/60 bg-slate-800/40">
        Standard
      </span>
    );
  }

  const strValue = String(value).toUpperCase();

  if (type === "status") {
    if (strValue === "ACTIVE") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
          <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-emerald-400 animate-pulse"></span>
          Active
        </span>
      );
    }

    if (strValue === "SUSPENDED") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
          <AlertTriangle className="w-3 h-3 mr-1 text-amber-400" />
          Suspended
        </span>
      );
    }

    if (strValue === "BANNED") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/40 font-bold">
          <ShieldAlert className="w-3 h-3 mr-1 text-rose-400" />
          Banned
        </span>
      );
    }

    if (strValue === "DEACTIVATED") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-400 border border-slate-700">
          Deactivated
        </span>
      );
    }

    if (strValue === "DELETED") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-900 text-zinc-400 border border-zinc-700">
          Deleted
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
        {String(value)}
      </span>
    );
  }

  if (type === "role") {
    let colorClasses = "bg-slate-800 text-slate-300 border-slate-700";
    if (strValue === "SUPER ADMIN") {
      colorClasses = "bg-purple-500/15 text-purple-300 border-purple-500/30 font-bold";
    } else if (strValue === "ADMIN") {
      colorClasses = "bg-indigo-500/15 text-indigo-300 border-indigo-500/30";
    } else if (strValue === "MODERATOR") {
      colorClasses = "bg-amber-500/15 text-amber-300 border-amber-500/30";
    } else if (strValue === "SUPPORT") {
      colorClasses = "bg-cyan-500/15 text-cyan-300 border-cyan-500/30";
    } else if (strValue === "ANALYST") {
      colorClasses = "bg-blue-500/15 text-blue-300 border-blue-500/30";
    } else if (strValue === "ADS MANAGER") {
      colorClasses = "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
    } else if (strValue === "COMPLIANCE MANAGER") {
      colorClasses = "bg-rose-500/15 text-rose-300 border-rose-500/30";
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs border ${colorClasses}`}>
        {String(value)}
      </span>
    );
  }

  // Action tag
  let actionColor = "bg-slate-800 text-slate-300 border-slate-700";
  if (strValue.includes("LOGIN")) actionColor = "bg-blue-500/15 text-blue-400 border-blue-500/30";
  if (strValue.includes("CREATE") || strValue.includes("RESTORE") || strValue.includes("VERIFIED"))
    actionColor = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
  if (strValue.includes("UPDATE") || strValue.includes("CHANGED") || strValue.includes("SUSPENDED"))
    actionColor = "bg-amber-500/15 text-amber-400 border-amber-500/30";
  if (strValue.includes("REMOVE") || strValue.includes("DELETE") || strValue.includes("BANNED") || strValue.includes("UNVERIFIED"))
    actionColor = "bg-rose-500/15 text-rose-400 border-rose-500/30";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-mono border ${actionColor}`}>
      {String(value)}
    </span>
  );
};
