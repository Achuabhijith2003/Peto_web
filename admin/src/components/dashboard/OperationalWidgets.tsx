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
} from "lucide-react";
import {
  PetoReportItem,
  AuditLogItem,
  PetoUserItem,
  SystemHealthData,
} from "../../types/admin";

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
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Active Moderation Queue</h3>
              <p className="text-[11px] text-slate-400">Reports awaiting review or escalation.</p>
            </div>
          </div>
          <Link
            to="/moderation"
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center"
          >
            View All ({pendingReports.length}) <ExternalLink className="w-3 h-3 ml-1" />
          </Link>
        </div>

        {pendingReports.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs flex flex-col items-center justify-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-500/80" />
            <span className="text-slate-300 font-medium">Moderation Queue is Clean!</span>
            <span>No unresolved content or account violations.</span>
          </div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {pendingReports.slice(0, 4).map((report) => (
              <div key={report.id} className="py-3 flex items-center justify-between space-x-3 text-xs">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono bg-slate-800 text-slate-300 border border-slate-700">
                      {report.target_type}
                    </span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase font-mono ${
                        report.priority === "CRITICAL"
                          ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                          : report.priority === "HIGH"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {report.priority}
                    </span>
                    <span className="text-slate-200 font-semibold truncate">{report.reason}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Reported by @{report.reporter?.username || "user"} • {new Date(report.created_at).toLocaleDateString()}
                  </div>
                </div>

                <Link
                  to={`/moderation/${report.id}`}
                  className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold shrink-0"
                >
                  Review
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. System Health & Infrastructure Widget */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">System Infrastructure Health</h3>
              <p className="text-[11px] text-slate-400">Database connectivity, latency & process status.</p>
            </div>
          </div>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono ${
              systemHealth.status === "OPTIMAL"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
            }`}
          >
            {systemHealth.status}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">DB Latency</div>
            <div className="text-base font-bold text-emerald-400 font-mono mt-0.5">
              {systemHealth.dbLatencyMs} ms
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Server Uptime</div>
            <div className="text-base font-bold text-slate-200 font-mono mt-0.5">
              {systemHealth.uptimeFormatted}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">RAM Usage</div>
            <div className="text-base font-bold text-cyan-400 font-mono mt-0.5">
              {systemHealth.memory?.usedMB || 0} MB
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80">
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Node Platform</div>
            <div className="text-base font-bold text-purple-400 font-mono mt-0.5">
              {systemHealth.platform?.nodeVersion?.split(".")[0] || "v22"}
            </div>
          </div>
        </div>

        {/* Services Status List */}
        <div className="space-y-2 pt-1">
          {(systemHealth.services || []).map((service, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/60 flex items-center justify-between text-xs"
            >
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span className="font-medium text-slate-300">{service.name}</span>
              </div>
              <span className="font-mono text-[10px] text-slate-500">
                {service.latencyMs ? `${service.latencyMs}ms` : service.sizeMB ? `${service.sizeMB} MB` : "ACTIVE"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Recent Administrative Actions Stream */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Recent Administrative Actions</h3>
              <p className="text-[11px] text-slate-400">Real-time audit log stream of privileged operations.</p>
            </div>
          </div>
          <Link
            to="/audit-logs"
            className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center"
          >
            Audit Logs <ExternalLink className="w-3 h-3 ml-1" />
          </Link>
        </div>

        {recentAdminActions.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">No admin actions recorded yet.</div>
        ) : (
          <div className="divide-y divide-slate-800/60">
            {recentAdminActions.slice(0, 5).map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between space-x-3 text-xs">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-indigo-300 text-[11px]">{log.action}</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-slate-400 text-[11px]">
                      by <strong className="text-slate-200">@{log.admin_user?.username || "admin"}</strong>
                    </span>
                  </div>
                  {log.details?.reason && (
                    <p className="text-[11px] text-slate-500 truncate">{log.details.reason}</p>
                  )}
                </div>
                <div className="text-[10px] text-slate-500 font-mono shrink-0">
                  {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Recent User Registrations & Growth Widget */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Recent User Registrations</h3>
              <p className="text-[11px] text-slate-400">New accounts created across mobile and web.</p>
            </div>
          </div>
          <Link
            to="/users"
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center"
          >
            All Users <ExternalLink className="w-3 h-3 ml-1" />
          </Link>
        </div>

        <div className="divide-y divide-slate-800/60">
          {recentUsers.slice(0, 5).map((user) => (
            <div key={user.id} className="py-2.5 flex items-center justify-between space-x-3 text-xs">
              <div className="flex items-center space-x-3 min-w-0">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover border border-slate-700" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[10px] text-slate-400">
                    {user.username?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-semibold text-slate-200 truncate">{user.full_name || user.username}</div>
                  <div className="text-[11px] text-slate-500 font-mono">@{user.username}</div>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <span className="text-[11px] text-slate-500 font-mono">
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
                <Link
                  to={`/users/${user.id}`}
                  className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Advertising Operational Notice */}
        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 flex items-center justify-between text-xs text-slate-400 mt-2">
          <div className="flex items-center space-x-2">
            <Megaphone className="w-4 h-4 text-slate-500" />
            <span>Pending Advertisements</span>
          </div>
          <span className="font-mono font-bold text-slate-400">
            {pendingAdsCount > 0 ? `${pendingAdsCount} Pending` : "Phase 5 Queue"}
          </span>
        </div>
      </div>
    </div>
  );
};
