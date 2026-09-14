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
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#e7eefe] text-[#0058be] border border-[#bed7fc]">
        <CheckCircle2 className="w-3 h-3 mr-1 text-[#0058be]" />
        Verified
      </span>
    ) : (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium text-[#534434] border border-[#dae2f3] bg-[#f0f3ff]">
        Standard
      </span>
    );
  }

  const strValue = String(value).toUpperCase();

  if (type === "status") {
    if (strValue === "ACTIVE") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#e8f7f0] text-[#006c49] border border-[#a3e5c7]">
          <span className="w-1.5 h-1.5 rounded-full mr-1.5 bg-[#006c49] animate-pulse"></span>
          Active
        </span>
      );
    }

    if (strValue === "SUSPENDED") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#fff3d6] text-[#855300] border border-[#fbd988]">
          <AlertTriangle className="w-3 h-3 mr-1 text-[#855300]" />
          Suspended
        </span>
      );
    }

    if (strValue === "BANNED") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#ffdad6] text-[#ba1a1a] border border-[#ffb4ab]">
          <ShieldAlert className="w-3 h-3 mr-1 text-[#ba1a1a]" />
          Banned
        </span>
      );
    }

    if (strValue === "DEACTIVATED") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#f0f3ff] text-[#534434] border border-[#dae2f3]">
          Deactivated
        </span>
      );
    }

    if (strValue === "DELETED") {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#f5f5f7] text-[#737373] border border-[#e5e5e5]">
          Deleted
        </span>
      );
    }

    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#f0f3ff] text-[#151c27] border border-[#dae2f3]">
        {String(value)}
      </span>
    );
  }

  if (type === "role") {
    let colorClasses = "bg-[#f0f3ff] text-[#534434] border-[#dae2f3]";
    if (strValue === "SUPER ADMIN") {
      colorClasses = "bg-[#feece0] text-[#855300] border-[#fed1b4] font-bold";
    } else if (strValue === "ADMIN") {
      colorClasses = "bg-[#e7eefe] text-[#0058be] border-[#bed7fc]";
    } else if (strValue === "MODERATOR") {
      colorClasses = "bg-[#fff3d6] text-[#855300] border-[#fbd988]";
    } else if (strValue === "SUPPORT") {
      colorClasses = "bg-[#e0f7fa] text-[#006064] border-[#b2ebf2]";
    } else if (strValue === "ANALYST") {
      colorClasses = "bg-[#e8eaf6] text-[#283593] border-[#c5cae9]";
    } else if (strValue === "ADS MANAGER") {
      colorClasses = "bg-[#e8f7f0] text-[#006c49] border-[#a3e5c7]";
    } else if (strValue === "COMPLIANCE MANAGER") {
      colorClasses = "bg-[#ffdad6] text-[#ba1a1a] border-[#ffb4ab]";
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs border font-medium ${colorClasses}`}>
        {String(value)}
      </span>
    );
  }

  // Action tag
  let actionColor = "bg-[#f0f3ff] text-[#534434] border-[#dae2f3]";
  if (strValue.includes("LOGIN")) actionColor = "bg-[#e7eefe] text-[#0058be] border-[#bed7fc]";
  if (strValue.includes("CREATE") || strValue.includes("RESTORE") || strValue.includes("VERIFIED"))
    actionColor = "bg-[#e8f7f0] text-[#006c49] border-[#a3e5c7]";
  if (strValue.includes("UPDATE") || strValue.includes("CHANGED") || strValue.includes("SUSPENDED"))
    actionColor = "bg-[#fff3d6] text-[#855300] border-[#fbd988]";
  if (strValue.includes("REMOVE") || strValue.includes("DELETE") || strValue.includes("BANNED") || strValue.includes("UNVERIFIED"))
    actionColor = "bg-[#ffdad6] text-[#ba1a1a] border-[#ffb4ab]";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono border font-medium ${actionColor}`}>
      {String(value)}
    </span>
  );
};
