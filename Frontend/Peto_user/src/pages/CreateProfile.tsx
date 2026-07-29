import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useState } from "react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

import AuthLayout from "../components/auth/AuthLayout";
import InputField from "../components/auth/InputField";
import Button from "../components/common/Button";
import heroImage from "../assets/hero.png";

interface ProfileForm {
  username: string;
  bio: string;
  location: string;
  website: string;
  phone: string;
  dateOfBirth: string;
}

const CreateProfile = () => {
  const { register, handleSubmit, formState: { errors } } = useForm<ProfileForm>();
  const navigate = useNavigate();
  const {  } = useAuth();
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (data: ProfileForm) => {
    try {
      setLoading(true);
      setServerError("");
      const response = await api.post("/users/profile", data);
      if (response.data.success) {
        navigate("/profile");
      }
    } catch (error: any) {
      setServerError(error.response?.data?.message || "Failed to create profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      image={heroImage}
      title="Complete Your Profile"
      subtitle="Tell us a bit more about yourself to connect with the community."
    >
      <motion.form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <InputField
          label="Username"
          placeholder="e.g. john_doe"
          error={errors.username?.message}
          {...register("username", {
            required: "Username is required",
            pattern: {
              value: /^[a-z0-9_]{3,20}$/,
              message: "3-20 chars, lowercase, numbers, underscores only",
            }
          })}
        />

        <InputField
          label="Bio"
          placeholder="Short bio about you"
          error={errors.bio?.message}
          {...register("bio")}
        />

        <InputField
          label="Location"
          placeholder="e.g. New York, USA"
          error={errors.location?.message}
          {...register("location")}
        />

        <InputField
          label="Website"
          type="url"
          placeholder="https://yourwebsite.com"
          error={errors.website?.message}
          {...register("website")}
        />

        <InputField
          label="Phone"
          type="tel"
          placeholder="+1234567890"
          error={errors.phone?.message}
          {...register("phone")}
        />

        <InputField
          label="Date of Birth"
          type="date"
          error={errors.dateOfBirth?.message}
          {...register("dateOfBirth")}
        />

        {serverError && (
          <p className="text-sm text-red-500 text-center">{serverError}</p>
        )}

        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : "Create Profile"}
        </Button>
      </motion.form>
    </AuthLayout>
  );
};

export default CreateProfile;
