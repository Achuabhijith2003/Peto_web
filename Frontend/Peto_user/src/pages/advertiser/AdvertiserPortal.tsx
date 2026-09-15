import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  BarChart3,
  PlusCircle,
  CreditCard,
  Building2,
  TrendingUp,
  Eye,
  MousePointerClick,
  Sparkles,
  ArrowLeft,
  Layers,
  CheckCircle2,
  ArrowUpRight,
  RefreshCw,
  HelpCircle,
  ShieldCheck,
  Settings,
  Clock,
  Play,
  Pause,
  Trash2,
  Edit3,
  X,
  User,
} from "lucide-react";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import { AdvertiserVerificationTab } from "../../components/advertiser/AdvertiserVerificationTab";
import { VerificationGuidelinesModal } from "../../components/advertiser/VerificationGuidelinesModal";
import { AdvertiserSettingsTab } from "../../components/advertiser/AdvertiserSettingsTab";

export const getCurrencySymbol = (currencyCode?: string): string => {
  switch (currencyCode?.toUpperCase()) {
    case "INR":
      return "₹";
    case "EUR":
      return "€";
    case "GBP":
      return "£";
    case "CAD":
      return "CA$";
    case "AUD":
      return "AU$";
    case "SGD":
      return "SG$";
    case "AED":
      return "د.إ";
    case "JPY":
      return "¥";
    case "USD":
    default:
      return "$";
  }
};

interface AdvertiserProfile {
  id?: string;
  registered?: boolean;
  company_name?: string;
  contact_name?: string;
  billing_email?: string;
  contact_email?: string;
  industry?: string;
  country_code?: string;
  status?: string;
  verification_status?: string; // 'NOT_STARTED' | 'SUBMITTED' | 'UNDER_REVIEW' | 'ADDITIONAL_INFORMATION_REQUIRED' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' | 'REVOKED'
  verified_at?: string;
  balance?: number;
  currency?: string;
  website_url?: string;
}

interface Campaign {
  id: string;
  name: string;
  objective: string;
  status: "DRAFT" | "PENDING_REVIEW" | "ACTIVE" | "PAUSED" | "REJECTED" | "COMPLETED";
  budget_type: "DAILY" | "LIFETIME";
  total_budget: number;
  daily_budget: number;
  start_date: string;
  end_date?: string;
  metrics?: {
    impressions?: number;
    clicks?: number;
    spend?: number;
  };
  creatives?: Array<{
    id: string;
    headline: string;
    format: string;
    media_urls?: Array<{ url: string }>;
    call_to_action: string;
    destination_url: string;
  }>;
}

interface BillingInfo {
  balance: number;
  currency: string;
  advertiser: AdvertiserProfile;
  ledger: Array<{
    id: string;
    entry_type: "CREDIT" | "DEBIT";
    amount: number;
    currency: string;
    balance_after: number;
    description: string;
    created_at: string;
  }>;
}

