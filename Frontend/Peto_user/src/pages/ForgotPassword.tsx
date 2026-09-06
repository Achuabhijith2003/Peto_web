import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { Mail, CheckCircle, AlertCircle, ArrowLeft } from "lucide-react";

import AuthLayout from "../components/auth/AuthLayout";
import InputField from "../components/auth/InputField";
import Button from "../components/common/Button";
import api from "../utils/api";
import heroImage from "../assets/hero.png";

interface ForgotPasswordForm {
  email: string;
}

const ForgotPassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>();

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      const response = await api.post("/auth/forgot-password", {
        email: data.email.trim(),
        redirectTo: redirectUrl,
      });

      if (response.data?.success) {
        setSubmittedEmail(data.email.trim());
        setIsSuccess(true);
      } else {
        setErrorMessage(
          response.data?.message || "Failed to send reset link. Please try again."
        );
      }
    } catch (err: any) {
      console.error("Forgot password request failed:", err);
      const msg =
        err.response?.data?.message ||
        "An unexpected error occurred. Please check your connection and try again.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      image={heroImage}
      title="Forgot Password?"
      subtitle="Enter your email address and we'll send you a password reset link."
    >
      <motion.div
        className="space-y-6"
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {isSuccess ? (
          <div className="space-y-6">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-6 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 shadow-sm">
                <CheckCircle className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-emerald-950">
                Reset Link Sent!
              </h3>
              <p className="mt-2 text-sm text-emerald-800 leading-relaxed">
                We sent a secure password reset link to:
                <br />
                <strong className="text-emerald-950 break-all">{submittedEmail}</strong>
              </p>
              <p className="mt-3 text-xs text-emerald-700">
                Please check your inbox (and spam or junk folder) and click the link to reset your password.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Button
                variant="outline"
                fullWidth
                onClick={() => setIsSuccess(false)}
              >
                Send to a different email
              </Button>

              <Link to="/login" className="w-full">
                <Button variant="primary" fullWidth>
                  Return to Login
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {errorMessage && (
              <div className="flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                <AlertCircle className="h-5 w-5 shrink-0 text-rose-600 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <InputField
              label="Email Address"
              type="email"
              placeholder="Enter your registered email"
              error={errors.email?.message}
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^\S+@\S+\.\S+$/,
                  message: "Please enter a valid email address",
                },
              })}
            />

            <Button
              type="submit"
              fullWidth
              size="lg"
              loading={isLoading}
            >
              <Mail className="h-4 w-4 mr-2" />
              Send Reset Link
            </Button>

            <div className="text-center">
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Link>
            </div>
          </form>
        )}
      </motion.div>
    </AuthLayout>
  );
};

export default ForgotPassword;