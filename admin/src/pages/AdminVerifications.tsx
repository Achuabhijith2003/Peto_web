import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  Building2,
  User,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Eye,
  FileText,
  RefreshCw,
  ExternalLink,
  Lock,
  Globe,
  Ban,
  X,
} from "lucide-react";
import {
  fetchAdminVerifications,
  fetchAdminVerificationDetail,
  fetchAdminSignedDocumentUrl,
  reviewAdminVerification,
} from "../api/adminApi";

export const AdminVerifications: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("PENDING");
  const [selectedCountry, setSelectedCountry] = useState("ALL");
  const [selectedType, setSelectedType] = useState("ALL");
  const [page, setPage] = useState(1);

  // Selected Detail Modal
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Decision Modal
  const [decisionAction, setDecisionAction] = useState<
    "APPROVE" | "REJECT" | "REQUEST_INFORMATION" | "SUSPEND" | null
  >(null);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState(false);

  // Document Secure Preview
  const [previewDoc, setPreviewDoc] = useState<{
    url: string;
    type: string;
    expiresIn: number;
  } | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);

  const loadQueue = async () => {
    try {
      setLoading(true);
      let statusFilter = undefined;
      if (activeTab === "PENDING") statusFilter = "SUBMITTED";
      else if (activeTab === "APPROVED") statusFilter = "APPROVED";
      else if (activeTab === "REJECTED") statusFilter = "REJECTED";
      else if (activeTab === "INFO") statusFilter = "ADDITIONAL_INFORMATION_REQUIRED";
      else if (activeTab === "SUSPENDED") statusFilter = "SUSPENDED";

      const res = await fetchAdminVerifications({
        status: statusFilter,
        country: selectedCountry,
        type: selectedType,
        page,
        limit: 15,
      });

      if (res.success) {
        setItems(res.items || []);
        setTotal(res.total || 0);
      }
    } catch (err) {
      console.error("Failed to load verification queue:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQueue();
  }, [activeTab, selectedCountry, selectedType, page]);

  const handleInspect = async (appId: string) => {
    try {
      setLoadingDetail(true);
      const res = await fetchAdminVerificationDetail(appId);
      if (res.success) {
        setSelectedApp(res.application);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to load application details.");
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleViewDocument = async (docId: string) => {
    if (!selectedApp) return;
    try {
      setLoadingDoc(true);
      const res = await fetchAdminSignedDocumentUrl(selectedApp.id, docId);
      if (res.success) {
        setPreviewDoc({
          url: res.signed_url,
          type: res.document_type,
          expiresIn: res.expires_in_seconds,
        });
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Could not generate secure view token.");
    } finally {
      setLoadingDoc(false);
    }
  };

  const handleExecuteDecision = async () => {
    if (!selectedApp || !decisionAction) return;
    try {
      setSubmittingDecision(true);
      await reviewAdminVerification(selectedApp.id, {
        action: decisionAction,
        notes: decisionNotes,
        rejectionReason: decisionNotes,
      });

      setDecisionAction(null);
      setDecisionNotes("");
      setSelectedApp(null);
      loadQueue();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to process verification decision.");
    } finally {
      setSubmittingDecision(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 size={12} /> Approved
          </span>
        );
      case "SUBMITTED":
      case "UNDER_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock size={12} /> Under Review
          </span>
        );
      case "ADDITIONAL_INFORMATION_REQUIRED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-700 border border-orange-200">
            <AlertTriangle size={12} /> Info Required
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle size={12} /> Rejected
          </span>
        );
      case "SUSPENDED":
      case "REVOKED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            <Ban size={12} /> Suspended
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-600 shadow-sm">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                Partner & Identity Verifications
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-mono font-medium">
                  {total} records
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Compliance review queue, zero-knowledge document auditing, and advertiser partner certification
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={loadQueue}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm transition"
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-amber-600" : ""} />
          Refresh Queue
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap gap-2 text-xs font-medium">
          {[
            { id: "PENDING", label: "Pending Review" },
            { id: "APPROVED", label: "Approved Partners" },
            { id: "INFO", label: "Action Required" },
            { id: "REJECTED", label: "Rejected" },
            { id: "SUSPENDED", label: "Suspended" },
            { id: "ALL", label: "All Records" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={`px-3.5 py-2 rounded-xl transition ${
                activeTab === tab.id
                  ? "bg-amber-500 text-white font-bold shadow-sm shadow-amber-500/20"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 shadow-sm focus:ring-1 focus:ring-amber-500"
          >
            <option value="ALL">All Regions</option>
            <option value="US">United States (US)</option>
            <option value="IN">India (IN)</option>
            <option value="GB">United Kingdom (GB)</option>
            <option value="CA">Canada (CA)</option>
            <option value="AU">Australia (AU)</option>
            <option value="DE">Germany (DE)</option>
          </select>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-700 shadow-sm focus:ring-1 focus:ring-amber-500"
          >
            <option value="ALL">All Types</option>
            <option value="INDIVIDUAL_IDENTITY">Individual Identity</option>
            <option value="BUSINESS_PARTNER">Business / Partner</option>
          </select>
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Applicant Profile</th>
                <th className="px-4 py-3.5">Category & Entity</th>
                <th className="px-4 py-3.5">Region</th>
                <th className="px-4 py-3.5">Documents</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Submitted</th>
                <th className="px-4 py-3.5 text-right">Review Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-slate-500">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-amber-500" />
                    Loading verification submissions...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-slate-500">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3 border border-slate-100 shadow-xs">
                      <ShieldCheck size={26} />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">No verification records found</p>
                    <p className="text-xs text-slate-400 mt-1">There are no applications matching the selected status and regional filters.</p>
                  </td>
                </tr>
              ) : (
                items.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/70 transition">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        {app.profiles?.avatar_url ? (
                          <img
                            src={app.profiles.avatar_url}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover border border-slate-200"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center font-bold border border-amber-200 text-xs">
                            {app.profiles?.username?.[0]?.toUpperCase() || "U"}
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-slate-900">
                            {app.profiles?.full_name || app.profiles?.username || "Unknown"}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            @{app.profiles?.username || "user"}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-slate-800 flex items-center gap-1.5">
                        {app.verification_type === "BUSINESS_PARTNER" ? (
                          <Building2 size={13} className="text-emerald-600" />
                        ) : (
                          <User size={13} className="text-blue-600" />
                        )}
                        <span>
                          {app.verification_type === "BUSINESS_PARTNER"
                            ? app.business_legal_name || app.advertisers?.company_name || "Business Entity"
                            : `${app.legal_first_name || ""} ${app.legal_last_name || ""}`.trim() || "Individual Identity"}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-medium">
                        {app.verification_type.replace("_", " ")}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5 font-medium text-slate-700">
                        <Globe size={13} className="text-slate-400" />
                        <span>{app.residential_country}</span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 text-xs font-medium">
                        <FileText size={12} className="text-amber-500" />
                        <strong>{app.verification_documents?.length || 0}</strong> docs
                      </span>
                    </td>

                    <td className="px-4 py-3.5">{getStatusBadge(app.status)}</td>

                    <td className="px-4 py-3.5 text-slate-500 font-mono text-[11px]">
                      {app.submitted_at
                        ? new Date(app.submitted_at).toLocaleDateString()
                        : new Date(app.created_at).toLocaleDateString()}
                    </td>

                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => handleInspect(app.id)}
                        disabled={loadingDetail}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold shadow-xs transition disabled:opacity-50"
                      >
                        <Eye size={13} />
                        <span>{loadingDetail ? "Loading..." : "Inspect & Review"}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Inspection Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6 text-slate-800 animate-in fade-in zoom-in-95">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-amber-50 rounded-2xl border border-amber-200 text-amber-600">
                  {selectedApp.verification_type === "BUSINESS_PARTNER" ? (
                    <Building2 size={22} />
                  ) : (
                    <User size={22} />
                  )}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {selectedApp.verification_type === "BUSINESS_PARTNER"
                      ? selectedApp.business_legal_name || "Business Application"
                      : `${selectedApp.legal_first_name || ""} ${selectedApp.legal_last_name || ""}`.trim() || "Individual Identity"}
                  </h2>
                  <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                    <span>Application ID: <span className="font-mono text-slate-700">{selectedApp.id}</span></span>
                    <span>•</span>
                    {getStatusBadge(selectedApp.status)}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedApp(null)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Applicant Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Applicant Identity
                </div>
                <div>
                  <span className="text-slate-500">Legal Name: </span>
                  <strong className="text-slate-900 font-semibold">
                    {selectedApp.legal_first_name} {selectedApp.legal_last_name}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Date of Birth: </span>
                  <span className="text-slate-800 font-mono">
                    {selectedApp.date_of_birth || "Not provided"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Country of Residence: </span>
                  <span className="text-slate-800 font-medium">{selectedApp.residential_country}</span>
                </div>
                <div>
                  <span className="text-slate-500">Address: </span>
                  <span className="text-slate-800">
                    {[selectedApp.address_line1, selectedApp.city, selectedApp.postal_code]
                      .filter(Boolean)
                      .join(", ") || "None"}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-2">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Organization / Commercial Profile
                </div>
                <div>
                  <span className="text-slate-500">Legal Entity: </span>
                  <strong className="text-slate-900 font-semibold">
                    {selectedApp.business_legal_name || "Individual"}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Reg. Number (Masked): </span>
                  <span className="text-slate-800 font-mono">
                    {selectedApp.business_registration_number_masked || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Tax ID / VAT (Masked): </span>
                  <span className="text-slate-800 font-mono">
                    {selectedApp.business_tax_id_masked || "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Official Website: </span>
                  {selectedApp.business_website ? (
                    <a
                      href={selectedApp.business_website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-amber-600 hover:underline inline-flex items-center gap-1 font-medium"
                    >
                      {selectedApp.business_website} <ExternalLink size={10} />
                    </a>
                  ) : (
                    <span className="text-slate-400">None</span>
                  )}
                </div>
              </div>
            </div>

            {/* Documents Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Lock size={14} className="text-amber-500" />
                  Encrypted Verification Documents
                </h3>
                <span className="text-[10px] text-slate-400">
                  Zero-knowledge private storage • 5m signed token preview
                </span>
              </div>

              {selectedApp.verification_documents?.length === 0 ? (
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-center text-slate-500 text-xs">
                  No documents attached to this submission.
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedApp.verification_documents?.map((doc: any) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-xl text-amber-600 border border-slate-200">
                          <FileText size={16} />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">
                            {doc.document_type} ({doc.country_code})
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            Masked ID: {doc.document_number_masked || "Hidden"} • {(doc.file_size_bytes / 1024).toFixed(1)} KB
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleViewDocument(doc.id)}
                        disabled={loadingDoc}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 font-medium text-xs border border-slate-200 shadow-xs transition"
                      >
                        <ExternalLink size={12} />
                        <span>Inspect Document</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Rejection / Additional notes if present */}
            {selectedApp.rejection_reason && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700">
                <strong>Rejection Reason: </strong> {selectedApp.rejection_reason}
              </div>
            )}
            {selectedApp.additional_info_notes && (
              <div className="p-3 bg-orange-50 border border-orange-200 rounded-2xl text-xs text-orange-700">
                <strong>Information Requested: </strong> {selectedApp.additional_info_notes}
              </div>
            )}

            {/* Actions Bar */}
            <div className="border-t border-slate-100 pt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="text-[11px] text-slate-400">
                Decisions are logged to immutable administrative audit trails.
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setDecisionAction("REQUEST_INFORMATION")}
                  className="px-3.5 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-semibold transition"
                >
                  Request Info
                </button>

                <button
                  onClick={() => setDecisionAction("REJECT")}
                  className="px-3.5 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-semibold transition"
                >
                  Reject
                </button>

                {selectedApp.status === "APPROVED" ? (
                  <button
                    onClick={() => setDecisionAction("SUSPEND")}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs font-semibold transition"
                  >
                    Suspend Partner
                  </button>
                ) : (
                  <button
                    onClick={() => setDecisionAction("APPROVE")}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
                  >
                    Approve Partner
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Decision Execution Dialog */}
      {decisionAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl text-slate-800">
            <h3 className="text-base font-bold text-slate-900">
              Confirm Decision: {decisionAction}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Provide justification or instructions to be sent to the applicant and recorded in the compliance audit trail.
            </p>

            <textarea
              rows={3}
              value={decisionNotes}
              onChange={(e) => setDecisionNotes(e.target.value)}
              placeholder={
                decisionAction === "REJECT"
                  ? "State reason for rejection (e.g. Expired ID, mismatched names)..."
                  : decisionAction === "REQUEST_INFORMATION"
                  ? "Detail the additional documentation required..."
                  : "Optional compliance notes..."
              }
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDecisionAction(null)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteDecision}
                disabled={submittingDecision}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-sm transition disabled:opacity-50"
              >
                {submittingDecision ? "Executing..." : "Confirm & Execute"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Lightbox */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl text-slate-800">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {previewDoc.type} Inspection
                </h4>
                <p className="text-[10px] text-amber-600 font-medium">
                  Temporary signed access token active for {previewDoc.expiresIn}s
                </p>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-auto flex items-center justify-center bg-slate-50 p-4 rounded-2xl border border-slate-200">
              {previewDoc.url.endsWith(".pdf") ? (
                <iframe src={previewDoc.url} title="Document" className="w-full h-96 rounded-xl" />
              ) : (
                <img
                  src={previewDoc.url}
                  alt="Document Preview"
                  className="max-h-[50vh] object-contain rounded-xl shadow-xs"
                />
              )}
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
              >
                Close Document Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
