import React, { useState, useEffect } from "react";
import { fetchAuditLogs } from "../api/adminApi";
import { AuditLogItem, PaginationInfo } from "../types/admin";
import { StatusBadge } from "../components/ui/StatusBadge";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";
import {
  FileText,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
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
      <PageHeader
        title="Administrative Audit Trail"
        description="Immutable log of all administrative actions, role assignments, security events, and configuration modifications."
        breadcrumbs={[
          { label: "Administration", href: "/audit-logs" },
          { label: "Audit Logs" },
        ]}
        actions={
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Immutable Ledger Active
            </span>
            <Button variant="outline" size="sm" onClick={() => loadLogs(pagination.page)}>
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
          </div>
        }
      />

      {error && (
        <Card className="p-4 bg-destructive/10 border-destructive/20 text-destructive text-xs font-semibold flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
          <span>{error}</span>
        </Card>
      )}

      {/* Filters */}
      <Card className="p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center space-x-2 text-xs text-muted-foreground font-semibold font-heading">
          <Filter className="w-3.5 h-3.5" />
          <span>Filters:</span>
        </div>

        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-1.5 rounded-xl bg-background border border-input text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
          className="px-3 py-1.5 rounded-xl bg-background border border-input text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setActionFilter("");
              setResourceFilter("");
            }}
            className="text-xs text-destructive hover:bg-destructive/10"
          >
            Clear Filters
          </Button>
        )}
      </Card>

      {/* Audit Logs Table */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-16 text-center text-muted-foreground space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="text-xs font-medium font-heading">Querying audit ledger...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center text-muted-foreground space-y-2">
            <FileText className="w-8 h-8 mx-auto opacity-50" />
            <p className="text-sm font-bold font-heading text-foreground">No audit log entries recorded</p>
            <p className="text-xs text-muted-foreground">
              Audit log entries will populate automatically as administrators perform sensitive operations.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Admin Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Target ID</TableHead>
                  <TableHead>Client IP</TableHead>
                  <TableHead className="text-right">Payload</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="text-muted-foreground text-[11px] whitespace-nowrap font-mono">
                      {new Date(item.created_at).toLocaleString()}
                    </TableCell>

                    <TableCell>
                      {item.admin_user ? (
                        <span className="font-semibold text-foreground">
                          @{item.admin_user.username}
                        </span>
                      ) : (
                        <span className="text-muted-foreground font-mono text-[11px]">System Process</span>
                      )}
                    </TableCell>

                    <TableCell>
                      <StatusBadge type="action" value={item.action} />
                    </TableCell>

                    <TableCell className="text-foreground text-[11px] font-mono">
                      {item.resource_type}
                    </TableCell>

                    <TableCell className="text-muted-foreground text-[11px] font-mono truncate max-w-[120px]">
                      {item.resource_id || "—"}
                    </TableCell>

                    <TableCell className="text-muted-foreground text-[11px] font-mono">
                      {item.ip_address || "—"}
                    </TableCell>

                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setInspectingLog(item)}
                        className="h-7 text-xs px-2"
                        title="View Details"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" /> Inspect
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Pagination Controls */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <div>
              Showing page <strong className="text-foreground font-bold">{pagination.page}</strong> of{" "}
              <strong className="text-foreground font-bold">{pagination.totalPages}</strong> (
              {pagination.totalCount} total entries)
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => loadLogs(pagination.page - 1)}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadLogs(pagination.page + 1)}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Inspect Log Details Modal via Dialog */}
      <Dialog open={inspectingLog !== null} onOpenChange={(open) => !open && setInspectingLog(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center text-sm font-heading">
              <FileText className="w-4 h-4 text-emerald-500 mr-2" />
              Audit Log Details — {inspectingLog?.action}
            </DialogTitle>
          </DialogHeader>

          {inspectingLog && (
            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 text-xs font-mono bg-muted/40 p-4 rounded-xl border border-border">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Record ID:</span>
                  <span className="text-foreground font-semibold">{inspectingLog.id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Timestamp:</span>
                  <span className="text-foreground">{new Date(inspectingLog.created_at).toISOString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Resource Type:</span>
                  <span className="text-foreground font-semibold">{inspectingLog.resource_type}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Resource ID:</span>
                  <span className="text-foreground">{inspectingLog.resource_id || "null"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Client IP:</span>
                  <span className="text-foreground">{inspectingLog.ip_address || "unknown"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">User-Agent:</span>
                  <span className="text-foreground truncate block" title={inspectingLog.user_agent || ""}>
                    {inspectingLog.user_agent || "unknown"}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-xs font-semibold font-heading uppercase tracking-wider text-muted-foreground">
                  Action Metadata / Payload:
                </span>
                <pre className="p-4 rounded-xl bg-muted/30 border border-border text-xs font-mono text-primary overflow-x-auto max-h-64">
                  {JSON.stringify(inspectingLog.details, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setInspectingLog(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
