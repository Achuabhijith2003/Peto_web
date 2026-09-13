import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ShieldAlert,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
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
      <div className="p-20 text-center text-slate-400 space-y-4">
        <RefreshCw className="w-10 h-10 animate-spin mx-auto text-indigo-400" />
        <p className="text-sm font-medium">Hydrating report and target entity...</p>
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="space-y-4">
        <Link
          to="/moderation"
          className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Moderation Queue
        </Link>
        <div className="p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center space-x-3">
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
          className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Moderation Queue
        </Link>
        <span className="text-xs text-slate-500 font-mono">Report ID: {report.id}</span>
      </div>

      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <span className="px-2.5 py-1 rounded-md text-[10px] font-bold font-mono uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {report.target_type} violation
            </span>
            <span
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold font-mono uppercase ${
                report.priority === "CRITICAL"
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                  : report.priority === "HIGH"
                  ? "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                  : "bg-slate-800 text-slate-300 border border-slate-700"
              }`}
            >
              Priority: {report.priority}
            </span>
            <span
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold font-mono uppercase ${
                report.status === "RESOLVED"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : report.status === "REJECTED"
                  ? "bg-slate-800 text-slate-400 border border-slate-700"
                  : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
              }`}
            >
              Status: {report.status}
            </span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">{report.reason}</h1>
          <p className="text-xs text-slate-400">
            Reported on {new Date(report.created_at).toLocaleString()}
          </p>
        </div>

        {/* Quick Lifecycle Controls */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="flex items-center space-x-2">
            <label className="text-[11px] text-slate-400 font-medium">Status:</label>
            <select
              value={report.status}
              disabled={updatingReport}
              onChange={(e) => handleUpdateStatus(e.target.value as ReportStatus)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="PENDING">Pending</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="ESCALATED">Escalated</option>
              <option value="RESOLVED">Resolved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-[11px] text-slate-400 font-medium">Priority:</label>
            <select
              value={report.priority}
              disabled={updatingReport}
              onChange={(e) => handleUpdatePriority(e.target.value as ReportPriority)}
              className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center uppercase tracking-wider">
                <Eye className="w-4 h-4 mr-2 text-indigo-400" />
                Target Content Preview ({report.target_type})
              </h2>
              <span className="text-[11px] text-slate-500 font-mono">{report.target_id}</span>
            </div>

            {!targetEntity ? (
              <div className="p-8 text-center rounded-xl bg-slate-950/60 border border-dashed border-slate-800 text-slate-400 text-xs">
                <AlertCircle className="w-8 h-8 text-amber-400/70 mx-auto mb-2" />
                Target content with ID <code className="text-indigo-300 font-mono">{report.target_id}</code> was either removed or is unavailable.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Post or Reel Preview */}
                {(report.target_type === "post" || report.target_type === "reel") && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                    {/* Post Author Info */}
                    {targetEntity.author && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {targetEntity.author.avatar_url ? (
                            <img
                              src={targetEntity.author.avatar_url}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover border border-slate-700"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300">
                              {targetEntity.author.username?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-white text-xs">
                              {targetEntity.author.full_name || targetEntity.author.username}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              @{targetEntity.author.username}
                            </div>
                          </div>
                        </div>
                        <Link
                          to={`/users/${targetEntity.user_id}`}
                          className="inline-flex items-center text-xs text-indigo-400 hover:text-indigo-300"
                        >
                          View Author Profile <ExternalLink className="w-3 h-3 ml-1" />
                        </Link>
                      </div>
                    )}

                    {/* Post Text */}
                    {targetEntity.text && (
                      <p className="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
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
                              className="rounded-xl overflow-hidden bg-black/80 max-h-96 flex items-center justify-center border border-slate-800"
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
                    <div className="flex items-center space-x-6 text-[11px] text-slate-400 border-t border-slate-800/80 pt-3">
                      <span>Likes: <strong className="text-white font-mono">{targetEntity.likes_count || 0}</strong></span>
                      <span>Comments: <strong className="text-white font-mono">{targetEntity.comments_count || 0}</strong></span>
                      <span>Visibility: <strong className="text-cyan-400 uppercase font-mono">{targetEntity.visibility}</strong></span>
                      <span>Posted: {new Date(targetEntity.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}

                {/* Comment Preview */}
                {report.target_type === "comment" && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-white text-xs">
                          {targetEntity.author?.full_name || targetEntity.author?.username || "Unknown"}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          @{targetEntity.author?.username}
                        </div>
                      </div>
                    </div>
                    <blockquote className="p-3 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-200 italic">
                      "{targetEntity.comment}"
                    </blockquote>
                    {targetEntity.parentPost && (
                      <div className="text-[11px] text-slate-400 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-slate-500">Parent Post by @{targetEntity.parentPost.author?.username}:</span>{" "}
                        <span className="text-slate-300 line-clamp-1">{targetEntity.parentPost.text}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* User Target Preview */}
                {report.target_type === "user" && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {targetEntity.avatar_url ? (
                          <img
                            src={targetEntity.avatar_url}
                            alt=""
                            className="w-12 h-12 rounded-full object-cover border border-slate-700"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center font-bold text-base text-slate-300">
                            {targetEntity.username?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-bold text-white text-sm">
                            {targetEntity.full_name || targetEntity.username}
                          </div>
                          <div className="text-xs text-slate-400 font-mono">@{targetEntity.username}</div>
                        </div>
                      </div>
                      <Link
                        to={`/users/${targetEntity.id}`}
                        className="inline-flex items-center px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold hover:bg-indigo-600/30"
                      >
                        Inspect Full Profile
                      </Link>
                    </div>
                    {targetEntity.bio && (
                      <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-lg border border-slate-800">
                        {targetEntity.bio}
                      </p>
                    )}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-[10px] text-slate-400">Status</div>
                        <div className="font-bold text-white mt-0.5">{targetEntity.status || "ACTIVE"}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-[10px] text-slate-400">Followers</div>
                        <div className="font-bold text-white mt-0.5">{targetEntity.followersCount || 0}</div>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-[10px] text-slate-400">Posts</div>
                        <div className="font-bold text-white mt-0.5">{targetEntity.postsCount || 0}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Community Target Preview */}
                {report.target_type === "community" && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm">{targetEntity.name}</div>
                        <div className="text-xs text-slate-400 font-mono">c/{targetEntity.slug}</div>
                      </div>
                    </div>
                    {targetEntity.description && (
                      <p className="text-xs text-slate-300 bg-slate-900 p-3 rounded-lg border border-slate-800">
                        {targetEntity.description}
                      </p>
                    )}
                    <div className="flex items-center space-x-4 text-[11px] text-slate-400">
                      <span>Members: <strong className="text-white font-mono">{targetEntity.memberCount || 0}</strong></span>
                      <span>Archived: <strong className="text-white">{targetEntity.is_archived ? "Yes" : "No"}</strong></span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Reporter & Submission Details Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center uppercase tracking-wider border-b border-slate-800 pb-3">
              <User className="w-4 h-4 mr-2 text-cyan-400" />
              Reporter Submission Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center space-x-3">
                {report.reporter.avatar_url ? (
                  <img
                    src={report.reporter.avatar_url}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300">
                    {report.reporter.username?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="font-bold text-white">
                    {report.reporter.full_name || report.reporter.username}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono">@{report.reporter.username}</div>
                  <div className="text-[10px] text-indigo-400 mt-0.5">
                    {report.reporter.verified ? "Verified User" : "Standard Account"}
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">Report Category</div>
                <div className="text-sm font-bold text-amber-300">{report.reason}</div>
                <div className="text-[10px] text-slate-500">
                  Filing Time: {new Date(report.created_at).toLocaleString()}
                </div>
              </div>
            </div>

            {report.description && (
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="text-[10px] text-slate-400 uppercase font-semibold">User Statement / Justification</div>
                <p className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">{report.description}</p>
              </div>
            )}
          </div>

          {/* Moderation History & Audit Trail */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center uppercase tracking-wider border-b border-slate-800 pb-3">
              <Clock className="w-4 h-4 mr-2 text-emerald-400" />
              Moderation Audit History ({moderationHistory.length})
            </h2>

            {moderationHistory.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No previous moderation actions taken on this item.</p>
            ) : (
              <div className="space-y-3">
                {moderationHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between text-xs space-x-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-indigo-300">{item.action}</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400">
                          by <strong className="text-white">@{item.admin_user?.username || "Admin"}</strong>
                        </span>
                      </div>
                      {item.details?.reason && (
                        <p className="text-slate-300 text-[11px]">Reason: {item.details.reason}</p>
                      )}
                      {item.details?.finalStatus && (
                        <span className="inline-block text-[10px] text-emerald-400 font-mono">
                          New Status: {item.details.finalStatus}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 shrink-0 font-mono">
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
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4 sticky top-6">
            <h2 className="text-sm font-bold text-white flex items-center uppercase tracking-wider border-b border-slate-800 pb-3">
              <Shield className="w-4 h-4 mr-2 text-rose-400" />
              Moderator Action Panel
            </h2>

            <p className="text-xs text-slate-400">
              Apply administrative sanctions or resolve this report. Every action requires a justification and is permanently audited.
            </p>

            {/* Action Buttons tailored to target type */}
            <div className="space-y-2 pt-2">
              {/* Content Removal */}
              {(report.target_type === "post" || report.target_type === "reel") && (
                <button
                  onClick={() => setSelectedAction("REMOVE_POST")}
                  disabled={!hasPerm("posts.remove")}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>Delete {report.target_type === "reel" ? "Reel" : "Post"}</span>
                  </div>
                  <span className="text-[10px] font-mono text-rose-400/80">Destructive</span>
                </button>
              )}

              {report.target_type === "comment" && (
                <button
                  onClick={() => setSelectedAction("REMOVE_COMMENT")}
                  disabled={!hasPerm("comments.remove")}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <Trash2 className="w-4 h-4 text-rose-400" />
                    <span>Delete Comment</span>
                  </div>
                  <span className="text-[10px] font-mono text-rose-400/80">Destructive</span>
                </button>
              )}

              {/* Restrict Content */}
              <button
                onClick={() => setSelectedAction("RESTRICT_CONTENT")}
                disabled={!hasPerm("posts.remove")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 hover:bg-amber-500/20 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-amber-400" />
                  <span>Restrict Content (Make Private)</span>
                </div>
              </button>

              {/* Warn User */}
              <button
                onClick={() => setSelectedAction("WARN_USER")}
                disabled={!hasPerm("reports.manage")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/20 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400" />
                  <span>Issue Formal Warning to Author</span>
                </div>
              </button>

              {/* Suspend User */}
              <button
                onClick={() => setSelectedAction("SUSPEND_USER")}
                disabled={!hasPerm("users.suspend")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-orange-500/10 border border-orange-500/30 text-orange-300 hover:bg-orange-500/20 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-orange-400" />
                  <span>Suspend Author Account</span>
                </div>
                <span className="text-[10px] font-mono text-orange-400/80">Temporary</span>
              </button>

              {/* Ban User */}
              <button
                onClick={() => setSelectedAction("BAN_USER")}
                disabled={!hasPerm("users.ban")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 hover:bg-red-500/20 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <Ban className="w-4 h-4 text-red-400" />
                  <span>Permanently Ban Author</span>
                </div>
                <span className="text-[10px] font-mono text-red-400/80">Permanent</span>
              </button>

              <hr className="border-slate-800 my-2" />

              {/* Escalate Report */}
              <button
                onClick={() => setSelectedAction("ESCALATE_REPORT")}
                disabled={!hasPerm("reports.manage")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 hover:bg-purple-500/20 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-purple-400" />
                  <span>Escalate to Senior Admin</span>
                </div>
              </button>

              {/* Reject Report (Dismiss) */}
              <button
                onClick={() => setSelectedAction("REJECT_REPORT")}
                disabled={!hasPerm("reports.manage")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <XCircle className="w-4 h-4 text-slate-400" />
                  <span>Dismiss Report (No Violation)</span>
                </div>
              </button>

              {/* Resolve Report */}
              <button
                onClick={() => setSelectedAction("RESOLVE_REPORT")}
                disabled={!hasPerm("reports.manage")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Mark Report Resolved</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Action Execution Confirmation Modal */}
      {selectedAction && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center">
                <ShieldAlert className="w-5 h-5 mr-2 text-rose-400" />
                Confirm: {selectedAction.replace(/_/g, " ")}
              </h3>
              <button onClick={() => setSelectedAction(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteAction} className="space-y-4 text-xs">
              <p className="text-slate-300">
                You are about to execute <strong>{selectedAction}</strong> for this report. This action will be permanently recorded in the administrative audit logs.
              </p>

              {selectedAction === "SUSPEND_USER" && (
                <div>
                  <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Suspension Duration
                  </label>
                  <select
                    value={durationDays}
                    onChange={(e) => setDurationDays(Number(e.target.value))}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
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
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Administrative Justification Reason <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain the policy violation or rationale for this moderation action..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAction(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingAction}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white transition-colors shadow-lg shadow-rose-600/25 disabled:opacity-50 cursor-pointer"
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
