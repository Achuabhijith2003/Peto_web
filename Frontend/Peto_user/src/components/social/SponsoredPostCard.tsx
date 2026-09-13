import React, { useEffect, useRef } from "react";
import { ExternalLink, Sparkles, Building2, Globe } from "lucide-react";
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

  const primaryMedia = ad.creative?.media_urls?.[0];
  const isVideo = ad.creative?.format === "VIDEO" || primaryMedia?.type === "video";

  return (
    <article className="rounded-3xl bg-white border border-slate-200/80 shadow-card overflow-hidden hover:shadow-md transition-shadow">
      {/* Header with Sponsored Tag */}
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

        <button
          onClick={handleCtaClick}
          className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition"
          title="Visit sponsor website"
        >
          <ExternalLink size={16} />
        </button>
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
    </article>
  );
};

export default SponsoredPostCard;
