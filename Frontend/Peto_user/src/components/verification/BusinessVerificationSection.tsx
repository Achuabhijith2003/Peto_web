import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Building2,
  PlusCircle,
  AlertTriangle,
  ArrowRight,
  Clock,
  ShieldCheck,
  Edit3,
  X,
  AlertCircle,
  Eye,
} from "lucide-react";
import api from "../../utils/api";
import VerifiedBadge from "../common/VerifiedBadge";
import BusinessVerificationWizard from "./BusinessVerificationWizard";

interface Business {
  id: string;
  name: string;
  legal_name: string;
  country_code: string;
  can_manage_verification: boolean;
  role?: string;
  is_verified?: boolean;
  verification: null | {
    id: string;
    status: string;
    submitted_at?: string;
    rejection_reason?: string;
    additional_info_notes?: string;
    draft_step?: number;
  };
}

interface BusinessVerificationSectionProps {
  onSelectBusinessForAdvertising?: (businessId: string) => void;
}

export default function BusinessVerificationSection({
  onSelectBusinessForAdvertising,
}: BusinessVerificationSectionProps) {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Business Creation Form (3 fields)
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [country, setCountry] = useState("IN");

  // Active Business Verification in Wizard
  const [verifyingBusinessId, setVerifyingBusinessId] = useState<string | null>(null);

  // Edit Business Identity & Reverification Warning
  const [editingBusiness, setEditingBusiness] = useState<Business | null>(null);
  const [editName, setEditName] = useState("");
  const [editLegalName, setEditLegalName] = useState("");
  const [showReverificationWarning, setShowReverificationWarning] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const response = await api.get("/verification/me");
      setBusinesses(response.data.businesses || []);
    } catch {
      setError("Could not load business identities.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Create Business Identity (Name, Legal Name, Country) -> NOT_VERIFIED
  const handleCreateBusiness = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await api.post("/verification/businesses", {
        name: name.trim(),
        legal_name: legalName.trim(),
        country_code: country.toUpperCase(),
      });
      setName("");
      setLegalName("");
      setCountry("IN");
      setShowCreateModal(false);
      await refresh();

      // Offer to start verification immediately for the newly created business
      if (res.data.business?.id) {
        setVerifyingBusinessId(res.data.business.id);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || "Could not create business identity.");
    } finally {
      setBusy(false);
    }
  };

  // Check if editing triggers reverification warning
  const initiateSaveBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBusiness) return;
    const isApproved = editingBusiness.verification?.status === "APPROVED";
    const legalNameChanged = editLegalName.trim() !== editingBusiness.legal_name.trim();

    if (isApproved && legalNameChanged) {
      setShowReverificationWarning(true);
    } else {
      executeSaveBusiness();
    }
  };

  const executeSaveBusiness = async () => {
    if (!editingBusiness) return;
    setBusy(true);
    setError("");
    setShowReverificationWarning(false);
    try {
      await api.patch(`/verification/businesses/${editingBusiness.id}`, {
        name: editName.trim(),
        legal_name: editLegalName.trim(),
      });
      setEditingBusiness(null);
      await refresh();
    } catch (err: any) {
      setError(err.response?.data?.error || "Could not update business identity.");
    } finally {
      setBusy(false);
    }
  };

  // If Wizard is active, render it exclusively
  if (verifyingBusinessId) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => {
            setVerifyingBusinessId(null);
            refresh();
          }}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition cursor-pointer"
        >
          <X size={15} /> Exit Verification to Business List
        </button>

        <BusinessVerificationWizard
          businessId={verifyingBusinessId}
          onSuccess={() => {
            setVerifyingBusinessId(null);
            refresh();
          }}
          onClose={() => {
            setVerifyingBusinessId(null);
            refresh();
          }}
        />
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Building2 size={18} className="text-amber-500" />
            <span>Managed Business Identities</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Select an existing business identity to advertise or initiate compliance verification.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
        >
          <PlusCircle size={15} />
          <span>Create New Business</span>
        </button>
      </div>

      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-center gap-2">
          <AlertCircle size={16} className="text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <Clock size={16} className="animate-spin text-amber-500" />
          <span>Loading managed business profiles...</span>
        </div>
      ) : businesses.length === 0 ? (
        <div className="p-8 rounded-3xl border border-dashed border-amber-300 bg-amber-50/40 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
            <Building2 size={24} />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-sm font-bold text-slate-900">No Business Identities Found</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              You haven&apos;t created or joined any business identities yet. Create a business profile to start advertising on behalf of your brand.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-5 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition cursor-pointer inline-flex items-center gap-2"
          >
            <PlusCircle size={15} />
            <span>Create Business Identity</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {businesses.map((business: Business) => {
            const status = business.verification?.status || "NOT_STARTED";
            const isVerified = status === "APPROVED";
            const isUnderReview = status === "SUBMITTED" || status === "UNDER_REVIEW";
            const isDraft = status === "DRAFT";
            const isInfoRequired = status === "ADDITIONAL_INFORMATION_REQUIRED";
            const isReverification = status === "REVERIFICATION_REQUIRED";

            return (
              <div
                key={business.id}
                className={`p-5 rounded-3xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  isVerified
                    ? "border-emerald-200/80 bg-emerald-50/20"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/business/${business.id}`}
                      className="font-bold text-slate-900 text-sm truncate hover:text-amber-600 hover:underline transition"
                    >
                      {business.name}
                    </Link>
                    <VerifiedBadge verified={isVerified} verificationType="BUSINESS_VERIFIED" size={18} />
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isVerified
                          ? "bg-emerald-100 text-emerald-800"
                          : isUnderReview
                          ? "bg-amber-100 text-amber-800"
                          : isInfoRequired
                          ? "bg-purple-100 text-purple-800"
                          : isReverification
                          ? "bg-rose-100 text-rose-800"
                          : isDraft
                          ? "bg-slate-100 text-slate-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {status.replace(/_/g, " ")}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500 truncate">
                    Legal Name: <strong className="text-slate-700">{business.legal_name}</strong> · Country: {business.country_code}
                  </p>

                  {isInfoRequired && business.verification?.additional_info_notes && (
                    <div className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900 flex items-start gap-2 mt-2">
                      <AlertTriangle size={14} className="text-purple-600 shrink-0 mt-0.5" />
                      <span><strong>Requested by Reviewer:</strong> {business.verification.additional_info_notes}</span>
                    </div>
                  )}

                  {business.verification?.rejection_reason && status === "REJECTED" && (
                    <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-900 flex items-start gap-2 mt-2">
                      <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                      <span><strong>Verification Declined:</strong> {business.verification.rejection_reason}</span>
                    </div>
                  )}

                  {business.can_manage_verification && (
                    <div className="pt-1">
                      <button
                        onClick={() => {
                          setEditingBusiness(business);
                          setEditName(business.name);
                          setEditLegalName(business.legal_name);
                        }}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Edit3 size={11} /> Edit Business Profile
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/business/${business.id}`}
                    className="px-3.5 py-2.5 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs transition flex items-center gap-1.5"
                  >
                    <Eye size={14} />
                    <span>View Profile</span>
                  </Link>

                  {isVerified ? (
                    <button
                      onClick={() => {
                        if (onSelectBusinessForAdvertising) {
                          onSelectBusinessForAdvertising(business.id);
                        }
                      }}
                      className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5"
                    >
                      <span>Continue to Advertising</span>
                      <ArrowRight size={14} />
                    </button>
                  ) : business.can_manage_verification ? (
                    <button
                      onClick={() => setVerifyingBusinessId(business.id)}
                      className={`px-5 py-2.5 rounded-2xl font-bold text-xs shadow-xs transition cursor-pointer flex items-center gap-1.5 ${
                        isUnderReview
                          ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                          : "bg-amber-500 hover:bg-amber-600 text-white"
                      }`}
                    >
                      <ShieldCheck size={14} />
                      <span>
                        {isUnderReview
                          ? "View Application"
                          : isDraft
                          ? "Continue Verification"
                          : isInfoRequired
                          ? "Provide Info"
                          : isReverification
                          ? "Reverify Business"
                          : "Start Business Verification"}
                      </span>
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 font-medium italic">
                      Verification requires manager role
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE BUSINESS IDENTITY MODAL (3 Fields) */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Building2 size={16} />
                </div>
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Create Business Identity
                </h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-3 bg-amber-50/70 border border-amber-200/60 rounded-2xl text-[11px] text-amber-900 leading-relaxed">
              <strong>Notice:</strong> Creating a business identity establishes your brand profile. It will initially be <strong>NOT VERIFIED</strong>. You can then submit the comprehensive multi-step verification to earn the Yellow Verified Badge.
            </div>

            <form onSubmit={handleCreateBusiness} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Business Display Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. HappyPaws Nutrition"
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Legal Business Name *
                </label>
                <input
                  type="text"
                  required
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  placeholder="e.g. HappyPaws Nutrition Pvt Ltd"
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Country of Registration *
                </label>
                <select
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 text-slate-900 transition"
                >
                  <option value="IN">India (IN)</option>
                  <option value="US">United States (US)</option>
                  <option value="GB">United Kingdom (GB)</option>
                  <option value="CA">Canada (CA)</option>
                  <option value="AU">Australia (AU)</option>
                  <option value="DE">Germany (DE)</option>
                  <option value="FR">France (FR)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {busy ? "Creating..." : "Create Business Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT BUSINESS MODAL */}
      {editingBusiness && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 font-heading">
                Edit Business Identity
              </h3>
              <button
                onClick={() => setEditingBusiness(null)}
                className="w-7 h-7 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={initiateSaveBusiness} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Business Display Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-slate-900 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Legal Business Name
                </label>
                <input
                  type="text"
                  required
                  value={editLegalName}
                  onChange={(e) => setEditLegalName(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 text-slate-900 transition"
                />
                {editingBusiness.verification?.status === "APPROVED" && (
                  <span className="text-[11px] text-amber-700 mt-1 block flex items-center gap-1 font-medium">
                    <AlertTriangle size={12} />
                    Changing verified legal name will require reverification.
                  </span>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingBusiness(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {busy ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REVERIFICATION WARNING MODAL */}
      {showReverificationWarning && (
        <div className="fixed inset-0 z-60 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-rose-200 p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">
                Business Verification Will Be Removed
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                You are changing legal information that was used to verify this business.
              </p>
            </div>

            <div className="p-4 bg-rose-50/70 border border-rose-200/80 rounded-2xl text-xs text-rose-900 space-y-1.5">
              <p className="font-semibold">If you continue:</p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-rose-800">
                <li>The yellow verification badge will be removed immediately.</li>
                <li>The business will be marked as requiring reverification.</li>
                <li>An authorized business manager must submit an updated verification request.</li>
              </ul>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowReverificationWarning(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={executeSaveBusiness}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
              >
                {busy ? "Updating..." : "Continue & Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
