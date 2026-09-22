import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  PawPrint,
  Camera,
  Globe,
  UserCheck,
  Lock,
  Loader2,
  ShieldCheck,
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

export default function AddPetPage() {
  const navigate = useNavigate();

  // Basic Details
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

  // Location
  const [country, setCountry] = useState("");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");

  // Visibility
  const [visibility, setVisibility] = useState<"PUBLIC" | "CONNECTIONS" | "PRIVATE">("PUBLIC");

  // Photos (Only Profile Photo needed)
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [profilePreview, setProfilePreview] = useState<string | null>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

      // Upload Profile Photo if selected
      if (profileFile) {
        const formData = new FormData();
        formData.append("media", profileFile);
        const res = await api.post("/media/upload", formData);
        const item = Array.isArray(res.data?.data) ? res.data.data[0] : res.data?.data;
        if (item?.id) {
          profile_media_id = item.id;
        }
      }

      // Create Pet
      const petPayload = {
        name: name.trim(),
        species,
        species_name: species === "OTHER" ? speciesName.trim() : undefined,
        breed: breed.trim() || undefined,
        sex: sex || undefined,
        date_of_birth: dateOfBirth || undefined,
        approximate_age_months: approxMonths ? parseInt(approxMonths, 10) : undefined,
        size: size || undefined,
        color: color.trim() || undefined,
        bio: bio.trim() || undefined,
        country: country.trim() || undefined,
        state: state.trim() || undefined,
        city: city.trim() || undefined,
        visibility,
        profile_media_id,
      };

      const createRes = await api.post("/pets", petPayload);

      if (createRes.data?.success && createRes.data?.data?.id) {
        navigate(`/pets/${createRes.data.data.id}`);
      } else {
        navigate("/profile");
      }
    } catch (err: any) {
      console.error("Failed to create pet:", err);
      setError(err.response?.data?.message || "Failed to add pet. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-4 py-3 sm:px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium text-sm transition-colors"
          >
            <ArrowLeft size={18} />
            <span>Cancel</span>
          </button>
          <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
            <PawPrint size={16} className="text-amber-500" />
            <span>Add a New Pet</span>
          </div>
          <div className="w-16"></div>
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
                title="Upload pet photo"
              >
                <Camera size={16} />
              </button>
            </div>
            <div className="text-center sm:text-left space-y-1">
              <h2 className="font-bold text-base text-slate-900">Pet Profile Photo</h2>
              <p className="text-xs text-slate-500 max-w-sm">
                Upload your companion's avatar photo. This will be displayed on their showcase badge and profile across Peto.
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

          {/* Section 1: Identity */}
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
                    placeholder="Specify species (e.g. Hedgehog, Ferret)..."
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
                  placeholder="e.g. 24 (if exact DOB unknown)"
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
                  placeholder="e.g. Golden, Tricolor, White & Tan..."
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
                placeholder="Tell us about your pet's habits, favorite toys, quirks, or story..."
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
                  placeholder="Country"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">State / Province</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="State"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="City"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Visibility & Privacy */}
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
                  description: "Anyone in the community can view your pet's showcase profile and photos.",
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
                  description: "Only authorized pet parents and co-parents can view this profile.",
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

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
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
                  <span>Adding Pet...</span>
                </>
              ) : (
                <>
                  <PawPrint size={16} />
                  <span>Complete & Add Pet</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
