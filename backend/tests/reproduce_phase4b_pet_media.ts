import "dotenv/config";
import { supabase as serviceSupabase } from "../src/config/supabase.js";
import { uploadImageToStorage } from "../src/media/storage.service.js";
import sharp from "sharp";

async function reproduce() {
  console.log("==================================================");
  console.log("PHASE 4B: REPRODUCING PET MEDIA STORAGE EXPOSURE");
  console.log("==================================================");

  const ts = Date.now();
  const emailA = `sec_parent_a_p4b_${ts}@petotest.local`;
  const pass = "SecP@ssw0rd!2026_Phase4B";

  // 1. Provision Test User A
  console.log("[1] Provisioning synthetic test user...");
  const resA = await serviceSupabase.auth.admin.createUser({
    email: emailA,
    password: pass,
    email_confirm: true,
    user_metadata: { full_name: "Parent A" }
  });
  const userA = resA.data?.user;
  if (!userA) throw new Error("Failed to provision test user");

  await serviceSupabase.from("profiles").upsert([
    { id: userA.id, username: `parenta_p4b_${ts}`, full_name: "Parent A" }
  ]);

  // 2. Create synthetic private pet
  console.log("[2] Provisioning PET-PRIVATE-A...");
  const { data: petPrivate } = await serviceSupabase.from("pets").insert({
    name: `PrivatePet_${ts}`,
    species: "DOG",
    profile_visibility: "PRIVATE",
    status: "ACTIVE",
  }).select().single();

  if (!petPrivate) throw new Error("Failed to create private pet");

  await serviceSupabase.from("pet_parents").insert({
    pet_id: petPrivate.id,
    user_id: userA.id,
    relationship: "OWNER",
    status: "ACTIVE",
    is_primary: true,
    permissions: ["VIEW_PROFILE", "EDIT_PROFILE", "UPLOAD_MEDIA", "MANAGE_PARENTS", "MANAGE_PRIVACY"],
  });

  // 3. Generate a synthetic 64x64 valid WebP image
  console.log("[3] Generating synthetic non-sensitive image and uploading to storage...");
  const sampleImageBuffer = await sharp({
    create: {
      width: 64,
      height: 64,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 1 }
    }
  }).webp().toBuffer();

  const filename = `synthetic_private_pet_${ts}.webp`;
  const publicCdnUrl = await uploadImageToStorage(sampleImageBuffer, filename);
  console.log(`Uploaded to public CDN URL: ${publicCdnUrl}`);

  // Create media record
  const { data: mediaRec } = await serviceSupabase.from("media").insert({
    user_id: userA.id,
    type: "image",
    url: publicCdnUrl,
    size: sampleImageBuffer.length,
    mime_type: "image/webp"
  }).select().single();

  // Link as pet_media
  const { data: petMediaRec } = await serviceSupabase.from("pet_media").insert({
    pet_id: petPrivate.id,
    media_id: mediaRec.id,
    role: "PROFILE",
    is_primary: true,
    created_by: userA.id,
  }).select().single();

  await serviceSupabase.from("pets").update({
    profile_media_id: mediaRec.id
  }).eq("id", petPrivate.id);

  console.log("[4] Testing actual binary accessibility via HTTP GET...");

  // Test 1: Anonymous HTTP GET without any authentication headers
  const anonFetch = await fetch(publicCdnUrl);
  const anonStatus = anonFetch.status;
  const anonBytes = await anonFetch.arrayBuffer();
  console.log(`- Anonymous direct CDN GET status: ${anonStatus}, bytes received: ${anonBytes.byteLength}`);

  // Test 2: Unrelated User B context (also direct GET to public URL)
  const userBHeaders = { Authorization: "Bearer bogus_or_unrelated_token" };
  const userBFetch = await fetch(publicCdnUrl, { headers: userBHeaders });
  const userBStatus = userBFetch.status;

  // Test 3: Delete pet_media metadata row
  console.log("[5] Deleting pet_media metadata row and testing binary persistence...");
  await serviceSupabase.from("pet_media").delete().eq("id", petMediaRec.id);
  const postDeleteFetch = await fetch(publicCdnUrl);
  const postDeleteStatus = postDeleteFetch.status;
  console.log(`- Post-metadata-deletion CDN GET status: ${postDeleteStatus}`);

  // Cleanup storage object & test entities
  console.log("[6] Cleaning up test resources...");
  await serviceSupabase.storage.from("posts-images").remove([filename]);
  await serviceSupabase.from("media").delete().eq("id", mediaRec.id);
  await serviceSupabase.from("pet_parents").delete().eq("pet_id", petPrivate.id);
  await serviceSupabase.from("pets").delete().eq("id", petPrivate.id);
  await serviceSupabase.from("profiles").delete().eq("id", userA.id);
  await serviceSupabase.auth.admin.deleteUser(userA.id);

  console.log("\n==================================================");
  console.log("REPRODUCTION FINDINGS:");
  console.log(`1. Exact Storage Bucket: posts-images`);
  console.log(`2. Object Visibility in Bucket: public: true (Supabase Storage)`);
  console.log(`3. Permanent Public URL Exists: YES (${publicCdnUrl})`);
  console.log(`4. Anonymous Direct GET Succeeded: ${anonStatus === 200 ? "YES (HTTP 200 - EXPOSURE CONFIRMED)" : "NO"}`);
  console.log(`5. Unrelated User B GET Succeeded: ${userBStatus === 200 ? "YES (HTTP 200 - EXPOSURE CONFIRMED)" : "NO"}`);
  console.log(`6. Binary Persists After Metadata Deletion: ${postDeleteStatus === 200 ? "YES (HTTP 200 - ORPHAN BINARY ACCESSIBLE)" : "NO"}`);
  console.log("==================================================");

  if (anonStatus === 200) {
    console.log("ISSUE CONFIRMED: Classified as PETO-SEC-14 (HIGH).");
  }
}

reproduce().catch(e => {
  console.error("Reproduction failed:", e);
  process.exit(1);
});
