import React, { useState } from "react";
import { ShieldAlert, X, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import api from "../../utils/api";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: "post" | "reel" | "comment" | "user" | "community";
  targetId: string;
  targetTitle?: string;
}

const REPORT_REASONS = [
  { id: "spam", label: "Spam or commercial scam", desc: "Excessive advertising, bots, or deceptive links" },
  { id: "harassment", label: "Bullying or harassment", desc: "Targeted insults, threats, or intimidation" },
  { id: "hate_speech", label: "Hate speech or abuse", desc: "Attacks on protected groups or identities" },
  { id: "animal_abuse", label: "Animal abuse or cruelty", desc: "Harm, neglect, or violent acts towards animals" },
  { id: "violence", label: "Violence or dangerous acts", desc: "Depictions of severe injury or physical threat" },
  { id: "sexual_content", label: "Nudity or sexual content", desc: "Sexually suggestive or explicit media" },
  { id: "scam_fraud", label: "Scam or fraud", desc: "Financial fraud, fake donations, or impersonation" },
  { id: "misinformation", label: "False information", desc: "Dangerous health, safety, or medical misinformation" },
  { id: "other", label: "Other issue", desc: "Violates Peto's community guidelines" },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  targetType,
  targetId,
  targetTitle,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>("spam");
  const [description, setDescription] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await api.post("/reports", {
        targetType,
        targetId,
        reason: selectedReason,
        description: description.trim(),
      });

      if (res.data?.success) {
        setIsSuccess(true);
        setTimeout(() => {
          setIsSuccess(false);
          setDescription("");
          setSelectedReason("spam");
          onClose();
        }, 1800);
      }
    } catch (err: any) {
      console.error("Report submission failed:", err);
      const msg = err.response?.data?.message || err.message || "Failed to submit report. Please try again.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white p-6 shadow-2xl border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
        >
          <X size={18} />
        </button>

        {isSuccess ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-500 border border-emerald-100">
              <CheckCircle2 size={32} />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Thank you for reporting</h3>
            <p className="text-xs text-slate-500 max-w-xs">
              We have received your report. Our safety team will review this {targetType} to maintain community trust.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 border border-rose-100">
                <ShieldAlert size={22} />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base leading-snug">Report {targetType}</h3>
                <p className="text-xs text-slate-500">
                  {targetTitle ? `Regarding "${targetTitle.slice(0, 30)}..."` : "Help us understand what's wrong."}
                </p>
              </div>
            </div>

            {/* Error Message */}
            {errorMessage && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs flex items-center gap-2">
                <AlertCircle size={16} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Reason Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Why are you reporting this?
              </label>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {REPORT_REASONS.map((reason) => {
                  const isChecked = selectedReason === reason.id;
                  return (
                    <label
                      key={reason.id}
                      className={`flex items-start gap-3 p-2.5 rounded-2xl border cursor-pointer transition ${
                        isChecked
                          ? "bg-amber-50/70 border-amber-300 text-slate-900"
                          : "border-slate-100 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <input
                        type="radio"
                        name="reportReason"
                        value={reason.id}
                        checked={isChecked}
                        onChange={() => setSelectedReason(reason.id)}
                        className="mt-0.5 text-amber-600 focus:ring-amber-500"
                      />
                      <div className="text-xs">
                        <p className="font-semibold text-slate-900">{reason.label}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">{reason.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Optional Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Additional Details (Optional)
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide any additional context for our moderation team..."
                className="w-full rounded-2xl border border-slate-200 p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 transition"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-500/20 transition disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" /> Submitting...
                  </>
                ) : (
                  "Submit Report"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
