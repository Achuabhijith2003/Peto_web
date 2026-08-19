import { useEffect, useState, useRef, type ChangeEvent, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  User,
  AtSign,
  MapPin,
  Globe,
  Phone,
  Calendar,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import api from "../utils/api";
import { useAuth } from "../context/AuthContext";

import Navbar from "../components/layout/Navbar";
import LeftSidebar from "../components/social/LeftSidebar";
import RightSidebar from "../components/social/RightSidebar";
import SocialLayout from "../components/social/SocialLayout";
import MobileBottomNav from "../components/social/MobileBottomNav";
import FloatingChatButton from "../components/social/FloatingChatButton";

const EditProfileContent = () => {
  const navigate = useNavigate();
  const { user, updateUserProfile, refreshUser } = useAuth();

  // Form fields state
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [originalUsername, setOriginalUsername] = useState("");
  const [bio, setBio] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  // Media preview state
  const [avatarUrl, setAvatarUrl] = useState<string>("");
  const [coverUrl, setCoverUrl] = useState<string>("");
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [coverPreview, setCoverPreview] = useState<string>("");

  // UI state
  const [fetching, setFetching] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<{
    checking: boolean;
    available: boolean | null;
    message: string;
  }>({ checking: false, available: null, message: "" });

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchCurrentProfile = async () => {
      try {
        setFetching(true);
        const res = await api.get("/users/me");
        const profile = res.data.profile || {};
        const userData = res.data.user || user;

        setFullName(profile.full_name || userData?.name || "");
        const curUsername = profile.username || userData?.username || "";
        setUsername(curUsername);
        setOriginalUsername(curUsername);
        setBio(profile.bio || "");
        setLocation(profile.location || "");
        setWebsite(profile.website || "");
        setPhone(profile.phone || "");
        if (profile.date_of_birth) {
          const formattedDate = new Date(profile.date_of_birth)
            .toISOString()
            .split("T")[0];
          setDateOfBirth(formattedDate);
        }

        setAvatarUrl(profile.avatar_url || userData?.avatar_url || "");
        setCoverUrl(profile.cover_url || "");
      } catch (err: any) {
        console.error("Failed to load profile for edit:", err);
        setErrorMessage("Failed to load profile details.");
      } finally {
        setFetching(false);
      }
    };

    fetchCurrentProfile();
  }, []);

  // Username validation check
  const handleCheckUsername = async (val: string) => {
    const clean = val.trim().toLowerCase();
    if (!clean || clean === originalUsername.toLowerCase()) {
      setUsernameStatus({ checking: false, available: true, message: "" });
      return;
    }

    if (!/^[a-z0-9_]{3,20}$/.test(clean)) {
      setUsernameStatus({
        checking: false,
        available: false,
        message: "Username must be 3-20 characters (a-z, 0-9, _).",
      });
      return;
    }

    try {
      setUsernameStatus({ checking: true, available: null, message: "Checking..." });
      const res = await api.get(`/users/check-username?username=${clean}`);
      if (res.data.available) {
        setUsernameStatus({
          checking: false,
          available: true,
          message: "Username is available!",
        });
      } else {
        setUsernameStatus({
          checking: false,
          available: false,
          message: "Username is already taken.",
        });
      }
    } catch (err: any) {
      setUsernameStatus({
        checking: false,
        available: false,
        message: err.response?.data?.message || "Error checking username",
      });
    }
  };

  // Avatar file selection & upload
  const handleAvatarChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file.");
      return;
    }

    setAvatarPreview(URL.createObjectURL(file));

    // Upload avatar immediately
    try {
      setUploadingAvatar(true);
      setErrorMessage("");
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await api.patch("/users/avatar", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success && res.data.avatar_url) {
        setAvatarUrl(res.data.avatar_url);
        updateUserProfile({ avatar_url: res.data.avatar_url });
        setSuccessMessage("Avatar picture updated!");
      }
    } catch (err: any) {
      console.error("Avatar upload failed:", err);
      setErrorMessage(err.response?.data?.message || "Failed to upload avatar.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Cover file selection & upload
  const handleCoverChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please select a valid image file.");
      return;
    }

    setCoverPreview(URL.createObjectURL(file));

    // Upload cover image immediately
    try {
      setUploadingCover(true);
      setErrorMessage("");
      const formData = new FormData();
      formData.append("cover", file);

      const res = await api.patch("/users/cover", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.success && res.data.cover_url) {
        setCoverUrl(res.data.cover_url);
        updateUserProfile({ cover_url: res.data.cover_url });
        setSuccessMessage("Cover photo updated!");
      }
    } catch (err: any) {
      console.error("Cover upload failed:", err);
      setErrorMessage(err.response?.data?.message || "Failed to upload cover photo.");
    } finally {
      setUploadingCover(false);
    }
  };

  // Submit Profile Changes
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (usernameStatus.available === false) {
      setErrorMessage("Please choose a valid & available username.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        full_name: fullName,
        username: username.trim().toLowerCase(),
        bio,
        location,
        website,
        phone,
        date_of_birth: dateOfBirth || null,
        avatar_url: avatarUrl,
        cover_url: coverUrl,
      };

      const res = await api.patch("/users/me", payload);

      if (res.data.success) {
        updateUserProfile(res.data.data || payload);
        await refreshUser();
        setSuccessMessage("Profile saved successfully!");
        setTimeout(() => {
          navigate("/profile");
        }, 1200);
      }
    } catch (err: any) {
      console.error("Profile save error:", err);
      setErrorMessage(
        err.response?.data?.message || "Failed to update profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  if (fetching) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl shadow-sm border border-slate-100">
        <Loader2 size={36} className="animate-spin text-amber-500 mb-3" />
        <p className="text-sm font-medium text-slate-500">Loading profile data...</p>
      </div>
    );
  }

  const currentDisplayAvatar =
    avatarPreview ||
    avatarUrl ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      fullName || username || "user"
    )}&background=random`;

  const currentDisplayCover = coverPreview || coverUrl;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Bar */}
      <div className="flex items-center justify-between bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/profile")}
            className="p-2.5 rounded-2xl bg-slate-50 hover:bg-amber-50 text-slate-600 hover:text-amber-700 transition"
            title="Back to profile"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
              Edit Profile
              <Sparkles size={18} className="text-amber-500" />
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 font-medium">
              Update your profile details, avatar, and cover photo
            </p>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm font-semibold animate-fadeIn">
          <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm font-semibold animate-fadeIn">
          <AlertCircle size={20} className="text-rose-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Banner & Avatar Card */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
          {/* Cover Photo Area */}
          <div className="relative h-44 sm:h-52 w-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 group overflow-hidden">
            {currentDisplayCover && currentDisplayCover !== "null" ? (
              <img
                src={currentDisplayCover}
                alt="Cover photo"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white/80 font-medium text-sm">
                No cover photo set
              </div>
            )}

            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                type="button"
                onClick={() => coverInputRef.current?.click()}
                disabled={uploadingCover}
                className="flex items-center gap-2 px-4 py-2 bg-white/90 backdrop-blur-md rounded-2xl text-slate-900 font-bold text-xs sm:text-sm hover:bg-white transition shadow-lg disabled:opacity-50"
              >
                {uploadingCover ? (
                  <Loader2 size={16} className="animate-spin text-amber-600" />
                ) : (
                  <Camera size={16} className="text-amber-600" />
                )}
                {uploadingCover ? "Uploading..." : "Change Cover Photo"}
              </button>
            </div>

            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleCoverChange}
            />
          </div>

          {/* Avatar Area */}
          <div className="px-6 pb-6 pt-0 relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between -mt-14 sm:-mt-16 gap-4 mb-2">
              <div className="relative group w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-white bg-white shadow-lg overflow-hidden shrink-0 z-20">
                <img
                  src={currentDisplayAvatar}
                  alt="Avatar preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(
                      fullName || username || "user"
                    )}&background=random`;
                  }}
                />
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"
                  title="Upload profile picture"
                >
                  {uploadingAvatar ? (
                    <Loader2 size={24} className="animate-spin" />
                  ) : (
                    <Camera size={24} />
                  )}
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs sm:text-sm font-semibold rounded-xl transition flex items-center gap-1.5"
                >
                  {uploadingAvatar && <Loader2 size={14} className="animate-spin" />}
                  Change Profile Picture
                </button>

                <button
                  type="button"
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploadingCover}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold rounded-xl transition flex items-center gap-1.5"
                >
                  {uploadingCover && <Loader2 size={14} className="animate-spin" />}
                  Change Cover
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Profile Information Form */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-slate-100 space-y-6">
          <h2 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-3">
            Personal Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-bold text-slate-700">
                Full Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User size={18} />
                </div>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-sm font-medium text-slate-800 transition"
                  required
                />
              </div>
            </div>

            {/* Username */}
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-bold text-slate-700">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <AtSign size={18} />
                </div>
                <input
                disabled={true}
                  type="text"
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    handleCheckUsername(e.target.value);
                  }}
                  placeholder="username"
                  className={`w-full pl-10 pr-4 py-3 rounded-2xl border text-sm font-medium focus:outline-none transition ${
                    usernameStatus.available === false
                      ? "border-rose-400 focus:ring-2 focus:ring-rose-500/20"
                      : usernameStatus.available === true
                      ? "border-emerald-400 focus:ring-2 focus:ring-emerald-500/20"
                      : "border-slate-200 focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
                  }`}
                  required
                />
              </div>
              {usernameStatus.message && (
                <p
                  className={`text-xs font-semibold ${
                    usernameStatus.available === true
                      ? "text-emerald-600"
                      : usernameStatus.available === false
                      ? "text-rose-500"
                      : "text-slate-400"
                  }`}
                >
                  {usernameStatus.message}
                </p>
              )}
            </div>

            {/* Location */}
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-bold text-slate-700">
                Location
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <MapPin size={18} />
                </div>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. San Francisco, CA"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-sm font-medium text-slate-800 transition"
                />
              </div>
            </div>

            {/* Website */}
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-bold text-slate-700">
                Website / Social Link
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Globe size={18} />
                </div>
                <input
                  type="text"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="e.g. https://myfluffyfriend.com"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-sm font-medium text-slate-800 transition"
                />
              </div>
            </div>

            {/* Phone */}
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-bold text-slate-700">
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone size={18} />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-sm font-medium text-slate-800 transition"
                />
              </div>
            </div>

            {/* Date of Birth */}
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-bold text-slate-700">
                Date of Birth
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Calendar size={18} />
                </div>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-sm font-medium text-slate-800 transition"
                />
              </div>
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-2 pt-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs sm:text-sm font-bold text-slate-700">
                Bio / About You & Pets
              </label>
              <span className="text-xs text-slate-400 font-semibold">
                {bio.length}/250
              </span>
            </div>
            <textarea
              rows={4}
              maxLength={250}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell pet lovers about yourself, your furry companions, breed preferences, or pet hobbies..."
              className="w-full p-4 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 text-sm font-medium text-slate-800 transition resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="px-6 py-3 rounded-2xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={saving || usernameStatus.available === false}
              className="px-8 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm shadow-md shadow-amber-500/25 transition disabled:opacity-50 flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Saving Changes...
                </>
              ) : (
                "Save Profile"
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

const EditProfile = () => {
  return (
    <main className="min-h-screen bg-slate-50">
      <Navbar />

      <SocialLayout
        left={<LeftSidebar />}
        center={<EditProfileContent />}
        right={<RightSidebar />}
      />

      <FloatingChatButton />
      <MobileBottomNav />
    </main>
  );
};

export default EditProfile;
