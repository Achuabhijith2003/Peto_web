import React, { useState, useEffect, useCallback } from "react";
import {
  Scale,
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Search,
  RefreshCw,
  Plus,
  Send,
  Eye,
  Sliders,
  UserCheck,
  Edit3,
  Info,
  Archive,
  Filter,
} from "lucide-react";
import {
  CompliancePolicyItem,
  CompliancePolicyType,
  CompliancePolicyStatus,
  ComplianceDataRequestItem,
  DataRequestType,
  DataRequestStatus,
  ComplianceRetentionPolicyItem,
  AuditLogItem,
} from "../types/admin";
import {
  fetchCompliancePolicies,
  createPolicyDraft,
  publishPolicy,
  fetchDataRequests,
  updateDataRequestStatus,
  createDataRequest,
  fetchRetentionPolicies,
  updateRetentionPolicy,
  fetchComplianceAuditLogs,
} from "../api/adminApi";
import { useAdminAuth } from "../context/AdminAuthContext";

type ActiveTab = "policies" | "requests" | "retention" | "audit";

const POLICY_TYPE_LABELS: Record<CompliancePolicyType, string> = {
  TERMS_OF_SERVICE: "Terms of Service",
  PRIVACY_POLICY: "Privacy Policy",
  COMMUNITY_GUIDELINES: "Community Guidelines",
  CONTENT_POLICY: "Content Policy",
  ADVERTISING_POLICY: "Advertising Policy",
  COOKIE_POLICY: "Cookie Policy",
};

const REQUEST_TYPE_LABELS: Record<DataRequestType, string> = {
  DATA_ACCESS: "Data Access Request",
  DATA_EXPORT: "Data Export Request",
  ACCOUNT_DELETION: "Account Deletion Request",
  DATA_CORRECTION: "Data Correction Request",
  PRIVACY_REQUEST: "General Privacy Request",
};

