import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";
import { fetchUserDetail, updateUserStatus, updateUserVerification } from "../api/adminApi";
import { PetoUserDetail } from "../types/admin";
import { StatusBadge } from "../components/ui/StatusBadge";
import { LoadingSpinner } from "../components/ui/LoadingSpinner";
import {
  ArrowLeft,
  Calendar,
  Mail,
  Phone,
  MapPin,
  Globe,
  BadgeCheck,
  ShieldAlert,
  FileText,
  UserCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  Activity,
} from "lucide-react";

export const AdminUserDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { hasPermission } = useAdminAuth();

  const [userDetail, setUserDetail] = useState<PetoUserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Status Action Modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [targetStatus, setTargetStatus] = useState<"ACTIVE" | "SUSPENDED" | "BANNED" | "DEACTIVATED">("SUSPENDED");
  const [statusReason, setStatusReason] = useState("");
  const [suspendedUntil, setSuspendedUntil] = useState("");
  const [submittingStatus, setSubmittingStatus] = useState(false);

  const canSuspend = hasPermission("users.suspend");
  const canBan = hasPermission("users.ban");
  const canVerify = hasPermission("users.verify");

  const loadDetails = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const detail = await fetchUserDetail(id);
      setUserDetail(detail);
      setTargetStatus(detail.profile.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE");
    } catch (err: any) {
      setError(err.message || "Failed to load user profile.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetails();
  }, [id]);

  const handleToggleVerification = async () => {
    if (!userDetail || !canVerify) return;
    try {
      setError(null);
      const nextVerified = !userDetail.profile.verified;
      await updateUserVerification(userDetail.profile.id, nextVerified);
      setActionSuccess(`Verification badge ${nextVerified ? "granted" : "revoked"}.`);
      loadDetails();
    } catch (err: any) {
      setError(err.message || "Failed to alter verification.");
    }
  };

  const handleApplyStatusChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userDetail) return;

    if ((targetStatus === "SUSPENDED" || targetStatus === "BANNED" || targetStatus === "DEACTIVATED") && !statusReason.trim()) {
      setError("A justification reason is required for account restrictions.");
      return;
    }

    setSubmittingStatus(true);
    setError(null);
    try {
      await updateUserStatus(userDetail.profile.id, {
        status: targetStatus,
        reason: statusReason,
        suspendedUntil: suspendedUntil ? new Date(suspendedUntil).toISOString() : null,
      });

      setActionSuccess(`Account status updated to ${targetStatus}.`);
      setShowStatusModal(false);
      setStatusReason("");
      loadDetails();
    } catch (err: any) {
      setError(err.message || "Failed to update account status.");
    } finally {
      setSubmittingStatus(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="Fetching user details and moderation history..." />;
  }

  if (error || !userDetail) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center max-w-xl mx-auto space-y-4">
        <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">User Not Found</h2>
        <p className="text-xs text-slate-400">{error || "The requested user account does not exist."}</p>
        <Link
          to="/users"
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Users Directory</span>
        </Link>
      </div>
    );
  }

  const { profile, auth, metrics, adminRole, reports, moderationHistory } = userDetail;

  return (
    <div className="space-y-6">
      {/* Top Bar with Back Button */}
      <div className="flex items-center justify-between">
        <Link
          to="/users"
          className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Users Directory</span>
        </Link>
        <div className="text-xs text-slate-500 font-mono">
          User ID: <span className="text-slate-400">{profile.id}</span>
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

      {/* Profile Overview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 font-black text-2xl shrink-0 overflow-hidden shadow-md">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
              ) : (
                profile.full_name?.charAt(0).toUpperCase() || profile.username.charAt(0).toUpperCase()
              )}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-white">{profile.full_name || profile.username}</h1>
                <StatusBadge type="verification" value={profile.verified} />
                <StatusBadge type="status" value={profile.status} />
                {adminRole && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Admin ({adminRole.roleName})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-mono">@{profile.username}</p>
              {profile.bio && <p className="text-xs text-slate-300 max-w-xl pt-1">{profile.bio}</p>}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            {canVerify && (
              <button
                onClick={handleToggleVerification}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center space-x-1.5 transition-colors cursor-pointer ${
                  profile.verified
                    ? "bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700"
                    : "bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border-cyan-500/30"
                }`}
              >
                <BadgeCheck className="w-4 h-4 text-cyan-400" />
                <span>{profile.verified ? "Revoke Badge" : "Grant Verified"}</span>
              </button>
            )}

            {(canSuspend || canBan) && (
              <button
                onClick={() => setShowStatusModal(true)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center space-x-1.5 transition-colors cursor-pointer ${
                  profile.status === "ACTIVE"
                    ? "bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/30"
                    : "bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30"
                }`}
              >
                <ShieldAlert className="w-4 h-4" />
                <span>{profile.status === "ACTIVE" ? "Restrict Account" : "Reactivate Account"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Suspension Banner if Restricted */}
        {profile.status !== "ACTIVE" && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-200 text-xs space-y-1.5">
            <div className="flex items-center font-bold text-rose-300">
              <AlertTriangle className="w-4 h-4 mr-2 text-rose-400" />
              Account Status: {profile.status}
            </div>
            {profile.status_reason && (
              <p className="text-slate-300 text-[11px]">
                <strong>Administrative Reason:</strong> {profile.status_reason}
              </p>
            )}
            {profile.suspended_until && (
              <p className="text-slate-400 text-[11px] font-mono">
                Suspended until: {new Date(profile.suspended_until).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Engagement KPI Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-slate-800">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Followers</span>
            <p className="text-xl font-black text-white mt-1 font-mono">{metrics.followersCount.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Following</span>
            <p className="text-xl font-black text-white mt-1 font-mono">{metrics.followingCount.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Feed Posts</span>
            <p className="text-xl font-black text-white mt-1 font-mono">{metrics.postsCount.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-center">
            <span className="text-[11px] text-slate-400 uppercase font-semibold">Video Reels</span>
            <p className="text-xl font-black text-indigo-400 mt-1 font-mono">{metrics.reelsCount.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Grid: Account Info & Security Metadata */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Account Profile & Metadata */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-white flex items-center">
            <UserCheck className="w-4 h-4 text-indigo-400 mr-2" />
            Account Details & Contact
          </h2>

          <div className="space-y-3 text-xs divide-y divide-slate-800/60">
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-400 flex items-center">
                <Mail className="w-3.5 h-3.5 mr-2 text-slate-500" />
                Auth Email
              </span>
              <span className="text-slate-200 font-mono">{auth?.email || "Unavailable"}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-slate-400 flex items-center">
                <Phone className="w-3.5 h-3.5 mr-2 text-slate-500" />
                Phone Number
              </span>
              <span className="text-slate-200 font-mono">{profile.phone || "Not provided"}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-slate-400 flex items-center">
                <MapPin className="w-3.5 h-3.5 mr-2 text-slate-500" />
                Location
              </span>
              <span className="text-slate-200">{profile.location || "Not provided"}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-slate-400 flex items-center">
                <Globe className="w-3.5 h-3.5 mr-2 text-slate-500" />
                Website
              </span>
              {profile.website ? (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-400 hover:underline truncate max-w-xs"
                >
                  {profile.website}
                </a>
              ) : (
                <span className="text-slate-500">None</span>
              )}
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-slate-400 flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-2 text-slate-500" />
                Date of Birth
              </span>
              <span className="text-slate-200">{profile.date_of_birth || "Not provided"}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-slate-400 flex items-center">
                <Clock className="w-3.5 h-3.5 mr-2 text-slate-500" />
                Account Created
              </span>
              <span className="text-slate-200 font-mono">{new Date(profile.created_at).toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-slate-400 flex items-center">
                <Activity className="w-3.5 h-3.5 mr-2 text-slate-500" />
                Last Sign-In
              </span>
              <span className="text-slate-200 font-mono">
                {auth?.lastSignInAt ? new Date(auth.lastSignInAt).toLocaleString() : "Never"}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Reports Queue on this User */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center">
              <ShieldAlert className="w-4 h-4 text-rose-400 mr-2" />
              Community Reports Involving User
            </h2>
            <span className="text-[11px] font-mono text-slate-500">
              {reports.against.length} reports against
            </span>
          </div>

          {reports.against.length === 0 ? (
            <div className="p-8 rounded-xl bg-slate-950/40 border border-slate-800/80 text-center text-xs text-slate-500 space-y-1">
              <CheckCircle2 className="w-6 h-6 text-emerald-500/60 mx-auto" />
              <p className="text-slate-400 font-semibold">Clean Safety Record</p>
              <p>No community reports have been filed against this account.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {reports.against.map((rep) => (
                <div
                  key={rep.id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-rose-400 font-bold uppercase text-[11px]">
                      Reason: {rep.reason}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {new Date(rep.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {rep.description && <p className="text-slate-300 text-[11px]">{rep.description}</p>}
                  <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500">
                    <span>Filed by: @{rep.reporter?.username || "anonymous"}</span>
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">{rep.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Moderation History Audit Log on this User */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center">
          <FileText className="w-4 h-4 text-emerald-400 mr-2" />
          Administrative Moderation History
        </h2>

        {moderationHistory.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            No administrative moderation actions recorded yet for this user.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/40">
                  <th className="px-4 py-2.5">Date & Time</th>
                  <th className="px-4 py-2.5">Admin Actor</th>
                  <th className="px-4 py-2.5">Action</th>
                  <th className="px-4 py-2.5">Recorded Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {moderationHistory.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30">
                    <td className="px-4 py-3 text-slate-400 text-[11px] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-sans text-slate-200">
                      @{log.admin_user?.username || "system"}
                    </td>
                    <td className="px-4 py-3 font-sans">
                      <StatusBadge type="action" value={log.action} />
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-[11px]">
                      {log.details?.reason ? (
                        <span>Reason: {log.details.reason}</span>
                      ) : (
                        <span className="text-slate-500">{JSON.stringify(log.details)}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Status Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-base font-bold text-white flex items-center">
                <ShieldAlert className="w-5 h-5 mr-2 text-rose-400" />
                Alter Account Status
              </h2>
              <button onClick={() => setShowStatusModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApplyStatusChange} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Select Action / Status
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
                  placeholder="Mandatory explanation for this moderation action..."
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                ></textarea>
                <p className="text-[11px] text-slate-500 mt-1">
                  Recorded in the immutable security audit log.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
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
