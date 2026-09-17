import React, { useEffect, useRef, useState } from "react";
import { ExternalLink, Sparkles, MoreVertical, EyeOff, Flag, X } from "lucide-react";
import api from "../../utils/api";

export interface WebExternalAdProps {
  externalAd: {
    ad_source: "EXTERNAL";
    external_provider: string; // 'ADSENSE', 'AD_MANAGER'
    format: string;
    adUnitId: string;
    appId?: string;
    layoutKey?: string;
    headline?: string;
    body?: string;
    callToAction?: string;
    advertiserName?: string;
    mediaUrl?: string;
    htmlSnippet?: string;
    isTestAd?: boolean;
  };
  onHide?: () => void;
}

export const WebExternalAdCard: React.FC<WebExternalAdProps> = ({ externalAd, onHide }) => {
  const hasTrackedImpression = useRef(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("MISLEADING");

  const isLiveAdSense =
    externalAd.external_provider === "ADSENSE" &&
    Boolean(externalAd.appId) &&
    externalAd.appId!.startsWith("ca-pub-") &&
    externalAd.appId !== "ca-pub-0000000000000000";

  const insRef = useRef<HTMLModElement | null>(null);

  useEffect(() => {
    if (!hasTrackedImpression.current && externalAd) {
      hasTrackedImpression.current = true;
      api.post("/ads/events", {
        eventType: "AD_IMPRESSION",
        adSource: "EXTERNAL",
        provider: externalAd.external_provider || "ADSENSE",
        placement: "FEED",
        platform: "WEB",
        metadata: {
          adUnitId: externalAd.adUnitId,
          format: externalAd.format,
        },
      }).catch(() => {});
    }
  }, [externalAd]);

  useEffect(() => {
    if (isLiveAdSense && externalAd.appId) {
      // Ensure Google AdSense script is present in head
      const scriptId = "google-adsense-script";
      if (!document.getElementById(scriptId)) {
        const script = document.createElement("script");
        script.id = scriptId;
        script.async = true;
        script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${externalAd.appId}`;
        script.crossOrigin = "anonymous";
        document.head.appendChild(script);
      }

      // Initialize slot safely
      try {
        if (insRef.current && !insRef.current.getAttribute("data-adsbygoogle-status")) {
          ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
        }
      } catch (_) {}
    }
  }, [isLiveAdSense, externalAd.appId, externalAd.adUnitId]);

  const handleCtaClick = () => {
    api.post("/ads/events", {
      eventType: "AD_CLICK",
      adSource: "EXTERNAL",
      provider: externalAd.external_provider || "ADSENSE",
      placement: "FEED",
      platform: "WEB",
      metadata: {
        adUnitId: externalAd.adUnitId,
      },
    }).catch(() => {});

    // For test ads or generic external provider
    window.open("https://ads.google.com", "_blank", "noopener,noreferrer");
  };

  const handleHide = () => {
    setIsHidden(true);
    if (onHide) onHide();
  };

  const handleReport = (e: React.FormEvent) => {
    e.preventDefault();
    setShowReportModal(false);
    setIsHidden(true);
  };

  if (isHidden) {
    return (
      <div className="rounded-3xl bg-slate-50 border border-slate-200 p-4 text-center text-xs text-slate-500 flex items-center justify-between">
        <span>External advertisement hidden. Your preference has been applied.</span>
        <button
          onClick={() => setIsHidden(false)}
          className="text-amber-600 font-bold hover:underline ml-2 text-xs cursor-pointer"
        >
          Undo
        </button>
      </div>
    );
  }

  return (
    <article className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden transition hover:shadow-md animate-fade-in relative">
      {/* Sponsored Top Header */}
      <div className="p-4 flex items-center justify-between border-b border-slate-100 bg-slate-50/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-xs">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-xs text-slate-900 leading-tight">
                {externalAd.advertiserName || "Google Partner Network"}
              </span>
              <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200 uppercase tracking-wide">
                External Ad
              </span>
              {externalAd.isTestAd && (
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-amber-100 text-amber-800 border border-amber-200">
                  TEST
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Powered by Google Web Ads
            </span>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <MoreVertical size={16} />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-8 z-30 w-48 bg-white rounded-2xl border border-slate-200 shadow-lg p-1 text-xs space-y-0.5 animate-in fade-in zoom-in-95">
              <button
                onClick={handleHide}
                className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium cursor-pointer"
              >
                <EyeOff size={14} className="text-slate-400" />
                Hide this ad
              </button>
              <button
                onClick={() => {
                  setShowReportModal(true);
                  setMenuOpen(false);
                }}
                className="w-full px-3 py-2 text-left rounded-xl hover:bg-slate-50 flex items-center gap-2 text-red-600 font-medium cursor-pointer"
              >
                <Flag size={14} />
                Report external ad
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Live Google AdSense In-Feed Container */}
      {isLiveAdSense ? (
        <div className="p-3 bg-white flex flex-col items-center justify-center min-h-[120px] overflow-hidden border-b border-slate-100">
          <ins
            ref={insRef}
            className="adsbygoogle"
            style={{ display: "block" }}
            data-ad-format={externalAd.layoutKey ? "fluid" : "auto"}
            data-ad-layout-key={externalAd.layoutKey || "-6t+ed+2i-1n-4w"}
            data-ad-client={externalAd.appId || "ca-pub-8568607330093795"}
            data-ad-slot={externalAd.adUnitId || "4689992923"}
            data-adtest={externalAd.isTestAd ? "on" : undefined}
          />
        </div>
      ) : (
        /* Media Image / Responsive Banner for Test / Partner Mode */
        externalAd.mediaUrl && (
          <div className="relative max-h-72 overflow-hidden bg-slate-950 flex items-center justify-center">
            <img
              src={externalAd.mediaUrl}
              alt="Sponsored"
              className="w-full h-auto object-cover max-h-72"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800";
              }}
            />
          </div>
        )
      )}

      {/* Ad Copy & CTA */}
      <div className="p-4 space-y-2">
        <h4 className="font-bold text-slate-900 text-sm leading-snug">
          {externalAd.headline || "Sponsored recommendation for pet owners"}
        </h4>
        <p className="text-xs text-slate-600 leading-relaxed">
          {externalAd.body || "Discover curated quality solutions for your pets."}
        </p>

        <div className="pt-2 flex items-center justify-between border-t border-slate-100">
          <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
            GOOGLE ADSENSE PARTNER
          </span>
          <button
            onClick={handleCtaClick}
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold shadow-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <span>{externalAd.callToAction || "Learn More"}</span>
            <ExternalLink size={12} />
          </button>
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-sm text-slate-900">Report Advertisement</span>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleReport} className="space-y-3 text-xs">
              <label className="block text-slate-600">Why are you reporting this ad?</label>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl"
              >
                <option value="MISLEADING">Misleading or Scam</option>
                <option value="INAPPROPRIATE">Inappropriate Content</option>
                <option value="REPETITIVE">Too Repetitive</option>
              </select>
              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-red-600 text-white font-bold"
              >
                Submit Report
              </button>
            </form>
          </div>
        </div>
      )}
    </article>
  );
};

export default WebExternalAdCard;
