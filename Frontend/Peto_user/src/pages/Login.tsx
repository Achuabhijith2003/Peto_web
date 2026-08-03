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
import RememberCheckbox from "../components/auth/RememberCheckbox";
import Button from "../components/common/Button";

import heroImage from "../assets/hero.png";

interface LoginForm {
  email: string;
  password: string;
}

const Login = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const navigate = useNavigate();
  const { login } = useAuth();
  const [serverError, setServerError] = useState("");

  const onSubmit = async (data: LoginForm) => {
    try {
      setServerError("");
      const response = await api.post("/auth/login", data);
      if (response.data.success) {
        const token = response.data.session?.access_token || response.data.token;
        const refreshToken = response.data.session?.refresh_token || response.data.refreshToken;
        login(token, refreshToken, response.data.user);
        
        try {
          // Check if profile exists
          const meRes = await api.get("/users/me", { headers: { Authorization: `Bearer ${token}` } });
          if (!meRes.data.profile) {
            navigate("/create-profile");
          } else {
            navigate("/profile");
          }
        } catch (err: any) {
          // If checking fails, fallback to create profile
          navigate("/create-profile");
        }
      }
    } catch (error: any) {
      setServerError(error.response?.data?.message || "Login failed");
    }
  };

  return (
    <AuthLayout
      image={heroImage}
      title="Welcome Back!"
      subtitle="Sign in to continue caring for your furry friend."
    >
      <motion.form
        onSubmit={handleSubmit(onSubmit)}
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        <InputField
          label="Email"
          type="email"
          placeholder="Enter your email"
          error={errors.email?.message}
          {...register("email", {
            required: "Email is required",
          })}
        />

        <PasswordField
          label="Password"
          placeholder="Enter your password"
          error={errors.password?.message}
          {...register("password", {
            required: "Password is required",
          })}
        />

        {serverError && (
          <p className="text-sm text-red-500 text-center">{serverError}</p>
        )}

        <div className="flex items-center justify-between">
          <RememberCheckbox label="Remember me" />

          <Link
            to="/forgot-password"
            className="text-sm font-medium text-blue-600 hover:underline"
          >
            Forgot Password?
          </Link>
        </div>

        <Button type="submit">
          Login
        </Button>

        <Divider />

        <GoogleButton />

        <p className="text-center text-sm text-gray-500">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="font-semibold text-amber-600"
          >
            Register
          </Link>
        </p>
      </motion.form>
    </AuthLayout>
  );
};

export default Login;