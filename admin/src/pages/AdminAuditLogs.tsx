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
          <h1 className="text-2xl font-bold font-heading text-[#151c27] tracking-tight flex items-center">
            <FileText className="w-6 h-6 mr-2.5 text-[#006c49]" />
            Administrative Audit Trail
          </h1>
          <p className="text-xs text-[#534434] mt-1">
            Immutable log of all administrative actions, role assignments, security events, and configuration modifications.
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs font-semibold text-[#006c49] bg-[#bbf7d0]/40 px-3 py-1.5 rounded-full border border-[#006c49]/30 self-start">
          <span className="w-2 h-2 rounded-full bg-[#006c49] animate-pulse"></span>
          <span>Immutable Ledger Active</span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-white border border-[#ffdad6] text-[#ba1a1a] text-xs font-semibold flex items-center space-x-2 shadow-level-1">
          <AlertCircle className="w-4 h-4 text-[#ba1a1a]" />
          <span>{error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white border border-[#e2e8f8] rounded-2xl p-4 shadow-level-1 flex flex-wrap items-center gap-3">
        <div className="flex items-center space-x-2 text-xs text-[#534434] font-semibold font-heading">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters:</span>
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-[#f0f3ff] border border-[#dae2f3] text-xs text-[#151c27] focus:outline-none focus:bg-white focus:border-[#0058be]"
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
          className="px-3 py-2 rounded-xl bg-[#f0f3ff] border border-[#dae2f3] text-xs text-[#151c27] focus:outline-none focus:bg-white focus:border-[#0058be]"
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
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-[#ba1a1a] hover:bg-[#ffdad6]/40 transition-colors cursor-pointer"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white border border-[#e2e8f8] rounded-2xl shadow-level-1 overflow-hidden">
        {loading ? (
          <div className="p-12">
            <LoadingSpinner message="Querying audit ledger..." />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-[#534434] space-y-2">
            <FileText className="w-8 h-8 mx-auto text-[#534434]/60" />
            <p className="text-sm font-bold font-heading text-[#151c27]">No audit log entries recorded</p>
            <p className="text-xs text-[#534434]">
              Audit log entries will populate automatically as administrators perform sensitive operations.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e2e8f8] bg-[#f0f3ff] text-[#534434] font-bold font-heading uppercase tracking-wider text-[11px]">
                  <th className="px-6 py-3.5">Timestamp</th>
                  <th className="px-6 py-3.5">Admin Actor</th>
                  <th className="px-6 py-3.5">Action</th>
                  <th className="px-6 py-3.5">Resource</th>
                  <th className="px-6 py-3.5">Target ID</th>
                  <th className="px-6 py-3.5">Client IP</th>
                  <th className="px-6 py-3.5 text-right">Payload</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f8] font-mono">
                {logs.map((item) => (
                  <tr key={item.id} className="hover:bg-[#f9f9ff] transition-colors">
                    <td className="px-6 py-4 text-[#534434] text-[11px] whitespace-nowrap">
                      {new Date(item.created_at).toLocaleString()}
                    </td>

                    <td className="px-6 py-4 font-sans">
                      {item.admin_user ? (
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-[#151c27]">
                            @{item.admin_user.username}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[#534434]/70 font-mono text-[11px]">System Process</span>
                      )}
                    </td>

                    <td className="px-6 py-4 font-sans">
                      <StatusBadge type="action" value={item.action} />
                    </td>

                    <td className="px-6 py-4 text-[#151c27] text-[11px]">
                      {item.resource_type}
                    </td>

                    <td className="px-6 py-4 text-[#534434] text-[11px] truncate max-w-[120px]">
                      {item.resource_id || "—"}
                    </td>

                    <td className="px-6 py-4 text-[#534434] text-[11px]">
                      {item.ip_address || "—"}
                    </td>

                    <td className="px-6 py-4 text-right font-sans">
                      <button
                        onClick={() => setInspectingLog(item)}
                        className="p-1.5 rounded-xl bg-[#f0f3ff] hover:bg-[#e2e8f8] text-[#0058be] border border-[#dae2f3] transition-colors cursor-pointer"
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
          <div className="p-4 border-t border-[#e2e8f8] flex items-center justify-between text-xs text-[#534434]">
            <div>
              Showing page <strong className="text-[#151c27] font-bold">{pagination.page}</strong> of{" "}
              <strong className="text-[#151c27] font-bold">{pagination.totalPages}</strong> (
              {pagination.totalCount} total entries)
            </div>
            <div className="flex items-center space-x-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => loadLogs(pagination.page - 1)}
                className="p-1.5 rounded-xl bg-[#f0f3ff] border border-[#dae2f3] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#e2e8f8] text-[#534434] cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadLogs(pagination.page + 1)}
                className="p-1.5 rounded-xl bg-[#f0f3ff] border border-[#dae2f3] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#e2e8f8] text-[#534434] cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inspect Log Details Modal */}
      {inspectingLog && (
        <div className="fixed inset-0 bg-[#151c27]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#e2e8f8] rounded-2xl w-full max-w-2xl p-6 shadow-level-3 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#e2e8f8] pb-3">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-[#006c49]" />
                <h2 className="text-sm font-bold font-heading text-[#151c27]">
                  Audit Log Details — {inspectingLog.action}
                </h2>
              </div>
              <button
                onClick={() => setInspectingLog(null)}
                className="text-[#534434] hover:text-[#151c27] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-mono bg-[#f9f9ff] p-4 rounded-xl border border-[#e2e8f8]">
              <div>
                <span className="text-[#534434] block">Record ID:</span>
                <span className="text-[#151c27] font-semibold">{inspectingLog.id}</span>
              </div>
              <div>
                <span className="text-[#534434] block">Timestamp:</span>
                <span className="text-[#151c27]">{new Date(inspectingLog.created_at).toISOString()}</span>
              </div>
              <div>
                <span className="text-[#534434] block">Resource Type:</span>
                <span className="text-[#151c27] font-semibold">{inspectingLog.resource_type}</span>
              </div>
              <div>
                <span className="text-[#534434] block">Resource ID:</span>
                <span className="text-[#151c27]">{inspectingLog.resource_id || "null"}</span>
              </div>
              <div>
                <span className="text-[#534434] block">Client IP:</span>
                <span className="text-[#151c27]">{inspectingLog.ip_address || "unknown"}</span>
              </div>
              <div>
                <span className="text-[#534434] block">User-Agent:</span>
                <span className="text-[#151c27] truncate block" title={inspectingLog.user_agent || ""}>
                  {inspectingLog.user_agent || "unknown"}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <span className="text-xs font-semibold font-heading uppercase tracking-wider text-[#534434]">
                Action Metadata / Payload:
              </span>
              <pre className="p-4 rounded-xl bg-[#f9f9ff] border border-[#e2e8f8] text-xs font-mono text-[#0058be] overflow-x-auto max-h-64">
                {JSON.stringify(inspectingLog.details, null, 2)}
              </pre>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInspectingLog(null)}
                className="px-4 py-2 rounded-xl bg-[#f0f3ff] hover:bg-[#e2e8f8] text-[#534434] text-xs font-semibold border border-[#dae2f3] cursor-pointer"
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
