import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  Edit3,
  Users,
  Lock,
  Globe,
  UserCheck,
  Calendar,
  MapPin,
  Image as ImageIcon,
  Plus,
  Loader2,
  ShieldCheck,
  CheckCircle2,
  X,
  ChevronRight,
  Maximize2,
  Play,
  Trash2,
  Film,
} from "lucide-react";
import api from "../../utils/api";
import { useAuth } from "../../context/AuthContext";
import Navbar from "../../components/layout/Navbar";
import { PetParentModal } from "../../components/pets/PetParentModal";
import { PetProfileSkeleton } from "../../components/common/Skeleton";

interface PetDetails {
  id: string;
  name: string;
  species: string;
  species_name?: string;
  breed?: string;
  sex?: string;
  date_of_birth?: string;
  approximate_age_months?: number;
  size?: string;
  color?: string;
  bio?: string;
  country?: string;
  state?: string;
  city?: string;
  visibility: "PUBLIC" | "CONNECTIONS" | "PRIVATE";
  profile_photo_url?: string;
  cover_photo_url?: string;
  parents?: Array<{
    id: string;
    user_id: string;
    relationship?: string;
    relationship_type?: string;
    is_primary: boolean;
    status: string;
    username?: string;
    full_name?: string;
    avatar_url?: string;
    verified?: boolean;
    user?: {
      id?: string;
      username?: string;
      full_name?: string;
      avatar_url?: string;
      verified?: boolean;
    };
  }>;
  media?: Array<{
    id: string;
    media_id: string;
    media_type: string;
    media_url: string;
    caption?: string;
    is_profile: boolean;
    is_cover: boolean;
  }>;
  viewer_relationship?: {
    is_parent: boolean;
    relationship_type?: string;
    is_primary?: boolean;
    permissions?: string[];
  };
  viewer_permissions?: {
    can_view: boolean;
    can_edit: boolean;
    can_upload_media: boolean;
    can_manage_parents: boolean;
    can_manage_privacy: boolean;
  };
}

const speciesEmojis: Record<string, string> = {
  DOG: "🐶",
  CAT: "🐱",
  BIRD: "🦜",
  RABBIT: "🐰",
  FISH: "🐠",
  HORSE: "🐴",
  REPTILE: "🦎",
  HAMSTER: "🐹",
  OTHER: "🐾",
};

