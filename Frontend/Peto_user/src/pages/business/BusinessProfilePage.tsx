import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  Building2,
  Globe,
  MapPin,
  ShieldCheck,
  CheckCircle2,
  ExternalLink,
  Edit3,
  ArrowLeft,
  Sparkles,
  Layers,
  Info,
  Clock,
  Check,
  Megaphone,
  Camera,
  Image as ImageIcon,
  PlusCircle,
  AlertTriangle,
  Mail,
  Phone,
  X,
} from "lucide-react";
import api from "../../utils/api";
import { useIdentity } from "../../context/IdentityContext";
import Navbar from "../../components/layout/Navbar";
import VerifiedBadge from "../../components/common/VerifiedBadge";
import PostCard from "../../components/social/PostCard";

interface BusinessDetail {
  id: string;
  name: string;
  legal_name: string;
  username?: string;
  country_code: string;
  state?: string;
  city?: string;
  website_url?: string;
  public_email?: string;
  public_phone?: string;
  business_type?: string;
  business_category?: string;
  description?: string;
  avatar_url?: string | null;
  cover_url?: string | null;
  identityType: "BUSINESS";
  created_at: string;
  verification: {
    verified: boolean;
    type: "BUSINESS_VERIFIED" | null;
    status: string;
    verified_at?: string | null;
    reverification_reason?: string | null;
  };
  is_verified: boolean;
  isOwner: boolean;
  role?: string | null;
  canManage: boolean;
}

