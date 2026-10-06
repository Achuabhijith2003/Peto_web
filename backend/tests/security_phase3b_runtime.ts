import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { supabase as serviceSupabase } from "../src/config/supabase.js";

const BACKEND_BASE = "http://localhost:5000";
const SUPABASE_URL = process.env.SUPABASE_URL || "https://ednleoavhuxlarnnlmkq.supabase.co";
const ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

interface TestResult {
  testId: string;
  category: "RLS" | "API_IDOR" | "BUSINESS" | "PET_PRIVACY" | "VERIFICATION" | "ADMIN" | "ADS";
  target: string;
  attackIdentity: string;
  victimIdentity: string;
  requestType: string;
  expectedResult: string;
  actualResult: string;
  pass: boolean;
  evidence: string;
  securityImpact: string;
}

export const results: TestResult[] = [];

function record(res: TestResult) {
  results.push(res);
  const statusStr = res.pass ? "✅ PASS" : "❌ FAIL";
  console.log(`[${res.testId}] ${statusStr} - ${res.target} (${res.attackIdentity}) -> Actual: ${res.actualResult}`);
}

async function run() {
  console.log("==================================================");
  console.log("PETO PHASE 3B: AUTHORIZED RUNTIME SECURITY SUITE");
  console.log("==================================================");

  // 1. Verify Environment
  console.log("\n[1] Verifying Target Environment...");
  const isDev = process.env.NODE_ENV === "development";
  const isDevSupabase = SUPABASE_URL.includes("ednleoavhuxlarnnlmkq");
  if (!isDev || !isDevSupabase) {
    console.error("FATAL: Target is NOT the authorized development environment!");
    process.exit(1);
  }
  console.log(`Target verified: DEV (${SUPABASE_URL}, Backend: ${BACKEND_BASE})`);

  // 2. Initialize Anonymous and Authenticated Clients
  const anonClient = createClient(SUPABASE_URL, ANON_KEY);

  // Synthetic Test Users
  const timestamp = Date.now();
  const emailUserA = `sec_user_a_${timestamp}@petotest.local`;
  const emailUserB = `sec_user_b_${timestamp}@petotest.local`;
  const emailMember = `sec_user_member_${timestamp}@petotest.local`;
  const testPassword = "SecP@ssw0rd!2026_RuntimeTest";

  console.log("\n[2] Provisioning Synthetic Test Users...");
  const userARes = await serviceSupabase.auth.admin.createUser({
    email: emailUserA,
    password: testPassword,
    email_confirm: true,
    user_metadata: { full_name: "SEC User A" },
  });
  const userBRes = await serviceSupabase.auth.admin.createUser({
    email: emailUserB,
    password: testPassword,
    email_confirm: true,
    user_metadata: { full_name: "SEC User B" },
  });
  const memberRes = await serviceSupabase.auth.admin.createUser({
    email: emailMember,
    password: testPassword,
    email_confirm: true,
    user_metadata: { full_name: "SEC Business Member" },
  });

  const userA = userARes.data?.user;
  const userB = userBRes.data?.user;
  const userMember = memberRes.data?.user;

  if (!userA || !userB || !userMember) {
    console.error("Failed to provision test users:", { userA: userARes.error, userB: userBRes.error });
    process.exit(1);
  }

  // Obtain JWT tokens
  const authA = await anonClient.auth.signInWithPassword({ email: emailUserA, password: testPassword });
  const authB = await anonClient.auth.signInWithPassword({ email: emailUserB, password: testPassword });
  const authMember = await anonClient.auth.signInWithPassword({ email: emailMember, password: testPassword });

  const tokenA = authA.data?.session?.access_token || "";
  const tokenB = authB.data?.session?.access_token || "";
  const tokenMember = authMember.data?.session?.access_token || "";

  const clientA = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${tokenA}` } },
  });
  const clientB = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${tokenB}` } },
  });
  const clientMember = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${tokenMember}` } },
  });

  console.log("Tokens acquired for SEC-USER-A, SEC-USER-B, and SEC-BUSINESS-MEMBER");

  // Create base synthetic resources
  console.log("\n[3] Creating Synthetic Test Resources...");

  // Profiles
  await serviceSupabase.from("profiles").upsert([
    { id: userA.id, username: `seca_${timestamp}`, full_name: "SEC User A", email: emailUserA },
    { id: userB.id, username: `secb_${timestamp}`, full_name: "SEC User B", email: emailUserB },
    { id: userMember.id, username: `secm_${timestamp}`, full_name: "SEC Member", email: emailMember },
  ]);

  // User A Post
  const { data: postA } = await serviceSupabase.from("posts").insert({
    user_id: userA.id,
    content: "Security Test Post A",
    visibility: "public",
  }).select().single();

  // User A Comment on Post A
  const { data: commentA } = await serviceSupabase.from("comments").insert({
    user_id: userA.id,
    post_id: postA?.id,
    comment: "Security Test Comment A",
  }).select().single();

  // User A Bookmark on Post A
  const { data: bookmarkA } = await serviceSupabase.from("bookmarks").insert({
    user_id: userA.id,
    post_id: postA?.id,
  }).select().single();

  // User A Pets: PUBLIC, CONNECTIONS, PRIVATE
  const { data: petPublic } = await serviceSupabase.from("pets").insert({
    name: "PetPublicA",
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
    });
  }

  const { data: petConnections } = await serviceSupabase.from("pets").insert({
    name: "PetConnectionsA",
    species: "CAT",
    profile_visibility: "CONNECTIONS",
    status: "ACTIVE",
  }).select().single();
  if (petConnections) {
    await serviceSupabase.from("pet_parents").insert({
      pet_id: petConnections.id,
      user_id: userA.id,
      relationship: "OWNER",
      status: "ACTIVE",
      is_primary: true,
    });
  }

  const { data: petPrivate } = await serviceSupabase.from("pets").insert({
    name: "PetPrivateA",
    species: "BIRD",
    profile_visibility: "PRIVATE",
    status: "ACTIVE",
  }).select().single();
  if (petPrivate) {
    await serviceSupabase.from("pet_parents").insert({
      pet_id: petPrivate.id,
      user_id: userA.id,
      relationship: "OWNER",
      status: "ACTIVE",
      is_primary: true,
    });
  }

  // Business A belonging to User A
  const { data: businessA } = await serviceSupabase.from("business_identities").insert({
    name: `Business A ${timestamp}`,
    owner_user_id: userA.id,
    business_type: "RETAIL",
  }).select().single();

  if (businessA) {
    await serviceSupabase.from("business_memberships").insert([
      { business_id: businessA.id, user_id: userA.id, role: "OWNER", can_manage_verification: true },
      { business_id: businessA.id, user_id: userMember.id, role: "MEMBER", can_manage_verification: false },
    ]);
  }

  // Verification Application for User A
  const { data: verAppA } = await serviceSupabase.from("verification_applications").insert({
    user_id: userA.id,
    type: "PERSONAL",
    status: "PENDING",
  }).select().single();

  // Notification for User A
  const { data: notifA } = await serviceSupabase.from("notifications").insert({
    user_id: userA.id,
    actor_id: userB.id,
    type: "LIKE",
    title: "Test Notification",
    message: "User B liked your post",
  }).select().single();

  console.log("Synthetic resources provisioned successfully.");

  // =========================================================================
  // SECTION 3-13: SUPABASE RUNTIME RLS TESTING
  // =========================================================================
  console.log("\n==================================================");
  console.log("SECTION 1: SUPABASE RUNTIME RLS TESTING (POSTGREST)");
  console.log("==================================================");

  const rlsTables = [
    { name: "profiles", idCol: "id" },
    { name: "posts", idCol: "id" },
    { name: "comments", idCol: "id" },
    { name: "likes", idCol: "id" },
    { name: "bookmarks", idCol: "id" },
    { name: "follows", idCol: "id" },
    { name: "pets", idCol: "id" },
    { name: "pet_parents", idCol: "id" },
    { name: "pet_media", idCol: "id" },
    { name: "business_identities", idCol: "id" },
    { name: "business_memberships", idCol: "business_id" },
    { name: "communities", idCol: "id" },
    { name: "community_members", idCol: "id" },
    { name: "notifications", idCol: "id" },
    { name: "verification_applications", idCol: "id" },
    { name: "verification_documents", idCol: "id" },
    { name: "verification_audit_events", idCol: "id" },
    { name: "advertisers", idCol: "id" },
    { name: "payment_transactions", idCol: "id" },
    { name: "payment_ledger", idCol: "id" },
    { name: "admin_users", idCol: "id" },
    { name: "admin_roles", idCol: "id" },
    { name: "admin_permissions", idCol: "id" },
    { name: "oauth_exchange_codes", idCol: "code_hash" },
  ];

  // Test RLS-01: Anonymous writes against all sensitive tables
  for (const t of rlsTables) {
    const dummyObj: any = {};
    dummyObj[t.idCol] = "00000000-0000-0000-0000-000000000000";
    const res = await anonClient.from(t.name).insert(dummyObj);
    const denied = res.status === 401 || res.status === 403 || res.status === 404 || res.status === 500;
    record({
      testId: `RLS-ANON-INS-${t.name.toUpperCase()}`,
      category: "RLS",
      target: `PostgREST INSERT ${t.name}`,
      attackIdentity: "SEC-GUEST (ANON)",
      victimIdentity: "N/A",
      requestType: "POST (Direct PostgREST)",
      expectedResult: "DENY (HTTP 401/403/RLS Error)",
      actualResult: `HTTP ${res.status} (${res.error?.message || "No error"})`,
      pass: denied,
      evidence: JSON.stringify({ status: res.status, error: res.error?.message }),
      securityImpact: denied ? "Protected" : "CRITICAL: Anonymous write allowed into database table",
    });
  }

  // Test RLS-02: Pet Parents Infinite Recursion & Visibility
  const petParentSelAnon = await anonClient.from("pet_parents").select("*").limit(1);
  record({
    testId: "RLS-PET-PARENTS-RECURSION",
    category: "PET_PRIVACY",
    target: "pet_parents (ANON SELECT)",
    attackIdentity: "SEC-GUEST",
    victimIdentity: "User A",
    requestType: "GET (Direct PostgREST)",
    expectedResult: "DENY or clean evaluation without 500 infinite recursion",
    actualResult: `HTTP ${petParentSelAnon.status} (${petParentSelAnon.error?.message || "OK"})`,
    pass: !petParentSelAnon.error?.message?.includes("infinite recursion"),
    evidence: JSON.stringify({ status: petParentSelAnon.status, error: petParentSelAnon.error?.message }),
    securityImpact: petParentSelAnon.error?.message?.includes("infinite recursion")
      ? "HIGH: Supabase RLS policy on pet_parents crashes with infinite recursion (PETO-SEC-10)"
      : "Protected",
  });

  // Test RLS-03: Pet Parent Privilege Escalation (User B assigns self to Pet A)
  if (petPrivate) {
    const escRes = await clientB.from("pet_parents").insert({
      pet_id: petPrivate.id,
      user_id: userB.id,
      relationship: "OWNER",
      status: "ACTIVE",
    });
    const escalated = escRes.status === 201;
    record({
      testId: "RLS-PET-PARENT-ESCALATION",
      category: "PET_PRIVACY",
      target: "pet_parents (Unauthorized self-assignment as OWNER)",
      attackIdentity: "SEC-USER-B",
      victimIdentity: "User A (Pet A Private)",
      requestType: "POST (Direct PostgREST)",
      expectedResult: "DENY (HTTP 401/403/RLS Error)",
      actualResult: `HTTP ${escRes.status} (${escRes.error?.message || "Success"})`,
      pass: !escalated,
      evidence: JSON.stringify({ status: escRes.status, error: escRes.error?.message }),
      securityImpact: escalated ? "CRITICAL: Cross-user parent privilege escalation via direct PostgREST" : "Blocked by RLS/recursion",
    });
  }

  // Test RLS-04: Cross-User Post Deletion via PostgREST
  if (postA) {
    const crossPostDel = await clientB.from("posts").delete().eq("id", postA.id);
    const checkPost = await serviceSupabase.from("posts").select("id").eq("id", postA.id).single();
    const stillExists = !!checkPost.data?.id;
    record({
      testId: "RLS-POST-CROSS-DELETE",
      category: "RLS",
      target: "posts (User B deletes Post A)",
      attackIdentity: "SEC-USER-B",
      victimIdentity: "User A",
      requestType: "DELETE (Direct PostgREST)",
      expectedResult: "DENY (Post remains intact)",
      actualResult: `Deleted: ${!stillExists}, Response: HTTP ${crossPostDel.status}`,
      pass: stillExists,
      evidence: JSON.stringify({ status: crossPostDel.status, stillExists }),
      securityImpact: !stillExists ? "HIGH: Direct PostgREST BOLA allows deleting foreign posts" : "Protected",
    });
  }

  // Test RLS-05: Cross-User Comment Modification via PostgREST
  if (commentA) {
    const crossCommentUpd = await clientB.from("comments").update({ comment: "Tampered Comment" }).eq("id", commentA.id);
    const checkComment = await serviceSupabase.from("comments").select("comment").eq("id", commentA.id).single();
    const tampered = checkComment.data?.comment === "Tampered Comment";
    record({
      testId: "RLS-COMMENT-CROSS-UPDATE",
      category: "RLS",
      target: "comments (User B modifies Comment A)",
      attackIdentity: "SEC-USER-B",
      victimIdentity: "User A",
      requestType: "PATCH (Direct PostgREST)",
      expectedResult: "DENY (Comment remains untampered)",
      actualResult: `Tampered: ${tampered}, Status: ${crossCommentUpd.status}`,
      pass: !tampered,
      evidence: JSON.stringify({ status: crossCommentUpd.status, commentValue: checkComment.data?.comment }),
      securityImpact: tampered ? "HIGH: Direct PostgREST allows modifying foreign comments" : "Protected",
    });
  }

  // Test RLS-06: Business Membership Escalation (Outsider adds self to Business A)
  if (businessA) {
    const joinRes = await clientB.from("business_memberships").insert({
      business_id: businessA.id,
      user_id: userB.id,
      role: "OWNER",
      can_manage_verification: true,
    });
    const checkMember = await serviceSupabase.from("business_memberships")
      .select("*")
      .eq("business_id", businessA.id)
      .eq("user_id", userB.id)
      .maybeSingle();
    const added = !!checkMember.data;
    record({
      testId: "RLS-BIZ-MEMBERSHIP-SELF-INJECT",
      category: "BUSINESS",
      target: "business_memberships (Outsider inserts self as OWNER)",
      attackIdentity: "SEC-USER-B (Outsider)",
      victimIdentity: "User A (Business A)",
      requestType: "POST (Direct PostgREST)",
      expectedResult: "DENY (Membership insert rejected)",
      actualResult: `Added: ${added}, Status: ${joinRes.status} (${joinRes.error?.message || "OK"})`,
      pass: !added,
      evidence: JSON.stringify({ status: joinRes.status, added, error: joinRes.error?.message }),
      securityImpact: added ? "CRITICAL: Direct PostgREST allows unauthorized takeover of businesses" : "Protected",
    });
  }

  // Test RLS-07: Verification Application Self-Approval via PostgREST
  if (verAppA) {
    const apprvRes = await clientA.from("verification_applications")
      .update({ status: "APPROVED", reviewed_by: userA.id, reviewed_at: new Date().toISOString() })
      .eq("id", verAppA.id);
    const checkApp = await serviceSupabase.from("verification_applications").select("status").eq("id", verAppA.id).single();
    const selfApproved = checkApp.data?.status === "APPROVED";
    record({
      testId: "RLS-VERIFICATION-SELF-APPROVE",
      category: "VERIFICATION",
      target: "verification_applications (User A approves self)",
      attackIdentity: "SEC-USER-A",
      victimIdentity: "Platform Admin Boundary",
      requestType: "PATCH (Direct PostgREST)",
      expectedResult: "DENY (Status cannot be changed to APPROVED by applicant)",
      actualResult: `Self-Approved: ${selfApproved}, Status: ${apprvRes.status}`,
      pass: !selfApproved,
      evidence: JSON.stringify({ status: apprvRes.status, currentStatus: checkApp.data?.status, error: apprvRes.error?.message }),
      securityImpact: selfApproved ? "CRITICAL: Applicant can self-approve verification via PostgREST" : "Protected",
    });
  }

  // Test RLS-08: Financial Mutation via PostgREST (advertisers balance / payment_ledger)
  const advMutRes = await clientA.from("advertisers").update({ balance: 999999 }).eq("user_id", userA.id);
  const ledgerMutRes = await clientA.from("payment_ledger").insert({
    user_id: userA.id,
    amount: 100000,
    direction: "CREDIT",
    balance_after: 100000,
  });
  const advBlocked = advMutRes.status !== 200 && advMutRes.status !== 204;
  const ledgerBlocked = ledgerMutRes.status !== 201;
  record({
    testId: "RLS-FINANCIAL-DIRECT-MUTATION",
    category: "RLS",
    target: "advertisers / payment_ledger (Direct balance manipulation)",
    attackIdentity: "SEC-USER-A",
    victimIdentity: "Platform Financial Ledger",
    requestType: "PATCH/POST (Direct PostgREST)",
    expectedResult: "DENY (Direct financial writes blocked by RLS)",
    actualResult: `Advertiser status: ${advMutRes.status}, Ledger status: ${ledgerMutRes.status}`,
    pass: advBlocked && ledgerBlocked,
    evidence: JSON.stringify({ advStatus: advMutRes.status, advError: advMutRes.error?.message, ledgerStatus: ledgerMutRes.status, ledgerError: ledgerMutRes.error?.message }),
    securityImpact: (!advBlocked || !ledgerBlocked) ? "CRITICAL: Direct balance/ledger manipulation via PostgREST" : "Protected",
  });

  // Test RLS-09: Admin Table Privilege Escalation via PostgREST
  const adminInsRes = await clientA.from("admin_users").insert({
    user_id: userA.id,
    email: emailUserA,
    is_active: true,
  });
  const checkAdmin = await serviceSupabase.from("admin_users").select("*").eq("user_id", userA.id).maybeSingle();
  const becameAdmin = !!checkAdmin.data;
  record({
    testId: "RLS-ADMIN-SELF-GRANT",
    category: "ADMIN",
    target: "admin_users (Normal user grants self Admin privilege)",
    attackIdentity: "SEC-USER-A",
    victimIdentity: "Platform Administrator Perimeter",
    requestType: "POST (Direct PostgREST)",
    expectedResult: "DENY (HTTP 401/403/RLS violation)",
    actualResult: `Became Admin: ${becameAdmin}, Status: ${adminInsRes.status}`,
    pass: !becameAdmin,
    evidence: JSON.stringify({ status: adminInsRes.status, becameAdmin, error: adminInsRes.error?.message }),
    securityImpact: becameAdmin ? "CRITICAL: Normal user can self-promote to Super Admin via PostgREST" : "Protected",
  });

  // Test RLS-10: OAuth Exchange Code Access via PostgREST
  const dummyHash = "sec_test_hash_" + timestamp;
  await serviceSupabase.from("oauth_exchange_codes").insert({
    code_hash: dummyHash,
    payload: { sensitive: "auth_token" },
    expires_at: new Date(Date.now() + 60000).toISOString(),
  });
  const oauthReadAnon = await anonClient.from("oauth_exchange_codes").select("*").eq("code_hash", dummyHash);
  const oauthReadAuth = await clientA.from("oauth_exchange_codes").select("*").eq("code_hash", dummyHash);
  const leakedAnon = (oauthReadAnon.data && oauthReadAnon.data.length > 0);
  const leakedAuth = (oauthReadAuth.data && oauthReadAuth.data.length > 0);
  await serviceSupabase.from("oauth_exchange_codes").delete().eq("code_hash", dummyHash);

  record({
    testId: "RLS-OAUTH-TABLE-ACCESS",
    category: "RLS",
    target: "oauth_exchange_codes (Direct read of pending OAuth exchanges)",
    attackIdentity: "SEC-GUEST and SEC-USER-A",
    victimIdentity: "Active OAuth sessions",
    requestType: "GET (Direct PostgREST)",
    expectedResult: "DENY (0 rows returned to Anon and Normal Users)",
    actualResult: `Anon returned ${oauthReadAnon.data?.length || 0} rows; Auth returned ${oauthReadAuth.data?.length || 0} rows`,
    pass: !leakedAnon && !leakedAuth,
    evidence: JSON.stringify({ anonRows: oauthReadAnon.data?.length, authRows: oauthReadAuth.data?.length }),
    securityImpact: (leakedAnon || leakedAuth) ? "CRITICAL: PostgREST leaks raw OAuth sync exchange payloads" : "Protected",
  });

  // =========================================================================
  // SECTION 14-17: BACKEND API IDOR / BOLA RUNTIME TESTING
  // =========================================================================
  console.log("\n==================================================");
  console.log("SECTION 2: BACKEND API IDOR / BOLA RUNTIME TESTING");
  console.log("==================================================");

  async function api(path: string, options: { method?: string; token?: string; body?: any; headers?: Record<string, string> } = {}) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };
    if (options.token) {
      headers["Authorization"] = `Bearer ${options.token}`;
    }
    const res = await fetch(`${BACKEND_BASE}${path}`, {
      method: options.method || "GET",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { status: res.status, headers: res.headers, data };
  }

  // API-IDOR-01: User B attempts to PATCH User A's profile
  const pEditRes = await api("/api/users/profile", {
    method: "PATCH",
    token: tokenB,
    body: { id: userA.id, full_name: "Tampered By B" },
  });
  const checkUserA = await serviceSupabase.from("profiles").select("full_name").eq("id", userA.id).single();
  const userATampered = checkUserA.data?.full_name === "Tampered By B";
  record({
    testId: "API-IDOR-01-PROFILE-EDIT",
    category: "API_IDOR",
    target: "PATCH /api/users/profile (ID substitution)",
    attackIdentity: "SEC-USER-B",
    victimIdentity: "User A",
    requestType: "PATCH (JSON body contains foreign id)",
    expectedResult: "DENY / Self-only mutation (User A unchanged)",
    actualResult: `User A Tampered: ${userATampered}, Status: ${pEditRes.status}`,
    pass: !userATampered,
    evidence: JSON.stringify({ status: pEditRes.status, profileName: checkUserA.data?.full_name }),
    securityImpact: userATampered ? "HIGH: BOLA allows arbitrary cross-user profile tampering" : "Protected",
  });

  // API-IDOR-02: User B attempts to DELETE User A's post
  if (postA) {
    const postDelRes = await api(`/api/posts/${postA.id}`, {
      method: "DELETE",
      token: tokenB,
    });
    const checkPostAlive = await serviceSupabase.from("posts").select("id").eq("id", postA.id).single();
    const postAlive = !!checkPostAlive.data?.id;
    record({
      testId: "API-IDOR-02-POST-DELETE",
      category: "API_IDOR",
      target: "DELETE /api/posts/:id (Unauthorized deletion)",
      attackIdentity: "SEC-USER-B",
      victimIdentity: "User A (Post A)",
      requestType: "DELETE",
      expectedResult: "HTTP 403 Forbidden (Post intact)",
      actualResult: `HTTP ${postDelRes.status}, Post Alive: ${postAlive}`,
      pass: postDelRes.status === 403 && postAlive,
      evidence: JSON.stringify({ status: postDelRes.status, message: postDelRes.data?.message, postAlive }),
      securityImpact: !postAlive ? "HIGH: BOLA permits deleting posts of other users" : "Protected",
    });
  }

  // API-IDOR-03: User B attempts to DELETE User A's comment
  if (commentA) {
    const commDelRes = await api(`/api/comments/${commentA.id}`, {
      method: "DELETE",
      token: tokenB,
    });
    const checkCommAlive = await serviceSupabase.from("comments").select("id").eq("id", commentA.id).single();
    const commAlive = !!checkCommAlive.data?.id;
    record({
      testId: "API-IDOR-03-COMMENT-DELETE",
      category: "API_IDOR",
      target: "DELETE /api/comments/:id (Unauthorized deletion)",
      attackIdentity: "SEC-USER-B",
      victimIdentity: "User A (Comment A)",
      requestType: "DELETE",
      expectedResult: "HTTP 403 / 500 Unauthorized (Comment intact)",
      actualResult: `HTTP ${commDelRes.status}, Comment Alive: ${commAlive}`,
      pass: commAlive && (commDelRes.status === 403 || (commDelRes.status === 500 && commDelRes.data?.message === "Unauthorized")),
      evidence: JSON.stringify({ status: commDelRes.status, message: commDelRes.data?.message, commAlive }),
      securityImpact: !commAlive ? "HIGH: BOLA permits deleting comments of other users" : "Protected",
    });
  }

  // API-IDOR-04: User B attempts to access User A's PRIVATE Pet
  if (petPrivate) {
    const petPrivRes = await api(`/api/pets/${petPrivate.id}`, {
      token: tokenB,
    });
    record({
      testId: "API-IDOR-04-PET-PRIVATE-GET",
      category: "PET_PRIVACY",
      target: "GET /api/pets/:id (Direct ID query of PRIVATE pet)",
      attackIdentity: "SEC-USER-B (Unconnected)",
      victimIdentity: "User A (Private Pet)",
      requestType: "GET",
      expectedResult: "HTTP 404 Not Found (Opaque boundary)",
      actualResult: `HTTP ${petPrivRes.status} (${petPrivRes.data?.message || "Found"})`,
      pass: petPrivRes.status === 404,
      evidence: JSON.stringify({ status: petPrivRes.status, dataReturned: !!petPrivRes.data?.data }),
      securityImpact: petPrivRes.status === 200 ? "HIGH: Privacy boundary bypass; unauthorized user reads private pet" : "Protected",
    });
  }

  // API-IDOR-05: User B attempts to access User A's CONNECTIONS Pet (Unconnected)
  if (petConnections) {
    const petConnRes = await api(`/api/pets/${petConnections.id}`, {
      token: tokenB,
    });
    record({
      testId: "API-IDOR-05-PET-CONNECTIONS-GET",
      category: "PET_PRIVACY",
      target: "GET /api/pets/:id (Direct ID query of CONNECTIONS pet without connection)",
      attackIdentity: "SEC-USER-B (Unconnected)",
      victimIdentity: "User A (Connections Pet)",
      requestType: "GET",
      expectedResult: "HTTP 404 Not Found (Denied to non-connections)",
      actualResult: `HTTP ${petConnRes.status}`,
      pass: petConnRes.status === 404,
      evidence: JSON.stringify({ status: petConnRes.status, dataReturned: !!petConnRes.data?.data }),
      securityImpact: petConnRes.status === 200 ? "HIGH: CONNECTIONS pet exposed to unrelated user" : "Protected",
    });
  }

  // API-IDOR-06: User B attempts to PATCH User A's Pet
  if (petPublic) {
    const petPatchRes = await api(`/api/pets/${petPublic.id}`, {
      method: "PATCH",
      token: tokenB,
      body: { name: "Tampered Pet Name" },
    });
    const checkPet = await serviceSupabase.from("pets").select("name").eq("id", petPublic.id).single();
    const petTampered = checkPet.data?.name === "Tampered Pet Name";
    record({
      testId: "API-IDOR-06-PET-PATCH",
      category: "PET_PRIVACY",
      target: "PATCH /api/pets/:id (Unauthorized pet profile edit)",
      attackIdentity: "SEC-USER-B",
      victimIdentity: "User A (Pet A)",
      requestType: "PATCH",
      expectedResult: "HTTP 403 Forbidden",
      actualResult: `HTTP ${petPatchRes.status}, Tampered: ${petTampered}`,
      pass: !petTampered && (petPatchRes.status === 403 || petPatchRes.status === 404),
      evidence: JSON.stringify({ status: petPatchRes.status, petName: checkPet.data?.name }),
      securityImpact: petTampered ? "HIGH: BOLA allows tampering foreign pet profiles" : "Protected",
    });
  }

  // API-IDOR-07: User B attempts to fetch User A's notifications
  const notifRes = await api("/api/notifications", {
    token: tokenB,
  });
  const returnedNotifA = (notifRes.data?.data || []).some((n: any) => n.id === notifA?.id);
  record({
    testId: "API-IDOR-07-NOTIFICATIONS",
    category: "API_IDOR",
    target: "GET /api/notifications (Scoped to authenticated user)",
    attackIdentity: "SEC-USER-B",
    victimIdentity: "User A (Notification A)",
    requestType: "GET",
    expectedResult: "HTTP 200 containing ONLY User B notifications (0 leaked from User A)",
    actualResult: `HTTP ${notifRes.status}, Leaked User A notification: ${returnedNotifA}`,
    pass: notifRes.status === 200 && !returnedNotifA,
    evidence: JSON.stringify({ status: notifRes.status, returnedCount: (notifRes.data?.data || []).length, leakedNotifA: returnedNotifA }),
    securityImpact: returnedNotifA ? "HIGH: Cross-user notification leakage exposes private activity" : "Protected",
  });

  // API-IDOR-08: User B attempts to read User A's bookmarks
  const bkmkRes = await api("/api/my/bookmarks", {
    token: tokenB,
  });
  const returnedBkmkA = (bkmkRes.data?.data || []).some((b: any) => b.post_id === postA?.id);
  record({
    testId: "API-IDOR-08-BOOKMARKS",
    category: "API_IDOR",
    target: "GET /api/my/bookmarks (Scoped to authenticated user)",
    attackIdentity: "SEC-USER-B",
    victimIdentity: "User A (Bookmark A)",
    requestType: "GET",
    expectedResult: "HTTP 200 containing ONLY User B bookmarks",
    actualResult: `HTTP ${bkmkRes.status}, Leaked User A bookmark: ${returnedBkmkA}`,
    pass: bkmkRes.status === 200 && !returnedBkmkA,
    evidence: JSON.stringify({ status: bkmkRes.status, leakedBkmkA: returnedBkmkA }),
    securityImpact: returnedBkmkA ? "MEDIUM: Cross-user private bookmarks leaked" : "Protected",
  });

  // API-BIZ-01: Spoofed Acting Identity Header (Outsider posts as Business A)
  if (businessA) {
    const spoofPostRes = await api("/api/posts", {
      method: "POST",
      token: tokenB,
      headers: {
        "x-acting-identity-type": "BUSINESS",
        "x-acting-identity-id": businessA.id,
      },
      body: {
        text: "Spoofed Post by Outsider B",
        visibility: "public",
      },
    });
    record({
      testId: "API-BIZ-01-SPOOFED-ACTING-IDENTITY",
      category: "BUSINESS",
      target: "POST /api/posts with spoofed x-acting-identity-*",
      attackIdentity: "SEC-USER-B (Outsider)",
      victimIdentity: "Business A",
      requestType: "POST (Forged headers)",
      expectedResult: "HTTP 403 Forbidden (NOT_A_MEMBER)",
      actualResult: `HTTP ${spoofPostRes.status} (${spoofPostRes.data?.message || spoofPostRes.data?.code})`,
      pass: spoofPostRes.status === 403,
      evidence: JSON.stringify({ status: spoofPostRes.status, body: spoofPostRes.data }),
      securityImpact: spoofPostRes.status === 200 || spoofPostRes.status === 201
        ? "CRITICAL: Complete Business identity impersonation via header spoofing"
        : "Protected",
    });
  }

  // API-BIZ-02: Restricted Member attempts Owner action (Profile edit on Business A)
  if (businessA) {
    const editBizRes = await api(`/api/businesses/${businessA.id}`, {
      method: "PATCH",
      token: tokenMember,
      body: { name: "Tampered Business Name By Member" },
    });
    const checkBiz = await serviceSupabase.from("business_identities").select("name").eq("id", businessA.id).single();
    const bizTampered = checkBiz.data?.name === "Tampered Business Name By Member";
    record({
      testId: "API-BIZ-02-RESTRICTED-MEMBER-ESCALATION",
      category: "BUSINESS",
      target: "PATCH /api/businesses/:id (Member attempts Owner edit)",
      attackIdentity: "SEC-BUSINESS-MEMBER (Role: MEMBER)",
      victimIdentity: "Business A Owner",
      requestType: "PATCH",
      expectedResult: "HTTP 403 Forbidden (Insufficient permissions)",
      actualResult: `HTTP ${editBizRes.status}, Tampered: ${bizTampered}`,
      pass: !bizTampered && editBizRes.status === 403,
      evidence: JSON.stringify({ status: editBizRes.status, body: editBizRes.data, bizName: checkBiz.data?.name }),
      securityImpact: bizTampered ? "HIGH: Restricted business member bypasses RBAC to edit business profile" : "Protected",
    });
  }

  // API-ADM-01: Normal User accessing Admin API
  const adminApiRes = await api("/api/admin/admins", {
    token: tokenA,
  });
  record({
    testId: "API-ADM-01-ADMIN-PERIMETER",
    category: "ADMIN",
    target: "GET /api/admin/admins",
    attackIdentity: "SEC-USER-A (Normal User)",
    victimIdentity: "Admin Infrastructure",
    requestType: "GET",
    expectedResult: "HTTP 401 / 403 Forbidden",
    actualResult: `HTTP ${adminApiRes.status} (${adminApiRes.data?.message || "Denied"})`,
    pass: adminApiRes.status === 401 || adminApiRes.status === 403,
    evidence: JSON.stringify({ status: adminApiRes.status, body: adminApiRes.data }),
    securityImpact: adminApiRes.status === 200 ? "CRITICAL: Unprivileged user penetrates Admin API" : "Protected",
  });

  // API-ADM-02: Admin API Query Token Authentication Bypass (?token=)
  const qTokenRes = await api(`/api/admin/admins?token=${tokenA}`);
  record({
    testId: "API-ADM-02-QUERY-TOKEN-BYPASS",
    category: "ADMIN",
    target: "GET /api/admin/admins?token=<JWT>",
    attackIdentity: "SEC-GUEST with query string token",
    victimIdentity: "Admin Auth Perimeter",
    requestType: "GET (Query token)",
    expectedResult: "HTTP 401 Unauthorized (Header-only authentication enforced)",
    actualResult: `HTTP ${qTokenRes.status}`,
    pass: qTokenRes.status === 401,
    evidence: JSON.stringify({ status: qTokenRes.status, body: qTokenRes.data }),
    securityImpact: qTokenRes.status === 200 ? "HIGH: Admin API authenticates sensitive tokens via URL query parameters" : "Protected (Phase 2A fix validated)",
  });

  // API-ADM-03: Admin API Query Token Access_Token Bypass (?access_token=)
  const qAccTokenRes = await api(`/api/admin/admins?access_token=${tokenA}`);
  record({
    testId: "API-ADM-03-QUERY-ACCESS-TOKEN-BYPASS",
    category: "ADMIN",
    target: "GET /api/admin/admins?access_token=<JWT>",
    attackIdentity: "SEC-GUEST with query string access_token",
    victimIdentity: "Admin Auth Perimeter",
    requestType: "GET (Query access_token)",
    expectedResult: "HTTP 401 Unauthorized (Header-only authentication enforced)",
    actualResult: `HTTP ${qAccTokenRes.status}`,
    pass: qAccTokenRes.status === 401,
    evidence: JSON.stringify({ status: qAccTokenRes.status, body: qAccTokenRes.data }),
    securityImpact: qAccTokenRes.status === 200 ? "HIGH: Admin API authenticates query string access_token" : "Protected (Phase 2A fix validated)",
  });

  // API-ADS-01: Direct First-Party Campaign Creation while Marketplace Disabled
  const campCreateRes = await api("/api/advertisers/campaigns", {
    method: "POST",
    token: tokenA,
    body: { name: "Unauthorized Ad Campaign", budget: 1000 },
  });
  record({
    testId: "API-ADS-01-MARKETPLACE-DISABLED",
    category: "ADS",
    target: "POST /api/advertisers/campaigns",
    attackIdentity: "SEC-USER-A",
    victimIdentity: "Ads Marketplace Feature Flag",
    requestType: "POST",
    expectedResult: "HTTP 403 Forbidden (Peto Ads Marketplace is currently disabled)",
    actualResult: `HTTP ${campCreateRes.status} (${campCreateRes.data?.error || campCreateRes.data?.message})`,
    pass: campCreateRes.status === 403,
    evidence: JSON.stringify({ status: campCreateRes.status, body: campCreateRes.data }),
    securityImpact: campCreateRes.status === 200 || campCreateRes.status === 201
      ? "HIGH: Direct access bypasses first-party ads marketplace disablement"
      : "Protected (Feature flag enforced)",
  });

  // API-ADS-02: Direct Advertiser Balance Deposit Bypass
  const depositRes = await api("/api/advertisers/billing/deposit", {
    method: "POST",
    token: tokenA,
    body: { amount: 50000 },
  });
  record({
    testId: "API-ADS-02-DIRECT-DEPOSIT-BLOCKED",
    category: "ADS",
    target: "POST /api/advertisers/billing/deposit",
    attackIdentity: "SEC-USER-A",
    victimIdentity: "Financial Wallet Integrity",
    requestType: "POST",
    expectedResult: "HTTP 403 Forbidden (Direct fund deposits are strictly disabled)",
    actualResult: `HTTP ${depositRes.status} (${depositRes.data?.error || depositRes.data?.message})`,
    pass: depositRes.status === 403,
    evidence: JSON.stringify({ status: depositRes.status, body: depositRes.data }),
    securityImpact: depositRes.status === 200
      ? "CRITICAL: Direct deposit allows arbitrary balance crediting without payment gateway"
      : "Protected (Phase 2A/2B hardening validated)",
  });

  // =========================================================================
  // CLEANUP
  // =========================================================================
  console.log("\n[4] Cleaning Up Synthetic Test Resources...");
  try {
    if (businessA) {
      await serviceSupabase.from("business_memberships").delete().eq("business_id", businessA.id);
      await serviceSupabase.from("business_identities").delete().eq("id", businessA.id);
    }
    if (petPrivate) {
      await serviceSupabase.from("pet_parents").delete().eq("pet_id", petPrivate.id);
      await serviceSupabase.from("pets").delete().eq("id", petPrivate.id);
    }
    if (petConnections) {
      await serviceSupabase.from("pet_parents").delete().eq("pet_id", petConnections.id);
      await serviceSupabase.from("pets").delete().eq("id", petConnections.id);
    }
    if (petPublic) {
      await serviceSupabase.from("pet_parents").delete().eq("pet_id", petPublic.id);
      await serviceSupabase.from("pets").delete().eq("id", petPublic.id);
    }
    if (commentA) await serviceSupabase.from("comments").delete().eq("id", commentA.id);
    if (bookmarkA) await serviceSupabase.from("bookmarks").delete().eq("id", bookmarkA.id);
    if (postA) await serviceSupabase.from("posts").delete().eq("id", postA.id);
    if (verAppA) await serviceSupabase.from("verification_applications").delete().eq("id", verAppA.id);
    if (notifA) await serviceSupabase.from("notifications").delete().eq("id", notifA.id);

    await serviceSupabase.from("profiles").delete().in("id", [userA.id, userB.id, userMember.id]);
    await serviceSupabase.auth.admin.deleteUser(userA.id);
    await serviceSupabase.auth.admin.deleteUser(userB.id);
    await serviceSupabase.auth.admin.deleteUser(userMember.id);
    console.log("Synthetic test resources cleaned up completely.");
  } catch (err: any) {
    console.warn("Cleanup warning:", err.message);
  }

  // Summary
  console.log("\n==================================================");
  console.log("PENTEST SUITE EXECUTION COMPLETE");
  console.log("==================================================");
  const total = results.length;
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`TOTAL TESTS: ${total} | PASSED: ${passed} | FAILED / VULNERABILITIES: ${failed}`);

  return results;
}

run().catch((e) => {
  console.error("Test execution fatal error:", e);
  process.exit(1);
});
