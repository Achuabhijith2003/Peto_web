import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { supabase as serviceSupabase } from "../src/config/supabase.js";
import { evaluatePetVisibility } from "../src/pets/pet.permission.js";

const BACKEND_BASE = "http://localhost:5000";
const SUPABASE_URL = process.env.SUPABASE_URL || "https://ednleoavhuxlarnnlmkq.supabase.co";
const ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

interface PetTestResult {
  testId: string;
  description: string;
  actor: string;
  target: string;
  expected: string;
  actual: string;
  pass: boolean;
  notes?: string;
}

export const testResults: PetTestResult[] = [];

function record(r: PetTestResult) {
  testResults.push(r);
  const mark = r.pass ? "✅ PASS" : "❌ FAIL";
  console.log(`[${r.testId}] ${mark} - ${r.description} (${r.actor}) -> ${r.actual}`);
}

async function run() {
  console.log("==================================================");
  console.log("PETO PHASE 4A: PET RLS & AUTHORIZATION TEST SUITE");
  console.log("==================================================");

  const anonClient = createClient(SUPABASE_URL, ANON_KEY);

  // 1. Provision Synthetic Identities
  const ts = Date.now();
  const emailA = `sec_parent_a_${ts}@petotest.local`;
  const emailB = `sec_attacker_b_${ts}@petotest.local`;
  const emailC = `sec_friend_c_${ts}@petotest.local`;
  const pass = "SecP@ssw0rd!2026_Phase4A";

  console.log("\n[1] Creating Synthetic Test Users (Parent A, Attacker B, Friend C)...");
  const resA = await serviceSupabase.auth.admin.createUser({ email: emailA, password: pass, email_confirm: true, user_metadata: { full_name: "Parent A" } });
  const resB = await serviceSupabase.auth.admin.createUser({ email: emailB, password: pass, email_confirm: true, user_metadata: { full_name: "Attacker B" } });
  const resC = await serviceSupabase.auth.admin.createUser({ email: emailC, password: pass, email_confirm: true, user_metadata: { full_name: "Friend C" } });

  const userA = resA.data?.user;
  const userB = resB.data?.user;
  const userC = resC.data?.user;

  if (!userA || !userB || !userC) {
    console.error("Failed to provision test users");
    process.exit(1);
  }

  // Create profiles
  await serviceSupabase.from("profiles").upsert([
    { id: userA.id, username: `parenta_${ts}`, full_name: "Parent A" },
    { id: userB.id, username: `attackb_${ts}`, full_name: "Attacker B" },
    { id: userC.id, username: `friendc_${ts}`, full_name: "Friend C" },
  ]);

  // Sign in to get JWTs
  const authA = await anonClient.auth.signInWithPassword({ email: emailA, password: pass });
  const authB = await anonClient.auth.signInWithPassword({ email: emailB, password: pass });
  const authC = await anonClient.auth.signInWithPassword({ email: emailC, password: pass });

  const tokenA = authA.data?.session?.access_token || "";
  const tokenB = authB.data?.session?.access_token || "";
  const tokenC = authC.data?.session?.access_token || "";

  const clientA = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${tokenA}` } } });
  const clientB = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${tokenB}` } } });
  const clientC = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: `Bearer ${tokenC}` } } });

  // 2. Establish Social Follow Connection between Parent A and Friend C (Mutual or One-way)
  await serviceSupabase.from("follows").insert({
    follower_id: userC.id,
    following_id: userA.id,
  });

  // 3. Provision Pets
  console.log("\n[2] Provisioning Synthetic Pets (PUBLIC, CONNECTIONS, PRIVATE)...");
  // Pet 1: PUBLIC
  const { data: petPublic } = await serviceSupabase.from("pets").insert({
    name: `PublicPup_${ts}`,
    species: "DOG",
    profile_visibility: "PUBLIC",
    status: "ACTIVE",
  }).select().single();

  if (petPublic) {
    await serviceSupabase.from("pet_parents").insert({
      pet_id: petPublic.id,
      user_id: userA.id,
      relationship: "OWNER",
      status: "ACTIVE",
      is_primary: true,
      permissions: ["MANAGE_PROFILE", "MANAGE_PARENTS", "UPLOAD_MEDIA"],
    });
  }

  // Pet 2: CONNECTIONS
  const { data: petConn } = await serviceSupabase.from("pets").insert({
    name: `ConnCat_${ts}`,
    species: "CAT",
    profile_visibility: "CONNECTIONS",
    status: "ACTIVE",
  }).select().single();

  if (petConn) {
    await serviceSupabase.from("pet_parents").insert({
      pet_id: petConn.id,
      user_id: userA.id,
      relationship: "OWNER",
      status: "ACTIVE",
      is_primary: true,
      permissions: ["MANAGE_PROFILE", "MANAGE_PARENTS", "UPLOAD_MEDIA"],
    });
  }

  // Pet 3: PRIVATE
  const { data: petPriv } = await serviceSupabase.from("pets").insert({
    name: `SecretBird_${ts}`,
    species: "BIRD",
    profile_visibility: "PRIVATE",
    status: "ACTIVE",
  }).select().single();

  if (petPriv) {
    await serviceSupabase.from("pet_parents").insert({
      pet_id: petPriv.id,
      user_id: userA.id,
      relationship: "OWNER",
      status: "ACTIVE",
      is_primary: true,
      permissions: ["MANAGE_PROFILE", "MANAGE_PARENTS", "UPLOAD_MEDIA"],
    });
  }

  // Media record for Pet Private
  const { data: mediaRec } = await serviceSupabase.from("media").insert({
    user_id: userA.id,
    type: "image",
    url: "https://placeholder-peto.supabase.co/storage/v1/object/public/posts-images/test_pet.webp",
    mime_type: "image/webp",
  }).select().single();

  let petMediaPriv: any = null;
  if (petPriv && mediaRec) {
    const { data: pm } = await serviceSupabase.from("pet_media").insert({
      pet_id: petPriv.id,
      media_id: mediaRec.id,
      role: "PROFILE",
      is_primary: true,
    }).select().single();
    petMediaPriv = pm;
  }

  console.log("Synthetic pets, parent links, and media created.");

  // =========================================================================
  // RUNTIME TESTS: RLS-PET-01 TO RLS-PET-14
  // =========================================================================
  console.log("\n[3] Executing Runtime RLS & Authorization Tests...");

  // RLS-PET-01: pet_parents SELECT does not recurse
  const resP01 = await anonClient.from("pet_parents").select("*").limit(1);
  const recursed01 = resP01.error?.message?.includes("infinite recursion") || resP01.error?.code === "42P17";
  record({
    testId: "RLS-PET-01",
    description: "pet_parents SELECT does not recurse (no 42P17)",
    actor: "SEC-GUEST",
    target: "pet_parents (SELECT)",
    expected: "No 42P17 / No infinite recursion",
    actual: recursed01 ? `FAILED (42P17: ${resP01.error?.message})` : `CLEAN (HTTP ${resP01.status})`,
    pass: !recursed01,
  });

  // RLS-PET-02: pets SELECT does not recurse
  const resP02 = await anonClient.from("pets").select("*").limit(1);
  const recursed02 = resP02.error?.message?.includes("infinite recursion") || resP02.error?.code === "42P17";
  record({
    testId: "RLS-PET-02",
    description: "pets SELECT does not recurse (no 42P17)",
    actor: "SEC-GUEST",
    target: "pets (SELECT)",
    expected: "No 42P17 / No infinite recursion",
    actual: recursed02 ? `FAILED (42P17: ${resP02.error?.message})` : `CLEAN (HTTP ${resP02.status})`,
    pass: !recursed02,
  });

  // RLS-PET-03: pet_media SELECT does not recurse
  const resP03 = await anonClient.from("pet_media").select("*").limit(1);
  const recursed03 = resP03.error?.message?.includes("infinite recursion") || resP03.error?.code === "42P17";
  record({
    testId: "RLS-PET-03",
    description: "pet_media SELECT does not recurse (no 42P17)",
    actor: "SEC-GUEST",
    target: "pet_media (SELECT)",
    expected: "No 42P17 / No infinite recursion",
    actual: recursed03 ? `FAILED (42P17: ${resP03.error?.message})` : `CLEAN (HTTP ${resP03.status})`,
    pass: !recursed03,
  });

  // RLS-PET-04: Guest can read PUBLIC pet
  if (petPublic) {
    const resP04 = await anonClient.from("pets").select("id, name").eq("id", petPublic.id).maybeSingle();
    const canReadPub = resP04.data?.id === petPublic.id;
    record({
      testId: "RLS-PET-04",
      description: "Guest can read PUBLIC pet",
      actor: "SEC-GUEST",
      target: "pets (PUBLIC)",
      expected: "ALLOW (Row returned)",
      actual: canReadPub ? `ALLOW (Found ${resP04.data?.name})` : `DENIED / ERROR (${resP04.error?.message || "Not found"})`,
      pass: canReadPub,
    });
  }

  // RLS-PET-05: Guest cannot read PRIVATE pet
  if (petPriv) {
    const resP05 = await anonClient.from("pets").select("id, name").eq("id", petPriv.id).maybeSingle();
    const leakedPrivGuest = !!resP05.data?.id;
    record({
      testId: "RLS-PET-05",
      description: "Guest cannot read PRIVATE pet",
      actor: "SEC-GUEST",
      target: "pets (PRIVATE)",
      expected: "DENY (0 rows returned)",
      actual: leakedPrivGuest ? "LEAKED (Row returned to guest)" : `DENIED (0 rows returned)`,
      pass: !leakedPrivGuest,
    });
  }

  // RLS-PET-06: User B cannot read User A PRIVATE pet
  if (petPriv) {
    const resP06 = await clientB.from("pets").select("id, name").eq("id", petPriv.id).maybeSingle();
    const leakedPrivUserB = !!resP06.data?.id;
    record({
      testId: "RLS-PET-06",
      description: "User B cannot read User A PRIVATE pet",
      actor: "SEC-USER-B (Attacker)",
      target: "pets (PRIVATE)",
      expected: "DENY (0 rows returned)",
      actual: leakedPrivUserB ? "LEAKED (Row returned to User B)" : `DENIED (0 rows returned)`,
      pass: !leakedPrivUserB,
    });
  }

  // RLS-PET-07: Authorized parent can read PRIVATE pet
  if (petPriv) {
    const resP07 = await clientA.from("pets").select("id, name").eq("id", petPriv.id).maybeSingle();
    const parentCanRead = resP07.data?.id === petPriv.id;
    record({
      testId: "RLS-PET-07",
      description: "Authorized parent can read PRIVATE pet",
      actor: "SEC-USER-A (Parent)",
      target: "pets (PRIVATE)",
      expected: "ALLOW (Row returned to parent)",
      actual: parentCanRead ? `ALLOW (Found ${resP07.data?.name})` : `DENIED (${resP07.error?.message || "Empty"})`,
      pass: parentCanRead,
    });
  }

  // RLS-PET-08: Unconnected User B cannot read CONNECTIONS pet
  if (petConn) {
    const resP08 = await clientB.from("pets").select("id, name").eq("id", petConn.id).maybeSingle();
    const leakedConnUserB = !!resP08.data?.id;
    record({
      testId: "RLS-PET-08",
      description: "Unconnected User B cannot read CONNECTIONS pet",
      actor: "SEC-USER-B (Unconnected)",
      target: "pets (CONNECTIONS)",
      expected: "DENY (0 rows returned)",
      actual: leakedConnUserB ? "LEAKED (Row returned to unconnected user)" : `DENIED (0 rows returned)`,
      pass: !leakedConnUserB,
    });
  }

  // RLS-PET-09: Valid connected user can read CONNECTIONS pet
  if (petConn) {
    const resP09 = await clientC.from("pets").select("id, name").eq("id", petConn.id).maybeSingle();
    const friendCanRead = resP09.data?.id === petConn.id;
    record({
      testId: "RLS-PET-09",
      description: "Valid connected user can read CONNECTIONS pet",
      actor: "SEC-USER-C (Follower)",
      target: "pets (CONNECTIONS)",
      expected: "ALLOW (Row returned to connected follower)",
      actual: friendCanRead ? `ALLOW (Found ${resP09.data?.name})` : `DENIED (${resP09.error?.message || "Empty"})`,
      pass: friendCanRead,
    });
  }

  // RLS-PET-10: User B cannot self-add as parent of User A pet
  if (petPriv) {
    const resP10 = await clientB.from("pet_parents").insert({
      pet_id: petPriv.id,
      user_id: userB.id,
      relationship: "OWNER",
      status: "ACTIVE",
    });
    // Check if inserted
    const checkEsc = await serviceSupabase.from("pet_parents")
      .select("*")
      .eq("pet_id", petPriv.id)
      .eq("user_id", userB.id)
      .maybeSingle();
    const escalated = !!checkEsc.data;
    record({
      testId: "RLS-PET-10",
      description: "User B cannot self-add as parent of User A pet",
      actor: "SEC-USER-B (Attacker)",
      target: "pet_parents (Privilege Escalation)",
      expected: "DENY (Insert rejected via RLS; not created in DB)",
      actual: escalated ? "CRITICAL: Self-escalation succeeded!" : `BLOCKED (Status ${resP10.status}, ${resP10.error?.message || "Rejected"})`,
      pass: !escalated,
    });
  }

  // RLS-PET-11: User B cannot modify User A parent relationship
  if (petPriv) {
    const resP11 = await clientB.from("pet_parents")
      .update({ relationship: "CARETAKER" })
      .eq("pet_id", petPriv.id)
      .eq("user_id", userA.id);
    const checkA = await serviceSupabase.from("pet_parents")
      .select("relationship")
      .eq("pet_id", petPriv.id)
      .eq("user_id", userA.id)
      .single();
    const tamperedRel = checkA.data?.relationship === "CARETAKER";
    record({
      testId: "RLS-PET-11",
      description: "User B cannot modify User A parent relationship",
      actor: "SEC-USER-B (Attacker)",
      target: "pet_parents (Tamper Relationship)",
      expected: "DENY (Update rejected; unchanged in DB)",
      actual: tamperedRel ? "VULNERABLE (Relationship modified)" : `PROTECTED (Relationship is ${checkA.data?.relationship})`,
      pass: !tamperedRel,
    });
  }

  // RLS-PET-12: User B cannot delete User A parent relationship
  if (petPriv) {
    const resP12 = await clientB.from("pet_parents")
      .delete()
      .eq("pet_id", petPriv.id)
      .eq("user_id", userA.id);
    const checkStillExists = await serviceSupabase.from("pet_parents")
      .select("id")
      .eq("pet_id", petPriv.id)
      .eq("user_id", userA.id)
      .maybeSingle();
    const parentStillExists = !!checkStillExists.data?.id;
    record({
      testId: "RLS-PET-12",
      description: "User B cannot delete User A parent relationship",
      actor: "SEC-USER-B (Attacker)",
      target: "pet_parents (Delete Parent)",
      expected: "DENY (Delete rejected; record remains)",
      actual: parentStillExists ? "PROTECTED (Record remains intact)" : "VULNERABLE (Parent record deleted!)",
      pass: parentStillExists,
    });
  }

  // RLS-PET-13: unauthorized pet_media access denied
  if (petPriv && petMediaPriv) {
    const resP13 = await clientB.from("pet_media").select("*").eq("id", petMediaPriv.id).maybeSingle();
    const leakedMedia = !!resP13.data?.id;
    record({
      testId: "RLS-PET-13",
      description: "Unauthorized pet_media access denied",
      actor: "SEC-USER-B (Attacker)",
      target: "pet_media (Metadata)",
      expected: "DENY (0 rows returned to User B)",
      actual: leakedMedia ? "LEAKED (Pet media returned to User B)" : "DENIED (0 rows returned)",
      pass: !leakedMedia,
    });
  }

  // RLS-PET-14: authorized pet_media access works as intended
  if (petPriv && petMediaPriv) {
    const resP14 = await clientA.from("pet_media").select("*").eq("id", petMediaPriv.id).maybeSingle();
    const parentCanSeeMedia = resP14.data?.id === petMediaPriv.id;
    record({
      testId: "RLS-PET-14",
      description: "Authorized pet_media access works as intended",
      actor: "SEC-USER-A (Parent)",
      target: "pet_media (Metadata)",
      expected: "ALLOW (Row returned to parent)",
      actual: parentCanSeeMedia ? "ALLOW (Found media row)" : `DENIED (${resP14.error?.message || "Empty"})`,
      pass: parentCanSeeMedia,
    });
  }

  // =========================================================================
  // BACKEND API REGRESSION TESTS
  // =========================================================================
  console.log("\n[4] Executing Backend Express API Regression Tests...");

  async function api(path: string, token?: string) {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(`${BACKEND_BASE}${path}`, { headers });
    let data = null;
    try { data = await res.json(); } catch {}
    return { status: res.status, data };
  }

  // API Backend Test 1: PUBLIC pet accessible
  if (petPublic) {
    const apiPub = await api(`/api/pets/${petPublic.id}`);
    record({
      testId: "API-PET-01",
      description: "Backend: Guest can view PUBLIC pet",
      actor: "SEC-GUEST",
      target: "/api/pets/:id (PUBLIC)",
      expected: "HTTP 200 OK",
      actual: `HTTP ${apiPub.status} (Success: ${apiPub.data?.success})`,
      pass: apiPub.status === 200 && apiPub.data?.success,
    });
  }

  // API Backend Test 2: PRIVATE pet inaccessible to unrelated User B (opaque 404)
  if (petPriv) {
    const apiPriv = await api(`/api/pets/${petPriv.id}`, tokenB);
    record({
      testId: "API-PET-02",
      description: "Backend: User B accessing PRIVATE pet returns 404 opaque boundary",
      actor: "SEC-USER-B",
      target: "/api/pets/:id (PRIVATE)",
      expected: "HTTP 404 Not Found",
      actual: `HTTP ${apiPriv.status} (${apiPriv.data?.message || "Found"})`,
      pass: apiPriv.status === 404,
    });
  }

  // API Backend Test 3: CONNECTIONS pet inaccessible to unconnected User B
  if (petConn) {
    const apiConnB = await api(`/api/pets/${petConn.id}`, tokenB);
    record({
      testId: "API-PET-03",
      description: "Backend: Unconnected User B accessing CONNECTIONS pet returns 404",
      actor: "SEC-USER-B (Unconnected)",
      target: "/api/pets/:id (CONNECTIONS)",
      expected: "HTTP 404 Not Found",
      actual: `HTTP ${apiConnB.status}`,
      pass: apiConnB.status === 404,
    });
  }

  // API Backend Test 4: CONNECTIONS pet accessible to connected Friend C
  if (petConn) {
    const apiConnC = await api(`/api/pets/${petConn.id}`, tokenC);
    record({
      testId: "API-PET-04",
      description: "Backend: Connected Friend C can access CONNECTIONS pet",
      actor: "SEC-USER-C (Follower)",
      target: "/api/pets/:id (CONNECTIONS)",
      expected: "HTTP 200 OK",
      actual: `HTTP ${apiConnC.status} (Success: ${apiConnC.data?.success})`,
      pass: apiConnC.status === 200 && apiConnC.data?.success,
    });
  }

  // API Backend Test 5: Authorized parent A can access PRIVATE pet
  if (petPriv) {
    const apiPrivA = await api(`/api/pets/${petPriv.id}`, tokenA);
    record({
      testId: "API-PET-05",
      description: "Backend: Authorized parent can access PRIVATE pet",
      actor: "SEC-USER-A (Parent)",
      target: "/api/pets/:id (PRIVATE)",
      expected: "HTTP 200 OK",
      actual: `HTTP ${apiPrivA.status} (Success: ${apiPrivA.data?.success})`,
      pass: apiPrivA.status === 200 && apiPrivA.data?.success,
    });
  }

  // =========================================================================
  // CLEANUP
  // =========================================================================
  console.log("\n[5] Cleaning up synthetic test resources...");
  try {
    if (petMediaPriv) await serviceSupabase.from("pet_media").delete().eq("id", petMediaPriv.id);
    if (mediaRec) await serviceSupabase.from("media").delete().eq("id", mediaRec.id);
    if (petPriv) {
      await serviceSupabase.from("pet_parents").delete().eq("pet_id", petPriv.id);
      await serviceSupabase.from("pets").delete().eq("id", petPriv.id);
    }
    if (petConn) {
      await serviceSupabase.from("pet_parents").delete().eq("pet_id", petConn.id);
      await serviceSupabase.from("pets").delete().eq("id", petConn.id);
    }
    if (petPublic) {
      await serviceSupabase.from("pet_parents").delete().eq("pet_id", petPublic.id);
      await serviceSupabase.from("pets").delete().eq("id", petPublic.id);
    }
    await serviceSupabase.from("follows").delete().eq("follower_id", userC.id).eq("following_id", userA.id);
    await serviceSupabase.from("profiles").delete().in("id", [userA.id, userB.id, userC.id]);
    await serviceSupabase.auth.admin.deleteUser(userA.id);
    await serviceSupabase.auth.admin.deleteUser(userB.id);
    await serviceSupabase.auth.admin.deleteUser(userC.id);
    console.log("Cleanup completed successfully.");
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
}

run().catch((e) => {
  console.error("Fatal test runner error:", e);
  process.exit(1);
});