export const BusinessProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeIdentity, switchIdentity, refreshBusinesses } = useIdentity();

  const [business, setBusiness] = useState<BusinessDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"about" | "posts" | "ads">("posts");

  // Posts state
  const [posts, setPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    legal_name: "",
    username: "",
    description: "",
    website_url: "",
    public_email: "",
    public_phone: "",
    country_code: "IN",
    state: "",
    city: "",
    business_category: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  // Reverification Warning Modal State
  const [showReverificationModal, setShowReverificationModal] = useState(false);

  // Upload state
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const fetchBusiness = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/businesses/${id}`);
      if (res.data?.success && res.data.business) {
        const b = res.data.business;
        setBusiness(b);
        setEditForm({
          name: b.name || "",
          legal_name: b.legal_name || "",
          username: b.username || "",
          description: b.description || "",
          website_url: b.website_url || "",
          public_email: b.public_email || "",
          public_phone: b.public_phone || "",
          country_code: b.country_code || "IN",
          state: b.state || "",
          city: b.city || "",
          business_category: b.business_category || "",
        });
      } else {
        setError("Business not found.");
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || "Failed to load business profile.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchPosts = useCallback(async () => {
    if (!id) return;
    try {
      setLoadingPosts(true);
      const res = await api.get(`/businesses/${id}/posts`);
      if (res.data?.success && Array.isArray(res.data.posts)) {
        setPosts(res.data.posts);
      }
    } catch (err) {
      console.error("Failed to fetch business posts", err);
    } finally {
      setLoadingPosts(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBusiness();
    fetchPosts();
  }, [fetchBusiness, fetchPosts]);

  // Handle Avatar / Logo Upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    const formData = new FormData();
    formData.append("avatar", file);

    setUploadingAvatar(true);
    try {
      const res = await api.post(`/businesses/${id}/avatar`, formData);
      if (res.data?.success && res.data.avatar_url) {
        setBusiness((prev) => (prev ? { ...prev, avatar_url: res.data.avatar_url } : null));
        await refreshBusinesses();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to upload business logo.");
    } finally {
      setUploadingAvatar(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  // Handle Cover Upload
  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    const formData = new FormData();
    formData.append("cover", file);

    setUploadingCover(true);
    try {
      const res = await api.post(`/businesses/${id}/cover`, formData);
      if (res.data?.success && res.data.cover_url) {
        setBusiness((prev) => (prev ? { ...prev, cover_url: res.data.cover_url } : null));
        await refreshBusinesses();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Failed to upload cover photo.");
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = "";
    }
  };

  // Form Submit with Critical Reverification Check
  const handleFormSubmitCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;

    const isVerified = business.verification?.verified || business.is_verified;
    const isCriticalChange =
      (editForm.name.trim() !== business.name.trim()) ||
      (editForm.legal_name.trim() !== business.legal_name.trim()) ||
      (editForm.country_code.trim().toUpperCase() !== (business.country_code || "IN").trim().toUpperCase());

    if (isVerified && isCriticalChange) {
      // Require explicit confirmation
      setShowReverificationModal(true);
      return;
    }

    executeSaveEdit();
  };

  const executeSaveEdit = async () => {
    if (!id) return;
    setSavingEdit(true);
    setEditError("");
    setShowReverificationModal(false);

    try {
      const res = await api.patch(`/businesses/${id}`, editForm);
      if (res.data?.success && res.data.business) {
        setBusiness(res.data.business);
        await refreshBusinesses();
        setEditOpen(false);
      }
    } catch (err: any) {
      setEditError(err.response?.data?.message || err.response?.data?.error || "Failed to update profile.");
    } finally {
      setSavingEdit(false);
    }
  };

  const isCurrentActive = activeIdentity.type === "BUSINESS" && activeIdentity.id === business?.id;

  const handleCreatePostAsBusiness = () => {
    if (!business) return;
    if (!isCurrentActive) {
      switchIdentity("BUSINESS", business.id);
    }
    navigate("/social", { state: { openComposer: true, businessId: business.id } });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f9f9ff]">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto animate-pulse">
            <Building2 size={24} />
          </div>
          <p className="text-sm font-medium text-slate-500">Loading Business Profile...</p>
        </div>
      </div>
    );
  }

  if (error || !business) {
    return (
      <div className="min-h-screen bg-[#f9f9ff]">
        <Navbar />
        <div className="max-w-lg mx-auto px-4 py-16 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <Building2 size={24} />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Business Profile Unavailable</h2>
          <p className="text-sm text-slate-500">{error || "This business profile could not be loaded."}</p>
          <Link
            to="/social"
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            <ArrowLeft size={14} /> Back to Social Feed
          </Link>
        </div>
      </div>
    );
  }

  const isVerified = business.verification?.verified || business.is_verified;

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-slate-900 pb-16">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            to="/social"
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
          >
            <ArrowLeft size={16} /> Back to Feed
          </Link>
          <div className="flex items-center gap-2">
            {business.canManage && (
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Role: {business.role || "OWNER"}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#fff8ed] text-[#855300] border border-[#fde68a]">
              <Sparkles size={12} className="text-amber-500" />
              Business Identity
            </span>
          </div>
        </div>

        {/* Hero Card / Profile Header */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Cover Photo */}
          <div className="h-44 sm:h-56 relative bg-gradient-to-r from-amber-500 via-orange-400 to-amber-600 overflow-hidden">
            {business.cover_url ? (
              <img
                src={business.cover_url}
                alt="Business Cover"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
            )}

            {/* Change Cover Button for Managers */}
            {business.canManage && (
              <div className="absolute top-4 right-4">
                <input
                  type="file"
                  ref={coverInputRef}
                  onChange={handleCoverChange}
                  accept="image/*"
                  className="hidden"
                />
                <button
                  onClick={() => coverInputRef.current?.click()}
                  disabled={uploadingCover}
                  className="px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-semibold flex items-center gap-1.5 shadow-md transition cursor-pointer disabled:opacity-50"
                  title="Upload / Change Cover Image"
                >
                  <ImageIcon size={14} />
                  <span>{uploadingCover ? "Uploading..." : "Change Cover"}</span>
                </button>
              </div>
            )}
          </div>

          <div className="p-6 sm:p-8 relative pt-0">
            {/* Top Row: Avatar overlapping cover on left, Action Buttons on right */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-14 sm:-mt-16 mb-4">
              {/* Avatar / Logo with Upload Button */}
              <div className="relative group shrink-0">
                <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-tr from-amber-500 to-orange-500 p-1 shadow-xl ring-4 ring-white flex items-center justify-center text-white shrink-0 overflow-hidden bg-white">
                  {business.avatar_url ? (
                    <img
                      src={business.avatar_url}
                      alt={business.name}
                      className="w-full h-full rounded-2xl object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-amber-50 rounded-2xl flex items-center justify-center text-3xl font-extrabold text-amber-600 tracking-tight">
                      {business.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                {business.canManage && (
                  <>
                    <input
                      type="file"
                      ref={avatarInputRef}
                      onChange={handleAvatarChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="absolute bottom-1 right-1 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white shadow-lg transition cursor-pointer"
                      title="Upload Business Logo"
                    >
                      <Camera size={14} />
                    </button>
                  </>
                )}
              </div>

              {/* Action Controls sitting cleanly on the white card background */}
              <div className="flex items-center gap-2 flex-wrap self-start sm:self-end pb-1">
                {business.canManage ? (
                  <>
                    <button
                      onClick={() => switchIdentity("BUSINESS", business.id)}
                      className={`px-4 py-2 rounded-2xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs cursor-pointer ${
                        isCurrentActive
                          ? "bg-emerald-600 text-white"
                          : "bg-slate-900 hover:bg-slate-800 text-white"
                      }`}
                    >
                      {isCurrentActive ? (
                        <>
                          <Check size={14} />
                          <span>Active Identity</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={14} />
                          <span>Switch to Business</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={handleCreatePostAsBusiness}
                      className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <PlusCircle size={14} />
                      <span>Create Post</span>
                    </button>

                    <button
                      onClick={() => setEditOpen(true)}
                      className="px-3.5 py-2 rounded-2xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 size={14} />
                      <span>Edit Business</span>
                    </button>

                    <Link
                      to="/advertiser"
                      className="px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition flex items-center gap-1.5"
                    >
                      <Megaphone size={14} className="text-amber-600" />
                      <span>Manage Ads</span>
                    </Link>
                  </>
                ) : (
                  <>
                    {business.website_url && (
                      <a
                        href={business.website_url.startsWith("http") ? business.website_url : `https://${business.website_url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition flex items-center gap-1.5"
                      >
                        <span>Visit Website</span>
                        <ExternalLink size={14} />
                      </a>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Business Info: Full width on white card, clear of cover boundary */}
            <div className="space-y-1.5 mb-5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold font-headline text-slate-900 tracking-tight">
                  {business.name}
                </h1>
                <VerifiedBadge verified={isVerified} verificationType="BUSINESS_VERIFIED" size={22} />
              </div>
              <div className="flex items-center gap-2.5 text-xs text-slate-500 font-medium flex-wrap">
                {business.username && (
                  <span className="font-semibold text-slate-700">@{business.username}</span>
                )}
                {business.username && <span className="text-slate-300">•</span>}
                <span>Legal: <strong className="text-slate-800 font-semibold">{business.legal_name}</strong></span>
              </div>
            </div>

            {/* Quick Meta Tags & Contact */}
            <div className="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-600 border-t border-slate-100">
              {business.business_category && (
                <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-700 font-semibold">
                  {business.business_category}
                </span>
              )}

              {business.city && (
                <span className="flex items-center gap-1 font-medium text-slate-500">
                  <MapPin size={13} className="text-slate-400" />
                  <span>{business.city}{business.state ? `, ${business.state}` : ""}, {business.country_code}</span>
                </span>
              )}

              {business.public_email && (
                <a
                  href={`mailto:${business.public_email}`}
                  className="flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900"
                >
                  <Mail size={13} />
                  <span>{business.public_email}</span>
                </a>
              )}

              {business.public_phone && (
                <a
                  href={`tel:${business.public_phone}`}
                  className="flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900"
                >
                  <Phone size={13} />
                  <span>{business.public_phone}</span>
                </a>
              )}

              {business.website_url && (
                <a
                  href={business.website_url.startsWith("http") ? business.website_url : `https://${business.website_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 font-semibold text-blue-600 hover:underline"
                >
                  <Globe size={13} />
                  <span>{business.website_url.replace(/^https?:\/\//, "")}</span>
                </a>
              )}
            </div>

            {/* Description / Bio */}
            {business.description && (
              <p className="mt-4 text-sm text-slate-700 leading-relaxed max-w-2xl bg-slate-50/70 p-4 rounded-2xl border border-slate-100">
                {business.description}
              </p>
            )}

            {/* Verification Status Banner */}
            <div className="mt-5">
              {isVerified ? (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl flex items-center justify-between gap-3 text-xs text-emerald-900">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-xl">
                      <ShieldCheck size={18} />
                    </div>
                    <div>
                      <p className="font-bold flex items-center gap-1.5">
                        <span>Peto Verified Business Partner</span>
                        <VerifiedBadge verified={true} verificationType="BUSINESS_VERIFIED" size={15} />
                      </p>
                      <p className="text-[11px] text-emerald-700">
                        Authenticated by Peto Compliance • Official registered business entity.
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                    BUSINESS_VERIFIED
                  </span>
                </div>
              ) : (
                <div className="p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-900">
                  <div className="flex items-center gap-2.5">
                    <Clock size={16} className="text-amber-600 shrink-0" />
                    <div>
                      <p className="font-bold">Unverified Business Profile</p>
                      <p className="text-[11px] text-amber-700">
                        This business profile has not completed compliance verification.
                      </p>
                    </div>
                  </div>
                  {business.canManage && (
                    <Link
                      to="/advertiser"
                      className="px-3 py-1 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs transition"
                    >
                      Verify Now
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-t border-slate-100 px-6 sm:px-8 bg-slate-50/50">
            {[
              { id: "posts", label: "Posts & Updates", icon: Layers },
              { id: "about", label: "About & Entity Details", icon: Info },
              { id: "ads", label: "Advertising", icon: Megaphone },
            ].map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 py-3.5 px-4 border-b-2 text-xs font-bold transition cursor-pointer ${
                    active
                      ? "border-amber-500 text-amber-600 bg-white"
                      : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tab Content: Posts */}
        {activeTab === "posts" && (
          <div className="space-y-4">
            {business.canManage && (
              <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold overflow-hidden">
                    {business.avatar_url ? (
                      <img src={business.avatar_url} alt={business.name} className="w-full h-full object-cover" />
                    ) : (
                      business.name.slice(0, 1)
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Publish as {business.name}</p>
                    <p className="text-[11px] text-slate-400">Share announcements, tips, or product highlights</p>
                  </div>
                </div>
                <button
                  onClick={handleCreatePostAsBusiness}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <PlusCircle size={14} />
                  <span>Create Post</span>
                </button>
              </div>
            )}

            {loadingPosts ? (
              <div className="p-12 text-center text-slate-400 text-xs">Loading business posts...</div>
            ) : posts.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-200 p-12 shadow-sm text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
                  <Layers size={20} />
                </div>
                <h4 className="text-base font-bold text-slate-900">No Posts Published Yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Posts published by {business.name} will be displayed here for followers and customers.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {posts.map((post) => {
                  const enhancedPost = {
                    ...post,
                    author: {
                      ...post.author,
                      id: business.id,
                      full_name: (post.author?.full_name && post.author.full_name !== "Business") ? post.author.full_name : business.name,
                      username: (post.author?.username && post.author.username !== "business") ? post.author.username : (business.username || business.name.toLowerCase().replace(/\s+/g, "_")),
                      avatar_url: business.avatar_url || post.author?.avatar_url,
                      verified: isVerified,
                      is_business: true,
                      badge_type: isVerified ? "BUSINESS_VERIFIED" : null,
                      business_id: business.id,
                    },
                  };
                  return <PostCard key={post.id} post={enhancedPost} />;
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab Content: About */}
        {activeTab === "about" && (
          <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Building2 size={18} className="text-amber-500" />
              <span>Entity Details &amp; Registration</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Business Display Name</span>
                <p className="font-bold text-slate-900 text-sm">{business.name}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Legal Business Name</span>
                <p className="font-bold text-slate-900 text-sm">{business.legal_name}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Category / Industry</span>
                <p className="font-semibold text-slate-800">{business.business_category || "General Pet Business"}</p>
              </div>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Location</span>
                <p className="font-semibold text-slate-800">
                  {business.city ? `${business.city}, ` : ""}{business.state ? `${business.state}, ` : ""}{business.country_code || "IN"}
                </p>
              </div>
            </div>

            {business.verification?.verified && (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200/80 flex items-start gap-3 text-xs text-emerald-900">
                <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Authoritative Compliance Review Passed</p>
                  <p className="text-[11px] text-emerald-700 leading-relaxed">
                    This business has verified government-issued registration certificates, commercial activity, and tax documentation reviewed and approved by Peto Compliance Managers.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Advertising */}
        {activeTab === "ads" && (
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
              <Megaphone size={20} />
            </div>
            <h4 className="text-base font-bold text-slate-900">Peto Advertising &amp; Campaigns</h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Verified businesses can launch targeted ad campaigns, sponsor community circles, and promote pet products across Peto Social.
            </p>
            {business.canManage && (
              <Link
                to="/advertiser"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs shadow-sm hover:scale-[1.01] transition"
              >
                <span>Launch Advertiser Control Panel</span>
              </Link>
            )}
          </div>
        )}
      </main>

      {/* Edit Profile Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full max-h-[90vh] overflow-y-auto space-y-5 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Edit3 size={18} className="text-amber-500" />
                <span>Edit Business Profile</span>
              </h3>
              <button
                onClick={() => setEditOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold"
              >
                <X size={18} />
              </button>
            </div>

            {editError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                {editError}
              </div>
            )}

            <form onSubmit={handleFormSubmitCheck} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Display Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Legal Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.legal_name}
                    onChange={(e) => setEditForm({ ...editForm, legal_name: e.target.value })}
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Username / Slug
                  </label>
                  <input
                    type="text"
                    value={editForm.username}
                    onChange={(e) => setEditForm({ ...editForm, username: e.target.value })}
                    placeholder="e.g. happypaws"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Category
                  </label>
                  <input
                    type="text"
                    value={editForm.business_category}
                    onChange={(e) => setEditForm({ ...editForm, business_category: e.target.value })}
                    placeholder="e.g. Pet Food, Veterinary"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                  Description / Bio
                </label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  placeholder="Tell Peto users about your business..."
                  className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Official Website
                  </label>
                  <input
                    type="text"
                    value={editForm.website_url}
                    onChange={(e) => setEditForm({ ...editForm, website_url: e.target.value })}
                    placeholder="https://..."
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Public Email
                  </label>
                  <input
                    type="email"
                    value={editForm.public_email}
                    onChange={(e) => setEditForm({ ...editForm, public_email: e.target.value })}
                    placeholder="contact@brand.com"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Public Phone
                  </label>
                  <input
                    type="text"
                    value={editForm.public_phone}
                    onChange={(e) => setEditForm({ ...editForm, public_phone: e.target.value })}
                    placeholder="+91..."
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    City
                  </label>
                  <input
                    type="text"
                    value={editForm.city}
                    onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                    placeholder="City"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                    Country Code
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    value={editForm.country_code}
                    onChange={(e) => setEditForm({ ...editForm, country_code: e.target.value.toUpperCase() })}
                    placeholder="IN"
                    className="w-full px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-xs transition disabled:opacity-50 cursor-pointer"
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reverification Warning Modal (Requirement 11) */}
      {showReverificationModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl border border-amber-300 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-900">
                Business Verification Will Be Removed
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                You are changing core legal/trading identity information used to verify this Business.
              </p>
            </div>

            <div className="p-3.5 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900 space-y-1.5">
              <p className="font-bold">If you continue:</p>
              <ul className="list-disc list-inside space-y-1 text-[11px] text-amber-800">
                <li>The yellow verification badge will be removed immediately.</li>
                <li>The Business identity will require reverification.</li>
                <li>An authorized Business manager must submit a new verification request.</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowReverificationModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeSaveEdit}
                disabled={savingEdit}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow-sm transition disabled:opacity-50 cursor-pointer"
              >
                {savingEdit ? "Updating..." : "Continue & Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessProfilePage;
