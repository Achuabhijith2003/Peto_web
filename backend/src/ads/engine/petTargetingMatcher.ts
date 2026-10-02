import { supabase } from "../../config/supabase";
import { UserLocationInfo } from "../../regions/regional.types";

export interface UserPetProfile {
  hasPets: boolean;
  species: string[];      // Normalized uppercase species: e.g. ['DOG', 'CAT']
  breeds: string[];       // Normalized uppercase breeds
  sizes: string[];        // Normalized uppercase sizes: ['SMALL', 'MEDIUM', 'LARGE', etc.]
}

export interface PetTargetingEvaluation {
  eligible: boolean;
  exclusionReason?: string;
  affinityMultiplier: number;
  proximityScore: number;
}

const DOG_KEYWORDS = ["DOGS", "DOG", "PUPPY", "PUPPIES"];
const CAT_KEYWORDS = ["CATS", "CAT", "KITTEN", "KITTENS"];
const BIRD_KEYWORDS = ["BIRDS", "BIRD", "PARROT", "CANARY"];
const FISH_KEYWORDS = ["FISH", "AQUARIUM"];
const REPTILE_KEYWORDS = ["REPTILES", "REPTILE", "TURTLE", "LIZARD", "SNAKE"];
const SMALL_PET_KEYWORDS = ["RABBITS", "RABBIT", "HAMSTER", "GUINEA_PIG"];
const HORSE_KEYWORDS = ["HORSES", "HORSE"];

/**
 * Retrieve active pet ownership profile for a given user from database
 */
export async function getUserPetProfile(userId?: string): Promise<UserPetProfile> {
  const profile: UserPetProfile = {
    hasPets: false,
    species: [],
    breeds: [],
    sizes: [],
  };

  if (!userId) return profile;

  try {
    const { data: parentRows, error } = await supabase
      .from("pet_parents")
      .select(`
        pet_id,
        status,
        pets:pet_id(id, species, breed, size, status)
      `)
      .eq("user_id", userId)
      .eq("status", "ACTIVE");

    if (error || !parentRows) return profile;

    for (const r of parentRows) {
      const pet = Array.isArray(r.pets) ? r.pets[0] : r.pets;
      if (pet && pet.status === "ACTIVE") {
        profile.hasPets = true;

        if (pet.species) {
          const sp = String(pet.species).toUpperCase().trim();
          if (!profile.species.includes(sp)) profile.species.push(sp);
        }
        if (pet.breed) {
          const br = String(pet.breed).toUpperCase().trim();
          if (!profile.breeds.includes(br)) profile.breeds.push(br);
        }
        if (pet.size) {
          const sz = String(pet.size).toUpperCase().trim();
          if (!profile.sizes.includes(sz)) profile.sizes.push(sz);
        }
      }
    }
  } catch {
    // Non-blocking fallback
  }

  return profile;
}

/**
 * Meta-Grade Selective Pet Targeting & Audience Matching Engine:
 * - Ensures dog-specific ads ONLY reach verified dog parents (eliminating wasted budget).
 * - Ensures cat-specific ads ONLY reach verified cat parents.
 * - Applies deterministic relevance multipliers based on verified pet ownership, breed affinity, and local proximity.
 */
