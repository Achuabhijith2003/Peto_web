import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";
import { fetchUsers, updateUserStatus } from "../api/adminApi";
import { PetoUserItem, PaginationInfo } from "../types/admin";
import { StatusBadge } from "../components/ui/StatusBadge";
import { PageHeader } from "../components/layout/PageHeader";
import { EmptyState } from "../components/common/EmptyState";
import { LoadingState } from "../components/common/LoadingState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Users,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Eye,
  RefreshCw,
  BadgeCheck,
  UserCheck,
  Ban,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const AdminUsers: React.FC = () => {
  const { hasPermission } = useAdminAuth();
  const [searchParams] = useSearchParams();

  // URL Query param bindings
  const initialStatus = searchParams.get("status") || "ALL";
  const initialVerified = searchParams.get("verified") || "ALL";
  const initialSearch = searchParams.get("q") || "";

  const [users, setUsers] = useState<PetoUserItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    totalCount: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filters state
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [verifiedFilter, setVerifiedFilter] = useState(initialVerified);
  const [sortBy, setSortBy] = useState("created_at");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Status Modal state
  const [modifyingUser, setModifyingUser] = useState<PetoUserItem | null>(null);
  const [targetStatus, setTargetStatus] = useState<"ACTIVE" | "SUSPENDED" | "BANNED" | "DEACTIVATED">("SUSPENDED");
  const [statusReason, setStatusReason] = useState("");
  const [suspendedUntil, setSuspendedUntil] = useState("");
  const [submittingStatus, setSubmittingStatus] = useState(false);

  const canSuspend = hasPermission("users.suspend");
  const canBan = hasPermission("users.ban");

  const loadUsers = async (page = 1) => {
    try {
      setLoading(true);
      setError(null);

      const res = await fetchUsers({
        page,
        limit: 20,
        search: search.trim() || undefined,
        status: statusFilter !== "ALL" ? statusFilter : undefined,
        verified: verifiedFilter !== "ALL" ? verifiedFilter : undefined,
        sortBy,
        sortOrder,
      });

      setUsers(res.users);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(err.message || "Failed to retrieve users directory.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers(1);
  }, [search, statusFilter, verifiedFilter, sortBy, sortOrder]);

  const handleOpenStatusModal = (user: PetoUserItem) => {
    setModifyingUser(user);
    if (user.status === "ACTIVE") {
      setTargetStatus("SUSPENDED");
    } else {
      setTargetStatus("ACTIVE");
    }
    setStatusReason("");
    setSuspendedUntil("");
  };

  const handleApplyStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modifyingUser) return;

    if ((targetStatus === "SUSPENDED" || targetStatus === "BANNED" || targetStatus === "DEACTIVATED") && !statusReason.trim()) {
      setError("A justification reason is required for account restrictions.");
      return;
    }

    setSubmittingStatus(true);
    setError(null);
    try {
      await updateUserStatus(modifyingUser.id, {
        status: targetStatus,
        reason: statusReason,
        suspendedUntil: suspendedUntil ? new Date(suspendedUntil).toISOString() : null,
      });

      setActionSuccess(`User @${modifyingUser.username} status updated to ${targetStatus}.`);
      setModifyingUser(null);
      loadUsers(pagination.page);
    } catch (err: any) {
      setError(err.message || "Failed to update account status.");
    } finally {
      setSubmittingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="User Management"
        description="Browse registered Peto accounts, review community engagement, enforce account suspensions, and inspect verification records."
        badge={
          <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-medium bg-muted text-muted-foreground border border-border">
            Total: <strong className="text-foreground">{pagination.totalCount}</strong>
          </span>
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadUsers(pagination.page)}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={cn("size-3.5", loading && "animate-spin text-primary")} />
            <span>Refresh</span>
          </Button>
        }
      />

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="size-4 shrink-0" />
            <span className="font-medium">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="hover:opacity-80">
            ×
          </button>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="hover:opacity-80">
            ×
          </button>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <Card className="shadow-xs">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search username or name..."
                className="pl-9 text-xs"
              />
            </div>

            {/* Filter Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                <Filter className="size-3.5" />
                <span>Status:</span>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 px-2.5 rounded-lg bg-background border border-input text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
                <option value="BANNED">Banned</option>
                <option value="DEACTIVATED">Deactivated</option>
              </select>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium ml-1">
                <BadgeCheck className="size-3.5" />
                <span>Badge:</span>
              </div>
              <select
                value={verifiedFilter}
                onChange={(e) => setVerifiedFilter(e.target.value)}
                className="h-8 px-2.5 rounded-lg bg-background border border-input text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="ALL">All</option>
                <option value="true">Verified Only</option>
                <option value="false">Standard Only</option>
              </select>

              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [col, ord] = e.target.value.split("-");
                  setSortBy(col);
                  setSortOrder(ord as "asc" | "desc");
                }}
                className="h-8 px-2.5 rounded-lg bg-background border border-input text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring ml-1"
              >
                <option value="created_at-desc">Newest First</option>
                <option value="created_at-asc">Oldest First</option>
                <option value="followers_count-desc">Most Followers</option>
                <option value="posts_count-desc">Most Posts</option>
                <option value="username-asc">Username A-Z</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="shadow-xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <LoadingState rows={8} />
          </div>
        ) : users.length === 0 ? (
          <EmptyState
            icon={<Users className="size-6" />}
            title="No users found"
            description="No users matched your current query or filter criteria. Try clearing search filters."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[260px]">User Profile</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verification</TableHead>
                  <TableHead className="text-right">Followers</TableHead>
                  <TableHead className="text-right">Posts</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    {/* User profile */}
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden border border-border">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" className="size-full object-cover" />
                          ) : (
                            user.full_name?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase() || "U"
                          )}
                        </div>
                        <div className="truncate">
                          <span className="font-semibold text-foreground block truncate">
                            {user.full_name || user.username}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-mono block truncate">
                            @{user.username}
                          </span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <StatusBadge type="status" value={user.status} />
                    </TableCell>

                    <TableCell>
                      <StatusBadge type="verification" value={user.verified} />
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs">
                      {user.followers_count.toLocaleString()}
                    </TableCell>

                    <TableCell className="text-right font-mono text-xs">
                      {user.posts_count.toLocaleString()}
                    </TableCell>

                    <TableCell className="text-muted-foreground text-xs whitespace-nowrap">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          render={<Link to={`/users/${user.id}`} title="Inspect User Detail" />}
                          className="size-7"
                        >
                          <Eye className="size-3.5" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="icon"
                          render={
                            <Link
                              to={`/verifications?search=${encodeURIComponent(user.username || user.full_name || user.id)}`}
                              title="Inspect Verification Records"
                            />
                          }
                          className="size-7"
                        >
                          <BadgeCheck className="size-3.5 text-blue-500" />
                        </Button>

                        {(canSuspend || canBan) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenStatusModal(user)}
                            title="Account Enforcement"
                            className={cn(
                              "size-7",
                              user.status === "BANNED" || user.status === "SUSPENDED"
                                ? "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                                : "text-destructive hover:bg-destructive/10"
                            )}
                          >
                            <ShieldAlert className="size-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Server-Side Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <div>
              Page <strong className="text-foreground">{pagination.page}</strong> of{" "}
              <strong className="text-foreground">{pagination.totalPages}</strong> ({pagination.totalCount} users)
            </div>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                disabled={pagination.page <= 1}
                onClick={() => loadUsers(pagination.page - 1)}
                className="size-7"
              >
                <ChevronLeft className="size-3.5" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadUsers(pagination.page + 1)}
                className="size-7"
              >
                <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Account Enforcement Modal */}
      {modifyingUser && (
        <Dialog open={!!modifyingUser} onOpenChange={(open) => !open && setModifyingUser(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-base font-bold font-heading">
                <ShieldAlert className="size-4 text-destructive" />
                Account Status: @{modifyingUser.username}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Apply account restrictions or lift existing administrative suspensions.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleApplyStatusChange} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Target Status
                </label>
                <select
                  value={targetStatus}
                  onChange={(e: any) => setTargetStatus(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg bg-background border border-input text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="ACTIVE">ACTIVE (Normal Platform Access)</option>
                  <option value="SUSPENDED">SUSPENDED (Temporary Restriction)</option>
                  <option value="BANNED">BANNED (Indefinite Revocation)</option>
                  <option value="DEACTIVATED">DEACTIVATED</option>
                </select>
              </div>

              {targetStatus === "SUSPENDED" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground">
                    Suspension End Date (Optional)
                  </label>
                  <Input
                    type="date"
                    value={suspendedUntil}
                    onChange={(e) => setSuspendedUntil(e.target.value)}
                    className="text-xs"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Administrative Reason / Justification
                </label>
                <Textarea
                  rows={3}
                  required={targetStatus !== "ACTIVE"}
                  placeholder="Compliance violation, report justification, or audit reference..."
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  className="text-xs"
                />
              </div>

              <DialogFooter className="mt-4 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModifyingUser(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={submittingStatus}
                  variant={targetStatus === "ACTIVE" ? "default" : "destructive"}
                >
                  {submittingStatus ? "Applying..." : `Confirm ${targetStatus}`}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default AdminUsers;
