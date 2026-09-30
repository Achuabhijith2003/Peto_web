import React, { useState, useEffect, useCallback } from "react";
import {
  Building2,
  FileCheck2,
  MapPin,
  UserCheck,
  Upload,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Save,
  Trash2,
  AlertTriangle,
  Lock,
  Clock,
  ShieldCheck,
  FileText,
  X,
} from "lucide-react";
import api from "../../utils/api";

interface BusinessVerificationWizardProps {
  businessId: string;
  onSuccess?: () => void;
  onClose?: () => void;
}

interface DocumentItem {
  id: string;
  document_type: string;
  original_file_name: string;
  file_size_bytes?: number;
  status: string;
  created_at: string;
}

export const BusinessVerificationWizard: React.FC<BusinessVerificationWizardProps> = ({
  businessId,
  onSuccess,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [uploadingDocType, setUploadingDocType] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [saveMessage, setSaveMessage] = useState<string>("");
  const [applicationId, setApplicationId] = useState<string>("");
  const [appStatus, setAppStatus] = useState<string>("NOT_STARTED");
  const [uploadedDocs, setUploadedDocs] = useState<DocumentItem[]>([]);
  const [requirements, setRequirements] = useState<any>(null);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Business Information
    name: "",
    legal_name: "",
    business_type: "PRIVATE_COMPANY",
    business_category: "Pet Food & Nutrition",
    country_code: "IN",
    website_url: "",
    business_description: "",

    // Step 2: Registration
    registration_number: "",
    registration_identifier_type: "GSTIN",
    registration_authority: "",
    registration_country: "IN",
    registration_state: "",
    registration_date: "",
    tax_identifier: "",

    // Step 3: Address & Contact
    registered_address: "",
    address_line2: "",
    city: "",
    state_province: "",
    postal_code: "",
    contact_email: "",
    contact_phone: "",

    // Step 4: Authorized Representative
    representative_name: "",
    representative_role: "",
    representative_relationship: "OWNER",
    representative_email: "",
    representative_phone: "",

    // Step 6: Confirmation
    declaration_confirmed: false,
  });

  // Fetch Requirements for Country
  const fetchRequirements = useCallback(async (country: string, businessType?: string) => {
    try {
      const res = await api.get("/verification/requirements", {
        params: { subjectType: "BUSINESS", country, businessType },
      });
      if (res.data.requirements) {
        setRequirements(res.data.requirements);
        // Default identifier type if not set
        if (res.data.requirements.supportedIdentifierTypes?.length > 0) {
          setFormData((prev) => ({
            ...prev,
            registration_identifier_type: prev.registration_identifier_type || res.data.requirements.supportedIdentifierTypes[0],
          }));
        }
      }
    } catch {
      // Fallback
    }
  }, []);

  // Load Existing Application Draft or Details
  const loadApplication = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const res = await api.get(`/verification/businesses/${businessId}/application`);
      const { business, application } = res.data;

      const country = application?.residential_country || business?.country_code || "IN";
      await fetchRequirements(country, application?.business_type || business?.business_type);

      if (application) {
        setApplicationId(application.id);
        setAppStatus(application.status || "DRAFT");
        if (application.verification_documents) {
          setUploadedDocs(application.verification_documents);
        }
        if (application.draft_step && application.draft_step >= 1 && application.draft_step <= 6) {
          setCurrentStep(application.draft_step);
        }

        setFormData({
          name: business?.name || application.verified_name || "",
          legal_name: application.business_legal_name || business?.legal_name || "",
          business_type: application.business_type || business?.business_type || "PRIVATE_COMPANY",
          business_category: application.business_category || business?.business_category || "Pet Food & Nutrition",
          country_code: country,
          website_url: application.website_url || business?.website_url || "",
          business_description: application.business_description || business?.description || "",

          registration_number: application.registration_number || application.business_registration_number_masked || "",
          registration_identifier_type: application.registration_identifier_type || "GSTIN",
          registration_authority: application.registration_authority || "",
          registration_country: application.registration_country || country,
          registration_state: application.registration_state || "",
          registration_date: application.registration_date ? application.registration_date.split("T")[0] : "",
          tax_identifier: application.tax_identifier || application.business_tax_id_masked || "",

          registered_address: application.registered_address || application.business_address || application.address_line1 || "",
          address_line2: application.address_line2 || "",
          city: application.city || "",
          state_province: application.state_province || "",
          postal_code: application.postal_code || "",
          contact_email: application.contact_email || "",
          contact_phone: application.contact_phone || "",

          representative_name: application.representative_name || "",
          representative_role: application.representative_role || application.authorized_role || "",
          representative_relationship: application.representative_relationship || "OWNER",
          representative_email: application.representative_email || "",
          representative_phone: application.representative_phone || "",

          declaration_confirmed: application.declaration_confirmed === true,
        });
      } else if (business) {
        setFormData((prev) => ({
          ...prev,
          name: business.name || "",
          legal_name: business.legal_name || "",
          country_code: business.country_code || "IN",
          website_url: business.website_url || "",
        }));
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to load business verification application.");
    } finally {
      setLoading(false);
    }
  }, [businessId, fetchRequirements]);

  useEffect(() => {
    loadApplication();
  }, [loadApplication]);

  // Handle Country Change
  const handleCountryChange = (newCountry: string) => {
    setFormData((prev) => ({ ...prev, country_code: newCountry, registration_country: newCountry }));
    fetchRequirements(newCountry, formData.business_type);
  };

  // Save Draft
  const handleSaveDraft = async (stepToSave: number = currentStep) => {
    try {
      setSaving(true);
      setError("");
      setSaveMessage("");
      const res = await api.post(`/verification/businesses/${businessId}/draft`, {
        ...formData,
        draft_step: stepToSave,
      });
      if (res.data.application) {
        setApplicationId(res.data.application.id);
        setAppStatus(res.data.application.status);
      }
      setSaveMessage("Draft saved successfully.");
      setTimeout(() => setSaveMessage(""), 3500);
      return true;
    } catch (err: any) {
      setError(err.response?.data?.error || "Could not save draft progress.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Step Navigation
  const goToNextStep = async () => {
    setError("");
    // Validate current step before advancing
    if (currentStep === 1) {
      if (!formData.name.trim() || !formData.legal_name.trim() || !formData.country_code) {
        setError("Please provide business display name, legal business name, and country.");
        return;
      }
    } else if (currentStep === 2) {
      if (!formData.registration_number.trim()) {
        setError("Please provide your business registration number or identifier.");
        return;
      }
    } else if (currentStep === 3) {
      if (!formData.registered_address.trim() || !formData.city.trim() || !formData.postal_code.trim()) {
        setError("Please complete the registered business address, city, and postal code.");
        return;
      }
    } else if (currentStep === 4) {
      if (!formData.representative_name.trim() || !formData.representative_role.trim()) {
        setError("Please provide the authorized representative's full name and organizational role.");
        return;
      }
    }

    const next = Math.min(6, currentStep + 1);
    await handleSaveDraft(next);
    setCurrentStep(next);
  };

  const goToPrevStep = () => {
    setError("");
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  // Document Upload
  const handleFileUpload = async (docType: string, file: File) => {
    try {
      setUploadingDocType(docType);
      setError("");
      const form = new FormData();
      if (applicationId) {
        form.append("applicationId", applicationId);
      }
      form.append("documentType", docType);
      form.append("document", file);

      const res = await api.post(`/verification/businesses/${businessId}/documents`, form);
      if (res.data.document) {
        if (!applicationId && res.data.document.applicationId) {
          setApplicationId(res.data.document.applicationId);
        }
        // Reload docs list
        await loadApplication();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to upload document evidence.");
    } finally {
      setUploadingDocType(null);
    }
  };

  // Document Deletion
  const handleDeleteDocument = async (docId: string) => {
    try {
      setError("");
      await api.delete(`/verification/businesses/${businessId}/documents/${docId}`);
      setUploadedDocs((prev) => prev.filter((d) => d.id !== docId));
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to delete document.");
    }
  };

  // Submit Final Application
  const handleSubmit = async () => {
    try {
      setError("");
      if (!formData.declaration_confirmed) {
        setError("You must confirm the legal accuracy and authorization declaration before submitting.");
        return;
      }
      if (uploadedDocs.length === 0) {
        setError("Please upload at least one official business registration document before submitting.");
        return;
      }

      setSubmitting(true);
      const res = await api.post(`/verification/businesses/${businessId}/submit`, {
        ...formData,
      });

      if (res.data.application) {
        setAppStatus("SUBMITTED");
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to submit business verification application.");
    } finally {
      setSubmitting(false);
    }
  };

  const stepsList = [
    { number: 1, label: "Business", title: "Business Information" },
    { number: 2, label: "Registration", title: "Business Registration" },
    { number: 3, label: "Contact", title: "Address & Contact" },
    { number: 4, label: "Representative", title: "Authorized Representative" },
    { number: 5, label: "Documents", title: "Evidence & Documents" },
    { number: 6, label: "Review", title: "Review & Submit" },
  ];

  if (loading) {
    return (
      <div className="p-12 text-center space-y-3 bg-white rounded-3xl border border-slate-200 shadow-sm">
        <Clock className="w-8 h-8 animate-spin text-amber-500 mx-auto" />
        <p className="text-sm font-semibold text-slate-700">Loading business verification application...</p>
      </div>
    );
  }

  // Submitted / Under Review State
  if (appStatus === "SUBMITTED" || appStatus === "UNDER_REVIEW") {
    return (
      <div className="p-8 bg-white rounded-3xl border border-amber-200/80 shadow-sm space-y-6 text-center">
        <div className="w-16 h-16 bg-amber-50 rounded-2xl border border-amber-200 text-amber-600 flex items-center justify-center mx-auto">
          <Clock size={32} className="animate-spin" />
        </div>
        <div className="space-y-2 max-w-md mx-auto">
          <h2 className="text-xl font-bold text-slate-900">Application Under Compliance Review</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Your verification request for <strong className="text-slate-900">{formData.name}</strong> has been submitted.
            Our compliance team will inspect your submitted documents and business registration details.
          </p>
        </div>
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-left max-w-md mx-auto space-y-2 text-xs">
          <div className="flex justify-between">
            <span className="text-slate-500">Legal Business Name:</span>
            <span className="font-semibold text-slate-800">{formData.legal_name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Country:</span>
            <span className="font-semibold text-slate-800">{formData.country_code}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Evidence Uploaded:</span>
            <span className="font-semibold text-emerald-700">{uploadedDocs.length} Document(s)</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Target Badge:</span>
            <span className="font-bold text-amber-600 flex items-center gap-1">
              <CheckCircle2 size={13} className="text-amber-500" /> Yellow Verified Tick
            </span>
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer"
          >
            Close Window
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Header with Title and Close */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-amber-50/50 via-white to-white">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
            <Building2 size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 font-heading">
                Business Verification
              </h2>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800">
                Official Entity
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Submit authoritative verification evidence to earn the Yellow Verified Business Badge.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {appStatus === "DRAFT" && (
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
              Draft Mode
            </span>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
            >
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar / Stepper */}
      <div className="px-6 py-4 bg-slate-50/60 border-b border-slate-100">
        <div className="grid grid-cols-6 gap-2">
          {stepsList.map((step) => {
            const isCompleted = currentStep > step.number;
            const isCurrent = currentStep === step.number;
            return (
              <button
                key={step.number}
                type="button"
                onClick={() => {
                  if (step.number < currentStep) setCurrentStep(step.number);
                }}
                disabled={step.number > currentStep}
                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl text-left transition ${
                  isCurrent
                    ? "bg-white shadow-xs border border-amber-300"
                    : isCompleted
                    ? "cursor-pointer hover:bg-white/60"
                    : "opacity-40 cursor-not-allowed"
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold ${
                    isCompleted
                      ? "bg-emerald-500 text-white"
                      : isCurrent
                      ? "bg-amber-500 text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {isCompleted ? <CheckCircle2 size={13} /> : step.number}
                </div>
                <span
                  className={`text-[11px] font-semibold truncate ${
                    isCurrent ? "text-amber-900 font-bold" : "text-slate-600"
                  }`}
                >
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Alerts */}
      <div className="px-6 pt-4">
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2">
            <AlertTriangle size={16} className="text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {saveMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{saveMessage}</span>
          </div>
        )}
      </div>

      {/* Scrollable Form Body */}
      <div className="p-6 flex-1 space-y-6 overflow-y-auto max-h-[65vh]">
        {/* STEP 1: BUSINESS INFORMATION */}
        {currentStep === 1 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 size={18} className="text-amber-500" />
                Step 1: Business Identity &amp; Classification
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Provide core organizational and brand details as they appear on official incorporation records.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Business Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. HappyPaws Nutrition"
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 transition"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Public brand name shown on Peto.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Legal Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.legal_name}
                  onChange={(e) => setFormData({ ...formData, legal_name: e.target.value })}
                  placeholder="e.g. HappyPaws Pet Nutrition Pvt Ltd"
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 transition"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Exact registered name on corporate registry.
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Country of Registration *
                </label>
                <select
                  value={formData.country_code}
                  onChange={(e) => handleCountryChange(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 transition"
                >
                  <option value="IN">India (IN)</option>
                  <option value="US">United States (US)</option>
                  <option value="GB">United Kingdom (GB)</option>
                  <option value="CA">Canada (CA)</option>
                  <option value="AU">Australia (AU)</option>
                  <option value="DE">Germany (DE)</option>
                  <option value="FR">France (FR)</option>
                  <option value="SG">Singapore (SG)</option>
                  <option value="AE">United Arab Emirates (AE)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Business Entity Type *
                </label>
                <select
                  value={formData.business_type}
                  onChange={(e) => setFormData({ ...formData, business_type: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 transition"
                >
                  {requirements?.supportedBusinessTypes?.map((bt: string) => (
                    <option key={bt} value={bt}>
                      {bt.replace(/_/g, " ")}
                    </option>
                  )) || (
                    <>
                      <option value="PRIVATE_COMPANY">Private Company</option>
                      <option value="PUBLIC_COMPANY">Public Company</option>
                      <option value="LLC">LLC</option>
                      <option value="LLP">LLP</option>
                      <option value="SOLE_PROPRIETORSHIP">Sole Proprietorship</option>
                      <option value="PARTNERSHIP">Partnership</option>
                      <option value="NON_PROFIT">Non-Profit</option>
                      <option value="OTHER">Other</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Industry / Category *
                </label>
                <select
                  value={formData.business_category}
                  onChange={(e) => setFormData({ ...formData, business_category: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 transition"
                >
                  {requirements?.businessCategories?.map((cat: string) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  )) || (
                    <>
                      <option value="Pet Food & Nutrition">Pet Food &amp; Nutrition</option>
                      <option value="Pet Products">Pet Products</option>
                      <option value="Pet Accessories">Pet Accessories</option>
                      <option value="Pet Grooming">Pet Grooming</option>
                      <option value="Pet Training">Pet Training</option>
                      <option value="Pet Boarding">Pet Boarding</option>
                      <option value="Pet Shop">Pet Shop</option>
                      <option value="Pet Supplies">Pet Supplies</option>
                      <option value="Pet Adoption">Pet Adoption</option>
                      <option value="Animal Shelter">Animal Shelter</option>
                      <option value="Pet Services">Pet Services</option>
                      <option value="Pet Insurance">Pet Insurance</option>
                      <option value="Pet Technology">Pet Technology</option>
                      <option value="Veterinary / Animal Care">Veterinary / Animal Care</option>
                      <option value="Other">Other</option>
                    </>
                  )}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Official Website URL
              </label>
              <input
                type="url"
                value={formData.website_url}
                onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                placeholder="https://www.yourbusiness.com"
                className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Business Description (Optional)
              </label>
              <textarea
                rows={2}
                value={formData.business_description}
                onChange={(e) => setFormData({ ...formData, business_description: e.target.value })}
                placeholder="Brief summary of your pet-related products, services, or organizational mission."
                className="w-full px-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 transition"
              />
            </div>
          </div>
        )}

        {/* STEP 2: REGISTRATION INFORMATION */}
        {currentStep === 2 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileCheck2 size={18} className="text-amber-500" />
                Step 2: Business Registration &amp; Legal Identifiers
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Country-specific legal registration parameters ({formData.country_code}).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Registration Identifier Type *
                </label>
                <select
                  value={formData.registration_identifier_type}
                  onChange={(e) => setFormData({ ...formData, registration_identifier_type: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 transition"
                >
                  {requirements?.supportedIdentifierTypes?.map((idType: string) => (
                    <option key={idType} value={idType}>
                      {idType.replace(/_/g, " ")}
                    </option>
                  )) || (
                    <>
                      <option value="GSTIN">GSTIN (India)</option>
                      <option value="CIN">CIN (India)</option>
                      <option value="EIN">EIN (US)</option>
                      <option value="CRN">CRN (UK)</option>
                      <option value="BUSINESS_REGISTRATION_NUMBER">Business Reg Number</option>
                      <option value="OTHER">Other</option>
                    </>
                  )}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {requirements?.identifierLabel || "Identifier standard for registration country"}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Registration Number / Identifier *
                </label>
                <input
                  type="text"
                  required
                  value={formData.registration_number}
                  onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                  placeholder="e.g. 29AAAAA0000A1Z5 or U72900KA2020PTC123456"
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 font-mono transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Registration Authority (Optional)
                </label>
                <input
                  type="text"
                  value={formData.registration_authority}
                  onChange={(e) => setFormData({ ...formData, registration_authority: e.target.value })}
                  placeholder="e.g. Registrar of Companies / Dept of State"
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  State / Province of Incorporation
                </label>
                <input
                  type="text"
                  value={formData.registration_state}
                  onChange={(e) => setFormData({ ...formData, registration_state: e.target.value })}
                  placeholder="e.g. Karnataka / California"
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Registration Date (Optional)
                </label>
                <input
                  type="date"
                  value={formData.registration_date}
                  onChange={(e) => setFormData({ ...formData, registration_date: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Tax / VAT Identifier (If different from registration number)
              </label>
              <input
                type="text"
                value={formData.tax_identifier}
                onChange={(e) => setFormData({ ...formData, tax_identifier: e.target.value })}
                placeholder="e.g. PAN / VAT / Tax ID"
                className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 font-mono transition"
              />
            </div>
          </div>
        )}

        {/* STEP 3: ADDRESS & CONTACT */}
        {currentStep === 3 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <MapPin size={18} className="text-amber-500" />
                Step 3: Registered Office Address &amp; Contact
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Official physical address where the business is registered.
              </p>
            </div>

            <div className="p-3.5 bg-amber-50/70 border border-amber-200/60 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
              <Lock size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Privacy Guaranteed:</strong> Registered business address details are kept strictly private for verification audit and will not be displayed on public social profiles without explicit configuration.
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Registered Address Line 1 *
                </label>
                <input
                  type="text"
                  required
                  value={formData.registered_address}
                  onChange={(e) => setFormData({ ...formData, registered_address: e.target.value })}
                  placeholder="Street address, building number, suite / floor"
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Address Line 2 (Optional)
                </label>
                <input
                  type="text"
                  value={formData.address_line2}
                  onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                  placeholder="Apartment, unit, landmark"
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    placeholder="City"
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    State / Province / Region
                  </label>
                  <input
                    type="text"
                    value={formData.state_province}
                    onChange={(e) => setFormData({ ...formData, state_province: e.target.value })}
                    placeholder="State or Region"
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Postal / ZIP Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.postal_code}
                    onChange={(e) => setFormData({ ...formData, postal_code: e.target.value })}
                    placeholder="Postal code"
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Business Contact Email
                  </label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    placeholder="contact@yourbusiness.com"
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Business Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    placeholder="+91 98765 43210"
                    className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 transition"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: AUTHORIZED REPRESENTATIVE */}
        {currentStep === 4 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <UserCheck size={18} className="text-amber-500" />
                Step 4: Authorized Representative
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                The individual legally authorized to submit this verification request on behalf of the company.
              </p>
            </div>

            <div className="p-3.5 bg-blue-50/70 border border-blue-200/60 rounded-2xl text-xs text-blue-900 flex items-start gap-2.5">
              <ShieldCheck size={16} className="text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Account Authorization:</strong> Your active Peto login account is verified as an authorized manager of this business identity. Submissions are cryptographically tied to your user audit history.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Representative Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.representative_name}
                  onChange={(e) => setFormData({ ...formData, representative_name: e.target.value })}
                  placeholder="As shown on official ID"
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Role / Position in Business *
                </label>
                <input
                  type="text"
                  required
                  value={formData.representative_role}
                  onChange={(e) => setFormData({ ...formData, representative_role: e.target.value })}
                  placeholder="e.g. Managing Director, CEO, Founder, Legal Counsel"
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Relationship to Business *
                </label>
                <select
                  value={formData.representative_relationship}
                  onChange={(e) => setFormData({ ...formData, representative_relationship: e.target.value })}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 transition"
                >
                  {requirements?.representativeRelationships?.map((rel: string) => (
                    <option key={rel} value={rel}>
                      {rel.replace(/_/g, " ")}
                    </option>
                  )) || (
                    <>
                      <option value="OWNER">Owner</option>
                      <option value="DIRECTOR">Director</option>
                      <option value="AUTHORIZED_REPRESENTATIVE">Authorized Representative</option>
                      <option value="PARTNER">Partner</option>
                      <option value="MANAGER">Manager</option>
                      <option value="OTHER">Other</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Representative Email
                </label>
                <input
                  type="email"
                  value={formData.representative_email}
                  onChange={(e) => setFormData({ ...formData, representative_email: e.target.value })}
                  placeholder="official@yourbusiness.com"
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Representative Phone
                </label>
                <input
                  type="tel"
                  value={formData.representative_phone}
                  onChange={(e) => setFormData({ ...formData, representative_phone: e.target.value })}
                  placeholder="+91 98765 43210"
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 transition"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: EVIDENCE & DOCUMENTS */}
        {currentStep === 5 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Upload size={18} className="text-amber-500" />
                Step 5: Business Verification Documents &amp; Evidence
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Upload official corporate records for compliance team review.
              </p>
            </div>

            <div className="p-3.5 bg-amber-50/70 border border-amber-200/60 rounded-2xl text-xs text-amber-900 flex items-start gap-2.5">
              <Lock size={15} className="text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Private Zero-Knowledge Storage:</strong> Uploaded business documents are stored in encrypted private buckets. Only authorized Peto compliance administrators can view them via short-lived signed URLs.
              </span>
            </div>

            {/* Document Requirements List */}
            <div className="space-y-4">
              {[
                ...(requirements?.requiredDocuments || [
                  {
                    type: "BUSINESS_REGISTRATION_DOCUMENT",
                    label: "Business Registration Document",
                    description: "Certificate of Incorporation, Articles of Association, or Official Registry extract.",
                    required: true,
                  },
                  {
                    type: "PROOF_OF_BUSINESS_ADDRESS",
                    label: "Proof of Business Address",
                    description: "Utility bill, bank statement, or official lease agreement issued within the last 3 months.",
                    required: true,
                  },
                ]),
                ...(requirements?.optionalDocuments || [
                  {
                    type: "TAX_REGISTRATION_DOCUMENT",
                    label: "Tax / VAT / GST Registration Document",
                    description: "Official tax registration or exemption certificate.",
                    required: false,
                  },
                  {
                    type: "BUSINESS_LICENSE",
                    label: "Business License / Permit",
                    description: "Industry-specific license (e.g., Veterinary, Pet Care, Retail).",
                    required: false,
                  },
                ]),
              ].map((docReq: any) => {
                const existing = uploadedDocs.find(
                  (d) =>
                    d.document_type === docReq.type ||
                    (docReq.type === "BUSINESS_REGISTRATION_DOCUMENT" && d.document_type === "INCORPORATION_DOC") ||
                    (docReq.type === "PROOF_OF_BUSINESS_ADDRESS" && d.document_type === "UTILITY_BILL") ||
                    (docReq.type === "TAX_REGISTRATION_DOCUMENT" && d.document_type === "TAX_CERTIFICATE")
                );

                const isUploading = uploadingDocType === docReq.type;

                return (
                  <div
                    key={docReq.type}
                    className="p-4 bg-slate-50/60 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileText size={16} className="text-blue-600" />
                        <h4 className="text-xs font-bold text-slate-900">{docReq.label}</h4>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            docReq.required
                              ? "bg-rose-100 text-rose-800"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {docReq.required ? "Required" : "Optional"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">{docReq.description}</p>

                      {existing && (
                        <div className="pt-2 flex items-center gap-2 text-xs text-emerald-700 font-semibold">
                          <CheckCircle2 size={14} className="text-emerald-600" />
                          <span className="truncate max-w-[200px]">{existing.original_file_name}</span>
                          <span className="text-[10px] text-slate-400">
                            ({existing.file_size_bytes ? `${Math.round(existing.file_size_bytes / 1024)} KB` : "Uploaded"})
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {existing ? (
                        <>
                          <label className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition cursor-pointer">
                            {isUploading ? "Uploading..." : "Replace"}
                            <input
                              type="file"
                              accept=".pdf,.png,.jpg,.jpeg"
                              disabled={isUploading}
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleFileUpload(docReq.type, f);
                              }}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => handleDeleteDocument(existing.id)}
                            className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Remove document"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      ) : (
                        <label className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5">
                          <Upload size={13} />
                          <span>{isUploading ? "Uploading..." : "Upload Document"}</span>
                          <input
                            type="file"
                            accept=".pdf,.png,.jpg,.jpeg"
                            disabled={isUploading}
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleFileUpload(docReq.type, f);
                            }}
                          />
                        </label>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 6: REVIEW & SUBMIT */}
        {currentStep === 6 && (
          <div className="space-y-5 animate-in fade-in duration-200">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-emerald-600" />
                Step 6: Review Application &amp; Confirm Submission
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Review all business verification parameters before submitting to the compliance queue.
              </p>
            </div>

            {/* Summary Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Business Identity */}
              <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Building2 size={13} className="text-amber-500" /> Business Identity
                  </h4>
                  <button
                    onClick={() => setCurrentStep(1)}
                    className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Display Name:</span>
                    <span className="font-semibold text-slate-800">{formData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Legal Name:</span>
                    <span className="font-semibold text-slate-800">{formData.legal_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Entity Type:</span>
                    <span className="font-semibold text-slate-800">{formData.business_type.replace(/_/g, " ")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Category:</span>
                    <span className="font-semibold text-slate-800">{formData.business_category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Country:</span>
                    <span className="font-semibold text-slate-800">{formData.country_code}</span>
                  </div>
                </div>
              </div>

              {/* Registration */}
              <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <FileCheck2 size={13} className="text-amber-500" /> Registration Details
                  </h4>
                  <button
                    onClick={() => setCurrentStep(2)}
                    className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Identifier Type:</span>
                    <span className="font-semibold text-slate-800">{formData.registration_identifier_type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Number / ID:</span>
                    <span className="font-mono font-bold text-slate-800">{formData.registration_number || "—"}</span>
                  </div>
                  {formData.registration_authority && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Authority:</span>
                      <span className="font-semibold text-slate-800">{formData.registration_authority}</span>
                    </div>
                  )}
                  {formData.tax_identifier && (
                    <div className="flex justify-between">
                      <span className="text-slate-500">Tax ID:</span>
                      <span className="font-mono text-slate-800">{formData.tax_identifier}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Address & Contact */}
              <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <MapPin size={13} className="text-amber-500" /> Address &amp; Contact
                  </h4>
                  <button
                    onClick={() => setCurrentStep(3)}
                    className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
                <div className="space-y-1 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Registered Address:</span>
                    <span className="font-semibold text-slate-800 block">
                      {formData.registered_address} {formData.address_line2 ? `, ${formData.address_line2}` : ""}, {formData.city}, {formData.postal_code}
                    </span>
                  </div>
                  {formData.contact_email && (
                    <div className="flex justify-between pt-1">
                      <span className="text-slate-500">Contact Email:</span>
                      <span className="font-semibold text-slate-800">{formData.contact_email}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Representative */}
              <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <UserCheck size={13} className="text-amber-500" /> Representative
                  </h4>
                  <button
                    onClick={() => setCurrentStep(4)}
                    className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    Edit
                  </button>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Name:</span>
                    <span className="font-semibold text-slate-800">{formData.representative_name || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Role:</span>
                    <span className="font-semibold text-slate-800">{formData.representative_role || "—"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Relationship:</span>
                    <span className="font-semibold text-slate-800">{formData.representative_relationship}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Uploaded Evidence Status */}
            <div className="p-4 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Lock size={13} className="text-amber-500" /> Uploaded Evidence ({uploadedDocs.length})
                </h4>
                <button
                  onClick={() => setCurrentStep(5)}
                  className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                >
                  Manage Documents
                </button>
              </div>

              {uploadedDocs.length === 0 ? (
                <p className="text-xs text-rose-600 font-semibold py-1">
                  No evidence uploaded. At least one business registration document is required.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {uploadedDocs.map((doc) => (
                    <div key={doc.id} className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200">
                      <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                      <div className="truncate">
                        <span className="font-bold text-slate-800 block truncate">{doc.document_type}</span>
                        <span className="text-[10px] text-slate-400 block truncate">{doc.original_file_name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Legal Declaration */}
            <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-2xl">
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.declaration_confirmed}
                  onChange={(e) => setFormData({ ...formData, declaration_confirmed: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500 border-slate-300 mt-0.5 shrink-0"
                />
                <span className="text-xs text-slate-800 leading-relaxed">
                  <strong>Legal Authorization &amp; Accuracy Confirmation:</strong> I confirm that the information provided is accurate and that I am authorized to submit this verification request on behalf of this business. I acknowledge that misrepresentation may result in suspension of business advertising privileges.
                </span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Footer Navigation Bar */}
      <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {currentStep > 1 && (
            <button
              type="button"
              onClick={goToPrevStep}
              className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
            >
              <ArrowLeft size={14} /> Back
            </button>
          )}

          <button
            type="button"
            onClick={() => handleSaveDraft(currentStep)}
            disabled={saving}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save size={14} />
            <span>{saving ? "Saving..." : "Save Draft"}</span>
          </button>
        </div>

        <div>
          {currentStep < 6 ? (
            <button
              type="button"
              onClick={goToNextStep}
              className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <span>Next: {stepsList[currentStep]?.label}</span>
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting || !formData.declaration_confirmed || uploadedDocs.length === 0}
              onClick={handleSubmit}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-md shadow-emerald-600/20 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              <CheckCircle2 size={15} />
              <span>{submitting ? "Submitting Application..." : "Submit Business Verification"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default BusinessVerificationWizard;
