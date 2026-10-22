import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";
import { useState } from "react";

import AuthLayout from "../components/auth/AuthLayout";
import InputField from "../components/auth/InputField";
import PasswordField from "../components/auth/PasswordField";
import GoogleButton from "../components/auth/GoogleButton";
import Divider from "../components/auth/Divider";
import Button from "../components/common/Button";

import heroImage from "../assets/hero.png";

interface RegisterForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  agree: boolean;
  ageConfirmed: boolean;
  marketingConsent?: boolean;
}

const Register = () => {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>();

  const password = watch("password");

  const navigate = useNavigate();
  const { login } = useAuth();
  const [serverError, setServerError] = useState("");

  const onSubmit = async (data: RegisterForm) => {
    try {
      setServerError("");
      const fullName = `${data.firstName.trim()} ${data.lastName.trim()}`.trim();
      const response = await api.post("/auth/signup", {
        email: data.email,
        password: data.password,
        fullName: fullName,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        username: fullName.toLowerCase().replace(/\s+/g, ""),
        acceptedTerms: data.agree,
        ageConfirmed: data.ageConfirmed,
        marketingConsent: Boolean(data.marketingConsent),
      });
      if (response.data.success) {
        const token = response.data.token || response.data.session?.access_token;
        const refreshToken = response.data.refreshToken || response.data.session?.refresh_token;
        login(token, refreshToken, response.data.user);
        navigate("/create-profile");
      }
    } catch (error: any) {
      setServerError(error.response?.data?.message || "Registration failed");
    }
  };

  return (
    <AuthLayout
      image={heroImage}
      title="Create Your Account"
      subtitle="Join Peto and start giving your pet the best care."
    >
      <motion.form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InputField
            label="First Name"
            placeholder="John"
            error={errors.firstName?.message}
            {...register("firstName", {
              required: "First name is required",
            })}
          />

          <InputField
            label="Last Name"
            placeholder="Doe"
            error={errors.lastName?.message}
            {...register("lastName", {
              required: "Last name is required",
            })}
          />
        </div>

        <InputField
          label="Email"
          type="email"
          placeholder="john@example.com"
          error={errors.email?.message}
          {...register("email", {
            required: "Email is required",
          })}
        />

        <PasswordField
          label="Password"
          placeholder="Create password"
          error={errors.password?.message}
          {...register("password", {
            required: "Password is required",
            minLength: {
              value: 8,
              message: "Minimum 8 characters",
            },
          })}
        />

        <PasswordField
          label="Confirm Password"
          placeholder="Confirm password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword", {
            validate: (value) =>
              value === password || "Passwords do not match",
          })}
        />

        {/* Legal & Age Assurance Checks */}
        <div className="space-y-3 pt-2">
          {/* Age Eligibility Affirmation */}
          <label className="flex items-start gap-3 text-xs sm:text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
              {...register("ageConfirmed", {
                required: "You must confirm you are at least 13 years old",
              })}
            />
            <span>
              I confirm that I am <strong className="text-slate-900 font-semibold">at least 13 years old</strong> (or the minimum legal age for digital services in my jurisdiction).
            </span>
          </label>
          {errors.ageConfirmed && (
            <p className="text-xs text-red-500 ml-7">{errors.ageConfirmed.message}</p>
          )}

          {/* Mandatory Terms & Privacy Affirmation */}
          <label className="flex items-start gap-3 text-xs sm:text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              className="mt-1 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
              {...register("agree", {
                required: "Please affirmatively accept the Terms of Service and Privacy Policy",
              })}
            />
            <span>
              I agree to Peto's{" "}
              <Link
                to="/policies/terms-of-service"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-700 hover:text-amber-800 font-semibold underline underline-offset-2"
              >
                Terms of Service
              </Link>{" "}
              and acknowledge the{" "}
              <Link
                to="/policies/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-700 hover:text-amber-800 font-semibold underline underline-offset-2"
              >
                Privacy Policy
              </Link>.
            </span>
          </label>
          {errors.agree && (
            <p className="text-xs text-red-500 ml-7">{errors.agree.message}</p>
          )}

          {/* Separate Optional Marketing Consent */}
          <label className="flex items-start gap-3 text-xs text-slate-500 cursor-pointer pt-1">
            <input
              type="checkbox"
              className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 cursor-pointer"
              {...register("marketingConsent")}
            />
            <span>
              (Optional) Send me pet care insights, product updates, and community highlights by email. You can unsubscribe anytime.
            </span>
          </label>
        </div>

        {serverError && (
          <p className="text-sm text-red-500 text-center">{serverError}</p>
        )}

        <Button type="submit" fullWidth variant="amber" size="lg" className="w-full py-3 text-sm font-bold shadow-md cursor-pointer">
          Create Account
        </Button>

        <Divider />

        <GoogleButton />

        <p className="text-center text-sm">
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-semibold text-amber-600"
          >
            Login
          </Link>
        </p>
      </motion.form>
    </AuthLayout>
  );
};

export default Register;