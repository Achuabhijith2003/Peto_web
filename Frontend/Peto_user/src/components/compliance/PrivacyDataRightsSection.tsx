import React, { useState, useEffect } from "react";
import {
  Shield,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  FileText,
  Lock,
  Send,
} from "lucide-react";
import api from "../../utils/api";

interface DataRequestItem {
  id: string;
  request_type: string;
  status: string;
  details?: string;
  resolution_notes?: string;
  created_at: string;
  completed_at?: string;
}

export const PrivacyDataRightsSection: React.FC = () => {
  // Consent toggles
  const [cookieConsent, setCookieConsent] = useState(() => {
    try {
      const stored = localStorage.getItem("peto_cookie_consent");
      return stored ? JSON.parse(stored) : { essential: true, analytics: false, marketing: false };
    } catch {
      return { essential: true, analytics: false, marketing: false };
    }
  });
  const [consentSavedMsg, setConsentSavedMsg] = useState(false);

  // Data requests state
  const [requests, setRequests] = useState<DataRequestItem[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Export state
  const [exportLoading, setExportLoading] = useState(false);
  const [exportSuccessMsg, setExportSuccessMsg] = useState<string | null>(null);

  // Deletion modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState("");
  const [deletionReason, setDeletionReason] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Inquiries / Correction form
  const [inquiryType, setInquiryType] = useState<"DATA_CORRECTION" | "PRIVACY_REQUEST">("DATA_CORRECTION");
  const [inquiryDetails, setInquiryDetails] = useState("");
  const [inquirySubmitting, setInquirySubmitting] = useState(false);
  const [inquiryMsg, setInquiryMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load user's previous data requests
  const fetchMyRequests = async () => {
    try {
      setLoadingRequests(true);
      const res = await api.get("/compliance/requests/my");
      if (res.data?.success && Array.isArray(res.data.data)) {
        setRequests(res.data.data);
      }
    } catch (err) {
      console.error("Failed to load compliance requests:", err);
    } finally {
      setLoadingRequests(false);
    }
  };

  useEffect(() => {
    fetchMyRequests();
  }, []);

  // Save Cookie & Consent preferences
  const handleSaveConsent = () => {
    const updated = {
      ...cookieConsent,
      essential: true, // Always locked to true
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem("peto_cookie_consent", JSON.stringify(updated));
    setCookieConsent(updated);
    setConsentSavedMsg(true);
    setTimeout(() => setConsentSavedMsg(false), 3000);
  };

  // Request Data Export
  const handleRequestExport = async () => {
    try {
      setExportLoading(true);
      setExportSuccessMsg(null);
      const res = await api.post("/compliance/requests", {
        requestType: "DATA_EXPORT",
      });

      if (res.data?.success && res.data.exportData) {
        // Automatically download the compiled JSON bundle
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(res.data.exportData, null, 2));
        const downloadAnchor = document.createElement("a");
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `peto-data-export-${new Date().toISOString().split("T")[0]}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();

        setExportSuccessMsg("Data export compiled and downloaded successfully.");
        fetchMyRequests();
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || "Failed to compile data export. Please try again.";
      setExportSuccessMsg(msg);
    } finally {
      setExportLoading(false);
    }
  };

  // Submit Account Deletion Request
  const handleConfirmDeletion = async () => {
    if (deleteConfirmationInput.trim().toUpperCase() !== "DELETE") {
      setDeleteMessage({ type: "error", text: "Please type DELETE to confirm your request." });
      return;
    }

    try {
      setDeleteLoading(true);
      setDeleteMessage(null);
      const res = await api.post("/compliance/requests", {
        requestType: "ACCOUNT_DELETION",
        details: deletionReason.trim(),
      });

      if (res.data?.success) {
        setDeleteMessage({
          type: "success",
          text: res.data.message || "Your account has entered the 30-day recovery grace period.",
        });
        setShowDeleteModal(false);
        setDeleteConfirmationInput("");
        setDeletionReason("");
        fetchMyRequests();
      }
    } catch (err: any) {
      setDeleteMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to submit deletion request.",
      });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Submit Privacy Inquiry or Correction
  const handleSubmitInquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryDetails.trim()) return;

    try {
      setInquirySubmitting(true);
      setInquiryMsg(null);
      const res = await api.post("/compliance/requests", {
        requestType: inquiryType,
        details: inquiryDetails.trim(),
      });

      if (res.data?.success) {
        setInquiryMsg({
          type: "success",
          text: res.data.message || "Request submitted to Peto compliance officers.",
        });
        setInquiryDetails("");
        fetchMyRequests();
      }
    } catch (err: any) {
      setInquiryMsg({
        type: "error",
        text: err.response?.data?.message || "Failed to submit request.",
      });
    } finally {
      setInquirySubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">Completed</span>;
      case "PROCESSING":
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800">In Review</span>;
      case "REJECTED":
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">Rejected</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">Pending</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center border border-purple-100">
            <Shield size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 font-heading">
              Privacy Rights & Data Management
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Exercise your legal rights under GDPR, CCPA, and applicable privacy frameworks. View your data, request exports, or schedule account erasure.
            </p>
          </div>
        </div>

        {deleteMessage && (
          <div
            className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-3 border ${
              deleteMessage.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {deleteMessage.type === "success" ? (
              <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle size={18} className="text-rose-600 shrink-0" />
            )}
            <span>{deleteMessage.text}</span>
          </div>
        )}
      </div>

      {/* Grid: Consent Controls & Data Export */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 1. Consent & Tracking Controls */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Lock size={16} className="text-purple-600" />
              <span>Consent & Tracking Preferences</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Control non-essential storage and data collection used on your device.
            </p>

            <div className="space-y-3 pt-2">
              {/* Essential */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Strictly Necessary Storage</span>
                  <span className="text-[11px] text-slate-400">Required for authentication and platform security</span>
                </div>
                <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider px-2 py-0.5 bg-emerald-50 rounded-md">
                  Active
                </span>
              </div>

              {/* Analytics */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Analytics & Performance</span>
                  <span className="text-[11px] text-slate-400">Aggregate telemetry to optimize latency and app speed</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cookieConsent.analytics}
                    onChange={(e) => setCookieConsent({ ...cookieConsent, analytics: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600" />
                </label>
              </div>

              {/* Marketing */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div>
                  <span className="text-xs font-bold text-slate-800 block">Marketing & Highlights</span>
                  <span className="text-[11px] text-slate-400">Pet care recommendations and promotional communications</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={cookieConsent.marketing}
                    onChange={(e) => setCookieConsent({ ...cookieConsent, marketing: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600" />
                </label>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            {consentSavedMsg && (
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 size={14} /> Preferences updated
              </span>
            )}
            <button
              onClick={handleSaveConsent}
              className="ml-auto px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Save Preferences
            </button>
          </div>
        </div>

        {/* 2. Data Portability (Download My Data) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <Download size={16} className="text-blue-600" />
              <span>Right to Portability (Data Export)</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Obtain an authoritative, machine-readable JSON archive containing your registered profile data, pets, post counts, and active community memberships.
            </p>

            <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-100 text-xs text-blue-900 space-y-1.5">
              <span className="font-bold block">Export contains:</span>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-blue-800/80">
                <li>Personal account identifiers & profile metadata</li>
                <li>Registered pet profiles & veterinary summaries</li>
                <li>Post publications, captions & engagement metrics</li>
                <li>Joined community affiliations</li>
              </ul>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            {exportSuccessMsg && (
              <p className="text-xs text-emerald-700 font-semibold">{exportSuccessMsg}</p>
            )}
            <button
              onClick={handleRequestExport}
              disabled={exportLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              {exportLoading ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Compiling Export Bundle...</span>
                </>
              ) : (
                <>
                  <Download size={14} />
                  <span>Download My Personal Data</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Grid: Data Correction / Rights Query & Account Deletion */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 3. Privacy Query / Rectification Form */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
              <FileText size={16} className="text-indigo-600" />
              <span>Submit Privacy Query or Correction</span>
            </div>
            <p className="text-xs text-slate-500">
              Request correction of inaccurate personal records or consult our compliance officer.
            </p>
          </div>

          {inquiryMsg && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold ${
                inquiryMsg.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"
              }`}
            >
              {inquiryMsg.text}
            </div>
          )}

          <form onSubmit={handleSubmitInquiry} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Request Type
              </label>
              <select
                value={inquiryType}
                onChange={(e) => setInquiryType(e.target.value as any)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white font-medium"
              >
                <option value="DATA_CORRECTION">Rectify Inaccurate Personal Data</option>
                <option value="PRIVACY_REQUEST">General Privacy Rights Inquiry / DPO Request</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                Specific Request Details
              </label>
              <textarea
                value={inquiryDetails}
                onChange={(e) => setInquiryDetails(e.target.value)}
                required
                rows={3}
                placeholder="Describe the inaccurate record or your statutory rights question..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:bg-white resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={inquirySubmitting || !inquiryDetails.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer"
            >
              <Send size={13} />
              <span>{inquirySubmitting ? "Submitting..." : "Send Request"}</span>
            </button>
          </form>
        </div>

        {/* 4. Account Erasure (Right to be Forgotten) */}
        <div className="bg-white rounded-3xl border border-rose-200/80 p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
              <Trash2 size={16} />
              <span>Account Deletion & Erasure</span>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              Permanent account termination and data purge in accordance with GDPR Art. 17 and Peto's data retention standards.
            </p>

            <div className="p-4 rounded-2xl bg-rose-50/50 border border-rose-100 text-xs text-rose-900 space-y-2">
              <div className="flex items-center gap-1.5 font-bold">
                <Clock size={14} className="text-rose-600" />
                <span>30-Day Operational Recovery Grace Period</span>
              </div>
              <p className="text-[11px] text-rose-800/90 leading-relaxed">
                When deletion is initiated, your account is immediately deactivated and hidden from all public views. You have 30 days to log in and cancel deletion before personal data is permanently scrubbed.
              </p>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={() => setShowDeleteModal(true)}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              Request Account Deletion
            </button>
          </div>
        </div>
      </div>

      {/* 5. Request History Log */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-slate-600" />
            <h3 className="font-bold text-sm text-slate-900">Your Privacy Requests History</h3>
          </div>
          <button
            onClick={fetchMyRequests}
            className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw size={12} className={loadingRequests ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>
        </div>

        {requests.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
            No privacy or data requests filed yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Date Submitted</th>
                  <th className="py-2.5 px-3">Resolution Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-bold text-slate-800">
                      {r.request_type.replace(/_/g, " ")}
                    </td>
                    <td className="py-3 px-3">
                      {getStatusBadge(r.status)}
                    </td>
                    <td className="py-3 px-3 text-slate-500">
                      {new Date(r.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-3 text-slate-500 max-w-xs truncate">
                      {r.resolution_notes || "Processing in compliance queue"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Account Deletion Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-rose-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Confirm Account Deletion Request
              </h3>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                This action initiates a 30-day grace period. After 30 days, your pet profiles, posts, media, and personal data will be irrevocably scrubbed from Peto systems.
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Reason for leaving (Optional)
              </label>
              <input
                type="text"
                value={deletionReason}
                onChange={(e) => setDeletionReason(e.target.value)}
                placeholder="e.g. Closing pet shelter, switching services..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-800 focus:outline-none focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-rose-700 uppercase mb-1">
                Type DELETE to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmationInput}
                onChange={(e) => setDeleteConfirmationInput(e.target.value)}
                placeholder="DELETE"
                className="w-full bg-rose-50/50 border border-rose-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-rose-800 focus:outline-none focus:bg-white"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteLoading || deleteConfirmationInput.trim().toUpperCase() !== "DELETE"}
                onClick={handleConfirmDeletion}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer"
              >
                {deleteLoading ? "Scheduling Deletion..." : "Schedule Deletion"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrivacyDataRightsSection;
