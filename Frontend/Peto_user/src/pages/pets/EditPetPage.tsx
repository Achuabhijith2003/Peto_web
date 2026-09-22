import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  PawPrint,
  Camera,
  Globe,
  UserCheck,
  Lock,
  Loader2,
  Trash2,
  AlertTriangle,
  ShieldCheck
} from "lucide-react";
import api from "../../utils/api";

const SPECIES_OPTIONS = [
  { value: "DOG", label: "Dog", emoji: "🐶" },
  { value: "CAT", label: "Cat", emoji: "🐱" },
  { value: "BIRD", label: "Bird", emoji: "🦜" },
  { value: "RABBIT", label: "Rabbit", emoji: "🐰" },
  { value: "FISH", label: "Fish", emoji: "🐠" },
  { value: "HAMSTER", label: "Hamster", emoji: "🐹" },
  { value: "HORSE", label: "Horse", emoji: "🐴" },
  { value: "REPTILE", label: "Reptile", emoji: "🦎" },
  { value: "OTHER", label: "Other", emoji: "🐾" },
];

export default function EditPetPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Form State
  const [name, setName] = useState("");
  const [species, setSpecies] = useState("DOG");
  const [speciesName, setSpeciesName] = useState("");
  const [breed, setBreed] = useState("");
  const [sex, setSex] = useState<"MALE" | "FEMALE" | "UNKNOWN">("UNKNOWN");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [approxMonths, setApproxMonths] = useState<string>("");
  const [size, setSize] = useState<"SMALL" | "MEDIUM" | "LARGE" | "EXTRA_LARGE" | "">("");
  const [color, setColor] = useState("");
  const [bio, setBio] = useState("");

  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");

  const [visibility, setVisibility] = useState<"PUBLIC" | "CONNECTIONS" | "PRIVATE">("PUBLIC");

  // Photos (Only Profile Photo needed)
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadPet() {
      if (!id) return;
      try {
        setLoadingInitial(true);
        const res = await api.get(`/pets/${id}`);
        if (res.data?.success && res.data?.data) {
          const p = res.data.data;
          setName(p.name || "");
          setSpecies(p.species || "DOG");
          setSpeciesName(p.species_name || "");
          setBreed(p.breed || "");
          setSex(p.sex || "UNKNOWN");
          setDateOfBirth(p.date_of_birth ? p.date_of_birth.split("T")[0] : "");
          setApproxMonths(p.approximate_age_months ? String(p.approximate_age_months) : "");
          setSize(p.size || "");
          setColor(p.color || "");
          setBio(p.bio || "");
          setCountry(p.country || "");
          setState(p.state || "");
          setCity(p.city || "");
          setVisibility(p.visibility || "PUBLIC");
          setProfilePreview(p.profile_photo_url || null);

          // Check if viewer has edit permission
          if (p.viewer_permissions && !p.viewer_permissions.can_edit) {
            setError("You do not have permission to edit this pet profile.");
          }
        }
      } catch (err: any) {
        console.error("Failed to fetch pet for edit:", err);
        setError(err.response?.data?.message || "Failed to load pet details");
      } finally {
        setLoadingInitial(false);
      }
    }
    loadPet();
  }, [id]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileFile(file);
      setProfilePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your pet's name.");
      return;
    }
    if (species === "OTHER" && !speciesName.trim()) {
      setError("Please specify the species name.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      let profile_media_id: string | undefined;

      // Upload new profile photo if selected
      if (profileFile) {
        const formData = new FormData();
        formData.append("media", profileFile);
        const res = await api.post("/media/upload", formData);
        const item = Array.isArray(res.data?.data) ? res.data.data[0] : res.data?.data;
        if (item?.id) {
          profile_media_id = item.id;
        }
      }

      const updatePayload: Record<string, any> = {
        name: name.trim(),
        species,
        species_name: species === "OTHER" ? speciesName.trim() : undefined,
        breed: breed.trim() || undefined,
        sex: sex || undefined,
        date_of_birth: dateOfBirth || null,
        approximate_age_months: approxMonths ? parseInt(approxMonths, 10) : null,
        size: size || undefined,
        color: color.trim() || undefined,
        bio: bio.trim() || undefined,
        country: country.trim() || undefined,
        state: state.trim() || undefined,
        city: city.trim() || undefined,
        visibility,
      };

      if (profile_media_id) updatePayload.profile_media_id = profile_media_id;

      await api.patch(`/pets/${id}`, updatePayload);
      navigate(`/pets/${id}`);
    } catch (err: any) {
      console.error("Failed to update pet:", err);
      setError(err.response?.data?.message || "Failed to update pet profile.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePet = async () => {
    if (!id) return;
    try {
      setDeleting(true);
      await api.delete(`/pets/${id}`);
      navigate("/profile");
    } catch (err: any) {
      console.error("Failed to delete pet:", err);
      alert(err.response?.data?.message || "Failed to delete pet");
      setDeleting(false);
    }
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-sm font-medium text-slate-500">Loading pet details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 sm:px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(`/pets/${id}`)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium text-sm transition-colors"
          >
            <ArrowLeft size={18} />
            <span>Cancel</span>
          </button>
          <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
            <PawPrint size={16} className="text-amber-500" />
            <span>Edit {name || "Pet"}</span>
          </div>
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="text-rose-600 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
            title="Delete Pet"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
              {error}
            </div>
          )}

          {/* Pet Profile Photo (No cover photo) */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm flex flex-col sm:flex-row items-center gap-6">
            <div className="relative">
              <div className="w-28 h-28 rounded-3xl bg-amber-50/70 border-2 border-dashed border-amber-200 overflow-hidden flex items-center justify-center shadow-xs">
                {profilePreview ? (
                  <img src={profilePreview} alt="Profile preview" className="w-full h-full object-cover" />
                ) : (
                  <PawPrint className="w-12 h-12 text-amber-500/40" />
                )}
              </div>
              <input
                type="file"
                ref={profileInputRef}
                accept="image/*"
                onChange={handleProfileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => profileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-9 h-9 rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-md flex items-center justify-center transition-transform hover:scale-105"
                title="Change pet photo"
              >
                <Camera size={16} />
              </button>
            </div>
            <div className="text-center sm:text-left space-y-1">
              <h2 className="font-bold text-base text-slate-900">Pet Profile Photo</h2>
              <p className="text-xs text-slate-500 max-w-sm">
                Update your companion's avatar photo. This will be displayed on their showcase badge and profile across Peto.
              </p>
              <div className="pt-2 flex items-center justify-center sm:justify-start gap-2">
                <button
                  type="button"
                  onClick={() => profileInputRef.current?.click()}
                  className="px-3.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-semibold hover:bg-amber-100 transition-colors"
                >
                  {profilePreview ? "Change Photo" : "Upload Photo"}
                </button>
                {profilePreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfileFile(null);
                      setProfilePreview(null);
                    }}
                    className="px-3 py-1.5 rounded-xl text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Section 1: Basic Details */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-5">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
              <span>Basic Information</span>
              <span className="text-amber-500">*</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Pet Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Bella, Bruno, Milo..."
                className="w-full px-4 py-3 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all font-medium"
              />
            </div>

            {/* Species Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Species *
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {SPECIES_OPTIONS.map((opt) => (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => setSpecies(opt.value)}
                    className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1 ${
                      species === opt.value
                        ? "bg-amber-500/10 border-amber-500 text-amber-900 shadow-sm"
                        : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                    }`}
                  >
                    <span className="text-2xl">{opt.emoji}</span>
                    <span className="text-xs font-semibold">{opt.label}</span>
                  </button>
                ))}
              </div>

              {species === "OTHER" && (
                <div className="mt-3">
                  <input
                    type="text"
                    required
                    value={speciesName}
                    onChange={(e) => setSpeciesName(e.target.value)}
                    placeholder="Specify species..."
                    className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                  />
                </div>
              )}
            </div>

            {/* Breed & Sex */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Breed
                </label>
                <input
                  type="text"
                  value={breed}
                  onChange={(e) => setBreed(e.target.value)}
                  placeholder="e.g. Golden Retriever, Persian..."
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Sex
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "MALE", label: "♂ Male" },
                    { value: "FEMALE", label: "♀ Female" },
                    { value: "UNKNOWN", label: "Unknown" },
                  ].map((s) => (
                    <button
                      type="button"
                      key={s.value}
                      onClick={() => setSex(s.value as any)}
                      className={`py-2 text-xs font-semibold rounded-xl border transition-all ${
                        sex === s.value
                          ? "bg-amber-500 text-white border-amber-500"
                          : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Age or Date of Birth */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Approximate Age (Months)
                </label>
                <input
                  type="number"
                  min="0"
                  max="400"
                  value={approxMonths}
                  onChange={(e) => setApproxMonths(e.target.value)}
                  placeholder="e.g. 24"
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
              </div>
            </div>

            {/* Size & Color */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Size
                </label>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value as any)}
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all bg-white"
                >
                  <option value="">Select size category</option>
                  <option value="SMALL">Small (under 10 kg / 22 lbs)</option>
                  <option value="MEDIUM">Medium (10 - 25 kg / 22 - 55 lbs)</option>
                  <option value="LARGE">Large (25 - 45 kg / 55 - 100 lbs)</option>
                  <option value="EXTRA_LARGE">Extra Large (45+ kg / 100+ lbs)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Color / Markings
                </label>
                <input
                  type="text"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="e.g. Golden, Tricolor..."
                  className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
                />
              </div>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Bio & Personality
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about your pet..."
                className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all"
              />
            </div>
          </div>

          {/* Section 2: Location */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-3">
              Location
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Country</label>
                <input
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">State / Province</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Visibility */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <ShieldCheck size={18} className="text-amber-600" />
              <h3 className="font-bold text-sm text-slate-900">Showcase Visibility</h3>
            </div>

            <div className="space-y-3">
              {[
                {
                  id: "PUBLIC",
                  title: "Public Showcase",
                  description: "Anyone in the community can view your pet's showcase profile.",
                  icon: Globe,
                },
                {
                  id: "CONNECTIONS",
                  title: "Connections Only",
                  description: "Only users you follow or who follow you can view this pet.",
                  icon: UserCheck,
                },
                {
                  id: "PRIVATE",
                  title: "Private (Pet Parents Only)",
                  description: "Only authorized pet parents can view this profile.",
                  icon: Lock,
                },
              ].map((item) => {
                const Icon = item.icon;
                const isSelected = visibility === item.id;
                return (
                  <label
                    key={item.id}
                    onClick={() => setVisibility(item.id as any)}
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-amber-500/10 border-amber-500 text-slate-900"
                        : "bg-white border-slate-200 hover:bg-slate-50 text-slate-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="visibility"
                      value={item.id}
                      checked={isSelected}
                      onChange={() => setVisibility(item.id as any)}
                      className="mt-1 text-amber-500 focus:ring-amber-500"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-slate-900">
                        <Icon size={14} className={isSelected ? "text-amber-600" : "text-slate-400"} />
                        <span>{item.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{item.description}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-rose-600 hover:bg-rose-50 text-xs font-bold transition-colors"
            >
              <Trash2 size={15} />
              <span>Delete Pet</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => navigate(`/pets/${id}`)}
                className="px-6 py-3 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold shadow-md transition-all disabled:opacity-50 hover:shadow-lg"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <PawPrint size={16} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-100 text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <AlertTriangle size={24} />
            </div>
            <h3 className="font-bold text-slate-900 text-base">Remove Pet Profile?</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to remove <strong>{name}</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                disabled={deleting}
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={deleting}
                onClick={handleDeletePet}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
              >
                {deleting ? "Removing..." : "Yes, Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
