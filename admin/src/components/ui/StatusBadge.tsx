import React from "react";
import { CheckCircle2, ShieldAlert, AlertTriangle, Clock, RefreshCw, Ban, XCircle, RotateCcw, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface StatusBadgeProps {
  type?: "role" | "status" | "action" | "verification" | "general";
  value: string | boolean;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type = "status", value, className }) => {
  if (type === "verification") {
    const isVerified = value === true || String(value).toLowerCase() === "true";
    return isVerified ? (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
          className
        )}
      >
        <CheckCircle2 className="size-3 text-blue-600 dark:text-blue-400" />
        Verified
      </span>
    ) : (
      <span
        className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-muted-foreground border border-border bg-muted/40",
          className
        )}
      >
        Standard
      </span>
    );
  }

  const strValue = String(value).toUpperCase().trim();

  // Status mapping
  if (type === "status" || type === "general") {
    if (strValue === "ACTIVE" || strValue === "ENABLED" || strValue === "APPROVED" || strValue === "RESOLVED") {
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20",
            className
          )}
        >
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          {strValue === "APPROVED" ? "Approved" : strValue === "ENABLED" ? "Enabled" : strValue === "RESOLVED" ? "Resolved" : "Active"}
        </span>
      );
    }

    if (strValue === "SUBMITTED" || strValue === "PENDING" || strValue === "OPEN") {
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20",
            className
          )}
        >
          <Clock className="size-3 text-amber-600 dark:text-amber-400" />
          {strValue === "SUBMITTED" ? "Submitted" : strValue === "OPEN" ? "Open" : "Pending"}
        </span>
      );
    }

    if (strValue === "UNDER_REVIEW") {
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20",
            className
          )}
        >
          <RefreshCw className="size-3 text-blue-600 dark:text-blue-400 animate-spin" />
          Under Review
        </span>
      );
    }

    if (strValue === "ADDITIONAL_INFORMATION_REQUIRED" || strValue === "INFO_REQUESTED") {
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20",
            className
          )}
        >
          <AlertTriangle className="size-3 text-purple-600 dark:text-purple-400" />
          Info Requested
        </span>
      );
    }

    if (strValue === "REVERIFICATION_REQUIRED") {
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-700 dark:text-orange-400 border border-orange-500/20",
            className
          )}
        >
          <RotateCcw className="size-3 text-orange-600 dark:text-orange-400" />
          Reverification
        </span>
      );
    }

    if (strValue === "SUSPENDED") {
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30",
            className
          )}
        >
          <AlertTriangle className="size-3 text-amber-600 dark:text-amber-400" />
          Suspended
        </span>
      );
    }

    if (strValue === "BANNED" || strValue === "REJECTED" || strValue === "REVOKED") {
      return (
        <span
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20",
            className
          )}
        >
          {strValue === "REVOKED" ? (
            <Ban className="size-3" />
          ) : strValue === "REJECTED" ? (
            <XCircle className="size-3" />
          ) : (
            <ShieldAlert className="size-3" />
          )}
          {strValue === "REVOKED" ? "Revoked" : strValue === "REJECTED" ? "Rejected" : "Banned"}
        </span>
      );
    }

    if (strValue === "DEACTIVATED" || strValue === "DISABLED" || strValue === "INACTIVE") {
      return (
        <span
          className={cn(
            "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground border border-border",
            className
          )}
        >
          {strValue === "DISABLED" ? "Disabled" : strValue === "INACTIVE" ? "Inactive" : "Deactivated"}
        </span>
      );
    }

    return (
      <span
        className={cn(
          "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-foreground border border-border",
          className
        )}
      >
        {String(value)}
      </span>
    );
  }

  // Roles
  if (type === "role") {
    let colorStyle = "bg-muted text-muted-foreground border-border";
    if (strValue.includes("SUPER ADMIN")) {
      colorStyle = "bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-500/30 font-bold";
    } else if (strValue.includes("ADMIN")) {
      colorStyle = "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20";
    } else if (strValue.includes("MODERATOR")) {
      colorStyle = "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20";
    } else if (strValue.includes("SUPPORT")) {
      colorStyle = "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20";
    } else if (strValue.includes("ANALYST")) {
      colorStyle = "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20";
    } else if (strValue.includes("ADS")) {
      colorStyle = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20";
    } else if (strValue.includes("COMPLIANCE")) {
      colorStyle = "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20";
    }

    return (
      <span
        className={cn(
          "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs border font-medium",
          colorStyle,
          className
        )}
      >
        <ShieldCheck className="size-3" />
        {String(value)}
      </span>
    );
  }

  // Audit / Action tags
  let actionStyle = "bg-muted/70 text-muted-foreground border-border";
  if (strValue.includes("LOGIN") || strValue.includes("AUTH")) {
    actionStyle = "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20";
  } else if (strValue.includes("CREATE") || strValue.includes("RESTORE") || strValue.includes("APPROV")) {
    actionStyle = "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20";
  } else if (strValue.includes("UPDATE") || strValue.includes("SUSPEND") || strValue.includes("PAUSE")) {
    actionStyle = "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20";
  } else if (strValue.includes("DELETE") || strValue.includes("REJECT") || strValue.includes("REVOKE") || strValue.includes("BAN")) {
    actionStyle = "bg-destructive/10 text-destructive border-destructive/20";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono border font-medium",
        actionStyle,
        className
      )}
    >
      {String(value)}
    </span>
  );
};

export default StatusBadge;
