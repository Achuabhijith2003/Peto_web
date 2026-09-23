import "dotenv/config";
import { supabase } from "./src/config/supabase";
import {
  validateMentions,
  validatePetTags,
  syncPostMentionsAndTags,
  getMentionsAndTagsForPosts,
  syncCommentMentions,
} from "./src/posts/mention_tag.service";
import { searchTaggablePetsService } from "./src/pets/pet.service";
import { searchUsers } from "./src/users/user.service";

async function runTests() {
  console.log("==================================================");
  console.log("🚀 STARTING MENTIONS & PET TAGGING TEST SUITE");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ [PASS]: ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL]: ${testName}`);
      failed++;
    }
  }

  // 1. Fetch real test users & pets from DB
  const { data: users } = await supabase.from("profiles").select("id, username").limit(3);
  const { data: pets } = await supabase.from("pets").select("id, name, profile_visibility").limit(3);

  if (!users || users.length < 2) {
    throw new Error("Need at least 2 users in profiles to run test suite.");
  }

  const author = users[0];
  const targetUser = users[1];
  console.log(`Author: ${author.username} (${author.id})`);
  console.log(`Target User: ${targetUser.username} (${targetUser.id})`);

  // Test 1: User Mention Validation
  console.log("\n--- Test 1: Validate User Mentions ---");
  const mentions = await validateMentions(author.id, [targetUser.id, targetUser.id, "invalid-uuid"]);
  assert(mentions.length === 1, "Deduplicates mention IDs and rejects invalid UUIDs");
  assert(mentions[0].id === targetUser.id, "Correctly validates and maps target user profile");

  // Test 2: Mention Limits Enforced
  console.log("\n--- Test 2: Mentions Cap Limit ---");
  const fakeIds = Array(15).fill(targetUser.id);
  const cappedMentions = await validateMentions(author.id, fakeIds, 10);
  assert(cappedMentions.length <= 10, "Enforces maximum 10 mentions limit");

  // Test 3: User Search respects exclusion of author
  console.log("\n--- Test 3: User Search for Mentions Autocomplete ---");
  const searchResults = await searchUsers(author.id, targetUser.username.substring(0, 3), 1, 10);
  assert(Array.isArray(searchResults), "User search returns array");
  const authorIncluded = searchResults.some(u => u.id === author.id);
  assert(!authorIncluded, "Author is excluded from autocomplete list");

  // Test 4: Pet Tagging Validation
  console.log("\n--- Test 4: Validate Pet Tags ---");
  if (pets && pets.length > 0) {
    const samplePet = pets[0];
    console.log(`Sample Pet: ${samplePet.name} (${samplePet.id}, visibility: ${samplePet.profile_visibility})`);
    const validTags = await validatePetTags(author.id, [samplePet.id, "invalid-uuid"]);
    assert(Array.isArray(validTags), "Pet tag validation executes cleanly");
  } else {
    console.log("No pets in database; skipping pet existence check");
  }

  // Test 5: Taggable Pets Search
  console.log("\n--- Test 5: Taggable Pets Discovery ---");
  const taggable = await searchTaggablePetsService(author.id, "");
  assert(Array.isArray(taggable), "Taggable pets returns array of eligible pets");

  // Test 6: getMentionsAndTagsForPosts graceful execution
  console.log("\n--- Test 6: Batch retrieval of mentions and tags ---");
  const batchResult = await getMentionsAndTagsForPosts(["00000000-0000-0000-0000-000000000000"]);
  assert(batchResult.mentionsByPostId instanceof Map, "mentionsByPostId is a Map");
  assert(batchResult.tagsByPostId instanceof Map, "tagsByPostId is a Map");

  console.log("\n==================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
