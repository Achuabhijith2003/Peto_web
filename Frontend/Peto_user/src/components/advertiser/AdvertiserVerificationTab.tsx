import React, { useState, useEffect } from "react";
import {
  Building2,
  User,
  Clock,
  CheckCircle2,
  AlertTriangle,
  UploadCloud,
  FileText,
  Lock,
  ArrowRight,
  HelpCircle,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import api from "../../utils/api";

interface Props {
  profile: any;
  userProfile?: any;
  app: any;
  guidelines?: any;
  onRefresh: () => void;
  onOpenGuidelines: () => void;
}

export const AdvertiserVerificationTab: React.FC<Props> = ({
  profile,
  userProfile: initialUserProfile,
  app,
  guidelines: _guidelines,
  onRefresh,
  onOpenGuidelines,
}) => {
  const currentStatus = app?.status || profile?.verification_status || "NOT_STARTED";

  const [currentUserProfile, setCurrentUserProfile] = useState<any>(initialUserProfile || null);

  useEffect(() => {
    if (initialUserProfile) {
      setCurrentUserProfile(initialUserProfile);
    } else {
      api
        .get("/users/me")
        .then((res) => {
          if (res.data) {
            setCurrentUserProfile(res.data.profile || res.data.user || null);
          }
        })
        .catch(() => {});
    }
  }, [initialUserProfile]);

  // Wizard state for NOT_STARTED / Resubmission
  const [step, setStep] = useState(1);
  const [vType, setVType] = useState<"INDIVIDUAL_IDENTITY" | "BUSINESS_PARTNER">(
    "BUSINESS_PARTNER"
  );

  // Pre-fill user legal name strictly from the Peto user profile, NOT company_name!
  const userFullName = (
    currentUserProfile?.full_name ||
    currentUserProfile?.name ||
    initialUserProfile?.full_name ||
    initialUserProfile?.name ||
    ""
  ).trim();

  const nameParts = userFullName ? userFullName.split(/\s+/) : [];
  const defaultFirst = app?.legal_first_name || (nameParts.length > 0 ? nameParts[0] : "");
  const defaultLast = app?.legal_last_name || (nameParts.length > 1 ? nameParts.slice(1).join(" ") : "");

  const [formData, setFormData] = useState({
    legal_first_name: defaultFirst,
    legal_last_name: defaultLast,
    date_of_birth: app?.date_of_birth || "",
    nationality: app?.nationality || "US",
    residential_country: app?.residential_country || profile?.country_code || "US",
    address_line1: app?.address_line1 || "",
    city: app?.city || "",
    postal_code: app?.postal_code || "",

    business_legal_name: app?.business_legal_name || profile?.company_name || "",
    business_registration_number: "",
    business_tax_id: "",
    business_address: app?.business_address || "",
    business_website: app?.business_website || profile?.website_url || "",
    authorized_role: app?.authorized_role || "DIRECTOR",
  });

  // Sync when currentUserProfile is loaded or changes
  useEffect(() => {
    if (currentUserProfile) {
      const name = (currentUserProfile.full_name || currentUserProfile.name || "").trim();
      if (name) {
        const parts = name.split(/\s+/);
        setFormData((prev) => {
          const isCompanyFallback =
            profile?.company_name &&
            (prev.legal_first_name === profile.company_name ||
              `${prev.legal_first_name} ${prev.legal_last_name}`.trim() === profile.company_name);

          return {
            ...prev,
            legal_first_name: app?.legal_first_name || (!prev.legal_first_name || isCompanyFallback ? (parts[0] || "") : prev.legal_first_name),
            legal_last_name: app?.legal_last_name || (!prev.legal_last_name || isCompanyFallback ? (parts.slice(1).join(" ") || "") : prev.legal_last_name),
            date_of_birth: prev.date_of_birth || (currentUserProfile.date_of_birth ? currentUserProfile.date_of_birth.split("T")[0] : ""),
          };
        });
      }
    }
  }, [currentUserProfile, app, profile?.company_name]);

  const [nameConfirmed, setNameConfirmed] = useState(false);

  // Document upload state
  const [docType, setDocType] = useState<string>("PASSPORT");
  const [docNumber, setDocNumber] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [submittingApp, setSubmittingApp] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleDocumentUpload = async (appId: string) => {
    if (!docFile) return null;
    const body = new FormData();
    body.append("document", docFile);
    body.append("applicationId", appId);
    body.append("documentType", docType);
    body.append("documentNumber", docNumber);
    body.append("countryCode", formData.residential_country);
    body.append("isFront", "true");

    const res = await api.post("/advertisers/verification/documents", body, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingApp(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      // 1. Submit Application
      const res = await api.post("/advertisers/verification/submit", {
        verification_type: vType,
        ...formData,
      });

      const newAppId = res.data.application?.id;

      // 2. Upload Document if selected
      if (docFile && newAppId) {
        await handleDocumentUpload(newAppId);
      }

      setSuccessMsg("Application submitted successfully! Your account is now in queue for verification review.");
      await onRefresh();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || "Failed to submit verification application.");
    } finally {
      setSubmittingApp(false);
    }
  };

  const handleSupplementalUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile || !app?.id) return;
    setUploadingDoc(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      await handleDocumentUpload(app.id);
      setSuccessMsg("Document uploaded successfully. Compliance reviewers will be notified.");
      setDocFile(null);
      setDocNumber("");
      await onRefresh();
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error || "Failed to upload document.");
    } finally {
      setUploadingDoc(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Overview Status Banner */}
      {currentStatus === "APPROVED" ? (
        <div className="p-6 bg-[#f0fdf4] rounded-3xl border border-[#bbf7d0] shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#006c49] text-white flex items-center justify-center shadow-md shadow-[#006c49]/20">
              <CheckCircle2 size={26} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#dcfce7] text-[#006c49] uppercase tracking-wider mb-1 border border-[#bbf7d0]">
                ✓ Verified Partner
              </div>
              <h2 className="text-lg font-bold font-headline text-[#151c27]">
                {app?.verification_type === "BUSINESS_PARTNER"
                  ? "Verified Business Advertiser Partner"
                  : "Verified Individual Advertiser"}
              </h2>
              <p className="text-xs text-[#534434]">
                Approved on {new Date(app?.reviewed_at || Date.now()).toLocaleDateString()} • Full campaign publication privileges active
              </p>
            </div>
          </div>
          <div className="pt-2 flex flex-wrap gap-4 text-xs text-[#534434] border-t border-[#bbf7d0]/60">
            <div>
              <span className="text-slate-400">Entity: </span>
              <strong className="text-[#151c27]">{app?.business_legal_name || `${app?.legal_first_name} ${app?.legal_last_name}`}</strong>
            </div>
            <div>
              <span className="text-slate-400">Region: </span>
              <strong className="text-[#151c27]">{app?.residential_country}</strong>
            </div>
            <div>
              <span className="text-slate-400">Badge Tier: </span>
              <strong className="text-[#006c49] font-mono">
                {app?.verification_type === "BUSINESS_PARTNER" ? "BUSINESS" : "ADVERTISER"}
              </strong>
            </div>
          </div>
        </div>
      ) : currentStatus === "SUBMITTED" || currentStatus === "UNDER_REVIEW" ? (
        <div className="p-6 bg-[#fff8ed] rounded-3xl border border-[#fde68a] shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20 animate-pulse">
              <Clock size={26} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-[#855300] uppercase tracking-wider mb-1 border border-[#fde68a]">
                Under Review
              </div>
              <h2 className="text-lg font-bold font-headline text-[#151c27]">
                Verification Application In Progress
              </h2>
              <p className="text-xs text-[#534434]">
                Submitted on {new Date(app?.submitted_at || Date.now()).toLocaleDateString()} • Typical turnaround is 24-48 business hours
              </p>
            </div>
          </div>
          <p className="text-xs text-[#534434] leading-relaxed">
            Our compliance and trust & safety specialists are reviewing your submitted information and documents against regional advertising policies. You will receive an in-app notification once the review is finalized.
          </p>
        </div>
      ) : currentStatus === "ADDITIONAL_INFORMATION_REQUIRED" ? (
        <div className="p-6 bg-[#fff7ed] rounded-3xl border border-[#fed7aa] shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-orange-500 text-white flex items-center justify-center shadow-md shadow-orange-500/20">
              <AlertTriangle size={26} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-[#9a3412] uppercase tracking-wider mb-1 border border-[#fed7aa]">
                Action Required
              </div>
              <h2 className="text-lg font-bold font-headline text-[#151c27]">
                Additional Documentation Requested
              </h2>
              <p className="text-xs text-[#534434]">
                Please attach the requested clarification to complete your verification
              </p>
            </div>
          </div>

          <div className="p-4 bg-white border border-[#fed7aa] rounded-2xl text-xs text-[#9a3412]">
            <strong>Compliance Officer Note: </strong>
            <p className="mt-1">{app?.additional_info_notes || "Please submit updated proof of address or corporate licensing."}</p>
          </div>

          {/* Supplemental upload form */}
          <form onSubmit={handleSupplementalUpload} className="p-4 bg-white rounded-2xl border border-[#e2e8f8] space-y-3">
            <h4 className="text-xs font-bold font-headline text-[#151c27] uppercase tracking-wider">
              Upload Supplemental Document
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-[#534434] mb-1">Document Type</label>
                <select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#f0f3ff]/60 border border-[#e2e8f8] rounded-xl focus:bg-white text-[#151c27]"
                >
                  <option value="PASSPORT">Passport</option>
                  <option value="DRIVERS_LICENSE">Driver's License</option>
                  <option value="NATIONAL_ID">National ID Card</option>
                  <option value="INCORPORATION_DOC">Certificate of Incorporation</option>
                  <option value="TAX_CERTIFICATE">Tax Certificate / W-9 / GST</option>
                  <option value="UTILITY_BILL">Utility Bill / Proof of Address</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#534434] mb-1">Document ID Number (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. License / ID #"
                  value={docNumber}
                  onChange={(e) => setDocNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#f0f3ff]/60 border border-[#e2e8f8] rounded-xl focus:bg-white text-[#151c27]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-[#534434] mb-1">Select File (JPEG, PNG, PDF &le; 10MB)</label>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                className="text-xs text-[#534434] file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-[#f0f3ff] file:text-[#0058be] hover:file:bg-[#e7eefe]"
              />
            </div>

            <button
              type="submit"
              disabled={uploadingDoc || !docFile}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-2xl text-xs shadow-sm disabled:opacity-50 transition hover:scale-[1.01] active:scale-[0.99]"
            >
              {uploadingDoc ? "Encrypting & Uploading..." : "Upload Supplemental Document"}
            </button>
          </form>
        </div>
      ) : null}

      {/* Guidelines Header Button */}
      <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#e2e8f8] shadow-sm">
        <div className="flex items-center gap-2 text-xs text-[#534434]">
          <HelpCircle size={16} className="text-amber-500" />
          <span>Need help preparing your identity or organization documents?</span>
        </div>
        <button
          onClick={onOpenGuidelines}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-[#0058be] hover:bg-[#f0f3ff] font-bold text-xs border border-[#e2e8f8] transition"
        >
          <span>View Guidelines</span>
          <ExternalLink size={12} />
        </button>
      </div>

      {/* Verification Wizard (For NOT_STARTED, DRAFT, or Resubmission) */}
      {(currentStatus === "NOT_STARTED" || currentStatus === "DRAFT" || currentStatus === "REJECTED") && (
        <div className="bg-white rounded-3xl border border-[#e2e8f8] shadow-sm p-6 space-y-6">
          <div className="flex items-center justify-between border-b border-[#f0f3ff] pb-4">
            <div>
              <h3 className="text-base font-bold font-headline text-[#151c27]">
                Partner Verification Application
              </h3>
              <p className="text-xs text-[#534434]">
                Step {step} of 3: {step === 1 ? "Category Selection" : step === 2 ? "Legal Information" : "Document Ingestion"}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-bold transition ${
                    step === s
                      ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20"
                      : step > s
                      ? "bg-[#006c49] text-white"
                      : "bg-[#f0f3ff] text-[#534434]"
                  }`}
                >
                  {step > s ? "✓" : s}
                </div>
              ))}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-700 flex items-center gap-2">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Step 1: Category Selection */}
          {step === 1 && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold font-headline text-[#534434] uppercase tracking-wider">
                Select Your Advertiser Verification Track
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div
                  onClick={() => setVType("BUSINESS_PARTNER")}
                  className={`p-5 rounded-3xl border-2 cursor-pointer transition space-y-2 ${
                    vType === "BUSINESS_PARTNER"
                      ? "border-amber-500 bg-[#fff8ed] shadow-sm shadow-amber-500/10"
                      : "border-[#e2e8f8] bg-white hover:bg-[#f0f3ff]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                      <Building2 size={20} />
                    </div>
                    {vType === "BUSINESS_PARTNER" && (
                      <CheckCircle2 size={18} className="text-amber-500" />
                    )}
                  </div>
                  <div className="font-bold font-headline text-[#151c27] text-sm">Business or Organization</div>
                  <p className="text-xs text-[#534434] leading-relaxed">
                    For pet care companies, veterinary clinics, adoption shelters, product manufacturers, and registered commercial entities.
                  </p>
                </div>

                <div
                  onClick={() => setVType("INDIVIDUAL_IDENTITY")}
                  className={`p-5 rounded-3xl border-2 cursor-pointer transition space-y-2 ${
                    vType === "INDIVIDUAL_IDENTITY"
                      ? "border-amber-500 bg-[#fff8ed] shadow-sm shadow-amber-500/10"
                      : "border-[#e2e8f8] bg-white hover:bg-[#f0f3ff]"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-[#0058be] flex items-center justify-center">
                      <User size={20} />
                    </div>
                    {vType === "INDIVIDUAL_IDENTITY" && (
                      <CheckCircle2 size={18} className="text-amber-500" />
                    )}
                  </div>
                  <div className="font-bold font-headline text-[#151c27] text-sm">Individual Advertiser</div>
                  <p className="text-xs text-[#534434] leading-relaxed">
                    For independent pet trainers, community foster parents, private pet service providers, and individual creators.
                  </p>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-2xl shadow-sm text-xs flex items-center gap-1.5 transition hover:scale-[1.01] active:scale-[0.99]"
                >
                  <span>Continue to Legal Details</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Legal Details */}
          {step === 2 && (
            <div className="space-y-4">
              <h4 className="text-xs font-bold font-headline text-[#534434] uppercase tracking-wider">
                {vType === "BUSINESS_PARTNER" ? "Organization & Entity Details" : "Legal Identity Details"}
              </h4>

              {vType === "BUSINESS_PARTNER" ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#534434] mb-1.5">
                        Legal Business Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Bark & Bite Wellness LLC"
                        value={formData.business_legal_name}
                        onChange={(e) =>
                          setFormData({ ...formData, business_legal_name: e.target.value })
                        }
                        className="w-full px-4 py-2.5 text-xs bg-[#f0f3ff]/60 border border-[#e2e8f8] rounded-2xl focus:bg-white text-[#151c27]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#534434] mb-1.5">
                        Registration / Incorporation Country *
                      </label>
                      <select
                        value={formData.residential_country}
                        onChange={(e) =>
                          setFormData({ ...formData, residential_country: e.target.value })
                        }
                        className="w-full px-4 py-2.5 text-xs bg-[#f0f3ff]/60 border border-[#e2e8f8] rounded-2xl focus:bg-white text-[#151c27]"
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
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#534434] mb-1.5">
                        Business Registration / CIN / CRN
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. US-12345678"
                        value={formData.business_registration_number}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            business_registration_number: e.target.value,
                          })
                        }
                        className="w-full px-4 py-2.5 text-xs bg-[#f0f3ff]/60 border border-[#e2e8f8] rounded-2xl focus:bg-white text-[#151c27]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#534434] mb-1.5">
                        Federal Tax ID / EIN / GSTIN / VAT
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 12-3456789 or 27AAAAA0000A1Z5"
                        value={formData.business_tax_id}
                        onChange={(e) =>
                          setFormData({ ...formData, business_tax_id: e.target.value })
                        }
                        className="w-full px-4 py-2.5 text-xs bg-[#f0f3ff]/60 border border-[#e2e8f8] rounded-2xl focus:bg-white text-[#151c27]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#534434] mb-1.5">
                      Official Business Physical Address *
                    </label>
                    <input
                      type="text"
                      placeholder="Street address, Suite, City, Postal Code"
                      value={formData.business_address}
                      onChange={(e) =>
                        setFormData({ ...formData, business_address: e.target.value })
                      }
                      className="w-full px-4 py-2.5 text-xs bg-[#f0f3ff]/60 border border-[#e2e8f8] rounded-2xl focus:bg-white text-[#151c27]"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Profile Verification & Match Callout */}
                  <div className="p-4 bg-[#fff8ed] border border-[#fde68a] rounded-3xl space-y-3">
                    <div className="flex items-start gap-2.5">
                      <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-600" />
                      <div>
                        <h5 className="font-headline font-bold text-xs text-[#855300] uppercase tracking-wider">
                          Profile Identity Confirmation Required
                        </h5>
                        <p className="text-xs text-[#534434] mt-0.5 leading-relaxed">
                          The legal name below is automatically loaded from your Peto user profile. It must <strong>exactly match</strong> your government-issued ID. If this name does not match your official legal document, you must edit your Peto profile first.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 bg-white rounded-2xl border border-[#fde68a] text-xs space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <span className="text-slate-400 font-medium">Account Legal Identity: </span>
                          <strong className="text-[#151c27] text-sm font-headline font-bold">
                            {formData.legal_first_name} {formData.legal_last_name}
                          </strong>
                        </div>
                        <a
                          href="/profile/edit"
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-amber-600 font-bold hover:underline inline-flex items-center gap-1"
                        >
                          <span>Edit Profile Legal Name</span>
                          <ExternalLink size={12} />
                        </a>
                      </div>

                      <div className="pt-2 border-t border-slate-100 flex items-start gap-2 text-xs">
                        <input
                          type="checkbox"
                          id="nameConfirmCheck"
                          checked={nameConfirmed}
                          onChange={(e) => setNameConfirmed(e.target.checked)}
                          className="mt-0.5 rounded text-amber-500 focus:ring-amber-400 cursor-pointer"
                        />
                        <label htmlFor="nameConfirmCheck" className="text-[#151c27] font-medium cursor-pointer leading-tight">
                          I confirm that <strong>"{formData.legal_first_name} {formData.legal_last_name}"</strong> is my true, legal name matching my official ID. I understand that any discrepancy between my Peto profile and document will cause this verification to be immediately <strong>rejected</strong>.
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#534434] mb-1.5">
                        Legal First Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="First name as on Government ID"
                        value={formData.legal_first_name}
                        onChange={(e) =>
                          setFormData({ ...formData, legal_first_name: e.target.value })
                        }
                        className="w-full px-4 py-2.5 text-xs bg-[#f0f3ff]/60 border border-[#e2e8f8] rounded-2xl focus:bg-white text-[#151c27]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#534434] mb-1.5">
                        Legal Last Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Last name as on Government ID"
                        value={formData.legal_last_name}
                        onChange={(e) =>
                          setFormData({ ...formData, legal_last_name: e.target.value })
                        }
                        className="w-full px-4 py-2.5 text-xs bg-[#f0f3ff]/60 border border-[#e2e8f8] rounded-2xl focus:bg-white text-[#151c27]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-[#534434] mb-1.5">
                        Date of Birth *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.date_of_birth}
                        onChange={(e) =>
                          setFormData({ ...formData, date_of_birth: e.target.value })
                        }
                        className="w-full px-4 py-2.5 text-xs bg-[#f0f3ff]/60 border border-[#e2e8f8] rounded-2xl focus:bg-white text-[#151c27]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[#534434] mb-1.5">
                        Country of Residence *
                      </label>
                      <select
                        value={formData.residential_country}
                        onChange={(e) =>
                          setFormData({ ...formData, residential_country: e.target.value })
                        }
                        className="w-full px-4 py-2.5 text-xs bg-[#f0f3ff]/60 border border-[#e2e8f8] rounded-2xl focus:bg-white text-[#151c27]"
                      >
                        <option value="US">United States</option>
                        <option value="IN">India</option>
                        <option value="GB">United Kingdom</option>
                        <option value="CA">Canada</option>
                        <option value="AU">Australia</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-[#f0f3ff]">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 bg-white border border-[#e2e8f8] text-[#151c27] hover:bg-[#f0f3ff] text-xs font-bold rounded-2xl transition"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (vType === "INDIVIDUAL_IDENTITY" && !nameConfirmed) {
                      setErrorMsg("Please confirm that your profile legal name matches your official ID before proceeding.");
                      return;
                    }
                    setErrorMsg("");
                    setStep(3);
                  }}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-2xl shadow-sm text-xs flex items-center gap-1.5 transition hover:scale-[1.01] active:scale-[0.99]"
                >
                  <span>Continue to Document Ingestion</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Document Ingestion */}
          {step === 3 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h4 className="text-xs font-bold font-headline text-[#534434] uppercase tracking-wider">
                Identity & Business Document Verification
              </h4>

              <div className="p-4 bg-[#f0f3ff]/60 rounded-2xl border border-[#e2e8f8] text-xs space-y-2">
                <div className="font-bold text-[#151c27] flex items-center gap-1.5">
                  <Lock size={14} className="text-amber-500" />
                  Zero-Knowledge Security Ingest
                </div>
                <p className="text-[#534434] text-[11px] leading-relaxed">
                  Your document will be encrypted and saved to a private storage bucket. Identification numbers are automatically masked and will never be shown on your public Peto profile.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#534434] mb-1.5">
                    Select Document Type *
                  </label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs bg-[#f0f3ff]/60 border border-[#e2e8f8] rounded-2xl focus:bg-white text-[#151c27]"
                  >
                    <option value="PASSPORT">Passport</option>
                    <option value="DRIVERS_LICENSE">Driver's License</option>
                    <option value="NATIONAL_ID">National ID Card</option>
                    <option value="INCORPORATION_DOC">Certificate of Incorporation</option>
                    <option value="TAX_CERTIFICATE">Tax Certificate / W-9 / GSTIN</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#534434] mb-1.5">
                    Document Number (Optional - Will be masked)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 12345678"
                    value={docNumber}
                    onChange={(e) => setDocNumber(e.target.value)}
                    className="w-full px-4 py-2.5 text-xs bg-[#f0f3ff]/60 border border-[#e2e8f8] rounded-2xl focus:bg-white text-[#151c27]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#534434] mb-1.5">
                  Upload Front Image or PDF *
                </label>
                <div className="border-2 border-dashed border-[#e2e8f8] hover:border-amber-400 rounded-3xl p-6 text-center space-y-2 bg-[#f0f3ff]/30 transition">
                  <UploadCloud size={32} className="mx-auto text-[#0058be]" />
                  <div className="text-xs text-[#534434]">
                    <label className="font-bold text-amber-600 hover:underline cursor-pointer">
                      Click to choose file
                      <input
                        type="file"
                        required
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>{" "}
                    or drag & drop
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Supported: JPEG, PNG, WebP, PDF (Max 10MB)
                  </p>
                  {docFile && (
                    <div className="pt-2 text-xs font-bold text-[#006c49] flex items-center justify-center gap-1">
                      <FileText size={14} />
                      <span>{docFile.name} ({(docFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3.5 bg-[#fff8ed] border border-[#fde68a] rounded-2xl text-xs text-[#855300] leading-relaxed">
                By submitting, you certify that the provided information and documentation are truthful and legitimate. Submitting false or misleading documents is prohibited under Peto Terms of Service.
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#f0f3ff]">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 bg-white border border-[#e2e8f8] text-[#151c27] hover:bg-[#f0f3ff] text-xs font-bold rounded-2xl transition"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={submittingApp}
                  className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-bold rounded-2xl shadow-sm text-xs transition hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50"
                >
                  {submittingApp ? "Submitting Application..." : "Submit Verification Application"}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Submitted Documents Summary if existing */}
      {app?.documents?.length > 0 && (
        <div className="bg-white rounded-3xl border border-[#e2e8f8] shadow-sm p-6 space-y-4">
          <h3 className="text-xs font-bold font-headline text-[#151c27] uppercase tracking-wider flex items-center gap-1.5">
            <FileText size={15} className="text-amber-500" />
            Uploaded Verification Assets ({app.documents.length})
          </h3>

          <div className="space-y-2">
            {app.documents.map((doc: any) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3.5 bg-[#f9f9ff] rounded-2xl border border-[#e2e8f8] text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl border border-[#e2e8f8] text-[#0058be]">
                    <FileText size={16} />
                  </div>
                  <div>
                    <div className="font-semibold text-[#151c27]">
                      {doc.document_type} ({doc.country_code})
                    </div>
                    <div className="text-[11px] text-[#534434] font-mono">
                      Masked Reference: {doc.document_number_masked || "Masked for Privacy"}
                    </div>
                  </div>
                </div>

                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#f0f3ff] text-[#0058be] border border-[#e2e8f8]">
                  {doc.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
