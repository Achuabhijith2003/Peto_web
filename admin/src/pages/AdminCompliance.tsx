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
  Download,
  History,
  Monitor,
  Tablet,
  Smartphone,
  X,
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
  updatePolicyDraft,
  getAdminPolicyPdfUrl,
  downloadAdminPolicyPdf,
  fetchDataRequests,
  updateDataRequestStatus,
  createDataRequest,
  fetchRetentionPolicies,
  updateRetentionPolicy,
  fetchComplianceAuditLogs,
} from "../api/adminApi";
import { useAdminAuth } from "../context/AdminAuthContext";
import { PolicyRenderer } from "../components/compliance/PolicyRenderer";
import { PolicyEditorModal } from "../components/compliance/PolicyEditorModal";
import { PublishConfirmModal } from "../components/compliance/PublishConfirmModal";
import { PolicyHistoryModal } from "../components/compliance/PolicyHistoryModal";


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
  const [viewingViewport, setViewingViewport] = useState<"desktop" | "tablet" | "mobile">("desktop");
  
  const [isEditorModalOpen, setIsEditorModalOpen] = useState<boolean>(false);
  const [selectedPolicyForEditor, setSelectedPolicyForEditor] = useState<CompliancePolicyItem | null>(null);

  const [isPublishModalOpen, setIsPublishModalOpen] = useState<boolean>(false);
  const [selectedPolicyForPublish, setSelectedPolicyForPublish] = useState<CompliancePolicyItem | null>(null);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [selectedPolicyForHistory, setSelectedPolicyForHistory] = useState<CompliancePolicyItem | null>(null);


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

  // DATA LOADERS
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

  // POLICY ACTIONS
  const handleSaveDraft = async (data: {
    id?: string;
    policyType: CompliancePolicyType;
    title: string;
    version: string;
    content: string;
    summaryOfChanges?: string;
    effectiveDate?: string;
    regionCode?: string;
    requiresAcknowledgement?: boolean;
  }) => {
    try {
      setActionLoading(true);
      if (data.id && data.id !== "temp-id") {
        await updatePolicyDraft(data.id, {
          title: data.title,
          version: data.version,
          content: data.content,
          summaryOfChanges: data.summaryOfChanges,
          effectiveDate: data.effectiveDate,
          regionCode: data.regionCode,
          requiresAcknowledgement: data.requiresAcknowledgement,
        });
        showNotification("success", `Updated draft for ${data.title} (v${data.version})`);
      } else {
        await createPolicyDraft({
          policyType: data.policyType,
          title: data.title,
          version: data.version,
          content: data.content,
          summaryOfChanges: data.summaryOfChanges,
        });
        showNotification("success", `Created draft for ${data.title} (v${data.version})`);
      }
      setIsEditorModalOpen(false);
      setSelectedPolicyForEditor(null);
      loadPolicies();
    } catch (err: any) {
      showNotification("error", err.response?.data?.message || "Failed to save draft.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmPublish = async (policyId: string, _effectiveDate?: string) => {
    try {
      setActionLoading(true);
      await publishPolicy(policyId);
      showNotification("success", "Policy revision published successfully! Web & Mobile clients updated.");
      setIsPublishModalOpen(false);
      setSelectedPolicyForPublish(null);
      loadPolicies();
    } catch (err: any) {
      showNotification("error", err.response?.data?.message || "Failed to publish policy.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadPdf = async (policy: CompliancePolicyItem) => {
    try {
      const filename = `peto-${policy.slug || policy.policy_type.toLowerCase().replace(/_/g, "-")}-v${policy.version}.pdf`;
      await downloadAdminPolicyPdf(policy.id, filename);
    } catch (err) {
      console.warn("Direct blob download failed, falling back to authenticated URL", err);
      window.open(getAdminPolicyPdfUrl(policy.id), "_blank");
    }
  };



  // DATA REQUEST ACTIONS
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

  // RETENTION ACTIONS
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

  // STATUS BADGES
  const renderStatusBadge = (status: CompliancePolicyStatus | DataRequestStatus) => {
    switch (status) {
      case "PUBLISHED":
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#bbf7d0]/40 text-[#006c49] border border-[#006c49]/30">
            <CheckCircle2 size={12} />
            {status}
          </span>
        );
      case "DRAFT":
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ffe082]/40 text-[#855300] border border-[#855300]/30">
            <Clock size={12} />
            {status}
          </span>
        );
      case "PROCESSING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#f0f3ff] text-[#0058be] border border-[#dae2f3]">
            <RefreshCw size={12} className="animate-spin" />
            {status}
          </span>
        );
      case "ARCHIVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#f0f3ff] text-[#534434] border border-[#dae2f3]">
            <Archive size={12} />
            {status}
          </span>
        );
      case "SUPERSEDED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-300">
            <Archive size={12} />
            SUPERSEDED
          </span>
        );
      case "APPROVED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#bbf7d0]/40 text-[#006c49] border border-[#006c49]/30">
            <CheckCircle2 size={12} />
            APPROVED
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#ffdad6]/40 text-[#ba1a1a] border border-[#ffdad6]">
            <AlertTriangle size={12} />
            {status}
          </span>
        );

      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#f0f3ff] text-[#534434] border border-[#dae2f3]">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-[#e2e8f8] shadow-level-1">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-[#0058be] text-white shadow-sm">
              <Scale className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-heading text-[#151c27] tracking-tight flex items-center gap-3">
                Compliance & Legal Management
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#bbf7d0]/40 text-[#006c49] border border-[#006c49]/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#006c49] animate-pulse" />
                  Operational
                </span>
              </h1>
              <p className="text-xs text-[#534434]">
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
            className="px-3.5 py-2 rounded-xl bg-white hover:bg-[#f9f9ff] text-[#534434] text-xs font-semibold border border-[#e2e8f8] shadow-sm transition flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            title="Refresh current tab"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-[#0058be]" : ""} />
            <span>Refresh</span>
          </button>

          {canManage && activeTab === "policies" && (
            <button
              onClick={() => {
                setSelectedPolicyForEditor(null);
                setIsEditorModalOpen(true);
              }}
              className="px-4 py-2 rounded-xl bg-[#0058be] hover:bg-[#2170e4] text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus size={14} />
              <span>Create Policy Revision</span>
            </button>
          )}


          {canManage && activeTab === "requests" && (
            <button
              onClick={() => setIsNewRequestModalOpen(true)}
              className="px-4 py-2 rounded-xl bg-[#0058be] hover:bg-[#2170e4] text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
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
          className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-2 border transition shadow-level-1 ${
            bannerMessage.type === "success"
              ? "bg-white border-[#bbf7d0] text-[#006c49]"
              : "bg-white border-[#ffdad6] text-[#ba1a1a]"
          }`}
        >
          {bannerMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
          <span>{bannerMessage.text}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-[#e2e8f8] gap-2">
        <button
          onClick={() => setActiveTab("policies")}
          className={`px-4 py-3 text-xs font-semibold font-heading flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeTab === "policies"
              ? "border-[#0058be] text-[#0058be] bg-[#f0f3ff]"
              : "border-transparent text-[#534434] hover:text-[#151c27]"
          }`}
        >
          <Scale size={15} />
          <span>Policies & Guidelines</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#f0f3ff] text-[#534434] border border-[#dae2f3]">
            {policies.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("requests")}
          className={`px-4 py-3 text-xs font-semibold font-heading flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeTab === "requests"
              ? "border-[#0058be] text-[#0058be] bg-[#f0f3ff]"
              : "border-transparent text-[#534434] hover:text-[#151c27]"
          }`}
        >
          <UserCheck size={15} />
          <span>Data Privacy Requests</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#f0f3ff] text-[#0058be] font-mono border border-[#dae2f3]">
            {requestsTotal}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("retention")}
          className={`px-4 py-3 text-xs font-semibold font-heading flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeTab === "retention"
              ? "border-[#0058be] text-[#0058be] bg-[#f0f3ff]"
              : "border-transparent text-[#534434] hover:text-[#151c27]"
          }`}
        >
          <Clock size={15} />
          <span>Data Retention Schedule</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#f0f3ff] text-[#534434] border border-[#dae2f3]">
            {retentionPolicies.length || 6}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`px-4 py-3 text-xs font-semibold font-heading flex items-center gap-2 border-b-2 transition cursor-pointer ${
            activeTab === "audit"
              ? "border-[#0058be] text-[#0058be] bg-[#f0f3ff]"
              : "border-transparent text-[#534434] hover:text-[#151c27]"
          }`}
        >
          <FileText size={15} />
          <span>Compliance Audit Trail</span>
        </button>
      </div>

      {/* TAB 1: POLICIES & GUIDELINES */}
      {activeTab === "policies" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#e2e8f8] shadow-level-1">
            <div className="flex items-center gap-2">
              <Filter size={14} className="text-[#534434]" />
              <span className="text-xs text-[#534434] font-semibold font-heading">Policy Type:</span>
              <select
                value={selectedPolicyType}
                onChange={(e) => setSelectedPolicyType(e.target.value)}
                className="bg-[#f0f3ff] border border-[#dae2f3] rounded-xl px-3 py-1.5 text-xs text-[#151c27] focus:outline-none focus:bg-white focus:border-[#0058be]"
              >
                <option value="ALL">All Policies</option>
                {Object.entries(POLICY_TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>

              <span className="text-xs text-[#534434] font-semibold font-heading ml-2">Status:</span>
              <select
                value={selectedPolicyStatus}
                onChange={(e) => setSelectedPolicyStatus(e.target.value)}
                className="bg-[#f0f3ff] border border-[#dae2f3] rounded-xl px-3 py-1.5 text-xs text-[#151c27] focus:outline-none focus:bg-white focus:border-[#0058be]"
              >
                <option value="ALL">All Statuses</option>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>

            <div className="text-xs text-[#534434]">
              Showing <span className="font-bold text-[#151c27]">{policies.length}</span> documents
            </div>
          </div>

          {/* Policies Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {policies.map((p) => {
              const slug = p.slug || p.policy_type.toLowerCase().replace(/_/g, "-");
              const isDraft = p.status === "DRAFT";

              return (
                <div
                  key={p.id}
                  className="bg-white hover:shadow-level-2 border border-[#e2e8f8] rounded-2xl p-5 transition flex flex-col justify-between space-y-4 shadow-level-1"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-[#0058be] font-bold">
                          {POLICY_TYPE_LABELS[p.policy_type] || p.policy_type}
                        </span>
                        <h3 className="text-base font-bold font-heading text-[#151c27] tracking-tight mt-0.5">
                          {p.title}
                        </h3>
                      </div>
                      {renderStatusBadge(p.status)}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#534434] my-2">
                      <span className="px-2 py-0.5 rounded-full bg-[#f0f3ff] font-mono text-[11px] text-[#0058be] font-semibold border border-[#dae2f3]">
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
                      <p className="text-xs text-[#151c27] bg-[#f9f9ff] p-3 rounded-xl border border-[#e2e8f8] line-clamp-2">
                        <span className="font-semibold text-[#534434]">Notes:</span> {p.summary_of_changes}
                      </p>
                    )}

                    <div className="flex items-center justify-between text-[11px] text-[#534434] mt-3 pt-2 border-t border-[#f0f3ff]">
                      <span className="font-mono text-[#0058be] flex items-center gap-1">
                        /{slug}
                      </span>
                      {p.effective_date && (
                        <span>
                          Effective: {new Date(p.effective_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#e2e8f8] flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => {
                          setViewingPolicy(p);
                          setViewingViewport("desktop");
                        }}
                        className="px-3 py-1.5 rounded-xl bg-[#f0f3ff] hover:bg-[#e2e8f8] text-[#151c27] text-xs font-semibold transition flex items-center gap-1 border border-[#dae2f3] cursor-pointer"
                        title="Live Final-User Preview"
                      >
                        <Eye size={13} />
                        <span>Preview</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadPdf(p)}
                        className="p-1.5 rounded-xl bg-[#f0f3ff] hover:bg-[#e2e8f8] text-[#0058be] border border-[#dae2f3] transition cursor-pointer"
                        title="Download Policy PDF"
                      >
                        <Download size={14} />
                      </button>

                      <button
                        onClick={() => {
                          setSelectedPolicyForHistory(p);
                          setIsHistoryModalOpen(true);
                        }}
                        className="p-1.5 rounded-xl bg-[#f0f3ff] hover:bg-[#e2e8f8] text-[#534434] hover:text-[#151c27] border border-[#dae2f3] transition cursor-pointer"
                        title="Version History & Rollback"
                      >
                        <History size={14} />
                      </button>
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-1.5">
                        {isDraft ? (
                          <>
                            <button
                              onClick={() => {
                                setSelectedPolicyForEditor(p);
                                setIsEditorModalOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-[#f0f3ff] hover:bg-[#e2e8f8] text-[#0058be] text-xs font-semibold border border-[#dae2f3] transition flex items-center gap-1 cursor-pointer"
                            >
                              <Edit3 size={12} />
                              <span>Edit</span>
                            </button>
                            <button
                              onClick={() => {
                                setSelectedPolicyForPublish(p);
                                setIsPublishModalOpen(true);
                              }}
                              disabled={actionLoading}
                              className="px-3.5 py-1.5 rounded-xl bg-[#006c49] hover:bg-[#00553a] text-white text-xs font-semibold transition flex items-center gap-1 shadow-sm disabled:opacity-50 cursor-pointer"
                            >
                              <Send size={12} />
                              <span>Publish</span>
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => {
                              const [major, minor] = p.version.split(".").map(Number);
                              const nextVer = `${major || 1}.${(minor || 0) + 1}.0`;
                              setSelectedPolicyForEditor({
                                ...p,
                                id: "", // Treat as new revision
                                version: nextVer,
                                summary_of_changes: `Updated revision from v${p.version}`,
                                status: "DRAFT",
                              });
                              setIsEditorModalOpen(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-[#f0f3ff] hover:bg-[#e2e8f8] text-[#0058be] text-xs font-semibold border border-[#dae2f3] transition flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 size={12} />
                            <span>New Version</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* TAB 2: DATA PRIVACY REQUESTS */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          {/* Request Filters & Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-white border border-[#e2e8f8] p-4 rounded-2xl shadow-level-1">
              <span className="text-xs font-semibold font-heading text-[#534434]">Total Privacy Requests</span>
              <div className="text-2xl font-bold text-[#151c27] font-mono mt-1">{requestsTotal}</div>
            </div>
            <div className="bg-white border border-[#e2e8f8] p-4 rounded-2xl shadow-level-1">
              <span className="text-xs font-semibold font-heading text-[#855300]">Pending Review</span>
              <div className="text-2xl font-bold text-[#855300] font-mono mt-1">
                {dataRequests.filter((r) => r.status === "PENDING").length}
              </div>
            </div>
            <div className="bg-white border border-[#e2e8f8] p-4 rounded-2xl shadow-level-1">
              <span className="text-xs font-semibold font-heading text-[#0058be]">In Processing</span>
              <div className="text-2xl font-bold text-[#0058be] font-mono mt-1">
                {dataRequests.filter((r) => r.status === "PROCESSING").length}
              </div>
            </div>
            <div className="bg-white border border-[#e2e8f8] p-4 rounded-2xl shadow-level-1">
              <span className="text-xs font-semibold font-heading text-[#006c49]">Completed & Satisfied</span>
              <div className="text-2xl font-bold text-[#006c49] font-mono mt-1">
                {dataRequests.filter((r) => r.status === "COMPLETED").length}
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-[#e2e8f8] shadow-level-1">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-3 text-[#534434]/60" />
                <input
                  type="text"
                  placeholder="Search requests..."
                  value={requestSearch}
                  onChange={(e) => setRequestSearch(e.target.value)}
                  className="bg-[#f0f3ff] border border-[#dae2f3] rounded-xl pl-9 pr-3 py-2 text-xs text-[#151c27] placeholder-[#534434]/60 focus:outline-none focus:bg-white focus:border-[#0058be] w-52"
                />
              </div>

              <select
                value={requestStatusFilter}
                onChange={(e) => setRequestStatusFilter(e.target.value)}
                className="bg-[#f0f3ff] border border-[#dae2f3] rounded-xl px-3 py-2 text-xs text-[#151c27] focus:outline-none focus:bg-white focus:border-[#0058be]"
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
                className="bg-[#f0f3ff] border border-[#dae2f3] rounded-xl px-3 py-2 text-xs text-[#151c27] focus:outline-none focus:bg-white focus:border-[#0058be]"
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
          <div className="bg-white rounded-2xl border border-[#e2e8f8] overflow-hidden shadow-level-1">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f0f3ff] text-[#534434] font-bold font-heading uppercase tracking-wider border-b border-[#e2e8f8] text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Request Type</th>
                    <th className="py-3.5 px-4">User</th>
                    <th className="py-3.5 px-4">Verification</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Created Date</th>
                    <th className="py-3.5 px-4">Resolution Notes</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f8] text-[#151c27]">
                  {dataRequests.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-[#534434]">
                        No data privacy requests found.
                      </td>
                    </tr>
                  ) : (
                    dataRequests.map((r) => (
                      <tr key={r.id} className="hover:bg-[#f9f9ff] transition">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#151c27]">
                            {REQUEST_TYPE_LABELS[r.request_type] || r.request_type}
                          </div>
                          <span className="font-mono text-[10px] text-[#534434]">
                            #{r.id.slice(0, 8)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          {r.user ? (
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-[#f0f3ff] text-[#0058be] flex items-center justify-center font-bold text-xs">
                                {r.user.username ? r.user.username[0].toUpperCase() : "U"}
                              </div>
                              <div>
                                <div className="font-semibold text-[#151c27]">
                                  {r.user.full_name || r.user.username}
                                </div>
                                <div className="text-[10px] text-[#534434] font-mono">
                                  @{r.user.username}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <span className="text-[#534434]/70 italic">Unlinked User</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-[#bbf7d0]/40 text-[#006c49] border border-[#006c49]/30">
                            <CheckCircle2 size={10} />
                            {r.verification_status || "VERIFIED"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">{renderStatusBadge(r.status)}</td>
                        <td className="py-3.5 px-4 text-[#534434] font-mono text-[11px]">
                          {new Date(r.created_at).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs truncate text-[#534434]">
                          {r.resolution_notes || r.details || "—"}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {canManage && (
                            <button
                              onClick={() => {
                                setSelectedRequest(r);
                                setProcessStatus(r.status);
                                setProcessNotes(r.resolution_notes || "");
                                setIsProcessModalOpen(true);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-[#0058be] hover:bg-[#2170e4] text-white text-xs font-semibold transition cursor-pointer shadow-sm"
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

      {/* TAB 3: DATA RETENTION SCHEDULE */}
      {activeTab === "retention" && (
        <div className="space-y-4">
          {/* Notice Banner */}
          <div className="p-4 rounded-2xl bg-white border border-[#e2e8f8] shadow-level-1 flex items-start gap-3">
            <div className="p-2 rounded-xl bg-[#f0f3ff] text-[#0058be] shrink-0">
              <Info size={18} />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold font-heading text-[#151c27] tracking-tight">
                Configurable Administrative Data Retention
              </h4>
              <p className="text-xs text-[#534434] leading-relaxed">
                Peto provides administrative retention parameters to coordinate legal preservation requirements (GDPR Art. 17 right to erasure, DSA transparency obligations) with user recovery convenience and operational storage hygiene. Retention intervals are configurable and audited.
              </p>
            </div>
          </div>

          {/* Retention Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {retentionPolicies.map((rp) => (
              <div
                key={rp.category}
                className="bg-white border border-[#e2e8f8] rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-level-1"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#0058be] font-bold">
                        {rp.category}
                      </span>
                      <h3 className="text-base font-bold font-heading text-[#151c27] mt-0.5">{rp.name}</h3>
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
                        rp.auto_purge_enabled
                          ? "bg-[#bbf7d0]/40 text-[#006c49] border-[#006c49]/30"
                          : "bg-[#f0f3ff] text-[#534434] border-[#dae2f3]"
                      }`}
                    >
                      {rp.auto_purge_enabled ? "Auto Purge: ON" : "Manual Purge"}
                    </span>
                  </div>

                  <div className="mt-3 p-3.5 rounded-xl bg-[#f9f9ff] border border-[#e2e8f8]">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-bold font-mono text-[#151c27]">{rp.retention_days}</span>
                      <span className="text-xs text-[#534434] font-medium font-heading">Days Retention</span>
                    </div>
                    <p className="text-xs text-[#151c27] mt-2 leading-relaxed">
                      {rp.description}
                    </p>
                  </div>

                  <div className="mt-3 text-[11px] text-[#534434]">
                    <span className="font-semibold text-[#151c27]">Regulatory Rationale:</span>{" "}
                    {rp.legal_basis}
                  </div>
                </div>

                <div className="pt-3 border-t border-[#e2e8f8] flex items-center justify-between">
                  <span className="text-[10px] text-[#534434] font-mono">
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
                      className="px-3.5 py-1.5 rounded-xl bg-[#f0f3ff] hover:bg-[#e2e8f8] text-[#151c27] text-xs font-semibold border border-[#dae2f3] transition flex items-center gap-1 cursor-pointer"
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

      {/* TAB 4: COMPLIANCE AUDIT TRAIL */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-[#e2e8f8] shadow-level-1">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-[#534434]/60" />
              <input
                type="text"
                placeholder="Search audit actions..."
                value={auditSearch}
                onChange={(e) => setAuditSearch(e.target.value)}
                className="bg-[#f0f3ff] border border-[#dae2f3] rounded-xl pl-9 pr-3 py-2 text-xs text-[#151c27] placeholder-[#534434]/60 focus:outline-none focus:bg-white focus:border-[#0058be] w-64"
              />
            </div>
            <div className="text-xs text-[#534434]">
              Showing compliance-specific audit records
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-[#e2e8f8] overflow-hidden shadow-level-1">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#f0f3ff] text-[#534434] font-bold font-heading uppercase tracking-wider border-b border-[#e2e8f8] text-[11px]">
                  <tr>
                    <th className="py-3.5 px-4">Action</th>
                    <th className="py-3.5 px-4">Resource</th>
                    <th className="py-3.5 px-4">Details</th>
                    <th className="py-3.5 px-4">Responsible Admin</th>
                    <th className="py-3.5 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f8] text-[#151c27]">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[#534434]">
                        No compliance audit entries recorded yet. Sensitive operations like publishing policies or modifying retention schedules automatically log here.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#f9f9ff] transition">
                        <td className="py-3.5 px-4 font-mono font-bold text-[#0058be]">
                          {log.action}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full bg-[#f0f3ff] text-[11px] font-mono text-[#534434] border border-[#dae2f3]">
                            {log.resource_type || "COMPLIANCE"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 max-w-sm">
                          <pre className="text-[11px] text-[#151c27] truncate bg-[#f9f9ff] px-2 py-1 rounded-xl border border-[#e2e8f8] font-mono">
                            {JSON.stringify(log.details || {})}
                          </pre>
                        </td>
                        <td className="py-3.5 px-4 text-[#151c27] font-semibold">
                          {log.admin_user?.full_name || log.admin_user?.username || log.admin_id || "System Admin"}
                        </td>
                        <td className="py-3.5 px-4 text-[#534434] font-mono text-[11px]">
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

      {/* MODAL: ACCURATE FINAL-USER PREVIEW & DOWNLOAD */}
      {viewingPolicy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#151c27]/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white border border-[#e2e8f8] rounded-3xl w-full max-w-5xl h-[92vh] flex flex-col shadow-level-3 overflow-hidden">
            <div className="px-6 py-4 border-b border-[#e2e8f8] flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#f0f3ff] border border-[#dae2f3] text-[#0058be] flex items-center justify-center font-bold">
                  <Eye size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-bold font-heading text-[#151c27]">
                      {viewingPolicy.title}
                    </h3>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#f0f3ff] text-[#0058be] font-mono font-bold border border-[#dae2f3]">
                      v{viewingPolicy.version}
                    </span>
                    {renderStatusBadge(viewingPolicy.status)}
                  </div>
                  <p className="text-xs text-[#534434]">
                    {POLICY_TYPE_LABELS[viewingPolicy.policy_type]} • Route:{" "}
                    <span className="font-mono text-[#0058be]">
                      /policies/{viewingPolicy.slug || viewingPolicy.policy_type.toLowerCase().replace(/_/g, "-")}
                    </span>
                  </p>
                </div>
              </div>

              {/* Viewport switch & actions */}
              <div className="flex items-center gap-2">
                <div className="bg-[#f0f3ff] p-1 rounded-2xl border border-[#dae2f3] flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setViewingViewport("desktop")}
                    className={`p-1.5 rounded-xl text-xs transition ${
                      viewingViewport === "desktop"
                        ? "bg-white text-[#0058be] shadow-sm"
                        : "text-[#534434] hover:text-[#151c27]"
                    }`}
                    title="Desktop Preview"
                  >
                    <Monitor size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingViewport("tablet")}
                    className={`p-1.5 rounded-xl text-xs transition ${
                      viewingViewport === "tablet"
                        ? "bg-white text-[#0058be] shadow-sm"
                        : "text-[#534434] hover:text-[#151c27]"
                    }`}
                    title="Tablet Preview"
                  >
                    <Tablet size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingViewport("mobile")}
                    className={`p-1.5 rounded-xl text-xs transition ${
                      viewingViewport === "mobile"
                        ? "bg-white text-[#0058be] shadow-sm"
                        : "text-[#534434] hover:text-[#151c27]"
                    }`}
                    title="Mobile App Viewport"
                  >
                    <Smartphone size={15} />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleDownloadPdf(viewingPolicy)}
                  className="px-3.5 py-1.5 rounded-xl bg-[#f0f3ff] hover:bg-[#e2e8f8] text-[#0058be] text-xs font-semibold border border-[#dae2f3] transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={13} />
                  <span>Download PDF</span>
                </button>

                <button
                  onClick={() => setViewingPolicy(null)}
                  className="p-2 text-[#534434] hover:text-[#151c27] hover:bg-[#f0f3ff] rounded-xl transition cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-[#f0f3ff]/30 flex justify-center">
              <PolicyRenderer
                title={viewingPolicy.title}
                version={viewingPolicy.version}
                effectiveDate={viewingPolicy.effective_date}
                content={viewingPolicy.content}
                viewport={viewingViewport}
                showToc={viewingViewport === "desktop"}
              />
            </div>
          </div>
        </div>
      )}

      {/* MODAL: POLICY EDITOR (LIVE SPLIT PREVIEW) */}
      <PolicyEditorModal
        isOpen={isEditorModalOpen}
        onClose={() => {
          setIsEditorModalOpen(false);
          setSelectedPolicyForEditor(null);
        }}
        policyToEdit={selectedPolicyForEditor}
        onSaveDraft={handleSaveDraft}
        onOpenPublish={(draft) => {
          setIsEditorModalOpen(false);
          setSelectedPolicyForPublish(draft);
          setIsPublishModalOpen(true);
        }}
        isLoading={actionLoading}
      />

      {/* MODAL: PUBLISH CONFIRMATION WITH PRE-FLIGHT NOTICE */}
      <PublishConfirmModal
        isOpen={isPublishModalOpen}
        onClose={() => {
          setIsPublishModalOpen(false);
          setSelectedPolicyForPublish(null);
        }}
        policy={selectedPolicyForPublish}
        onConfirmPublish={handleConfirmPublish}
        isLoading={actionLoading}
      />

      {/* MODAL: VERSION HISTORY & ROLLBACK */}
      <PolicyHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          setSelectedPolicyForHistory(null);
        }}
        policy={selectedPolicyForHistory}
        onRollbackComplete={() => {
          loadPolicies();
        }}
      />


      {/* MODAL: PROCESS DATA REQUEST */}
      {isProcessModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#151c27]/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white border border-[#e2e8f8] rounded-2xl w-full max-w-lg shadow-level-3 overflow-hidden">
            <div className="p-5 border-b border-[#e2e8f8] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold font-heading text-[#151c27]">Process Privacy Request</h3>
                <p className="text-xs text-[#534434]">
                  Request #{selectedRequest.id.slice(0, 8)} • {REQUEST_TYPE_LABELS[selectedRequest.request_type]}
                </p>
              </div>
              <button
                onClick={() => setIsProcessModalOpen(false)}
                className="text-[#534434] hover:text-[#151c27] text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateProcessStatus} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold font-heading text-[#534434] mb-1">
                  Target User Details
                </label>
                <div className="p-3 bg-[#f9f9ff] rounded-xl border border-[#e2e8f8] text-xs space-y-1">
                  <div className="text-[#151c27] font-bold">
                    {selectedRequest.user?.full_name || selectedRequest.user?.username || "Peto User"}
                  </div>
                  <div className="text-[#534434] font-mono text-[11px]">
                    User ID: {selectedRequest.user_id || "Unspecified"}
                  </div>
                  {selectedRequest.details && (
                    <div className="text-[#151c27] pt-1 border-t border-[#e2e8f8] mt-2">
                      <span className="font-semibold text-[#534434]">User Details:</span> {selectedRequest.details}
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold font-heading text-[#534434] mb-1">
                  Transition Status
                </label>
                <select
                  value={processStatus}
                  onChange={(e) => setProcessStatus(e.target.value as DataRequestStatus)}
                  className="w-full bg-[#f0f3ff] border border-[#dae2f3] rounded-xl px-3 py-2 text-xs text-[#151c27] focus:outline-none focus:bg-white focus:border-[#0058be]"
                >
                  <option value="PENDING">PENDING (Awaiting Review)</option>
                  <option value="PROCESSING">PROCESSING (In Progress)</option>
                  <option value="COMPLETED">COMPLETED (Fulfilled & Dispatched)</option>
                  <option value="REJECTED">REJECTED (Denied / Invalid)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold font-heading text-[#534434] mb-1">
                  Resolution Notes & Audit Remarks
                </label>
                <textarea
                  value={processNotes}
                  onChange={(e) => setProcessNotes(e.target.value)}
                  rows={3}
                  placeholder="e.g. Identity verified via security check. Export package dispatched to user email."
                  className="w-full bg-[#f0f3ff] border border-[#dae2f3] rounded-xl p-3 text-xs text-[#151c27] focus:outline-none focus:bg-white focus:border-[#0058be]"
                />
              </div>

              <div className="pt-3 border-t border-[#e2e8f8] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsProcessModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#f0f3ff] hover:bg-[#e2e8f8] text-[#534434] text-xs font-semibold border border-[#dae2f3] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-[#0058be] hover:bg-[#2170e4] text-white text-xs font-semibold shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? "Updating..." : "Save Status"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: LOG NEW PRIVACY REQUEST */}
      {isNewRequestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#151c27]/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white border border-[#e2e8f8] rounded-2xl w-full max-w-md shadow-level-3 overflow-hidden">
            <div className="p-5 border-b border-[#e2e8f8] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold font-heading text-[#151c27]">Log User Privacy Request</h3>
                <p className="text-xs text-[#534434]">
                  Manually record a privacy or data request received via legal or support channels.
                </p>
              </div>
              <button
                onClick={() => setIsNewRequestModalOpen(false)}
                className="text-[#534434] hover:text-[#151c27] text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDataRequest} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold font-heading text-[#534434] mb-1">
                  User ID (UUID)
                </label>
                <input
                  type="text"
                  value={newRequestForm.userId}
                  onChange={(e) => setNewRequestForm({ ...newRequestForm, userId: e.target.value })}
                  placeholder="e.g. 6d4338e7-f804-49c8-9ec4-0547851b3504"
                  className="w-full bg-[#f0f3ff] border border-[#dae2f3] rounded-xl px-3 py-2 text-xs text-[#151c27] focus:outline-none focus:bg-white focus:border-[#0058be] font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold font-heading text-[#534434] mb-1">
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
                  className="w-full bg-[#f0f3ff] border border-[#dae2f3] rounded-xl px-3 py-2 text-xs text-[#151c27] focus:outline-none focus:bg-white focus:border-[#0058be]"
                >
                  <option value="DATA_ACCESS">Data Access Request</option>
                  <option value="DATA_EXPORT">Data Export Request</option>
                  <option value="ACCOUNT_DELETION">Account Deletion Request</option>
                  <option value="DATA_CORRECTION">Data Correction Request</option>
                  <option value="PRIVACY_REQUEST">General Privacy Request</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold font-heading text-[#534434] mb-1">
                  Request Details / User Notes
                </label>
                <textarea
                  value={newRequestForm.details}
                  onChange={(e) => setNewRequestForm({ ...newRequestForm, details: e.target.value })}
                  rows={3}
                  placeholder="Specify any details, dates, or communication identifiers."
                  className="w-full bg-[#f0f3ff] border border-[#dae2f3] rounded-xl p-3 text-xs text-[#151c27] focus:outline-none focus:bg-white focus:border-[#0058be]"
                />
              </div>

              <div className="pt-3 border-t border-[#e2e8f8] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewRequestModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#f0f3ff] hover:bg-[#e2e8f8] text-[#534434] text-xs font-semibold border border-[#dae2f3] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-[#0058be] hover:bg-[#2170e4] text-white text-xs font-semibold shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  {actionLoading ? "Logging..." : "Create Request"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT RETENTION POLICY */}
      {editingRetention && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#151c27]/40 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white border border-[#e2e8f8] rounded-2xl w-full max-w-md shadow-level-3 overflow-hidden">
            <div className="p-5 border-b border-[#e2e8f8] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold font-heading text-[#151c27]">Configure Retention Schedule</h3>
                <p className="text-xs text-[#534434]">{editingRetention.name}</p>
              </div>
              <button
                onClick={() => setEditingRetention(null)}
                className="text-[#534434] hover:text-[#151c27] text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveRetention} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold font-heading text-[#534434] mb-1">
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
                  className="w-full bg-[#f0f3ff] border border-[#dae2f3] rounded-xl px-3 py-2 text-xs text-[#151c27] focus:outline-none focus:bg-white focus:border-[#0058be] font-mono"
                />
                <span className="text-[10px] text-[#534434]">
                  Approx. {(retentionForm.retentionDays / 30).toFixed(1)} months
                </span>
              </div>

              <div className="flex items-center gap-3 p-3 bg-[#f9f9ff] rounded-xl border border-[#e2e8f8]">
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
                  className="w-4 h-4 rounded text-[#0058be] focus:ring-[#0058be] border-[#dae2f3]"
                />
                <label htmlFor="autoPurgeCheckbox" className="text-xs text-[#151c27] cursor-pointer">
                  <span className="font-bold block text-[#151c27]">Enable Automated Purge Worker</span>
                  <span className="text-[11px] text-[#534434] block">
                    Automatically scrub records older than the retention threshold.
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold font-heading text-[#534434] mb-1">
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
                  className="w-full bg-[#f0f3ff] border border-[#dae2f3] rounded-xl p-3 text-xs text-[#151c27] focus:outline-none focus:bg-white focus:border-[#0058be]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold font-heading text-[#534434] mb-1">
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
                  className="w-full bg-[#f0f3ff] border border-[#dae2f3] rounded-xl px-3 py-2 text-xs text-[#151c27] focus:outline-none focus:bg-white focus:border-[#0058be]"
                />
              </div>

              <div className="pt-3 border-t border-[#e2e8f8] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingRetention(null)}
                  className="px-4 py-2 rounded-xl bg-[#f0f3ff] hover:bg-[#e2e8f8] text-[#534434] text-xs font-semibold border border-[#dae2f3] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-[#0058be] hover:bg-[#2170e4] text-white text-xs font-semibold shadow-sm disabled:opacity-50 cursor-pointer"
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