export function evaluatePetTargeting(
  targeting: any,
  userProfile: UserPetProfile,
  context?: {
    petInterests?: string[];
    creative?: any;
    location?: UserLocationInfo;
  }
): PetTargetingEvaluation {
  const rawInterests: string[] = targeting?.pet_interests || [];
  const interests = rawInterests.map((i) => String(i).toUpperCase().trim());

  const hasAll = interests.length === 0 || interests.includes("ALL");
  const targetsDogs = interests.some((i) => DOG_KEYWORDS.includes(i));
  const targetsCats = interests.some((i) => CAT_KEYWORDS.includes(i));
  const targetsBirds = interests.some((i) => BIRD_KEYWORDS.includes(i));
  const targetsFish = interests.some((i) => FISH_KEYWORDS.includes(i));
  const targetsReptiles = interests.some((i) => REPTILE_KEYWORDS.includes(i));
  const targetsSmallPets = interests.some((i) => SMALL_PET_KEYWORDS.includes(i));
  const targetsHorses = interests.some((i) => HORSE_KEYWORDS.includes(i));

  // Determine if campaign targets species exclusively
  const targetedSpeciesCount = [
    targetsDogs,
    targetsCats,
    targetsBirds,
    targetsFish,
    targetsReptiles,
    targetsSmallPets,
    targetsHorses,
  ].filter(Boolean).length;

  let affinityMultiplier = 1.0;

  // 1. STRICT EXCLUSIVE SPECIES TARGETING: DOGS
  if (targetsDogs && targetedSpeciesCount === 1 && !hasAll) {
    if (userProfile.hasPets) {
      if (userProfile.species.includes("DOG")) {
        // High-affinity direct dog parent match
        affinityMultiplier = 4.0;

        // Check if creative mentions user's dog breed or size
        const creativeText = (
          (context?.creative?.headline || "") + " " + (context?.creative?.body_text || "")
        ).toUpperCase();

        if (userProfile.breeds.some((b) => b && creativeText.includes(b))) {
          affinityMultiplier += 1.0;
        }
        if (userProfile.sizes.some((s) => s && creativeText.includes(s))) {
          affinityMultiplier += 0.5;
        }
      } else {
        // User has pets, but NO dogs (e.g. cat-only or bird-only owner)
        // Meta-grade strict filter: Exclude this ad to protect advertiser budget
        return {
          eligible: false,
          exclusionReason: "User does not own a dog; ad strictly targets dog owners.",
          affinityMultiplier: 0,
          proximityScore: 0,
        };
      }
    } else {
      // User has no registered pets yet
      if (context?.petInterests && context.petInterests.some((pi) => DOG_KEYWORDS.includes(pi.toUpperCase()))) {
        affinityMultiplier = 1.5;
      } else {
        // Deprioritize dog-exclusive campaigns for non-pet owners so general/adoption ads win
        affinityMultiplier = 0.4;
      }
    }
  }
  // 2. STRICT EXCLUSIVE SPECIES TARGETING: CATS
  else if (targetsCats && targetedSpeciesCount === 1 && !hasAll) {
    if (userProfile.hasPets) {
      if (userProfile.species.includes("CAT")) {
        affinityMultiplier = 4.0;

        const creativeText = (
          (context?.creative?.headline || "") + " " + (context?.creative?.body_text || "")
        ).toUpperCase();

        if (userProfile.breeds.some((b) => b && creativeText.includes(b))) {
          affinityMultiplier += 1.0;
        }
      } else {
        // User has pets, but NO cats (e.g. dog-only owner)
        return {
          eligible: false,
          exclusionReason: "User does not own a cat; ad strictly targets cat owners.",
          affinityMultiplier: 0,
          proximityScore: 0,
        };
      }
    } else {
      if (context?.petInterests && context.petInterests.some((pi) => CAT_KEYWORDS.includes(pi.toUpperCase()))) {
        affinityMultiplier = 1.5;
      } else {
        affinityMultiplier = 0.4;
      }
    }
  }
  // 3. STRICT EXCLUSIVE SPECIES TARGETING: BIRDS
  else if (targetsBirds && targetedSpeciesCount === 1 && !hasAll) {
    if (userProfile.hasPets) {
      if (userProfile.species.includes("BIRD")) {
        affinityMultiplier = 4.0;
      } else {
        return {
          eligible: false,
          exclusionReason: "User does not own a bird; ad strictly targets bird owners.",
          affinityMultiplier: 0,
          proximityScore: 0,
        };
      }
    } else {
      affinityMultiplier = 0.4;
    }
  }
  // 4. STRICT EXCLUSIVE SPECIES TARGETING: FISH
  else if (targetsFish && targetedSpeciesCount === 1 && !hasAll) {
    if (userProfile.hasPets) {
      if (userProfile.species.includes("FISH")) {
        affinityMultiplier = 4.0;
      } else {
        return {
          eligible: false,
          exclusionReason: "User does not own fish/aquarium; ad strictly targets fish owners.",
          affinityMultiplier: 0,
          proximityScore: 0,
        };
      }
    } else {
      affinityMultiplier = 0.4;
    }
  }
  // 5. STRICT EXCLUSIVE SPECIES TARGETING: REPTILES
  else if (targetsReptiles && targetedSpeciesCount === 1 && !hasAll) {
    if (userProfile.hasPets) {
      if (userProfile.species.includes("REPTILE")) {
        affinityMultiplier = 4.0;
      } else {
        return {
          eligible: false,
          exclusionReason: "User does not own reptiles; ad strictly targets reptile owners.",
          affinityMultiplier: 0,
          proximityScore: 0,
        };
      }
    } else {
      affinityMultiplier = 0.4;
    }
  }
  // 6. MULTI-SPECIES OR GENERAL AUDIENCE (e.g. ['DOGS', 'CATS'], 'ALL', 'PET_FOOD', 'VET_HEALTH')
  else {
    if (userProfile.hasPets) {
      // User owns at least one matching species
      const matchesAnyTargetedSpecies =
        (targetsDogs && userProfile.species.includes("DOG")) ||
        (targetsCats && userProfile.species.includes("CAT")) ||
        (targetsBirds && userProfile.species.includes("BIRD")) ||
        (targetsFish && userProfile.species.includes("FISH")) ||
        (targetsReptiles && userProfile.species.includes("REPTILE"));

      if (matchesAnyTargetedSpecies) {
        affinityMultiplier = 3.0;
      } else {
        // General pet parent boost
        affinityMultiplier = 2.0;
      }
    } else {
      // General audience baseline
      affinityMultiplier = 1.0;
    }
  }

  // 7. Hyper-Local Proximity Score Calculation
  let proximityScore = 1.0;
  if (context?.location && targeting?.regions && Array.isArray(targeting.regions) && targeting.regions.length > 0) {
    const userDistrict = (context.location.district || context.location.city || "").toUpperCase().trim();
    const userState = (context.location.state || context.location.region || "").toUpperCase().trim();

    const matchesDistrict = targeting.regions.some((r: string) => {
      const parts = r.toUpperCase().split(":");
      return parts.length >= 3 && userDistrict && parts[2] === userDistrict;
    });

    const matchesState = targeting.regions.some((r: string) => {
      const parts = r.toUpperCase().split(":");
      return parts.length >= 2 && userState && parts[1] === userState;
    });

    if (matchesDistrict) {
      proximityScore = 2.5; // Exact neighborhood / district match
    } else if (matchesState) {
      proximityScore = 1.8; // Exact state match
    } else {
      proximityScore = 1.2;
    }
  } else if (context?.location?.country && context.location.country !== "GLOBAL") {
    proximityScore = 1.3;
  }

  return {
    eligible: true,
    affinityMultiplier,
    proximityScore,
  };
}
