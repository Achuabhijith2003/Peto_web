import React from "react";
import { ArrowRight, ExternalLink } from "lucide-react";
import { useAndroidPromotion } from "../../hooks/useAndroidPromotion";

export interface AndroidAppBannerProps {
  className?: string;
  forceUrl?: string;
}

export const AndroidAppBanner: React.FC<AndroidAppBannerProps> = ({
  className = "",
  forceUrl,
}) => {
  const { isVisible, storeUrl: detectedUrl, dismiss } = useAndroidPromotion();
  const storeUrl = forceUrl || detectedUrl;

  // Do not display if not on Android mobile, if dismissed, or if Play Store URL is not configured
  if ((!isVisible && !forceUrl) || !storeUrl) {
    return null;
  }

  return (
    <aside
      role="region"
      aria-label="Peto Android App Promotion"
      className={`relative z-40 w-full bg-slate-900 text-white border-b border-slate-800 shadow-sm transition-opacity duration-200 motion-reduce:transition-none ${className}`}
    >
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3 px-3 py-2.5 sm:px-6 sm:py-3">
        {/* Left: Branding & Message */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-xl bg-white p-1 shadow-xs border border-amber-400/30 overflow-hidden">
            <img
              src="/peto_logo.png"
              alt="Peto Logo"
              className="h-full w-full object-contain"
            />
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
                Peto on Google Play
              </span>
              <span className="hidden xs:inline-flex items-center rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400 border border-amber-500/30">
                Official App
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-300 truncate">
              Get instant alerts, notifications and a faster pet parent experience.
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Continue on web (Decline / Dismiss) */}
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex text-[11px] sm:text-xs text-slate-300 hover:text-white underline underline-offset-2 transition-colors py-1 px-1.5 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 motion-reduce:transition-none"
            aria-label="Continue using the Peto website and dismiss this banner for two weeks"
          >
            Continue on web
          </button>

          {/* Primary CTA: Install from Google Play */}
          <a
            href={storeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-bold px-3 py-1.5 text-xs transition shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 motion-reduce:transition-none"
            aria-label="Install Peto from Google Play Store (opens in a new tab)"
          >
            <span>Get App</span>
            <ExternalLink className="w-3.5 h-3.5 sm:hidden shrink-0" aria-hidden="true" />
            <ArrowRight className="w-3.5 h-3.5 hidden sm:inline-block shrink-0" aria-hidden="true" />
          </a>
        </div>
      </div>
    </aside>
  );
};

export default AndroidAppBanner;
