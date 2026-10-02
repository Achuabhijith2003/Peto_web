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
  Lock,
  Ban,
  X,
  Search,
  Filter,
  RotateCcw,
  HelpCircle,
  AlertCircle,
  BadgeCheck,
  MapPin,
  UserCheck,
  FileCheck2,
} from "lucide-react";
import {
  fetchAdminVerificationOverview,
  fetchAdminVerifications,
  fetchAdminVerificationDetail,
  fetchAdminSignedDocumentUrl,
  reviewAdminVerification,
} from "../api/adminApi";

export const AdminVerifications: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>("PENDING");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("ALL");
  const [selectedType, setSelectedType] = useState("ALL");
  const [page, setPage] = useState(1);

  // Overview stats
  const [overview, setOverview] = useState<{
    total: number;
    pending: number;
    underReview: number;
    approved: number;
    rejected: number;
    additionalInfoRequired: number;
    reverificationRequired: number;
    suspended: number;
    revoked: number;
    personCount: number;
    businessCount: number;
  }>({
    total: 0,
    pending: 0,
    underReview: 0,
    approved: 0,
    rejected: 0,
    additionalInfoRequired: 0,
    reverificationRequired: 0,
    suspended: 0,
    revoked: 0,
    personCount: 0,
    businessCount: 0,
  });

  // Selected Detail Modal
  const [selectedApp, setSelectedApp] = useState<any | null>(null);

  // Decision Modal
  const [decisionAction, setDecisionAction] = useState<
    "APPROVE" | "REJECT" | "REQUEST_INFORMATION" | "REQUIRE_REVERIFICATION" | "SUSPEND" | "REVOKE" | null
  >(null);
  const [rejectionCategory, setRejectionCategory] = useState("INSUFFICIENT_INFORMATION");
  const [userFacingReason, setUserFacingReason] = useState("");
  const [adminInternalNotes, setAdminInternalNotes] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState(false);

  // Document Secure Preview
  const [previewDoc, setPreviewDoc] = useState<{
    url: string;
    type: string;
    expiresIn: number;
  } | null>(null);
  const [loadingDoc, setLoadingDoc] = useState(false);

  const loadOverview = async () => {
    try {
      const res = await fetchAdminVerificationOverview();
      if (res.success && res.overview) {
        setOverview(res.overview);
      }
    } catch (e) {
      console.error("Failed to load verification overview:", e);
    }
  };

  const loadQueue = async () => {
    try {
      setLoading(true);
      let statusFilter: string | undefined = undefined;
      if (activeTab === "PENDING") statusFilter = "SUBMITTED";
      else if (activeTab === "UNDER_REVIEW") statusFilter = "UNDER_REVIEW";
      else if (activeTab === "APPROVED") statusFilter = "APPROVED";
      else if (activeTab === "REJECTED") statusFilter = "REJECTED";
      else if (activeTab === "INFO") statusFilter = "ADDITIONAL_INFORMATION_REQUIRED";
      else if (activeTab === "REVERIFICATION") statusFilter = "REVERIFICATION_REQUIRED";
      else if (activeTab === "SUSPENDED") statusFilter = "SUSPENDED";
      else if (activeTab === "REVOKED") statusFilter = "REVOKED";

      const res = await fetchAdminVerifications({
        status: statusFilter,
        country: selectedCountry,
        type: selectedType,
        search: searchQuery,
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
    loadOverview();
  }, []);

  useEffect(() => {
    loadQueue();
  }, [activeTab, selectedCountry, selectedType, page, searchQuery]);

  const handleInspect = async (appId: string) => {
    try {
      const res = await fetchAdminVerificationDetail(appId);
      if (res.success) {
        setSelectedApp(res.application);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to load application details.");
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

      let finalUserReason = userFacingReason.trim();
      if (decisionAction === "REJECT" && !finalUserReason) {
        finalUserReason = `Verification declined due to ${rejectionCategory.toLowerCase().replace(/_/g, " ")}.`;
      }

      await reviewAdminVerification(selectedApp.id, {
        action: decisionAction,
        rejectionReason: finalUserReason,
        userFacingReason: finalUserReason,
        adminInternalNotes: adminInternalNotes.trim() || undefined,
        notes: adminInternalNotes.trim() || finalUserReason,
      });

      setDecisionAction(null);
      setUserFacingReason("");
      setAdminInternalNotes("");
      setSelectedApp(null);
      await loadOverview();
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
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <Clock size={12} className="animate-spin" /> Pending Review
          </span>
        );
      case "UNDER_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <RefreshCw size={12} className="animate-spin" /> Under Review
          </span>
        );
      case "ADDITIONAL_INFORMATION_REQUIRED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <AlertTriangle size={12} /> Info Requested
          </span>
        );
      case "REVERIFICATION_REQUIRED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-orange-50 text-orange-800 border border-orange-200">
            <RotateCcw size={12} /> Reverification
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle size={12} /> Rejected
          </span>
        );
      case "SUSPENDED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-800 border border-red-200">
            <Ban size={12} /> Suspended
          </span>
        );
      case "REVOKED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-800 border border-slate-300">
            <Ban size={12} /> Revoked
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <h1 className="text-2xl font-bold font-heading text-[#151c27]">
              Identity & Business Verification
            </h1>
          </div>
          <p className="text-xs text-[#534434] mt-1 ml-10">
            Authoritative compliance review queue for personal blue badges and verified business yellow badges.
          </p>
        </div>

        <button
          onClick={() => {
            loadOverview();
            loadQueue();
          }}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-[#e2e8f8] rounded-xl hover:bg-slate-50 transition shadow-xs self-start"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh Queue
        </button>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total</span>
          <span className="text-xl font-bold text-slate-900 mt-0.5 block">{overview.total}</span>
        </div>
        <div className="bg-amber-50/50 p-3.5 rounded-2xl border border-amber-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-amber-800 uppercase tracking-wider block">Pending</span>
          <span className="text-xl font-bold text-amber-900 mt-0.5 block">{overview.pending}</span>
        </div>
        <div className="bg-blue-50/50 p-3.5 rounded-2xl border border-blue-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-blue-800 uppercase tracking-wider block">Reviewing</span>
          <span className="text-xl font-bold text-blue-900 mt-0.5 block">{overview.underReview}</span>
        </div>
        <div className="bg-emerald-50/50 p-3.5 rounded-2xl border border-emerald-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-800 uppercase tracking-wider block">Approved</span>
          <span className="text-xl font-bold text-emerald-900 mt-0.5 block">{overview.approved}</span>
        </div>
        <div className="bg-purple-50/50 p-3.5 rounded-2xl border border-purple-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-purple-800 uppercase tracking-wider block">Info Req</span>
          <span className="text-xl font-bold text-purple-900 mt-0.5 block">{overview.additionalInfoRequired}</span>
        </div>
        <div className="bg-orange-50/50 p-3.5 rounded-2xl border border-orange-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-orange-800 uppercase tracking-wider block">Reverify</span>
          <span className="text-xl font-bold text-orange-900 mt-0.5 block">{overview.reverificationRequired}</span>
        </div>
        <div className="bg-rose-50/50 p-3.5 rounded-2xl border border-rose-200/80 shadow-xs">
          <span className="text-[11px] font-semibold text-rose-800 uppercase tracking-wider block">Rejected</span>
          <span className="text-xl font-bold text-rose-900 mt-0.5 block">{overview.rejected}</span>
        </div>
        <div className="bg-slate-100 p-3.5 rounded-2xl border border-slate-300 shadow-xs">
          <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider block">Suspended</span>
          <span className="text-xl font-bold text-slate-800 mt-0.5 block">{overview.suspended + overview.revoked}</span>
        </div>
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-3xl border border-[#e2e8f8] shadow-sm overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-[#e2e8f8] px-4 pt-3 overflow-x-auto gap-2 text-xs font-semibold">
          {[
            { id: "ALL", label: "All Requests", count: overview.total },
            { id: "PENDING", label: "Pending Review", count: overview.pending },
            { id: "UNDER_REVIEW", label: "Under Review", count: overview.underReview },
            { id: "INFO", label: "Info Required", count: overview.additionalInfoRequired },
            { id: "APPROVED", label: "Approved", count: overview.approved },
            { id: "REVERIFICATION", label: "Reverification", count: overview.reverificationRequired },
            { id: "REJECTED", label: "Rejected", count: overview.rejected },
            { id: "SUSPENDED", label: "Suspended", count: overview.suspended },
            { id: "REVOKED", label: "Revoked", count: overview.revoked },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              className={`pb-3 px-3 transition-colors border-b-2 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600 font-bold"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Filters and Search Bar */}
        <div className="p-4 bg-slate-50/50 border-b border-[#e2e8f8] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-[280px] max-w-md">
            <div className="relative w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search name, username, business, ID..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#e2e8f8] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-[#151c27]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <Filter size={13} />
              <span>Identity:</span>
            </div>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-white border border-[#e2e8f8] rounded-xl px-3 py-1.5 font-medium text-slate-700"
            >
              <option value="ALL">All Identities</option>
              <option value="INDIVIDUAL_IDENTITY">Person (Blue Badge)</option>
              <option value="BUSINESS_IDENTITY">Business (Yellow Badge)</option>
              <option value="BUSINESS_PARTNER">Legacy Partner</option>
            </select>

            <select
              value={selectedCountry}
              onChange={(e) => {
                setSelectedCountry(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-white border border-[#e2e8f8] rounded-xl px-3 py-1.5 font-medium text-slate-700"
            >
              <option value="ALL">All Regions</option>
              <option value="IN">India (IN)</option>
              <option value="US">United States (US)</option>
              <option value="GB">United Kingdom (GB)</option>
              <option value="CA">Canada (CA)</option>
              <option value="AU">Australia (AU)</option>
              <option value="DE">Germany (DE)</option>
              <option value="FR">France (FR)</option>
            </select>
          </div>
        </div>

        {/* Requests Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#e2e8f8] bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Request ID</th>
                <th className="py-3 px-4">Identity</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Badge</th>
                <th className="py-3 px-4">Country</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Submitted</th>
                <th className="py-3 px-4">Reviewer</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e2e8f8] text-xs">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                    <span>Loading verification queue...</span>
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <ShieldCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No verification requests found</p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {searchQuery ? "Try refining your search terms or filters." : "All submissions have been reviewed."}
                    </p>
                  </td>
                </tr>
              ) : (
                items.map((app) => {
                  const isBusiness =
                    app.verification_type === "BUSINESS_IDENTITY" || app.verification_type === "BUSINESS_PARTNER";
                  const displayName = isBusiness
                    ? app.business_identities?.name || app.business_legal_name || "Business Applicant"
                    : `${app.legal_first_name || ""} ${app.legal_last_name || ""}`.trim() ||
                      app.profiles?.full_name ||
                      `@${app.profiles?.username}`;

                  return (
                    <tr key={app.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-500">
                        {app.id.slice(0, 8)}...
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                              isBusiness
                                ? "bg-amber-100 text-amber-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {isBusiness ? <Building2 size={14} /> : <User size={14} />}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1">
                              <span>{displayName}</span>
                              {app.status === "APPROVED" && (
                                <BadgeCheck
                                  size={13}
                                  className={isBusiness ? "text-amber-500" : "text-blue-500"}
                                />
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 block font-mono">
                              @{app.profiles?.username || "user"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            isBusiness
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-blue-50 text-blue-700 border border-blue-200"
                          }`}
                        >
                          {isBusiness ? "Business" : "Person"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 font-semibold text-[11px]">
                          {isBusiness ? (
                            <span className="text-amber-600 flex items-center gap-1">
                              <BadgeCheck size={14} className="text-amber-500" /> Yellow Tick
                            </span>
                          ) : (
                            <span className="text-blue-600 flex items-center gap-1">
                              <BadgeCheck size={14} className="text-blue-500" /> Blue Tick
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-slate-700">{app.residential_country || "GLOBAL"}</span>
                      </td>
                      <td className="py-3.5 px-4">{getStatusBadge(app.status)}</td>
                      <td className="py-3.5 px-4 text-slate-500 text-[11px]">
                        {app.submitted_at
                          ? new Date(app.submitted_at).toLocaleDateString()
                          : new Date(app.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                        {app.assigned_admin?.full_name || app.assigned_admin?.username || "—"}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleInspect(app.id)}
                          className="px-3 py-1.5 rounded-xl bg-[#0058be] text-white font-semibold text-xs hover:bg-[#00469b] transition shadow-xs cursor-pointer inline-flex items-center gap-1"
                        >
                          <Eye size={12} /> Review
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-[#e2e8f8] flex items-center justify-between text-xs text-slate-500">
          <span>
            Showing {items.length} of {total} verification requests
          </span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 border border-[#e2e8f8] rounded-lg disabled:opacity-40 hover:bg-slate-50 font-medium"
            >
              Previous
            </button>
            <button
              disabled={items.length < 15 || page * 15 >= total}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 border border-[#e2e8f8] rounded-lg disabled:opacity-40 hover:bg-slate-50 font-medium"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* INSPECT DETAIL MODAL */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl shadow-2xl border border-[#e2e8f8] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#e2e8f8] flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-xs ${
                    selectedApp.verification_type === "BUSINESS_IDENTITY" ||
                    selectedApp.verification_type === "BUSINESS_PARTNER"
                      ? "bg-amber-500"
                      : "bg-blue-600"
                  }`}
                >
                  {selectedApp.verification_type === "BUSINESS_IDENTITY" ||
                  selectedApp.verification_type === "BUSINESS_PARTNER" ? (
                    <Building2 size={20} />
                  ) : (
                    <User size={20} />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 font-heading">
                      {selectedApp.verification_type === "BUSINESS_IDENTITY" ||
                      selectedApp.verification_type === "BUSINESS_PARTNER"
                        ? selectedApp.business_identities?.name || selectedApp.business_legal_name || "Business Review"
                        : `${selectedApp.legal_first_name || ""} ${selectedApp.legal_last_name || ""}`.trim() ||
                          "Personal Identity Review"}
                    </h2>
                    {getStatusBadge(selectedApp.status)}
                  </div>
                  <p className="text-xs text-slate-500 font-mono">
                    ID: {selectedApp.id} · Applicant: @{selectedApp.profiles?.username || "unknown"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedApp(null)}
                className="w-8 h-8 rounded-full hover:bg-slate-200/60 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Submission Information Grid */}
              {selectedApp.verification_type === "BUSINESS_IDENTITY" || selectedApp.verification_type === "BUSINESS_PARTNER" ? (
                <div className="space-y-4">
                  {/* Grid 1: Identity & Registration */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Business Identity */}
                    <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 size={14} className="text-amber-500" /> Business Identity
                      </h3>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Display Name:</span>
                          <span className="font-semibold text-slate-800">
                            {selectedApp.business_identities?.name || selectedApp.verified_name || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Legal Business Name:</span>
                          <span className="font-semibold text-slate-800">
                            {selectedApp.business_legal_name || selectedApp.business_identities?.legal_name || "—"}
                          </span>
                        </div>
                        {selectedApp.business_type && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Entity Type:</span>
                            <span className="font-semibold text-slate-800">
                              {selectedApp.business_type.replace(/_/g, " ")}
                            </span>
                          </div>
                        )}
                        {selectedApp.business_category && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Category:</span>
                            <span className="font-semibold text-slate-800">{selectedApp.business_category}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-slate-500">Country:</span>
                          <span className="font-semibold text-slate-800">{selectedApp.residential_country}</span>
                        </div>
                        {selectedApp.website_url && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Official Website:</span>
                            <a
                              href={selectedApp.website_url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-blue-600 hover:underline truncate max-w-[200px]"
                            >
                              {selectedApp.website_url}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Registration Details */}
                    <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <FileCheck2 size={14} className="text-amber-500" /> Registration &amp; Identifiers
                      </h3>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Identifier Type:</span>
                          <span className="font-semibold text-slate-800">
                            {selectedApp.registration_identifier_type || "REGISTRATION_NUMBER"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Identifier Number:</span>
                          <span className="font-mono font-bold text-slate-800">
                            {selectedApp.registration_number || "—"}
                          </span>
                        </div>
                        {selectedApp.registration_authority && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Authority:</span>
                            <span className="font-semibold text-slate-800">{selectedApp.registration_authority}</span>
                          </div>
                        )}
                        {selectedApp.registration_state && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">State / Region:</span>
                            <span className="font-semibold text-slate-800">{selectedApp.registration_state}</span>
                          </div>
                        )}
                        {selectedApp.registration_date && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Registration Date:</span>
                            <span className="font-mono text-slate-800">
                              {new Date(selectedApp.registration_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {selectedApp.tax_identifier && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Tax Identifier:</span>
                            <span className="font-mono text-slate-800">{selectedApp.tax_identifier}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Grid 2: Address & Representative */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Registered Address & Contact */}
                    <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin size={14} className="text-amber-500" /> Registered Address &amp; Contact
                      </h3>
                      <div className="space-y-1.5 text-xs">
                        <div>
                          <span className="text-slate-500 block text-[11px]">Address:</span>
                          <span className="font-semibold text-slate-800 block">
                            {selectedApp.registered_address
                              ? `${selectedApp.registered_address}${selectedApp.address_line2 ? `, ${selectedApp.address_line2}` : ""}, ${selectedApp.city || ""}, ${selectedApp.state_province || ""} ${selectedApp.postal_code || ""}`
                              : "—"}
                          </span>
                        </div>
                        {selectedApp.contact_email && (
                          <div className="flex justify-between pt-1">
                            <span className="text-slate-500">Contact Email:</span>
                            <span className="font-semibold text-slate-800">{selectedApp.contact_email}</span>
                          </div>
                        )}
                        {selectedApp.contact_phone && (
                          <div className="flex justify-between">
                            <span className="text-slate-500">Contact Phone:</span>
                            <span className="font-semibold text-slate-800">{selectedApp.contact_phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Authorized Representative */}
                    <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <UserCheck size={14} className="text-amber-500" /> Authorized Representative
                      </h3>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Representative Name:</span>
                          <span className="font-semibold text-slate-800">
                            {selectedApp.representative_name || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Role / Position:</span>
                          <span className="font-semibold text-slate-800">
                            {selectedApp.representative_role || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Relationship:</span>
                          <span className="font-semibold text-slate-800">
                            {selectedApp.representative_relationship || "OWNER"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Submitted By:</span>
                          <span className="font-mono text-slate-800">@{selectedApp.profiles?.username || "user"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Legal Declaration:</span>
                          <span className="font-semibold text-emerald-700">
                            {selectedApp.declaration_confirmed ? "Confirmed & Authorized" : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Review Timeline Card */}
                  <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock size={14} className="text-blue-600" /> Review Timeline &amp; Status
                    </h3>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Submitted:</span>
                        <span className="text-slate-800 font-mono">
                          {selectedApp.submitted_at
                            ? new Date(selectedApp.submitted_at).toLocaleString()
                            : "Draft"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Assigned Reviewer:</span>
                        <span className="font-semibold text-slate-800">
                          {selectedApp.assigned_admin?.full_name || selectedApp.assigned_admin?.username || "Unassigned"}
                        </span>
                      </div>
                      {selectedApp.user_facing_reason && (
                        <div className="pt-2 border-t border-slate-200/60">
                          <span className="text-slate-500 block text-[11px]">User Facing Note:</span>
                          <span className="font-medium text-amber-900 text-xs block mt-0.5">
                            {selectedApp.user_facing_reason}
                          </span>
                        </div>
                      )}
                      {selectedApp.admin_internal_notes && (
                        <div className="pt-1.5 border-t border-slate-200/60">
                          <span className="text-slate-500 block text-[11px]">Admin Internal Note:</span>
                          <span className="font-mono text-slate-800 text-[11px] block mt-0.5">
                            {selectedApp.admin_internal_notes}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-blue-600" /> Identity Information
                    </h3>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Identity Type:</span>
                        <span className="font-semibold text-slate-800">Person (Blue Badge Target)</span>
                      </div>
                      {selectedApp.legal_first_name && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Legal Name:</span>
                          <span className="font-semibold text-slate-800">
                            {selectedApp.legal_first_name} {selectedApp.legal_last_name}
                          </span>
                        </div>
                      )}
                      {selectedApp.date_of_birth && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Date of Birth:</span>
                          <span className="font-mono text-slate-800">{selectedApp.date_of_birth}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-slate-500">Country:</span>
                        <span className="font-semibold text-slate-800">{selectedApp.residential_country}</span>
                      </div>
                      {selectedApp.verified_name && (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Authoritative Verified Name:</span>
                          <span className="font-bold text-emerald-700">{selectedApp.verified_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-50/60 p-4 rounded-2xl border border-slate-200/80 space-y-3">
                    <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock size={14} className="text-blue-600" /> Review Timeline & Status
                    </h3>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Submitted:</span>
                        <span className="text-slate-800 font-mono">
                          {selectedApp.submitted_at
                            ? new Date(selectedApp.submitted_at).toLocaleString()
                            : "Draft"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Assigned Reviewer:</span>
                        <span className="font-semibold text-slate-800">
                          {selectedApp.assigned_admin?.full_name || selectedApp.assigned_admin?.username || "Unassigned"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Reviewed By:</span>
                        <span className="text-slate-800 font-mono">
                          {selectedApp.admin_reviewer?.full_name || selectedApp.admin_reviewer?.username || "—"}
                        </span>
                      </div>
                      {selectedApp.user_facing_reason && (
                        <div className="pt-2 border-t border-slate-200/60">
                          <span className="text-slate-500 block text-[11px]">User Facing Note:</span>
                          <span className="font-medium text-amber-900 text-xs block mt-0.5">
                            {selectedApp.user_facing_reason}
                          </span>
                        </div>
                      )}
                      {selectedApp.admin_internal_notes && (
                        <div className="pt-1.5 border-t border-slate-200/60">
                          <span className="text-slate-500 block text-[11px]">Admin Internal Note:</span>
                          <span className="font-mono text-slate-800 text-[11px] block mt-0.5">
                            {selectedApp.admin_internal_notes}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Private Verification Documents */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <Lock size={14} className="text-amber-600" /> Sensitive Identity Evidence ({selectedApp.verification_documents?.length || 0})
                  </h3>
                  <span className="text-[10px] text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full font-mono">
                    Zero-Knowledge Private Storage · Audited Access
                  </span>
                </div>

                {selectedApp.verification_documents?.length === 0 ? (
                  <div className="p-4 bg-amber-50/60 border border-amber-200/60 rounded-2xl text-xs text-amber-800 flex items-center gap-2">
                    <AlertCircle size={15} className="text-amber-600 shrink-0" />
                    <span>No evidence files uploaded with this submission.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedApp.verification_documents?.map((doc: any) => (
                      <div
                        key={doc.id}
                        className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5 font-bold text-slate-800 text-xs truncate">
                            <FileText size={14} className="text-blue-600 shrink-0" />
                            <span className="truncate">{doc.document_type}</span>
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">{doc.original_file_name}</p>
                          {doc.document_number_masked && (
                            <p className="text-[10px] font-mono text-slate-500">
                              Ref: {doc.document_number_masked}
                            </p>
                          )}
                        </div>

                        <button
                          onClick={() => handleViewDocument(doc.id)}
                          disabled={loadingDoc}
                          className="px-3 py-1.5 rounded-xl border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold transition shrink-0 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Eye size={12} /> Inspect
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Audit History Timeline */}
              {selectedApp.audit_events && selectedApp.audit_events.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Verification Audit Trail ({selectedApp.audit_events.length})
                  </h3>
                  <div className="space-y-2 bg-slate-50/60 p-4 rounded-2xl border border-slate-200 max-h-48 overflow-y-auto text-xs">
                    {selectedApp.audit_events.map((evt: any) => (
                      <div key={evt.id} className="flex items-start justify-between gap-3 pb-2 border-b border-slate-200/50 last:border-0 last:pb-0">
                        <div>
                          <span className="font-bold text-slate-800">{evt.action}</span>
                          {evt.reason && <p className="text-slate-500 text-[11px] mt-0.5">{evt.reason}</p>}
                        </div>
                        <span className="text-[10px] font-mono text-slate-400 shrink-0">
                          {new Date(evt.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 bg-slate-50 border-t border-[#e2e8f8] flex flex-wrap items-center justify-between gap-3">
              {/* Left Side: Status / Primary Decisions */}
              <div className="flex flex-wrap items-center gap-2">
                {selectedApp.status === "APPROVED" && (
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-xs font-semibold shadow-xs">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>Status: <strong className="text-emerald-900">Approved & Active</strong></span>
                  </div>
                )}

                {(selectedApp.status === "SUBMITTED" ||
                  selectedApp.status === "UNDER_REVIEW" ||
                  selectedApp.status === "ADDITIONAL_INFORMATION_REQUIRED" ||
                  selectedApp.status === "REVERIFICATION_REQUIRED") && (
                  <>
                    <button
                      onClick={() => setDecisionAction("APPROVE")}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 size={14} /> Approve Verification
                    </button>
                    <button
                      onClick={() => setDecisionAction("REQUEST_INFORMATION")}
                      className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <HelpCircle size={14} /> Request Information
                    </button>
                    <button
                      onClick={() => setDecisionAction("REJECT")}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <XCircle size={14} /> Reject
                    </button>
                  </>
                )}

                {selectedApp.status === "SUSPENDED" && (
                  <>
                    <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-semibold shadow-xs">
                      <Ban size={15} className="text-red-600" />
                      <span>Status: <strong className="text-red-900">Suspended</strong></span>
                    </div>
                    <button
                      onClick={() => setDecisionAction("APPROVE")}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <CheckCircle2 size={14} /> Reactivate (Approve)
                    </button>
                  </>
                )}

                {selectedApp.status === "REJECTED" && (
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold shadow-xs">
                    <XCircle size={15} className="text-rose-600" />
                    <span>Status: <strong className="text-rose-900">Rejected</strong></span>
                  </div>
                )}

                {selectedApp.status === "REVOKED" && (
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold shadow-xs">
                    <Ban size={15} className="text-slate-500" />
                    <span>Status: <strong className="text-slate-800">Revoked</strong></span>
                  </div>
                )}
              </div>

              {/* Right Side: Post-Approval Lifecycle or Navigation Actions */}
              <div className="flex flex-wrap items-center gap-2">
                {selectedApp.status === "APPROVED" && (
                  <>
                    <button
                      onClick={() => setDecisionAction("REQUIRE_REVERIFICATION")}
                      className="px-3 py-2 rounded-xl border border-orange-300 text-orange-800 hover:bg-orange-50 font-semibold text-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw size={13} /> Require Reverification
                    </button>
                    <button
                      onClick={() => setDecisionAction("SUSPEND")}
                      className="px-3 py-2 rounded-xl border border-red-300 text-red-800 hover:bg-red-50 font-semibold text-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Ban size={13} /> Suspend
                    </button>
                    <button
                      onClick={() => setDecisionAction("REVOKE")}
                      className="px-3 py-2 rounded-xl border border-slate-300 text-slate-800 hover:bg-slate-100 font-semibold text-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Ban size={13} /> Revoke
                    </button>
                  </>
                )}

                {selectedApp.status === "REVERIFICATION_REQUIRED" && (
                  <>
                    <button
                      onClick={() => setDecisionAction("SUSPEND")}
                      className="px-3 py-2 rounded-xl border border-red-300 text-red-800 hover:bg-red-50 font-semibold text-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Ban size={13} /> Suspend
                    </button>
                    <button
                      onClick={() => setDecisionAction("REVOKE")}
                      className="px-3 py-2 rounded-xl border border-slate-300 text-slate-800 hover:bg-slate-100 font-semibold text-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Ban size={13} /> Revoke
                    </button>
                  </>
                )}

                {selectedApp.status === "SUSPENDED" && (
                  <>
                    <button
                      onClick={() => setDecisionAction("REQUIRE_REVERIFICATION")}
                      className="px-3 py-2 rounded-xl border border-orange-300 text-orange-800 hover:bg-orange-50 font-semibold text-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw size={13} /> Require Reverification
                    </button>
                    <button
                      onClick={() => setDecisionAction("REVOKE")}
                      className="px-3 py-2 rounded-xl border border-slate-300 text-slate-800 hover:bg-slate-100 font-semibold text-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <Ban size={13} /> Revoke
                    </button>
                  </>
                )}

                <button
                  onClick={() => setSelectedApp(null)}
                  className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 font-semibold text-xs transition cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DECISION CONFIRMATION MODAL */}
      {decisionAction && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 font-heading flex items-center gap-2">
                <ShieldCheck size={18} className="text-blue-600" />
                Confirm Decision: {decisionAction.replace(/_/g, " ")}
              </h3>
              <button
                onClick={() => setDecisionAction(null)}
                className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400"
              >
                <X size={16} />
              </button>
            </div>

            {decisionAction === "REJECT" && (
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Rejection Category
                </label>
                <select
                  value={rejectionCategory}
                  onChange={(e) => setRejectionCategory(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white font-medium"
                >
                  <option value="INSUFFICIENT_INFORMATION">Insufficient Information</option>
                  <option value="DOCUMENT_INVALID">Document Invalid or Expired</option>
                  <option value="DOCUMENT_UNREADABLE">Document Image Unreadable / Blurred</option>
                  <option value="IDENTITY_MISMATCH">Identity Name Mismatch</option>
                  <option value="BUSINESS_INFORMATION_MISMATCH">Business Information Mismatch</option>
                  <option value="DUPLICATE_REQUEST">Duplicate Request</option>
                  <option value="POLICY_REASON">Platform Policy Compliance</option>
                  <option value="OTHER">Other Reason</option>
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                {decisionAction === "REQUEST_INFORMATION"
                  ? "Information / Evidence Requested from Applicant *"
                  : "User-Facing Note / Explanation"}
              </label>
              <textarea
                rows={3}
                required={decisionAction === "REQUEST_INFORMATION"}
                placeholder={
                  decisionAction === "REQUEST_INFORMATION"
                    ? "e.g. Please provide a clear color scan of your government-issued ID."
                    : "Safe reason visible to applicant in their verification status..."
                }
                value={userFacingReason}
                onChange={(e) => setUserFacingReason(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Admin Internal Notes (Private to Admin Team)
              </label>
              <textarea
                rows={2}
                placeholder="Internal compliance rationale, risk factors, or cross-checks..."
                value={adminInternalNotes}
                onChange={(e) => setAdminInternalNotes(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 p-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 font-mono text-[11px]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDecisionAction(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submittingDecision || (decisionAction === "REQUEST_INFORMATION" && !userFacingReason.trim())}
                onClick={handleExecuteDecision}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs disabled:opacity-50 flex items-center gap-1.5"
              >
                {submittingDecision && <RefreshCw size={13} className="animate-spin" />}
                Confirm & Submit Decision
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-70 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Lock size={15} className="text-amber-600" />
                <span className="text-xs font-bold text-slate-800">
                  Secure Document View ({previewDoc.type})
                </span>
                <span className="text-[10px] text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full font-mono">
                  Expires in {previewDoc.expiresIn}s
                </span>
              </div>
              <button
                onClick={() => setPreviewDoc(null)}
                className="w-7 h-7 rounded-full hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X size={16} />
              </button>
            </div>
            <div className="flex-1 p-6 flex items-center justify-center bg-slate-950 overflow-auto">
              <img
                src={previewDoc.url}
                alt="Sensitive Document"
                className="max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
