import React from "react";
import { Link } from "react-router-dom";
import { MapPin, Lock, Users } from "lucide-react";

export interface PetCardData {
  id: string;
  name: string;
  species: string;
  species_name?: string | null;
  breed?: string | null;
  sex?: string;
  date_of_birth?: string | null;
  is_date_of_birth_approximate?: boolean;
  profile_visibility?: "PUBLIC" | "CONNECTIONS" | "PRIVATE";
  profile_media_url?: string | null;
  status?: string;
  city?: string | null;
  country?: string | null;
  is_parent?: boolean;
}

const SPECIES_EMOJIS: Record<string, string> = {
  DOG: "🐕",
  CAT: "🐱",
  BIRD: "🦜",
  RABBIT: "🐰",
  HAMSTER: "🐹",
  GUINEA_PIG: "🐹",
  FISH: "🐠",
  REPTILE: "🦎",
  HORSE: "🐴",
  OTHER: "🐾",
};

export const PetCard: React.FC<{ pet: PetCardData; showParentBadge?: boolean }> = ({
  pet,
  showParentBadge = false,
}) => {
  const speciesStr = pet?.species ? String(pet.species) : "OTHER";
  const emoji = SPECIES_EMOJIS[speciesStr.toUpperCase()] || "🐾";
  const displaySpecies =
    pet?.species === "OTHER" && pet?.species_name
      ? pet.species_name
      : pet?.species
      ? String(pet.species).toLowerCase()
      : "companion";

  const profileUrl = pet?.profile_media_url || (pet as any)?.profile_photo_url || (pet as any)?.avatar_url;
  const visibility = (pet?.profile_visibility || (pet as any)?.visibility || "PUBLIC").toUpperCase();

  // Calculate approximate age if date_of_birth exists
  let ageText = "";
  if (pet?.date_of_birth) {
    const dob = new Date(pet.date_of_birth);
    const now = new Date();
    const diffMonths = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
    if (diffMonths < 12) {
      ageText = `${Math.max(1, diffMonths)} mo${pet.is_date_of_birth_approximate ? " (approx)" : ""}`;
    } else {
      const years = Math.floor(diffMonths / 12);
      ageText = `${years} yr${years > 1 ? "s" : ""}${pet.is_date_of_birth_approximate ? " (approx)" : ""}`;
    }
  }

  return (
    <Link
      to={`/pets/${pet.id}`}
      className="group bg-white rounded-3xl border border-slate-200/80 hover:border-amber-400/80 shadow-xs hover:shadow-md transition-all duration-200 p-5 flex flex-col justify-between relative overflow-hidden"
    >
      {/* Top Row: Avatar & Badges */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="relative">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 border-2 border-amber-200/60 overflow-hidden flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-200">
            {profileUrl ? (
              <img
                src={profileUrl}
                alt={pet.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl">{emoji}</span>
            )}
          </div>
          <span className="absolute -bottom-1 -right-1 text-xs bg-white rounded-full p-0.5 shadow-xs border border-slate-100">
            {emoji}
          </span>
        </div>

        {/* Badges on Top Right */}
        <div className="flex items-center gap-1.5">
          {showParentBadge && pet.is_parent && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              My Pet
            </span>
          )}
          {visibility === "PRIVATE" && (
            <span
              title="Private"
              className="p-1 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200"
            >
              <Lock size={12} />
            </span>
          )}
          {visibility === "CONNECTIONS" && (
            <span
              title="Connections Only"
              className="p-1 rounded-lg bg-blue-50 text-blue-600"
            >
              <Users size={12} />
            </span>
          )}
          {pet.status && pet.status !== "ACTIVE" && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
              {pet.status}
            </span>
          )}
        </div>
      </div>

      {/* Pet Name & Breed Info */}
      <div className="space-y-1">
        <h3 className="font-bold text-base text-slate-900 group-hover:text-amber-600 transition-colors truncate">
          {pet.name}
        </h3>

        <p className="text-xs text-slate-500 capitalize truncate">
          {pet.breed || displaySpecies || "Pet Companion"}
        </p>

        {/* Key tags: Age, Sex, Location */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2">
          {pet.sex && pet.sex !== "UNKNOWN" && (
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-600">
              {pet.sex === "MALE" ? "♂ Male" : "♀ Female"}
            </span>
          )}
          {ageText && (
            <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-600">
              {ageText}
            </span>
          )}
          {pet.city && (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-slate-400 truncate">
              <MapPin size={10} className="shrink-0" />
              <span className="truncate">{pet.city}</span>
            </span>
          )}
        </div>
      </div>
    </Link>
  );
};