export const AdminCompliance: React.FC = () => {
  const { hasPermission } = useAdminAuth();
  const canManage = hasPermission("compliance.manage");

  const [activeTab, setActiveTab] = useState<ActiveTab>("policies");
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [bannerMessage, setBannerMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Policies State
  const [policies, setPolicies] = useState<CompliancePolicyItem[]>([]);
  const [selectedPolicyType, setSelectedPolicyType] = useState<string>("ALL");
  const [selectedPolicyStatus, setSelectedPolicyStatus] = useState<string>("ALL");
  const [viewingPolicy, setViewingPolicy] = useState<CompliancePolicyItem | null>(null);
  const [isDraftModalOpen, setIsDraftModalOpen] = useState<boolean>(false);
  const [draftForm, setDraftForm] = useState<{
    policyType: CompliancePolicyType;
    title: string;
    version: string;
    content: string;
    summaryOfChanges: string;
  }>({
    policyType: "TERMS_OF_SERVICE",
    title: "Terms of Service",
    version: "1.1.0",
    content: "",
    summaryOfChanges: "",
  });

  // Data Requests State
  const [dataRequests, setDataRequests] = useState<ComplianceDataRequestItem[]>([]);
  const [requestsTotal, setRequestsTotal] = useState<number>(0);
  const [requestStatusFilter, setRequestStatusFilter] = useState<string>("ALL");
  const [requestTypeFilter, setRequestTypeFilter] = useState<string>("ALL");
  const [requestSearch, setRequestSearch] = useState<string>("");
  const [selectedRequest, setSelectedRequest] = useState<ComplianceDataRequestItem | null>(null);
  const [isProcessModalOpen, setIsProcessModalOpen] = useState<boolean>(false);
  const [processStatus, setProcessStatus] = useState<DataRequestStatus>("PROCESSING");
  const [processNotes, setProcessNotes] = useState<string>("");
  const [isNewRequestModalOpen, setIsNewRequestModalOpen] = useState<boolean>(false);
  const [newRequestForm, setNewRequestForm] = useState<{
    userId: string;
    requestType: DataRequestType;
    details: string;
  }>({
    userId: "",
    requestType: "DATA_EXPORT",
    details: "",
  });

  // Retention Policies State
  const [retentionPolicies, setRetentionPolicies] = useState<ComplianceRetentionPolicyItem[]>([]);
  const [editingRetention, setEditingRetention] = useState<ComplianceRetentionPolicyItem | null>(null);
  const [retentionForm, setRetentionForm] = useState<{
    retentionDays: number;
    autoPurgeEnabled: boolean;
    description: string;
    legalBasis: string;
  }>({
    retentionDays: 30,
    autoPurgeEnabled: false,
    description: "",
    legalBasis: "",
  });

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [auditSearch, setAuditSearch] = useState<string>("");

  const showNotification = (type: "success" | "error", text: string) => {
    setBannerMessage({ type, text });
    setTimeout(() => {
      setBannerMessage(null);
    }, 4000);
  };

  // ----------------------------------------------------
  // DATA LOADERS
  // ----------------------------------------------------

  const loadPolicies = useCallback(async () => {
    try {
      const data = await fetchCompliancePolicies(selectedPolicyType, selectedPolicyStatus);
      setPolicies(data || []);
    } catch (err: any) {
      console.error("Failed to load policies", err);
    }
  }, [selectedPolicyType, selectedPolicyStatus]);

  const loadDataRequests = useCallback(async () => {
    try {
      const res = await fetchDataRequests({
        status: requestStatusFilter,
        requestType: requestTypeFilter,
        search: requestSearch,
        limit: 50,
      });
      setDataRequests(res.requests || []);
      setRequestsTotal(res.pagination?.totalCount || (res.requests ? res.requests.length : 0));
    } catch (err: any) {
      console.error("Failed to load data requests", err);
    }
  }, [requestStatusFilter, requestTypeFilter, requestSearch]);

  const loadRetentionPolicies = useCallback(async () => {
    try {
      const data = await fetchRetentionPolicies();
      setRetentionPolicies(data || []);
    } catch (err: any) {
      console.error("Failed to load retention policies", err);
    }
  }, []);

  const loadAuditLogs = useCallback(async () => {
    try {
      const res = await fetchComplianceAuditLogs({ search: auditSearch, limit: 50 });
      setAuditLogs(res.logs || []);
    } catch (err: any) {
      console.error("Failed to load compliance audit logs", err);
    }
  }, [auditSearch]);

  const refreshCurrentTab = useCallback(async () => {
    setLoading(true);
    if (activeTab === "policies") await loadPolicies();
    else if (activeTab === "requests") await loadDataRequests();
    else if (activeTab === "retention") await loadRetentionPolicies();
    else if (activeTab === "audit") await loadAuditLogs();
    setLoading(false);
  }, [activeTab, loadPolicies, loadDataRequests, loadRetentionPolicies, loadAuditLogs]);

  useEffect(() => {
    refreshCurrentTab();
  }, [refreshCurrentTab]);

  // ----------------------------------------------------
  // POLICY ACTIONS
  // ----------------------------------------------------

  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftForm.title.trim() || !draftForm.version.trim() || !draftForm.content.trim()) {
      showNotification("error", "Title, version, and content are required.");
      return;
    }

    try {
      setActionLoading(true);
      await createPolicyDraft({
        policyType: draftForm.policyType,
        title: draftForm.title,
        version: draftForm.version,
        content: draftForm.content,
        summaryOfChanges: draftForm.summaryOfChanges,
      });
      setIsDraftModalOpen(false);
      showNotification("success", `Created draft for ${draftForm.title} (${draftForm.version})`);
      loadPolicies();
    } catch (err: any) {
      showNotification("error", err.response?.data?.message || "Failed to create policy draft.");
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublishPolicy = async (policy: CompliancePolicyItem) => {
    if (!window.confirm(`Are you sure you want to publish ${policy.title} v${policy.version}? Any prior active version will be archived.`)) {
      return;
    }

    try {
      setActionLoading(true);
      await publishPolicy(policy.id);
      showNotification("success", `Published ${policy.title} v${policy.version}! Previous version archived.`);
      loadPolicies();
    } catch (err: any) {
      showNotification("error", err.response?.data?.message || "Failed to publish policy.");
    } finally {
      setActionLoading(false);
    }
  };

  // ----------------------------------------------------
  // DATA REQUEST ACTIONS
  // ----------------------------------------------------

  const handleUpdateProcessStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    try {
      setActionLoading(true);
      await updateDataRequestStatus(selectedRequest.id, {
        status: processStatus,
        resolutionNotes: processNotes,
      });
      setIsProcessModalOpen(false);
      showNotification("success", `Updated request #${selectedRequest.id.slice(0, 8)} to ${processStatus}`);
      loadDataRequests();
    } catch (err: any) {
      showNotification("error", err.response?.data?.message || "Failed to update request status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateDataRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await createDataRequest({
        userId: newRequestForm.userId.trim() || undefined,
        requestType: newRequestForm.requestType,
        details: newRequestForm.details.trim(),
      });
      setIsNewRequestModalOpen(false);
      setNewRequestForm({ userId: "", requestType: "DATA_EXPORT", details: "" });
      showNotification("success", "New privacy request logged successfully.");
      loadDataRequests();
    } catch (err: any) {
      showNotification("error", err.response?.data?.message || "Failed to log data request.");
    } finally {
      setActionLoading(false);
    }
  };

  // ----------------------------------------------------
  // RETENTION ACTIONS
  // ----------------------------------------------------

  const handleSaveRetention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRetention) return;

    try {
      setActionLoading(true);
      await updateRetentionPolicy(editingRetention.category, {
        retentionDays: retentionForm.retentionDays,
        autoPurgeEnabled: retentionForm.autoPurgeEnabled,
        description: retentionForm.description,
        legalBasis: retentionForm.legalBasis,
      });
      setEditingRetention(null);
      showNotification("success", `Updated retention schedule for ${editingRetention.name}.`);
      loadRetentionPolicies();
    } catch (err: any) {
      showNotification("error", err.response?.data?.message || "Failed to update retention policy.");
    } finally {
      setActionLoading(false);
    }
  };

  // ----------------------------------------------------
  // STATUS BADGES
  // ----------------------------------------------------

  const renderStatusBadge = (status: CompliancePolicyStatus | DataRequestStatus) => {
    switch (status) {
      case "PUBLISHED":
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={12} />
            {status}
          </span>
        );
      case "DRAFT":
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock size={12} />
            {status}
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <RefreshCw size={12} className="animate-spin" />
            {status}
          </span>
        );
      case "ARCHIVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <Archive size={12} />
            {status}
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <AlertTriangle size={12} />
            {status}
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-3">
                Compliance & Legal Management
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Operational
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Administrative governance for policy versioning, GDPR/CCPA privacy requests, data retention, and audit trails.
              </p>
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={refreshCurrentTab}
            disabled={loading}
            className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-medium border border-slate-700/60 transition flex items-center gap-1.5 disabled:opacity-50"
            title="Refresh current tab"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh</span>
          </button>

          {canManage && activeTab === "policies" && (
            <button
              onClick={() => {
                setDraftForm({
                  policyType: "TERMS_OF_SERVICE",
                  title: "Terms of Service",
                  version: "1.1.0",
                  content: "# New Policy Content\n\nEnter markdown here...",
                  summaryOfChanges: "Revised terms for updated feature set.",
                });
                setIsDraftModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-purple-500/20 transition flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Create Policy Draft</span>
            </button>
          )}

          {canManage && activeTab === "requests" && (
            <button
              onClick={() => setIsNewRequestModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition flex items-center gap-1.5"
            >
              <Plus size={14} />
              <span>Log Data Request</span>
            </button>
          )}
        </div>
      </div>

      {/* Notification Banner */}
      {bannerMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs font-medium flex items-center gap-2 border transition ${
            bannerMessage.type === "success"
              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
              : "bg-rose-500/10 text-rose-300 border-rose-500/30"
          }`}
        >
          {bannerMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{bannerMessage.text}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-2">
        <button
          onClick={() => setActiveTab("policies")}
          className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === "policies"
              ? "border-purple-500 text-purple-400 bg-purple-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Scale size={15} />
          <span>Policies & Guidelines</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
            {policies.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("requests")}
          className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === "requests"
              ? "border-purple-500 text-purple-400 bg-purple-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <UserCheck size={15} />
          <span>Data Privacy Requests</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-500/20 text-indigo-300 font-mono">
            {requestsTotal}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("retention")}
          className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === "retention"
              ? "border-purple-500 text-purple-400 bg-purple-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Clock size={15} />
          <span>Data Retention Schedule</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
            {retentionPolicies.length || 6}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`px-4 py-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
            activeTab === "audit"
              ? "border-purple-500 text-purple-400 bg-purple-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <FileText size={15} />
          <span>Compliance Audit Trail</span>
        </button>
      </div>

      {/* ============================================================
          TAB 1: POLICIES & GUIDELINES
          ============================================================ */}
      {activeTab === "policies" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-slate-400" />
              <span className="text-xs text-slate-400 font-medium">Policy Type:</span>
              <select
                value={selectedPolicyType}
                onChange={(e) => setSelectedPolicyType(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">All Policies</option>
                {Object.entries(POLICY_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>

              <span className="text-xs text-slate-400 font-medium ml-2">Status:</span>
              <select
                value={selectedPolicyStatus}
                onChange={(e) => setSelectedPolicyStatus(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            <div className="text-xs text-slate-400">
              Showing <span className="font-semibold text-white">{policies.length}</span> documents
            </div>
          </div>

          {/* Policies Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {policies.map((p) => (
              <div
                key={p.id}
                className="bg-slate-900/50 hover:bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-2xl p-5 transition flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-semibold">
                        {POLICY_TYPE_LABELS[p.policy_type] || p.policy_type}
                      </span>
                      <h3 className="text-base font-bold text-white tracking-tight mt-0.5">
                        {p.title}
                      </h3>
                    </div>
                    {renderStatusBadge(p.status)}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400 my-2">
                    <span className="px-2 py-0.5 rounded bg-slate-800 font-mono text-[11px] text-slate-200 font-semibold border border-slate-700">
                      v{p.version}
                    </span>
                    <span>•</span>
                    <span className="text-[11px]">
                      {p.published_at
                        ? `Published ${new Date(p.published_at).toLocaleDateString()}`
                        : `Drafted ${new Date(p.created_at).toLocaleDateString()}`}
                    </span>
                  </div>

                  {p.summary_of_changes && (
                    <p className="text-xs text-slate-300 bg-slate-800/40 p-2.5 rounded-xl border border-slate-800/60 line-clamp-2">
                      <span className="font-semibold text-slate-400">Notes:</span> {p.summary_of_changes}
                    </p>
                  )}
                </div>

                <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setViewingPolicy(p)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition flex items-center gap-1"
                  >
                    <Eye size={13} />
                    <span>View Text</span>
                  </button>

                  {canManage && (
                    <div className="flex items-center gap-1.5">
                      {p.status === "DRAFT" ? (
                        <button
                          onClick={() => handlePublishPolicy(p)}
                          disabled={actionLoading}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition flex items-center gap-1 shadow-sm disabled:opacity-50"
                        >
                          <Send size={12} />
                          <span>Publish</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            const [major, minor] = p.version.split(".").map(Number);
                            const nextVer = `${major}.${(minor || 0) + 1}.0`;
                            setDraftForm({
                              policyType: p.policy_type,
                              title: p.title,
                              version: nextVer,
                              content: p.content,
                              summaryOfChanges: `Revision updated from v${p.version}`,
                            });
                            setIsDraftModalOpen(true);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 text-xs font-semibold border border-purple-500/30 transition flex items-center gap-1"
                        >
                          <Edit3 size={12} />
                          <span>New Version</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 2: DATA PRIVACY REQUESTS
          ============================================================ */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          {/* Request Filters & Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl">
              <span className="text-xs text-slate-400">Total Privacy Requests</span>
              <div className="text-2xl font-bold text-white mt-1">{requestsTotal}</div>
            </div>
            <div className="bg-amber-500/5 border border-amber-500/20 p-4 rounded-xl">
              <span className="text-xs text-amber-400">Pending Review</span>
              <div className="text-2xl font-bold text-amber-300 mt-1">
                {dataRequests.filter((r) => r.status === "PENDING").length}
              </div>
            </div>
            <div className="bg-cyan-500/5 border border-cyan-500/20 p-4 rounded-xl">
              <span className="text-xs text-cyan-400">In Processing</span>
              <div className="text-2xl font-bold text-cyan-300 mt-1">
                {dataRequests.filter((r) => r.status === "PROCESSING").length}
              </div>
            </div>
            <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-xl">
              <span className="text-xs text-emerald-400">Completed & Satisfied</span>
              <div className="text-2xl font-bold text-emerald-300 mt-1">
                {dataRequests.filter((r) => r.status === "COMPLETED").length}
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 p-3.5 rounded-xl border border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search requests..."
                  value={requestSearch}
                  onChange={(e) => setRequestSearch(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-48"
                />
              </div>

              <select
                value={requestStatusFilter}
                onChange={(e) => setRequestStatusFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="PROCESSING">Processing</option>
                <option value="COMPLETED">Completed</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <select
                value={requestTypeFilter}
                onChange={(e) => setRequestTypeFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none"
              >
                <option value="ALL">All Request Types</option>
                <option value="DATA_ACCESS">Data Access</option>
                <option value="DATA_EXPORT">Data Export</option>
                <option value="ACCOUNT_DELETION">Account Deletion</option>
                <option value="DATA_CORRECTION">Data Correction</option>
                <option value="PRIVACY_REQUEST">Privacy Request</option>
              </select>
            </div>
          </div>

          {/* Requests Table */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Request Type</th>
                    <th className="py-3 px-4">User</th>
                    <th className="py-3 px-4">Verification</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Created Date</th>
                    <th className="py-3 px-4">Resolution Notes</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {dataRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        No data privacy requests found.
                      </td>
                    </tr>
                  ) : (
                    dataRequests.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4">
                          <div className="font-semibold text-white">
                            {REQUEST_TYPE_LABELS[r.request_type] || r.request_type}
                          </div>
                          <span className="font-mono text-[10px] text-slate-500">
                            #{r.id.slice(0, 8)}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {r.user ? (
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold text-[10px]">
                                {r.user.username ? r.user.username[0].toUpperCase() : "U"}
                              </div>
                              <div>
                                <div className="font-medium text-slate-200">
                                  {r.user.full_name || r.user.username}
                                </div>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  @{r.user.username}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">Unlinked User</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 size={10} />
                            {r.verification_status || "VERIFIED"}
                          </span>
                        </td>
                        <td className="py-3 px-4">{renderStatusBadge(r.status)}</td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                          {new Date(r.created_at).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-slate-400">
                          {r.resolution_notes || r.details || "—"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {canManage && (
                            <button
                              onClick={() => {
                                setSelectedRequest(r);
                                setProcessStatus(r.status);
                                setProcessNotes(r.resolution_notes || "");
                                setIsProcessModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-xs font-semibold border border-indigo-500/30 transition"
                            >
                              Process
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 3: DATA RETENTION SCHEDULE
          ============================================================ */}
      {activeTab === "retention" && (
        <div className="space-y-4">
          {/* Notice Banner */}
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 shrink-0">
              <Info size={18} />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white tracking-tight">
                Configurable Administrative Data Retention
              </h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Peto provides administrative retention parameters to coordinate legal preservation requirements (GDPR Art. 17 right to erasure, DSA transparency obligations) with user recovery convenience and operational storage hygiene. Retention intervals are configurable and audited.
              </p>
            </div>
          </div>

          {/* Retention Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {retentionPolicies.map((rp) => (
              <div
                key={rp.category}
                className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-semibold">
                        {rp.category}
                      </span>
                      <h3 className="text-base font-bold text-white mt-0.5">{rp.name}</h3>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        rp.auto_purge_enabled
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}
                    >
                      {rp.auto_purge_enabled ? "Auto Purge: ON" : "Manual Purge"}
                    </span>
                  </div>

                  <div className="mt-3 p-3 rounded-xl bg-slate-800/40 border border-slate-800">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-black text-white">{rp.retention_days}</span>
                      <span className="text-xs text-slate-400 font-medium">Days Retention</span>
                    </div>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      {rp.description}
                    </p>
                  </div>

                  <div className="mt-3 text-[11px] text-slate-400">
                    <span className="font-semibold text-slate-300">Regulatory Rationale:</span>{" "}
                    {rp.legal_basis}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/60 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">
                    Updated: {rp.updated_at ? new Date(rp.updated_at).toLocaleDateString() : "Default"}
                  </span>

                  {canManage && (
                    <button
                      onClick={() => {
                        setEditingRetention(rp);
                        setRetentionForm({
                          retentionDays: rp.retention_days,
                          autoPurgeEnabled: rp.auto_purge_enabled,
                          description: rp.description,
                          legalBasis: rp.legal_basis,
                        });
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition flex items-center gap-1"
                    >
                      <Sliders size={13} />
                      <span>Configure</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 4: COMPLIANCE AUDIT TRAIL
          ============================================================ */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900/40 p-3.5 rounded-xl border border-slate-800">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit actions..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-64"
              />
            </div>
            <div className="text-xs text-slate-400">
              Showing compliance-specific audit records
            </div>
          </div>

          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/60 text-slate-400 font-semibold uppercase tracking-wider border-b border-slate-800 text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Action</th>
                    <th className="py-3 px-4">Resource</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-4">Responsible Admin</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        No compliance audit entries recorded yet. Sensitive operations like publishing policies or modifying retention schedules automatically log here.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-800/30 transition">
                        <td className="py-3 px-4 font-mono font-bold text-purple-300">
                          {log.action}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-mono text-slate-300 border border-slate-700">
                            {log.resource_type || "COMPLIANCE"}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-sm">
                          <pre className="text-[11px] text-slate-300 truncate bg-slate-950/60 px-2 py-1 rounded border border-slate-800 font-mono">
                            {JSON.stringify(log.details || {})}
                          </pre>
                        </td>
                        <td className="py-3 px-4 text-slate-300 font-medium">
                          {log.admin_user?.full_name || log.admin_user?.username || log.admin_id || "System Admin"}
                        </td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: VIEW POLICY TEXT
          ============================================================ */}
      {viewingPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  {viewingPolicy.title}
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono border border-slate-700">
                    v{viewingPolicy.version}
                  </span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {POLICY_TYPE_LABELS[viewingPolicy.policy_type]} • Status: {viewingPolicy.status}
                </p>
              </div>
              <button
                onClick={() => setViewingPolicy(null)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap bg-slate-950/50 select-text">
              {viewingPolicy.content}
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setViewingPolicy(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: CREATE POLICY DRAFT
          ============================================================ */}
      {isDraftModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Create Policy Revision Draft</h3>
                <p className="text-xs text-slate-400">
                  Author a new revision. Drafts remain unpublished until an administrator approves.
                </p>
              </div>
              <button
                onClick={() => setIsDraftModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDraft} className="p-6 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Policy Document Type
                  </label>
                  <select
                    value={draftForm.policyType}
                    onChange={(e) => {
                      const t = e.target.value as CompliancePolicyType;
                      setDraftForm({
                        ...draftForm,
                        policyType: t,
                        title: POLICY_TYPE_LABELS[t],
                      });
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  >
                    {Object.entries(POLICY_TYPE_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Version Code (Semantic)
                  </label>
                  <input
                    type="text"
                    value={draftForm.version}
                    onChange={(e) => setDraftForm({ ...draftForm, version: e.target.value })}
                    placeholder="e.g. 1.1.0"
                    required
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  value={draftForm.title}
                  onChange={(e) => setDraftForm({ ...draftForm, title: e.target.value })}
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Summary of Changes / Release Notes
                </label>
                <input
                  type="text"
                  value={draftForm.summaryOfChanges}
                  onChange={(e) => setDraftForm({ ...draftForm, summaryOfChanges: e.target.value })}
                  placeholder="e.g. Updated Section 3 with regional privacy rights declaration."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Policy Text (Markdown Content)
                </label>
                <textarea
                  value={draftForm.content}
                  onChange={(e) => setDraftForm({ ...draftForm, content: e.target.value })}
                  rows={10}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsDraftModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-500/20 disabled:opacity-50"
                >
                  {actionLoading ? "Saving..." : "Save Draft"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: PROCESS DATA REQUEST
          ============================================================ */}
      {isProcessModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Process Privacy Request</h3>
                <p className="text-xs text-slate-400">
                  Request #{selectedRequest.id.slice(0, 8)} • {REQUEST_TYPE_LABELS[selectedRequest.request_type]}
                </p>
              </div>
              <button
                onClick={() => setIsProcessModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateProcessStatus} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Target User Details
                </label>
                <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-800 text-xs space-y-1">
                  <div className="text-white font-semibold">
                    {selectedRequest.user?.full_name || selectedRequest.user?.username || "Peto User"}
                  </div>
                  <div className="text-slate-400 font-mono text-[11px]">
                    User ID: {selectedRequest.user_id || "Unspecified"}
                  </div>
                  {selectedRequest.details && (
                    <div className="text-slate-300 pt-1 border-t border-slate-700/60 mt-2">
                      <span className="font-semibold text-slate-400">User Details:</span> {selectedRequest.details}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Transition Status
                </label>
                <select
                  value={processStatus}
                  onChange={(e) => setProcessStatus(e.target.value as DataRequestStatus)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="PENDING">PENDING (Awaiting Review)</option>
                  <option value="PROCESSING">PROCESSING (In Progress)</option>
                  <option value="COMPLETED">COMPLETED (Fulfilled & Dispatched)</option>
                  <option value="REJECTED">REJECTED (Denied / Invalid)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Resolution Notes & Audit Remarks
                </label>
                <textarea
                  value={processNotes}
                  onChange={(e) => setProcessNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. Identity verified via security check. Export package dispatched to user email."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProcessModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                >
                  {actionLoading ? "Updating..." : "Save Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: LOG NEW PRIVACY REQUEST
          ============================================================ */}
      {isNewRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Log User Privacy Request</h3>
                <p className="text-xs text-slate-400">
                  Manually record a privacy or data request received via legal or support channels.
                </p>
              </div>
              <button
                onClick={() => setIsNewRequestModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDataRequest} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  User ID (UUID)
                </label>
                <input
                  type="text"
                  value={newRequestForm.userId}
                  onChange={(e) => setNewRequestForm({ ...newRequestForm, userId: e.target.value })}
                  placeholder="e.g. 6d4338e7-f804-49c8-9ec4-0547851b3504"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Request Type
                </label>
                <select
                  value={newRequestForm.requestType}
                  onChange={(e) =>
                    setNewRequestForm({
                      ...newRequestForm,
                      requestType: e.target.value as DataRequestType,
                    })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="DATA_ACCESS">Data Access Request</option>
                  <option value="DATA_EXPORT">Data Export Request</option>
                  <option value="ACCOUNT_DELETION">Account Deletion Request</option>
                  <option value="DATA_CORRECTION">Data Correction Request</option>
                  <option value="PRIVACY_REQUEST">General Privacy Request</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Request Details / User Notes
                </label>
                <textarea
                  value={newRequestForm.details}
                  onChange={(e) => setNewRequestForm({ ...newRequestForm, details: e.target.value })}
                  rows={3}
                  placeholder="Specify any details, dates, or communication identifiers."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewRequestModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 disabled:opacity-50"
                >
                  {actionLoading ? "Logging..." : "Create Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: EDIT RETENTION POLICY
          ============================================================ */}
      {editingRetention && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Configure Retention Schedule</h3>
                <p className="text-xs text-slate-400">{editingRetention.name}</p>
              </div>
              <button
                onClick={() => setEditingRetention(null)}
                className="text-slate-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRetention} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Retention Duration (Days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={3650}
                  value={retentionForm.retentionDays}
                  onChange={(e) =>
                    setRetentionForm({
                      ...retentionForm,
                      retentionDays: Number(e.target.value),
                    })
                  }
                  required
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
                />
                <span className="text-[10px] text-slate-500">
                  Approx. {(retentionForm.retentionDays / 30).toFixed(1)} months
                </span>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-800/40 rounded-xl border border-slate-800">
                <input
                  type="checkbox"
                  id="autoPurgeCheckbox"
                  checked={retentionForm.autoPurgeEnabled}
                  onChange={(e) =>
                    setRetentionForm({
                      ...retentionForm,
                      autoPurgeEnabled: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-500 bg-slate-800 border-slate-700"
                />
                <label htmlFor="autoPurgeCheckbox" className="text-xs text-slate-200 cursor-pointer">
                  <span className="font-semibold block text-white">Enable Automated Purge Worker</span>
                  <span className="text-[11px] text-slate-400 block">
                    Automatically scrub records older than the retention threshold.
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Operational Description
                </label>
                <textarea
                  value={retentionForm.description}
                  onChange={(e) =>
                    setRetentionForm({
                      ...retentionForm,
                      description: e.target.value,
                    })
                  }
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Regulatory & Legal Rationale
                </label>
                <input
                  type="text"
                  value={retentionForm.legalBasis}
                  onChange={(e) =>
                    setRetentionForm({
                      ...retentionForm,
                      legalBasis: e.target.value,
                    })
                  }
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRetention(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                >
                  {actionLoading ? "Saving..." : "Save Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCompliance;
