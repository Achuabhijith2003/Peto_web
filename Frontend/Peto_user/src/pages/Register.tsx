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
      subtitle="Join Pawfect Pals and start giving your pet the best care."
    >
      <motion.form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
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

        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            {...register("agree", {
              required: "Please accept the terms",
            })}
          />

          <span>
            I agree to the{" "}
            <Link
              to="#"
              className="text-blue-600 font-medium"
            >
              Terms & Conditions
            </Link>
          </span>
        </label>

        {errors.agree && (
          <p className="text-sm text-red-500">
            {errors.agree.message}
          </p>
        )}

        {serverError && (
          <p className="text-sm text-red-500 text-center">{serverError}</p>
        )}

        <Button type="submit">
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