import React, { useEffect, useRef, useState } from "react";
import { ExternalLink, Sparkles, Building2, Globe, MoreVertical, EyeOff, Flag, HelpCircle, CheckCircle2, X } from "lucide-react";
import api from "../../utils/api";

export interface SponsoredAdProps {
  ad: {
    id: string;
    name: string;
    objective?: string;
    advertiser: {
      id: string;
      company_name: string;
      website_url?: string | null;
      industry?: string;
    };
    creative: {
      id: string;
      name: string;
      format: "IMAGE" | "VIDEO" | "CAROUSEL" | "SPONSORED_POST";
      headline: string;
      body_text?: string | null;
      call_to_action: string;
      destination_url: string;
      media_urls: Array<{
        type?: string;
        url: string;
        thumbnail?: string;
        title?: string;
      }>;
    };
  };
}

export const SponsoredPostCard: React.FC<SponsoredAdProps> = ({ ad }) => {
  const hasTrackedImpression = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showWhyModal, setShowWhyModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("MISLEADING");
  const [reportDetails, setReportDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  useEffect(() => {
    if (!hasTrackedImpression.current && ad?.id) {
      hasTrackedImpression.current = true;
      api.post(`/ads/${ad.id}/impression`, { creativeId: ad.creative?.id }).catch(() => {});
    }
  }, [ad?.id, ad?.creative?.id]);

  const handleCtaClick = () => {
    if (ad?.id) {
      api.post(`/ads/${ad.id}/click`, { creativeId: ad.creative?.id }).catch(() => {});
    }
    if (ad.creative?.destination_url) {
      window.open(ad.creative.destination_url, "_blank", "noopener,noreferrer");
    }
  };

  const handleHideAd = async () => {
    try {
      await api.post(`/ads/${ad.id}/feedback`, {
        action: "HIDE",
        reason: "NOT_INTERESTED",
        creativeId: ad.creative?.id,
      });
    } catch {
      // Best-effort
    }
    setIsHidden(true);
    setMenuOpen(false);
  };

  const handleReportAd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post(`/ads/${ad.id}/feedback`, {
        action: "REPORT",
        reason: reportReason,
        details: reportDetails,
        creativeId: ad.creative?.id,
      });
      setReportSuccess(true);
      setTimeout(() => {
        setShowReportModal(false);
        setIsHidden(true);
      }, 1500);
    } catch {
      // Best-effort
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isHidden) {
    return (
      <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-center text-xs text-slate-500 flex items-center justify-between">
        <span>Ad hidden. We'll use your feedback to improve what you see.</span>
        <button
          onClick={() => setIsHidden(false)}
          className="text-amber-600 font-semibold hover:underline"
        >
          Undo
        </button>
      </div>
    );
  }

  const primaryMedia = ad.creative?.media_urls?.[0];
  const isVideo = ad.creative?.format === "VIDEO" || primaryMedia?.type === "video";

  return (
    <article className="relative rounded-3xl bg-white border border-slate-200/80 shadow-card overflow-hidden hover:shadow-md transition-shadow">
      {/* Header with Sponsored Tag & Controls */}
      <div className="p-4 sm:p-5 flex items-center justify-between gap-3 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-orange-500 to-amber-600 flex items-center justify-center text-white shadow-sm font-bold text-sm">
            <Building2 size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-slate-900 text-sm">{ad.advertiser?.company_name}</h4>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 border border-amber-500/20 uppercase tracking-wider">
                <Sparkles size={10} className="text-amber-500" />
                Sponsored
              </span>
            </div>
            {ad.advertiser?.website_url && (
              <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                <Globe size={11} />
                {ad.advertiser.website_url.replace(/^https?:\/\//, "")}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 relative">
          <button
            onClick={handleCtaClick}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition"
            title="Visit sponsor website"
          >
            <ExternalLink size={16} />
          </button>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition"
            title="Ad options"
          >
            <MoreVertical size={16} />
          </button>

          {/* Ad Options Dropdown */}
          {menuOpen && (
            <div className="absolute right-0 top-10 w-52 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-20 animate-in fade-in zoom-in-95">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setShowWhyModal(true);
                }}
                className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition"
              >
                <HelpCircle size={14} className="text-slate-400" />
                Why am I seeing this ad?
              </button>
              <button
                onClick={handleHideAd}
                className="w-full px-4 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 transition"
              >
                <EyeOff size={14} className="text-slate-400" />
                Hide this ad
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button
                onClick={() => {
                  setMenuOpen(false);
                  setShowReportModal(true);
                }}
                className="w-full px-4 py-2 text-left text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition"
              >
                <Flag size={14} className="text-red-500" />
                Report ad
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Media Box */}
      {primaryMedia?.url && (
        <div className="relative bg-slate-950 overflow-hidden max-h-[460px] flex items-center justify-center">
          {isVideo ? (
            <video
              src={primaryMedia.url}
              controls
              playsInline
              className="w-full h-auto max-h-[460px] object-cover"
            />
          ) : (
            <img
              src={primaryMedia.url}
              alt={ad.creative?.headline}
              className="w-full h-auto max-h-[460px] object-cover"
            />
          )}
        </div>
      )}

      {/* Creative Body & Interactive CTA Action */}
      <div className="p-4 sm:p-5 space-y-3">
        <div>
          <h3 className="text-base font-bold text-slate-900 leading-snug">{ad.creative?.headline}</h3>
          {ad.creative?.body_text && (
            <p className="text-xs sm:text-sm text-slate-600 mt-1.5 leading-relaxed">
              {ad.creative.body_text}
            </p>
          )}
        </div>

        {/* CTA Bar */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            {ad.advertiser?.industry || "Pet Care Partner"}
          </span>

          <button
            onClick={handleCtaClick}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-xs font-bold shadow-sm hover:shadow transition transform active:scale-95"
          >
            {ad.creative?.call_to_action?.replace(/_/g, " ") || "Learn More"}
            <ExternalLink size={13} />
          </button>
        </div>
      </div>

      {/* Why Am I Seeing This Modal */}
      {showWhyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <HelpCircle className="text-amber-500" size={20} />
                About This Ad
              </div>
              <button
                onClick={() => setShowWhyModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>
                You are seeing this sponsored content from <strong className="text-slate-800">{ad.advertiser?.company_name}</strong> based on several factors:
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-slate-700">
                <li>Your interest in pet care, animal welfare, and community content on Peto.</li>
                <li>Your approximate regional location to show relevant services and offers.</li>
                <li>General demographic criteria specified by the verified advertiser.</li>
              </ul>
              <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200/50 text-[11px] text-amber-900">
                Peto protects your privacy and never sells your personal identifiable information to advertisers.
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowWhyModal(false)}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-semibold rounded-xl hover:bg-slate-800 transition"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Report Ad Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
                <Flag className="text-red-500" size={20} />
                Report Advertisement
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-xl"
              >
                <X size={18} />
              </button>
            </div>

            {reportSuccess ? (
              <div className="py-6 text-center space-y-2">
                <CheckCircle2 size={40} className="text-emerald-500 mx-auto" />
                <h4 className="font-bold text-slate-900 text-sm">Thank You for Reporting</h4>
                <p className="text-xs text-slate-500">
                  Our moderation and compliance team will review this ad. The ad has been hidden.
                </p>
              </div>
            ) : (
              <form onSubmit={handleReportAd} className="space-y-4">
                <p className="text-xs text-slate-600">
                  Help us keep Peto safe and high quality. Why are you reporting this ad?
                </p>

                <div className="space-y-2">
                  {[
                    { id: "MISLEADING", label: "Misleading, scam, or fraudulent offer" },
                    { id: "INAPPROPRIATE", label: "Inappropriate or offensive content" },
                    { id: "ANIMAL_WELFARE", label: "Violates animal welfare standards" },
                    { id: "SPAM", label: "Repetitive or low quality spam" },
                    { id: "OTHER", label: "Other policy violation" },
                  ].map((opt) => (
                    <label
                      key={opt.id}
                      className="flex items-center gap-2.5 p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs text-slate-700"
                    >
                      <input
                        type="radio"
                        name="reportReason"
                        value={opt.id}
                        checked={reportReason === opt.id}
                        onChange={() => setReportReason(opt.id)}
                        className="text-amber-500 focus:ring-amber-500"
                      />
                      {opt.label}
                    </label>
                  ))}
                </div>

                <div>
                  <textarea
                    rows={2}
                    placeholder="Additional details (optional)..."
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2 text-xs font-semibold bg-red-600 hover:bg-red-700 text-white rounded-xl transition disabled:opacity-50"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Report"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </article>
  );
};

export default SponsoredPostCard;

