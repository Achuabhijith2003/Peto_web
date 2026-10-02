// Mock env vars before any imports
process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "test_key";
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "test_anon_key";

import test from "node:test";
import assert from "node:assert";
import { evaluatePetTargeting, UserPetProfile } from "../src/ads/engine/petTargetingMatcher";
import { resolveCountryFromRequest, resolveUserLocationFromRequest } from "../src/regions/regional.service";
import { Request } from "express";

test("Meta-grade targeting: Dog product ad exclusively reaches dog parents", () => {
  const dogOnlyCampaignTargeting = {
    pet_interests: ["DOGS"],
    regions: [],
  };

  const dogParentProfile: UserPetProfile = {
    hasPets: true,
    species: ["DOG"],
    breeds: ["GOLDEN RETRIEVER"],
    sizes: ["LARGE"],
  };

  const catOnlyParentProfile: UserPetProfile = {
    hasPets: true,
    species: ["CAT"],
    breeds: ["PERSIAN"],
    sizes: ["MEDIUM"],
  };

  const multiPetParentProfile: UserPetProfile = {
    hasPets: true,
    species: ["DOG", "CAT"],
    breeds: ["LABRADOR", "SIAMESE"],
    sizes: ["LARGE", "MEDIUM"],
  };

  // 1. Dog parent must receive high-affinity match (4.0x+)
  const evalForDogOwner = evaluatePetTargeting(dogOnlyCampaignTargeting, dogParentProfile);
  assert.strictEqual(evalForDogOwner.eligible, true);
  assert.ok(evalForDogOwner.affinityMultiplier >= 4.0);

  // 2. Cat-only parent MUST BE STRICTLY EXCLUDED (zero budget waste for dog advertiser)
  const evalForCatOwner = evaluatePetTargeting(dogOnlyCampaignTargeting, catOnlyParentProfile);
  assert.strictEqual(evalForCatOwner.eligible, false);
  assert.ok(evalForCatOwner.exclusionReason?.includes("dog"));

  // 3. Multi-pet parent owning both a Dog and a Cat is eligible for dog ad
  const evalForMultiPetOwner = evaluatePetTargeting(dogOnlyCampaignTargeting, multiPetParentProfile);
  assert.strictEqual(evalForMultiPetOwner.eligible, true);
  assert.ok(evalForMultiPetOwner.affinityMultiplier >= 4.0);
});

test("Meta-grade targeting: Cat product ad strictly excludes dog-only parents", () => {
  const catOnlyCampaignTargeting = {
    pet_interests: ["CATS"],
    regions: [],
  };

  const dogOnlyParentProfile: UserPetProfile = {
    hasPets: true,
    species: ["DOG"],
    breeds: ["BEAGLE"],
    sizes: ["MEDIUM"],
  };

  const catParentProfile: UserPetProfile = {
    hasPets: true,
    species: ["CAT"],
    breeds: ["MAINE COON"],
    sizes: ["LARGE"],
  };

  const evalForDogOwner = evaluatePetTargeting(catOnlyCampaignTargeting, dogOnlyParentProfile);
  assert.strictEqual(evalForDogOwner.eligible, false);
  assert.ok(evalForDogOwner.exclusionReason?.includes("cat"));

  const evalForCatOwner = evaluatePetTargeting(catOnlyCampaignTargeting, catParentProfile);
  assert.strictEqual(evalForCatOwner.eligible, true);
  assert.ok(evalForCatOwner.affinityMultiplier >= 4.0);
});

test("Meta-grade targeting: General pet care and food ads reach all pet parents", () => {
  const generalCampaignTargeting = {
    pet_interests: ["PET_FOOD", "VET_HEALTH"],
    regions: [],
  };

  const catParentProfile: UserPetProfile = {
    hasPets: true,
    species: ["CAT"],
    breeds: [],
    sizes: [],
  };

  const dogParentProfile: UserPetProfile = {
    hasPets: true,
    species: ["DOG"],
    breeds: [],
    sizes: [],
  };

  const evalCat = evaluatePetTargeting(generalCampaignTargeting, catParentProfile);
  const evalDog = evaluatePetTargeting(generalCampaignTargeting, dogParentProfile);

  assert.strictEqual(evalCat.eligible, true);
  assert.strictEqual(evalDog.eligible, true);
  assert.ok(evalCat.affinityMultiplier >= 2.0);
  assert.ok(evalDog.affinityMultiplier >= 2.0);
});

test("Meta-grade targeting: Breed affinity boost when creative mentions user's dog breed", () => {
  const dogCampaignTargeting = {
    pet_interests: ["DOGS"],
    regions: [],
  };

  const goldenRetrieverParent: UserPetProfile = {
    hasPets: true,
    species: ["DOG"],
    breeds: ["GOLDEN RETRIEVER"],
    sizes: ["LARGE"],
  };

  const creativeWithBreed = {
    headline: "Premium Nutrition for Golden Retriever Dogs",
    body_text: "Formulated specifically for large retrievers.",
  };

  const evalWithBreed = evaluatePetTargeting(dogCampaignTargeting, goldenRetrieverParent, {
    creative: creativeWithBreed,
  });

  assert.strictEqual(evalWithBreed.eligible, true);
  // Base 4.0 + 1.0 breed match + 0.5 size match = 5.5
  assert.ok(evalWithBreed.affinityMultiplier >= 5.0);
});

test("Meta-grade targeting: Hyper-local district and state proximity boost", () => {
  const localTargeting = {
    pet_interests: ["DOGS"],
    regions: ["IN:KL:KOCHI", "IN:KL:ALL"],
  };

  const dogParent: UserPetProfile = {
    hasPets: true,
    species: ["DOG"],
    breeds: [],
    sizes: [],
  };

  // Exact district match
  const evalKochi = evaluatePetTargeting(localTargeting, dogParent, {
    location: { country: "IN", state: "KL", district: "KOCHI", city: "KOCHI" },
  });
  assert.strictEqual(evalKochi.proximityScore, 2.5);

  // State match
  const evalOtherKerala = evaluatePetTargeting(localTargeting, dogParent, {
    location: { country: "IN", state: "KL", district: "KOZHIKODE", city: "KOZHIKODE" },
  });
  assert.strictEqual(evalOtherKerala.proximityScore, 1.8);
});

test("Dynamic Geo Detection: Timezone headers auto-detect country and state", async () => {
  const reqIndia = {
    headers: { "x-user-timezone": "Asia/Kolkata" },
    query: {},
  } as unknown as Request;

  const countryIndia = resolveCountryFromRequest(reqIndia);
  assert.strictEqual(countryIndia, "IN");

  const locIndia = await resolveUserLocationFromRequest(reqIndia);
  assert.strictEqual(locIndia.country, "IN");
  assert.strictEqual(locIndia.state, "KL");

  const reqUS = {
    headers: { "x-user-timezone": "America/New_York" },
    query: {},
  } as unknown as Request;

  const countryUS = resolveCountryFromRequest(reqUS);
  assert.strictEqual(countryUS, "US");

  const locUS = await resolveUserLocationFromRequest(reqUS);
  assert.strictEqual(locUS.country, "US");
  assert.strictEqual(locUS.state, "NY");
});
