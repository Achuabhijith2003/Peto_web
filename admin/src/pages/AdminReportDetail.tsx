import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ShieldAlert,
  ArrowLeft,
  Clock,
  CheckCircle2,
  TrendingUp,
  AlertTriangle,
  User,
  MessageSquare,
  Users,
  Shield,
  Trash2,
  Lock,
  Ban,
  AlertCircle,
  Eye,
  RefreshCw,
  X,
  ExternalLink,
} from "lucide-react";
import { fetchReportDetail, updateReportApi, executeModerationActionApi } from "../api/adminApi";
import {
  PetoReportDetail,
  ModerationActionType,
  ReportStatus,
  ReportPriority,
} from "../types/admin";
import { useAdminAuth } from "../context/AdminAuthContext";

export const AdminReportDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { admin } = useAdminAuth();

  const [detail, setDetail] = useState<PetoReportDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Status & Priority Editing State
  const [updatingReport, setUpdatingReport] = useState<boolean>(false);

  // Action Modal State
  const [selectedAction, setSelectedAction] = useState<ModerationActionType | null>(null);
  const [actionReason, setActionReason] = useState<string>("");
  const [durationDays, setDurationDays] = useState<number>(7);
  const [submittingAction, setSubmittingAction] = useState<boolean>(false);

  const permissions = admin?.permissions || [];
  const hasPerm = (perm: string) => permissions.includes(perm) || permissions.includes("*");

  const loadDetail = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const data = await fetchReportDetail(id);
      setDetail(data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to load report detail.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const handleUpdateStatus = async (newStatus: ReportStatus) => {
    if (!id || !detail) return;
    try {
      setUpdatingReport(true);
      setError(null);
      await updateReportApi(id, { status: newStatus });
      setActionSuccess(`Report status updated to ${newStatus}.`);
      loadDetail();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to update report status.");
    } finally {
      setUpdatingReport(false);
    }
  };

  const handleUpdatePriority = async (newPriority: ReportPriority) => {
    if (!id || !detail) return;
    try {
      setUpdatingReport(true);
      setError(null);
      await updateReportApi(id, { priority: newPriority });
      setActionSuccess(`Report priority updated to ${newPriority}.`);
      loadDetail();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to update report priority.");
    } finally {
      setUpdatingReport(false);
    }
  };

  const handleExecuteAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !selectedAction) return;

    if (!actionReason.trim()) {
      setError("A justification reason is required for moderation actions.");
      return;
    }

    try {
      setSubmittingAction(true);
      setError(null);
      await executeModerationActionApi(id, {
        action: selectedAction,
        reason: actionReason.trim(),
        durationDays: selectedAction === "SUSPEND_USER" ? durationDays : undefined,
        overrideResolved: true,
      });

      setActionSuccess(`Moderation action '${selectedAction}' successfully executed.`);
      setSelectedAction(null);
      setActionReason("");
      loadDetail();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to execute moderation action.");
    } finally {
      setSubmittingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="p-20 text-center text-[#534434] space-y-4">
        <RefreshCw className="w-10 h-10 animate-spin mx-auto text-[#0058be]" />
        <p className="text-sm font-medium font-heading">Hydrating report and target entity...</p>
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="space-y-4">
        <Link
          to="/moderation"
          className="inline-flex items-center text-xs font-semibold text-[#534434] hover:text-[#0058be] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Moderation Queue
        </Link>
        <div className="p-6 rounded-2xl bg-[#ffdad6]/40 border border-[#ffdad6] text-[#ba1a1a] text-sm flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  if (!detail) return null;

  const { report, targetEntity, moderationHistory } = detail;

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Alerts */}
      <div className="flex items-center justify-between">
        <Link
          to="/moderation"
          className="inline-flex items-center text-xs font-semibold text-[#534434] hover:text-[#0058be] transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Moderation Queue
        </Link>
        <span className="text-xs text-[#534434]/70 font-mono">Report ID: {report.id}</span>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-[#bbf7d0]/30 border border-[#bbf7d0] text-[#006c49] text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#006c49]" />
            <span className="font-medium">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-[#006c49] hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-[#ffdad6]/40 border border-[#ffdad6] text-[#ba1a1a] text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-[#ba1a1a]" />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-[#ba1a1a] hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-white border border-[#e2e8f8] shadow-level-1 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2.5">
            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase bg-[#f0f3ff] text-[#0058be] border border-[#dae2f3]">
              {report.target_type} violation
            </span>
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase ${
                report.priority === "CRITICAL"
                  ? "bg-[#ffdad6] text-[#ba1a1a] border border-[#ba1a1a]/30"
                  : report.priority === "HIGH"
                  ? "bg-[#ffe082]/40 text-[#855300] border border-[#855300]/30"
                  : "bg-[#f0f3ff] text-[#534434] border border-[#dae2f3]"
              }`}
            >
              Priority: {report.priority}
            </span>
            <span
              className={`px-2.5 py-1 rounded-full text-[10px] font-bold font-mono uppercase ${
                report.status === "RESOLVED"
                  ? "bg-[#bbf7d0]/40 text-[#006c49] border border-[#006c49]/30"
                  : report.status === "REJECTED"
                  ? "bg-[#f0f3ff] text-[#534434] border border-[#dae2f3]"
                  : "bg-[#ffe082]/40 text-[#855300] border border-[#855300]/30"
              }`}
            >
              Status: {report.status}
            </span>
          </div>
          <h1 className="text-xl font-bold font-heading text-[#151c27] tracking-tight">{report.reason}</h1>
          <p className="text-xs text-[#534434]">
            Reported on {new Date(report.created_at).toLocaleString()}
          </p>
        </div>

        {/* Quick Lifecycle Controls */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="flex items-center space-x-2">
            <label className="text-[11px] text-[#534434] font-semibold font-heading">Status:</label>
            <select
              value={report.status}
              disabled={updatingReport}
              onChange={(e) => handleUpdateStatus(e.target.value as ReportStatus)}
              className="bg-[#f0f3ff] border border-[#dae2f3] rounded-xl px-3 py-1.5 text-xs text-[#151c27] focus:outline-none focus:bg-white focus:border-[#0058be]"
            >
              <option value="PENDING">Pending</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="ESCALATED">Escalated</option>
              <option value="RESOLVED">Resolved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-[11px] text-[#534434] font-semibold font-heading">Priority:</label>
            <select
              value={report.priority}
              disabled={updatingReport}
              onChange={(e) => handleUpdatePriority(e.target.value as ReportPriority)}
              className="bg-[#f0f3ff] border border-[#dae2f3] rounded-xl px-3 py-1.5 text-xs text-[#151c27] focus:outline-none focus:bg-white focus:border-[#0058be]"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Grid: Left = Target & Reporter, Right = Action Panel & Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols wide on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Target Content Preview Card */}
          <div className="bg-white border border-[#e2e8f8] rounded-2xl p-6 shadow-level-1 space-y-4">
            <div className="flex items-center justify-between border-b border-[#e2e8f8] pb-3">
              <h2 className="text-sm font-bold font-heading text-[#151c27] flex items-center uppercase tracking-wider">
                <Eye className="w-4 h-4 mr-2 text-[#0058be]" />
                Target Content Preview ({report.target_type})
              </h2>
              <span className="text-[11px] text-[#534434]/70 font-mono">{report.target_id}</span>
            </div>

            {!targetEntity ? (
              <div className="p-8 text-center rounded-xl bg-[#f9f9ff] border border-dashed border-[#dae2f3] text-[#534434] text-xs">
                <AlertCircle className="w-8 h-8 text-[#855300]/70 mx-auto mb-2" />
                Target content with ID <code className="text-[#0058be] font-mono">{report.target_id}</code> was either removed or is unavailable.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Post or Reel Preview */}
                {(report.target_type === "post" || report.target_type === "reel") && (
                  <div className="p-4 rounded-xl bg-[#f9f9ff] border border-[#e2e8f8] space-y-4">
                    {/* Post Author Info */}
                    {targetEntity.author && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {targetEntity.author.avatar_url ? (
                            <img
                              src={targetEntity.author.avatar_url}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover border border-[#e2e8f8]"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-[#f0f3ff] text-[#0058be] flex items-center justify-center font-bold text-sm">
                              {targetEntity.author.username?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-[#151c27] text-xs">
                              {targetEntity.author.full_name || targetEntity.author.username}
                            </div>
                            <div className="text-[11px] text-[#534434] font-mono">
                              @{targetEntity.author.username}
                            </div>
                          </div>
                        </div>
                        <Link
                          to={`/users/${targetEntity.user_id}`}
                          className="inline-flex items-center text-xs font-semibold text-[#0058be] hover:underline"
                        >
                          View Author Profile <ExternalLink className="w-3 h-3 ml-1" />
                        </Link>
                      </div>
                    )}

                    {/* Post Text */}
                    {targetEntity.text && (
                      <p className="text-xs text-[#151c27] whitespace-pre-wrap leading-relaxed bg-white p-3.5 rounded-xl border border-[#e2e8f8]">
                        {targetEntity.text}
                      </p>
                    )}

                    {/* Media Viewer */}
                    {targetEntity.media && targetEntity.media.length > 0 && (
                      <div className="space-y-2">
                        {targetEntity.media.map((m: any) => {
                          const isVideo = m.type === "video" || m.url?.includes(".mp4");
                          return (
                            <div
                              key={m.id || m.url}
                              className="rounded-xl overflow-hidden bg-black/90 max-h-96 flex items-center justify-center border border-[#e2e8f8]"
                            >
                              {isVideo ? (
                                <video
                                  src={m.url}
                                  controls
                                  className="max-h-96 w-full object-contain"
                                />
                              ) : (
                                <img
                                  src={m.url}
                                  alt="Post attachment"
                                  className="max-h-96 w-full object-contain"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Post Stats */}
                    <div className="flex items-center space-x-6 text-[11px] text-[#534434] border-t border-[#e2e8f8] pt-3">
                      <span>Likes: <strong className="text-[#151c27] font-mono">{targetEntity.likes_count || 0}</strong></span>
                      <span>Comments: <strong className="text-[#151c27] font-mono">{targetEntity.comments_count || 0}</strong></span>
                      <span>Visibility: <strong className="text-[#0058be] uppercase font-mono">{targetEntity.visibility}</strong></span>
                      <span>Posted: {new Date(targetEntity.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}

                {/* Comment Preview */}
                {report.target_type === "comment" && (
                  <div className="p-4 rounded-xl bg-[#f9f9ff] border border-[#e2e8f8] space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-[#ffe082]/40 text-[#855300] flex items-center justify-center font-bold text-xs">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-[#151c27] text-xs">
                          {targetEntity.author?.full_name || targetEntity.author?.username || "Unknown"}
                        </div>
                        <div className="text-[11px] text-[#534434] font-mono">
                          @{targetEntity.author?.username}
                        </div>
                      </div>
                    </div>
                    <blockquote className="p-3.5 rounded-xl bg-white border border-[#e2e8f8] text-xs text-[#151c27] italic">
                      "{targetEntity.comment}"
                    </blockquote>
                    {targetEntity.parentPost && (
                      <div className="text-[11px] text-[#534434] bg-white p-2.5 rounded-xl border border-[#e2e8f8]">
                        <span className="text-[#534434]/70">Parent Post by @{targetEntity.parentPost.author?.username}:</span>{" "}
                        <span className="text-[#151c27] line-clamp-1">{targetEntity.parentPost.text}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* User Target Preview */}
                {report.target_type === "user" && (
                  <div className="p-4 rounded-xl bg-[#f9f9ff] border border-[#e2e8f8] space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {targetEntity.avatar_url ? (
                          <img
                            src={targetEntity.avatar_url}
                            alt=""
                            className="w-12 h-12 rounded-full object-cover border border-[#e2e8f8]"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-[#f0f3ff] text-[#0058be] flex items-center justify-center font-bold text-base">
                            {targetEntity.username?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-bold font-heading text-[#151c27] text-sm">
                            {targetEntity.full_name || targetEntity.username}
                          </div>
                          <div className="text-xs text-[#534434] font-mono">@{targetEntity.username}</div>
                        </div>
                      </div>
                      <Link
                        to={`/users/${targetEntity.id}`}
                        className="inline-flex items-center px-3.5 py-1.5 rounded-xl bg-[#0058be] text-white text-xs font-semibold hover:bg-[#2170e4] transition-colors shadow-sm"
                      >
                        Inspect Full Profile
                      </Link>
                    </div>
                    {targetEntity.bio && (
                      <p className="text-xs text-[#151c27] bg-white p-3.5 rounded-xl border border-[#e2e8f8]">
                        {targetEntity.bio}
                      </p>
                    )}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2.5 rounded-xl bg-white border border-[#e2e8f8]">
                        <div className="text-[10px] text-[#534434]">Status</div>
                        <div className="font-bold text-[#151c27] mt-0.5">{targetEntity.status || "ACTIVE"}</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white border border-[#e2e8f8]">
                        <div className="text-[10px] text-[#534434]">Followers</div>
                        <div className="font-bold text-[#151c27] mt-0.5">{targetEntity.followersCount || 0}</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white border border-[#e2e8f8]">
                        <div className="text-[10px] text-[#534434]">Posts</div>
                        <div className="font-bold text-[#151c27] mt-0.5">{targetEntity.postsCount || 0}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Community Target Preview */}
                {report.target_type === "community" && (
                  <div className="p-4 rounded-xl bg-[#f9f9ff] border border-[#e2e8f8] space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-[#f0f3ff] text-[#0058be] flex items-center justify-center font-bold">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold font-heading text-[#151c27] text-sm">{targetEntity.name}</div>
                        <div className="text-xs text-[#534434] font-mono">c/{targetEntity.slug}</div>
                      </div>
                    </div>
                    {targetEntity.description && (
                      <p className="text-xs text-[#151c27] bg-white p-3.5 rounded-xl border border-[#e2e8f8]">
                        {targetEntity.description}
                      </p>
                    )}
                    <div className="flex items-center space-x-4 text-[11px] text-[#534434]">
                      <span>Members: <strong className="text-[#151c27] font-mono">{targetEntity.memberCount || 0}</strong></span>
                      <span>Archived: <strong className="text-[#151c27]">{targetEntity.is_archived ? "Yes" : "No"}</strong></span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reporter & Submission Details Card */}
          <div className="bg-white border border-[#e2e8f8] rounded-2xl p-6 shadow-level-1 space-y-4">
            <h2 className="text-sm font-bold font-heading text-[#151c27] flex items-center uppercase tracking-wider border-b border-[#e2e8f8] pb-3">
              <User className="w-4 h-4 mr-2 text-[#0058be]" />
              Reporter Submission Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-[#f9f9ff] border border-[#e2e8f8] flex items-center space-x-3">
                {report.reporter.avatar_url ? (
                  <img
                    src={report.reporter.avatar_url}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover border border-[#e2e8f8]"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-[#f0f3ff] text-[#0058be] flex items-center justify-center font-bold text-sm">
                    {report.reporter.username?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="font-bold text-[#151c27]">
                    {report.reporter.full_name || report.reporter.username}
                  </div>
                  <div className="text-[11px] text-[#534434] font-mono">@{report.reporter.username}</div>
                  <div className="text-[10px] text-[#0058be] font-medium mt-0.5">
                    {report.reporter.verified ? "Verified User" : "Standard Account"}
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#f9f9ff] border border-[#e2e8f8] space-y-1">
                <div className="text-[10px] text-[#534434] uppercase font-semibold">Report Category</div>
                <div className="text-sm font-bold text-[#855300]">{report.reason}</div>
                <div className="text-[10px] text-[#534434]/70">
                  Filing Time: {new Date(report.created_at).toLocaleString()}
                </div>
              </div>
            </div>

            {report.description && (
              <div className="p-3.5 rounded-xl bg-[#f9f9ff] border border-[#e2e8f8] space-y-1.5">
                <div className="text-[10px] text-[#534434] uppercase font-semibold">User Statement / Justification</div>
                <p className="text-xs text-[#151c27] whitespace-pre-wrap leading-relaxed">{report.description}</p>
              </div>
            )}
          </div>

          {/* Moderation History & Audit Trail */}
          <div className="bg-white border border-[#e2e8f8] rounded-2xl p-6 shadow-level-1 space-y-4">
            <h2 className="text-sm font-bold font-heading text-[#151c27] flex items-center uppercase tracking-wider border-b border-[#e2e8f8] pb-3">
              <Clock className="w-4 h-4 mr-2 text-[#006c49]" />
              Moderation Audit History ({moderationHistory.length})
            </h2>

            {moderationHistory.length === 0 ? (
              <p className="text-xs text-[#534434] italic">No previous moderation actions taken on this item.</p>
            ) : (
              <div className="space-y-3">
                {moderationHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-[#f9f9ff] border border-[#e2e8f8] flex items-start justify-between text-xs space-x-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-[#0058be]">{item.action}</span>
                        <span className="text-[#dae2f3]">•</span>
                        <span className="text-[#534434]">
                          by <strong className="text-[#151c27]">@{item.admin_user?.username || "Admin"}</strong>
                        </span>
                      </div>
                      {item.details?.reason && (
                        <p className="text-[#151c27] text-[11px]">Reason: {item.details.reason}</p>
                      )}
                      {item.details?.finalStatus && (
                        <span className="inline-block text-[10px] text-[#006c49] font-mono font-medium">
                          New Status: {item.details.finalStatus}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#534434]/70 shrink-0 font-mono">
                      {new Date(item.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Moderation Action Panel */}
        <div className="space-y-6">
          <div className="bg-white border border-[#e2e8f8] rounded-2xl p-6 shadow-level-1 space-y-4 sticky top-6">
            <h2 className="text-sm font-bold font-heading text-[#151c27] flex items-center uppercase tracking-wider border-b border-[#e2e8f8] pb-3">
              <Shield className="w-4 h-4 mr-2 text-[#ba1a1a]" />
              Moderator Action Panel
            </h2>

            <p className="text-xs text-[#534434]">
              Apply administrative sanctions or resolve this report. Every action requires a justification and is permanently audited.
            </p>

            {/* Action Buttons tailored to target type */}
            <div className="space-y-2 pt-2">
              {/* Content Removal */}
              {(report.target_type === "post" || report.target_type === "reel") && (
                <button
                  onClick={() => setSelectedAction("REMOVE_POST")}
                  disabled={!hasPerm("posts.remove")}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-[#ffdad6]/30 border border-[#ffdad6] text-[#ba1a1a] hover:bg-[#ffdad6]/60 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <Trash2 className="w-4 h-4 text-[#ba1a1a]" />
                    <span>Delete {report.target_type === "reel" ? "Reel" : "Post"}</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#ba1a1a]/80">Destructive</span>
                </button>
              )}

              {report.target_type === "comment" && (
                <button
                  onClick={() => setSelectedAction("REMOVE_COMMENT")}
                  disabled={!hasPerm("comments.remove")}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-[#ffdad6]/30 border border-[#ffdad6] text-[#ba1a1a] hover:bg-[#ffdad6]/60 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <Trash2 className="w-4 h-4 text-[#ba1a1a]" />
                    <span>Delete Comment</span>
                  </div>
                  <span className="text-[10px] font-mono text-[#ba1a1a]/80">Destructive</span>
                </button>
              )}

              {/* Restrict Content */}
              <button
                onClick={() => setSelectedAction("RESTRICT_CONTENT")}
                disabled={!hasPerm("posts.remove")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#ffe082]/20 border border-[#ffe082]/50 text-[#855300] hover:bg-[#ffe082]/40 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-[#855300]" />
                  <span>Restrict Content (Make Private)</span>
                </div>
              </button>

              {/* Warn User */}
              <button
                onClick={() => setSelectedAction("WARN_USER")}
                disabled={!hasPerm("reports.manage")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#ffe082]/20 border border-[#ffe082]/50 text-[#855300] hover:bg-[#ffe082]/40 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-[#855300]" />
                  <span>Issue Formal Warning to Author</span>
                </div>
              </button>

              {/* Suspend User */}
              <button
                onClick={() => setSelectedAction("SUSPEND_USER")}
                disabled={!hasPerm("users.suspend")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#ffe082]/30 border border-[#ffe082]/60 text-[#855300] hover:bg-[#ffe082]/50 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-[#855300]" />
                  <span>Suspend Author Account</span>
                </div>
                <span className="text-[10px] font-mono text-[#855300]/80">Temporary</span>
              </button>

              {/* Ban User */}
              <button
                onClick={() => setSelectedAction("BAN_USER")}
                disabled={!hasPerm("users.ban")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#ffdad6]/40 border border-[#ffdad6] text-[#ba1a1a] hover:bg-[#ffdad6]/70 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <Ban className="w-4 h-4 text-[#ba1a1a]" />
                  <span>Permanently Ban Author</span>
                </div>
                <span className="text-[10px] font-mono text-[#ba1a1a]/80">Permanent</span>
              </button>

              <hr className="border-[#e2e8f8] my-2" />

              {/* Escalate Report */}
              <button
                onClick={() => setSelectedAction("ESCALATE_REPORT")}
                disabled={!hasPerm("reports.manage")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#f0f3ff] border border-[#dae2f3] text-[#0058be] hover:bg-[#e7eefe] text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-[#0058be]" />
                  <span>Escalate to Senior Admin</span>
                </div>
              </button>

              {/* Reject Report (Dismiss) */}
              <button
                onClick={() => setSelectedAction("REJECT_REPORT")}
                disabled={!hasPerm("reports.manage")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#f0f3ff] border border-[#dae2f3] text-[#534434] hover:bg-[#e2e8f8] text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#534434]" />
                  <span>Dismiss Report (No Violation)</span>
                </div>
              </button>

              {/* Resolve Report */}
              <button
                onClick={() => setSelectedAction("RESOLVE_REPORT")}
                disabled={!hasPerm("reports.manage")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-[#bbf7d0]/30 border border-[#bbf7d0] text-[#006c49] hover:bg-[#bbf7d0]/60 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-[#006c49]" />
                  <span>Mark Report Resolved</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Execution Confirmation Modal */}
      {selectedAction && (
        <div className="fixed inset-0 bg-[#151c27]/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#e2e8f8] rounded-2xl w-full max-w-md p-6 shadow-level-3 space-y-4">
            <div className="flex items-center justify-between border-b border-[#e2e8f8] pb-3">
              <h3 className="text-base font-bold font-heading text-[#151c27] flex items-center">
                <ShieldAlert className="w-5 h-5 mr-2 text-[#ba1a1a]" />
                Confirm: {selectedAction.replace(/_/g, " ")}
              </h3>
              <button onClick={() => setSelectedAction(null)} className="text-[#534434] hover:text-[#151c27]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteAction} className="space-y-4 text-xs">
              <p className="text-[#534434]">
                You are about to execute <strong className="text-[#151c27]">{selectedAction}</strong> for this report. This action will be permanently recorded in the administrative audit logs.
              </p>

              {selectedAction === "SUSPEND_USER" && (
                <div>
                  <label className="block text-[11px] font-semibold font-heading uppercase tracking-wider text-[#534434] mb-1.5">
                    Suspension Duration
                  </label>
                  <select
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    className="w-full p-2.5 bg-[#f0f3ff] border border-[#dae2f3] rounded-xl text-xs text-[#151c27] focus:outline-none focus:bg-white focus:border-[#0058be]"
                  >
                    <option value={1}>1 Day (24 Hours)</option>
                    <option value={3}>3 Days</option>
                    <option value={7}>7 Days (1 Week)</option>
                    <option value={14}>14 Days (2 Weeks)</option>
                    <option value={30}>30 Days (1 Month)</option>
                    <option value={90}>90 Days</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold font-heading uppercase tracking-wider text-[#534434] mb-1.5">
                  Administrative Justification Reason <span className="text-[#ba1a1a]">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain the policy violation or rationale for this moderation action..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="w-full p-3 bg-[#f0f3ff] border border-[#dae2f3] rounded-xl text-xs text-[#151c27] placeholder-[#534434]/60 focus:outline-none focus:bg-white focus:border-[#0058be]"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAction(null)}
                  className="px-4 py-2 rounded-xl bg-[#f0f3ff] hover:bg-[#e2e8f8] text-xs font-semibold text-[#534434] transition-colors cursor-pointer border border-[#dae2f3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-4 py-2 rounded-xl bg-[#ba1a1a] hover:bg-[#93000a] text-xs font-semibold text-white transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {submittingAction ? "Executing Action..." : "Confirm & Execute Action"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
