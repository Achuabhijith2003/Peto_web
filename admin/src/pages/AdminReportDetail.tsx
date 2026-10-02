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
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";

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
      <div className="p-20 text-center text-muted-foreground space-y-4">
        <RefreshCw className="w-10 h-10 animate-spin mx-auto text-primary" />
        <p className="text-sm font-medium font-heading">Hydrating report and target entity...</p>
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" render={<Link to="/moderation" />}>
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Moderation Queue
        </Button>
        <Card className="p-6 bg-destructive/10 border-destructive/20 text-destructive text-sm flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </Card>
      </div>
    );
  }

  if (!detail) return null;

  const { report, targetEntity, moderationHistory } = detail;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title={report.reason}
        description={`Reported on ${new Date(report.created_at).toLocaleString()} • Report ID: ${report.id}`}
        breadcrumbs={[
          { label: "Trust & Safety", href: "/moderation" },
          { label: "Moderation Queue", href: "/moderation" },
          { label: `Case #${report.id.slice(0, 8)}` },
        ]}
        actions={
          <Button variant="outline" size="sm" render={<Link to="/moderation" />}>
            <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Queue
          </Button>
        }
      />

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-medium">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={() => setError(null)} className="hover:opacity-70">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Status & Priority Overview Card */}
      <Card className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-primary/10 text-primary border border-primary/20">
              {report.target_type} violation
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase ${
                report.priority === "CRITICAL"
                  ? "bg-destructive/15 text-destructive border border-destructive/30"
                  : report.priority === "HIGH"
                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                  : "bg-muted text-muted-foreground border border-border"
              }`}
            >
              Priority: {report.priority}
            </span>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase ${
                report.status === "RESOLVED"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : report.status === "REJECTED"
                  ? "bg-muted text-muted-foreground border border-border"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
              }`}
            >
              Status: {report.status}
            </span>
          </div>
          <h1 className="text-xl font-bold font-heading text-foreground tracking-tight">{report.reason}</h1>
        </div>

        {/* Quick Lifecycle Controls */}
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <div className="flex items-center space-x-2">
            <label className="text-[11px] text-muted-foreground font-semibold font-heading">Status:</label>
            <select
              value={report.status}
              disabled={updatingReport}
              onChange={(e) => handleUpdateStatus(e.target.value as ReportStatus)}
              className="bg-background border border-input rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="PENDING">Pending</option>
              <option value="UNDER_REVIEW">Under Review</option>
              <option value="ESCALATED">Escalated</option>
              <option value="RESOLVED">Resolved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <label className="text-[11px] text-muted-foreground font-semibold font-heading">Priority:</label>
            <select
              value={report.priority}
              disabled={updatingReport}
              onChange={(e) => handleUpdatePriority(e.target.value as ReportPriority)}
              className="bg-background border border-input rounded-xl px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Main Grid: Left = Target & Reporter, Right = Action Panel & Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols wide on desktop) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Target Content Preview Card */}
          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-sm font-bold font-heading text-foreground flex items-center uppercase tracking-wider">
                <Eye className="w-4 h-4 mr-2 text-primary" />
                Target Content Preview ({report.target_type})
              </h2>
              <span className="text-[11px] text-muted-foreground font-mono">{report.target_id}</span>
            </div>

            {!targetEntity ? (
              <div className="p-8 text-center rounded-xl bg-muted/30 border border-dashed border-border text-muted-foreground text-xs">
                <AlertCircle className="w-8 h-8 text-amber-500/70 mx-auto mb-2" />
                Target content with ID <code className="text-primary font-mono">{report.target_id}</code> was either removed or is unavailable.
              </div>
            ) : (
              <div className="space-y-4">
                {/* Post or Reel Preview */}
                {(report.target_type === "post" || report.target_type === "reel") && (
                  <div className="p-4 rounded-xl bg-muted/20 border border-border space-y-4">
                    {/* Post Author Info */}
                    {targetEntity.author && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {targetEntity.author.avatar_url ? (
                            <img
                              src={targetEntity.author.avatar_url}
                              alt=""
                              className="w-10 h-10 rounded-full object-cover border border-border"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                              {targetEntity.author.username?.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-semibold text-foreground text-xs">
                              {targetEntity.author.full_name || targetEntity.author.username}
                            </div>
                            <div className="text-[11px] text-muted-foreground font-mono">
                              @{targetEntity.author.username}
                            </div>
                          </div>
                        </div>
                        <Link
                          to={`/users/${targetEntity.user_id}`}
                          className="inline-flex items-center text-xs font-semibold text-primary hover:underline"
                        >
                          View Author Profile <ExternalLink className="w-3 h-3 ml-1" />
                        </Link>
                      </div>
                    )}

                    {/* Post Text */}
                    {targetEntity.text && (
                      <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed bg-card p-3.5 rounded-xl border border-border">
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
                              className="rounded-xl overflow-hidden bg-black/90 max-h-96 flex items-center justify-center border border-border"
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
                    <div className="flex items-center space-x-6 text-[11px] text-muted-foreground border-t border-border pt-3">
                      <span>Likes: <strong className="text-foreground font-mono">{targetEntity.likes_count || 0}</strong></span>
                      <span>Comments: <strong className="text-foreground font-mono">{targetEntity.comments_count || 0}</strong></span>
                      <span>Visibility: <strong className="text-primary uppercase font-mono">{targetEntity.visibility}</strong></span>
                      <span>Posted: {new Date(targetEntity.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}

                {/* Comment Preview */}
                {report.target_type === "comment" && (
                  <div className="p-4 rounded-xl bg-muted/20 border border-border space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-xs">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-semibold text-foreground text-xs">
                          {targetEntity.author?.full_name || targetEntity.author?.username || "Unknown"}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono">
                          @{targetEntity.author?.username}
                        </div>
                      </div>
                    </div>
                    <blockquote className="p-3.5 rounded-xl bg-card border border-border text-xs text-foreground italic">
                      "{targetEntity.comment}"
                    </blockquote>
                    {targetEntity.parentPost && (
                      <div className="text-[11px] text-muted-foreground bg-card p-2.5 rounded-xl border border-border">
                        <span className="text-muted-foreground/70">Parent Post by @{targetEntity.parentPost.author?.username}:</span>{" "}
                        <span className="text-foreground line-clamp-1">{targetEntity.parentPost.text}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* User Target Preview */}
                {report.target_type === "user" && (
                  <div className="p-4 rounded-xl bg-muted/20 border border-border space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {targetEntity.avatar_url ? (
                          <img
                            src={targetEntity.avatar_url}
                            alt=""
                            className="w-12 h-12 rounded-full object-cover border border-border"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-base">
                            {targetEntity.username?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div className="font-bold font-heading text-foreground text-sm">
                            {targetEntity.full_name || targetEntity.username}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">@{targetEntity.username}</div>
                        </div>
                      </div>
                      <Button size="sm" render={<Link to={`/users/${targetEntity.id}`} />}>
                        Inspect Profile
                      </Button>
                    </div>
                    {targetEntity.bio && (
                      <p className="text-xs text-foreground bg-card p-3.5 rounded-xl border border-border">
                        {targetEntity.bio}
                      </p>
                    )}
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2.5 rounded-xl bg-card border border-border">
                        <div className="text-[10px] text-muted-foreground">Status</div>
                        <div className="font-bold text-foreground mt-0.5">{targetEntity.status || "ACTIVE"}</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-card border border-border">
                        <div className="text-[10px] text-muted-foreground">Followers</div>
                        <div className="font-bold text-foreground mt-0.5">{targetEntity.followersCount || 0}</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-card border border-border">
                        <div className="text-[10px] text-muted-foreground">Posts</div>
                        <div className="font-bold text-foreground mt-0.5">{targetEntity.postsCount || 0}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Community Target Preview */}
                {report.target_type === "community" && (
                  <div className="p-4 rounded-xl bg-muted/20 border border-border space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        <Users className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold font-heading text-foreground text-sm">{targetEntity.name}</div>
                        <div className="text-xs text-muted-foreground font-mono">c/{targetEntity.slug}</div>
                      </div>
                    </div>
                    {targetEntity.description && (
                      <p className="text-xs text-foreground bg-card p-3.5 rounded-xl border border-border">
                        {targetEntity.description}
                      </p>
                    )}
                    <div className="flex items-center space-x-4 text-[11px] text-muted-foreground">
                      <span>Members: <strong className="text-foreground font-mono">{targetEntity.memberCount || 0}</strong></span>
                      <span>Archived: <strong className="text-foreground">{targetEntity.is_archived ? "Yes" : "No"}</strong></span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Reporter & Submission Details Card */}
          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-bold font-heading text-foreground flex items-center uppercase tracking-wider border-b border-border pb-3">
              <User className="w-4 h-4 mr-2 text-primary" />
              Reporter Submission Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-xl bg-muted/20 border border-border flex items-center space-x-3">
                {report.reporter.avatar_url ? (
                  <img
                    src={report.reporter.avatar_url}
                    alt=""
                    className="w-10 h-10 rounded-full object-cover border border-border"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    {report.reporter.username?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="font-bold text-foreground">
                    {report.reporter.full_name || report.reporter.username}
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono">@{report.reporter.username}</div>
                  <div className="text-[10px] text-primary font-medium mt-0.5">
                    {report.reporter.verified ? "Verified User" : "Standard Account"}
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-muted/20 border border-border space-y-1">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">Report Category</div>
                <div className="text-sm font-bold text-amber-600 dark:text-amber-400">{report.reason}</div>
                <div className="text-[10px] text-muted-foreground/70">
                  Filing Time: {new Date(report.created_at).toLocaleString()}
                </div>
              </div>
            </div>

            {report.description && (
              <div className="p-3.5 rounded-xl bg-muted/20 border border-border space-y-1.5">
                <div className="text-[10px] text-muted-foreground uppercase font-semibold">User Statement / Justification</div>
                <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">{report.description}</p>
              </div>
            )}
          </Card>

          {/* Moderation History & Audit Trail */}
          <Card className="p-6 space-y-4">
            <h2 className="text-sm font-bold font-heading text-foreground flex items-center uppercase tracking-wider border-b border-border pb-3">
              <Clock className="w-4 h-4 mr-2 text-emerald-500" />
              Moderation Audit History ({moderationHistory.length})
            </h2>

            {moderationHistory.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No previous moderation actions taken on this item.</p>
            ) : (
              <div className="space-y-3">
                {moderationHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl bg-muted/20 border border-border flex items-start justify-between text-xs space-x-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-primary">{item.action}</span>
                        <span className="text-muted-foreground/40">•</span>
                        <span className="text-muted-foreground">
                          by <strong className="text-foreground">@{item.admin_user?.username || "Admin"}</strong>
                        </span>
                      </div>
                      {item.details?.reason && (
                        <p className="text-foreground text-[11px]">Reason: {item.details.reason}</p>
                      )}
                      {item.details?.finalStatus && (
                        <span className="inline-block text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-medium">
                          New Status: {item.details.finalStatus}
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-muted-foreground shrink-0 font-mono">
                      {new Date(item.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Right Column: Moderation Action Panel */}
        <div className="space-y-6">
          <Card className="p-6 space-y-4 sticky top-6">
            <h2 className="text-sm font-bold font-heading text-foreground flex items-center uppercase tracking-wider border-b border-border pb-3">
              <Shield className="w-4 h-4 mr-2 text-destructive" />
              Moderator Action Panel
            </h2>

            <p className="text-xs text-muted-foreground">
              Apply administrative sanctions or resolve this report. Every action requires a justification and is permanently audited.
            </p>

            {/* Action Buttons tailored to target type */}
            <div className="space-y-2 pt-2">
              {/* Content Removal */}
              {(report.target_type === "post" || report.target_type === "reel") && (
                <button
                  onClick={() => setSelectedAction("REMOVE_POST")}
                  disabled={!hasPerm("posts.remove")}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <Trash2 className="w-4 h-4 text-destructive" />
                    <span>Delete {report.target_type === "reel" ? "Reel" : "Post"}</span>
                  </div>
                  <span className="text-[10px] font-mono text-destructive/80">Destructive</span>
                </button>
              )}

              {report.target_type === "comment" && (
                <button
                  onClick={() => setSelectedAction("REMOVE_COMMENT")}
                  disabled={!hasPerm("comments.remove")}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive hover:bg-destructive/20 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  <div className="flex items-center space-x-2">
                    <Trash2 className="w-4 h-4 text-destructive" />
                    <span>Delete Comment</span>
                  </div>
                  <span className="text-[10px] font-mono text-destructive/80">Destructive</span>
                </button>
              )}

              {/* Restrict Content */}
              <button
                onClick={() => setSelectedAction("RESTRICT_CONTENT")}
                disabled={!hasPerm("posts.remove")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <Lock className="w-4 h-4 text-amber-500" />
                  <span>Restrict Content (Make Private)</span>
                </div>
              </button>

              {/* Warn User */}
              <button
                onClick={() => setSelectedAction("WARN_USER")}
                disabled={!hasPerm("reports.manage")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-500" />
                  <span>Issue Formal Warning to Author</span>
                </div>
              </button>

              {/* Suspend User */}
              <button
                onClick={() => setSelectedAction("SUSPEND_USER")}
                disabled={!hasPerm("users.suspend")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/25 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span>Suspend Author Account</span>
                </div>
                <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400">Temporary</span>
              </button>

              {/* Ban User */}
              <button
                onClick={() => setSelectedAction("BAN_USER")}
                disabled={!hasPerm("users.ban")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-destructive/15 border border-destructive/30 text-destructive hover:bg-destructive/25 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <Ban className="w-4 h-4 text-destructive" />
                  <span>Permanently Ban Author</span>
                </div>
                <span className="text-[10px] font-mono text-destructive">Permanent</span>
              </button>

              <hr className="border-border my-2" />

              {/* Escalate Report */}
              <button
                onClick={() => setSelectedAction("ESCALATE_REPORT")}
                disabled={!hasPerm("reports.manage")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-primary" />
                  <span>Escalate to Senior Admin</span>
                </div>
              </button>

              {/* Reject Report (Dismiss) */}
              <button
                onClick={() => setSelectedAction("REJECT_REPORT")}
                disabled={!hasPerm("reports.manage")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-muted border border-border text-muted-foreground hover:text-foreground text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Dismiss Report (No Violation)</span>
                </div>
              </button>

              {/* Resolve Report */}
              <button
                onClick={() => setSelectedAction("RESOLVE_REPORT")}
                disabled={!hasPerm("reports.manage")}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Mark Report Resolved</span>
                </div>
              </button>
            </div>
          </Card>
        </div>
      </div>

      {/* Action Execution Confirmation Modal */}
      <Dialog open={selectedAction !== null} onOpenChange={(open) => !open && setSelectedAction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-base">
              <ShieldAlert className="w-5 h-5 mr-2 text-destructive" />
              Confirm: {selectedAction?.replace(/_/g, " ")}
            </DialogTitle>
            <DialogDescription className="text-xs">
              You are about to execute <strong>{selectedAction}</strong> for this report. This action will be permanently recorded in the administrative audit logs.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleExecuteAction} className="space-y-4 text-xs">
            {selectedAction === "SUSPEND_USER" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Suspension Duration</Label>
                <select
                  value={durationDays}
                  onChange={(e) => setDurationDays(Number(e.target.value))}
                  className="w-full p-2.5 bg-background border border-input rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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

            <div className="space-y-1.5">
              <Label className="text-xs">
                Administrative Justification Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                rows={3}
                required
                placeholder="Explain the policy violation or rationale for this moderation action..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setSelectedAction(null)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="destructive"
                size="sm"
                disabled={submittingAction}
              >
                {submittingAction ? "Executing Action..." : "Confirm & Execute Action"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
