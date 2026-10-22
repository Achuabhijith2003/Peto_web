import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Send,
  Lock,
} from "lucide-react";
import api from "../utils/api";
import Footer from "../components/layout/Footer";

export const CopyrightComplaint: React.FC = () => {
  const [formData, setFormData] = useState({
    claimantName: "",
    claimantEmail: "",
    claimantPhone: "",
    claimantAddress: "",
    organizationName: "",
    workDescription: "",
    infringingUrl: "",
    targetType: "post",
    goodFaithDeclaration: false,
    accuracyDeclaration: false,
    signature: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [successComplaintId, setSuccessComplaintId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.goodFaithDeclaration || !formData.accuracyDeclaration) {
      setErrorMessage("Both statutory declarations must be affirmatively checked.");
      return;
    }

    if (!formData.signature.trim()) {
      setErrorMessage("An electronic signature (your full legal name) is required.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post("/compliance/copyright-complaint", {
        ...formData,
      });

      if (res.data?.success) {
        setSuccessComplaintId(res.data.complaintId || `comp-${Date.now()}`);
      }
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.message || "Failed to submit copyright notice. Please verify all fields."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              to="/policies"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
            >
              <ArrowLeft size={18} />
            </Link>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-amber-600 font-heading">
                PETO
              </span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest border-l border-slate-200 pl-2">
                Legal & Safety
              </span>
            </div>
          </div>

          <Link
            to="/policies"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            Policy Center
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 w-full flex-1">
        {successComplaintId ? (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 sm:p-12 text-center space-y-5 shadow-sm animate-in fade-in">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black text-slate-900 font-heading">
                Notice of Infringement Received
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 max-w-lg mx-auto leading-relaxed">
                Thank you for notifying Peto. Your complaint has been assigned tracking ID:
              </p>
              <div className="inline-block px-4 py-2 bg-slate-100 rounded-xl text-slate-800 font-mono text-sm font-bold tracking-wider">
                {successComplaintId}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 text-left text-xs text-slate-600 space-y-2 max-w-lg mx-auto">
              <span className="font-bold text-slate-800 block">Next Steps:</span>
              <p>
                1. Our designated compliance officers will inspect the flagged material against our Content & Media Policy.
              </p>
              <p>
                2. If prima facie evidence exists, access to the contested material will be restricted expeditiously.
              </p>
              <p>
                3. The uploader may be afforded the opportunity to file a statutory counter-notice in compliance with applicable safe-harbor regulations.
              </p>
            </div>

            <div className="pt-4">
              <Link
                to="/policies"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
              >
                Return to Legal Center
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-10 shadow-sm space-y-8">
            {/* Header */}
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-50 text-purple-700 text-xs font-bold border border-purple-100">
                <ShieldAlert size={14} />
                <span>Intellectual Property & Copyright Intake</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 font-heading tracking-tight">
                Copyright Infringement Notification
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                If you believe content hosted on Peto infringes your copyrighted work, please complete the statutory notice below. Required fields must be provided by the rights owner or an authorized representative.
              </p>
            </div>

            {errorMessage && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-3">
                <AlertTriangle size={18} className="shrink-0 text-rose-600" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 1. Identification of Content */}
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                  1. Identification of Allegedly Infringing Material
                </h2>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Link / URL to the contested content on Peto *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.infringingUrl}
                    onChange={(e) => setFormData({ ...formData, infringingUrl: e.target.value })}
                    placeholder="https://peto.app/posts/post-id or content ID"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Description of your copyrighted work *
                  </label>
                  <textarea
                    required
                    rows={4}
                    value={formData.workDescription}
                    onChange={(e) => setFormData({ ...formData, workDescription: e.target.value })}
                    placeholder="Describe the original photograph, artwork, video, or creative text, including date of creation and original publication location..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-900 focus:outline-none focus:bg-white resize-none"
                  />
                </div>
              </div>

              {/* 2. Claimant Contact Information */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    2. Rights Holder / Claimant Details
                  </h2>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Lock size={12} /> Stored privately & access-controlled
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Full Legal Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.claimantName}
                      onChange={(e) => setFormData({ ...formData, claimantName: e.target.value })}
                      placeholder="e.g. Jane Doe"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Organization / Rights Entity (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.organizationName}
                      onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                      placeholder="e.g. Acme Media Corp"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:bg-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Official Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.claimantEmail}
                      onChange={(e) => setFormData({ ...formData, claimantEmail: e.target.value })}
                      placeholder="legal@example.com"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                      Phone Number (Optional)
                    </label>
                    <input
                      type="tel"
                      value={formData.claimantPhone}
                      onChange={(e) => setFormData({ ...formData, claimantPhone: e.target.value })}
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:bg-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Physical / Mailing Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.claimantAddress}
                    onChange={(e) => setFormData({ ...formData, claimantAddress: e.target.value })}
                    placeholder="Street, City, State/Province, Country, Postal Code"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs text-slate-900 focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              {/* 3. Statutory Declarations */}
              <div className="space-y-4">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                  3. Declarations & Electronic Signature
                </h2>

                <div className="space-y-3 bg-slate-50 border border-slate-200/80 p-5 rounded-2xl text-xs text-slate-700">
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={formData.goodFaithDeclaration}
                      onChange={(e) =>
                        setFormData({ ...formData, goodFaithDeclaration: e.target.checked })
                      }
                      className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <span>
                      I have a <strong>good-faith belief</strong> that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.
                    </span>
                  </label>

                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      required
                      checked={formData.accuracyDeclaration}
                      onChange={(e) =>
                        setFormData({ ...formData, accuracyDeclaration: e.target.checked })
                      }
                      className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
                    />
                    <span>
                      I declare under <strong>penalty of perjury</strong> that the information in this notification is accurate and that I am the copyright owner or authorized to act on behalf of the owner of an exclusive right that is allegedly infringed.
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                    Electronic Signature (Type your full legal name) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.signature}
                    onChange={(e) => setFormData({ ...formData, signature: e.target.value })}
                    placeholder="e.g. Jane M. Doe"
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:bg-white"
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-between">
                <p className="text-[11px] text-slate-400 max-w-sm">
                  Submitting false or malicious notices may result in civil liability under Section 512(f) of the US Copyright Act.
                </p>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-amber-600 hover:bg-amber-700 text-white text-xs sm:text-sm font-bold shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  <Send size={15} />
                  <span>{submitting ? "Transmitting Notice..." : "Submit Notice"}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default CopyrightComplaint;
