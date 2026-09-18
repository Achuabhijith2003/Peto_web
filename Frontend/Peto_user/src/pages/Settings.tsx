import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import Navbar from "../components/layout/Navbar";
import LeftSidebar from "../components/social/LeftSidebar";
import RightSidebar from "../components/social/RightSidebar";
import SocialLayout from "../components/social/SocialLayout";

type SettingsTab = "password" | "verification" | "policies" | "advertiser";

export const Settings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<SettingsTab>("password");

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
    },
    {
      slug: "terms-of-service",
      title: "Terms of Service",
      desc: "User eligibility, terms of use, veterinary disclaimer, and platform guidelines.",
    },
    {
      slug: "community-guidelines",
      title: "Community Guidelines",
      desc: "Rules ensuring respectful interactions, animal welfare, and positive discussions.",
    },
    {
      slug: "content-policy",
      title: "Content Policy",
      desc: "Standards for photos, pet reels, copyright protection, and safety restrictions.",
    },
    {
      slug: "advertising-policy",
      title: "Advertising Policy",
      desc: "Guidelines and verification mandates for running sponsored ads on Peto.",
    },
    {
      slug: "cookie-policy",
      title: "Cookie Policy",
      desc: "Information on session storage, local cookies, and telemetry preferences.",
    },
  ];

  const isVerified = Boolean((user as any)?.profile?.is_verified || (user as any)?.is_verified || verificationApp?.status === "APPROVED");
  const isPending = Boolean(verificationApp?.status === "SUBMITTED" || verificationApp?.status === "UNDER_REVIEW");

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800">
      <Navbar />

      <SocialLayout
        left={<LeftSidebar />}
        right={<RightSidebar />}
        center={
          <div className="max-w-4xl mx-auto space-y-6 pb-20">
            {/* Header */}
            <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
                >
                  <ArrowLeft size={18} />
                </button>
                <h1 className="text-2xl sm:text-3xl font-bold font-heading text-slate-900">
                  Settings & Preferences
                </h1>
              </div>
              <p className="text-sm text-slate-500 ml-11">
                Manage your account security, blue tick verification badge, legal compliance policies, and advertiser tools.
              </p>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-2 shadow-sm flex flex-wrap items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("password")}
                className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition ${
                  activeTab === "password"
                    ? "bg-slate-900 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Lock size={15} />
                <span>Password</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("verification")}
                className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition ${
                  activeTab === "verification"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <BadgeCheck size={15} />
                <span>Get Blue Tick</span>
                {isVerified && (
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("policies")}
                className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition ${
                  activeTab === "policies"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <ShieldCheck size={15} />
                <span>Policies</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("advertiser")}
                className={`flex-1 min-w-[120px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition ${
                  activeTab === "advertiser"
                    ? "bg-emerald-700 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Megaphone size={15} />
                <span>Advertiser Portal</span>
              </button>
            </div>

            {/* TAB 1: CHANGE PASSWORD */}
            {activeTab === "password" && (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in duration-150">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Lock size={18} className="text-slate-700" />
                    <span>Change Account Password</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Ensure your account uses a secure password of at least 6 characters.
                  </p>
                </div>

                {pwdMessage && (
                  <div
                    className={`p-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2 border ${
                      pwdMessage.type === "success"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                        : "bg-rose-50 border-rose-200 text-rose-800"
                    }`}
                  >
                    {pwdMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                    <span>{pwdMessage.text}</span>
                  </div>
                )}

                <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        required
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                      >
                        {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        required
                        minLength={6}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Confirm New Password
                    </label>
                    <input
                      type={showNewPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      required
                      minLength={6}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600"
                    />
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={pwdLoading}
                      className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
                    >
                      {pwdLoading ? "Updating..." : "Update Password"}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB 2: GET BLUE TICK (VERIFICATION) */}
            {activeTab === "verification" && (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in duration-150">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <BadgeCheck size={22} className="text-blue-600" />
                      <span>Request Blue Tick Verification</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Peto verified badges confirm authenticity of creators, veterinarians, rescues, and authentic pet personalities.
                    </p>
                  </div>

                  {isVerified ? (
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-bold font-heading">
                      <BadgeCheck size={16} className="text-blue-600" />
                      <span>Verified Account</span>
                    </div>
                  ) : isPending ? (
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                      <Clock size={14} className="text-amber-600 animate-spin" />
                      <span>Under Review</span>
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold">
                      <span>Not Verified</span>
                    </div>
                  )}
                </div>

                {/* Status Box */}
                {verificationLoading ? (
                  <div className="flex items-center justify-center p-8 text-slate-400">
                    <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin mr-2" />
                    <span className="text-xs">Checking verification status...</span>
                  </div>
                ) : isVerified ? (
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-6 flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm">
                      <BadgeCheck size={26} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-blue-950 font-heading">
                        Your account is verified!
                      </h3>
                      <p className="text-xs text-blue-900/80 mt-1 leading-relaxed">
                        The verified blue tick badge appears alongside your username in posts, comments, reels, and pet parent search results.
                      </p>
                    </div>
                  </div>
                ) : isPending ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-start gap-4">
                    <Clock size={24} className="text-amber-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-base font-bold text-amber-950 font-heading">
                        Application Under Compliance Review
                      </h3>
                      <p className="text-xs text-amber-900/90 mt-1 leading-relaxed">
                        We have received your verification submission. Our trust and safety team validates submitted documents against regional identity databases. You will receive an update shortly.
                      </p>
                    </div>
                  </div>
                ) : (
                  <>
                    {vMessage && (
                      <div
                        className={`p-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-center gap-2 border ${
                          vMessage.type === "success"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                            : "bg-rose-50 border-rose-200 text-rose-800"
                        }`}
                      >
                        {vMessage.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                        <span>{vMessage.text}</span>
                      </div>
                    )}

                    {/* Criteria Box */}
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2 text-xs text-slate-600">
                      <span className="font-bold text-slate-900 block font-heading text-sm">
                        Verification Guidelines:
                      </span>
                      <ul className="space-y-1.5 pl-4 list-disc">
                        <li>Authentic: Your profile must represent a real pet parent, veterinarian, foster, or creator.</li>
                        <li>Complete: You should have a profile photo, bio, and pet details completed.</li>
                        <li>Documented: Submit a government-issued photo ID (Passport, National ID, or Driver's License). Documents are strictly encrypted and never shared publicly.</li>
                      </ul>
                    </div>

                    {/* Verification Form */}
                    <form onSubmit={handleSubmitVerification} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Legal First Name
                          </label>
                          <input
                            type="text"
                            value={vFirstName}
                            onChange={(e) => setVFirstName(e.target.value)}
                            required
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Legal Last Name
                          </label>
                          <input
                            type="text"
                            value={vLastName}
                            onChange={(e) => setVLastName(e.target.value)}
                            required
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Date of Birth
                          </label>
                          <input
                            type="date"
                            value={vDob}
                            onChange={(e) => setVDob(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Country of Residence
                          </label>
                          <select
                            value={vCountry}
                            onChange={(e) => setVCountry(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600"
                          >
                            <option value="US">United States</option>
                            <option value="IN">India</option>
                            <option value="GB">United Kingdom</option>
                            <option value="CA">Canada</option>
                            <option value="AU">Australia</option>
                            <option value="DE">Germany</option>
                            <option value="FR">France</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Identification Type
                          </label>
                          <select
                            value={vDocType}
                            onChange={(e) => setVDocType(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600"
                          >
                            <option value="NATIONAL_ID">National ID / Aadhaar</option>
                            <option value="PASSPORT">Passport</option>
                            <option value="DRIVERS_LICENSE">Driver's License</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Document Identification Number
                        </label>
                        <input
                          type="text"
                          value={vDocNumber}
                          onChange={(e) => setVDocNumber(e.target.value)}
                          placeholder="e.g. Passport or ID Number"
                          required
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Upload ID Document (Photo / PDF)
                        </label>
                        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-6 text-center hover:bg-slate-50 transition cursor-pointer">
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
                            <Upload size={24} className="mx-auto text-slate-400 mb-2" />
                            <span className="text-sm font-semibold text-blue-600">
                              {vFile ? vFile.name : "Click to select document file"}
                            </span>
                            <span className="text-xs text-slate-400 block mt-1">
                              Supports JPG, PNG, or PDF up to 10MB
                            </span>
                          </label>
                        </div>
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={vSubmitting}
                          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition disabled:opacity-50 cursor-pointer"
                        >
                          {vSubmitting ? "Submitting Application..." : "Submit Verification Request"}
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            )}

            {/* TAB 3: PRIVACY & LEGAL POLICIES */}
            {activeTab === "policies" && (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in duration-150">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <ShieldCheck size={20} className="text-amber-600" />
                      <span>Privacy & Legal Policies</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                      Read official compliance policies, terms of service, and download certified regulatory copies.
                    </p>
                  </div>

                  <Link
                    to="/policies"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
                  >
                    <span>Full Policy Center</span>
                    <ExternalLink size={13} />
                  </Link>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {policiesList.map((p) => {
                    const pdfUrl = `${api.defaults.baseURL || "/api"}/policies/${p.slug}/pdf`;
                    return (
                      <div
                        key={p.slug}
                        className="bg-slate-50 hover:bg-white border border-slate-200 rounded-2xl p-5 transition hover:shadow-sm flex flex-col justify-between space-y-3"
                      >
                        <div>
                          <h3 className="font-bold text-base text-slate-900 font-heading">
                            {p.title}
                          </h3>
                          <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                            {p.desc}
                          </p>
                        </div>

                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                          <Link
                            to={`/policies/${p.slug}`}
                            className="text-blue-600 hover:underline font-semibold flex items-center gap-1"
                          >
                            <span>Read Document</span>
                            <ChevronRight size={14} />
                          </Link>

                          <a
                            href={pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-medium transition"
                          >
                            <Download size={12} />
                            <span>PDF</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* TAB 4: ADVERTISER PORTAL */}
            {activeTab === "advertiser" && (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6 animate-in fade-in duration-150">
                <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white rounded-3xl p-8 sm:p-10 space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                    <Sparkles size={14} />
                    <span>Peto Business & Ads</span>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-extrabold font-heading tracking-tight">
                    Grow Your Pet Business with Peto Ads
                  </h2>

                  <p className="text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
                    Create targeted feed campaigns, promote pet services, certified veterinary clinics, or adoption drives to an active pet community.
                  </p>

                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <Link
                      to="/advertiser"
                      className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-md transition"
                    >
                      <Megaphone size={16} />
                      <span>Open Advertiser Portal</span>
                      <ChevronRight size={16} />
                    </Link>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs text-slate-600">
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-1">
                    <span className="font-bold text-slate-900 block font-heading">High-Intent Audience</span>
                    <span>Reach engaged pet parents actively searching for premium nutrition and pet health.</span>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-1">
                    <span className="font-bold text-slate-900 block font-heading">Verified Advertiser Badge</span>
                    <span>Build consumer trust with the Peto Certified Business checkmark on all promoted content.</span>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-1">
                    <span className="font-bold text-slate-900 block font-heading">Real-Time Telemetry</span>
                    <span>Track impressions, CTR, conversion rates, and budget allocation from a single dashboard.</span>
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
