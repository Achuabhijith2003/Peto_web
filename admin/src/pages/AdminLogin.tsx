import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../context/AdminAuthContext";
import { getApiBaseUrl } from "../api/adminApi";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { ThemeSwitcher } from "../components/layout/ThemeSwitcher";
import { Lock, Mail, AlertCircle, ArrowRight, Settings, Check } from "lucide-react";

export const AdminLogin: React.FC = () => {
  const { login, isAuthenticated, loading } = useAdminAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Runtime API Endpoint Configuration helper
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [customApiUrl, setCustomApiUrl] = useState(getApiBaseUrl());
  const [apiSaved, setApiSaved] = useState(false);

  if (isAuthenticated && !loading) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSaveApiUrl = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUrl = customApiUrl.trim().replace(/\/+$/, "");
    if (cleanUrl) {
      localStorage.setItem("peto_api_url", cleanUrl);
      setApiSaved(true);
      setErrorMessage(null);
      setTimeout(() => setApiSaved(false), 3000);
    }
  };

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
      if (err.response?.status === 405 || err.message?.includes("405")) {
        setErrorMessage(
          "HTTP 405 (Method Not Allowed): The Admin Panel is calling itself instead of your backend API. Please configure your Backend URL below (e.g. https://your-backend.onrender.com/api) or add VITE_API_URL to Render environment variables."
        );
        setShowApiConfig(true);
      } else {
        setErrorMessage(
          err.response?.data?.message ||
            err.message ||
            "Access denied: Failed to authenticate with administrative credentials."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Top right theme switch */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeSwitcher variant="icon" />
      </div>

      {/* Background ambient organic shapes */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/5 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md relative z-10 space-y-6">
        {/* Brand Banner */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-card border border-border shadow-md mb-4 p-2 overflow-hidden">
            <img src="/peto_logo.png" alt="Peto Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-2xl font-bold font-heading tracking-tight text-foreground">
            Peto Control Center
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Restricted Operational Admin Portal
          </p>
        </div>

        {/* Login Card */}
        <Card className="p-8 space-y-6 shadow-lg border-border">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold flex items-start space-x-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-destructive mt-0.5" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Admin Email</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                  <Mail className="w-4 h-4" />
                </div>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@peto.com"
                  required
                  className="pl-9 text-xs h-10"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Password</Label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
                  <Lock className="w-4 h-4" />
                </div>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="pl-9 text-xs h-10"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-10 text-xs font-semibold"
            >
              {submitting ? (
                <span>Verifying Credentials...</span>
              ) : (
                <>
                  <span>Sign In to Admin</span>
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Runtime API Endpoint Configuration Trigger */}
          <div className="pt-4 border-t border-border text-center">
            <button
              type="button"
              onClick={() => setShowApiConfig(!showApiConfig)}
              className="inline-flex items-center space-x-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>{showApiConfig ? "Hide API Settings" : "Configure Backend URL"}</span>
            </button>

            {showApiConfig && (
              <form onSubmit={handleSaveApiUrl} className="mt-3 text-left space-y-2 text-xs animate-in fade-in duration-150">
                <p className="text-[11px] text-muted-foreground">
                  Active Endpoint: <span className="font-mono text-primary">{getApiBaseUrl()}</span>
                </p>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    value={customApiUrl}
                    onChange={(e) => setCustomApiUrl(e.target.value)}
                    placeholder="https://api.peto.com/api"
                    className="text-xs h-8 flex-1"
                  />
                  <Button type="submit" size="sm" className="h-8 text-xs">
                    {apiSaved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : "Save"}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </Card>

        {/* Security Notice */}
        <p className="text-center text-[11px] text-muted-foreground">
          Protected by Peto RBAC · IP &amp; session audited · Zero-knowledge storage
        </p>
      </div>
    </div>
  );
};
