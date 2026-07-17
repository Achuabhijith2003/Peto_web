import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useForm } from "react-hook-form";

import AuthLayout from "../components/auth/AuthLayout";
import InputField from "../components/auth/InputField";
import Button from "../components/common/Button";

import heroImage from "../assets/hero.png";

interface ForgotPasswordForm {
  email: string;
}

const ForgotPassword = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitSuccessful },
  } = useForm<ForgotPasswordForm>();

  const onSubmit = (data: ForgotPasswordForm) => {
    console.log("Reset Email:", data.email);

    // TODO:
    // await authService.forgotPassword(data.email);
  };

  return (
    <AuthLayout
      image={heroImage}
      title="Forgot Password?"
      subtitle="Enter your email address and we'll send you a password reset link."
    >
      <motion.form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-6"
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <InputField
          label="Email Address"
          type="email"
          placeholder="Enter your email"
          error={errors.email?.message}
          {...register("email", {
            required: "Email is required",
            pattern: {
              value: /^\S+@\S+\.\S+$/,
              message: "Please enter a valid email address",
            },
          })}
        />

        <Button type="submit">
          Send Reset Link
        </Button>

        {isSubmitSuccessful && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
            Password reset instructions have been sent to your email.
          </div>
        )}

        <div className="text-center">
          <Link
            to="/login"
            className="font-semibold text-blue-600 hover:underline"
          >
            ← Back to Login
          </Link>
        </div>
      </motion.form>
    </AuthLayout>
  );
};

export default ForgotPassword;