export const AdvertiserPortal: React.FC = () => {
  const { user } = useAuth();
  const [userProfile, setUserProfile] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<
    "overview" | "verification" | "campaigns" | "create" | "billing" | "settings"
  >("overview");
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AdvertiserProfile | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [billing, setBilling] = useState<BillingInfo | null>(null);
  const [analytics, setAnalytics] = useState({
    impressions: 0,
    clicks: 0,
    ctr: 0,
    spend: 0,
  });

  // Verification & Guidelines state
  const [verificationApp, setVerificationApp] = useState<any | null>(null);
  const [guidelinesData, setGuidelinesData] = useState<any | null>(null);
  const [guidelinesOpen, setGuidelinesOpen] = useState(false);

  // Top up modal
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState(100);
  const [topUpLoading, setTopUpLoading] = useState(false);

  // Registration state
  const [regForm, setRegForm] = useState({
    company_name: "",
    billing_email: "",
    contact_phone: "",
    website_url: "",
    country_code: "US",
    tax_id: "",
    industry: "Pet Food & Nutrition",
  });
  const [regSubmitting, setRegSubmitting] = useState(false);

  // Campaign wizard state
  const [wizardStep, setWizardStep] = useState(1);
  const [campaignForm, setCampaignForm] = useState({
    name: "",
    objective: "BRAND_AWARENESS",
    budget_type: "DAILY" as "DAILY" | "LIFETIME",
    daily_budget: 25,
    total_budget: 150,
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    // Targeting
    locations: ["US", "CA", "GB"],
    pet_types: ["DOG", "CAT"],
    interests: ["Pet Nutrition", "Health & Wellness"],
    // Creative
    format: "IMAGE" as "IMAGE" | "VIDEO" | "CAROUSEL",
    headline: "Premium Organic Dog Food - 20% Off",
    body_text: "Give your pup veterinary-formulated nutrition made with fresh human-grade ingredients.",
    media_url: "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=1000&auto=format&fit=crop&q=80",
    call_to_action: "SHOP_NOW",
    destination_url: "https://peto.pet/shop",
  });
  const [creatingCampaign, setCreatingCampaign] = useState(false);
  const [campaignSuccess, setCampaignSuccess] = useState(false);

  const fetchAdvertiserData = async () => {
    try {
      setLoading(true);
      const [advRes, uRes] = await Promise.allSettled([
        api.get("/advertisers/profile"),
        api.get("/users/me"),
      ]);

      if (uRes.status === "fulfilled" && uRes.value.data) {
        setUserProfile(uRes.value.data.profile || uRes.value.data.user || null);
      }

      const res = advRes.status === "fulfilled" ? advRes.value : null;
      if (res && res.data && res.data.registered !== false && (res.data.advertiser || res.data.id || res.data.company_name)) {
        const adv = res.data.advertiser || res.data;
        setProfile(adv);
        // Fetch campaigns, analytics, billing, verification status, and guidelines in parallel
        const [cRes, aRes, bRes, vRes, gRes] = await Promise.allSettled([
          api.get("/advertisers/campaigns"),
          api.get("/advertisers/analytics"),
          api.get("/advertisers/billing"),
          api.get("/advertisers/verification/status"),
          api.get("/advertisers/verification/guidelines"),
        ]);
        if (cRes.status === "fulfilled") setCampaigns(cRes.value.data.campaigns || []);
        if (aRes.status === "fulfilled") setAnalytics(aRes.value.data.analytics || aRes.value.data);
        if (bRes.status === "fulfilled") setBilling(bRes.value.data);
        if (vRes.status === "fulfilled" && vRes.value.data?.application) {
          setVerificationApp(vRes.value.data.application);
          if (vRes.value.data.application.status) {
            setProfile((prev: any) => ({
              ...prev,
              verification_status: vRes.value.data.application.status,
            }));
          }
        }
        if (gRes.status === "fulfilled" && gRes.value.data?.guidelines) {
          setGuidelinesData(gRes.value.data.guidelines);
        }
      } else {
        setProfile({ registered: false });
      }
    } catch {
      setProfile({ registered: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdvertiserData();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegSubmitting(true);
    try {
      await api.post("/advertisers/register", {
        ...regForm,
        companyName: regForm.company_name,
        contactName: regForm.company_name,
        contactEmail: regForm.billing_email,
        country: regForm.country_code,
        websiteUrl: regForm.website_url,
      });
      await fetchAdvertiserData();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; error?: string } } };
      alert(error.response?.data?.message || error.response?.data?.error || "Failed to register advertiser account");
    } finally {
      setRegSubmitting(false);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingCampaign(true);
    try {
      const objectiveMap: Record<string, string> = {
        BRAND_AWARENESS: "AWARENESS",
        TRAFFIC: "TRAFFIC",
        ENGAGEMENT: "ENGAGEMENT",
        CONVERSIONS: "CONVERSIONS",
        APP_PROMOTION: "APP_PROMOTION",
      };

      await api.post("/advertisers/campaigns", {
        name: campaignForm.name || "Peto Promo Campaign",
        objective: objectiveMap[campaignForm.objective] || campaignForm.objective || "AWARENESS",
        budget_type: campaignForm.budget_type,
        budgetType: campaignForm.budget_type,
        daily_budget: Number(campaignForm.daily_budget),
        dailyBudget: Number(campaignForm.daily_budget),
        total_budget: Number(campaignForm.total_budget),
        totalBudget: Number(campaignForm.total_budget),
        start_date: campaignForm.start_date,
        startDate: campaignForm.start_date,
        end_date: campaignForm.end_date || undefined,
        endDate: campaignForm.end_date || undefined,
        targeting: {
          locations: campaignForm.locations,
          countries: campaignForm.locations,
          pet_types: campaignForm.pet_types,
          interests: campaignForm.interests,
          petInterests: campaignForm.interests,
        },
        creative: {
          name: `${campaignForm.name || "Ad"} Creative`,
          format: campaignForm.format,
          headline: campaignForm.headline,
          body_text: campaignForm.body_text,
          bodyText: campaignForm.body_text,
          media_urls: [{ url: campaignForm.media_url }],
          mediaUrls: [{ url: campaignForm.media_url }],
          call_to_action: campaignForm.call_to_action,
          callToAction: campaignForm.call_to_action,
          destination_url: campaignForm.destination_url,
          destinationUrl: campaignForm.destination_url,
        },
      });

      setCampaignSuccess(true);
      setTimeout(() => {
        setCampaignSuccess(false);
        setWizardStep(1);
        setActiveTab("campaigns");
        fetchAdvertiserData();
      }, 1500);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; error?: string } } };
      alert(error.response?.data?.message || error.response?.data?.error || "Failed to create campaign");
    } finally {
      setCreatingCampaign(false);
    }
  };

  // Campaign management operations
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    daily_budget: 0,
    total_budget: 0,
    start_date: "",
    end_date: "",
    objective: "BRAND_AWARENESS",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const handleToggleCampaignStatus = async (campaign: Campaign) => {
    const nextStatus = campaign.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
    setActionLoadingId(campaign.id);
    try {
      await api.patch(`/advertisers/campaigns/${campaign.id}/status`, {
        status: nextStatus,
      });
      await fetchAdvertiserData();
    } catch (err: any) {
      alert(err.response?.data?.error || `Failed to ${nextStatus.toLowerCase()} campaign.`);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteCampaign = async (campaign: Campaign) => {
    if (!window.confirm(`Are you sure you want to permanently delete campaign "${campaign.name}"? This action cannot be undone.`)) {
      return;
    }
    setActionLoadingId(campaign.id);
    try {
      await api.delete(`/advertisers/campaigns/${campaign.id}`);
      await fetchAdvertiserData();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to delete campaign.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenEditCampaign = (campaign: Campaign) => {
    setEditingCampaign(campaign);
    setEditForm({
      name: campaign.name,
      daily_budget: campaign.daily_budget,
      total_budget: campaign.total_budget,
      start_date: campaign.start_date ? campaign.start_date.split("T")[0] : "",
      end_date: campaign.end_date ? campaign.end_date.split("T")[0] : "",
      objective: campaign.objective,
    });
  };

  const handleSaveEditCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCampaign) return;
    setSavingEdit(true);
    try {
      await api.put(`/advertisers/campaigns/${editingCampaign.id}`, {
        name: editForm.name,
        daily_budget: Number(editForm.daily_budget),
        total_budget: Number(editForm.total_budget),
        start_date: editForm.start_date,
        end_date: editForm.end_date || null,
        objective: editForm.objective,
      });
      setEditingCampaign(null);
      await fetchAdvertiserData();
    } catch (err: any) {
      alert(err.response?.data?.error || "Failed to update campaign parameters.");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleTopUp = async () => {
    setTopUpLoading(true);
    try {
      const idempotencyKey = `topup_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      const res = await api.post("/payments/create-session", {
        amount: topUpAmount,
        currency: profile?.currency || "USD",
        purpose: "AD_WALLET_DEPOSIT",
        metadata: { advertiserId: profile?.id },
        idempotencyKey,
      });

      if (res.data?.checkoutUrl) {
        window.location.href = res.data.checkoutUrl;
      } else {
        alert("Payment initiated. Simulated sandbox balance updated.");
        setTopUpOpen(false);
        fetchAdvertiserData();
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      alert(error.response?.data?.message || "Deposit session failed");
    } finally {
      setTopUpLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading Peto Advertiser Portal...</p>
        </div>
      </div>
    );
  }

  // If not registered yet, display modern onboarding card
  if (!profile || profile.registered === false) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#fff8ed] via-[#f9f9ff] to-[#f9f9ff] py-12 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6 flex items-center justify-between">
            <Link
              to="/social"
              className="inline-flex items-center gap-2 text-xs font-semibold text-[#534434] hover:text-[#151c27] transition"
            >
              <ArrowLeft size={16} /> Back to Social Feed
            </Link>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#fff8ed] text-[#855300] border border-[#fde68a]">
              <Sparkles size={12} className="text-amber-500" />
              Peto Ad Marketplace
            </span>
          </div>

          <div className="bg-white rounded-3xl shadow-sm border border-[#e2e8f8] p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-orange-500 rounded-3xl mx-auto flex items-center justify-center text-white shadow-md shadow-amber-500/20 mb-3">
                <Building2 size={30} />
              </div>
              <h1 className="text-2xl font-bold font-headline text-[#151c27] tracking-tight">
                Grow Your Brand on Peto
              </h1>
              <p className="text-sm text-[#534434] max-w-md mx-auto leading-relaxed">
                Reach pet parents, animal lovers, veterinarians, and local pet service communities with hyper-targeted, high-engagement ads.
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#534434] mb-1.5 uppercase tracking-wider">
                    Company / Organization Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bark & Bite Co."
                    value={regForm.company_name}
                    onChange={(e) => setRegForm({ ...regForm, company_name: e.target.value })}
                    className="w-full px-4 py-2.5 text-sm bg-[#f0f3ff]/60 border border-[#e2e8f8] rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] text-[#151c27] placeholder:text-slate-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#534434] mb-1.5 uppercase tracking-wider">
                    Industry Sector *
                  </label>
                  <select
                    value={regForm.industry}
                    onChange={(e) => setRegForm({ ...regForm, industry: e.target.value })}
                    className="w-full px-4 py-2.5 text-sm bg-[#f0f3ff]/60 border border-[#e2e8f8] rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] text-[#151c27] transition"
                  >
                    <option value="Pet Food & Nutrition">Pet Food & Nutrition</option>
                    <option value="Veterinary & Health">Veterinary & Health</option>
                    <option value="Pet Toys & Accessories">Pet Toys & Accessories</option>
                    <option value="Grooming & Boarding">Grooming & Boarding</option>
                    <option value="Training & Behavior">Training & Behavior</option>
                    <option value="Animal Rescue & Non-Profit">Animal Rescue & Non-Profit</option>
                    <option value="Insurance & Tech">Insurance & Tech</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#534434] mb-1.5 uppercase tracking-wider">
                    Official Website URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://example.com"
                    value={regForm.website_url}
                    onChange={(e) => setRegForm({ ...regForm, website_url: e.target.value })}
                    className="w-full px-4 py-2.5 text-sm bg-[#f0f3ff]/60 border border-[#e2e8f8] rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] text-[#151c27] placeholder:text-slate-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#534434] mb-1.5 uppercase tracking-wider">
                    Primary Region / Country
                  </label>
                  <select
                    value={regForm.country_code}
                    onChange={(e) => setRegForm({ ...regForm, country_code: e.target.value })}
                    className="w-full px-4 py-2.5 text-sm bg-[#f0f3ff]/60 border border-[#e2e8f8] rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] text-[#151c27] transition"
                  >
                    <option value="US">United States (USD)</option>
                    <option value="IN">India (INR)</option>
                    <option value="GB">United Kingdom (GBP)</option>
                    <option value="CA">Canada (CAD)</option>
                    <option value="AU">Australia (AUD)</option>
                    <option value="DE">Germany (EUR)</option>
                    <option value="FR">France (EUR)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#534434] mb-1.5 uppercase tracking-wider">
                    Billing Notification Email
                  </label>
                  <input
                    type="email"
                    placeholder="billing@example.com"
                    value={regForm.billing_email}
                    onChange={(e) => setRegForm({ ...regForm, billing_email: e.target.value })}
                    className="w-full px-4 py-2.5 text-sm bg-[#f0f3ff]/60 border border-[#e2e8f8] rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] text-[#151c27] placeholder:text-slate-400 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#534434] mb-1.5 uppercase tracking-wider">
                    Tax / VAT Identification ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. US-123456789 or GSTIN"
                    value={regForm.tax_id}
                    onChange={(e) => setRegForm({ ...regForm, tax_id: e.target.value })}
                    className="w-full px-4 py-2.5 text-sm bg-[#f0f3ff]/60 border border-[#e2e8f8] rounded-2xl focus:bg-white focus:ring-2 focus:ring-[#0058be]/20 focus:border-[#0058be] text-[#151c27] placeholder:text-slate-400 transition"
                  />
                </div>
              </div>

              <div className="p-4 bg-[#fff8ed] border border-[#fde68a] rounded-2xl text-xs text-[#855300] leading-relaxed">
                By registering, you agree to Peto's Advertising Standards, Animal Welfare Integrity Policy, and double-entry accounting billing terms.
              </div>

              <button
                type="submit"
                disabled={regSubmitting}
                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-2xl shadow-md shadow-amber-500/20 transition transform hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 text-sm"
              >
                {regSubmitting ? "Creating Advertiser Profile..." : "Complete Registration & Launch Portal"}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const activeCurrency = profile?.currency || billing?.currency || "USD";
  const currSymbol = getCurrencySymbol(activeCurrency);

  // Registered advertiser portal
  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#151c27] pb-16">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#e2e8f8]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/social" className="text-slate-400 hover:text-[#151c27] transition">
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-xs shadow-sm overflow-hidden shrink-0">
                  {userProfile?.avatar_url ? (
                    <img src={userProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User size={16} />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <h1 className="text-sm font-bold font-headline text-[#151c27] leading-tight">
                      {userProfile?.full_name || (user as any)?.name || user?.username || profile.contact_name || "User Profile"}
                    </h1>
                    {profile.verification_status === "APPROVED" && (
                      <span title="Verified Advertiser Partner">
                        <CheckCircle2 size={14} className="text-[#006c49] fill-[#dcfce7] shrink-0" />
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#534434]">
                    {profile.company_name} • {profile.industry}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-[#f0f3ff] px-3 py-1.5 rounded-2xl text-xs font-semibold text-[#0058be] border border-[#e2e8f8]">
              <CreditCard size={14} className="text-[#0058be]" />
              <span>Balance:</span>
              <strong className="text-[#151c27]">
                {currSymbol}{billing?.balance?.toFixed(2) || "0.00"}
              </strong>
            </div>

            <button
              onClick={() => setTopUpOpen(true)}
              className="px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-sm transition hover:scale-[1.01] active:scale-[0.99] flex items-center gap-1.5"
            >
              <PlusCircle size={14} />
              Add Funds
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex gap-6 border-t border-[#f0f3ff] overflow-x-auto scrollbar-none text-xs font-semibold">
          {[
            { id: "overview", label: "Overview & Analytics", icon: BarChart3 },
            {
              id: "verification",
              label: "Partner Verification",
              icon: ShieldCheck,
              badge:
                profile?.verification_status === "APPROVED"
                  ? "Verified"
                  : profile?.verification_status === "SUBMITTED" || profile?.verification_status === "UNDER_REVIEW"
                  ? "In Review"
                  : profile?.verification_status === "ADDITIONAL_INFORMATION_REQUIRED"
                  ? "Action Needed"
                  : undefined,
              badgeColor:
                profile?.verification_status === "APPROVED"
                  ? "bg-[#dcfce7] text-[#006c49] border border-[#bbf7d0]"
                  : profile?.verification_status === "ADDITIONAL_INFORMATION_REQUIRED"
                  ? "bg-[#ffedd5] text-[#9a3412] border border-[#fed7aa]"
                  : "bg-[#fff8ed] text-[#855300] border border-[#fde68a]",
            },
            { id: "campaigns", label: "Campaigns", icon: Layers },
            { id: "create", label: "Create Campaign", icon: PlusCircle },
            { id: "billing", label: "Billing & Ledger", icon: CreditCard },
            { id: "settings", label: "Settings & Profile", icon: Settings },
          ].map((tab: any) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 py-3 border-b-2 transition whitespace-nowrap ${
                  active
                    ? "border-amber-500 text-amber-600 font-bold"
                    : "border-transparent text-[#534434] hover:text-[#151c27]"
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${tab.badgeColor}`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Tab Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {/* Verification Status Alert Banner */}
            {profile?.verification_status !== "APPROVED" && (
              <div className="p-4 sm:p-5 bg-[#fff8ed] border border-[#fde68a] rounded-3xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
                <div className="flex items-center gap-3.5">
                  <div className="p-2.5 bg-gradient-to-tr from-amber-500 to-orange-500 text-white rounded-2xl shadow-sm shadow-amber-500/20 shrink-0">
                    <ShieldCheck size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold font-headline text-[#855300] uppercase tracking-wider">
                        Partner Verification Required for Campaign Publishing
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-white text-[#855300] border border-[#fde68a]">
                        {profile?.verification_status || "NOT_STARTED"}
                      </span>
                    </div>
                    <p className="text-xs text-[#534434] mt-0.5">
                      Verify your identity or business entity to unlock campaign creation and audience ad delivery.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    onClick={() => setGuidelinesOpen(true)}
                    className="flex-1 sm:flex-initial px-3.5 py-2 rounded-2xl bg-white border border-[#e2e8f8] text-[#151c27] font-bold text-xs hover:bg-[#f0f3ff] transition"
                  >
                    Guidelines
                  </button>
                  <button
                    onClick={() => setActiveTab("verification")}
                    className="flex-1 sm:flex-initial px-4 py-2 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs shadow-sm transition whitespace-nowrap hover:scale-[1.01] active:scale-[0.99]"
                  >
                    {profile?.verification_status === "SUBMITTED" || profile?.verification_status === "UNDER_REVIEW"
                      ? "Check Status →"
                      : profile?.verification_status === "ADDITIONAL_INFORMATION_REQUIRED"
                      ? "Action Needed →"
                      : "Start Verification →"}
                  </button>
                </div>
              </div>
            )}

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-3xl border border-[#e2e8f8] shadow-sm space-y-2">
                <div className="flex items-center justify-between text-[#534434]">
                  <span className="text-xs font-bold uppercase tracking-wider">Total Spend</span>
                  <div className="p-2 rounded-2xl bg-amber-50 text-amber-600">
                    <TrendingUp size={16} />
                  </div>
                </div>
                <div className="text-2xl font-bold font-headline text-[#151c27]">
                  {currSymbol}{analytics.spend?.toFixed(2) || "0.00"}
                </div>
                <p className="text-[11px] text-[#006c49] font-medium flex items-center gap-1">
                  <ArrowUpRight size={12} /> Within monthly budget caps
                </p>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-[#e2e8f8] shadow-sm space-y-2">
                <div className="flex items-center justify-between text-[#534434]">
                  <span className="text-xs font-bold uppercase tracking-wider">Impressions</span>
                  <div className="p-2 rounded-2xl bg-blue-50 text-[#0058be]">
                    <Eye size={16} />
                  </div>
                </div>
                <div className="text-2xl font-bold font-headline text-[#151c27]">
                  {analytics.impressions?.toLocaleString() || 0}
                </div>
                <p className="text-[11px] text-[#534434]">Organic feed placements</p>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-[#e2e8f8] shadow-sm space-y-2">
                <div className="flex items-center justify-between text-[#534434]">
                  <span className="text-xs font-bold uppercase tracking-wider">Clicks</span>
                  <div className="p-2 rounded-2xl bg-purple-50 text-purple-600">
                    <MousePointerClick size={16} />
                  </div>
                </div>
                <div className="text-2xl font-bold font-headline text-[#151c27]">
                  {analytics.clicks?.toLocaleString() || 0}
                </div>
                <p className="text-[11px] text-[#534434]">Direct destination visits</p>
              </div>

              <div className="bg-white p-5 rounded-3xl border border-[#e2e8f8] shadow-sm space-y-2">
                <div className="flex items-center justify-between text-[#534434]">
                  <span className="text-xs font-bold uppercase tracking-wider">Click-Through Rate</span>
                  <div className="p-2 rounded-2xl bg-emerald-50 text-[#006c49]">
                    <Sparkles size={16} />
                  </div>
                </div>
                <div className="text-2xl font-bold font-headline text-[#151c27]">
                  {analytics.ctr ? `${analytics.ctr.toFixed(2)}%` : "0.00%"}
                </div>
                <p className="text-[11px] text-[#534434]">Engagement conversion</p>
              </div>
            </div>

            {/* Quick Actions & Recent Campaigns */}
            <div className="bg-white rounded-3xl border border-[#e2e8f8] p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold font-headline text-[#151c27]">Recent Campaigns</h3>
                  <p className="text-xs text-[#534434]">Overview of active and pending marketing drives</p>
                </div>
                <button
                  onClick={() => setActiveTab("create")}
                  className="px-3.5 py-1.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-sm transition hover:scale-[1.01] flex items-center gap-1.5"
                >
                  <PlusCircle size={14} /> New Campaign
                </button>
              </div>

              {campaigns.length === 0 ? (
                <div className="py-12 text-center text-[#534434] space-y-2">
                  <Layers size={36} className="mx-auto text-slate-300" />
                  <p className="text-sm font-medium">No campaigns created yet</p>
                  <button
                    onClick={() => setActiveTab("create")}
                    className="text-xs text-amber-600 font-bold hover:underline"
                  >
                    Launch your first campaign now →
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-[#e2e8f8] text-[#534434] font-bold uppercase tracking-wider">
                        <th className="pb-3">Campaign</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Budget</th>
                        <th className="pb-3">Objective</th>
                        <th className="pb-3">Schedule</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#f0f3ff]">
                      {campaigns.slice(0, 5).map((c) => (
                        <tr key={c.id} className="hover:bg-[#f9f9ff] transition">
                          <td className="py-3 font-semibold text-[#151c27]">{c.name}</td>
                          <td className="py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                c.status === "ACTIVE"
                                  ? "bg-[#dcfce7] text-[#006c49] border border-[#bbf7d0]"
                                  : c.status === "PENDING_REVIEW"
                                  ? "bg-[#fff8ed] text-[#855300] border border-[#fde68a]"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {c.status}
                            </span>
                          </td>
                          <td className="py-3 text-[#534434]">
                            ${c.daily_budget}/day (Max: ${c.total_budget})
                          </td>
                          <td className="py-3 text-[#534434]">{c.objective}</td>
                          <td className="py-3 text-[#534434]">{c.start_date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: CAMPAIGNS */}
        {activeTab === "campaigns" && (
          <div className="bg-white rounded-3xl border border-[#e2e8f8] p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f0f3ff] pb-4">
              <div>
                <h3 className="text-lg font-bold font-headline text-[#151c27]">Campaign Management</h3>
                <p className="text-xs text-[#534434]">
                  Modify parameters, pause/resume delivery, and manage campaign lifecycle.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchAdvertiserData}
                  className="p-2 bg-white border border-[#e2e8f8] text-[#534434] hover:text-[#151c27] hover:bg-[#f0f3ff] rounded-2xl transition"
                  title="Refresh Campaigns"
                >
                  <RefreshCw size={15} />
                </button>
                {profile?.verification_status === "APPROVED" && (
                  <button
                    onClick={() => setActiveTab("create")}
                    className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-2xl shadow-sm text-xs flex items-center gap-1.5 transition hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <PlusCircle size={15} />
                    <span>Create Campaign</span>
                  </button>
                )}
              </div>
            </div>

            {campaigns.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#f0f3ff] text-[#0058be] flex items-center justify-center mx-auto">
                  <Layers size={22} />
                </div>
                <h4 className="text-base font-bold font-headline text-[#151c27]">No Campaigns Found</h4>
                <p className="text-xs text-[#534434] max-w-sm mx-auto">
                  You haven't launched any ad campaigns yet. Once your partner verification is approved, you can create and publish campaigns here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#e2e8f8] text-[#534434] font-bold uppercase tracking-wider">
                      <th className="pb-3">Campaign</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3">Daily / Total Budget</th>
                      <th className="pb-3">Objective</th>
                      <th className="pb-3">Schedule</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f0f3ff]">
                    {campaigns.map((c) => (
                      <tr key={c.id} className="hover:bg-[#f9f9ff] transition">
                        <td className="py-3.5">
                          <div className="font-semibold text-[#151c27] text-sm">{c.name}</div>
                          <div className="text-[11px] text-slate-400 font-mono">ID: {c.id.slice(0, 8)}...</div>
                        </td>

                        <td className="py-3.5">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                              c.status === "ACTIVE"
                                ? "bg-[#dcfce7] text-[#006c49] border border-[#bbf7d0]"
                                : c.status === "PAUSED"
                                ? "bg-[#fef9c3] text-[#854d0e] border border-[#fef08a]"
                                : c.status === "PENDING_REVIEW"
                                ? "bg-[#fff8ed] text-[#855300] border border-[#fde68a]"
                                : c.status === "REJECTED"
                                ? "bg-[#fee2e2] text-[#991b1b] border border-[#fecaca]"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>

                        <td className="py-3.5 text-[#534434]">
                          <strong className="text-[#151c27]">{currSymbol}{c.daily_budget}</strong>/day
                          <span className="text-slate-400"> (Cap: {currSymbol}{c.total_budget})</span>
                        </td>

                        <td className="py-3.5 text-[#534434] font-medium">{c.objective}</td>

                        <td className="py-3.5 text-[#534434]">
                          <div>{c.start_date ? c.start_date.split("T")[0] : "Immediately"}</div>
                          {c.end_date && <div className="text-[11px] text-slate-400">Until {c.end_date.split("T")[0]}</div>}
                        </td>

                        <td className="py-3.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Pause / Resume button */}
                            {(c.status === "ACTIVE" || c.status === "PAUSED") && (
                              <button
                                onClick={() => handleToggleCampaignStatus(c)}
                                disabled={actionLoadingId === c.id}
                                className={`p-2 rounded-xl border transition flex items-center gap-1 text-[11px] font-bold ${
                                  c.status === "ACTIVE"
                                    ? "bg-[#fff7ed] border-[#fed7aa] text-[#c2410c] hover:bg-[#ffedd5]"
                                    : "bg-[#f0fdf4] border-[#bbf7d0] text-[#006c49] hover:bg-[#dcfce7]"
                                }`}
                                title={c.status === "ACTIVE" ? "Pause Campaign" : "Resume Campaign"}
                              >
                                {c.status === "ACTIVE" ? <Pause size={13} /> : <Play size={13} />}
                                <span className="hidden sm:inline">
                                  {c.status === "ACTIVE" ? "Pause" : "Resume"}
                                </span>
                              </button>
                            )}

                            {/* Modify / Edit button */}
                            <button
                              onClick={() => handleOpenEditCampaign(c)}
                              disabled={actionLoadingId === c.id}
                              className="p-2 bg-[#f0f3ff] hover:bg-[#e7eefe] text-[#0058be] border border-[#e2e8f8] rounded-xl transition flex items-center gap-1 text-[11px] font-bold"
                              title="Modify Campaign Parameters"
                            >
                              <Edit3 size={13} />
                              <span className="hidden sm:inline">Modify</span>
                            </button>

                            {/* Delete button */}
                            <button
                              onClick={() => handleDeleteCampaign(c)}
                              disabled={actionLoadingId === c.id}
                              className="p-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-xl transition flex items-center gap-1 text-[11px] font-bold"
                              title="Delete Campaign"
                            >
                              <Trash2 size={13} />
                              <span className="hidden sm:inline">Delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Campaign Edit Modal */}
            {editingCampaign && (
              <div className="fixed inset-0 z-50 bg-[#151c27]/60 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-[#e2e8f8] p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center justify-between border-b border-[#f0f3ff] pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                        <Edit3 size={16} />
                      </div>
                      <div>
                        <h4 className="font-headline font-bold text-sm text-[#151c27]">
                          Modify Campaign Parameters
                        </h4>
                        <p className="text-[11px] text-[#534434]">
                          Update budget, objective, and active campaign timeline
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setEditingCampaign(null)}
                      className="p-1 text-slate-400 hover:text-slate-700 rounded-lg"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleSaveEditCampaign} className="space-y-4 text-xs">
                    <div>
                      <label className="block text-[#151c27] font-bold mb-1">Campaign Name *</label>
                      <input
                        type="text"
                        required
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#f0f3ff]/60 border border-[#e2e8f8] rounded-2xl focus:bg-white text-[#151c27] outline-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[#151c27] font-bold mb-1">Daily Budget ({currSymbol}) *</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={editForm.daily_budget}
                          onChange={(e) => setEditForm({ ...editForm, daily_budget: Number(e.target.value) })}
                          className="w-full px-4 py-2.5 bg-[#f0f3ff]/60 border border-[#e2e8f8] rounded-2xl focus:bg-white text-[#151c27] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[#151c27] font-bold mb-1">Total Cap ({currSymbol}) *</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={editForm.total_budget}
                          onChange={(e) => setEditForm({ ...editForm, total_budget: Number(e.target.value) })}
                          className="w-full px-4 py-2.5 bg-[#f0f3ff]/60 border border-[#e2e8f8] rounded-2xl focus:bg-white text-[#151c27] outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[#151c27] font-bold mb-1">Start Date *</label>
                        <input
                          type="date"
                          required
                          value={editForm.start_date}
                          onChange={(e) => setEditForm({ ...editForm, start_date: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[#f0f3ff]/60 border border-[#e2e8f8] rounded-2xl focus:bg-white text-[#151c27] outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[#151c27] font-bold mb-1">End Date (Optional)</label>
                        <input
                          type="date"
                          value={editForm.end_date}
                          onChange={(e) => setEditForm({ ...editForm, end_date: e.target.value })}
                          className="w-full px-4 py-2.5 bg-[#f0f3ff]/60 border border-[#e2e8f8] rounded-2xl focus:bg-white text-[#151c27] outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[#151c27] font-bold mb-1">Marketing Objective</label>
                      <select
                        value={editForm.objective}
                        onChange={(e) => setEditForm({ ...editForm, objective: e.target.value })}
                        className="w-full px-4 py-2.5 bg-[#f0f3ff]/60 border border-[#e2e8f8] rounded-2xl focus:bg-white text-[#151c27] outline-none"
                      >
                        <option value="AWARENESS">Brand Awareness</option>
                        <option value="TRAFFIC">Website Traffic</option>
                        <option value="ENGAGEMENT">Post Engagement</option>
                        <option value="CONVERSIONS">Conversions & Sales</option>
                        <option value="APP_PROMOTION">App Installs</option>
                      </select>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-[#f0f3ff]">
                      <button
                        type="button"
                        onClick={() => setEditingCampaign(null)}
                        className="px-4 py-2 bg-white border border-[#e2e8f8] text-[#151c27] hover:bg-[#f0f3ff] rounded-2xl font-bold transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingEdit}
                        className="px-5 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-2xl shadow-sm transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                      >
                        {savingEdit ? "Saving..." : "Save Changes"}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CREATE CAMPAIGN WIZARD */}
        {activeTab === "create" && (
          profile?.verification_status !== "APPROVED" ? (
            <div className="bg-white rounded-3xl border border-[#e2e8f8] shadow-sm p-8 sm:p-12 max-w-2xl mx-auto text-center space-y-6 my-6">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto border border-amber-500/20 shadow-sm shadow-amber-500/10">
                <ShieldCheck size={36} />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-bold font-headline text-[#151c27]">
                  Advertiser Partner Verification Required
                </h3>
                <p className="text-xs text-[#534434] max-w-md mx-auto leading-relaxed">
                  In compliance with Peto Trust & Safety and animal welfare standards, all accounts must obtain an approved verification badge before creating or funding advertising campaigns.
                </p>
              </div>

              <div className="p-4 bg-[#f0f3ff]/60 rounded-2xl border border-[#e2e8f8] text-xs inline-flex items-center gap-3 text-left max-w-md mx-auto">
                <div className="p-2.5 bg-white rounded-xl border border-[#e2e8f8] text-amber-600 shadow-xs">
                  <Clock size={18} />
                </div>
                <div>
                  <div className="text-[10px] uppercase font-bold text-[#534434]">Current Verification Status</div>
                  <strong className="text-[#151c27] font-mono text-xs">
                    {profile?.verification_status || "NOT_STARTED"}
                  </strong>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setGuidelinesOpen(true)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-[#f0f3ff] text-[#151c27] border border-[#e2e8f8] font-bold rounded-2xl text-xs transition"
                >
                  View Verification Guidelines
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab("verification")}
                  className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-2xl shadow-sm text-xs transition hover:scale-[1.01] active:scale-[0.99]"
                >
                  {profile?.verification_status === "SUBMITTED" || profile?.verification_status === "UNDER_REVIEW"
                    ? "Check Verification Status →"
                    : profile?.verification_status === "ADDITIONAL_INFORMATION_REQUIRED"
                    ? "Provide Requested Documentation →"
                    : "Complete Partner Verification →"}
                </button>
              </div>
            </div>
          ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Form Wizard */}
            <div className="lg:col-span-7 bg-white rounded-3xl border border-[#e2e8f8] p-6 sm:p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-[#f0f3ff] pb-4">
                <div>
                  <h3 className="text-base font-bold font-headline text-[#151c27]">Campaign Creation Wizard</h3>
                  <p className="text-xs text-[#534434]">
                    Step {wizardStep} of 3: {wizardStep === 1 ? "Basics & Budget" : wizardStep === 2 ? "Targeting" : "Creative Asset"}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3].map((step) => (
                    <div
                      key={step}
                      className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
                        wizardStep === step
                          ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20"
                          : wizardStep > step
                          ? "bg-[#006c49] text-white"
                          : "bg-[#f0f3ff] text-[#534434]"
                      }`}
                    >
                      {wizardStep > step ? <CheckCircle2 size={14} /> : step}
                    </div>
                  ))}
                </div>
              </div>

              {campaignSuccess ? (
                <div className="py-12 text-center space-y-3">
                  <CheckCircle2 size={48} className="text-emerald-500 mx-auto" />
                  <h4 className="text-lg font-bold text-slate-900">Campaign Submitted Successfully!</h4>
                  <p className="text-xs text-slate-600 max-w-md mx-auto">
                    Your campaign has been placed in <strong className="text-amber-600 font-semibold">PENDING_REVIEW</strong>. Our compliance team ensures all ads adhere to animal welfare guidelines before activation.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleCreateCampaign} className="space-y-4">
                  {/* STEP 1 */}
                  {wizardStep === 1 && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                          Campaign Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Spring Puppy Food Promo 2026"
                          value={campaignForm.name}
                          onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                          className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                            Campaign Objective
                          </label>
                          <select
                            value={campaignForm.objective}
                            onChange={(e) => setCampaignForm({ ...campaignForm, objective: e.target.value })}
                            className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white"
                          >
                            <option value="BRAND_AWARENESS">Brand Awareness</option>
                            <option value="TRAFFIC">Website / Store Traffic</option>
                            <option value="CONVERSIONS">Sales & Conversions</option>
                            <option value="APP_INSTALLS">App Installs</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                            Budget Strategy
                          </label>
                          <select
                            value={campaignForm.budget_type}
                            onChange={(e) =>
                              setCampaignForm({
                                ...campaignForm,
                                budget_type: e.target.value as "DAILY" | "LIFETIME",
                              })
                            }
                            className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white"
                          >
                            <option value="DAILY">Daily Budget Cap</option>
                            <option value="LIFETIME">Lifetime Budget Cap</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                            Daily Budget ({currSymbol}) *
                          </label>
                          <input
                            type="number"
                            min={5}
                            required
                            value={campaignForm.daily_budget}
                            onChange={(e) =>
                              setCampaignForm({ ...campaignForm, daily_budget: Number(e.target.value) })
                            }
                            className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                            Total Budget Cap ({currSymbol}) *
                          </label>
                          <input
                            type="number"
                            min={20}
                            required
                            value={campaignForm.total_budget}
                            onChange={(e) =>
                              setCampaignForm({ ...campaignForm, total_budget: Number(e.target.value) })
                            }
                            className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-4">
                        <button
                          type="button"
                          onClick={() => setWizardStep(2)}
                          className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-2xl transition"
                        >
                          Next: Audience Targeting →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 2 */}
                  {wizardStep === 2 && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                          Target Pet Types
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {["DOG", "CAT", "BIRD", "REPTILE", "SMALL_PET"].map((p) => {
                            const isSelected = campaignForm.pet_types.includes(p);
                            return (
                              <button
                                type="button"
                                key={p}
                                onClick={() => {
                                  if (isSelected) {
                                    setCampaignForm({
                                      ...campaignForm,
                                      pet_types: campaignForm.pet_types.filter((t) => t !== p),
                                    });
                                  } else {
                                    setCampaignForm({
                                      ...campaignForm,
                                      pet_types: [...campaignForm.pet_types, p],
                                    });
                                  }
                                }}
                                className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                                  isSelected
                                    ? "bg-amber-500 text-white border-amber-500 shadow-xs"
                                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                                }`}
                              >
                                {p.replace("_", " ")}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                          Target Countries
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {["US", "IN", "GB", "CA", "AU", "DE", "FR"].map((country) => {
                            const isSelected = campaignForm.locations.includes(country);
                            return (
                              <button
                                type="button"
                                key={country}
                                onClick={() => {
                                  if (isSelected) {
                                    setCampaignForm({
                                      ...campaignForm,
                                      locations: campaignForm.locations.filter((c) => c !== country),
                                    });
                                  } else {
                                    setCampaignForm({
                                      ...campaignForm,
                                      locations: [...campaignForm.locations, country],
                                    });
                                  }
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition ${
                                  isSelected
                                    ? "bg-slate-900 text-white border-slate-900"
                                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                                }`}
                              >
                                {country}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex justify-between pt-4">
                        <button
                          type="button"
                          onClick={() => setWizardStep(1)}
                          className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                        >
                          ← Back
                        </button>
                        <button
                          type="button"
                          onClick={() => setWizardStep(3)}
                          className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-2xl transition"
                        >
                          Next: Creative Design →
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STEP 3 */}
                  {wizardStep === 3 && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                          Ad Headline *
                        </label>
                        <input
                          type="text"
                          required
                          value={campaignForm.headline}
                          onChange={(e) =>
                            setCampaignForm({ ...campaignForm, headline: e.target.value })
                          }
                          className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                          Primary Body Text
                        </label>
                        <textarea
                          rows={3}
                          value={campaignForm.body_text}
                          onChange={(e) =>
                            setCampaignForm({ ...campaignForm, body_text: e.target.value })
                          }
                          className="w-full px-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                          Creative Image URL *
                        </label>
                        <input
                          type="url"
                          required
                          value={campaignForm.media_url}
                          onChange={(e) =>
                            setCampaignForm({ ...campaignForm, media_url: e.target.value })
                          }
                          className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                            Call To Action Button
                          </label>
                          <select
                            value={campaignForm.call_to_action}
                            onChange={(e) =>
                              setCampaignForm({ ...campaignForm, call_to_action: e.target.value })
                            }
                            className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white"
                          >
                            <option value="LEARN_MORE">Learn More</option>
                            <option value="SHOP_NOW">Shop Now</option>
                            <option value="SIGN_UP">Sign Up</option>
                            <option value="BOOK_APPOINTMENT">Book Appointment</option>
                            <option value="GET_OFFER">Get Offer</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                            Destination Landing Page URL *
                          </label>
                          <input
                            type="url"
                            required
                            value={campaignForm.destination_url}
                            onChange={(e) =>
                              setCampaignForm({ ...campaignForm, destination_url: e.target.value })
                            }
                            className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white"
                          />
                        </div>
                      </div>

                      <div className="flex justify-between pt-4">
                        <button
                          type="button"
                          onClick={() => setWizardStep(2)}
                          className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                        >
                          ← Back
                        </button>
                        <button
                          type="submit"
                          disabled={creatingCampaign}
                          className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold rounded-2xl shadow-md transition disabled:opacity-50"
                        >
                          {creatingCampaign ? "Submitting..." : "Submit Campaign for Review"}
                        </button>
                      </div>
                    </div>
                  )}
                </form>
              )}
            </div>

            {/* Live Feed Ad Preview on the side */}
            <div className="lg:col-span-5 space-y-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                <Sparkles size={14} className="text-amber-500" />
                Live In-Feed Preview
              </div>

              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-md overflow-hidden">
                <div className="p-4 flex items-center justify-between border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-white font-bold text-xs">
                      <Building2 size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-slate-900">
                          {profile.company_name}
                        </span>
                        <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                          Sponsored
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {campaignForm.destination_url.replace(/^https?:\/\//, "").slice(0, 24)}...
                      </span>
                    </div>
                  </div>
                </div>

                {campaignForm.media_url && (
                  <div className="max-h-64 overflow-hidden bg-slate-950 flex items-center justify-center">
                    <img
                      src={campaignForm.media_url}
                      alt="Ad Preview"
                      className="w-full h-auto object-cover max-h-64"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&auto=format&fit=crop&q=80";
                      }}
                    />
                  </div>
                )}

                <div className="p-4 space-y-2">
                  <h4 className="font-bold text-slate-900 text-sm leading-snug">
                    {campaignForm.headline || "Headline preview"}
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {campaignForm.body_text || "Body text will appear here in the user feed."}
                  </p>

                  <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">
                      {profile.industry || "Pet Care"}
                    </span>
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[11px] font-bold shadow-xs flex items-center gap-1"
                    >
                      {campaignForm.call_to_action.replace(/_/g, " ")}
                      <ArrowUpRight size={12} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-100/70 rounded-2xl border border-slate-200 text-xs text-slate-500 flex items-start gap-2.5">
                <HelpCircle size={16} className="text-slate-400 shrink-0 mt-0.5" />
                <p>
                  Ads appear naturally every 5-7 organic posts with full transparency controls and user feedback support.
                </p>
              </div>
            </div>
          </div>
          )
        )}

        {/* TAB 4: BILLING & LEDGER */}
        {activeTab === "billing" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-md flex flex-col justify-between space-y-6">
                <div>
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
                    Available Ad Wallet Balance
                  </span>
                  <div className="text-3xl font-black mt-2">
                    {currSymbol}{billing?.balance?.toFixed(2) || "0.00"} {billing?.currency || activeCurrency}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Used automatically for click & impression billing.
                  </p>
                </div>

                <button
                  onClick={() => setTopUpOpen(true)}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold text-xs rounded-2xl shadow-sm transition"
                >
                  Deposit Funds
                </button>
              </div>

              <div className="md:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Payment Methods & Billing Routing</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Peto operates a centralized PCI-DSS compliant payment router. For regional compliance, transactions in India route through Razorpay UPI/Netbanking, while international transactions use Stripe Checkout.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">Stripe Global</span>
                      <span className="text-[11px] text-slate-400">Card, Apple Pay, Google Pay</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                      Active
                    </span>
                  </div>

                  <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/50 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-slate-800 block">Razorpay India</span>
                      <span className="text-[11px] text-slate-400">UPI, Cards, NetBanking</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700">
                      Active
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Double-Entry Ledger History */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Financial Ledger Statements</h3>
                  <p className="text-xs text-slate-500">Immutable double-entry transaction record</p>
                </div>
              </div>

              {!billing?.ledger || billing.ledger.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No billing transactions recorded yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                        <th className="pb-3">Type</th>
                        <th className="pb-3">Description</th>
                        <th className="pb-3">Amount</th>
                        <th className="pb-3">Balance After</th>
                        <th className="pb-3">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {billing.ledger.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="py-3">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                item.entry_type === "CREDIT"
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-amber-50 text-amber-700"
                              }`}
                            >
                              {item.entry_type}
                            </span>
                          </td>
                          <td className="py-3 font-medium text-slate-700">{item.description}</td>
                          <td
                            className={`py-3 font-bold ${
                              item.entry_type === "CREDIT" ? "text-emerald-600" : "text-slate-800"
                            }`}
                          >
                            {item.entry_type === "CREDIT" ? "+" : "-"}{currSymbol}{item.amount.toFixed(2)}
                          </td>
                          <td className="py-3 text-slate-500">{currSymbol}{item.balance_after?.toFixed(2)}</td>
                          <td className="py-3 text-slate-400">
                            {new Date(item.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: PARTNER & IDENTITY VERIFICATION */}
        {activeTab === "verification" && (
          <AdvertiserVerificationTab
            profile={profile}
            userProfile={userProfile}
            app={verificationApp}
            guidelines={guidelinesData}
            onRefresh={fetchAdvertiserData}
            onOpenGuidelines={() => setGuidelinesOpen(true)}
          />
        )}

        {/* TAB 6: SETTINGS & COMPLIANCE */}
        {activeTab === "settings" && (
          <AdvertiserSettingsTab
            profile={profile}
            app={verificationApp}
            billing={billing}
            onRefresh={fetchAdvertiserData}
            onGoToVerification={() => setActiveTab("verification")}
          />
        )}
      </main>

      {/* Top-up Funds Modal */}
      {topUpOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-slate-900 text-base">
                <CreditCard className="text-amber-500" size={20} />
                Add Advertising Funds
              </div>
              <button
                onClick={() => setTopUpOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-600">
              Select an amount to deposit into your Peto Advertising wallet. The funds are instantly available for campaign pacing.
            </p>

            <div className="grid grid-cols-3 gap-2">
              {[50, 100, 250, 500, 1000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setTopUpAmount(amt)}
                  className={`py-3 rounded-2xl text-xs font-bold border transition ${
                    topUpAmount === amt
                      ? "bg-amber-500 text-white border-amber-500 shadow-sm"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {currSymbol}{amt}
                </button>
              ))}
            </div>

            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs flex items-center justify-between">
              <span className="text-slate-500 font-medium">Selected Amount:</span>
              <strong className="text-slate-900 font-black text-sm">{currSymbol}{topUpAmount}.00 {activeCurrency}</strong>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setTopUpOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTopUp}
                disabled={topUpLoading}
                className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50"
              >
                {topUpLoading ? "Initiating..." : "Proceed to Secure Payment"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Guidelines Modal */}
      <VerificationGuidelinesModal
        isOpen={guidelinesOpen}
        onClose={() => setGuidelinesOpen(false)}
        guidelines={guidelinesData}
      />
    </div>
  );
};

export default AdvertiserPortal;
