import React from "react";
import {
  ShieldCheck,
  X,
  Lock,
  Globe,
  Clock,
  CheckCircle2,
  Building2,
  UserCheck,
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  guidelines?: any;
}

export const VerificationGuidelinesModal: React.FC<Props> = ({
  isOpen,
  onClose,
  guidelines,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#151c27]/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl border border-[#e2e8f8] p-6 space-y-6 text-[#151c27] animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#e2e8f8] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20 shadow-sm">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-xl font-headline font-bold text-[#151c27] leading-tight">
                Advertiser & Partner Verification Guidelines
              </h2>
              <p className="text-xs text-[#534434] font-medium mt-0.5">
                Peto Trust & Safety Standards • Policy Version {guidelines?.policy_version || "1.0.0"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#534434] hover:text-[#151c27] hover:bg-[#f0f3ff] rounded-xl transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Core Principles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-4 bg-[#f0f3ff]/60 rounded-2xl border border-[#e2e8f8] space-y-1">
            <div className="font-headline font-bold text-[#151c27] flex items-center gap-1.5">
              <UserCheck size={15} className="text-amber-500" />
              Authenticity First
            </div>
            <p className="text-[#534434] text-[11px] leading-relaxed">
              Every advertiser on Peto is verified to protect pet parents from fraudulent services or unsafe products.
            </p>
          </div>

          <div className="p-4 bg-[#f0f3ff]/60 rounded-2xl border border-[#e2e8f8] space-y-1">
            <div className="font-headline font-bold text-[#151c27] flex items-center gap-1.5">
              <Lock size={15} className="text-[#006c49]" />
              Private Storage
            </div>
            <p className="text-[#534434] text-[11px] leading-relaxed">
              ID numbers are masked immediately. Documents are encrypted in private buckets with short-lived tokens.
            </p>
          </div>

          <div className="p-4 bg-[#f0f3ff]/60 rounded-2xl border border-[#e2e8f8] space-y-1">
            <div className="font-headline font-bold text-[#151c27] flex items-center gap-1.5">
              <Clock size={15} className="text-[#0058be]" />
              24-48h Turnaround
            </div>
            <p className="text-[#534434] text-[11px] leading-relaxed">
              Dedicated compliance specialists review every submission within 1-2 business days.
            </p>
          </div>
        </div>

        {/* Verification Tracks */}
        <div className="space-y-3">
          <h3 className="text-xs font-headline font-bold text-[#151c27] uppercase tracking-wider">
            Verification Categories
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-4 bg-[#f0f3ff]/40 rounded-2xl border border-[#e2e8f8] space-y-2">
              <div className="font-headline font-bold text-[#151c27] flex items-center gap-1.5">
                <ShieldCheck size={16} className="text-amber-500" />
                Individual Advertiser Track
              </div>
              <ul className="text-[#534434] space-y-1.5 text-[11px]">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 size={13} className="text-[#006c49] shrink-0 mt-0.5" />
                  <span>Full legal name and residential address verification.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 size={13} className="text-[#006c49] shrink-0 mt-0.5" />
                  <span>Government-issued photo ID (Passport, Driver's License, National ID).</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 size={13} className="text-[#006c49] shrink-0 mt-0.5" />
                  <span>Applicant must meet the regional age requirement (18+).</span>
                </li>
              </ul>
            </div>

            <div className="p-4 bg-[#f0f3ff]/40 rounded-2xl border border-[#e2e8f8] space-y-2">
              <div className="font-headline font-bold text-[#151c27] flex items-center gap-1.5">
                <Building2 size={16} className="text-[#0058be]" />
                Business & Organization Track
              </div>
              <ul className="text-[#534434] space-y-1.5 text-[11px]">
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 size={13} className="text-[#006c49] shrink-0 mt-0.5" />
                  <span>Official registered business name & physical address.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 size={13} className="text-[#006c49] shrink-0 mt-0.5" />
                  <span>Company registration number / EIN / GSTIN / Tax ID.</span>
                </li>
                <li className="flex items-start gap-1.5">
                  <CheckCircle2 size={13} className="text-[#006c49] shrink-0 mt-0.5" />
                  <span>Official corporate website & authorized representative proof.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Accepted Documents */}
        <div className="space-y-2">
          <h3 className="text-xs font-headline font-bold text-[#151c27] uppercase tracking-wider flex items-center gap-1.5">
            <Globe size={14} className="text-slate-500" />
            Accepted Regional Documents ({guidelines?.country_name || "Global"})
          </h3>
          <div className="flex flex-wrap gap-2">
            {(guidelines?.allowed_documents || ["PASSPORT", "DRIVERS_LICENSE", "NATIONAL_ID"]).map(
              (doc: string) => (
                <span
                  key={doc}
                  className="px-3 py-1 bg-[#f0f3ff] text-[#151c27] rounded-full text-xs font-medium border border-[#e2e8f8]"
                >
                  {doc.replace("_", " ")}
                </span>
              )
            )}
          </div>
        </div>

        {/* Privacy Callout */}
        <div className="p-4 bg-[#f0f3ff] border border-[#e2e8f8] rounded-2xl text-xs space-y-1.5 text-[#534434] leading-relaxed">
          <div className="font-headline font-bold text-[#151c27] flex items-center gap-1.5">
            <Lock size={13} className="text-amber-500" />
            Privacy & Non-Disclosure Commitment
          </div>
          <p className="text-[11px]">
            Your legal documents and personal identification numbers are strictly safeguarded and will never be displayed on your public Peto profile, social posts, or community feeds. Verified status is represented solely by Peto's authentic verification badge.
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-headline font-bold rounded-2xl shadow-sm hover:shadow-md hover:scale-[1.01] active:scale-[0.99] text-xs transition"
          >
            I Understand the Guidelines
          </button>
        </div>
      </div>
    </div>
  );
};
