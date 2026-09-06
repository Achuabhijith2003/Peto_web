import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { Eye, EyeOff, CheckCircle2, AlertCircle, KeyRound, ArrowRight } from "lucide-react";

import AuthLayout from "../components/auth/AuthLayout";
import Button from "../components/common/Button";
import api from "../utils/api";
import { supabase } from "../utils/supabaseClient";
import heroImage from "../assets/hero.png";

interface ResetPasswordForm {
  password: string;
  confirmPassword: string;
}

const ResetPassword = () => {
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifyingToken, setIsVerifyingToken] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordForm>();

  const newPassword = watch("password");

  useEffect(() => {
    const extractRecoveryToken = async () => {
      try {
        // 1. Check URL Hash fragment (#access_token=...&type=recovery)
        const hash = window.location.hash;
        if (hash) {
          const params = new URLSearchParams(hash.replace(/^#/, ""));
          const accessToken = params.get("access_token");
          if (accessToken) {
            setToken(accessToken);
            // Also establish session with Supabase client if refresh_token exists
            const refreshToken = params.get("refresh_token");
            if (refreshToken) {
              await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
            }
            setIsVerifyingToken(false);
            return;
          }
        }

        // 2. Check URL search parameters (?code=... or ?token=...)
        const searchParams = new URLSearchParams(window.location.search);
        const queryToken = searchParams.get("token") || searchParams.get("access_token");
        const code = searchParams.get("code");

        if (queryToken) {
          setToken(queryToken);
          setIsVerifyingToken(false);
          return;
        }

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error && data?.session?.access_token) {
            setToken(data.session.access_token);
            setIsVerifyingToken(false);
            return;
          }
        }

        // 3. Check existing Supabase session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          setToken(session.access_token);
        }
      } catch (err) {
        console.error("Error inspecting reset token:", err);
      } finally {
        setIsVerifyingToken(false);
      }
    };

    extractRecoveryToken();

    // Listen to Supabase auth events
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (
          (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") &&
          session?.access_token
        ) {
          setToken(session.access_token);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const onSubmit = async (data: ResetPasswordForm) => {
    if (data.password !== data.confirmPassword) {
      setErrorMessage("Passwords do not match");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // 1. Try to update via backend API endpoint
      const response = await api.post(
        "/auth/reset-password",
        {
          password: data.password,
          token: token,
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }
      );

      // 2. Also update via Supabase client session if available
      try {
        await supabase.auth.updateUser({ password: data.password });
      } catch (clientErr) {
        // Backend update succeeded, non-blocking if client session isn't active
        console.warn("Client-side supabase updateUser note:", clientErr);
      }

      if (response.data?.success) {
        setIsSuccess(true);
      } else {
        setErrorMessage(
          response.data?.message || "Failed to reset password. Please try again."
        );
      }
    } catch (err: any) {
      console.error("Password reset error:", err);
      // If backend failed, try Supabase client directly as fallback
      try {
        const { error: directError } = await supabase.auth.updateUser({
          password: data.password,
        });

        if (!directError) {
          setIsSuccess(true);
          return;
        }
      } catch (_) {}

      const msg =
        err.response?.data?.message ||
        "The reset link may have expired or is invalid. Please request a new one.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      image={heroImage}
      title="Create New Password"
      subtitle="Choose a strong password to protect your Peto account."
    >
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {isVerifyingToken ? (
          <div className="py-12 text-center text-gray-500">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-3" />
            <p className="text-sm font-medium">Validating recovery link...</p>
          </div>
        ) : isSuccess ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold text-emerald-950">
                Password Reset Complete!
              </h3>
              <p className="mt-2 text-sm text-emerald-800 leading-relaxed">
                Your Peto password has been successfully updated. You can now use your new password to log in.
              </p>
            </div>

            <Button
              variant="primary"
              fullWidth
              size="lg"
              onClick={() => navigate("/login")}
            >
              Continue to Login
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        ) : !token ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 shadow-sm">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-amber-950">
                Invalid or Expired Link
              </h3>
              <p className="mt-2 text-sm text-amber-800 leading-relaxed">
                This password reset link is invalid or has expired. Password reset links can only be used once.
              </p>
            </div>

            <Link to="/forgot-password" className="block w-full">
              <Button variant="primary" fullWidth size="lg">
                Request a New Reset Link
              </Button>
            </Link>

            <div className="text-center">
              <Link
                to="/login"
                className="text-sm font-semibold text-gray-600 hover:text-gray-900 hover:underline"
              >
                ← Back to Login
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {errorMessage && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* New Password */}
            <div className="space-y-2">
              <label className="font-medium text-gray-700 text-sm">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="At least 6 characters"
                  className="w-full rounded-xl bg-gray-100 px-4 py-3 pr-11 outline-none transition-all duration-300 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  {...register("password", {
                    required: "New password is required",
                    minLength: {
                      value: 6,
                      message: "Password must be at least 6 characters",
                    },
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div className="space-y-2">
              <label className="font-medium text-gray-700 text-sm">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Re-enter your new password"
                  className="w-full rounded-xl bg-gray-100 px-4 py-3 pr-11 outline-none transition-all duration-300 focus:bg-white focus:ring-2 focus:ring-blue-500"
                  {...register("confirmPassword", {
                    required: "Please confirm your password",
                    validate: (val) =>
                      val === newPassword || "Passwords do not match",
                  })}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-xs text-red-500">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={isLoading}
            >
              <KeyRound className="h-4 w-4 mr-2" />
              Reset Password
            </Button>

            <div className="text-center pt-2">
              <Link
                to="/login"
                className="text-sm font-semibold text-gray-600 hover:text-gray-900 hover:underline"
              >
                ← Back to Login
              </Link>
            </div>
          </form>
        )}
      </motion.div>
    </AuthLayout>
  );
};

export default ResetPassword;
