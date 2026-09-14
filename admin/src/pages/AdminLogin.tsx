import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";
import { Shield, Lock, Mail, AlertCircle, ArrowRight } from "lucide-react";

export const AdminLogin: React.FC = () => {
  const { login, isAuthenticated, loading } = useAdminAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (isAuthenticated && !loading) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      await login(email.trim(), password);
      navigate("/dashboard");
    } catch (err: any) {
      setErrorMessage(
        err.message || "Access denied: Failed to authenticate with administrative credentials."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#151c27] flex flex-col justify-center items-center p-4 selection:bg-[#0058be] selection:text-white relative overflow-hidden">
      {/* Background ambient organic shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#0058be]/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-[#855300]/5 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Brand Banner */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#0058be] shadow-level-2 mb-4">
            <Shield className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold font-heading tracking-tight text-[#151c27]">
            Peto Control Center
          </h1>
          <p className="text-xs text-[#534434] mt-1">
            Restricted Administrative Access Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white border border-[#e2e8f8] rounded-2xl p-8 shadow-level-2 space-y-6">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-[#ffdad6]/40 border border-[#ffdad6] text-[#ba1a1a] text-xs font-semibold flex items-start space-x-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-[#ba1a1a] mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold font-heading uppercase tracking-wider text-[#534434] mb-1.5">
                Admin Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#534434]/60">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@peto.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#f0f3ff] border border-[#dae2f3] text-xs text-[#151c27] placeholder-[#534434]/60 focus:outline-none focus:bg-white focus:border-[#0058be] transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold font-heading uppercase tracking-wider text-[#534434] mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[#534434]/60">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#f0f3ff] border border-[#dae2f3] text-xs text-[#151c27] placeholder-[#534434]/60 focus:outline-none focus:bg-white focus:border-[#0058be] transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-[#0058be] hover:bg-[#2170e4] active:bg-[#00479b] text-white font-semibold text-xs transition-all shadow-sm flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin mr-2"></div>
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Admin Panel</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="pt-2 text-center text-[11px] text-[#534434] space-y-1">
            <p>Every login attempt and administrative session is strictly audited.</p>
            <p className="font-mono text-[#534434]/70">Unauthorized access is strictly prohibited.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
