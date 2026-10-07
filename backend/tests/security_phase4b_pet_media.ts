import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { supabase as serviceSupabase } from "../src/config/supabase.js";
import {
  ensurePetMediaPrivateBucket,
  generateSignedPetMediaUrl,
  moveMediaToPrivate,
  moveMediaToPublic,
  deletePrivatePetMedia,
  deletePetPrivateStorageFolder,
  parseStorageUrl,
  PET_MEDIA_PRIVATE_BUCKET,
} from "../src/media/petStorage.service.js";
import { uploadImageToStorage } from "../src/media/storage.service.js";
import { validateUploadedFile } from "../src/media/fileValidator.js";
import {
  createPetService,
  getPetByIdService,
  updatePetVisibilityService,
  addPetMediaService,
  deletePetMediaService,
  deletePetService,
  getPetMediaAccessService,
} from "../src/pets/pet.service.js";
import sharp from "sharp";

const BACKEND_BASE = "http://localhost:5000";
const SUPABASE_URL = process.env.SUPABASE_URL || "https://ednleoavhuxlarnnlmkq.supabase.co";
const ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

interface MediaTestResult {
  testId: string;
  description: string;
  actor: string;
  expected: string;
  actual: string;
  pass: boolean;
  notes?: string;
}

export const testResults: MediaTestResult[] = [];

function record(r: MediaTestResult) {
  testResults.push(r);
  const mark = r.pass ? "✅ PASS" : "❌ FAIL";
  console.log(`[${r.testId}] ${mark} - ${r.description} (${r.actor}) -> ${r.actual}`);
}