export default function PetProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [pet, setPet] = useState<PetDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<"about" | "photos">("about");

  // Parent management modal
  const [showParentModal, setShowParentModal] = useState(false);

  // Media upload state
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  // Quick visibility change state
  const [updatingVisibility, setUpdatingVisibility] = useState(false);

  // Media viewer / lightbox state
  const [enlargedMedia, setEnlargedMedia] = useState<{ url: string; isVideo: boolean } | null>(null);

  // Invitation response state
  const [respondingInvite, setRespondingInvite] = useState(false);

  const handleRespondToInvite = async (accept: boolean) => {
    if (!id) return;
    try {
      setRespondingInvite(true);
      await api.post(`/pets/${id}/parents/respond`, { accept });
      await fetchPet();
    } catch (err: any) {
      console.error("Failed to respond to invite:", err);
      alert(err.response?.data?.message || "Failed to respond to invitation.");
    } finally {
      setRespondingInvite(false);
    }
  };

  const fetchPet = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/pets/${id}`);
      if (res.data?.success && res.data?.data) {
        setPet(res.data.data);
      } else {
        setError("Pet not found");
      }
    } catch (err: any) {
      console.error("Failed to load pet:", err);
      if (err.response?.status === 403) {
        setError("This pet's profile is private or restricted to connections only.");
      } else if (err.response?.status === 404) {
        setError("Pet profile not found.");
      } else {
        setError(err.response?.data?.message || "Failed to load pet profile.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPet();
  }, [id]);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;

    try {
      setUploadingPhoto(true);
      const formData = new FormData();
      formData.append("media", file);

      const uploadRes = await api.post("/media/upload", formData);
      const returnedItem = Array.isArray(uploadRes.data?.data)
        ? uploadRes.data.data[0]
        : uploadRes.data?.data;
      const mediaId = returnedItem?.id;

      if (mediaId) {
        await api.post(`/pets/${id}/media`, {
          media_id: mediaId,
          mediaId: mediaId,
          url: uploadRes.data?.mediaUrl,
          caption: "",
        });
        await fetchPet();
      }
    } catch (err: any) {
      console.error("Failed to upload pet media:", err);
      alert(err.response?.data?.message || "Failed to upload photo or video");
    } finally {
      setUploadingPhoto(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleDeleteMedia = async (mediaItem: any) => {
    if (!id || !window.confirm(`Are you sure you want to remove this ${mediaItem.media_type === "VIDEO" ? "video" : "photo"} from ${pet?.name}'s gallery?`)) {
      return;
    }
    try {
      const targetId = mediaItem.id || mediaItem.media_id;
      await api.delete(`/pets/${id}/media/${targetId}`);
      await fetchPet();
    } catch (err: any) {
      console.error("Failed to delete pet media:", err);
      alert(err.response?.data?.message || "Failed to remove media item.");
    }
  };

  const handleVisibilityChange = async (newVisibility: "PUBLIC" | "CONNECTIONS" | "PRIVATE") => {
    if (!pet || updatingVisibility) return;
    try {
      setUpdatingVisibility(true);
      await api.patch(`/pets/${pet.id}/visibility`, { visibility: newVisibility });
      setPet((prev) => (prev ? { ...prev, visibility: newVisibility } : null));
    } catch (err: any) {
      console.error("Failed to update visibility:", err);
      alert(err.response?.data?.message || "Failed to update visibility");
    } finally {
      setUpdatingVisibility(false);
    }
  };

  const calculateAge = () => {
    if (!pet) return null;
    if (pet.date_of_birth) {
      const birth = new Date(pet.date_of_birth);
      const now = new Date();
      let years = now.getFullYear() - birth.getFullYear();
      let months = now.getMonth() - birth.getMonth();
      if (months < 0) {
        years--;
        months += 12;
      }
      if (years > 0) {
        return `${years} yr${years > 1 ? "s" : ""}${months > 0 ? ` ${months} mo` : ""}`;
      }
      return `${Math.max(months, 1)} month${months > 1 ? "s" : ""}`;
    }
    if (pet.approximate_age_months) {
      const yrs = Math.floor(pet.approximate_age_months / 12);
      const mos = pet.approximate_age_months % 12;
      if (yrs > 0) {
        return `Approx. ${yrs} yr${yrs > 1 ? "s" : ""}${mos > 0 ? ` ${mos} mo` : ""}`;
      }
      return `Approx. ${pet.approximate_age_months} month${pet.approximate_age_months > 1 ? "s" : ""}`;
    }
    return null;
  };

  if (loading) {
    return <PetProfileSkeleton />;
  }

  if (error || !pet) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white max-w-md w-full rounded-3xl p-8 border border-slate-200/80 shadow-card text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Restricted or Unavailable</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            {error || "We couldn't retrieve this pet profile. It might be private or available to connections only."}
          </p>
          <div className="pt-2 flex gap-3 justify-center">
            <button
              onClick={() => navigate(-1)}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Go Back
            </button>
            <Link
              to="/social"
              className="px-5 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-semibold hover:bg-amber-600 transition-colors shadow-sm"
            >
              Back to Feed
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const permissions = pet.viewer_permissions || {
    can_view: true,
    can_edit: false,
    can_upload_media: false,
    can_manage_parents: false,
    can_manage_privacy: false,
  };

  const ageString = calculateAge();
  const speciesStr = pet.species ? String(pet.species) : "OTHER";
  const emoji = speciesEmojis[speciesStr.toUpperCase()] || "🐾";
  const displaySpecies = pet.species === "OTHER" && pet.species_name ? pet.species_name : (pet.species || "Pet");
  const petVisibility = ((pet.visibility || (pet as any).profile_visibility || "PUBLIC") as string).toUpperCase();
  const profilePhotoUrl = pet.profile_photo_url || (pet as any).profile_media_url || (pet as any).avatar_url;

  const pendingInviteForCurrentUser = pet.parents?.find(
    (p) => p.user_id === user?.id && p.status === "PENDING_INVITE"
  );

  return (
    <div className="min-h-screen bg-slate-50/60 pb-20">
      {/* Global Application Header */}
      <Navbar />

      {/* Top Sticky Bar */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 sm:px-6">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium text-sm transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>

          <div className="flex items-center gap-2">
            {/* Visibility Tag */}
            <div
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                petVisibility === "PUBLIC"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200/70"
                  : petVisibility === "CONNECTIONS"
                  ? "bg-blue-50 text-blue-700 border-blue-200/70"
                  : "bg-purple-50 text-purple-700 border-purple-200/70"
              }`}
            >
              {petVisibility === "PUBLIC" && <Globe size={12} />}
              {petVisibility === "CONNECTIONS" && <UserCheck size={12} />}
              {petVisibility === "PRIVATE" && <Lock size={12} />}
              <span className="capitalize">{petVisibility.toLowerCase()}</span>
            </div>

            {/* Parent-Only Action: Edit Pet */}
            {permissions.can_edit && (
              <button
                onClick={() => navigate(`/pets/${pet.id}/edit`)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm cursor-pointer"
              >
                <Edit3 size={13} />
                <span>Edit Pet</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-4 space-y-6">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
          <Link to="/" className="hover:text-amber-600 transition-colors">Home</Link>
          <ChevronRight size={12} className="text-slate-400" />
          <Link to="/social" className="hover:text-amber-600 transition-colors">Social Feed</Link>
          <ChevronRight size={12} className="text-slate-400" />
          <Link to="/profile" className="hover:text-amber-600 transition-colors">Pets Showcase</Link>
          <ChevronRight size={12} className="text-slate-400" />
          <span className="text-slate-900 font-bold">{pet.name}</span>
        </div>

        {/* Pending Invitation Banner */}
        {pendingInviteForCurrentUser && (
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white p-4 sm:p-5 rounded-3xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center font-bold text-2xl shrink-0">
                🐾
              </div>
              <div>
                <h4 className="font-bold text-sm sm:text-base leading-tight">
                  You have been invited to co-parent {pet.name}!
                </h4>
                <p className="text-xs text-white/90 mt-0.5">
                  Role:{" "}
                  <span className="font-bold capitalize">
                    {(pendingInviteForCurrentUser.relationship_type ||
                      pendingInviteForCurrentUser.relationship ||
                      "CO_OWNER")
                      .replace(/_/g, " ")
                      .toLowerCase()}
                  </span>
                  . Join {pet.name}'s family circle to help manage, upload photos, and post about them.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 self-end sm:self-auto">
              <button
                disabled={respondingInvite}
                onClick={() => handleRespondToInvite(true)}
                className="px-4 py-2 rounded-xl bg-white text-emerald-700 font-bold text-xs hover:bg-emerald-50 transition shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {respondingInvite ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={14} />}
                <span>Accept Invitation</span>
              </button>
              <button
                disabled={respondingInvite}
                onClick={() => handleRespondToInvite(false)}
                className="px-3.5 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-semibold text-xs transition cursor-pointer disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </div>
        )}

        {/* Profile Header Card (Clean Profile Avatar presentation, NO cover banner) */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-sm space-y-6">
          {/* Header Row: Avatar, Identity, and Action Buttons */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 pb-6 border-b border-slate-100">
            {/* Avatar & Quick Title */}
            <div className="flex items-center gap-5">
              <div
                onClick={() => profilePhotoUrl && setEnlargedMedia({ url: profilePhotoUrl, isVideo: false })}
                className={`relative inline-block shrink-0 ${profilePhotoUrl ? "cursor-pointer group" : ""}`}
                title={profilePhotoUrl ? "Click to enlarge photo" : undefined}
              >
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl bg-amber-50 border-2 border-amber-200/60 overflow-hidden flex items-center justify-center shadow-xs group-hover:border-amber-400 transition-all">
                  {profilePhotoUrl ? (
                    <img
                      src={profilePhotoUrl}
                      alt={pet.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                    />
                  ) : (
                    <span className="text-4xl sm:text-5xl">{emoji}</span>
                  )}
                </div>
                {profilePhotoUrl && (
                  <div className="absolute top-1.5 right-1.5 w-6 h-6 rounded-lg bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 size={12} />
                  </div>
                )}
                <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white border border-slate-100 shadow-xs flex items-center justify-center text-sm sm:text-base">
                  {emoji}
                </div>
              </div>

              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {pet.name}
                  </h1>
                  <span className="px-2.5 py-0.5 rounded-xl bg-amber-50 text-amber-800 font-bold text-xs border border-amber-200/60">
                    {displaySpecies}
                  </span>
                  {pet.breed && (
                    <span className="px-2.5 py-0.5 rounded-xl bg-slate-100 text-slate-700 font-semibold text-xs">
                      {pet.breed}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
                  {ageString && <span>{ageString}</span>}
                  {ageString && (pet.city || pet.country) && <span>•</span>}
                  {(pet.city || pet.country) && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin size={12} className="text-slate-400" />
                      {[pet.city, pet.state, pet.country].filter(Boolean).join(", ")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons for Authorized Pet Parents */}
            <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-center justify-end">
              {permissions.can_manage_parents && (
                <button
                  onClick={() => setShowParentModal(true)}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
                >
                  <Users size={14} />
                  <span>Pet Parents</span>
                </button>
              )}

              {permissions.can_manage_privacy && (
                <div className="relative inline-block">
                  <select
                    value={pet.visibility}
                    disabled={updatingVisibility}
                    onChange={(e) =>
                      handleVisibilityChange(e.target.value as "PUBLIC" | "CONNECTIONS" | "PRIVATE")
                    }
                    className="text-xs font-semibold px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl cursor-pointer border-none outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                  >
                    <option value="PUBLIC">🌐 Public</option>
                    <option value="CONNECTIONS">👥 Connections Only</option>
                    <option value="PRIVATE">🔒 Private</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Pet Bio & Attributes */}
          <div className="space-y-4">
            {pet.bio && (
              <p className="text-slate-700 text-sm leading-relaxed max-w-2xl whitespace-pre-line">
                {pet.bio}
              </p>
            )}

              {/* Badges / Attribute Chips */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs font-medium text-slate-600">
                {ageString && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100">
                    <Calendar size={13} className="text-slate-500" />
                    <span>{ageString}</span>
                  </div>
                )}

                {pet.sex && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100">
                    <span>
                      {pet.sex.toUpperCase() === "MALE"
                        ? "♂ Male"
                        : pet.sex.toUpperCase() === "FEMALE"
                        ? "♀ Female"
                        : pet.sex}
                    </span>
                  </div>
                )}

                {pet.size && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 capitalize">
                    <span>Size: {String(pet.size).toLowerCase()}</span>
                  </div>
                )}

                {pet.color && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 capitalize">
                    <span>Color: {pet.color}</span>
                  </div>
                )}

                {(pet.city || pet.state || pet.country) && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100">
                    <MapPin size={13} className="text-slate-500" />
                    <span>{[pet.city, pet.state, pet.country].filter(Boolean).join(", ")}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Authorized Pet Parents Section */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-amber-600" />
                  <span>Pet Parents & Guardians</span>
                </h3>
              </div>

              <div className="flex flex-wrap gap-3">
                {pet.parents && pet.parents.filter((p) => p.status === "ACTIVE").length > 0 ? (
                  pet.parents
                    .filter((p) => p.status === "ACTIVE")
                    .map((parent) => {
                      const username = parent.username || parent.user?.username;
                      const fullName = parent.full_name || parent.user?.full_name || (username ? `@${username}` : "Pet Parent");
                      const avatar = parent.avatar_url || parent.user?.avatar_url;
                      const roleDisplay = (parent.relationship_type || parent.relationship || "CO_OWNER")
                        .replace(/_/g, " ");

                      return (
                        <Link
                          key={parent.id}
                          to={username ? `/profile/${username}` : `/profile/${parent.user_id}`}
                          className="group flex items-center gap-2.5 p-2 rounded-2xl bg-slate-50 hover:bg-amber-50/70 border border-slate-200/80 transition-all"
                        >
                          <div className="w-9 h-9 rounded-xl bg-white overflow-hidden border border-slate-200 shrink-0">
                            {avatar ? (
                              <img
                                src={avatar}
                                alt={username || "Parent"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center font-bold text-slate-500 text-xs">
                                {(fullName || "P")[0].toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="text-left pr-2">
                            <div className="flex items-center gap-1">
                              <span className="text-xs font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                                {fullName}
                              </span>
                              {(parent.verified || parent.user?.verified) && (
                                <CheckCircle2 size={12} className="text-amber-500 fill-amber-100" />
                              )}
                            </div>
                            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block">
                              {parent.is_primary ? "👑 Primary Parent" : roleDisplay}
                            </span>
                          </div>
                        </Link>
                      );
                    })
                ) : (
                  <p className="text-xs text-slate-400">No parent information available.</p>
                )}
              </div>
            </div>
          </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200/80 pb-1">
          <button
            onClick={() => setActiveTab("about")}
            className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-colors ${
              activeTab === "about"
                ? "bg-amber-500 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            About
          </button>
          <button
            onClick={() => setActiveTab("photos")}
            className={`px-4 py-2 text-xs sm:text-sm font-bold rounded-xl transition-colors flex items-center gap-1.5 ${
              activeTab === "photos"
                ? "bg-amber-500 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <span>Photos & Media</span>
            {pet.media && pet.media.length > 0 && (
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  activeTab === "photos" ? "bg-amber-600 text-white" : "bg-slate-200 text-slate-700"
                }`}
              >
                {pet.media.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: About */}
        {activeTab === "about" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
                Physical Attributes
              </h3>
              <dl className="grid grid-cols-2 gap-y-3 text-xs">
                <div>
                  <dt className="text-slate-400 font-medium">Species</dt>
                  <dd className="font-bold text-slate-800 capitalize mt-0.5">{displaySpecies}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Breed</dt>
                  <dd className="font-bold text-slate-800 mt-0.5">{pet.breed || "Not specified"}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Sex</dt>
                  <dd className="font-bold text-slate-800 capitalize mt-0.5">{pet.sex ? String(pet.sex).toLowerCase() : "Not specified"}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Size</dt>
                  <dd className="font-bold text-slate-800 capitalize mt-0.5">{pet.size ? String(pet.size).toLowerCase() : "Not specified"}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Color</dt>
                  <dd className="font-bold text-slate-800 capitalize mt-0.5">{pet.color || "Not specified"}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Age</dt>
                  <dd className="font-bold text-slate-800 mt-0.5">{ageString || "Not specified"}</dd>
                </div>
              </dl>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-sm space-y-3">
              <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
                Location & Environment
              </h3>
              <dl className="grid grid-cols-2 gap-y-3 text-xs">
                <div>
                  <dt className="text-slate-400 font-medium">Country</dt>
                  <dd className="font-bold text-slate-800 mt-0.5">{pet.country || "Not specified"}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">State / Region</dt>
                  <dd className="font-bold text-slate-800 mt-0.5">{pet.state || "Not specified"}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">City</dt>
                  <dd className="font-bold text-slate-800 mt-0.5">{pet.city || "Not specified"}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 font-medium">Visibility Level</dt>
                  <dd className="font-bold text-slate-800 mt-0.5 capitalize">{petVisibility.toLowerCase()}</dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {/* Tab 2: Photos / Media Gallery */}
        {activeTab === "photos" && (
          <div className="space-y-4">
            {permissions.can_upload_media && (
              <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Pet Gallery</h4>
                  <p className="text-[11px] text-slate-500">Upload and showcase photos of {pet.name}</p>
                </div>
                <div>
                  <input
                    type="file"
                    ref={mediaInputRef}
                    accept="image/*"
                    onChange={handleMediaUpload}
                    className="hidden"
                  />
                  <button
                    disabled={uploadingPhoto}
                    onClick={() => mediaInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
                  >
                    {uploadingPhoto ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Plus size={14} />
                        <span>Add Photo</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {pet.media && pet.media.length > 0 ? (
              <div className="columns-2 sm:columns-3 md:columns-4 gap-3 space-y-3">
                {pet.media.map((item) => {
                  const isVideo =
                    item.media_type === "VIDEO" ||
                    /\.(mp4|mov|webm|m4v|avi|mkv)$/i.test(item.media_url);

                  return (
                    <div
                      key={item.id}
                      onClick={() => setEnlargedMedia({ url: item.media_url, isVideo })}
                      className="group relative break-inside-avoid rounded-2xl overflow-hidden bg-slate-900 border border-slate-200/80 shadow-sm cursor-pointer select-none mb-3"
                    >
                      {isVideo ? (
                        <div className="w-full relative bg-slate-950 flex items-center justify-center">
                          <video
                            src={item.media_url}
                            className="w-full h-auto max-h-[520px] object-cover group-hover:scale-[1.02] transition-transform duration-300"
                            muted
                            playsInline
                            preload="metadata"
                          />
                          {/* Centered Play Button */}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/35 transition-colors">
                            <div className="w-11 h-11 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                              <Play size={18} className="fill-slate-900 ml-0.5" />
                            </div>
                          </div>
                          {/* Video Badge */}
                          <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/65 backdrop-blur-md text-white text-[10px] font-semibold flex items-center gap-1">
                            <Film size={11} /> Video
                          </span>
                        </div>
                      ) : (
                        <div className="w-full relative">
                          <img
                            src={item.media_url}
                            alt={item.caption || pet.name}
                            className="w-full h-auto object-cover group-hover:scale-[1.02] transition-transform duration-300 block"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/25 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                            <div className="w-9 h-9 rounded-full bg-white/90 text-slate-800 flex items-center justify-center shadow-sm">
                              <Maximize2 size={15} />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Profile / Cover Tags */}
                      {item.is_profile && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-sm text-white text-[10px] font-bold">
                          Avatar
                        </span>
                      )}
                      {item.is_cover && (
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-amber-600/90 backdrop-blur-sm text-white text-[10px] font-bold">
                          Cover
                        </span>
                      )}

                      {/* Delete Action if owner/authorized */}
                      {permissions.can_edit && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteMedia(item);
                          }}
                          title="Remove media"
                          className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-red-600/90 hover:bg-red-600 text-white flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200/80 p-10 text-center space-y-2">
                <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <ImageIcon size={24} />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No photos or videos yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Photos and videos uploaded by pet parents will appear here in {pet.name}'s showcase gallery.
                </p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Pet Parents Modal */}
      {pet && showParentModal && (
        <PetParentModal
          petId={pet.id}
          petName={pet.name}
          parents={pet.parents || []}
          canManage={permissions.can_manage_parents}
          currentUserId={user?.id}
          onClose={() => setShowParentModal(false)}
          onUpdated={() => {
            fetchPet();
          }}
        />
      )}

      {/* Lightbox / Enlarged Media Modal */}
      {enlargedMedia && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setEnlargedMedia(null)}
        >
          <div
            className="relative max-w-4xl max-h-[88vh] w-full rounded-3xl overflow-hidden bg-black/90 border border-slate-700/60 shadow-2xl flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setEnlargedMedia(null)}
              className="absolute top-4 right-4 z-10 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition cursor-pointer backdrop-blur-sm shadow-md"
            >
              <X size={18} />
            </button>
            {enlargedMedia.isVideo ? (
              <video
                src={enlargedMedia.url}
                controls
                autoPlay
                playsInline
                className="w-full h-full max-h-[85vh] object-contain rounded-2xl"
              />
            ) : (
              <img
                src={enlargedMedia.url}
                alt="Pet Media"
                className="w-full h-full max-h-[85vh] object-contain rounded-2xl"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
