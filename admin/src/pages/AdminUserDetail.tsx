import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";
import { fetchUserDetail, updateUserStatus } from "../api/adminApi";
import { PetoUserDetail } from "../types/admin";
import { StatusBadge } from "../components/ui/StatusBadge";
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Input } from "../components/ui/input";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Skeleton } from "../components/ui/skeleton";
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
  Activity,
  Users,
  Film,
  MessageSquare,
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
    return (
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <Skeleton className="h-4 w-32" />
        </div>
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-20 w-20 rounded-2xl" />
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 w-full rounded-xl" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !userDetail) {
    return (
      <Card className="max-w-xl mx-auto text-center p-12 space-y-4">
        <AlertTriangle className="w-10 h-10 text-destructive mx-auto" />
        <h2 className="text-xl font-bold text-foreground">User Not Found</h2>
        <p className="text-xs text-muted-foreground">{error || "The requested user account does not exist."}</p>
        <div className="pt-2">
          <Button variant="default" size="sm" render={<Link to="/users" />}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Users Directory
          </Button>
        </div>
      </Card>
    );
  }

  const { profile, auth, metrics, adminRole, reports, moderationHistory } = userDetail;

  return (
    <div className="space-y-6">
      <PageHeader
        title={profile.full_name || profile.username}
        description={`Identity: @${profile.username} • Account ID: ${profile.id}`}
        breadcrumbs={[
          { label: "Management", href: "/users" },
          { label: "Users", href: "/users" },
          { label: profile.username },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" render={<Link to="/users" />}>
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Directory
            </Button>
            <Button
              variant="secondary"
              size="sm"
              render={<Link to={`/verifications?search=${encodeURIComponent(profile.username || profile.full_name || profile.id)}`} />}
            >
              <BadgeCheck className="w-4 h-4 mr-1.5 text-primary" />
              Verification Record
            </Button>
            {(canSuspend || canBan) && (
              <Button
                variant={profile.status === "ACTIVE" ? "destructive" : "default"}
                size="sm"
                onClick={() => setShowStatusModal(true)}
              >
                <ShieldAlert className="w-4 h-4 mr-1.5" />
                {profile.status === "ACTIVE" ? "Restrict Account" : "Reactivate Account"}
              </Button>
            )}
          </div>
        }
      />

      {/* Success Banner */}
      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-medium">{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="hover:opacity-80">
            ×
          </button>
        </div>
      )}

      {/* Profile Overview Card */}
      <Card>
        <CardContent className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/80 to-primary text-primary-foreground flex items-center justify-center font-bold text-2xl shrink-0 overflow-hidden shadow-xs">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.username} className="w-full h-full object-cover" />
                ) : (
                  profile.full_name?.charAt(0).toUpperCase() || profile.username.charAt(0).toUpperCase()
                )}
              </div>
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-foreground font-heading">{profile.full_name || profile.username}</h1>
                  <StatusBadge type="verification" value={profile.verified} />
                  <StatusBadge type="status" value={profile.status} />
                  {adminRole && (
                    <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      Admin ({adminRole.roleName})
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground font-mono">@{profile.username}</p>
                {profile.bio && <p className="text-xs text-muted-foreground max-w-xl pt-0.5">{profile.bio}</p>}
              </div>
            </div>
          </div>

          {/* Suspension Banner if Restricted */}
          {profile.status !== "ACTIVE" && (
            <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs space-y-1.5">
              <div className="flex items-center font-bold font-heading">
                <AlertTriangle className="w-4 h-4 mr-2 shrink-0" />
                Account Status: {profile.status}
              </div>
              {profile.status_reason && (
                <p className="text-foreground text-[11px]">
                  <strong>Administrative Reason:</strong> {profile.status_reason}
                </p>
              )}
              {profile.suspended_until && (
                <p className="text-muted-foreground text-[11px] font-mono">
                  Suspended until: {new Date(profile.suspended_until).toLocaleString()}
                </p>
              )}
            </div>
          )}

          {/* Engagement KPI Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
            <div className="p-4 rounded-xl bg-muted/40 border border-border text-center">
              <span className="text-[11px] text-muted-foreground uppercase font-semibold font-heading">Followers</span>
              <p className="text-xl font-bold text-foreground mt-1 font-heading">{metrics.followersCount.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/40 border border-border text-center">
              <span className="text-[11px] text-muted-foreground uppercase font-semibold font-heading">Following</span>
              <p className="text-xl font-bold text-foreground mt-1 font-heading">{metrics.followingCount.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/40 border border-border text-center">
              <span className="text-[11px] text-muted-foreground uppercase font-semibold font-heading">Feed Posts</span>
              <p className="text-xl font-bold text-foreground mt-1 font-heading">{metrics.postsCount.toLocaleString()}</p>
            </div>
            <div className="p-4 rounded-xl bg-muted/40 border border-border text-center">
              <span className="text-[11px] text-muted-foreground uppercase font-semibold font-heading">Video Reels</span>
              <p className="text-xl font-bold text-primary mt-1 font-heading">{metrics.reelsCount.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Grid: Account Info & Reports */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Account Profile & Contact */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center">
              <UserCheck className="w-4 h-4 text-primary mr-2" />
              Account Details & Contact
            </CardTitle>
            <CardDescription className="text-xs">Direct contact details and account metadata.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-xs divide-y divide-border">
            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground flex items-center">
                <Mail className="w-3.5 h-3.5 mr-2 opacity-70" />
                Auth Email
              </span>
              <span className="text-foreground font-mono font-medium">{auth?.email || "Unavailable"}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground flex items-center">
                <Phone className="w-3.5 h-3.5 mr-2 opacity-70" />
                Phone Number
              </span>
              <span className="text-foreground font-mono">{profile.phone || "Not provided"}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground flex items-center">
                <MapPin className="w-3.5 h-3.5 mr-2 opacity-70" />
                Location
              </span>
              <span className="text-foreground">{profile.location || "Not provided"}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground flex items-center">
                <Globe className="w-3.5 h-3.5 mr-2 opacity-70" />
                Website
              </span>
              {profile.website ? (
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary font-medium hover:underline truncate max-w-xs"
                >
                  {profile.website}
                </a>
              ) : (
                <span className="text-muted-foreground">None</span>
              )}
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground flex items-center">
                <Calendar className="w-3.5 h-3.5 mr-2 opacity-70" />
                Date of Birth
              </span>
              <span className="text-foreground">{profile.date_of_birth || "Not provided"}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground flex items-center">
                <Clock className="w-3.5 h-3.5 mr-2 opacity-70" />
                Account Created
              </span>
              <span className="text-foreground font-mono">{new Date(profile.created_at).toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between py-2">
              <span className="text-muted-foreground flex items-center">
                <Activity className="w-3.5 h-3.5 mr-2 opacity-70" />
                Last Sign-In
              </span>
              <span className="text-foreground font-mono">
                {auth?.lastSignInAt ? new Date(auth.lastSignInAt).toLocaleString() : "Never"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Right Column: Reports Queue on this User */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm flex items-center">
                <ShieldAlert className="w-4 h-4 text-destructive mr-2" />
                Community Reports Involving User
              </CardTitle>
              <CardDescription className="text-xs">Flagged content and reports filed by members.</CardDescription>
            </div>
            <span className="text-[11px] font-mono text-muted-foreground">
              {reports.against.length} reports
            </span>
          </CardHeader>
          <CardContent>
            {reports.against.length === 0 ? (
              <div className="p-8 rounded-xl bg-muted/30 border border-border text-center text-xs text-muted-foreground space-y-1.5">
                <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto" />
                <p className="text-foreground font-semibold font-heading">Clean Safety Record</p>
                <p>No community reports have been filed against this account.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {reports.against.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-3 rounded-xl bg-muted/40 border border-border text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-destructive font-bold uppercase text-[11px]">
                        Reason: {rep.reason}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {new Date(rep.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    {rep.description && <p className="text-foreground text-[11px]">{rep.description}</p>}
                    <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground">
                      <span>Filed by: @{rep.reporter?.username || "anonymous"}</span>
                      <span className="px-1.5 py-0.5 rounded bg-background border border-border font-medium">{rep.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Moderation History Audit Log on this User */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center">
            <FileText className="w-4 h-4 text-emerald-500 mr-2" />
            Administrative Moderation History
          </CardTitle>
          <CardDescription className="text-xs">Immutable audit of all past moderation actions taken on this profile.</CardDescription>
        </CardHeader>
        <CardContent>
          {moderationHistory.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No administrative moderation actions recorded yet for this user.
            </div>
          ) : (
            <div className="rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Admin Actor</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Recorded Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {moderationHistory.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-muted-foreground text-[11px] whitespace-nowrap font-mono">
                        {new Date(log.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground">
                        @{log.admin_user?.username || "system"}
                      </TableCell>
                      <TableCell>
                        <StatusBadge type="action" value={log.action} />
                      </TableCell>
                      <TableCell className="text-foreground text-[11px]">
                        {log.details?.reason ? (
                          <span>Reason: {log.details.reason}</span>
                        ) : (
                          <span className="text-muted-foreground">{JSON.stringify(log.details)}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Modal via shadcn Dialog */}
      <Dialog open={showStatusModal} onOpenChange={setShowStatusModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center text-base">
              <ShieldAlert className="w-5 h-5 mr-2 text-destructive" />
              Alter Account Status
            </DialogTitle>
            <DialogDescription className="text-xs">
              Update restrictions or reinstate platform privileges for @{profile.username}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleApplyStatusChange} className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs">Select Action / Status</Label>
              <select
                value={targetStatus}
                onChange={(e) => setTargetStatus(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-background border border-input text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="ACTIVE">ACTIVE — Restore full platform privileges</option>
                <option value="SUSPENDED">SUSPENDED — Temporary account restriction</option>
                <option value="BANNED">BANNED — Permanent account expulsion</option>
                <option value="DEACTIVATED">DEACTIVATED — Deactivate account</option>
              </select>
            </div>

            {targetStatus === "SUSPENDED" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Suspension Expiration (Optional)</Label>
                <Input
                  type="datetime-local"
                  value={suspendedUntil}
                  onChange={(e) => setSuspendedUntil(e.target.value)}
                  className="text-xs"
                />
                <p className="text-[11px] text-muted-foreground">
                  Leave blank for an indefinite suspension requiring manual admin reinstatement.
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">
                Administrative Justification / Reason <span className="text-destructive">*</span>
              </Label>
              <Textarea
                rows={3}
                required={targetStatus !== "ACTIVE"}
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder="Mandatory explanation for this moderation action..."
                className="text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Recorded in the immutable security audit log.
              </p>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowStatusModal(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant={targetStatus === "BANNED" || targetStatus === "SUSPENDED" ? "destructive" : "default"}
                size="sm"
                disabled={submittingStatus}
              >
                {submittingStatus ? "Processing..." : `Confirm ${targetStatus}`}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
