import React, { useState, useEffect } from "react";
import { fetchAuditLogs } from "../api/adminApi";
import { AuditLogItem, PaginationInfo } from "../types/admin";
import { StatusBadge } from "../components/ui/StatusBadge";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import {
  FileText,
  Filter,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

export const AdminAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [actionFilter, setActionFilter] = useState<string>("");
  const [resourceFilter, setResourceFilter] = useState<string>("");

  // Inspect details modal
  const [inspectingLog, setInspectingLog] = useState<AuditLogItem | null>(null);

  const loadLogs = async (targetPage = 1) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchAuditLogs({
        page: targetPage,
        limit: 20,
        action: actionFilter || undefined,
        resourceType: resourceFilter || undefined,
      });
      setLogs(res.logs);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(err.message || "Failed to retrieve audit logs.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs(1);
  }, [actionFilter, resourceFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center">
            <FileText className="w-6 h-6 mr-2.5 text-emerald-400" />
            Administrative Audit Trail
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Immutable log of all administrative actions, role assignments, security events, and configuration modifications.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs text-slate-400 self-start">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Immutable Ledger Active</span>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm flex flex-wrap items-center gap-3">
        <div className="flex items-center space-x-2 text-xs text-slate-400 font-semibold">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters:</span>
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Actions</option>
          <option value="ADMIN_LOGIN">ADMIN_LOGIN</option>
          <option value="ADMIN_CREATED">ADMIN_CREATED</option>
          <option value="ADMIN_UPDATED">ADMIN_UPDATED</option>
          <option value="ROLE_CHANGED">ROLE_CHANGED</option>
          <option value="ADMIN_REMOVED">ADMIN_REMOVED</option>
          <option value="USER_SUSPENDED">USER_SUSPENDED</option>
          <option value="USER_BANNED">USER_BANNED</option>
          <option value="CONTENT_REMOVED">CONTENT_REMOVED</option>
        </select>

        <select
          value={resourceFilter}
          onChange={(e) => setResourceFilter(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">All Resource Types</option>
          <option value="admin_user">admin_user</option>
          <option value="admin_role">admin_role</option>
          <option value="user">user</option>
          <option value="post">post</option>
          <option value="comment">comment</option>
          <option value="community">community</option>
          <option value="ad">ad</option>
          <option value="system_setting">system_setting</option>
        </select>

        {(actionFilter || resourceFilter) && (
          <button
            onClick={() => {
              setActionFilter("");
              setResourceFilter("");
            }}
            className="px-2.5 py-1 rounded-lg text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Audit Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12">
            <LoadingSpinner message="Querying audit ledger..." />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <FileText className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-sm font-semibold text-slate-300">No audit log entries recorded</p>
            <p className="text-xs text-slate-500">
              Audit log entries will populate automatically as administrators perform sensitive operations.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="px-6 py-3.5">Timestamp</th>
                  <th className="px-6 py-3.5">Admin Actor</th>
                  <th className="px-6 py-3.5">Action</th>
                  <th className="px-6 py-3.5">Resource</th>
                  <th className="px-6 py-3.5">Target ID</th>
                  <th className="px-6 py-3.5">Client IP</th>
                  <th className="px-6 py-3.5 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {logs.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(item.created_at).toLocaleString()}
                    </td>

                    <td className="px-6 py-4 font-sans">
                      {item.admin_user ? (
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-slate-200">
                            @{item.admin_user.username}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-500 font-mono text-[11px]">System Process</span>
                      )}
                    </td>

                    <td className="px-6 py-4 font-sans">
                      <StatusBadge type="action" value={item.action} />
                    </td>

                    <td className="px-6 py-4 text-slate-300 text-[11px]">
                      {item.resource_type}
                    </td>

                    <td className="px-6 py-4 text-slate-400 text-[11px] truncate max-w-[120px]">
                      {item.resource_id || "—"}
                    </td>

                    <td className="px-6 py-4 text-slate-500 text-[11px]">
                      {item.ip_address || "—"}
                    </td>

                    <td className="px-6 py-4 text-right font-sans">
                      <button
                        onClick={() => setInspectingLog(item)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300 border border-slate-700 transition-colors cursor-pointer"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing page <strong className="text-white">{pagination.page}</strong> of{" "}
              <strong className="text-white">{pagination.totalPages}</strong> (
              {pagination.totalCount} total entries)
            </div>
            <div className="flex items-center space-x-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => loadLogs(pagination.page - 1)}
                className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 text-slate-200 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadLogs(pagination.page + 1)}
                className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 text-slate-200 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inspect Log Details Modal */}
      {inspectingLog && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-bold text-white">
                  Audit Log Details — {inspectingLog.action}
                </h2>
              </div>
              <button
                onClick={() => setInspectingLog(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-slate-950 p-4 rounded-xl border border-slate-800/80">
              <div>
                <span className="text-slate-500 block">Record ID:</span>
                <span className="text-slate-200">{inspectingLog.id}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Timestamp:</span>
                <span className="text-slate-200">{new Date(inspectingLog.created_at).toISOString()}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Resource Type:</span>
                <span className="text-slate-200">{inspectingLog.resource_type}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Resource ID:</span>
                <span className="text-slate-200">{inspectingLog.resource_id || "null"}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Client IP:</span>
                <span className="text-slate-200">{inspectingLog.ip_address || "unknown"}</span>
              </div>
              <div>
                <span className="text-slate-500 block">User-Agent:</span>
                <span className="text-slate-200 truncate block" title={inspectingLog.user_agent || ""}>
                  {inspectingLog.user_agent || "unknown"}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Action Metadata / Payload:
              </span>
              <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-indigo-300 overflow-x-auto max-h-64">
                {JSON.stringify(inspectingLog.details, null, 2)}
              </pre>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInspectingLog(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