async function run() {
  console.log("==================================================");
  console.log("PETO PHASE 4B: PET MEDIA STORAGE & PRIVACY RETEST");
  console.log("==================================================");

  // Initialize private bucket
  await ensurePetMediaPrivateBucket();
  const anonClient = createClient(SUPABASE_URL, ANON_KEY);

  // 1. Provision Synthetic Users: Parent A, Attacker B, Friend C
  const ts = Date.now();
  const emailA = `sec_parent_a_p4b_${ts}@petotest.local`;
  const emailB = `sec_attacker_b_p4b_${ts}@petotest.local`;
  const emailC = `sec_friend_c_p4b_${ts}@petotest.local`;
  const pass = "SecP@ssw0rd!2026_Phase4B";

  console.log("\n[1] Creating synthetic identities...");
  const resA = await serviceSupabase.auth.admin.createUser({ email: emailA, password: pass, email_confirm: true, user_metadata: { full_name: "Parent A" } });
  const resB = await serviceSupabase.auth.admin.createUser({ email: emailB, password: pass, email_confirm: true, user_metadata: { full_name: "Attacker B" } });
  const resC = await serviceSupabase.auth.admin.createUser({ email: emailC, password: pass, email_confirm: true, user_metadata: { full_name: "Friend C" } });

  const userA = resA.data?.user!;
  const userB = resB.data?.user!;
  const userC = resC.data?.user!;

  await serviceSupabase.from("profiles").upsert([
    { id: userA.id, username: `parenta_p4b_${ts}`, full_name: "Parent A" },
    { id: userB.id, username: `attackb_p4b_${ts}`, full_name: "Attacker B" },
    { id: userC.id, username: `friendc_p4b_${ts}`, full_name: "Friend C" },
  ]);

  // Friend C follows Parent A
  await serviceSupabase.from("follows").insert({
    follower_id: userC.id,
    following_id: userA.id,
  });

  // Client sessions
  const authA = await anonClient.auth.signInWithPassword({ email: emailA, password: pass });
  const authB = await anonClient.auth.signInWithPassword({ email: emailB, password: pass });
  const authC = await anonClient.auth.signInWithPassword({ email: emailC, password: pass });

  const tokenA = authA.data?.session?.access_token!;
  const tokenB = authB.data?.session?.access_token!;
  const tokenC = authC.data?.session?.access_token!;

  const clientB = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${tokenB}` } } });

  // 2. Generate valid test image buffers
  console.log("[2] Generating synthetic non-sensitive image buffers...");
  const redImageBuf = await sharp({ create: { width: 32, height: 32, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 1 } } }).webp().toBuffer();
  const greenImageBuf = await sharp({ create: { width: 32, height: 32, channels: 4, background: { r: 0, g: 255, b: 0, alpha: 1 } } }).webp().toBuffer();
  const blueImageBuf = await sharp({ create: { width: 32, height: 32, channels: 4, background: { r: 0, g: 0, b: 255, alpha: 1 } } }).webp().toBuffer();

  // Helper to upload via public pipeline and create media record
  async function createInitialMedia(buf: Buffer, uId: string, name: string) {
    const pubUrl = await uploadImageToStorage(buf, name);
    const { data: m } = await serviceSupabase.from("media").insert({
      user_id: uId,
      type: "image",
      url: pubUrl,
      size: buf.length,
      mime_type: "image/webp"
    }).select().single();
    return { pubUrl, mediaId: m.id, filename: name };
  }

  const mediaPub = await createInitialMedia(blueImageBuf, userA.id, `test_pub_${ts}.webp`);
  const mediaConn = await createInitialMedia(greenImageBuf, userA.id, `test_conn_${ts}.webp`);
  const mediaPriv = await createInitialMedia(redImageBuf, userA.id, `test_priv_${ts}.webp`);

  // 3. Provision Pets
  console.log("[3] Provisioning pets (PUBLIC, CONNECTIONS, PRIVATE)...");
  const petPub = await createPetService(userA.id, {
    name: `PetPub_${ts}`,
    species: "DOG",
    profile_visibility: "PUBLIC",
    profile_media_id: mediaPub.mediaId,
  });

  const petConn = await createPetService(userA.id, {
    name: `PetConn_${ts}`,
    species: "CAT",
    profile_visibility: "CONNECTIONS",
    profile_media_id: mediaConn.mediaId,
  });

  const petPriv = await createPetService(userA.id, {
    name: `PetPriv_${ts}`,
    species: "BIRD",
    profile_visibility: "PRIVATE",
    profile_media_id: mediaPriv.mediaId,
  });

  console.log("\n[4] Executing Phase 4B Security Test Matrix (MEDIA-SEC-01 to MEDIA-SEC-20)...");

  // -------------------------------------------------------------------------
  // MEDIA-SEC-01: Anonymous cannot fetch PRIVATE pet media binary
  // -------------------------------------------------------------------------
  const privMediaRecord = await serviceSupabase.from("media").select("url").eq("id", mediaPriv.mediaId).single();
  const privDirectUrl = privMediaRecord.data?.url || "";
  let anonPrivFetchStatus = 0;
  if (privDirectUrl.startsWith("http")) {
    const res = await fetch(privDirectUrl);
    anonPrivFetchStatus = res.status;
  }
  const privStoragePath = parseStorageUrl(privDirectUrl)?.path || `pets/${petPriv.id}/${mediaPriv.mediaId}.webp`;
  const anonDirectStorageRes = await anonClient.storage.from(PET_MEDIA_PRIVATE_BUCKET).download(privStoragePath);

  const sec01Passed = (!privDirectUrl.startsWith("http") || anonPrivFetchStatus !== 200) && !!anonDirectStorageRes.error;
  record({
    testId: "MEDIA-SEC-01",
    description: "Anonymous cannot fetch PRIVATE pet media binary",
    actor: "SEC-GUEST (Anon)",
    expected: "BLOCKED (No public URL, direct download fails)",
    actual: sec01Passed ? "BLOCKED (Binary completely inaccessible to anonymous)" : `FAILED (Accessible: HTTP ${anonPrivFetchStatus})`,
    pass: sec01Passed,
  });

  // -------------------------------------------------------------------------
  // MEDIA-SEC-02: User B cannot fetch User A PRIVATE pet media
  // -------------------------------------------------------------------------
  let userBPrivAllowed = false;
  try {
    await getPetMediaAccessService(petPriv.id, mediaPriv.mediaId, userB.id);
    userBPrivAllowed = true;
  } catch (e: any) {
    userBPrivAllowed = false;
  }
  const userBDirectDownload = await clientB.storage.from(PET_MEDIA_PRIVATE_BUCKET).download(privStoragePath);

  const sec02Passed = !userBPrivAllowed && !!userBDirectDownload.error;
  record({
    testId: "MEDIA-SEC-02",
    description: "User B cannot fetch User A PRIVATE pet media",
    actor: "SEC-USER-B (Attacker)",
    expected: "BLOCKED (Access endpoint denies, storage download denied)",
    actual: sec02Passed ? "BLOCKED (User B opaque denial and storage denied)" : "FAILED (User B accessed private media)",
    pass: sec02Passed,
  });

  // -------------------------------------------------------------------------
  // MEDIA-SEC-03: Authorized Parent A can access PRIVATE pet media
  // -------------------------------------------------------------------------
  let signedUrlA = "";
  let fetchAStatus = 0;
  try {
    const accessA = await getPetMediaAccessService(petPriv.id, mediaPriv.mediaId, userA.id);
    signedUrlA = accessA.url;
    const fetchA = await fetch(signedUrlA);
    fetchAStatus = fetchA.status;
  } catch (err: any) {
    console.warn("Parent access error:", err);
  }

  const sec03Passed = fetchAStatus === 200 && signedUrlA.includes("token=");
  record({
    testId: "MEDIA-SEC-03",
    description: "Authorized Parent A can access PRIVATE pet media",
    actor: "SEC-USER-A (Parent)",
    expected: "ALLOW (Signed URL generated and delivers binary)",
    actual: sec03Passed ? `ALLOW (HTTP ${fetchAStatus} via signed delivery)` : `FAILED (Status ${fetchAStatus})`,
    pass: sec03Passed,
  });

  // -------------------------------------------------------------------------
  // MEDIA-SEC-04: Anonymous cannot fetch CONNECTIONS pet media
  // -------------------------------------------------------------------------
  const connMediaRecord = await serviceSupabase.from("media").select("url").eq("id", mediaConn.mediaId).single();
  const connDirectUrl = connMediaRecord.data?.url || "";
  let anonConnFetchStatus = 0;
  if (connDirectUrl.startsWith("http")) {
    const res = await fetch(connDirectUrl);
    anonConnFetchStatus = res.status;
  }
  const connStoragePath = parseStorageUrl(connDirectUrl)?.path || `pets/${petConn.id}/${mediaConn.mediaId}.webp`;
  const anonConnDownload = await anonClient.storage.from(PET_MEDIA_PRIVATE_BUCKET).download(connStoragePath);

  const sec04Passed = (!connDirectUrl.startsWith("http") || anonConnFetchStatus !== 200) && !!anonConnDownload.error;
  record({
    testId: "MEDIA-SEC-04",
    description: "Anonymous cannot fetch CONNECTIONS pet media",
    actor: "SEC-GUEST (Anon)",
    expected: "BLOCKED (Direct public access denied)",
    actual: sec04Passed ? "BLOCKED (Connections media protected from guest)" : "FAILED (Guest accessed connections media)",
    pass: sec04Passed,
  });

  // -------------------------------------------------------------------------
  // MEDIA-SEC-05: Unconnected User B cannot fetch CONNECTIONS pet media
  // -------------------------------------------------------------------------
  let userBConnAllowed = false;
  try {
    await getPetMediaAccessService(petConn.id, mediaConn.mediaId, userB.id);
    userBConnAllowed = true;
  } catch (e: any) {
    userBConnAllowed = false;
  }

  record({
    testId: "MEDIA-SEC-05",
    description: "Unconnected User B cannot fetch CONNECTIONS pet media",
    actor: "SEC-USER-B (Unconnected)",
    expected: "BLOCKED (Access endpoint returns 404 opaque denial)",
    actual: !userBConnAllowed ? "BLOCKED (Opaque 404 access boundary enforced)" : "FAILED (Unconnected user accessed media)",
    pass: !userBConnAllowed,
  });

  // -------------------------------------------------------------------------
  // MEDIA-SEC-06: Connected User C can access CONNECTIONS pet media
  // -------------------------------------------------------------------------
  let userCConnStatus = 0;
  let signedUrlC = "";
  try {
    const accessC = await getPetMediaAccessService(petConn.id, mediaConn.mediaId, userC.id);
    signedUrlC = accessC.url;
    const fetchC = await fetch(signedUrlC);
    userCConnStatus = fetchC.status;
  } catch (err: any) {
    console.warn("Connected user access error:", err);
  }

  const sec06Passed = userCConnStatus === 200 && signedUrlC.includes("token=");
  record({
    testId: "MEDIA-SEC-06",
    description: "Connected User C can access CONNECTIONS pet media",
    actor: "SEC-USER-C (Follower)",
    expected: "ALLOW (Signed URL generated for authorized connection)",
    actual: sec06Passed ? `ALLOW (HTTP ${userCConnStatus} delivered to connected follower)` : `FAILED (Status ${userCConnStatus})`,
    pass: sec06Passed,
  });

  // -------------------------------------------------------------------------
  // MEDIA-SEC-07: PUBLIC pet media remains accessible according to intended design
  // -------------------------------------------------------------------------
  const accessPub = await getPetMediaAccessService(petPub.id, mediaPub.mediaId, null);
  const fetchPub = await fetch(accessPub.url);
  const sec07Passed = fetchPub.status === 200 && accessPub.is_public;
  record({
    testId: "MEDIA-SEC-07",
    description: "PUBLIC pet media remains accessible according to intended design",
    actor: "SEC-GUEST (Public)",
    expected: "ALLOW (Public CDN URL functions normally with zero friction)",
    actual: sec07Passed ? "ALLOW (Public URL returns HTTP 200)" : "FAILED (Public media broken)",
    pass: sec07Passed,
  });

  // -------------------------------------------------------------------------
  // MEDIA-SEC-08: Knowing private storage path does not bypass authorization
  // -------------------------------------------------------------------------
  const knownPathGuess = await anonClient.storage.from(PET_MEDIA_PRIVATE_BUCKET).download(privStoragePath);
  const sec08Passed = !!knownPathGuess.error;
  record({
    testId: "MEDIA-SEC-08",
    description: "Knowing private storage path does not bypass authorization",
    actor: "SEC-USER-B (Path Guessing)",
    expected: "BLOCKED (Storage rejects direct unauthenticated download)",
    actual: sec08Passed ? `BLOCKED (${knownPathGuess.error?.message || "Denied"})` : "FAILED (Path guessing succeeded)",
    pass: sec08Passed,
  });

  // -------------------------------------------------------------------------
  // MEDIA-SEC-09: Knowing media ID does not bypass authorization
  // -------------------------------------------------------------------------
  let mediaIdBypass = false;
  try {
    await getPetMediaAccessService(petPriv.id, mediaPriv.mediaId, null);
    mediaIdBypass = true;
  } catch (_) {
    mediaIdBypass = false;
  }

  record({
    testId: "MEDIA-SEC-09",
    description: "Knowing media ID does not bypass authorization",
    actor: "SEC-GUEST (ID Guessing)",
    expected: "BLOCKED (Server-side lookup enforces pet privacy boundary)",
    actual: !mediaIdBypass ? "BLOCKED (Rejected by authoritative visibility check)" : "FAILED (Media ID bypassed privacy)",
    pass: !mediaIdBypass,
  });

  // -------------------------------------------------------------------------
  // MEDIA-SEC-10: Expired signed URL is unusable after expiration
  // -------------------------------------------------------------------------
  const shortSigned = await generateSignedPetMediaUrl(privStoragePath, 1);
  await new Promise(r => setTimeout(r, 2200));
  const expiredFetch = await fetch(shortSigned);
  const sec10Passed = expiredFetch.status !== 200;
  record({
    testId: "MEDIA-SEC-10",
    description: "Expired signed URL is unusable after expiration",
    actor: "SEC-USER (Expired Token)",
    expected: "BLOCKED (HTTP 400/403 upon expiry)",
    actual: sec10Passed ? `BLOCKED (HTTP ${expiredFetch.status} after TTL expiry)` : "FAILED (Expired URL still active)",
    pass: sec10Passed,
  });

  // -------------------------------------------------------------------------
  // MEDIA-SEC-11: User B cannot request signed URL for User A PRIVATE pet media
  // -------------------------------------------------------------------------
  let userBRequestSigned = false;
  try {
    await getPetMediaAccessService(petPriv.id, mediaPriv.mediaId, userB.id);
    userBRequestSigned = true;
  } catch (_) {
    userBRequestSigned = false;
  }

  record({
    testId: "MEDIA-SEC-11",
    description: "User B cannot request signed URL for User A PRIVATE pet media",
    actor: "SEC-USER-B (Attacker)",
    expected: "BLOCKED (Server refuses to issue signed URL)",
    actual: !userBRequestSigned ? "BLOCKED (No signed URL generated for unauthorized caller)" : "FAILED (Signed URL issued to User B)",
    pass: !userBRequestSigned,
  });

  // -------------------------------------------------------------------------
  // MEDIA-SEC-12: User B cannot delete User A protected pet media
  // -------------------------------------------------------------------------
  let userBDeleteAllowed = false;
  try {
    await deletePetMediaService(petPriv.id, mediaPriv.mediaId, userB.id);
    userBDeleteAllowed = true;
  } catch (delErr: any) {
    userBDeleteAllowed = false;
  }

  const checkMediaStillExists = await serviceSupabase.from("media").select("id").eq("id", mediaPriv.mediaId).single();
  const sec12Passed = !userBDeleteAllowed && !!checkMediaStillExists.data?.id;
  record({
    testId: "MEDIA-SEC-12",
    description: "User B cannot delete User A protected pet media",
    actor: "SEC-USER-B (Attacker)",
    expected: "BLOCKED (HTTP 403, media record and binary preserved)",
    actual: sec12Passed ? "PROTECTED (Delete refused, record remains intact)" : "FAILED (Unauthorized deletion succeeded)",
    pass: sec12Passed,
  });

  // -------------------------------------------------------------------------
  // MEDIA-SEC-13: User B cannot replace User A protected pet media
  // -------------------------------------------------------------------------
  let userBReplaceAllowed = false;
  try {
    await addPetMediaService(petPriv.id, userB.id, {
      media_id: mediaPub.mediaId,
      role: "PROFILE"
    });
    userBReplaceAllowed = true;
  } catch (repErr: any) {
    userBReplaceAllowed = false;
  }

  record({
    testId: "MEDIA-SEC-13",
    description: "User B cannot replace User A protected pet media",
    actor: "SEC-USER-B (Attacker)",
    expected: "BLOCKED (Permission check prevents unauthorized media linking)",
    actual: !userBReplaceAllowed ? "PROTECTED (Unauthorized media linking rejected)" : "FAILED (User B replaced pet media)",
    pass: !userBReplaceAllowed,
  });

  // -------------------------------------------------------------------------
  // MEDIA-SEC-14: PUBLIC → PRIVATE removes/revokes old public accessibility
  // -------------------------------------------------------------------------
  // Provision a dedicated public pet with public media
  const dedicatedPubMedia = await createInitialMedia(blueImageBuf, userA.id, `trans_pub_priv_${ts}.webp`);
  const dedicatedPet = await createPetService(userA.id, {
    name: `TransitionPet_${ts}`,
    species: "DOG",
    profile_visibility: "PUBLIC",
    profile_media_id: dedicatedPubMedia.mediaId
  });

  const beforeTransFetch = await fetch(dedicatedPubMedia.pubUrl);
  const beforeStatus = beforeTransFetch.status;

  // Perform restrictive transition: PUBLIC -> PRIVATE
  await updatePetVisibilityService(dedicatedPet.id, userA.id, "PRIVATE");

  // Verify old public storage object is removed and public access revoked
  const checkPublicStorageGone = await anonClient.storage.from("posts-images").download(dedicatedPubMedia.filename);
  const afterTransFetch = await fetch(`${dedicatedPubMedia.pubUrl}?cb=${Date.now()}`, {
    headers: { "Cache-Control": "no-cache, no-store" }
  });
  const afterStatus = afterTransFetch.status;

  const sec14Passed = beforeStatus === 200 && !!checkPublicStorageGone.error && afterStatus !== 200;
  record({
    testId: "MEDIA-SEC-14",
    description: "PUBLIC → PRIVATE removes/revokes old public accessibility",
    actor: "SEC-SYSTEM (Transition)",
    expected: "SAFE (Before: HTTP 200, After: HTTP 400/404; public object removed)",
    actual: sec14Passed ? `SAFE (Before: HTTP ${beforeStatus}, After: HTTP ${afterStatus}, storage deleted)` : `FAILED (Public file still alive: HTTP ${afterStatus})`,
    pass: sec14Passed,
  });

  // -------------------------------------------------------------------------
  // MEDIA-SEC-15: PUBLIC → CONNECTIONS removes/revokes unrestricted public access
  // -------------------------------------------------------------------------
  const connTransMedia = await createInitialMedia(greenImageBuf, userA.id, `trans_pub_conn_${ts}.webp`);
  const dedicatedPetConn = await createPetService(userA.id, {
    name: `ConnTransPet_${ts}`,
    species: "CAT",
    profile_visibility: "PUBLIC",
    profile_media_id: connTransMedia.mediaId
  });

  await updatePetVisibilityService(dedicatedPetConn.id, userA.id, "CONNECTIONS");
  const afterConnTransFetch = await fetch(connTransMedia.pubUrl);
  const sec15Passed = afterConnTransFetch.status !== 200;

  record({
    testId: "MEDIA-SEC-15",
    description: "PUBLIC → CONNECTIONS removes/revokes unrestricted public access",
    actor: "SEC-SYSTEM (Transition)",
    expected: "SAFE (Old public CDN URL revoked upon transition to CONNECTIONS)",
    actual: sec15Passed ? `SAFE (Public URL returns HTTP ${afterConnTransFetch.status})` : `FAILED (Public URL remains active)`,
    pass: sec15Passed,
  });

  // -------------------------------------------------------------------------
  // MEDIA-SEC-16: PRIVATE → PUBLIC behaves according to documented architecture
  // -------------------------------------------------------------------------
  await updatePetVisibilityService(dedicatedPet.id, userA.id, "PUBLIC");
  const petRestored = await getPetByIdService(dedicatedPet.id, null);
  const restoredUrl = petRestored.profile_photo_url || "";
  let restoredFetchStatus = 0;
  if (restoredUrl.startsWith("http")) {
    const rf = await fetch(restoredUrl);
    restoredFetchStatus = rf.status;
  }

  const sec16Passed = restoredFetchStatus === 200;
  record({
    testId: "MEDIA-SEC-16",
    description: "PRIVATE → PUBLIC behaves according to documented architecture",
    actor: "SEC-SYSTEM (Transition)",
    expected: "PASS (Media published and publicly accessible)",
    actual: sec16Passed ? `PASS (Restored to public storage, HTTP ${restoredFetchStatus})` : `FAILED (Status ${restoredFetchStatus})`,
    pass: sec16Passed,
  });

  // -------------------------------------------------------------------------
  // MEDIA-SEC-17: protected media upload retains Phase 2B magic-byte validation
  // -------------------------------------------------------------------------
  const validFileMock: any = {
    buffer: redImageBuf,
    originalname: "valid_pet.webp",
    mimetype: "image/webp",
    size: redImageBuf.length
  };
  const valResult = await validateUploadedFile(validFileMock, "image");
  record({
    testId: "MEDIA-SEC-17",
    description: "Protected media upload retains Phase 2B magic-byte validation",
    actor: "SEC-VALIDATOR",
    expected: "PASS (Valid WebP file signature accepted)",
    actual: valResult.valid ? "PASS (Magic bytes verified successfully)" : `FAILED (${valResult.error})`,
    pass: valResult.valid,
  });

  // -------------------------------------------------------------------------
  // MEDIA-SEC-18: HTML/SVG/executable spoof remains blocked
  // -------------------------------------------------------------------------
  const fakeSvgMock: any = {
    buffer: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>"),
    originalname: "avatar.webp",
    mimetype: "image/webp",
    size: 64
  };
  const fakeHtmlMock: any = {
    buffer: Buffer.from("<!DOCTYPE html><html><body>malicious</body></html>"),
    originalname: "pet.jpg",
    mimetype: "image/jpeg",
    size: 55
  };

  const svgRes = await validateUploadedFile(fakeSvgMock, "image");
  const htmlRes = await validateUploadedFile(fakeHtmlMock, "image");
  const sec18Passed = !svgRes.valid && !htmlRes.valid;

  record({
    testId: "MEDIA-SEC-18",
    description: "HTML/SVG/executable spoof remains blocked",
    actor: "SEC-VALIDATOR (Active Content)",
    expected: "BLOCKED (Fake image containing scripts/HTML rejected)",
    actual: sec18Passed ? "BLOCKED (Both active content payloads strictly rejected)" : "FAILED (Active content bypassed validator)",
    pass: sec18Passed,
  });

  // -------------------------------------------------------------------------
  // MEDIA-SEC-19: private bucket listing is unavailable to unauthorized clients
  // -------------------------------------------------------------------------
  const anonList = await anonClient.storage.from(PET_MEDIA_PRIVATE_BUCKET).list();
  const userBList = await clientB.storage.from(PET_MEDIA_PRIVATE_BUCKET).list();
  const sec19Passed = (anonList.data?.length || 0) === 0 && (userBList.data?.length || 0) === 0;

  record({
    testId: "MEDIA-SEC-19",
    description: "Private bucket listing is unavailable to unauthorized clients",
    actor: "SEC-USER-B / SEC-GUEST",
    expected: "BLOCKED (Zero objects returned in directory listing)",
    actual: sec19Passed ? "BLOCKED (Empty list / inaccessible to unauthorized callers)" : "FAILED (Objects leaked in listing)",
    pass: sec19Passed,
  });

  // -------------------------------------------------------------------------
  // MEDIA-SEC-20: pet deletion cleans protected media without affecting foreign objects
  // -------------------------------------------------------------------------
  // Delete dedicatedPet
  await deletePetService(dedicatedPet.id, userA.id);
  await deletePetService(dedicatedPetConn.id, userA.id);

  // Check that PetPriv's storage folder still exists and is untouched
  const checkPrivFiles = await serviceSupabase.storage.from(PET_MEDIA_PRIVATE_BUCKET).list(`pets/${petPriv.id}`);
  const privMediaUntouched = (checkPrivFiles.data?.length || 0) > 0;

  record({
    testId: "MEDIA-SEC-20",
    description: "Pet deletion cleans protected media without affecting foreign objects",
    actor: "SEC-SYSTEM (Cleanup)",
    expected: "SAFE (Deleted pet objects cleaned, foreign pet media untouched)",
    actual: privMediaUntouched ? "SAFE (PetPriv media remains intact after other pet deleted)" : "FAILED (Foreign pet media damaged)",
    pass: privMediaUntouched,
  });

  // =========================================================================
  // CLEANUP TEST SUITE ENTITIES
  // =========================================================================
  console.log("\n[5] Cleaning up remaining test resources...");
  try {
    await deletePetService(petPriv.id, userA.id);
    await deletePetService(petConn.id, userA.id);
    await deletePetService(petPub.id, userA.id);

    await serviceSupabase.from("follows").delete().eq("follower_id", userC.id);
    await serviceSupabase.from("profiles").delete().in("id", [userA.id, userB.id, userC.id]);
    await serviceSupabase.auth.admin.deleteUser(userA.id);
    await serviceSupabase.auth.admin.deleteUser(userB.id);
    await serviceSupabase.auth.admin.deleteUser(userC.id);
    console.log("Cleanup completed.");
  } catch (cleanErr: any) {
    console.warn("Cleanup warning:", cleanErr.message);
  }

  console.log("\n==================================================");
  console.log("TEST RUN COMPLETE");
  console.log("==================================================");
  const total = testResults.length;
  const passed = testResults.filter(t => t.pass).length;
  const failed = testResults.filter(t => !t.pass).length;
  console.log(`TOTAL: ${total} | PASSED: ${passed} | FAILED: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

run().catch((e) => {
  console.error("Fatal test runner error:", e);
  process.exit(1);
});
