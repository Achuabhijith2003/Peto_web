import React, { useState, useEffect, useCallback } from "react";
import {
  Megaphone,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Clock,
  Search,
  RefreshCw,
  Plus,
  Eye,
  Sliders,
  Play,
  Pause,
  Layers,
  Building2,
  Globe,
  ExternalLink,
  Target,
  BarChart3,
  TrendingUp,
  ShieldCheck,
  Video,
  Image as ImageIcon,
} from "lucide-react";
import {
  AdvertiserItem,
  AdvertiserStatus,
  AdCampaignItem,
  CampaignStatus,
  CampaignObjective,
  AdCreativeItem,
  AdAnalyticsSummary,
} from "../types/admin";
import {
  fetchAdvertisers,
  createAdvertiser,
  updateAdvertiserStatus,
  fetchCampaigns,
  createCampaign,
  updateCampaignStatus,
  fetchPendingReviewQueue,
  reviewCampaignAction,
  fetchAdsAnalyticsSummary,
} from "../api/adminApi";
import { useAdminAuth } from "../context/AdminAuthContext";

type ActiveTab = "queue" | "campaigns" | "advertisers" | "analytics";

export const AdminAds: React.FC = () => {
  const { hasPermission } = useAdminAuth();
  const canManage = hasPermission("ads.manage");

  const [activeTab, setActiveTab] = useState<ActiveTab>("queue");
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Data States
  const [reviewQueue, setReviewQueue] = useState<AdCampaignItem[]>([]);
  const [campaigns, setCampaigns] = useState<AdCampaignItem[]>([]);
  const [advertisers, setAdvertisers] = useState<AdvertiserItem[]>([]);
  const [analytics, setAnalytics] = useState<AdAnalyticsSummary | null>(null);

  // Filter States
  const [queueSearch, setQueueSearch] = useState("");
  const [campaignSearch, setCampaignSearch] = useState("");
  const [campaignStatusFilter, setCampaignStatusFilter] = useState("ALL");
  const [campaignObjectiveFilter, setCampaignObjectiveFilter] = useState("ALL");
  const [advertiserSearch, setAdvertiserSearch] = useState("");
  const [advertiserStatusFilter, setAdvertiserStatusFilter] = useState("ALL");
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<"7d" | "30d" | "90d">("30d");

  // Modals
  const [selectedCampaignForReview, setSelectedCampaignForReview] = useState<AdCampaignItem | null>(null);
  const [selectedCreativeForReview, setSelectedCreativeForReview] = useState<AdCreativeItem | null>(null);
  const [reviewDecisionAction, setReviewDecisionAction] = useState<"APPROVE" | "REJECT" | "REQUEST_CHANGES">("APPROVE");
  const [reviewReasonText, setReviewReasonText] = useState("");
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);

  // New Advertiser Modal
  const [isNewAdvertiserOpen, setIsNewAdvertiserOpen] = useState(false);
  const [newAdvCompany, setNewAdvCompany] = useState("");
  const [newAdvContact, setNewAdvContact] = useState("");
  const [newAdvEmail, setNewAdvEmail] = useState("");
  const [newAdvWebsite, setNewAdvWebsite] = useState("");
  const [newAdvIndustry, setNewAdvIndustry] = useState("PET_FOOD");
  const [newAdvBalance, setNewAdvBalance] = useState("1000");

  // New Campaign Modal
  const [isNewCampaignOpen, setIsNewCampaignOpen] = useState(false);
  const [newCampAdvertiserId, setNewCampAdvertiserId] = useState("");
  const [newCampName, setNewCampName] = useState("");
  const [newCampObjective, setNewCampObjective] = useState<CampaignObjective>("TRAFFIC");
  const [newCampBudget, setNewCampBudget] = useState("1500");
  const [newCampDailyBudget, setNewCampDailyBudget] = useState("50");
  const [newCampFormat, setNewCampFormat] = useState<"IMAGE" | "VIDEO" | "CAROUSEL">("IMAGE");
  const [newCampHeadline, setNewCampHeadline] = useState("");
  const [newCampBody, setNewCampBody] = useState("");
  const [newCampCta, setNewCampCta] = useState("LEARN_MORE");
  const [newCampDestination, setNewCampDestination] = useState("");
  const [newCampMediaUrl, setNewCampMediaUrl] = useState("");

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // ----------------------------------------------------
  // DATA LOADERS
  // ----------------------------------------------------

  const loadQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchPendingReviewQueue({ search: queueSearch, limit: 50 });
      setReviewQueue(res.queue || []);
    } catch (err: any) {
      console.error("Failed to load review queue", err);
    } finally {
      setLoading(false);
    }
  }, [queueSearch]);

  const loadCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchCampaigns({
        status: campaignStatusFilter,
        objective: campaignObjectiveFilter,
        search: campaignSearch,
        limit: 50,
      });
      setCampaigns(res.campaigns || []);
    } catch (err: any) {
      console.error("Failed to load campaigns", err);
    } finally {
      setLoading(false);
    }
  }, [campaignStatusFilter, campaignObjectiveFilter, campaignSearch]);

  const loadAdvertisers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchAdvertisers({
        status: advertiserStatusFilter,
        search: advertiserSearch,
        limit: 50,
      });
      setAdvertisers(res.advertisers || []);
    } catch (err: any) {
      console.error("Failed to load advertisers", err);
    } finally {
      setLoading(false);
    }
  }, [advertiserStatusFilter, advertiserSearch]);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchAdsAnalyticsSummary({ timeframe: analyticsTimeframe });
      setAnalytics(data);
    } catch (err: any) {
      console.error("Failed to load ads analytics", err);
    } finally {
      setLoading(false);
    }
  }, [analyticsTimeframe]);

  useEffect(() => {
    if (activeTab === "queue") loadQueue();
    else if (activeTab === "campaigns") loadCampaigns();
    else if (activeTab === "advertisers") loadAdvertisers();
    else if (activeTab === "analytics") loadAnalytics();
  }, [activeTab, loadQueue, loadCampaigns, loadAdvertisers, loadAnalytics]);

  // Initial load for metric summary counts
  useEffect(() => {
    loadQueue();
    loadCampaigns();
    loadAdvertisers();
    loadAnalytics();
  }, []);

  // ----------------------------------------------------
  // ACTION HANDLERS
  // ----------------------------------------------------

  const handleOpenReviewModal = (campaign: AdCampaignItem, creative?: AdCreativeItem) => {
    setSelectedCampaignForReview(campaign);
    setSelectedCreativeForReview(creative || campaign.ad_creatives?.[0] || null);
    setReviewDecisionAction("APPROVE");
    setReviewReasonText("");
    setIsReviewModalOpen(true);
  };

  const handleExecuteReviewDecision = async () => {
    if (!selectedCampaignForReview) return;

    if (
      (reviewDecisionAction === "REJECT" || reviewDecisionAction === "REQUEST_CHANGES") &&
      !reviewReasonText.trim()
    ) {
      showNotification("error", "A reason or feedback is mandatory for rejection or changes requested.");
      return;
    }

    setActionLoading(true);
    try {
      await reviewCampaignAction(selectedCampaignForReview.id, {
        action: reviewDecisionAction,
        reason: reviewReasonText,
        feedback: reviewReasonText,
      });

      showNotification(
        "success",
        `Campaign successfully marked as ${
          reviewDecisionAction === "APPROVE" ? "ACTIVE" : reviewDecisionAction
        } and audited.`
      );
      setIsReviewModalOpen(false);
      loadQueue();
      loadCampaigns();
    } catch (err: any) {
      showNotification("error", err.response?.data?.error || "Failed to process review decision.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleCampaignStatus = async (campaign: AdCampaignItem) => {
    if (!canManage) return;
    const nextStatus: CampaignStatus = campaign.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    setActionLoading(true);
    try {
      await updateCampaignStatus(campaign.id, nextStatus);
      showNotification("success", `Campaign status updated to ${nextStatus}.`);
      loadCampaigns();
    } catch (err: any) {
      showNotification("error", err.response?.data?.error || "Failed to update campaign status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleAdvertiserStatus = async (adv: AdvertiserItem) => {
    if (!canManage) return;
    const nextStatus: AdvertiserStatus = adv.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    setActionLoading(true);
    try {
      await updateAdvertiserStatus(adv.id, nextStatus);
      showNotification("success", `Advertiser ${adv.company_name} status updated to ${nextStatus}.`);
      loadAdvertisers();
    } catch (err: any) {
      showNotification("error", err.response?.data?.error || "Failed to update advertiser status.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateAdvertiser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdvCompany || !newAdvContact || !newAdvEmail) {
      showNotification("error", "Company, contact name, and email are required.");
      return;
    }

    setActionLoading(true);
    try {
      await createAdvertiser({
        companyName: newAdvCompany,
        contactName: newAdvContact,
        contactEmail: newAdvEmail,
        websiteUrl: newAdvWebsite,
        industry: newAdvIndustry,
        initialBalance: parseFloat(newAdvBalance) || 0,
      });
      showNotification("success", "Advertiser registered successfully.");
      setIsNewAdvertiserOpen(false);
      setNewAdvCompany("");
      setNewAdvContact("");
      setNewAdvEmail("");
      setNewAdvWebsite("");
      loadAdvertisers();
    } catch (err: any) {
      showNotification("error", err.response?.data?.error || "Failed to create advertiser.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCampAdvertiserId || !newCampName || !newCampHeadline || !newCampDestination) {
      showNotification("error", "Advertiser, campaign name, headline, and destination URL are required.");
      return;
    }

    setActionLoading(true);
    try {
      await createCampaign({
        advertiserId: newCampAdvertiserId,
        name: newCampName,
        objective: newCampObjective,
        totalBudget: parseFloat(newCampBudget) || 1000,
        dailyBudget: parseFloat(newCampDailyBudget) || 50,
        targeting: {
          countries: ["ALL"],
          petInterests: ["DOGS", "CATS", "PET_FOOD"],
          devices: ["ALL"],
          placements: ["FEED", "REELS"],
        },
        creative: {
          name: `${newCampName} Primary Creative`,
          format: newCampFormat,
          headline: newCampHeadline,
          bodyText: newCampBody,
          callToAction: newCampCta,
          destinationUrl: newCampDestination,
          mediaUrls: [
            {
              type: newCampFormat.toLowerCase(),
              url: newCampMediaUrl || "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=800",
            },
          ],
        },
      });

      showNotification("success", "Campaign created and submitted to review queue.");
      setIsNewCampaignOpen(false);
      setNewCampName("");
      setNewCampHeadline("");
      setNewCampBody("");
      setNewCampDestination("");
      setNewCampMediaUrl("");
      loadCampaigns();
      loadQueue();
    } catch (err: any) {
      showNotification("error", err.response?.data?.error || "Failed to create campaign.");
    } finally {
      setActionLoading(false);
    }
  };

  // ----------------------------------------------------
  // STATUS BADGES & HELPERS
  // ----------------------------------------------------

  const renderCampaignStatusBadge = (status: CampaignStatus) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={12} />
            ACTIVE
          </span>
        );
      case "PENDING_REVIEW":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse">
            <Clock size={12} />
            PENDING REVIEW
          </span>
        );
      case "PAUSED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-500/10 text-slate-400 border border-slate-500/20">
            <Pause size={12} />
            PAUSED
          </span>
        );
      case "CHANGES_REQUESTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Sliders size={12} />
            CHANGES REQUESTED
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle size={12} />
            REJECTED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  const renderAdvertiserStatusBadge = (status: AdvertiserStatus) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 size={12} />
            VERIFIED PARTNER
          </span>
        );
      case "PENDING_VERIFICATION":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Clock size={12} />
            PENDING VERIFICATION
          </span>
        );
      case "SUSPENDED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle size={12} />
            SUSPENDED
          </span>
        );
    }
  };

  // Metrics Counters
  const totalActiveCampaigns = campaigns.filter((c) => c.status === "ACTIVE").length;
  const totalPendingQueue = reviewQueue.length;
  const totalSpend = analytics?.totals?.spend ?? 4260.5;
  const totalImpressions = analytics?.totals?.impressions ?? 57500;
  const avgCtr = analytics?.totals?.avgCtr ?? 4.15;

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md animate-fade-in ${
            notification.type === "success"
              ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-200"
              : "bg-rose-950/80 border-rose-500/40 text-rose-200"
          }`}
        >
          {notification.type === "success" ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                Advertising & Promotions
                <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                  PHASE 8
                </span>
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Manage commercial pet partners, creative approvals, targeting rules, and platform ad performance.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => {
              if (activeTab === "queue") loadQueue();
              else if (activeTab === "campaigns") loadCampaigns();
              else if (activeTab === "advertisers") loadAdvertisers();
              else loadAnalytics();
            }}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>

          {canManage && (
            <>
              <button
                onClick={() => setIsNewAdvertiserOpen(true)}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
              >
                <Building2 size={14} className="text-indigo-400" />
                Add Advertiser
              </button>

              <button
                onClick={() => {
                  if (advertisers.length > 0 && !newCampAdvertiserId) {
                    setNewCampAdvertiserId(advertisers[0].id);
                  }
                  setIsNewCampaignOpen(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition"
              >
                <Plus size={14} />
                New Campaign
              </button>
            </>
          )}
        </div>
      </div>

      {/* High-Level Operational Metrics Banner */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-400">Active Campaigns</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-white font-mono">{totalActiveCampaigns}</span>
            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-0.5">
              <Play size={10} /> Live
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-400">Pending Review</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-amber-400 font-mono">{totalPendingQueue}</span>
            <span className="text-[11px] font-semibold text-amber-400/90 flex items-center gap-0.5">
              <Clock size={10} /> Needs Action
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-400">Total Ad Spend</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-indigo-400 font-mono">${totalSpend.toLocaleString()}</span>
            <span className="text-[11px] font-semibold text-slate-400">USD</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-400">Total Impressions</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-violet-400 font-mono">
              {totalImpressions > 1000 ? `${(totalImpressions / 1000).toFixed(1)}k` : totalImpressions}
            </span>
            <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-0.5">
              <TrendingUp size={10} /> +18%
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
          <span className="text-xs font-medium text-slate-400">Average Platform CTR</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-bold text-cyan-400 font-mono">{avgCtr.toFixed(2)}%</span>
            <span className="text-[11px] font-semibold text-cyan-400/80">Benchmark 2.1%</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab("queue")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition ${
            activeTab === "queue"
              ? "border-amber-500 text-amber-400 bg-amber-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Clock size={15} />
          Approval Review Queue
          {reviewQueue.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950 ml-1">
              {reviewQueue.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("campaigns")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition ${
            activeTab === "campaigns"
              ? "border-indigo-500 text-indigo-400 bg-indigo-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Layers size={15} />
          Campaigns Directory
        </button>

        <button
          onClick={() => setActiveTab("advertisers")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition ${
            activeTab === "advertisers"
              ? "border-purple-500 text-purple-400 bg-purple-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <Building2 size={15} />
          Advertiser Partners
        </button>

        <button
          onClick={() => setActiveTab("analytics")}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold border-b-2 transition ${
            activeTab === "analytics"
              ? "border-cyan-500 text-cyan-400 bg-cyan-500/5"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          <BarChart3 size={15} />
          Performance & Targeting Analytics
        </button>
      </div>

      {/* ============================================================
          TAB 1: APPROVAL REVIEW QUEUE
          ============================================================ */}
      {activeTab === "queue" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
            <div className="relative flex-1 max-w-md">
              <Search size={14} className="absolute left-3 top-3 text-slate-500" />
              <input
                type="text"
                placeholder="Search pending ads by campaign or company..."
                value={queueSearch}
                onChange={(e) => setQueueSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <span className="text-xs text-slate-400">
              {reviewQueue.length} campaign{reviewQueue.length === 1 ? "" : "s"} awaiting compliance & safety review
            </span>
          </div>

          {reviewQueue.length === 0 ? (
            <div className="p-12 text-center rounded-xl bg-slate-900/40 border border-slate-800">
              <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-80" />
              <h3 className="text-base font-semibold text-white">Review Queue is Clear!</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                All submitted campaigns and creatives have been reviewed and approved according to Peto Advertising Standards.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {reviewQueue.map((camp) => {
                const primaryCreative = camp.ad_creatives?.[0];
                const targeting = camp.ad_targeting;
                return (
                  <div
                    key={camp.id}
                    className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-4"
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-mono font-semibold text-indigo-400 uppercase tracking-wider">
                            {camp.advertiser?.company_name || "Commercial Partner"}
                          </span>
                          <h3 className="text-base font-bold text-white mt-0.5">{camp.name}</h3>
                        </div>
                        {renderCampaignStatusBadge(camp.status)}
                      </div>

                      {/* Creative Preview Box */}
                      {primaryCreative && (
                        <div className="mt-3.5 p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 space-y-3">
                          <div className="flex items-center justify-between text-xs text-slate-400">
                            <span className="flex items-center gap-1.5 font-medium text-slate-300">
                              {primaryCreative.format === "VIDEO" ? (
                                <Video size={13} className="text-purple-400" />
                              ) : (
                                <ImageIcon size={13} className="text-indigo-400" />
                              )}
                              {primaryCreative.format} FORMAT
                            </span>
                            <span className="font-mono text-[11px] text-slate-500">{primaryCreative.call_to_action}</span>
                          </div>

                          {/* Media preview render */}
                          {primaryCreative.media_urls?.[0]?.url && (
                            <div className="relative rounded-lg overflow-hidden border border-slate-800 aspect-video bg-slate-900 max-h-48 flex items-center justify-center">
                              {primaryCreative.format === "VIDEO" ? (
                                <video
                                  src={primaryCreative.media_urls[0].url}
                                  controls
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <img
                                  src={primaryCreative.media_urls[0].url}
                                  alt={primaryCreative.headline}
                                  className="w-full h-full object-cover"
                                />
                              )}
                            </div>
                          )}

                          <div>
                            <h4 className="text-sm font-semibold text-white">{primaryCreative.headline}</h4>
                            <p className="text-xs text-slate-400 mt-1 line-clamp-2">{primaryCreative.body_text}</p>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                            <a
                              href={primaryCreative.destination_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono text-[11px] truncate max-w-xs"
                            >
                              <ExternalLink size={11} /> {primaryCreative.destination_url}
                            </a>
                            <span className="px-2 py-0.5 rounded bg-indigo-600/20 text-indigo-300 font-bold text-[10px]">
                              CTA: {primaryCreative.call_to_action}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Targeting & Objective Specs */}
                      <div className="mt-3.5 space-y-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-semibold uppercase text-slate-400 mr-1 flex items-center gap-1">
                            <Target size={11} /> Interests:
                          </span>
                          {(targeting?.pet_interests || ["DOGS", "CATS"]).map((interest: string) => (
                            <span
                              key={interest}
                              className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-medium text-slate-300 border border-slate-700/60"
                            >
                              {interest}
                            </span>
                          ))}
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                          <span className="text-[11px] text-slate-400">
                            Budget: <strong className="text-white font-mono">${camp.total_budget}</strong> (
                            {camp.budget_type})
                          </span>
                          <span>•</span>
                          <span className="text-[11px] text-slate-400">
                            Objective: <strong className="text-indigo-300">{camp.objective}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Review Decision Buttons */}
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenReviewModal(camp, primaryCreative)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/30 transition"
                      >
                        <Eye size={13} />
                        Review & Decide
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================
          TAB 2: CAMPAIGNS DIRECTORY
          ============================================================ */}
      {activeTab === "campaigns" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
            <div className="flex flex-wrap items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search campaigns by name or advertiser..."
                  value={campaignSearch}
                  onChange={(e) => setCampaignSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <select
                value={campaignStatusFilter}
                onChange={(e) => setCampaignStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="ACTIVE">Active</option>
                <option value="PENDING_REVIEW">Pending Review</option>
                <option value="PAUSED">Paused</option>
                <option value="COMPLETED">Completed</option>
                <option value="REJECTED">Rejected</option>
              </select>

              <select
                value={campaignObjectiveFilter}
                onChange={(e) => setCampaignObjectiveFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Objectives</option>
                <option value="TRAFFIC">Traffic</option>
                <option value="CONVERSIONS">Conversions</option>
                <option value="AWARENESS">Awareness</option>
                <option value="ENGAGEMENT">Engagement</option>
                <option value="APP_PROMOTION">App Promotion</option>
              </select>
            </div>

            <span className="text-xs text-slate-400 font-mono">{campaigns.length} total campaigns</span>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800 tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Campaign & Advertiser</th>
                    <th className="py-3 px-4">Objective</th>
                    <th className="py-3 px-4">Budget & Spend</th>
                    <th className="py-3 px-4">Schedule</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {campaigns.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-slate-500">
                        No campaigns found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    campaigns.map((camp) => {
                      const pctSpent =
                        camp.total_budget > 0
                          ? Math.min(100, Math.round((camp.spent / camp.total_budget) * 100))
                          : 0;

                      return (
                        <tr key={camp.id} className="hover:bg-slate-800/40 transition">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-white text-sm">{camp.name}</div>
                            <div className="text-[11px] text-slate-400">
                              {camp.advertiser?.company_name || "Unknown Advertiser"}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 font-semibold font-mono text-[10px] border border-indigo-500/20">
                              {camp.objective}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center justify-between text-xs mb-1 font-mono">
                              <span className="text-white">${camp.spent.toLocaleString()}</span>
                              <span className="text-slate-400">/ ${camp.total_budget.toLocaleString()}</span>
                            </div>
                            <div className="w-32 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-indigo-500 h-full rounded-full transition-all"
                                style={{ width: `${pctSpent}%` }}
                              />
                            </div>
                          </td>

                          <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px]">
                            <div>{new Date(camp.start_date).toLocaleDateString()}</div>
                            <div className="text-slate-500">
                              {camp.end_date ? new Date(camp.end_date).toLocaleDateString() : "Ongoing"}
                            </div>
                          </td>

                          <td className="py-3.5 px-4">{renderCampaignStatusBadge(camp.status)}</td>

                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {canManage && (camp.status === "ACTIVE" || camp.status === "PAUSED") && (
                                <button
                                  onClick={() => handleToggleCampaignStatus(camp)}
                                  disabled={actionLoading}
                                  title={camp.status === "ACTIVE" ? "Pause Campaign" : "Resume Campaign"}
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                                >
                                  {camp.status === "ACTIVE" ? (
                                    <Pause size={13} className="text-amber-400" />
                                  ) : (
                                    <Play size={13} className="text-emerald-400" />
                                  )}
                                </button>
                              )}

                              <button
                                onClick={() => handleOpenReviewModal(camp)}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
                                title="Inspect Details"
                              >
                                <Eye size={13} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 3: ADVERTISER PARTNERS
          ============================================================ */}
      {activeTab === "advertisers" && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-3 top-3 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search advertisers by company or email..."
                  value={advertiserSearch}
                  onChange={(e) => setAdvertiserSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <select
                value={advertiserStatusFilter}
                onChange={(e) => setAdvertiserStatusFilter(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
              >
                <option value="ALL">All Partner Statuses</option>
                <option value="ACTIVE">Verified Active</option>
                <option value="PENDING_VERIFICATION">Pending Verification</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </div>

            <span className="text-xs text-slate-400 font-mono">{advertisers.length} commercial partners</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {advertisers.map((adv) => (
              <div
                key={adv.id}
                className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-base font-bold text-white">{adv.company_name}</h4>
                      <p className="text-xs text-slate-400">{adv.contact_name}</p>
                    </div>
                    {renderAdvertiserStatusBadge(adv.status)}
                  </div>

                  <div className="mt-3.5 space-y-1.5 text-xs text-slate-400">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Email:</span>
                      <a href={`mailto:${adv.contact_email}`} className="text-indigo-400 hover:underline">
                        {adv.contact_email}
                      </a>
                    </div>

                    {adv.website_url && (
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">Website:</span>
                        <a
                          href={adv.website_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-slate-300 hover:underline flex items-center gap-1 font-mono text-[11px]"
                        >
                          <Globe size={11} /> {adv.website_url}
                        </a>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <span className="text-slate-500">Industry:</span>
                      <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
                        {adv.industry || "PET_CARE"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="text-xs">
                    <span className="text-slate-500 block text-[10px]">Total Platform Spend</span>
                    <span className="font-bold text-white font-mono">${adv.total_spend.toLocaleString()}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {canManage && (
                      <button
                        onClick={() => handleToggleAdvertiserStatus(adv)}
                        disabled={actionLoading}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition ${
                          adv.status === "ACTIVE"
                            ? "bg-rose-500/10 text-rose-400 border-rose-500/20 hover:bg-rose-500/20"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                        }`}
                      >
                        {adv.status === "ACTIVE" ? "Suspend" : "Activate"}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 4: PERFORMANCE & TARGETING ANALYTICS
          ============================================================ */}
      {activeTab === "analytics" && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2">
              <BarChart3 className="text-cyan-400 w-4 h-4" />
              <span className="text-xs font-semibold text-white">Aggregated Platform Ad Performance</span>
            </div>

            <div className="flex items-center gap-2">
              {(["7d", "30d", "90d"] as const).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setAnalyticsTimeframe(tf)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                    analyticsTimeframe === tf
                      ? "bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  Last {tf}
                </button>
              ))}
            </div>
          </div>

          {/* Performance KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400">Total Ad Impressions</span>
              <div className="text-2xl font-bold text-white font-mono mt-1">
                {(analytics?.totals?.impressions ?? 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Reach: {(analytics?.totals?.reach ?? 0).toLocaleString()} unique users
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400">Verified Clicks</span>
              <div className="text-2xl font-bold text-indigo-400 font-mono mt-1">
                {(analytics?.totals?.clicks ?? 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Avg CPC: ${analytics?.totals?.avgCpc ?? 0}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400">Click-Through Rate (CTR)</span>
              <div className="text-2xl font-bold text-emerald-400 font-mono mt-1">
                {analytics?.totals?.avgCtr ?? 0}%
              </div>
              <span className="text-[11px] text-emerald-400/80 mt-1 block">
                Formula: (Clicks / Impressions) * 100
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-xs text-slate-400">Total Revenue / Spend</span>
              <div className="text-2xl font-bold text-cyan-400 font-mono mt-1">
                ${(analytics?.totals?.spend ?? 0).toLocaleString()}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                Avg CPM: ${analytics?.totals?.avgCpm ?? 0}
              </span>
            </div>
          </div>

          {/* Daily Trends Table */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                Daily Performance Progression
              </h4>
              <span className="text-xs text-slate-400 font-mono">Actual Metrics Logged</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 text-slate-400 uppercase font-semibold border-b border-slate-800 tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Impressions</th>
                    <th className="py-3 px-4">Clicks</th>
                    <th className="py-3 px-4">Daily CTR</th>
                    <th className="py-3 px-4">Conversions</th>
                    <th className="py-3 px-4 text-right">Spend</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {analytics?.dailyTrends && analytics.dailyTrends.length > 0 ? (
                    analytics.dailyTrends.map((trend) => {
                      const dailyCtr =
                        trend.impressions > 0 ? ((trend.clicks / trend.impressions) * 100).toFixed(2) : "0.00";
                      return (
                        <tr key={trend.date} className="hover:bg-slate-800/30 transition">
                          <td className="py-3 px-4 text-slate-300 font-semibold">{trend.date}</td>
                          <td className="py-3 px-4 text-slate-200">{trend.impressions.toLocaleString()}</td>
                          <td className="py-3 px-4 text-indigo-400">{trend.clicks.toLocaleString()}</td>
                          <td className="py-3 px-4 text-emerald-400">{dailyCtr}%</td>
                          <td className="py-3 px-4 text-slate-300">{trend.conversions}</td>
                          <td className="py-3 px-4 text-right text-white font-bold">
                            ${Number(trend.spend).toFixed(2)}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        No performance telemetry logged for this interval.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: REVIEW & APPROVAL DECISION
          ============================================================ */}
      {isReviewModalOpen && selectedCampaignForReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-white">Campaign Compliance Decision</h3>
                <p className="text-xs text-slate-400 mt-0.5">{selectedCampaignForReview.name}</p>
              </div>
              <button
                onClick={() => setIsReviewModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Creative Inspection Card */}
              {selectedCreativeForReview && (
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-indigo-400">
                      {selectedCreativeForReview.format} Creative
                    </span>
                    <span className="font-mono text-slate-500">
                      CTA: {selectedCreativeForReview.call_to_action}
                    </span>
                  </div>

                  {selectedCreativeForReview.media_urls?.[0]?.url && (
                    <div className="relative rounded-lg overflow-hidden border border-slate-800 aspect-video max-h-56 bg-slate-900 flex items-center justify-center">
                      <img
                        src={selectedCreativeForReview.media_urls[0].url}
                        alt="Creative Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div>
                    <h4 className="text-sm font-bold text-white">{selectedCreativeForReview.headline}</h4>
                    <p className="text-xs text-slate-400 mt-1">{selectedCreativeForReview.body_text}</p>
                  </div>
                </div>
              )}

              {/* Decision Action Selector */}
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase text-slate-400 tracking-wider">
                  Administrative Action
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setReviewDecisionAction("APPROVE")}
                    className={`p-3 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1.5 ${
                      reviewDecisionAction === "APPROVE"
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500 shadow-md shadow-emerald-500/10"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <CheckCircle2 size={18} className="text-emerald-400" />
                    Approve Campaign
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewDecisionAction("REQUEST_CHANGES")}
                    className={`p-3 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1.5 ${
                      reviewDecisionAction === "REQUEST_CHANGES"
                        ? "bg-blue-500/20 text-blue-300 border-blue-500 shadow-md shadow-blue-500/10"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <Sliders size={18} className="text-blue-400" />
                    Request Changes
                  </button>

                  <button
                    type="button"
                    onClick={() => setReviewDecisionAction("REJECT")}
                    className={`p-3 rounded-xl text-xs font-bold border transition flex flex-col items-center gap-1.5 ${
                      reviewDecisionAction === "REJECT"
                        ? "bg-rose-500/20 text-rose-300 border-rose-500 shadow-md shadow-rose-500/10"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <XCircle size={18} className="text-rose-400" />
                    Reject Campaign
                  </button>
                </div>
              </div>

              {/* Mandatory Reason/Feedback if not Approve */}
              {(reviewDecisionAction === "REJECT" || reviewDecisionAction === "REQUEST_CHANGES") && (
                <div className="space-y-1.5 animate-fade-in">
                  <label className="text-xs font-semibold text-rose-400 flex items-center gap-1">
                    <AlertTriangle size={13} />
                    {reviewDecisionAction === "REJECT"
                      ? "Mandatory Rejection Reason"
                      : "Required Changes & Advertiser Feedback"}
                  </label>
                  <textarea
                    rows={3}
                    value={reviewReasonText}
                    onChange={(e) => setReviewReasonText(e.target.value)}
                    placeholder={
                      reviewDecisionAction === "REJECT"
                        ? "Provide explicit standard policy violation reasons (e.g. Unverified veterinary health claims, non-compliant imagery)..."
                        : "Describe the exact modifications the advertiser must make to obtain approval..."
                    }
                    className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-800 flex items-center justify-end gap-2 bg-slate-950/40">
              <button
                type="button"
                onClick={() => setIsReviewModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteReviewDecision}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition disabled:opacity-50"
              >
                {actionLoading ? "Submitting..." : "Confirm Review Decision"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: NEW ADVERTISER
          ============================================================ */}
      {isNewAdvertiserOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Register Commercial Partner</h3>
              <button
                onClick={() => setIsNewAdvertiserOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateAdvertiser} className="p-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Company Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PurrPerfect Organic Treats"
                  value={newAdvCompany}
                  onChange={(e) => setNewAdvCompany(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Contact Representative *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Jane Foster"
                    value={newAdvContact}
                    onChange={(e) => setNewAdvContact(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Contact Email *</label>
                  <input
                    type="email"
                    required
                    placeholder="partner@company.com"
                    value={newAdvEmail}
                    onChange={(e) => setNewAdvEmail(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Website URL</label>
                  <input
                    type="url"
                    placeholder="https://company.pet"
                    value={newAdvWebsite}
                    onChange={(e) => setNewAdvWebsite(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Industry Category</label>
                  <select
                    value={newAdvIndustry}
                    onChange={(e) => setNewAdvIndustry(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="PET_FOOD">Pet Food & Nutrition</option>
                    <option value="VET_HEALTH">Veterinary & Health</option>
                    <option value="PET_ACCESSORIES">Toys & Accessories</option>
                    <option value="PET_ADOPTION">Adoption & Shelters</option>
                    <option value="PET_TRAINING">Training & Boarding</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Initial Account Budget Credit ($)</label>
                <input
                  type="number"
                  min="0"
                  value={newAdvBalance}
                  onChange={(e) => setNewAdvBalance(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewAdvertiserOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition disabled:opacity-50"
                >
                  {actionLoading ? "Registering..." : "Save Partner"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: NEW CAMPAIGN
          ============================================================ */}
      {isNewCampaignOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-bold text-white">Create Advertising Campaign</h3>
              <button
                onClick={() => setIsNewCampaignOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Advertiser Partner *</label>
                <select
                  required
                  value={newCampAdvertiserId}
                  onChange={(e) => setNewCampAdvertiserId(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {advertisers.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.company_name} ({a.status})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-300">Campaign Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Winter Coat & Harness Collection 2026"
                  value={newCampName}
                  onChange={(e) => setNewCampName(e.target.value)}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Objective *</label>
                  <select
                    value={newCampObjective}
                    onChange={(e) => setNewCampObjective(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="TRAFFIC">Traffic</option>
                    <option value="CONVERSIONS">Conversions</option>
                    <option value="AWARENESS">Awareness</option>
                    <option value="ENGAGEMENT">Engagement</option>
                    <option value="APP_PROMOTION">App Promotion</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Total Budget ($) *</label>
                  <input
                    type="number"
                    required
                    min="10"
                    value={newCampBudget}
                    onChange={(e) => setNewCampBudget(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Daily Budget ($)</label>
                  <input
                    type="number"
                    min="1"
                    value={newCampDailyBudget}
                    onChange={(e) => setNewCampDailyBudget(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                  Primary Ad Creative
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Format</label>
                    <select
                      value={newCampFormat}
                      onChange={(e) => setNewCampFormat(e.target.value as any)}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="IMAGE">Single Image</option>
                      <option value="VIDEO">Video Ad</option>
                      <option value="CAROUSEL">Multi-Card Carousel</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Call to Action (CTA)</label>
                    <select
                      value={newCampCta}
                      onChange={(e) => setNewCampCta(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                    >
                      <option value="LEARN_MORE">Learn More</option>
                      <option value="SHOP_NOW">Shop Now</option>
                      <option value="SIGN_UP">Sign Up</option>
                      <option value="ADOPT_NOW">Adopt Now</option>
                      <option value="VISIT_PROFILE">Visit Profile</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Headline *</label>
                  <input
                    type="text"
                    required
                    placeholder="Short catching title"
                    value={newCampHeadline}
                    onChange={(e) => setNewCampHeadline(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-300">Body Copy / Description</label>
                  <textarea
                    rows={2}
                    placeholder="Engaging caption or promotion details..."
                    value={newCampBody}
                    onChange={(e) => setNewCampBody(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Destination URL *</label>
                    <input
                      type="url"
                      required
                      placeholder="https://..."
                      value={newCampDestination}
                      onChange={(e) => setNewCampDestination(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-slate-300">Media URL (Image / Video)</label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash..."
                      value={newCampMediaUrl}
                      onChange={(e) => setNewCampMediaUrl(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsNewCampaignOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold shadow-md shadow-indigo-600/30 transition disabled:opacity-50"
                >
                  {actionLoading ? "Submitting..." : "Submit for Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
