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
      <div className="p-6 rounded-2xl bg-white border border-[#e2e8f8] shadow-level-1 space-y-4">
        <div className="flex items-center justify-between border-b border-[#e2e8f8] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-[#ffdad6] text-[#ba1a1a]">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#151c27] font-heading tracking-tight">Active Moderation Queue</h3>
              <p className="text-[11px] text-[#534434]">Reports awaiting review or escalation.</p>
            </div>
          </div>
          <Link
            to="/moderation"
            className="text-xs text-[#0058be] hover:text-[#2170e4] font-semibold inline-flex items-center"
          >
            View All ({pendingReports.length}) <ExternalLink className="w-3 h-3 ml-1" />
          </Link>
        </div>

        {pendingReports.length === 0 ? (
          <div className="p-8 text-center text-[#534434] text-xs flex flex-col items-center justify-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-[#006c49]" />
            <span className="text-[#151c27] font-semibold font-heading">Moderation Queue is Clean!</span>
            <span>No unresolved content or account violations.</span>
          </div>
        ) : (
          <div className="divide-y divide-[#e2e8f8]">
            {pendingReports.slice(0, 4).map((report) => (
              <div key={report.id} className="py-3 flex items-center justify-between space-x-3 text-xs">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase font-mono bg-[#f0f3ff] text-[#534434] border border-[#dae2f3]">
                      {report.target_type}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase font-mono ${
                        report.priority === "CRITICAL"
                          ? "bg-[#ffdad6] text-[#ba1a1a] border border-[#ffb4ab]"
                          : report.priority === "HIGH"
                          ? "bg-[#fff3d6] text-[#855300] border border-[#fbd988]"
                          : "bg-[#f0f3ff] text-[#534434] border border-[#dae2f3]"
                      }`}
                    >
                      {report.priority}
                    </span>
                    <span className="text-[#151c27] font-medium truncate">{report.reason}</span>
                  </div>
                  <div className="text-[11px] text-[#534434]">
                    Reported by @{report.reporter?.username || "user"} • {new Date(report.created_at).toLocaleDateString()}
                  </div>
                </div>

                <Link
                  to={`/moderation/${report.id}`}
                  className="px-2.5 py-1 rounded-lg bg-[#e7eefe] hover:bg-[#d5e3fc] text-[#0058be] border border-[#bed7fc] text-[11px] font-semibold shrink-0 transition-colors"
                >
                  Review
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. System Health & Infrastructure Widget */}
      <div className="p-6 rounded-2xl bg-white border border-[#e2e8f8] shadow-level-1 space-y-4">
        <div className="flex items-center justify-between border-b border-[#e2e8f8] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-[#e8f7f0] text-[#006c49]">
              <Server className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#151c27] font-heading tracking-tight">System Infrastructure Health</h3>
              <p className="text-[11px] text-[#534434]">Database connectivity, latency & process status.</p>
            </div>
          </div>
          <span
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider font-mono ${
              systemHealth.status === "OPTIMAL"
                ? "bg-[#e8f7f0] text-[#006c49] border border-[#a3e5c7]"
                : "bg-[#fff3d6] text-[#855300] border border-[#fbd988]"
            }`}
          >
            {systemHealth.status}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
          <div className="p-3 rounded-xl bg-[#f9f9ff] border border-[#e2e8f8]">
            <div className="text-[10px] text-[#534434] uppercase font-semibold font-heading">DB Latency</div>
            <div className="text-base font-bold text-[#006c49] font-heading mt-0.5">
              {systemHealth.dbLatencyMs} ms
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#f9f9ff] border border-[#e2e8f8]">
            <div className="text-[10px] text-[#534434] uppercase font-semibold font-heading">Server Uptime</div>
            <div className="text-base font-bold text-[#151c27] font-heading mt-0.5">
              {systemHealth.uptimeFormatted}
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#f9f9ff] border border-[#e2e8f8]">
            <div className="text-[10px] text-[#534434] uppercase font-semibold font-heading">RAM Usage</div>
            <div className="text-base font-bold text-[#0058be] font-heading mt-0.5">
              {systemHealth.memory?.usedMB || 0} MB
            </div>
          </div>

          <div className="p-3 rounded-xl bg-[#f9f9ff] border border-[#e2e8f8]">
            <div className="text-[10px] text-[#534434] uppercase font-semibold font-heading">Node Platform</div>
            <div className="text-base font-bold text-[#855300] font-heading mt-0.5">
              {systemHealth.platform?.nodeVersion?.split(".")[0] || "v22"}
            </div>
          </div>
        </div>

        {/* Services Status List */}
        <div className="space-y-2 pt-1">
          {(systemHealth.services || []).map((service, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-xl bg-[#f9f9ff] border border-[#e2e8f8] flex items-center justify-between text-xs"
            >
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-[#006c49]"></span>
                <span className="font-medium text-[#151c27]">{service.name}</span>
              </div>
              <span className="font-mono text-[10px] text-[#534434]">
                {service.latencyMs ? `${service.latencyMs}ms` : service.sizeMB ? `${service.sizeMB} MB` : "ACTIVE"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Recent Administrative Actions Stream */}
      <div className="p-6 rounded-2xl bg-white border border-[#e2e8f8] shadow-level-1 space-y-4">
        <div className="flex items-center justify-between border-b border-[#e2e8f8] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-[#feece0] text-[#855300]">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#151c27] font-heading tracking-tight">Recent Administrative Actions</h3>
              <p className="text-[11px] text-[#534434]">Real-time audit log stream of privileged operations.</p>
            </div>
          </div>
          <Link
            to="/audit-logs"
            className="text-xs text-[#0058be] hover:text-[#2170e4] font-semibold inline-flex items-center"
          >
            Audit Logs <ExternalLink className="w-3 h-3 ml-1" />
          </Link>
        </div>

        {recentAdminActions.length === 0 ? (
          <div className="p-8 text-center text-[#534434] text-xs">No admin actions recorded yet.</div>
        ) : (
          <div className="divide-y divide-[#e2e8f8]">
            {recentAdminActions.slice(0, 5).map((log) => (
              <div key={log.id} className="py-2.5 flex items-center justify-between space-x-3 text-xs">
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-[#0058be] text-[11px]">{log.action}</span>
                    <span className="text-[#e2e8f8]">•</span>
                    <span className="text-[#534434] text-[11px]">
                      by <strong className="text-[#151c27]">@{log.admin_user?.username || "admin"}</strong>
                    </span>
                  </div>
                  {log.details?.reason && (
                    <p className="text-[11px] text-[#534434] truncate">{log.details.reason}</p>
                  )}
                </div>
                <div className="text-[10px] text-[#534434] font-mono shrink-0">
                  {new Date(log.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Recent User Registrations & Growth Widget */}
      <div className="p-6 rounded-2xl bg-white border border-[#e2e8f8] shadow-level-1 space-y-4">
        <div className="flex items-center justify-between border-b border-[#e2e8f8] pb-3">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-[#e7eefe] text-[#0058be]">
              <User className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#151c27] font-heading tracking-tight">Recent User Registrations</h3>
              <p className="text-[11px] text-[#534434]">New accounts created across mobile and web.</p>
            </div>
          </div>
          <Link
            to="/users"
            className="text-xs text-[#0058be] hover:text-[#2170e4] font-semibold inline-flex items-center"
          >
            All Users <ExternalLink className="w-3 h-3 ml-1" />
          </Link>
        </div>

        <div className="divide-y divide-[#e2e8f8]">
          {recentUsers.slice(0, 5).map((user) => (
            <div key={user.id} className="py-2.5 flex items-center justify-between space-x-3 text-xs">
              <div className="flex items-center space-x-3 min-w-0">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover border border-[#e2e8f8]" />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#f59e0b] to-[#0058be] text-white flex items-center justify-center font-bold text-[10px]">
                    {user.username?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="font-semibold text-[#151c27] truncate">{user.full_name || user.username}</div>
                  <div className="text-[11px] text-[#534434] font-mono">@{user.username}</div>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <span className="text-[11px] text-[#534434] font-mono">
                  {new Date(user.created_at).toLocaleDateString()}
                </span>
                <Link
                  to={`/users/${user.id}`}
                  className="p-1 rounded-md text-[#534434] hover:text-[#151c27] hover:bg-[#f0f3ff] transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Advertising Operational Notice */}
        <div className="p-3 rounded-xl bg-[#f9f9ff] border border-[#e2e8f8] flex items-center justify-between text-xs text-[#534434] mt-2">
          <div className="flex items-center space-x-2">
            <Megaphone className="w-4 h-4 text-[#855300]" />
            <span>Pending Advertisements</span>
          </div>
          <span className="font-mono font-bold text-[#855300]">
            {pendingAdsCount > 0 ? `${pendingAdsCount} Pending` : "Phase 5 Queue"}
          </span>
        </div>
      </div>
    </div>
  );
};
