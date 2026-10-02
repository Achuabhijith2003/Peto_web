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
import { PageHeader } from "../components/layout/PageHeader";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";

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
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={12} /> Approved
          </span>
        );
      case "SUBMITTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock size={12} className="animate-spin" /> Pending Review
          </span>
        );
      case "UNDER_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
            <RefreshCw size={12} className="animate-spin" /> Under Review
          </span>
        );
      case "ADDITIONAL_INFORMATION_REQUIRED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <AlertTriangle size={12} /> Info Requested
          </span>
        );
      case "REVERIFICATION_REQUIRED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
            <RotateCcw size={12} /> Reverification
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <XCircle size={12} /> Rejected
          </span>
        );
      case "SUSPENDED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-destructive/10 text-destructive border border-destructive/20">
            <Ban size={12} /> Suspended
          </span>
        );
      case "REVOKED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
            <Ban size={12} /> Revoked
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Identity & Business Verification"
        description="Authoritative compliance review queue for personal blue badges and verified business yellow badges."
        breadcrumbs={[
          { label: "Trust & Safety", href: "/verifications" },
          { label: "Verification Center" },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              loadOverview();
              loadQueue();
            }}
          >
            <RefreshCw size={14} className={`mr-1.5 ${loading ? "animate-spin" : ""}`} /> Refresh Queue
          </Button>
        }
      />

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <Card className="p-3.5">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Total</span>
          <span className="text-xl font-bold text-foreground mt-0.5 block">{overview.total}</span>
        </Card>
        <Card className="p-3.5 bg-amber-500/5 border-amber-500/20">
          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">Pending</span>
          <span className="text-xl font-bold text-amber-700 dark:text-amber-300 mt-0.5 block">{overview.pending}</span>
        </Card>
        <Card className="p-3.5 bg-primary/5 border-primary/20">
          <span className="text-[11px] font-semibold text-primary uppercase tracking-wider block">Reviewing</span>
          <span className="text-xl font-bold text-primary mt-0.5 block">{overview.underReview}</span>
        </Card>
        <Card className="p-3.5 bg-emerald-500/5 border-emerald-500/20">
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block">Approved</span>
          <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300 mt-0.5 block">{overview.approved}</span>
        </Card>
        <Card className="p-3.5 bg-purple-500/5 border-purple-500/20">
          <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">Info Req</span>
          <span className="text-xl font-bold text-purple-700 dark:text-purple-300 mt-0.5 block">{overview.additionalInfoRequired}</span>
        </Card>
        <Card className="p-3.5 bg-orange-500/5 border-orange-500/20">
          <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider block">Reverify</span>
          <span className="text-xl font-bold text-orange-700 dark:text-orange-300 mt-0.5 block">{overview.reverificationRequired}</span>
        </Card>
        <Card className="p-3.5 bg-rose-500/5 border-rose-500/20">
          <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">Rejected</span>
          <span className="text-xl font-bold text-rose-700 dark:text-rose-300 mt-0.5 block">{overview.rejected}</span>
        </Card>
        <Card className="p-3.5 bg-muted/40">
          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">Suspended</span>
          <span className="text-xl font-bold text-foreground mt-0.5 block">{overview.suspended + overview.revoked}</span>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card className="overflow-hidden">
        {/* Navigation Tabs */}
        <div className="flex border-b border-border px-4 pt-3 overflow-x-auto gap-2 text-xs font-semibold">
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
                  ? "border-primary text-primary font-bold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{tab.label}</span>
              {tab.count > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id
                      ? "bg-primary/10 text-primary font-mono"
                      : "bg-muted text-muted-foreground font-mono"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Filters and Search Bar */}
        <div className="p-4 bg-muted/20 border-b border-border flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-[280px] max-w-md">
            <div className="relative w-full">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search name, username, business, ID..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="pl-9 pr-8 text-xs h-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Filter size={13} />
              <span>Identity:</span>
            </div>
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-background border border-input rounded-xl px-3 py-1.5 font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
              className="text-xs bg-background border border-input rounded-xl px-3 py-1.5 font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Request ID</TableHead>
                <TableHead>Identity</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Badge</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Reviewer</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary mb-2" />
                    <span>Loading verification queue...</span>
                  </TableCell>
                </TableRow>
              ) : items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="py-12 text-center text-muted-foreground">
                    <ShieldCheck className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                    <p className="font-semibold text-foreground">No verification requests found</p>
                    <p className="text-[11px] text-muted-foreground mt-1">
                      {searchQuery ? "Try refining your search terms or filters." : "All submissions have been reviewed."}
                    </p>
                  </TableCell>
                </TableRow>
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
                    <TableRow key={app.id}>
                      <TableCell className="font-mono text-[11px] text-muted-foreground">
                        {app.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                              isBusiness
                                ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                                : "bg-primary/10 text-primary"
                            }`}
                          >
                            {isBusiness ? <Building2 size={14} /> : <User size={14} />}
                          </div>
                          <div>
                            <div className="font-bold text-foreground flex items-center gap-1">
                              <span>{displayName}</span>
                              {app.status === "APPROVED" && (
                                <BadgeCheck
                                  size={13}
                                  className={isBusiness ? "text-amber-500" : "text-primary"}
                                />
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground block font-mono">
                              @{app.profiles?.username || "user"}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            isBusiness
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                              : "bg-primary/10 text-primary border border-primary/20"
                          }`}
                        >
                          {isBusiness ? "Business" : "Person"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 font-semibold text-[11px]">
                          {isBusiness ? (
                            <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1">
                              <BadgeCheck size={14} className="text-amber-500" /> Yellow Tick
                            </span>
                          ) : (
                            <span className="text-primary flex items-center gap-1">
                              <BadgeCheck size={14} className="text-primary" /> Blue Tick
                            </span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium text-foreground">{app.residential_country || "GLOBAL"}</span>
                      </TableCell>
                      <TableCell>{getStatusBadge(app.status)}</TableCell>
                      <TableCell className="text-muted-foreground text-[11px] font-mono">
                        {app.submitted_at
                          ? new Date(app.submitted_at).toLocaleDateString()
                          : new Date(app.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-foreground text-[11px]">
                        {app.assigned_admin?.full_name || app.assigned_admin?.username || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleInspect(app.id)}
                          className="h-7 text-xs px-2.5"
                        >
                          <Eye size={12} className="mr-1" /> Review
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Showing {items.length} of {total} verification requests
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={items.length < 15 || page * 15 >= total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      </Card>

      {/* INSPECT DETAIL MODAL */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground w-full max-w-4xl max-h-[92vh] rounded-2xl shadow-xl border border-border flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex items-center justify-between bg-muted/30">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-primary-foreground shadow-xs ${
                    selectedApp.verification_type === "BUSINESS_IDENTITY" ||
                    selectedApp.verification_type === "BUSINESS_PARTNER"
                      ? "bg-amber-500 text-white"
                      : "bg-primary text-primary-foreground"
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
                    <h2 className="text-base font-bold text-foreground font-heading">
                      {selectedApp.verification_type === "BUSINESS_IDENTITY" ||
                      selectedApp.verification_type === "BUSINESS_PARTNER"
                        ? selectedApp.business_identities?.name || selectedApp.business_legal_name || "Business Review"
                        : `${selectedApp.legal_first_name || ""} ${selectedApp.legal_last_name || ""}`.trim() ||
                          "Personal Identity Review"}
                    </h2>
                    {getStatusBadge(selectedApp.status)}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">
                    ID: {selectedApp.id} · Applicant: @{selectedApp.profiles?.username || "unknown"}
                  </p>
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedApp(null)}
                className="rounded-full"
              >
                <X size={18} />
              </Button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Submission Information Grid */}
              {selectedApp.verification_type === "BUSINESS_IDENTITY" || selectedApp.verification_type === "BUSINESS_PARTNER" ? (
                <div className="space-y-4">
                  {/* Grid 1: Identity & Registration */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Business Identity */}
                    <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-3">
                      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Building2 size={14} className="text-amber-500" /> Business Identity
                      </h3>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Display Name:</span>
                          <span className="font-semibold text-foreground">
                            {selectedApp.business_identities?.name || selectedApp.verified_name || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Legal Business Name:</span>
                          <span className="font-semibold text-foreground">
                            {selectedApp.business_legal_name || selectedApp.business_identities?.legal_name || "—"}
                          </span>
                        </div>
                        {selectedApp.business_type && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Entity Type:</span>
                            <span className="font-semibold text-foreground">
                              {selectedApp.business_type.replace(/_/g, " ")}
                            </span>
                          </div>
                        )}
                        {selectedApp.business_category && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Category:</span>
                            <span className="font-semibold text-foreground">{selectedApp.business_category}</span>
                          </div>
                        )}
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Country:</span>
                          <span className="font-semibold text-foreground">{selectedApp.residential_country}</span>
                        </div>
                        {selectedApp.website_url && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Official Website:</span>
                            <a
                              href={selectedApp.website_url}
                              target="_blank"
                              rel="noreferrer"
                              className="font-semibold text-primary hover:underline truncate max-w-[200px]"
                            >
                              {selectedApp.website_url}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Registration Details */}
                    <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-3">
                      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <FileCheck2 size={14} className="text-amber-500" /> Registration &amp; Identifiers
                      </h3>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Identifier Type:</span>
                          <span className="font-semibold text-foreground">
                            {selectedApp.registration_identifier_type || "REGISTRATION_NUMBER"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Identifier Number:</span>
                          <span className="font-mono font-bold text-foreground">
                            {selectedApp.registration_number || "—"}
                          </span>
                        </div>
                        {selectedApp.registration_authority && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Authority:</span>
                            <span className="font-semibold text-foreground">{selectedApp.registration_authority}</span>
                          </div>
                        )}
                        {selectedApp.registration_state && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">State / Region:</span>
                            <span className="font-semibold text-foreground">{selectedApp.registration_state}</span>
                          </div>
                        )}
                        {selectedApp.registration_date && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Registration Date:</span>
                            <span className="font-mono text-foreground">
                              {new Date(selectedApp.registration_date).toLocaleDateString()}
                            </span>
                          </div>
                        )}
                        {selectedApp.tax_identifier && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Tax Identifier:</span>
                            <span className="font-mono text-foreground">{selectedApp.tax_identifier}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Grid 2: Address & Representative */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Registered Address & Contact */}
                    <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-3">
                      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin size={14} className="text-amber-500" /> Registered Address &amp; Contact
                      </h3>
                      <div className="space-y-1.5 text-xs">
                        <div>
                          <span className="text-muted-foreground block text-[11px]">Address:</span>
                          <span className="font-semibold text-foreground block">
                            {selectedApp.registered_address
                              ? `${selectedApp.registered_address}${selectedApp.address_line2 ? `, ${selectedApp.address_line2}` : ""}, ${selectedApp.city || ""}, ${selectedApp.state_province || ""} ${selectedApp.postal_code || ""}`
                              : "—"}
                          </span>
                        </div>
                        {selectedApp.contact_email && (
                          <div className="flex justify-between pt-1">
                            <span className="text-muted-foreground">Contact Email:</span>
                            <span className="font-semibold text-foreground">{selectedApp.contact_email}</span>
                          </div>
                        )}
                        {selectedApp.contact_phone && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Contact Phone:</span>
                            <span className="font-semibold text-foreground">{selectedApp.contact_phone}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Authorized Representative */}
                    <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-3">
                      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <UserCheck size={14} className="text-amber-500" /> Authorized Representative
                      </h3>
                      <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Representative Name:</span>
                          <span className="font-semibold text-foreground">
                            {selectedApp.representative_name || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Role / Position:</span>
                          <span className="font-semibold text-foreground">
                            {selectedApp.representative_role || "—"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Relationship:</span>
                          <span className="font-semibold text-foreground">
                            {selectedApp.representative_relationship || "OWNER"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Submitted By:</span>
                          <span className="font-mono text-foreground">@{selectedApp.profiles?.username || "user"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Legal Declaration:</span>
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {selectedApp.declaration_confirmed ? "Confirmed & Authorized" : "—"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Review Timeline Card */}
                  <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-3">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Clock size={14} className="text-primary" /> Review Timeline &amp; Status
                    </h3>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Submitted:</span>
                        <span className="text-foreground font-mono">
                          {selectedApp.submitted_at
                            ? new Date(selectedApp.submitted_at).toLocaleString()
                            : "Draft"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Assigned Reviewer:</span>
                        <span className="font-semibold text-foreground">
                          {selectedApp.assigned_admin?.full_name || selectedApp.assigned_admin?.username || "Unassigned"}
                        </span>
                      </div>
                      {selectedApp.user_facing_reason && (
                        <div className="pt-2 border-t border-border">
                          <span className="text-muted-foreground block text-[11px]">User Facing Note:</span>
                          <span className="font-medium text-amber-600 dark:text-amber-400 text-xs block mt-0.5">
                            {selectedApp.user_facing_reason}
                          </span>
                        </div>
                      )}
                      {selectedApp.admin_internal_notes && (
                        <div className="pt-1.5 border-t border-border">
                          <span className="text-muted-foreground block text-[11px]">Admin Internal Note:</span>
                          <span className="font-mono text-foreground text-[11px] block mt-0.5">
                            {selectedApp.admin_internal_notes}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-3">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck size={14} className="text-primary" /> Identity Information
                    </h3>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Identity Type:</span>
                        <span className="font-semibold text-foreground">Person (Blue Badge Target)</span>
                      </div>
                      {selectedApp.legal_first_name && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Legal Name:</span>
                          <span className="font-semibold text-foreground">
                            {selectedApp.legal_first_name} {selectedApp.legal_last_name}
                          </span>
                        </div>
                      )}
                      {selectedApp.date_of_birth && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Date of Birth:</span>
                          <span className="font-mono text-foreground">{selectedApp.date_of_birth}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Country:</span>
                        <span className="font-semibold text-foreground">{selectedApp.residential_country}</span>
                      </div>
                      {selectedApp.verified_name && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Authoritative Verified Name:</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{selectedApp.verified_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-muted/30 p-4 rounded-xl border border-border space-y-3">
                    <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Clock size={14} className="text-primary" /> Review Timeline & Status
                    </h3>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Submitted:</span>
                        <span className="text-foreground font-mono">
                          {selectedApp.submitted_at
                            ? new Date(selectedApp.submitted_at).toLocaleString()
                            : "Draft"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Assigned Reviewer:</span>
                        <span className="font-semibold text-foreground">
                          {selectedApp.assigned_admin?.full_name || selectedApp.assigned_admin?.username || "Unassigned"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Reviewed By:</span>
                        <span className="text-foreground font-mono">
                          {selectedApp.admin_reviewer?.full_name || selectedApp.admin_reviewer?.username || "—"}
                        </span>
                      </div>
                      {selectedApp.user_facing_reason && (
                        <div className="pt-2 border-t border-border">
                          <span className="text-muted-foreground block text-[11px]">User Facing Note:</span>
                          <span className="font-medium text-amber-600 dark:text-amber-400 text-xs block mt-0.5">
                            {selectedApp.user_facing_reason}
                          </span>
                        </div>
                      )}
                      {selectedApp.admin_internal_notes && (
                        <div className="pt-1.5 border-t border-border">
                          <span className="text-muted-foreground block text-[11px]">Admin Internal Note:</span>
                          <span className="font-mono text-foreground text-[11px] block mt-0.5">
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
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    <Lock size={14} className="text-amber-600 dark:text-amber-400" /> Sensitive Identity Evidence ({selectedApp.verification_documents?.length || 0})
                  </h3>
                  <span className="text-[10px] text-muted-foreground bg-muted px-2.5 py-0.5 rounded-full font-mono">
                    Zero-Knowledge Private Storage · Audited Access
                  </span>
                </div>

                {selectedApp.verification_documents?.length === 0 ? (
                  <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>No evidence files uploaded with this submission.</span>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedApp.verification_documents?.map((doc: any) => (
                      <div
                        key={doc.id}
                        className="bg-card p-4 rounded-xl border border-border shadow-xs flex items-center justify-between gap-3"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="flex items-center gap-1.5 font-bold text-foreground text-xs truncate">
                            <FileText size={14} className="text-primary shrink-0" />
                            <span className="truncate">{doc.document_type}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">{doc.original_file_name}</p>
                          {doc.document_number_masked && (
                            <p className="text-[10px] font-mono text-muted-foreground">
                              Ref: {doc.document_number_masked}
                            </p>
                          )}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDocument(doc.id)}
                          disabled={loadingDoc}
                          className="shrink-0 h-8 text-xs"
                        >
                          <Eye size={12} className="mr-1" /> Inspect
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Audit History Timeline */}
              {selectedApp.audit_events && selectedApp.audit_events.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Verification Audit Trail ({selectedApp.audit_events.length})
                  </h3>
                  <div className="space-y-2 bg-muted/30 p-4 rounded-xl border border-border max-h-48 overflow-y-auto text-xs">
                    {selectedApp.audit_events.map((evt: any) => (
                      <div key={evt.id} className="flex items-start justify-between gap-3 pb-2 border-b border-border last:border-0 last:pb-0">
                        <div>
                          <span className="font-bold text-foreground">{evt.action}</span>
                          {evt.reason && <p className="text-muted-foreground text-[11px] mt-0.5">{evt.reason}</p>}
                        </div>
                        <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                          {new Date(evt.created_at).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="p-4 bg-muted/40 border-t border-border flex flex-wrap items-center justify-between gap-3">
              {/* Left Side: Status / Primary Decisions */}
              <div className="flex flex-wrap items-center gap-2">
                {selectedApp.status === "APPROVED" && (
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                    <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Status: <strong>Approved &amp; Active</strong></span>
                  </div>
                )}

                {(selectedApp.status === "SUBMITTED" ||
                  selectedApp.status === "UNDER_REVIEW" ||
                  selectedApp.status === "ADDITIONAL_INFORMATION_REQUIRED" ||
                  selectedApp.status === "REVERIFICATION_REQUIRED") && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => setDecisionAction("APPROVE")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle2 size={14} className="mr-1.5" /> Approve Verification
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setDecisionAction("REQUEST_INFORMATION")}
                    >
                      <HelpCircle size={14} className="mr-1.5" /> Request Information
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setDecisionAction("REJECT")}
                    >
                      <XCircle size={14} className="mr-1.5" /> Reject
                    </Button>
                  </>
                )}

                {selectedApp.status === "SUSPENDED" && (
                  <>
                    <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
                      <Ban size={15} />
                      <span>Status: <strong>Suspended</strong></span>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => setDecisionAction("APPROVE")}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      <CheckCircle2 size={14} className="mr-1.5" /> Reactivate (Approve)
                    </Button>
                  </>
                )}

                {selectedApp.status === "REJECTED" && (
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                    <XCircle size={15} />
                    <span>Status: <strong>Rejected</strong></span>
                  </div>
                )}

                {selectedApp.status === "REVOKED" && (
                  <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-muted border border-border text-muted-foreground text-xs font-semibold">
                    <Ban size={15} />
                    <span>Status: <strong>Revoked</strong></span>
                  </div>
                )}
              </div>

              {/* Right Side: Post-Approval Lifecycle or Navigation Actions */}
              <div className="flex flex-wrap items-center gap-2">
                {selectedApp.status === "APPROVED" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDecisionAction("REQUIRE_REVERIFICATION")}
                      className="text-orange-600 dark:text-orange-400 border-orange-500/30 hover:bg-orange-500/10"
                    >
                      <RotateCcw size={13} className="mr-1.5" /> Require Reverification
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDecisionAction("SUSPEND")}
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    >
                      <Ban size={13} className="mr-1.5" /> Suspend
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDecisionAction("REVOKE")}
                      className="text-muted-foreground border-border hover:bg-muted"
                    >
                      <Ban size={13} className="mr-1.5" /> Revoke
                    </Button>
                  </>
                )}

                {selectedApp.status === "REVERIFICATION_REQUIRED" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDecisionAction("SUSPEND")}
                      className="text-destructive border-destructive/30 hover:bg-destructive/10"
                    >
                      <Ban size={13} className="mr-1.5" /> Suspend
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDecisionAction("REVOKE")}
                      className="text-muted-foreground border-border hover:bg-muted"
                    >
                      <Ban size={13} className="mr-1.5" /> Revoke
                    </Button>
                  </>
                )}

                {selectedApp.status === "SUSPENDED" && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDecisionAction("REQUIRE_REVERIFICATION")}
                      className="text-orange-600 dark:text-orange-400 border-orange-500/30 hover:bg-orange-500/10"
                    >
                      <RotateCcw size={13} className="mr-1.5" /> Require Reverification
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setDecisionAction("REVOKE")}
                      className="text-muted-foreground border-border hover:bg-muted"
                    >
                      <Ban size={13} className="mr-1.5" /> Revoke
                    </Button>
                  </>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedApp(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DECISION CONFIRMATION MODAL */}
      {decisionAction && (
        <div className="fixed inset-0 z-60 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground w-full max-w-lg rounded-2xl shadow-2xl border border-border p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="text-base font-bold text-foreground font-heading flex items-center gap-2">
                <ShieldCheck size={18} className="text-primary" />
                Confirm Decision: {decisionAction.replace(/_/g, " ")}
              </h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDecisionAction(null)}
                className="rounded-full"
              >
                <X size={16} />
              </Button>
            </div>

            {decisionAction === "REJECT" && (
              <div className="space-y-1.5">
                <Label className="text-xs">Rejection Category</Label>
                <select
                  value={rejectionCategory}
                  onChange={(e) => setRejectionCategory(e.target.value)}
                  className="w-full text-xs rounded-xl border border-input p-2.5 bg-background font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
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
              <Label className="text-xs">
                {decisionAction === "REQUEST_INFORMATION"
                  ? "Information / Evidence Requested from Applicant *"
                  : "User-Facing Note / Explanation"}
              </Label>
              <Textarea
                rows={3}
                required={decisionAction === "REQUEST_INFORMATION"}
                placeholder={
                  decisionAction === "REQUEST_INFORMATION"
                    ? "e.g. Please provide a clear color scan of your government-issued ID."
                    : "Safe reason visible to applicant in their verification status..."
                }
                value={userFacingReason}
                onChange={(e) => setUserFacingReason(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">
                Admin Internal Notes (Private to Admin Team)
              </Label>
              <Textarea
                rows={2}
                placeholder="Internal compliance rationale, risk factors, or cross-checks..."
                value={adminInternalNotes}
                onChange={(e) => setAdminInternalNotes(e.target.value)}
                className="text-xs font-mono text-[11px]"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setDecisionAction(null)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={submittingDecision || (decisionAction === "REQUEST_INFORMATION" && !userFacingReason.trim())}
                onClick={handleExecuteDecision}
              >
                {submittingDecision && <RefreshCw size={13} className="animate-spin mr-1.5" />}
                Confirm &amp; Submit Decision
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div className="fixed inset-0 z-70 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card text-card-foreground w-full max-w-2xl rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/40">
              <div className="flex items-center gap-2">
                <Lock size={15} className="text-amber-500" />
                <span className="text-xs font-bold text-foreground">
                  Secure Document View ({previewDoc.type})
                </span>
                <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full font-mono">
                  Expires in {previewDoc.expiresIn}s
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setPreviewDoc(null)}
                className="rounded-full"
              >
                <X size={16} />
              </Button>
            </div>
            <div className="flex-1 p-6 flex items-center justify-center bg-black/90 overflow-auto">
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
