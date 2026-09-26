import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Lock,
  BadgeCheck,
  ShieldCheck,
  Megaphone,
  ArrowLeft,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Download,
  ExternalLink,
  ChevronRight,
  Upload,
  Clock,
  Sparkles,
  MapPin,
  Globe,
  KeyRound,
  Shield,
  FileText,
  Check,
  Layers,
  Building2,
} from "lucide-react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/layout/Navbar";
import LeftSidebar from "../components/social/LeftSidebar";
import RightSidebar from "../components/social/RightSidebar";
import SocialLayout from "../components/social/SocialLayout";
import { GEO_REGIONS } from "../data/geoRegions";

type SettingsTab = "password" | "region" | "verification" | "policies" | "advertiser";

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const initialTab = (searchParams.get("tab") as SettingsTab) || "password";

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  // Sync tab with URL query parameter if it changes
  useEffect(() => {
    const tabParam = searchParams.get("tab") as SettingsTab;
    if (tabParam && ["password", "region", "verification", "policies", "advertiser"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [location.search]);

  // Region & Ad Localization state
  const [selectedCountry, setSelectedCountry] = useState<string>(() => {
    return localStorage.getItem("peto_user_country") || "US";
  });
  const [selectedState, setSelectedState] = useState<string>(() => {
    return localStorage.getItem("peto_user_state") || "CA";
  });
  const [selectedDistrict, setSelectedDistrict] = useState<string>(() => {
    return localStorage.getItem("peto_user_district") || "";
  });
  const [regionSavedMsg, setRegionSavedMsg] = useState("");

  const handleSaveRegion = async () => {
    localStorage.setItem("peto_user_country", selectedCountry);
    localStorage.setItem("peto_user_region", selectedState);
    localStorage.setItem("peto_user_state", selectedState);
    localStorage.setItem("peto_user_district", selectedDistrict);

    const countryObj = GEO_REGIONS[selectedCountry];
    const stateObj = countryObj?.states.find((s) => s.code === selectedState);
    const locText = [selectedDistrict, stateObj?.name || selectedState, countryObj?.name || selectedCountry]
      .filter(Boolean)
      .join(", ");

    try {
      await api.put("/users/profile", { location: locText });
    } catch {
      // Local storage is primary
    }

    setRegionSavedMsg(
      `Region set to ${countryObj?.flag || ""} ${stateObj?.name || selectedState}, ${
        countryObj?.name || selectedCountry
      }! Ads and localized content will now strictly target this region.`
    );
    setTimeout(() => setRegionSavedMsg(""), 5000);
  };

  // Change Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMessage, setPwdMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Verification state
  const [verificationLoading, setVerificationLoading] = useState(false);
  const [verificationApp, setVerificationApp] = useState<any | null>(null);
  const [vFirstName, setVFirstName] = useState("");
  const [vLastName, setVLastName] = useState("");
  const [vDob, setVDob] = useState("");
  const [vCountry, setVCountry] = useState("US");
  const [vDocType, setVDocType] = useState("NATIONAL_ID");
  const [vDocNumber, setVDocNumber] = useState("");
  const [vFile, setVFile] = useState<File | null>(null);
  const [vSubmitting, setVSubmitting] = useState(false);
  const [vMessage, setVMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Load verification status
  useEffect(() => {
    async function loadVerification() {
      try {
        setVerificationLoading(true);
        const res = await api.get("/advertisers/verification/status");
        if (res.data?.has_application && res.data.application) {
          setVerificationApp(res.data.application);
        }
      } catch (_) {
        // Non-blocking
      } finally {
        setVerificationLoading(false);
      }
    }
    loadVerification();
  }, []);

  // Pre-fill verification name from user profile
  useEffect(() => {
    if (user?.profile?.full_name) {
      const parts = user.profile.full_name.trim().split(/\s+/);
      if (parts.length > 0) setVFirstName(parts[0]);
      if (parts.length > 1) setVLastName(parts.slice(1).join(" "));
    }
  }, [user]);

  // Handle password change
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMessage(null);

    if (newPassword.length < 6) {
      setPwdMessage({ type: "error", text: "New password must be at least 6 characters long." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdMessage({ type: "error", text: "New passwords do not match." });
      return;
    }

    try {
      setPwdLoading(true);
      const res = await api.post("/auth/change-password", {
        currentPassword,
        newPassword,
      });

      setPwdMessage({
        type: "success",
        text: res.data?.message || "Password updated successfully!",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPwdMessage({
        type: "error",
        text: err.response?.data?.message || "Failed to update password. Please check your current password.",
      });
    } finally {
      setPwdLoading(false);
    }
  };

  // Handle Blue Tick verification submission
  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setVMessage(null);

    if (!vFirstName.trim() || !vLastName.trim() || !vDocNumber.trim()) {
      setVMessage({ type: "error", text: "Please provide your legal first name, last name, and document number." });
      return;
    }

    try {
      setVSubmitting(true);

      // 1. Submit application
      const submitRes = await api.post("/advertisers/verification/submit", {
        verification_type: "INDIVIDUAL_IDENTITY",
        legal_first_name: vFirstName.trim(),
        legal_last_name: vLastName.trim(),
        date_of_birth: vDob || undefined,
        nationality: vCountry,
        residential_country: vCountry,
        business_registration_number: vDocNumber.trim(),
      });

      const app = submitRes.data?.application;

      // 2. Upload document if provided
      if (vFile && app?.id) {
        const formData = new FormData();
        formData.append("document", vFile);
        formData.append("applicationId", app.id);
        formData.append("documentType", vDocType);
        formData.append("documentNumber", vDocNumber.trim());
        formData.append("countryCode", vCountry);
        formData.append("isFront", "true");

        await api.post("/advertisers/verification/documents", formData);
      }

      setVerificationApp(app);
      setVMessage({
        type: "success",
        text: "Blue tick verification application submitted! Our team will review your identity documents within 24-48 hours.",
      });
    } catch (err: any) {
      setVMessage({
        type: "error",
        text: err.response?.data?.error || err.response?.data?.message || "Failed to submit verification application.",
      });
    } finally {
      setVSubmitting(false);
    }
  };

  const policiesList = [
    {
      slug: "privacy-policy",
      title: "Privacy Policy",
      desc: "How Peto collects, encrypts, and handles pet data, accounts, and telemetry.",
      icon: Shield,
    },
    {
      slug: "terms-of-service",
      title: "Terms of Service",
      desc: "User eligibility, terms of use, veterinary disclaimer, and platform guidelines.",
      icon: FileText,
    },
    {
      slug: "community-guidelines",
      title: "Community Guidelines",
      desc: "Rules ensuring respectful interactions, animal welfare, and positive discussions.",
      icon: CheckCircle2,
    },
    {
      slug: "content-policy",
      title: "Content Policy",
      desc: "Standards for photos, pet reels, copyright protection, and safety restrictions.",
      icon: Layers,
    },
    {
      slug: "advertising-policy",
      title: "Advertising Policy",
      desc: "Guidelines and verification mandates for running sponsored ads on Peto.",
      icon: Megaphone,
    },
    {
      slug: "cookie-policy",
      title: "Cookie Policy",
      desc: "Information on session storage, local cookies, and telemetry preferences.",
      icon: Globe,
    },
  ];

  const isVerified = Boolean(
    (user as any)?.profile?.is_verified || (user as any)?.is_verified || verificationApp?.status === "APPROVED"
  );
  const isPending = Boolean(
    verificationApp?.status === "SUBMITTED" || verificationApp?.status === "UNDER_REVIEW"
  );

  // Compute password score
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: "Empty", color: "bg-slate-200" };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 10) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass) || /[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 25, label: "Weak", color: "bg-rose-500" };
    if (score === 2) return { score: 50, label: "Fair", color: "bg-amber-500" };
    if (score === 3) return { score: 75, label: "Good", color: "bg-blue-500" };
    return { score: 100, label: "Strong", color: "bg-emerald-500" };
  };

  const pwdStrength = getPasswordStrength(newPassword);

  const tabsConfig = [
    {
      id: "password" as SettingsTab,
      label: "Password",
      sublabel: "Security & auth",
      icon: Lock,
      activeColor: "border-slate-900 bg-slate-900 text-white shadow-md shadow-slate-900/10",
    },
    {
      id: "region" as SettingsTab,
      label: "Region & Ads",
      sublabel: "Geo targeting",
      icon: MapPin,
      activeColor: "border-amber-500 bg-amber-500 text-white shadow-md shadow-amber-500/10",
    },
    {
      id: "verification" as SettingsTab,
      label: "Blue Tick",
      sublabel: isVerified ? "Verified" : isPending ? "In review" : "Get verified",
      icon: BadgeCheck,
      activeColor: "border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/10",
      badge: isVerified ? "✓" : isPending ? "⏳" : null,
    },
    {
      id: "policies" as SettingsTab,
      label: "Policies",
      sublabel: "Legal & terms",
      icon: ShieldCheck,
      activeColor: "border-indigo-600 bg-indigo-600 text-white shadow-md shadow-indigo-600/10",
    },
    {
      id: "advertiser" as SettingsTab,
      label: "Advertiser",
      sublabel: "Business hub",
      icon: Megaphone,
      activeColor: "border-emerald-600 bg-emerald-600 text-white shadow-md shadow-emerald-600/10",
    },
  ];

  const userAvatar = user?.profile?.avatar_url || user?.avatar_url;
  const userFullName = user?.profile?.full_name || user?.username || "Pet Parent";
  const userHandle = user?.username ? `@${user.username}` : user?.email || "";

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800">
      <Navbar />

      <SocialLayout
        left={<LeftSidebar />}
        right={<RightSidebar />}
        center={
          <div className="max-w-4xl mx-auto space-y-6 pb-20">
            {/* Header / User Profile Quick Summary Banner */}
            <div className="relative overflow-hidden bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
              {/* Background gradient flare */}
              <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-gradient-to-br from-amber-100/60 via-blue-50/40 to-transparent blur-3xl pointer-events-none" />

              <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={() => navigate(-1)}
                    className="p-2.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition shadow-xs"
                    title="Go Back"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  {/* User Profile Avatar */}
                  <div className="relative shrink-0">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-white p-0.5 shadow-sm overflow-hidden flex items-center justify-center font-bold text-xl">
                      {userAvatar ? (
                        <img
                          src={userAvatar}
                          alt={userFullName}
                          className="w-full h-full object-cover rounded-[14px]"
                        />
                      ) : (
                        <span>{userFullName.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    {isVerified && (
                      <span
                        title="Verified Account"
                        className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center border-2 border-white shadow-xs"
                      >
                        <BadgeCheck size={13} />
                      </span>
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl sm:text-2xl font-black font-heading text-slate-900 tracking-tight">
                        {userFullName}
                      </h1>
                      {isVerified ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-bold">
                          <BadgeCheck size={12} className="text-blue-600" />
                          Verified
                        </span>
                      ) : isPending ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold">
                          <Clock size={11} className="text-amber-600 animate-spin" />
                          In Review
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-0.5">{userHandle}</p>
                  </div>
                </div>

                {/* Quick location tag */}
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-slate-50 border border-slate-200/80 self-start sm:self-auto text-xs text-slate-600">
                  <span className="text-base">{GEO_REGIONS[selectedCountry]?.flag || "🌐"}</span>
                  <div className="leading-tight">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Targeted Location
                    </span>
                    <span className="font-semibold text-slate-800">
                      {selectedState
                        ? `${selectedState}, ${GEO_REGIONS[selectedCountry]?.name || selectedCountry}`
                        : GEO_REGIONS[selectedCountry]?.name || selectedCountry}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Tabs Pill Bar */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-2 shadow-sm grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2">
              {tabsConfig.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 px-3 py-2.5 rounded-xl font-semibold transition-all duration-200 cursor-pointer ${
                      isActive
                        ? tab.activeColor
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent"
                    }`}
                  >
                    <Icon size={16} className={isActive ? "text-white" : "text-slate-400"} />
                    <span className="text-xs sm:text-sm">{tab.label}</span>
                    {tab.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isActive ? "bg-white/20 text-white" : "bg-blue-100 text-blue-700"
                        }`}
                      >
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* ========================================================================= */}
            {/* TAB: PASSWORD & SECURITY */}
            {/* ========================================================================= */}
            {activeTab === "password" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="border-b border-slate-100 pb-5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
                        <KeyRound size={17} />
                      </div>
                      <h2 className="text-lg font-bold text-slate-900">Change Account Password</h2>
                    </div>
                    <p className="text-xs text-slate-500 mt-1.5 ml-10">
                      Keep your Peto pet family profile secure with a strong password of at least 6 characters.
                    </p>
                  </div>

                  {pwdMessage && (
                    <div
                      className={`p-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-3 border animate-in fade-in ${
                        pwdMessage.type === "success"
                          ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                          : "bg-rose-50 border-rose-200 text-rose-800"
                      }`}
                    >
                      {pwdMessage.type === "success" ? (
                        <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                      ) : (
                        <AlertTriangle size={18} className="text-rose-600 shrink-0" />
                      )}
                      <span>{pwdMessage.text}</span>
                    </div>
                  )}

                  <form onSubmit={handleChangePassword} className="space-y-5 max-w-lg">
                    {/* Current Password */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Current Password
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPassword ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="••••••••••••"
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition pr-11"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition"
                          title={showCurrentPassword ? "Hide password" : "Show password"}
                        >
                          {showCurrentPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                          New Password
                        </label>
                        {newPassword && (
                          <span className="text-[11px] font-semibold text-slate-500">
                            Strength: <span className="font-bold text-slate-800">{pwdStrength.label}</span>
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          required
                          minLength={6}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition pr-11"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 transition"
                          title={showNewPassword ? "Hide password" : "Show password"}
                        >
                          {showNewPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>

                      {/* Password strength progress bar */}
                      {newPassword && (
                        <div className="mt-2 space-y-1">
                          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${pwdStrength.color}`}
                              style={{ width: `${pwdStrength.score}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Confirm New Password
                      </label>
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repeat your new password"
                        required
                        minLength={6}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-slate-900 focus:ring-4 focus:ring-slate-900/5 transition"
                      />
                      {confirmPassword && newPassword !== confirmPassword && (
                        <p className="text-[11px] text-rose-500 font-medium mt-1.5 flex items-center gap-1">
                          <AlertTriangle size={12} /> Passwords do not match
                        </p>
                      )}
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={pwdLoading || !newPassword || newPassword !== confirmPassword}
                        className="px-7 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-bold shadow-md transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                      >
                        {pwdLoading ? "Updating Password..." : "Update Password"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Security Tips Card */}
                <div className="bg-gradient-to-br from-slate-50 to-slate-100/60 rounded-3xl border border-slate-200/80 p-6 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 shadow-xs">
                    <Shield size={20} />
                  </div>
                  <div className="space-y-1 text-xs text-slate-600">
                    <h4 className="font-bold text-slate-900 text-sm">Security Best Practices</h4>
                    <p className="leading-relaxed text-slate-500">
                      Use a unique password not shared with any other pet registry or social platform. Never share
                      your Peto login with unauthorized third parties.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB: REGION & AD LOCALIZATION */}
            {/* ========================================================================= */}
            {activeTab === "region" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                          <Globe size={18} />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">
                          Region & Targeted Ads Localization
                        </h2>
                      </div>
                      <p className="text-xs text-slate-500 mt-1.5 ml-10">
                        Choose your location to personalize your feed, local veterinary services, and sponsored pet
                        promotions.
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200/80 rounded-2xl px-4 py-2 self-start sm:self-auto shadow-xs">
                      <span className="text-2xl">{GEO_REGIONS[selectedCountry]?.flag || "🌐"}</span>
                      <div className="text-left">
                        <div className="text-[10px] uppercase tracking-wider text-amber-700 font-bold">
                          Active Geo
                        </div>
                        <div className="text-xs font-bold text-slate-900">
                          {GEO_REGIONS[selectedCountry]?.name || selectedCountry}
                          {selectedState ? ` (${selectedState})` : ""}
                        </div>
                      </div>
                    </div>
                  </div>

                  {regionSavedMsg && (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-xs font-medium animate-in fade-in">
                      <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                      <span>{regionSavedMsg}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Select Country */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        Target Country
                      </label>
                      <select
                        value={selectedCountry}
                        onChange={(e) => {
                          const newCountry = e.target.value;
                          setSelectedCountry(newCountry);
                          const firstState = GEO_REGIONS[newCountry]?.states[0]?.code || "";
                          setSelectedState(firstState);
                          setSelectedDistrict("");
                        }}
                        className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition cursor-pointer font-medium"
                      >
                        {Object.values(GEO_REGIONS).map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.flag} {c.name} ({c.code})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Select State / Region */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        State / Province / Region
                      </label>
                      <select
                        value={selectedState}
                        onChange={(e) => {
                          setSelectedState(e.target.value);
                          setSelectedDistrict("");
                        }}
                        className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition cursor-pointer font-medium"
                      >
                        <option value="">-- All States in Country --</option>
                        {GEO_REGIONS[selectedCountry]?.states.map((s) => (
                          <option key={s.code} value={s.code}>
                            {s.name} ({s.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Select District / City */}
                  {selectedState && (
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                        District / City / County (Optional)
                      </label>
                      {GEO_REGIONS[selectedCountry]?.states.find((s) => s.code === selectedState)?.districts.length ? (
                        <select
                          value={selectedDistrict}
                          onChange={(e) => setSelectedDistrict(e.target.value)}
                          className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition cursor-pointer font-medium"
                        >
                          <option value="">-- Entire State / All Districts --</option>
                          {GEO_REGIONS[selectedCountry]?.states
                            .find((s) => s.code === selectedState)
                            ?.districts.map((d) => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={selectedDistrict}
                          onChange={(e) => setSelectedDistrict(e.target.value)}
                          placeholder="Enter your district or city..."
                          className="w-full px-4 py-3 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-4 focus:ring-amber-500/10 focus:border-amber-500 transition"
                        />
                      )}
                    </div>
                  )}

                  {/* Visual Info Grid on Localization */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        <MapPin size={14} className="text-amber-500" />
                        <span>Country Isolation</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Campaigns targeted to specific nations will never cross international borders without advertiser consent.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        <Building2 size={14} className="text-blue-500" />
                        <span>State Drill-Down</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Regional pet events, veterinary emergency notices, and shelters target your exact state.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                        <Sparkles size={14} className="text-emerald-500" />
                        <span>District Precision</span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Hyper-local precision connects you with immediate neighborhood pet playdates and lost pet alerts.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-end pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={handleSaveRegion}
                      className="px-7 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm shadow-md transition hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                    >
                      Save Location & Ad Preferences
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB: BLUE TICK VERIFICATION */}
            {/* ========================================================================= */}
            {activeTab === "verification" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                          <BadgeCheck size={20} />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">
                          Request Blue Tick Verification
                        </h2>
                      </div>
                      <p className="text-xs text-slate-500 mt-1.5 ml-10">
                        The verified badge authenticates established creators, veterinary practitioners, animal rescues, and notable pets.
                      </p>
                    </div>

                    {isVerified ? (
                      <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold font-heading shadow-xs">
                        <BadgeCheck size={16} className="text-blue-600" />
                        <span>Verified Account</span>
                      </div>
                    ) : isPending ? (
                      <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold shadow-xs">
                        <Clock size={14} className="text-amber-600 animate-spin" />
                        <span>Under Review</span>
                      </div>
                    ) : (
                      <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold">
                        <span>Not Verified</span>
                      </div>
                    )}
                  </div>

                  {/* Status Banner */}
                  {verificationLoading ? (
                    <div className="flex items-center justify-center p-12 text-slate-400">
                      <div className="w-6 h-6 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mr-3" />
                      <span className="text-xs font-semibold">Checking verification status...</span>
                    </div>
                  ) : isVerified ? (
                    <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-3xl p-8 sm:p-10 shadow-lg space-y-4">
                      <div className="flex items-start gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md text-white flex items-center justify-center shrink-0 shadow-sm border border-white/30">
                          <BadgeCheck size={32} />
                        </div>
                        <div className="space-y-1">
                          <h3 className="text-xl font-bold font-heading text-white">
                            Your account is officially verified!
                          </h3>
                          <p className="text-xs sm:text-sm text-blue-100 leading-relaxed max-w-xl">
                            The verified blue checkmark now appears across all your pet profiles, posts, reels, and community interactions.
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-white/20 text-xs text-blue-100">
                        <div className="flex items-center gap-2">
                          <Check size={14} className="text-blue-300" />
                          <span>Priority In Search Results</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check size={14} className="text-blue-300" />
                          <span>Protected Creator Identity</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check size={14} className="text-blue-300" />
                          <span>Verified Advertiser Eligibility</span>
                        </div>
                      </div>
                    </div>
                  ) : isPending ? (
                    <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-3xl p-8 flex items-start gap-5">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                        <Clock size={24} className="animate-spin" />
                      </div>
                      <div className="space-y-2">
                        <h3 className="text-base font-bold text-amber-950 font-heading">
                          Application Under Compliance Review
                        </h3>
                        <p className="text-xs text-amber-900/90 leading-relaxed max-w-xl">
                          We have received your verification submission. Our compliance team verifies submitted documents against official national registries. You will receive an in-app confirmation once verified.
                        </p>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-amber-100/80 text-amber-800 text-[11px] font-bold">
                          Estimated turnaround: 24 - 48 hours
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      {vMessage && (
                        <div
                          className={`p-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-3 border ${
                            vMessage.type === "success"
                              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                              : "bg-rose-50 border-rose-200 text-rose-800"
                          }`}
                        >
                          {vMessage.type === "success" ? (
                            <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
                          ) : (
                            <AlertTriangle size={18} className="text-rose-600 shrink-0" />
                          )}
                          <span>{vMessage.text}</span>
                        </div>
                      )}

                      {/* Criteria Box */}
                      <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-3 text-xs text-slate-600">
                        <span className="font-bold text-slate-900 block font-heading text-sm">
                          Verification Eligibility Guidelines:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div className="p-3 bg-white rounded-xl border border-slate-200/60 space-y-1">
                            <span className="font-bold text-slate-800 block">1. Authenticity</span>
                            <span className="text-[11px] text-slate-500">
                              Represents a registered pet parent, veterinary clinic, shelter, or creator.
                            </span>
                          </div>
                          <div className="p-3 bg-white rounded-xl border border-slate-200/60 space-y-1">
                            <span className="font-bold text-slate-800 block">2. Completed Profile</span>
                            <span className="text-[11px] text-slate-500">
                              Avatar photo, bio, contact email, and at least one linked pet profile.
                            </span>
                          </div>
                          <div className="p-3 bg-white rounded-xl border border-slate-200/60 space-y-1">
                            <span className="font-bold text-slate-800 block">3. Official ID</span>
                            <span className="text-[11px] text-slate-500">
                              Government document (Passport, National ID, License). Strictly encrypted.
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Verification Form */}
                      <form onSubmit={handleSubmitVerification} className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                              Legal First Name
                            </label>
                            <input
                              type="text"
                              value={vFirstName}
                              onChange={(e) => setVFirstName(e.target.value)}
                              required
                              placeholder="e.g. Sarah"
                              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 transition"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                              Legal Last Name
                            </label>
                            <input
                              type="text"
                              value={vLastName}
                              onChange={(e) => setVLastName(e.target.value)}
                              required
                              placeholder="e.g. Jenkins"
                              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 transition"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                              Date of Birth
                            </label>
                            <input
                              type="date"
                              value={vDob}
                              onChange={(e) => setVDob(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 transition cursor-pointer"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                              Country of Residence
                            </label>
                            <select
                              value={vCountry}
                              onChange={(e) => setVCountry(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 transition cursor-pointer font-medium"
                            >
                              <option value="US">🇺🇸 United States</option>
                              <option value="IN">🇮🇳 India</option>
                              <option value="GB">🇬🇧 United Kingdom</option>
                              <option value="CA">🇨🇦 Canada</option>
                              <option value="AU">🇦🇺 Australia</option>
                              <option value="DE">🇩🇪 Germany</option>
                              <option value="FR">🇫🇷 France</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                              Identification Type
                            </label>
                            <select
                              value={vDocType}
                              onChange={(e) => setVDocType(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 transition cursor-pointer font-medium"
                            >
                              <option value="NATIONAL_ID">National ID / Aadhaar / SSN</option>
                              <option value="PASSPORT">Passport</option>
                              <option value="DRIVERS_LICENSE">Driver's License</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                            Document Identification Number
                          </label>
                          <input
                            type="text"
                            value={vDocNumber}
                            onChange={(e) => setVDocNumber(e.target.value)}
                            placeholder="e.g. A12345678 or DL-998877"
                            required
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/5 transition font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                            Upload ID Document (Photo / PDF)
                          </label>
                          <div className="border-2 border-dashed border-slate-200 hover:border-blue-500 rounded-3xl p-8 text-center bg-slate-50/50 hover:bg-blue-50/20 transition cursor-pointer group">
                            <input
                              type="file"
                              accept="image/*,application/pdf"
                              onChange={(e) => {
                                if (e.target.files?.[0]) {
                                  setVFile(e.target.files[0]);
                                }
                              }}
                              className="hidden"
                              id="verification-doc-upload"
                            />
                            <label htmlFor="verification-doc-upload" className="cursor-pointer block">
                              <div className="w-12 h-12 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3 group-hover:scale-110 transition">
                                <Upload size={22} />
                              </div>
                              <span className="text-sm font-bold text-blue-600 block">
                                {vFile ? vFile.name : "Click to select document or photo"}
                              </span>
                              <span className="text-xs text-slate-400 block mt-1">
                                {vFile
                                  ? `${(vFile.size / (1024 * 1024)).toFixed(2)} MB file selected`
                                  : "Supports JPG, PNG, or PDF up to 10MB"}
                              </span>
                            </label>
                          </div>
                        </div>

                        <div className="pt-2">
                          <button
                            type="submit"
                            disabled={vSubmitting || !vFirstName.trim() || !vLastName.trim() || !vDocNumber.trim()}
                            className="px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none cursor-pointer"
                          >
                            {vSubmitting ? "Submitting Application..." : "Submit Verification Request"}
                          </button>
                        </div>
                      </form>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB: PRIVACY & LEGAL POLICIES */}
            {/* ========================================================================= */}
            {activeTab === "policies" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-5">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                          <ShieldCheck size={20} />
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">
                          Privacy & Legal Policies
                        </h2>
                      </div>
                      <p className="text-xs text-slate-500 mt-1.5 ml-10">
                        Official compliance policies, user agreement standards, animal safety protocols, and certified legal copies.
                      </p>
                    </div>

                    <Link
                      to="/policies"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition shadow-xs"
                    >
                      <span>Full Policy Center</span>
                      <ExternalLink size={13} />
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {policiesList.map((p) => {
                      const Icon = p.icon;
                      const pdfUrl = `${api.defaults.baseURL || "/api"}/policies/${p.slug}/pdf`;

                      return (
                        <div
                          key={p.slug}
                          className="bg-slate-50 hover:bg-white border border-slate-200/80 hover:border-indigo-200 rounded-3xl p-5 sm:p-6 transition-all duration-200 hover:shadow-md flex flex-col justify-between space-y-4 group"
                        >
                          <div className="space-y-2">
                            <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 text-indigo-600 flex items-center justify-center shadow-xs group-hover:scale-105 transition">
                              <Icon size={18} />
                            </div>
                            <h3 className="font-bold text-base text-slate-900 font-heading">
                              {p.title}
                            </h3>
                            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                              {p.desc}
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-slate-200/60 text-xs">
                            <Link
                              to={`/policies/${p.slug}`}
                              className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                            >
                              <span>Read Policy</span>
                              <ChevronRight size={14} />
                            </Link>

                            <a
                              href={pdfUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold shadow-2xs transition"
                            >
                              <Download size={13} />
                              <span>Certified PDF</span>
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ========================================================================= */}
            {/* TAB: ADVERTISER PORTAL */}
            {/* ========================================================================= */}
            {activeTab === "advertiser" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
                  {/* Hero Banner */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-emerald-950 to-slate-900 text-white rounded-3xl p-8 sm:p-10 shadow-xl space-y-5 border border-emerald-900/40">
                    <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30 backdrop-blur-md">
                      <Sparkles size={14} />
                      <span>Peto Business & Ads Network</span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-black font-heading tracking-tight max-w-lg leading-tight">
                      Grow Your Pet Brand with Precision Targeted Ads
                    </h2>

                    <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                      Launch high-converting sponsored campaigns, veterinary services, pet grooming, and adoption
                      drives directly to verified pet parents in your immediate region.
                    </p>

                    <div className="pt-2 flex flex-wrap items-center gap-3">
                      <Link
                        to="/advertiser"
                        className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition hover:scale-[1.02] active:scale-[0.98]"
                      >
                        <Megaphone size={16} />
                        <span>Launch Advertiser Portal</span>
                        <ChevronRight size={16} />
                      </Link>
                    </div>
                  </div>

                  {/* Value Pillars */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
                    <div className="p-5 rounded-3xl border border-slate-200/80 bg-slate-50 space-y-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                        🎯
                      </div>
                      <span className="font-bold text-slate-900 block font-heading text-sm">
                        High-Intent Audience
                      </span>
                      <p className="text-slate-500 leading-relaxed text-[11px]">
                        Reach enthusiastic pet parents actively searching for premium nutrition, grooming, veterinary care, and gear.
                      </p>
                    </div>

                    <div className="p-5 rounded-3xl border border-slate-200/80 bg-slate-50 space-y-2">
                      <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center font-bold">
                        🛡️
                      </div>
                      <span className="font-bold text-slate-900 block font-heading text-sm">
                        Verified Business Badge
                      </span>
                      <p className="text-slate-500 leading-relaxed text-[11px]">
                        Earn user trust with the official Peto Verified Business checkmark displayed prominently on all sponsored placements.
                      </p>
                    </div>

                    <div className="p-5 rounded-3xl border border-slate-200/80 bg-slate-50 space-y-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                        📊
                      </div>
                      <span className="font-bold text-slate-900 block font-heading text-sm">
                        Real-Time Telemetry
                      </span>
                      <p className="text-slate-500 leading-relaxed text-[11px]">
                        Monitor impressions, CTR, CPC, and conversion performance in real time with our comprehensive advertiser dashboard.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        }
      />
    </div>
  );
};

export default Settings;
