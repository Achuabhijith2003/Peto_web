import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../utils/supabaseClient";
import { Loader2 } from "lucide-react";

export const GoogleLaunch: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function startOAuth() {
      try {
        const targetRedirect =
          searchParams.get("redirect_to") ||
          searchParams.get("redirectTo") ||
          `${window.location.origin}/auth/callback?source=mobile`;

        // Initiates Supabase PKCE OAuth directly in the browser so state and verifier are recorded
        const { error: authError } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: targetRedirect,
            queryParams: {
              access_type: "offline",
              prompt: "consent",
            },
          },
        });

        if (authError) throw authError;
      } catch (err: any) {
        console.error("Failed to launch Google auth:", err);
        setError(err.message || "Failed to start Google sign in.");
      }
    }

    startOAuth();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-sm w-full bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center">
        {error ? (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-rose-600">Unable to start Google Sign In</p>
            <p className="text-xs text-slate-500">{error}</p>
            <a
              href="/login"
              className="inline-block mt-3 px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
            >
              Return to Login
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 mx-auto flex items-center justify-center">
              <Loader2 size={28} className="animate-spin" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">Redirecting to Google...</h2>
            <p className="text-xs text-slate-500">Please wait while we connect your account securely.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default GoogleLaunch;
