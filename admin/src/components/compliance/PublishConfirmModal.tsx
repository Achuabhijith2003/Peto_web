import React, { useState } from "react";
import {
  X,
  AlertTriangle,
  Send,
  Calendar,
  Globe,
  ShieldCheck,
  ExternalLink,
} from "lucide-react";
import { CompliancePolicyItem } from "../../types/admin";

interface PublishConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  policy: CompliancePolicyItem | null;
  onConfirmPublish: (policyId: string, effectiveDate?: string) => Promise<void>;
  isLoading?: boolean;
}

export const PublishConfirmModal: React.FC<PublishConfirmModalProps> = ({
  isOpen,
  onClose,
  policy,
  onConfirmPublish,
  isLoading = false,
}) => {
  if (!isOpen || !policy) return null;

  const [effectiveDate, setEffectiveDate] = useState<string>(
    policy.effective_date
      ? new Date(policy.effective_date).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );

  const slug = policy.slug || policy.policy_type.toLowerCase().replace(/_/g, "-");

  const handlePublish = async () => {
    await onConfirmPublish(policy.id, effectiveDate);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#151c27]/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-card border border-border rounded-3xl w-full max-w-lg shadow-lg overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center font-bold">
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold font-heading text-foreground">
                Publish Policy Revision
              </h3>
              <p className="text-xs text-muted-foreground">
                Rollout live to Web & Mobile clients
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/40 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Warning Banner */}
          <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 text-xs text-amber-900 flex items-start gap-3">
            <ShieldCheck size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold block text-amber-900 mb-0.5">
                Immediate Public Rollout
              </span>
              Publishing will make this document active immediately across Peto Web and Flutter Mobile. Any existing active version of this policy will be archived and marked as superseded.
            </div>
          </div>

          {/* Details Card */}
          <div className="bg-muted/20 border border-border rounded-2xl p-4 space-y-3 text-xs">
            <div className="flex justify-between items-center pb-2 border-b border-border">
              <span className="text-muted-foreground font-semibold">Document Title:</span>
              <span className="font-bold text-foreground font-heading">{policy.title}</span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-border">
              <span className="text-muted-foreground font-semibold">Version:</span>
              <span className="font-mono font-bold text-primary px-2 py-0.5 rounded-full bg-muted/40 border border-border">
                v{policy.version}
              </span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-border">
              <span className="text-muted-foreground font-semibold">Public Route:</span>
              <span className="font-mono text-primary flex items-center gap-1">
                /policies/{slug}
                <ExternalLink size={11} />
              </span>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-border">
              <span className="text-muted-foreground font-semibold">Regional Scope:</span>
              <span className="flex items-center gap-1 font-semibold text-foreground">
                <Globe size={12} className="text-muted-foreground" />
                {policy.region_code || "GLOBAL"}
              </span>
            </div>

            <div>
              <span className="text-muted-foreground font-semibold block mb-1">
                Summary of Changes:
              </span>
              <p className="text-foreground italic bg-card p-2.5 rounded-xl border border-border">
                {policy.summary_of_changes || "Standard periodic policy revision."}
              </p>
            </div>
          </div>

          {/* Effective Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
              <Calendar size={13} />
              Effective Date
            </label>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="w-full bg-muted/40 border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:bg-card focus:border-primary"
            />
            <span className="text-[11px] text-muted-foreground mt-1 block">
              This date will appear in the public footer and generated PDF certificates.
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-border bg-[#fcfdff] flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-muted/40 hover:bg-[#e2e8f8] text-muted-foreground text-xs font-semibold border border-border transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={isLoading}
            className="px-5 py-2 rounded-xl bg-[#006c49] hover:bg-[#00553a] text-white text-xs font-semibold shadow-sm disabled:opacity-50 transition flex items-center gap-2 cursor-pointer"
          >
            <Send size={13} />
            <span>{isLoading ? "Publishing..." : "Confirm & Publish"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
