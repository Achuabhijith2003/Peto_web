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
      <div className="bg-white border border-[#e2e8f8] rounded-2xl p-12 text-center max-w-xl mx-auto shadow-level-1 space-y-4">
        <AlertTriangle className="w-10 h-10 text-[#ba1a1a] mx-auto" />
        <h2 className="text-xl font-bold text-[#151c27] font-heading">User Not Found</h2>
        <p className="text-xs text-[#534434]">{error || "The requested user account does not exist."}</p>
        <Link
          to="/users"
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-[#0058be] hover:bg-[#2170e4] text-white text-xs font-semibold shadow-sm"
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
          className="inline-flex items-center space-x-2 text-xs font-semibold text-[#534434] hover:text-[#151c27] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Users Directory</span>
        </Link>
        <div className="text-xs text-[#534434] font-mono">
          User ID: <span className="text-[#151c27]">{profile.id}</span>
        </div>
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-[#e8f7f0] border border-[#a3e5c7] text-[#006c49] text-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-[#006c49] shrink-0" />
            <span className="font-medium">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-[#006c49] hover:opacity-80">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Profile Overview Card */}
      <div className="bg-white border border-[#e2e8f8] rounded-2xl p-6 shadow-level-1 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#f59e0b] to-[#0058be] text-white flex items-center justify-center font-bold text-2xl shrink-0 overflow-hidden shadow-xs">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
              ) : (
                profile.full_name?.charAt(0).toUpperCase() || profile.username.charAt(0).toUpperCase()
              )}
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-[#151c27] font-heading">{profile.full_name || profile.username}</h1>
                <StatusBadge type="verification" value={profile.verified} />
                <StatusBadge type="status" value={profile.status} />
                {adminRole && (
                  <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-[#feece0] text-[#855300] border border-[#fed1b4]">
                    Admin ({adminRole.roleName})
                  </span>
                )}
              </div>
              <p className="text-xs text-[#534434] font-mono">@{profile.username}</p>
              {profile.bio && <p className="text-xs text-[#534434] max-w-xl pt-1">{profile.bio}</p>}
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
            {canVerify && (
              <button
                onClick={handleToggleVerification}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center space-x-1.5 transition-colors cursor-pointer ${
                  profile.verified
                    ? "bg-[#f0f3ff] hover:bg-[#e2e8f8] text-[#534434] border-[#dae2f3]"
                    : "bg-[#e7eefe] hover:bg-[#d5e3fc] text-[#0058be] border-[#bed7fc]"
                }`}
              >
                <BadgeCheck className="w-4 h-4 text-[#0058be]" />
                <span>{profile.verified ? "Revoke Badge" : "Grant Verified"}</span>
              </button>
            )}

            {(canSuspend || canBan) && (
              <button
                onClick={() => setShowStatusModal(true)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold border flex items-center space-x-1.5 transition-colors cursor-pointer ${
                  profile.status === "ACTIVE"
                    ? "bg-[#ffdad6] hover:bg-[#ffc2ba] text-[#ba1a1a] border-[#ffb4ab]"
                    : "bg-[#e8f7f0] hover:bg-[#c9f1de] text-[#006c49] border-[#a3e5c7]"
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
          <div className="p-4 rounded-xl bg-[#ffdad6] border border-[#ffb4ab] text-[#ba1a1a] text-xs space-y-1.5">
            <div className="flex items-center font-bold font-heading">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Account Status: {profile.status}
            </div>
            {profile.status_reason && (
              <p className="text-[#151c27] text-[11px]">
                <strong>Administrative Reason:</strong> {profile.status_reason}
              </p>
            )}
            {profile.suspended_until && (
              <p className="text-[#534434] text-[11px] font-mono">
                Suspended until: {new Date(profile.suspended_until).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Engagement KPI Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-4 border-t border-[#e2e8f8]">
          <div className="p-4 rounded-xl bg-[#f9f9ff] border border-[#e2e8f8] text-center">
            <span className="text-[11px] text-[#534434] uppercase font-semibold font-heading">Followers</span>
            <p className="text-xl font-bold text-[#151c27] mt-1 font-heading">{metrics.followersCount.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-xl bg-[#f9f9ff] border border-[#e2e8f8] text-center">
            <span className="text-[11px] text-[#534434] uppercase font-semibold font-heading">Following</span>
            <p className="text-xl font-bold text-[#151c27] mt-1 font-heading">{metrics.followingCount.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-xl bg-[#f9f9ff] border border-[#e2e8f8] text-center">
            <span className="text-[11px] text-[#534434] uppercase font-semibold font-heading">Feed Posts</span>
            <p className="text-xl font-bold text-[#151c27] mt-1 font-heading">{metrics.postsCount.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-xl bg-[#f9f9ff] border border-[#e2e8f8] text-center">
            <span className="text-[11px] text-[#534434] uppercase font-semibold font-heading">Video Reels</span>
            <p className="text-xl font-bold text-[#0058be] mt-1 font-heading">{metrics.reelsCount.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Grid: Account Info & Security Metadata */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Account Profile & Metadata */}
        <div className="bg-white border border-[#e2e8f8] rounded-2xl p-6 shadow-level-1 space-y-4">
          <h2 className="text-sm font-bold text-[#151c27] font-heading flex items-center">
            <UserCheck className="w-4 h-4 text-[#0058be] mr-2" />
            Account Details & Contact
          </h2>

          <div className="space-y-3 text-xs divide-y divide-[#e2e8f8]">
            <div className="flex items-center justify-between py-2">
              <span className="text-[#534434] flex items-center">
                <Mail className="w-3.5 h-3.5 mr-2 text-[#534434]/60" />
                Auth Email
              </span>
              <span className="text-[#151c27] font-mono font-medium">{auth?.email || "Unavailable"}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-[#534434] flex items-center">
                <Phone className="w-3.5 h-3.5 mr-2 text-[#534434]/60" />
                Phone Number
              </span>
              <span className="text-[#151c27] font-mono">{profile.phone || "Not provided"}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-[#534434] flex items-center">
                <MapPin className="w-3.5 h-3.5 mr-2 text-[#534434]/60" />
                Location
              </span>
              <span className="text-[#151c27]">{profile.location || "Not provided"}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-[#534434] flex items-center">
                <Globe className="w-3.5 h-3.5 mr-2 text-[#534434]/60" />
                Website
              </span>
              {profile.website ? (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#0058be] font-medium hover:underline truncate max-w-xs"
                >
                  {profile.website}
                </a>
              ) : (
                <span className="text-[#534434]/60">None</span>
              )}
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-[#534434] flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-2 text-[#534434]/60" />
                Date of Birth
              </span>
              <span className="text-[#151c27]">{profile.date_of_birth || "Not provided"}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-[#534434] flex items-center">
                <Clock className="w-3.5 h-3.5 mr-2 text-[#534434]/60" />
                Account Created
              </span>
              <span className="text-[#151c27] font-mono">{new Date(profile.created_at).toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-[#534434] flex items-center">
                <Activity className="w-3.5 h-3.5 mr-2 text-[#534434]/60" />
                Last Sign-In
              </span>
              <span className="text-[#151c27] font-mono">
                {auth?.lastSignInAt ? new Date(auth.lastSignInAt).toLocaleString() : "Never"}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Reports Queue on this User */}
        <div className="bg-white border border-[#e2e8f8] rounded-2xl p-6 shadow-level-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#151c27] font-heading flex items-center">
              <ShieldAlert className="w-4 h-4 text-[#ba1a1a] mr-2" />
              Community Reports Involving User
            </h2>
            <span className="text-[11px] font-mono text-[#534434]">
              {reports.against.length} reports against
            </span>
          </div>

          {reports.against.length === 0 ? (
            <div className="p-8 rounded-xl bg-[#f9f9ff] border border-[#e2e8f8] text-center text-xs text-[#534434] space-y-1">
              <CheckCircle2 className="w-6 h-6 text-[#006c49] mx-auto" />
              <p className="text-[#151c27] font-semibold font-heading">Clean Safety Record</p>
              <p>No community reports have been filed against this account.</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {reports.against.map((rep) => (
                <div
                  key={rep.id}
                  className="p-3 rounded-xl bg-[#f9f9ff] border border-[#e2e8f8] text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[#ba1a1a] font-bold uppercase text-[11px]">
                      Reason: {rep.reason}
                    </span>
                    <span className="text-[10px] text-[#534434] font-mono">
                      {new Date(rep.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {rep.description && <p className="text-[#151c27] text-[11px]">{rep.description}</p>}
                  <div className="flex items-center justify-between pt-1 text-[10px] text-[#534434]">
                    <span>Filed by: @{rep.reporter?.username || "anonymous"}</span>
                    <span className="px-1.5 py-0.5 rounded bg-white border border-[#e2e8f8] text-[#534434] font-medium">{rep.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Moderation History Audit Log on this User */}
      <div className="bg-white border border-[#e2e8f8] rounded-2xl p-6 shadow-level-1 space-y-4">
        <h2 className="text-sm font-bold text-[#151c27] font-heading flex items-center">
          <FileText className="w-4 h-4 text-[#006c49] mr-2" />
          Administrative Moderation History
        </h2>

        {moderationHistory.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#534434]">
            No administrative moderation actions recorded yet for this user.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#e2e8f8] text-[#534434] font-bold bg-[#f0f3ff] uppercase font-heading text-[11px]">
                  <th className="px-4 py-2.5">Date & Time</th>
                  <th className="px-4 py-2.5">Admin Actor</th>
                  <th className="px-4 py-2.5">Action</th>
                  <th className="px-4 py-2.5">Recorded Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e2e8f8] font-mono">
                {moderationHistory.map((log) => (
                  <tr key={log.id} className="hover:bg-[#f9f9ff]">
                    <td className="px-4 py-3 text-[#534434] text-[11px] whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-sans font-semibold text-[#151c27]">
                      @{log.admin_user?.username || "system"}
                    </td>
                    <td className="px-4 py-3 font-sans">
                      <StatusBadge type="action" value={log.action} />
                    </td>
                    <td className="px-4 py-3 text-[#151c27] text-[11px] font-sans">
                      {log.details?.reason ? (
                        <span>Reason: {log.details.reason}</span>
                      ) : (
                        <span className="text-[#534434]">{JSON.stringify(log.details)}</span>
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
        <div className="fixed inset-0 bg-[#151c27]/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#e2e8f8] rounded-2xl w-full max-w-md p-6 shadow-level-3 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-[#e2e8f8] pb-3">
              <h2 className="text-base font-bold text-[#151c27] font-heading flex items-center">
                <ShieldAlert className="w-5 h-5 mr-2 text-[#ba1a1a]" />
                Alter Account Status
              </h2>
              <button onClick={() => setShowStatusModal(false)} className="text-[#534434] hover:text-[#151c27]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApplyStatusChange} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-[#534434] mb-1.5">
                  Select Action / Status
                </label>
                <select
                  value={targetStatus}
                  onChange={(e) => setTargetStatus(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-[#f0f3ff] border border-[#dae2f3] text-xs text-[#151c27] focus:outline-none focus:bg-white focus:border-[#0058be]"
                >
                  <option value="ACTIVE">ACTIVE — Restore full platform privileges</option>
                  <option value="SUSPENDED">SUSPENDED — Temporary account restriction</option>
                  <option value="BANNED">BANNED — Permanent account expulsion</option>
                  <option value="DEACTIVATED">DEACTIVATED — Deactivate account</option>
                </select>
              </div>

              {targetStatus === "SUSPENDED" && (
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-[#534434] mb-1.5">
                    Suspension Expiration (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={suspendedUntil}
                    onChange={(e) => setSuspendedUntil(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[#f0f3ff] border border-[#dae2f3] text-xs text-[#151c27] focus:outline-none focus:bg-white focus:border-[#0058be]"
                  />
                  <p className="text-[11px] text-[#534434] mt-1">
                    Leave blank for an indefinite suspension requiring manual admin reinstatement.
                  </p>
                </div>
              )}

              <div>
                <label className="block font-semibold uppercase tracking-wider text-[#534434] mb-1.5">
                  Administrative Justification / Reason <span className="text-[#ba1a1a]">*</span>
                </label>
                <textarea
                  rows={3}
                  required={targetStatus !== "ACTIVE"}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="Mandatory explanation for this moderation action..."
                  className="w-full p-3 rounded-xl bg-[#f0f3ff] border border-[#dae2f3] text-xs text-[#151c27] placeholder-[#534434]/60 focus:outline-none focus:bg-white focus:border-[#0058be]"
                ></textarea>
                <p className="text-[11px] text-[#534434] mt-1">
                  Recorded in the immutable security audit log.
                </p>
              </div>

              <div className="pt-3 border-t border-[#e2e8f8] flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowStatusModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#f0f3ff] hover:bg-[#e2e8f8] text-[#534434] font-medium cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingStatus}
                  className={`px-4 py-2 rounded-xl text-white font-semibold shadow-sm disabled:opacity-50 cursor-pointer ${
                    targetStatus === "BANNED" || targetStatus === "SUSPENDED"
                      ? "bg-[#ba1a1a] hover:bg-[#93000a]"
                      : "bg-[#0058be] hover:bg-[#2170e4]"
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
