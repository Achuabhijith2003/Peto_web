import React from "react";
import { Link } from "react-router-dom";
import {
  ShieldAlert,
  CheckCircle2,
  ExternalLink,
  Server,
  Activity,
  User,
  Megaphone,
  ArrowRight,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  PetoReportItem,
  AuditLogItem,
  PetoUserItem,
  SystemHealthData,
} from "../../types/admin";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface OperationalWidgetsProps {
  pendingReports: PetoReportItem[];
  recentAdminActions: AuditLogItem[];
  recentUsers: PetoUserItem[];
  systemHealth: SystemHealthData;
  pendingAdsCount?: number;
}

export const OperationalWidgets: React.FC<OperationalWidgetsProps> = ({
  pendingReports,
  recentAdminActions,
  recentUsers,
  systemHealth,
  pendingAdsCount = 0,
}) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 1. Pending & High-Priority Reports Widget */}
      <Card className="shadow-xs">
        <CardHeader className="border-b border-border pb-3 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
              <ShieldAlert className="size-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold font-heading">
                Active Moderation Queue
              </CardTitle>
              <CardDescription className="text-xs">
                Reports awaiting review or escalation.
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" render={<Link to="/moderation" className="text-xs text-primary font-semibold gap-1" />}>
            <span>View All ({pendingReports.length})</span>
            <ExternalLink className="size-3" />
          </Button>
        </CardHeader>

        <CardContent className="p-4">
          {pendingReports.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-xs flex flex-col items-center justify-center space-y-2">
              <CheckCircle2 className="size-8 text-emerald-500" />
              <span className="text-foreground font-semibold font-heading">Moderation Queue is Clean!</span>
              <span>No unresolved content or account violations.</span>
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {pendingReports.slice(0, 4).map((report) => (
                <div key={report.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase font-mono bg-muted text-muted-foreground border border-border">
                        {report.target_type}
                      </span>
                      <span
                        className={cn(
                          "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase font-mono",
                          report.priority === "CRITICAL"
                            ? "bg-destructive/15 text-destructive border border-destructive/30"
                            : report.priority === "HIGH"
                            ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30"
                            : "bg-muted text-muted-foreground border border-border"
                        )}
                      >
                        {report.priority}
                      </span>
                    </div>
                    <p className="text-xs text-foreground font-medium truncate max-w-sm">
                      {report.reason}
                    </p>
                  </div>
                  <Button variant="outline" size="sm" render={<Link to={`/moderation/${report.id}`} className="text-xs shrink-0" />}>
                    Review
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 2. System Health & Infrastructure Widget */}
      <Card className="shadow-xs">
        <CardHeader className="border-b border-border pb-3 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Server className="size-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold font-heading">
                System Health & Nodes
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time API, Database, and Storage Telemetry.
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" render={<Link to="/system" className="text-xs text-primary font-semibold gap-1" />}>
            <span>System Details</span>
            <ExternalLink className="size-3" />
          </Button>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-muted/40 border border-border">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                Database Ping
              </span>
              <span className="text-lg font-bold text-foreground font-heading mt-0.5 block">
                {systemHealth.dbLatencyMs} ms
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                ● Status: {systemHealth.status}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-muted/40 border border-border">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block">
                Uptime
              </span>
              <span className="text-lg font-bold text-foreground font-heading mt-0.5 block">
                {systemHealth.uptimeFormatted}
              </span>
              <span className="text-[10px] text-muted-foreground font-mono">
                Peto Engine v1.0
              </span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Megaphone className="size-4 text-primary" />
              <div>
                <span className="text-xs font-bold text-foreground block">
                  Campaign Reviews
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {pendingAdsCount} advertiser submissions awaiting compliance review
                </span>
              </div>
            </div>
            <Button variant="outline" size="sm" render={<Link to="/ads" className="text-xs" />}>
              Review
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3. Recent Administrative Audit Log Widget */}
      <Card className="shadow-xs">
        <CardHeader className="border-b border-border pb-3 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Activity className="size-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold font-heading">
                Administrative Trail
              </CardTitle>
              <CardDescription className="text-xs">
                Audited operations and state transitions.
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" render={<Link to="/audit-logs" className="text-xs text-primary font-semibold gap-1" />}>
            <span>Full Audit</span>
            <ExternalLink className="size-3" />
          </Button>
        </CardHeader>

        <CardContent className="p-4">
          <div className="divide-y divide-border/60">
            {recentAdminActions.slice(0, 4).map((action, idx) => (
              <div key={action.id || idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <StatusBadge type="action" value={action.action} />
                    <span className="text-[11px] font-mono text-muted-foreground truncate">
                      {action.admin_user_id || "System"}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0 font-mono">
                  {action.created_at ? new Date(action.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 4. New User Registrations Widget */}
      <Card className="shadow-xs">
        <CardHeader className="border-b border-border pb-3 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <User className="size-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold font-heading">
                New Registrations
              </CardTitle>
              <CardDescription className="text-xs">
                Recent user on-boarding and identity states.
              </CardDescription>
            </div>
          </div>
          <Button variant="ghost" size="sm" render={<Link to="/users" className="text-xs text-primary font-semibold gap-1" />}>
            <span>Directory</span>
            <ExternalLink className="size-3" />
          </Button>
        </CardHeader>

        <CardContent className="p-4">
          <div className="divide-y divide-border/60">
            {recentUsers.slice(0, 4).map((user) => (
              <div key={user.id} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="size-8 rounded-full bg-muted flex items-center justify-center font-bold text-xs text-muted-foreground shrink-0 overflow-hidden border border-border">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt="" className="size-full object-cover" />
                    ) : (
                      (user.username || "U").substring(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="truncate">
                    <span className="font-semibold text-foreground block truncate">
                      {user.full_name || user.username}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono block truncate">
                      @{user.username}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge type="verification" value={user.verified || false} />
                  <Button variant="outline" size="sm" render={<Link to={`/users/${user.id}`} className="text-xs" />}>
                    Inspect
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OperationalWidgets;
