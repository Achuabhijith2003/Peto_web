import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { CheckCircle2, AlertTriangle, Loader2, ArrowRight, Smartphone, Copy, Check } from "lucide-react";

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isMobileHandoff, setIsMobileHandoff] = useState(false);
  const [syncCode, setSyncCode] = useState<string | null>(null);
  const [deepLinkUrl, setDeepLinkUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => {
    let isSubscribed = true;

    async function handleAuth() {
      try {
        setLoading(true);
        setError(null);

        // Detect if request originated from mobile app
        const isMobileParam =
          searchParams.get("source") === "mobile" ||
          searchParams.get("mobile") === "true" ||
          /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

        // Extract session from Supabase client
        let accessToken: string | null = null;
        let refreshToken: string | null = null;

        // 1. First check URL hash for direct tokens (#access_token=...&refresh_token=...)
        const hash = window.location.hash;
        if (hash) {
          const hashParams = new URLSearchParams(hash.replace(/^#/, ""));
          accessToken = hashParams.get("access_token");
          refreshToken = hashParams.get("refresh_token");
        }

        // 2. Check query params for auth code (?code=...)
        const code = searchParams.get("code");

        // 3. Fallback to Supabase getSession
        if (!accessToken && !code) {
          const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
          if (sessionErr) throw sessionErr;
          if (sessionData.session) {
            accessToken = sessionData.session.access_token;
            refreshToken = sessionData.session.refresh_token;
          }
        }

        if (!accessToken && !code) {
          throw new Error("No authentication credentials received from Google.");
        }

        // Call Backend API to sync profile and verify authentication
        const res = await api.post("/auth/google", {
          token: accessToken,
          refreshToken,
          code,
        });

        if (!isSubscribed) return;

        if (res.data?.success) {
          const user = res.data.user;
          const userToken = res.data.token || accessToken;
          const userRefreshToken = res.data.refreshToken || refreshToken;
          const codeFromBackend = res.data.syncCode;

          setUserName(user?.user_metadata?.full_name || user?.email || "Pet Parent");
          setSyncCode(codeFromBackend || null);

          // Complete Web Login workflow
          login(userToken, userRefreshToken, user);

          const appDeepLink = `peto://auth-callback?token=${encodeURIComponent(userToken)}&refreshToken=${encodeURIComponent(userRefreshToken || "")}`;
          setDeepLinkUrl(appDeepLink);

          if (isMobileParam) {
            setIsMobileHandoff(true);
            setLoading(false);

            // Attempt automatic deep link navigation into the mobile app
            window.location.href = appDeepLink;
          } else {
            // Web User: route straight to profile/home
            setLoading(false);
            navigate("/profile", { replace: true });
          }
        } else {
          throw new Error(res.data?.message || "Failed to finalize Google authentication.");
        }
      } catch (err: any) {
        if (!isSubscribed) return;
        console.error("Auth callback error:", err);
        setError(err.response?.data?.message || err.message || "Authentication failed. Please try again.");
        setLoading(false);
      }
    }

    handleAuth();

    return () => {
      isSubscribed = false;
    };
  }, [navigate, searchParams, login]);

  const handleCopyCode = () => {
    if (syncCode) {
      navigator.clipboard.writeText(syncCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center animate-in fade-in zoom-in-95 duration-200">
        {loading ? (
          <div className="py-8 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 mx-auto flex items-center justify-center">
              <Loader2 size={32} className="animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Completing Sign In...</h2>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Connecting your Google account with Peto and loading your profile.
            </p>
          </div>
        ) : error ? (
          <div className="py-6 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 mx-auto flex items-center justify-center">
              <AlertTriangle size={32} />
            </div>
            <h2 className="text-xl font-bold text-slate-900">Authentication Issue</h2>
            <p className="text-xs text-rose-600 bg-rose-50 p-3 rounded-xl border border-rose-100">{error}</p>
            <button
              onClick={() => navigate("/login")}
              className="mt-4 px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition"
            >
              Return to Login
            </button>
          </div>
        ) : isMobileHandoff ? (
          <div className="py-4 space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center shadow-sm">
              <CheckCircle2 size={32} />
            </div>

            <div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                Authorized with Google
              </span>
              <h2 className="text-xl font-bold text-slate-900 mt-2">Welcome, {userName}!</h2>
              <p className="text-xs text-slate-500 mt-1">
                Your account is ready. Tap below to continue in the Peto Mobile App.
              </p>
            </div>

            {/* Deep Link Action */}
            {deepLinkUrl && (
              <a
                href={deepLinkUrl}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white text-sm font-bold shadow-md hover:opacity-95 transition flex items-center justify-center gap-2"
              >
                <Smartphone size={18} />
                <span>Open Peto App</span>
              </a>
            )}

            {/* Fallback Sync Code */}
            {syncCode && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                    Quick App Login Code
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
                  >
                    {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                    <span>{copied ? "Copied" : "Copy Code"}</span>
                  </button>
                </div>
                <div className="text-2xl font-mono font-bold tracking-widest text-slate-800 text-center py-1 bg-white rounded-lg border border-slate-200/80">
                  {syncCode}
                </div>
                <p className="text-[11px] text-slate-400 text-center">
                  If the app did not open automatically, enter or paste this code in the app.
                </p>
              </div>
            )}

            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => navigate("/profile")}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 mx-auto"
              >
                <span>Or continue browsing on Web</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default AuthCallback;
