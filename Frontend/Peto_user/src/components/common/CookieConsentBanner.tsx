import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Cookie, X, Settings2 } from "lucide-react";

export interface CookiePreferences {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string;
}

export const CookieConsentBanner: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [preferences, setPreferences] = useState({
    essential: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    try {
      const stored = localStorage.getItem("peto_cookie_consent");
      if (!stored) {
        // Small delay to ensure smooth entry animation
        const timer = setTimeout(() => setIsVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // Storage unavailable
    }
  }, []);

  const saveConsent = (prefs: { essential: boolean; analytics: boolean; marketing: boolean }) => {
    const payload: CookiePreferences = {
      essential: true, // Always true
      analytics: prefs.analytics,
      marketing: prefs.marketing,
      timestamp: new Date().toISOString(),
    };

    try {
      localStorage.setItem("peto_cookie_consent", JSON.stringify(payload));
      window.dispatchEvent(new CustomEvent("peto_consent_updated", { detail: payload }));
    } catch {
      // Ignore
    }

    setIsVisible(false);
    setShowModal(false);
  };

  const handleAcceptAll = () => {
    saveConsent({ essential: true, analytics: true, marketing: true });
  };

  const handleRejectNonEssential = () => {
    saveConsent({ essential: true, analytics: false, marketing: false });
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Floating Bottom Banner */}
      <div className="fixed bottom-4 left-4 right-4 md:left-6 md:right-auto md:max-w-xl z-50 animate-in slide-in-from-bottom-5 duration-300">
        <div className="bg-slate-950/95 text-white backdrop-blur-xl border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
              <Cookie size={20} />
            </div>

            <div className="space-y-1 pr-4">
              <h4 className="text-sm font-bold text-white font-heading">
                We Respect Your Privacy & Pet Data
              </h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Peto uses essential cookies for secure login and account access, and optional analytics cookies to measure app performance. Learn more in our{" "}
                <Link
                  to="/policies/cookie-policy"
                  className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2"
                >
                  Cookie Policy
                </Link>{" "}
                and{" "}
                <Link
                  to="/policies/privacy-policy"
                  className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2"
                >
                  Privacy Policy
                </Link>.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              onClick={handleAcceptAll}
              className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-md cursor-pointer"
            >
              Accept All
            </button>

            <button
              onClick={handleRejectNonEssential}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition border border-slate-700 cursor-pointer"
            >
              Essential Only
            </button>

            <button
              onClick={() => setShowModal(true)}
              className="px-3 py-2 rounded-xl text-slate-400 hover:text-white font-semibold text-xs transition inline-flex items-center gap-1 cursor-pointer ml-auto"
            >
              <Settings2 size={13} />
              <span>Customize</span>
            </button>
          </div>
        </div>
      </div>

      {/* Customize Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <ShieldCheck size={18} />
                </div>
                <h3 className="text-base font-bold text-slate-900 font-heading">
                  Cookie & Privacy Preferences
                </h3>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Essential */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-800 block">Strictly Necessary Storage</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Required for account authentication, CSRF security, and basic navigation. Cannot be disabled.
                  </p>
                </div>
                <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-100 px-2 py-0.5 rounded-md shrink-0">
                  Always Active
                </span>
              </div>

              {/* Analytics */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-800 block">Performance & Telemetry</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Helps us aggregate page load times, crash reports, and system performance metrics.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={preferences.analytics}
                    onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600" />
                </label>
              </div>

              {/* Marketing */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-800 block">Marketing & Pet Insights</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Enables tailored pet nutrition tips, local adoption notices, and community highlights.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
                  <input
                    type="checkbox"
                    checked={preferences.marketing}
                    onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-600" />
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveConsent(preferences)}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md cursor-pointer"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CookieConsentBanner;
