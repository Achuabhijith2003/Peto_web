import { useState, useEffect } from "react";
import {
  UserCheck,
  Ban,
  AlertTriangle,
  Loader2,
  Trash2,
} from "lucide-react";
import api from "../../utils/api";

interface CommunityModPanelProps {
  communityId: string;
  isOwner?: boolean;
}

const CommunityModPanel = ({ communityId }: CommunityModPanelProps) => {
  const [activeSubTab, setActiveSubTab] = useState<"requests" | "reports" | "bans">("requests");

  // Requests state
  const [requests, setRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Reports state
  const [reports, setReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // Bans state
  const [bans, setBans] = useState<any[]>([]);
  const [loadingBans, setLoadingBans] = useState(false);

  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
    fetchReports();
    fetchBans();
  }, [communityId]);

  const fetchRequests = async () => {
    try {
      setLoadingRequests(true);
      const res = await api.get(`/communities/${communityId}/requests`);
      if (res.data?.success) setRequests(res.data.data || []);
    } catch (err) {
      console.error("Error fetching requests:", err);
    } finally {
      setLoadingRequests(false);
    }
  };

  const fetchReports = async () => {
    try {
      setLoadingReports(true);
      const res = await api.get(`/communities/${communityId}/reports`);
      if (res.data?.success) setReports(res.data.data || []);
    } catch (err) {
      console.error("Error fetching reports:", err);
    } finally {
      setLoadingReports(false);
    }
  };

  const fetchBans = async () => {
    try {
      setLoadingBans(true);
      const res = await api.get(`/communities/${communityId}/bans`);
      if (res.data?.success) setBans(res.data.data || []);
    } catch (err) {
      console.error("Error fetching bans:", err);
    } finally {
      setLoadingBans(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      setProcessingId(requestId);
      await api.post(`/communities/${communityId}/requests/${requestId}/approve`);
      setRequests(requests.filter((r) => r.id !== requestId));
    } catch (err) {
      console.error("Error approving request:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      setProcessingId(requestId);
      await api.post(`/communities/${communityId}/requests/${requestId}/reject`);
      setRequests(requests.filter((r) => r.id !== requestId));
    } catch (err) {
      console.error("Error rejecting request:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReportAction = async (reportId: string, status: "actioned" | "dismissed") => {
    try {
      setProcessingId(reportId);
      await api.patch(`/communities/${communityId}/reports/${reportId}`, { status });
      setReports(
        reports.map((r) => (r.id === reportId ? { ...r, status } : r))
      );
    } catch (err) {
      console.error("Error updating report:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteReportedPost = async (postId: string, reportId: string) => {
    try {
      setProcessingId(reportId);
      await api.delete(`/communities/${communityId}/posts/${postId}`);
      await api.patch(`/communities/${communityId}/reports/${reportId}`, { status: "actioned" });
      setReports(
        reports.map((r) => (r.id === reportId ? { ...r, status: "actioned" } : r))
      );
    } catch (err) {
      console.error("Error deleting reported post:", err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleUnban = async (userId: string) => {
    try {
      setProcessingId(userId);
      await api.delete(`/communities/${communityId}/bans/${userId}`);
      setBans(bans.filter((b) => b.user_id !== userId));
    } catch (err) {
      console.error("Error unbanning user:", err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-nav Buttons */}
      <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
        <button
          type="button"
          onClick={() => setActiveSubTab("requests")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
            activeSubTab === "requests"
              ? "bg-amber-100 text-amber-900"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <UserCheck size={16} />
          <span>Join Requests ({requests.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("reports")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
            activeSubTab === "reports"
              ? "bg-amber-100 text-amber-900"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <AlertTriangle size={16} />
          <span>Reports Queue ({reports.filter((r) => r.status === "pending").length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("bans")}
          className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
            activeSubTab === "bans"
              ? "bg-amber-100 text-amber-900"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          <Ban size={16} />
          <span>Banned Users ({bans.length})</span>
        </button>
      </div>

      {/* 1. JOIN REQUESTS */}
      {activeSubTab === "requests" && (
        <div>
          {loadingRequests ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-amber-500" />
            </div>
          ) : requests.length > 0 ? (
            <div className="space-y-3">
              {requests.map((req) => {
                const profile = req.profile || {};
                return (
                  <div
                    key={req.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl bg-white p-4 border border-slate-100 shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-xl bg-amber-100 flex items-center justify-center font-bold text-amber-700">
                        {profile.avatar_url && profile.avatar_url !== "null" ? (
                          <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          profile.username?.slice(0, 2).toUpperCase() || "PE"
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                          {profile.full_name || profile.username}
                        </h4>
                        <p className="text-[11px] text-slate-400">@{profile.username}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <button
                        type="button"
                        disabled={processingId === req.id}
                        onClick={() => handleRejectRequest(req.id)}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        disabled={processingId === req.id}
                        onClick={() => handleApproveRequest(req.id)}
                        className="rounded-xl bg-amber-500 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-amber-600 transition cursor-pointer"
                      >
                        Approve
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-xs text-slate-400">
              No pending join requests at this time.
            </div>
          )}
        </div>
      )}

      {/* 2. REPORTS QUEUE */}
      {activeSubTab === "reports" && (
        <div>
          {loadingReports ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-amber-500" />
            </div>
          ) : reports.length > 0 ? (
            <div className="space-y-3">
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  className="rounded-2xl bg-white p-5 border border-slate-100 shadow-xs space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 uppercase tracking-wider">
                        Reason: {rep.reason}
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                          rep.status === "pending"
                            ? "bg-amber-100 text-amber-800"
                            : rep.status === "actioned"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {rep.status}
                      </span>
                    </div>

                    <span className="text-[10px] text-slate-400">
                      Reported by @{rep.reporter?.username || "user"}
                    </span>
                  </div>

                  {rep.description && (
                    <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      "{rep.description}"
                    </p>
                  )}

                  {rep.post && (
                    <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3 text-xs text-slate-800">
                      <span className="font-bold text-[11px] text-amber-800 block mb-1">
                        Reported Post Content:
                      </span>
                      <p className="line-clamp-2">{rep.post.text || "(Media Post)"}</p>
                    </div>
                  )}

                  {rep.status === "pending" && (
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-50">
                      <button
                        type="button"
                        disabled={processingId === rep.id}
                        onClick={() => handleReportAction(rep.id, "dismissed")}
                        className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                      >
                        Dismiss
                      </button>

                      {rep.post_id && (
                        <button
                          type="button"
                          disabled={processingId === rep.id}
                          onClick={() => handleDeleteReportedPost(rep.post_id, rep.id)}
                          className="inline-flex items-center gap-1 rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 cursor-pointer"
                        >
                          <Trash2 size={12} />
                          <span>Remove Post</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={processingId === rep.id}
                        onClick={() => handleReportAction(rep.id, "actioned")}
                        className="rounded-xl bg-slate-800 px-3 py-1.5 text-xs font-bold text-white hover:bg-slate-900 cursor-pointer"
                      >
                        Mark Actioned
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-xs text-slate-400">
              No reports found. Your community is in good standing!
            </div>
          )}
        </div>
      )}

      {/* 3. BANNED USERS */}
      {activeSubTab === "bans" && (
        <div>
          {loadingBans ? (
            <div className="flex justify-center py-8">
              <Loader2 size={24} className="animate-spin text-amber-500" />
            </div>
          ) : bans.length > 0 ? (
            <div className="space-y-3">
              {bans.map((ban) => {
                const u = ban.user || {};
                return (
                  <div
                    key={ban.id}
                    className="flex items-center justify-between rounded-2xl bg-white p-4 border border-slate-100 shadow-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                        {u.avatar_url && u.avatar_url !== "null" ? (
                          <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          u.username?.slice(0, 2).toUpperCase() || "BA"
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900">
                          {u.full_name || u.username}
                        </h4>
                        <p className="text-[11px] text-rose-600">Reason: {ban.reason}</p>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={processingId === ban.user_id}
                      onClick={() => handleUnban(ban.user_id)}
                      className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Unban Member
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-xs text-slate-400">
              No banned users in this community.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CommunityModPanel;
