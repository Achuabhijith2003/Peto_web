import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";
import { fetchUsers, updateUserStatus, updateUserVerification } from "../api/adminApi";
import { PetoUserItem, PaginationInfo } from "../types/admin";
import { StatusBadge } from "../components/ui/StatusBadge";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
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
  X,
  ArrowUpDown,
  RefreshCw,
  BadgeCheck,
} from "lucide-react";

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
  const canVerify = hasPermission("users.verify");

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

  const handleToggleVerification = async (user: PetoUserItem) => {
    if (!canVerify) return;
    try {
      setError(null);
      const nextVerified = !user.verified;
      await updateUserVerification(user.id, nextVerified);
      setActionSuccess(`User @${user.username} is now ${nextVerified ? "Verified" : "Unverified"}.`);
      loadUsers(pagination.page);
    } catch (err: any) {
      setError(err.message || "Failed to alter verification badge.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center">
            <Users className="w-6 h-6 mr-2.5 text-indigo-400" />
            User Management
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse registered Peto accounts, review engagement, enforce account suspensions, and manage badges.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs self-start">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-mono">
            Total in Platform: <strong className="text-white">{pagination.totalCount}</strong>
          </div>
          <button
            onClick={() => loadUsers(pagination.page)}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Refresh Users"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-400" : ""}`} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by username or full name..."
              className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center space-x-1.5 text-xs text-slate-400">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span>Status:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="BANNED">Banned</option>
              <option value="DEACTIVATED">Deactivated</option>
            </select>

            <div className="flex items-center space-x-1.5 text-xs text-slate-400 ml-2">
              <BadgeCheck className="w-3.5 h-3.5 text-slate-500" />
              <span>Verification:</span>
            </div>
            <select
              value={verifiedFilter}
              onChange={(e) => setVerifiedFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="ALL">All</option>
              <option value="true">Verified Only</option>
              <option value="false">Standard Only</option>
            </select>

            <div className="flex items-center space-x-1.5 text-xs text-slate-400 ml-2">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
              <span>Sort:</span>
            </div>
            <select
              value={`${sortBy}-${sortOrder}`}
              onChange={(e) => {
                const [col, ord] = e.target.value.split("-");
                setSortBy(col);
                setSortOrder(ord as "asc" | "desc");
              }}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="created_at-desc">Newest First</option>
              <option value="created_at-asc">Oldest First</option>
              <option value="followers_count-desc">Most Followers</option>
              <option value="posts_count-desc">Most Posts</option>
              <option value="username-asc">Username A-Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16">
            <LoadingSpinner message="Querying users catalog..." />
          </div>
        ) : users.length === 0 ? (
          <div className="p-16 text-center text-slate-400 space-y-2">
            <Users className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm font-semibold text-slate-300">No users match your criteria</p>
            <p className="text-xs text-slate-500">
              Try adjusting your search query, status filters, or verification options.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="px-6 py-3.5">User Profile</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5">Badge</th>
                  <th className="px-6 py-3.5">Followers</th>
                  <th className="px-6 py-3.5">Posts</th>
                  <th className="px-6 py-3.5">Joined Date</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* User info */}
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-xs shrink-0 overflow-hidden">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.username}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            user.full_name?.charAt(0).toUpperCase() || user.username?.charAt(0).toUpperCase() || "U"
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-100 flex items-center">
                            <span>{user.full_name || user.username}</span>
                          </div>
                          <div className="text-slate-400 text-[11px] font-mono">
                            @{user.username}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Status badge */}
                    <td className="px-6 py-4">
                      <StatusBadge type="status" value={user.status} />
                    </td>

                    {/* Verification badge */}
                    <td className="px-6 py-4">
                      <StatusBadge type="verification" value={user.verified} />
                    </td>

                    {/* Followers count */}
                    <td className="px-6 py-4 text-slate-300 font-mono">
                      {user.followers_count.toLocaleString()}
                    </td>

                    {/* Posts count */}
                    <td className="px-6 py-4 text-slate-300 font-mono">
                      {user.posts_count.toLocaleString()}
                    </td>

                    {/* Registered date */}
                    <td className="px-6 py-4 text-slate-400 text-[11px]">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        {/* View Detail Link */}
                        <Link
                          to={`/users/${user.id}`}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors"
                          title="View Full Profile & Reports"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>

                        {/* Quick Verify Toggle */}
                        {canVerify && (
                          <button
                            onClick={() => handleToggleVerification(user)}
                            title={user.verified ? "Revoke Verification" : "Grant Verified Badge"}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              user.verified
                                ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
                                : "bg-slate-800 border-slate-700 text-slate-400 hover:text-white"
                            }`}
                          >
                            <BadgeCheck className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Status Change (Suspend / Ban / Restore) */}
                        {(canSuspend || canBan) && (
                          <button
                            onClick={() => handleOpenStatusModal(user)}
                            title="Alter Account Status"
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              user.status === "BANNED" || user.status === "SUSPENDED"
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20"
                                : "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                            }`}
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Server-Side Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div>
              Showing page <strong className="text-white">{pagination.page}</strong> of{" "}
              <strong className="text-white">{pagination.totalPages}</strong> ({pagination.totalCount} users)
            </div>
            <div className="flex items-center space-x-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => loadUsers(pagination.page - 1)}
                className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 text-slate-200 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => loadUsers(pagination.page + 1)}
                className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-700 text-slate-200 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Account Status Action Modal */}
      {modifyingUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center">
                <ShieldAlert className="w-5 h-5 mr-2 text-rose-400" />
                Change Account Status
              </h2>
              <button onClick={() => setModifyingUser(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApplyStatusChange} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-slate-200">{modifyingUser.full_name || modifyingUser.username}</div>
                  <div className="text-[11px] text-slate-400 font-mono">@{modifyingUser.username}</div>
                </div>
                <StatusBadge type="status" value={modifyingUser.status} />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Select New Account Status
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="ACTIVE">ACTIVE — Restore full platform privileges</option>
                  <option value="SUSPENDED">SUSPENDED — Temporary account restriction</option>
                  <option value="BANNED">BANNED — Permanent account expulsion</option>
                  <option value="DEACTIVATED">DEACTIVATED — Deactivate account</option>
                </select>
              </div>

              {targetStatus === "SUSPENDED" && (
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Suspension Expiration (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={suspendedUntil}
                    onChange={(e) => setSuspendedUntil(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Leave blank for an indefinite suspension requiring manual admin reinstatement.
                  </p>
                </div>
              )}

              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Administrative Justification / Reason <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  required={targetStatus !== "ACTIVE"}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="State the reason for this moderation action (e.g. Violation of community safety guidelines, repeated harassment, spamming)..."
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                ></textarea>
                <p className="text-[11px] text-slate-500 mt-1">
                  This note is recorded directly into the Peto security audit trail.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setModifyingUser(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingStatus}
                  className={`px-4 py-2 rounded-xl text-white font-semibold shadow-lg disabled:opacity-50 cursor-pointer ${
                    targetStatus === "BANNED" || targetStatus === "SUSPENDED"
                      ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/25"
                      : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/25"
                  }`}
                >
                  {submittingStatus ? "Processing..." : `Confirm ${targetStatus}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
