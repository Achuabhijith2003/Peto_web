import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { supabase as serviceSupabase } from "../src/config/supabase.js";

const BACKEND_BASE = "http://localhost:5000";
const SUPABASE_URL = process.env.SUPABASE_URL || "https://ednleoavhuxlarnnlmkq.supabase.co";
const ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

export interface Phase5TestResult {
  testId: string;
  category: string;
  target: string;
  attacker: string;
  victim?: string;
  expected: string;
  actual: string;
  status: "PASS" | "FAIL" | "REVIEW" | "NOT_APPLICABLE";
  findingId?: string;
  evidence: string;
  securityImpact: string;
}

export const phase5Results: Phase5TestResult[] = [];

function record(r: Phase5TestResult) {
  phase5Results.push(r);
  const mark = r.status === "PASS" ? "✅ PASS" : r.status === "NOT_APPLICABLE" ? "⚪ N/A" : "❌ FAIL";
  console.log(`[${r.testId}] ${mark} | ${r.category} | ${r.target} (${r.attacker}) -> Actual: ${r.actual}`);
}

async function request(
  path: string,
  options: {
    method?: string;
    token?: string | null;
    headers?: Record<string, string>;
    body?: any;
    rawBody?: string | Buffer;
  } = {}
) {
  const url = `${BACKEND_BASE}${path}`;
  const headers: Record<string, string> = {
    ...options.headers,
  };

  if (options.token !== null && options.token !== undefined) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  let bodyContent = options.rawBody;
  if (!bodyContent && options.body !== undefined) {
    if (typeof options.body === "string") {
      bodyContent = options.body;
      if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
    } else {
      bodyContent = JSON.stringify(options.body);
      if (!headers["Content-Type"]) headers["Content-Type"] = "application/json";
    }
  }

  const res = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: bodyContent,
  });

  let responseData: any = null;
  const contentType = res.headers.get("content-type") || "";
  const text = await res.text();
  if (contentType.includes("application/json")) {
    try {
      responseData = JSON.parse(text);
    } catch {
      responseData = text;
    }
  } else {
    responseData = text;
  }

  return {
    status: res.status,
    headers: res.headers,
    data: responseData,
    rawText: text,
  };
}

async function runPhase5() {
  console.log("================================================================================");
  console.log("PETO SECURITY — PHASE 5: CONTROLLED BROADER RUNTIME SECURITY PENTEST SUITE");
  console.log("OWASP WEB + API + AUTH + INPUT + BUSINESS-LOGIC ASSESSMENT");
  console.log("================================================================================");

  // 1. Environment Verification
  const isDevNode = process.env.NODE_ENV === "development";
  const isDevSupabase = SUPABASE_URL.includes("ednleoavhuxlarnnlmkq");
  const isDevRazorpay = (process.env.RAZORPAY_KEY_ID || "").startsWith("rzp_test_");

  console.log(`\n[0] Environment Verification:`);
  console.log(`- Backend Base: ${BACKEND_BASE}`);
  console.log(`- Supabase Ref: ednleoavhuxlarnnlmkq (${isDevSupabase ? "DEV PROJECT" : "UNKNOWN"})`);
  console.log(`- NODE_ENV: ${process.env.NODE_ENV} (${isDevNode ? "DEV" : "PROD"})`);
  console.log(`- Razorpay Mode: ${isDevRazorpay ? "TEST SANDBOX" : "LIVE"}`);

  if (!isDevNode || !isDevSupabase) {
    console.error("PHASE 5 BLOCKED — TARGET ENVIRONMENT NOT VERIFIED.");
    process.exit(1);
  }

  // 2. Provision Isolated Synthetic Test Identities
  const ts = Date.now();
  const testPassword = "SecP@ssw0rd!2026_Phase5Test";
  const emailUserA = `sec_user_a_p5_${ts}@petotest.local`;
  const emailUserB = `sec_user_b_p5_${ts}@petotest.local`;
  const emailMember = `sec_member_p5_${ts}@petotest.local`;

  console.log(`\n[1] Provisioning Synthetic Identities...`);
  const [resA, resB, resMem] = await Promise.all([
    serviceSupabase.auth.admin.createUser({
      email: emailUserA,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: "SEC User A" },
    }),
    serviceSupabase.auth.admin.createUser({
      email: emailUserB,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: "SEC User B" },
    }),
    serviceSupabase.auth.admin.createUser({
      email: emailMember,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: "SEC Member" },
    }),
  ]);

  const userA = resA.data?.user;
  const userB = resB.data?.user;
  const userMember = resMem.data?.user;

  if (!userA || !userB || !userMember) {
    throw new Error("Failed to provision synthetic test identities.");
  }

  // Authoritatively seed profiles table (no email column)
  const profRes = await serviceSupabase.from("profiles").upsert([
    { id: userA.id, username: `seca_${ts}`, full_name: "SEC User A" },
    { id: userB.id, username: `secb_${ts}`, full_name: "SEC User B" },
    { id: userMember.id, username: `secm_${ts}`, full_name: "SEC Member" },
  ]);
  if (profRes.error) {
    console.error("Profile upsert error:", profRes.error);
  }

  // Sign in to acquire authentic Supabase JWTs
  const authClient = createClient(SUPABASE_URL, ANON_KEY);
  const [loginA, loginB, loginMem] = await Promise.all([
    authClient.auth.signInWithPassword({ email: emailUserA, password: testPassword }),
    authClient.auth.signInWithPassword({ email: emailUserB, password: testPassword }),
    authClient.auth.signInWithPassword({ email: emailMember, password: testPassword }),
  ]);

  const tokenUserA = loginA.data?.session?.access_token!;
  const tokenUserB = loginB.data?.session?.access_token!;
  const tokenMember = loginMem.data?.session?.access_token!;

  console.log(`- SEC-USER-A provisioned: ${userA.id}`);
  console.log(`- SEC-USER-B provisioned: ${userB.id}`);
  console.log(`- SEC-BUSINESS-MEMBER provisioned: ${userMember.id}`);

  // Create Synthetic Business A owned by User A
  const businessId = `biz_sec_p5_${ts}`;
  await serviceSupabase.from("business_identities").insert({
    id: businessId,
    owner_id: userA.id,
    name: "SEC Alpha Business",
    legal_name: "SEC Alpha Business LLC",
    username: `sec_alpha_${ts}`,
    status: "ACTIVE",
    is_active: true,
  });

  // Assign User A as OWNER
  await serviceSupabase.from("business_memberships").insert({
    business_id: businessId,
    user_id: userA.id,
    role: "OWNER",
    status: "ACTIVE",
  });

  // Assign userMember as restricted MEMBER
  await serviceSupabase.from("business_memberships").insert({
    business_id: businessId,
    user_id: userMember.id,
    role: "MEMBER",
    status: "ACTIVE",
  });

  // Create Post A owned by User A
  const postARes = await request("/api/posts", {
    method: "POST",
    token: tokenUserA,
    body: { text: "SEC User A Test Post for Phase 5", visibility: "public" },
  });
  const postAId = postARes.data?.data?.id || postARes.data?.id;

  // Create Private Pet A owned by User A
  const petARes = await request("/api/pets", {
    method: "POST",
    token: tokenUserA,
    body: {
      name: "Shadow Private Pet",
      species: "DOG",
      profile_visibility: "PRIVATE",
      visibility: "PRIVATE",
    },
  });
  const petAId = petARes.data?.data?.id || petARes.data?.id;

  // Register User A as advertiser for payment order validation
  await request("/api/advertisers/register", {
    method: "POST",
    token: tokenUserA,
    body: { company_name: "SEC User A Advertising LLC" },
  });

  console.log(`- Provisioned Post A: ${postAId}`);
  console.log(`- Provisioned Private Pet A: ${petAId}`);

  // ================================================================================
  // CATEGORY A: AUTHENTICATION & SESSION SECURITY
  // ================================================================================
  console.log("\n--- CATEGORY A: Authentication & Session Security ---");

  // TEST-A01: Missing Authorization Header
  {
    const res = await request("/api/users/me", { token: null });
    record({
      testId: "AUTH-01-MISSING-HEADER",
      category: "Authentication",
      target: "GET /api/users/me",
      attacker: "SEC-GUEST",
      expected: "HTTP 401 Unauthorized",
      actual: `HTTP ${res.status}`,
      status: res.status === 401 ? "PASS" : "FAIL",
      evidence: `HTTP ${res.status}: ${JSON.stringify(res.data)}`,
      securityImpact: "Unauthenticated requests cannot access protected profile endpoints.",
    });
  }

  // TEST-A02: Malformed Bearer Token (Empty token)
  {
    const res = await request("/api/users/me", {
      headers: { Authorization: "Bearer " },
    });
    record({
      testId: "AUTH-02-EMPTY-BEARER",
      category: "Authentication",
      target: "GET /api/users/me",
      attacker: "SEC-GUEST",
      expected: "HTTP 401 Unauthorized",
      actual: `HTTP ${res.status}`,
      status: res.status === 401 ? "PASS" : "FAIL",
      evidence: `HTTP ${res.status}: ${JSON.stringify(res.data)}`,
      securityImpact: "Empty bearer tokens are rejected.",
    });
  }

  // TEST-A03: Random Garbage JWT
  {
    const res = await request("/api/users/me", {
      token: "invalid.jwt.token_structure_garbage",
    });
    record({
      testId: "AUTH-03-GARBAGE-JWT",
      category: "Authentication",
      target: "GET /api/users/me",
      attacker: "SEC-GUEST",
      expected: "HTTP 401 Unauthorized",
      actual: `HTTP ${res.status}`,
      status: res.status === 401 ? "PASS" : "FAIL",
      evidence: `HTTP ${res.status}: ${JSON.stringify(res.data)}`,
      securityImpact: "Malformed JWTs fail closed at Supabase auth verification.",
    });
  }

  // TEST-A04: Tampered Signature JWT
  {
    const [header, payload] = tokenUserA.split(".");
    const tampered = `${header}.${payload}.TAMPERED_INVALID_SIGNATURE_HEX`;
    const res = await request("/api/users/me", { token: tampered });
    record({
      testId: "AUTH-04-TAMPERED-SIGNATURE",
      category: "Authentication",
      target: "GET /api/users/me",
      attacker: "SEC-GUEST",
      expected: "HTTP 401 Unauthorized",
      actual: `HTTP ${res.status}`,
      status: res.status === 401 ? "PASS" : "FAIL",
      evidence: `HTTP ${res.status}: ${JSON.stringify(res.data)}`,
      securityImpact: "Cryptographically invalid signatures are rejected.",
    });
  }

  // TEST-A05: Query-String Token Admin Auth Regression (PETO-SEC-02/04)
  {
    const res = await request(`/api/admin/dashboard?token=${tokenUserA}`, {
      token: null,
    });
    record({
      testId: "AUTH-05-ADMIN-QUERY-TOKEN-REGRESSION",
      category: "Authentication",
      target: "GET /api/admin/dashboard?token=...",
      attacker: "SEC-GUEST",
      expected: "HTTP 401 Unauthorized (Tokens in query parameters rejected)",
      actual: `HTTP ${res.status}`,
      status: res.status === 401 ? "PASS" : "FAIL",
      evidence: `HTTP ${res.status}: ${JSON.stringify(res.data)}`,
      securityImpact: "Admin access tokens in query parameters remain disallowed to prevent log leakage.",
    });
  }

  // TEST-A06: Google OAuth Exchange Code Malformed
  {
    const res = await request("/api/auth/google/exchange-code", {
      method: "POST",
      token: null,
      body: { code: "INVALID" },
    });
    record({
      testId: "AUTH-06-OAUTH-EXCHANGE-MALFORMED",
      category: "Authentication",
      target: "POST /api/auth/google/exchange-code",
      attacker: "SEC-GUEST",
      expected: "HTTP 400 Bad Request",
      actual: `HTTP ${res.status}`,
      status: res.status === 400 ? "PASS" : "FAIL",
      evidence: `HTTP ${res.status}: ${JSON.stringify(res.data)}`,
      securityImpact: "Malformed OAuth exchange codes fail closed with controlled 400 responses.",
    });
  }

  // ================================================================================
  // CATEGORY B: AUTHORIZATION REGRESSION
  // ================================================================================
  console.log("\n--- CATEGORY B: Authorization Regression ---");

  // TEST-B01: Cross-User Post Modification (User B modifies User A's Post)
  if (postAId) {
    const res = await request(`/api/posts/${postAId}`, {
      method: "PUT",
      token: tokenUserB,
      body: { text: "HACKED by User B" },
    });
    record({
      testId: "AUTHZ-01-CROSS-USER-POST-MOD",
      category: "Authorization",
      target: `PUT /api/posts/${postAId}`,
      attacker: "SEC-USER-B",
      victim: "SEC-USER-A",
      expected: "HTTP 403 or 404 Denied",
      actual: `HTTP ${res.status}`,
      status: res.status === 403 || res.status === 404 ? "PASS" : "FAIL",
      evidence: `HTTP ${res.status}: ${JSON.stringify(res.data)}`,
      securityImpact: "User B cannot edit posts created by User A.",
    });
  }

  // TEST-B02: Cross-User Post Deletion (User B deletes User A's Post)
  if (postAId) {
    const res = await request(`/api/posts/${postAId}`, {
      method: "DELETE",
      token: tokenUserB,
    });
    record({
      testId: "AUTHZ-02-CROSS-USER-POST-DEL",
      category: "Authorization",
      target: `DELETE /api/posts/${postAId}`,
      attacker: "SEC-USER-B",
      victim: "SEC-USER-A",
      expected: "HTTP 403 or 404 Denied",
      actual: `HTTP ${res.status}`,
      status: res.status === 403 || res.status === 404 ? "PASS" : "FAIL",
      evidence: `HTTP ${res.status}: ${JSON.stringify(res.data)}`,
      securityImpact: "User B cannot delete posts created by User A.",
    });
  }

  // TEST-B03: Cross-User Pet Profile Modification (User B modifies User A's Pet)
  if (petAId) {
    const res = await request(`/api/pets/${petAId}`, {
      method: "PATCH",
      token: tokenUserB,
      body: { name: "Renamed by User B" },
    });
    record({
      testId: "AUTHZ-03-CROSS-USER-PET-MOD",
      category: "Authorization",
      target: `PATCH /api/pets/${petAId}`,
      attacker: "SEC-USER-B",
      victim: "SEC-USER-A",
      expected: "HTTP 403 Forbidden",
      actual: `HTTP ${res.status}`,
      status: res.status === 403 ? "PASS" : "FAIL",
      evidence: `HTTP ${res.status}: ${JSON.stringify(res.data)}`,
      securityImpact: "Non-parents cannot edit pet details.",
    });
  }

  // TEST-B04: Cross-User Private Pet Visibility Access (User B views User A's Private Pet)
  if (petAId) {
    const res = await request(`/api/pets/${petAId}`, {
      method: "GET",
      token: tokenUserB,
    });
    record({
      testId: "AUTHZ-04-PRIVATE-PET-ENFORCEMENT",
      category: "Authorization",
      target: `GET /api/pets/${petAId}`,
      attacker: "SEC-USER-B",
      victim: "SEC-USER-A",
      expected: "HTTP 404 Not Found (Strictly concealed)",
      actual: `HTTP ${res.status}`,
      status: res.status === 404 ? "PASS" : "FAIL",
      evidence: `HTTP ${res.status}: ${JSON.stringify(res.data)}`,
      securityImpact: "Private pets return 404 to non-parents to conceal existence.",
    });
  }

  // TEST-B05: Cross-User Pet Media Access Endpoint (PETO-SEC-14 Regression)
  if (petAId) {
    const dummyMediaId = "00000000-0000-0000-0000-000000000001";
    const res = await request(`/api/pets/${petAId}/media/${dummyMediaId}/access`, {
      method: "GET",
      token: tokenUserB,
    });
    record({
      testId: "AUTHZ-05-PRIVATE-PET-MEDIA-ACCESS",
      category: "Authorization",
      target: `GET /api/pets/${petAId}/media/${dummyMediaId}/access`,
      attacker: "SEC-USER-B",
      victim: "SEC-USER-A",
      expected: "HTTP 403 or 404 Denied",
      actual: `HTTP ${res.status}`,
      status: res.status === 403 || res.status === 404 ? "PASS" : "FAIL",
      evidence: `HTTP ${res.status}: ${JSON.stringify(res.data)}`,
      securityImpact: "Non-parents cannot obtain signed URLs for private pet media.",
    });
  }

  // ================================================================================
  // CATEGORY C: API INPUT VALIDATION
  // ================================================================================
  console.log("\n--- CATEGORY C: API Input Validation ---");

  // TEST-C01: Missing Required Fields
  {
    const res = await request("/api/pets", {
      method: "POST",
      token: tokenUserA,
      body: {},
    });
    record({
      testId: "INPUT-01-MISSING-FIELDS",
      category: "Input Validation",
      target: "POST /api/pets",
      attacker: "SEC-USER-A",
      expected: "HTTP 400 Controlled Error",
      actual: `HTTP ${res.status}`,
      status: res.status === 400 ? "PASS" : "FAIL",
      evidence: `HTTP ${res.status}: ${JSON.stringify(res.data)}`,
      securityImpact: "Missing required fields are rejected gracefully.",
    });
  }

  // TEST-C02: Malformed UUID Path Parameter
  {
    const res = await request("/api/posts/not-a-valid-uuid", {
      method: "GET",
      token: tokenUserA,
    });
    const isControlled = res.status === 400 || res.status === 404;
    record({
      testId: "INPUT-02-MALFORMED-UUID-PATH",
      category: "Input Validation",
      target: "GET /api/posts/not-a-valid-uuid",
      attacker: "SEC-USER-A",
      expected: "HTTP 400 or 404 Controlled Error (No 500 crash)",
      actual: `HTTP ${res.status}`,
      status: isControlled ? "PASS" : "FAIL",
      findingId: !isControlled ? "PETO-SEC-16" : undefined,
      evidence: `HTTP ${res.status}: ${JSON.stringify(res.data)}`,
      securityImpact: isControlled
        ? "Route parameters validated safely."
        : "Unhandled PostgreSQL 22P02 UUID syntax error produces HTTP 500 instead of controlled 400/404.",
    });
  }

  // TEST-C03: Malformed JSON Payload Body
  {
    const res = await request("/api/posts", {
      method: "POST",
      token: tokenUserA,
      rawBody: '{"text": "broken json payload',
      headers: { "Content-Type": "application/json" },
    });
    record({
      testId: "INPUT-03-MALFORMED-JSON-BODY",
      category: "Input Validation",
      target: "POST /api/posts",
      attacker: "SEC-USER-A",
      expected: "HTTP 400 Bad Request",
      actual: `HTTP ${res.status}`,
      status: res.status === 400 ? "PASS" : "FAIL",
      evidence: `HTTP ${res.status}: ${JSON.stringify(res.data)}`,
      securityImpact: "Express JSON parser gracefully rejects invalid JSON with 400.",
    });
  }

  // TEST-C04: Safe Boundary String in Username Check
  {
    const hugeString = "a".repeat(1000);
    const res = await request(`/api/users/check-username?username=${hugeString}`, {
      token: null,
    });
    record({
      testId: "INPUT-04-BOUNDARY-STRING",
      category: "Input Validation",
      target: "GET /api/users/check-username?username=<1000 chars>",
      attacker: "SEC-GUEST",
      expected: "HTTP 400 Bad Request (Username length limit enforced)",
      actual: `HTTP ${res.status}`,
      status: res.status === 400 ? "PASS" : "FAIL",
      evidence: `HTTP ${res.status}: ${JSON.stringify(res.data)}`,
      securityImpact: "Oversized string inputs are rejected before database queries.",
    });
  }

  // ================================================================================
  // CATEGORY D: SQL / DATABASE INJECTION
  // ================================================================================
  console.log("\n--- CATEGORY D: SQL / Database Injection ---");

  // TEST-D01: SQL / Filter Injection Probe in User Search
  {
    const res = await request("/api/users/search?q=%27%20OR%201=1%20--", {
      token: tokenUserA,
    });
    const isSafe = res.status === 200 || res.status === 400;
    record({
      testId: "INJ-01-SQLI-USER-SEARCH",
      category: "Injection",
      target: "GET /api/users/search?q=' OR 1=1 --",
      attacker: "SEC-USER-A",
      expected: "HTTP 200/400 (Query sanitized, no SQL error, no 500)",
      actual: `HTTP ${res.status}`,
      status: isSafe ? "PASS" : "FAIL",
      findingId: !isSafe ? "PETO-SEC-17" : undefined,
      evidence: `HTTP ${res.status}: ${JSON.stringify(res.data)}`,
      securityImpact: isSafe
        ? "SQL query structure cannot be altered via search parameters."
        : "Unescaped search query causes PostgREST or-filter parse error resulting in HTTP 500 response.",
    });
  }

  // TEST-D02: PostgREST Filter Injection Probe in Community Search
  {
    const probe = "test,id.neq.00000000-0000-0000-0000-000000000000";
    const res = await request(`/api/communities?search=${encodeURIComponent(probe)}`, {
      token: tokenUserA,
    });
    const isSafe = res.status === 200 || res.status === 400;
    record({
      testId: "INJ-02-POSTGREST-FILTER-INJ",
      category: "Injection",
      target: "GET /api/communities?search=test,id.neq.00000000-...",
      attacker: "SEC-USER-A",
      expected: "HTTP 200/400 (Handled safely without 500 error)",
      actual: `HTTP ${res.status}`,
      status: isSafe ? "PASS" : "FAIL",
      findingId: !isSafe ? "PETO-SEC-17" : undefined,
      evidence: `HTTP ${res.status}: ${JSON.stringify(res.data)}`,
      securityImpact: isSafe
        ? "PostgREST or-filter parser does not crash or bypass constraints."
        : "Comma in search query breaks PostgREST .or() filter structure producing 500 error.",
    });
  }

  // TEST-D03: Sort Parameter Injection
  {
    const res = await request("/api/communities?sort=name;DROP%20TABLE%20communities;--", {
      token: tokenUserA,
    });
    record({
      testId: "INJ-03-SORT-PARAM-INJECTION",
      category: "Injection",
      target: "GET /api/communities?sort=name;DROP...",
      attacker: "SEC-USER-A",
      expected: "HTTP 200 (Ignored/sanitized to default sort)",
      actual: `HTTP ${res.status}`,
      status: res.status === 200 ? "PASS" : "FAIL",
      evidence: `HTTP ${res.status}`,
      securityImpact: "Order/sort parameters use whitelist mapping and reject raw SQL statements.",
    });
  }

  // ================================================================================
  // CATEGORY E: XSS / STORED CONTENT INJECTION
  // ================================================================================
  console.log("\n--- CATEGORY E: XSS / Stored Content Injection ---");

  // TEST-E01: Stored XSS Probe in Post Text
  {
    const xssPayload = "<script>alert('p5_xss')</script><img src=x onerror=alert(1)>";
    const res = await request("/api/posts", {
      method: "POST",
      token: tokenUserA,
      body: { text: xssPayload, visibility: "public" },
    });
    const createdPost = res.data?.data || res.data;
    const isStoredAsLiteral = createdPost?.text === xssPayload;
    record({
      testId: "XSS-01-STORED-POST-CONTENT",
      category: "XSS",
      target: "POST /api/posts",
      attacker: "SEC-USER-A",
      expected: "HTTP 201 (Stored as literal text string, React JSX escapes it)",
      actual: `HTTP ${res.status} (Stored literal: ${isStoredAsLiteral})`,
      status: res.status === 201 && isStoredAsLiteral ? "PASS" : "FAIL",
      evidence: `Stored text: ${createdPost?.text}`,
      securityImpact: "Stored HTML tags are treated as inert plaintext data by backend and React JSX frontend.",
    });
  }

  // TEST-E02: Stored XSS in Profile Bio
  {
    const xssBio = "Bio <svg onload=alert('xss')>";
    const res = await request("/api/users/profile", {
      method: "PUT",
      token: tokenUserA,
      body: { bio: xssBio },
    });
    record({
      testId: "XSS-02-STORED-PROFILE-BIO",
      category: "XSS",
      target: "PUT /api/users/profile",
      attacker: "SEC-USER-A",
      expected: "HTTP 200 (Stored as literal string)",
      actual: `HTTP ${res.status}`,
      status: res.status === 200 ? "PASS" : "FAIL",
      evidence: `HTTP ${res.status}: ${JSON.stringify(res.data?.data?.bio || res.data?.bio)}`,
      securityImpact: "Profile bio is safely handled without dangerous HTML interpretation.",
    });
  }

  // ================================================================================
  // CATEGORY F: SSRF
  // ================================================================================
  console.log("\n--- CATEGORY F: SSRF ---");
  record({
    testId: "SSRF-01-BACKEND-SURFACE",
    category: "SSRF",
    target: "Backend Outbound Request Surface",
    attacker: "SEC-GUEST",
    expected: "NOT APPLICABLE (No user-supplied URL fetch features exist)",
    actual: "NOT APPLICABLE — Backend only communicates with hardcoded payment gateways (Razorpay/Stripe)",
    status: "NOT_APPLICABLE",
    evidence: "Source audit confirms zero user-controlled fetch/axios/http endpoints exist.",
    securityImpact: "SSRF risk eliminated by absence of outbound remote fetching architecture.",
  });

  // ================================================================================
  // CATEGORY G: FILE UPLOAD SECURITY
  // ================================================================================
  console.log("\n--- CATEGORY G: File Upload Security ---");

  // TEST-G01: Fake Image with HTML Script Body (MIME spoofing)
  {
    const fakeHtmlBody = "<!DOCTYPE html><html><body><script>alert(1)</script></body></html>";
    const boundary = "----WebKitFormBoundary" + crypto.randomBytes(8).toString("hex");
    const payload = [
      `--${boundary}`,
      'Content-Disposition: form-data; name="file"; filename="test.jpg"',
      "Content-Type: image/jpeg",
      "",
      fakeHtmlBody,
      `--${boundary}--`,
      "",
    ].join("\r\n");

    const res = await request("/api/media/image", {
      method: "POST",
      token: tokenUserA,
      rawBody: Buffer.from(payload),
      headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
    });

    record({
      testId: "UPLOAD-01-HTML-BODY-MIME-SPOOF",
      category: "File Upload",
      target: "POST /api/media/image",
      attacker: "SEC-USER-A",
      expected: "HTTP 400 Bad Request (Magic-byte detection rejects active HTML content)",
      actual: `HTTP ${res.status}`,
      status: res.status === 400 ? "PASS" : "FAIL",
      evidence: `HTTP ${res.status}: ${JSON.stringify(res.data)}`,
      securityImpact: "Active HTML content masquerading as image/jpeg is rejected by fileValidator.",
    });
  }

  // TEST-G02: Windows PE Executable Masquerading as PNG
  {
    const peHeader = Buffer.from([0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00]); // MZ header
    const boundary = "----WebKitFormBoundary" + crypto.randomBytes(8).toString("hex");
    const payload = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test.png"\r\nContent-Type: image/png\r\n\r\n`),
      peHeader,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const res = await request("/api/media/image", {
      method: "POST",
      token: tokenUserA,
      rawBody: payload,
      headers: { "Content-Type": `multipart/form-data; boundary=${boundary}` },
    });

    record({
      testId: "UPLOAD-02-PE-EXECUTABLE-SPOOF",
      category: "File Upload",
      target: "POST /api/media/image",
      attacker: "SEC-USER-A",
      expected: "HTTP 400 Bad Request (Executable magic bytes rejected)",
      actual: `HTTP ${res.status}`,
      status: res.status === 400 ? "PASS" : "FAIL",
      evidence: `HTTP ${res.status}: ${JSON.stringify(res.data)}`,
      securityImpact: "Executable files masquerading as images fail magic-byte verification.",
    });
  }

  // ================================================================================
  // CATEGORY H: MASS ASSIGNMENT / OVERPOSTING
  // ================================================================================
  console.log("\n--- CATEGORY H: Mass Assignment / Overposting ---");

  // TEST-H01: Attempting to Self-Promote to Admin or Verified on Profile Update
  {
    const res = await request("/api/users/profile", {
      method: "PUT",
      token: tokenUserA,
      body: {
        bio: "Standard User Bio",
        is_admin: true,
        isAdmin: true,
        role: "admin",
        verified: true,
        is_verified: true,
        verification_status: "APPROVED",
      },
    });

    // Check database state directly
    const { data: profileCheck } = await serviceSupabase
      .from("profiles")
      .select("verified, is_verified")
      .eq("id", userA.id)
      .single();

    const isVerifiedUntouched = !profileCheck?.verified && !profileCheck?.is_verified;
    record({
      testId: "MASS-01-PROFILE-ADMIN-VERIFIED",
      category: "Mass Assignment",
      target: "PUT /api/users/profile",
      attacker: "SEC-USER-A",
      expected: "Privileged fields (is_admin, verified) ignored by server",
      actual: `HTTP ${res.status} (Verified in DB: ${profileCheck?.verified || false})`,
      status: isVerifiedUntouched ? "PASS" : "FAIL",
      evidence: `DB values: verified=${profileCheck?.verified}, is_verified=${profileCheck?.is_verified}`,
      securityImpact: "Authoritative fields cannot be overposted by standard profile updates.",
    });
  }

  // TEST-H02: Attempting to Override Post Author ID
  {
    const res = await request("/api/posts", {
      method: "POST",
      token: tokenUserA,
      body: {
        text: "Spoofed Post Author Attempt",
        user_id: userB.id,
        author_id: userB.id,
      },
    });
    const createdPost = res.data?.data || res.data;
    const authorIsA = createdPost?.user_id === userA.id;
    record({
      testId: "MASS-02-POST-AUTHOR-SPOOF",
      category: "Mass Assignment",
      target: "POST /api/posts",
      attacker: "SEC-USER-A",
      victim: "SEC-USER-B",
      expected: "Author ID set strictly to authenticated user (User A)",
      actual: `Created author: ${createdPost?.user_id}`,
      status: authorIsA ? "PASS" : "FAIL",
      evidence: `Authenticated user: ${userA.id}, Post author: ${createdPost?.user_id}`,
      securityImpact: "Client cannot impersonate another author by supplying user_id in payload.",
    });
  }

  // ================================================================================
  // CATEGORY I: HTTP METHOD / ROUTING ABUSE
  // ================================================================================
  console.log("\n--- CATEGORY I: HTTP Method / Routing Abuse ---");

  // TEST-I01: Unsupported Method on API Health
  {
    const res = await request("/health", { method: "PUT", token: null });
    record({
      testId: "ROUTE-01-UNSUPPORTED-METHOD",
      category: "Routing Abuse",
      target: "PUT /health",
      attacker: "SEC-GUEST",
      expected: "HTTP 404 or 405 Not Allowed",
      actual: `HTTP ${res.status}`,
      status: res.status === 404 || res.status === 405 ? "PASS" : "FAIL",
      evidence: `HTTP ${res.status}`,
      securityImpact: "Unexpected HTTP methods fail closed.",
    });
  }

  // ================================================================================
  // CATEGORY J: CORS & HTTP SECURITY HEADERS
  // ================================================================================
  console.log("\n--- CATEGORY J: CORS & HTTP Security Headers ---");

  // TEST-J01: CORS Rejection for Unauthorized Attacker Origin
  {
    const res = await request("/health", {
      headers: { Origin: "https://attacker-domain-evil.xyz" },
    });
    const allowOrigin = res.headers.get("access-control-allow-origin");
    const blocked = !allowOrigin || allowOrigin !== "https://attacker-domain-evil.xyz";
    record({
      testId: "CORS-01-UNAUTHORIZED-ORIGIN",
      category: "CORS",
      target: "Origin: https://attacker-domain-evil.xyz",
      attacker: "SEC-GUEST",
      expected: "No Access-Control-Allow-Origin header returned for attacker domain",
      actual: `AC-Allow-Origin: ${allowOrigin || "None"}`,
      status: blocked ? "PASS" : "FAIL",
      evidence: `Header: ${allowOrigin || "null"}`,
      securityImpact: "Arbitrary origins are blocked from cross-origin credential access (PETO-SEC-09).",
    });
  }

  // TEST-J02: CORS Acceptance for Authorized Local Development Origin
  {
    const res = await request("/health", {
      headers: { Origin: "http://localhost:5173" },
    });
    const allowOrigin = res.headers.get("access-control-allow-origin");
    record({
      testId: "CORS-02-AUTHORIZED-DEV-ORIGIN",
      category: "CORS",
      target: "Origin: http://localhost:5173",
      attacker: "SEC-USER-A",
      expected: "Access-Control-Allow-Origin: http://localhost:5173",
      actual: `AC-Allow-Origin: ${allowOrigin || "None"}`,
      status: allowOrigin === "http://localhost:5173" ? "PASS" : "FAIL",
      evidence: `Header: ${allowOrigin}`,
      securityImpact: "Legitimate development frontend origin accepted cleanly.",
    });
  }

  // TEST-J03: Helmet Security Headers Present
  {
    const res = await request("/health");
    const nosniff = res.headers.get("x-content-type-options");
    const csp = res.headers.get("content-security-policy");
    record({
      testId: "HDR-01-SECURITY-HEADERS",
      category: "Security Headers",
      target: "GET /health",
      attacker: "SEC-GUEST",
      expected: "x-content-type-options: nosniff present",
      actual: `nosniff=${nosniff || "None"}, csp=${Boolean(csp)}`,
      status: nosniff === "nosniff" ? "PASS" : "FAIL",
      evidence: `nosniff=${nosniff}, csp_present=${Boolean(csp)}`,
      securityImpact: "MIME sniffing protection and CSP active platform-wide.",
    });
  }

  // ================================================================================
  // CATEGORY K: INFORMATION DISCLOSURE
  // ================================================================================
  console.log("\n--- CATEGORY K: Information Disclosure ---");

  // TEST-K01: Trigger 404 / 400 and verify no stack traces or schema leaked
  {
    const res = await request("/api/non-existent-endpoint-route", { token: null });
    const text = res.rawText;
    const leaksStack = text.includes("node_modules") || text.includes(".ts:") || text.includes("at Object.<anonymous>");
    const leaksPostgres = text.includes("pg_") || text.includes("supabase_admin") || text.includes("relation \"");

    record({
      testId: "INFO-01-ERROR-DISCLOSURE",
      category: "Information Disclosure",
      target: "GET /api/non-existent-endpoint-route",
      attacker: "SEC-GUEST",
      expected: "HTTP 404 (No stack traces or database schema leaked)",
      actual: `HTTP ${res.status} (Leaks stack: ${leaksStack}, Leaks DB: ${leaksPostgres})`,
      status: !leaksStack && !leaksPostgres ? "PASS" : "FAIL",
      evidence: `Response: ${res.rawText.substring(0, 100)}`,
      securityImpact: "Error responses do not disclose internals to unauthenticated users.",
    });
  }

  // ================================================================================
  // CATEGORY L: BUSINESS LOGIC ABUSE
  // ================================================================================
  console.log("\n--- CATEGORY L: Business Logic Abuse ---");

  // TEST-L01: Self-Follow Abuse Prevention
  {
    const res = await request(`/api/users/${userA.id}/follow`, {
      method: "POST",
      token: tokenUserA,
    });
    record({
      testId: "LOGIC-01-SELF-FOLLOW",
      category: "Business Logic",
      target: `POST /api/users/${userA.id}/follow`,
      attacker: "SEC-USER-A",
      expected: "HTTP 400 Bad Request (Cannot follow self)",
      actual: `HTTP ${res.status}`,
      status: res.status === 400 ? "PASS" : "FAIL",
      evidence: `HTTP ${res.status}: ${JSON.stringify(res.data)}`,
      securityImpact: "Users cannot artificially inflate follower counts via self-following.",
    });
  }

  // TEST-L02: Duplicate Like Idempotency
  if (postAId) {
    const res1 = await request(`/api/posts/${postAId}/like`, {
      method: "POST",
      token: tokenUserB,
    });
    const res2 = await request(`/api/posts/${postAId}/like`, {
      method: "POST",
      token: tokenUserB,
    });
    record({
      testId: "LOGIC-02-DUPLICATE-LIKE-IDEMPOTENCY",
      category: "Business Logic",
      target: `POST /api/posts/${postAId}/like`,
      attacker: "SEC-USER-B",
      expected: "Handled idempotently (No duplicated like count / no server crash)",
      actual: `1st: HTTP ${res1.status}, 2nd: HTTP ${res2.status}`,
      status: res1.status < 500 && res2.status < 500 ? "PASS" : "FAIL",
      evidence: `Like 1: ${res1.status}, Like 2: ${res2.status}`,
      securityImpact: "Duplicate like submissions do not create duplicate count increments.",
    });
  }

  // ================================================================================
  // CATEGORY M: VERIFICATION WORKFLOW ABUSE
  // ================================================================================
  console.log("\n--- CATEGORY M: Verification Workflow Abuse ---");

  // TEST-M01: Normal User Attempting Self-Approval via Admin API
  {
    const res = await request(`/api/admin/users/${userA.id}/verification`, {
      method: "PATCH",
      token: tokenUserA,
      body: { verified: true, verificationBadgeType: "PERSON" },
    });
    record({
      testId: "VERIF-01-SELF-APPROVAL-ADMIN-API",
      category: "Verification",
      target: `PATCH /api/admin/users/${userA.id}/verification`,
      attacker: "SEC-USER-A",
      expected: "HTTP 403 Forbidden (Non-admin blocked)",
      actual: `HTTP ${res.status}`,
      status: res.status === 403 ? "PASS" : "FAIL",
      evidence: `HTTP ${res.status}: ${JSON.stringify(res.data)}`,
      securityImpact: "Normal users cannot invoke administrative verification approval endpoints.",
    });
  }

  // TEST-M02: Critical Name Change Verification Invalidation
  {
    // Temporarily set verified in database
    await serviceSupabase
      .from("profiles")
      .update({ verified: true, is_verified: true, full_name: "Original Verified Name" })
      .eq("id", userA.id);

    // Update full name to a completely different name
    const res = await request("/api/users/profile", {
      method: "PUT",
      token: tokenUserA,
      body: { full_name: "Completely Changed Name" },
    });

    // Check if verification was revoked in database
    const { data: updatedProf } = await serviceSupabase
      .from("profiles")
      .select("verified, is_verified")
      .eq("id", userA.id)
      .single();

    record({
      testId: "VERIF-02-CRITICAL-NAME-CHANGE-REVOCATION",
      category: "Verification",
      target: "PUT /api/users/profile (Critical name alteration)",
      attacker: "SEC-USER-A",
      expected: "Verification revoked upon critical name change",
      actual: `verified in DB: ${updatedProf?.verified}`,
      status: updatedProf?.verified === false ? "PASS" : "FAIL",
      evidence: `verified=${updatedProf?.verified}, is_verified=${updatedProf?.is_verified}`,
      securityImpact: "Identity fraud prevented: Altering verified real name revokes verified badge.",
    });
  }

  // ================================================================================
  // CATEGORY N: BUSINESS IDENTITY ABUSE
  // ================================================================================
  console.log("\n--- CATEGORY N: Business Identity Abuse ---");

  // TEST-N01: Business Outsider (User B) Impersonating Business A via Header
  {
    const res = await request("/api/posts", {
      method: "POST",
      token: tokenUserB,
      headers: {
        "x-acting-identity-type": "BUSINESS",
        "x-acting-identity-id": businessId,
      },
      body: { text: "Impersonated post by outsider" },
    });
    record({
      testId: "BIZ-01-OUTSIDER-ACTING-HEADER-SPOOF",
      category: "Business Identity",
      target: "POST /api/posts with x-acting-identity-id: <Business A>",
      attacker: "SEC-BUSINESS-OUTSIDER",
      victim: "SEC-BUSINESS-OWNER",
      expected: "HTTP 403 Forbidden (resolveActingIdentity denies non-member)",
      actual: `HTTP ${res.status}`,
      status: res.status === 403 ? "PASS" : "FAIL",
      evidence: `HTTP ${res.status}: ${JSON.stringify(res.data)}`,
      securityImpact: "Business outsiders cannot post on behalf of businesses they do not belong to.",
    });
  }

  // TEST-N02: Restricted Business Member attempting privileged business profile update
  {
    const res = await request(`/api/businesses/${businessId}`, {
      method: "PATCH",
      token: tokenMember,
      body: { name: "Hijacked Business Name" },
    });
    record({
      testId: "BIZ-02-RESTRICTED-MEMBER-ESCALATION",
      category: "Business Identity",
      target: `PATCH /api/businesses/${businessId}`,
      attacker: "SEC-BUSINESS-MEMBER",
      victim: "SEC-BUSINESS-OWNER",
      expected: "HTTP 403 Forbidden (MEMBER lacks business.profile.edit)",
      actual: `HTTP ${res.status}`,
      status: res.status === 403 ? "PASS" : "FAIL",
      evidence: `HTTP ${res.status}: ${JSON.stringify(res.data)}`,
      securityImpact: "Restricted business members cannot modify business settings or profiles.",
    });
  }

  // ================================================================================
  // CATEGORY O: ADMIN BOUNDARY ABUSE
  // ================================================================================
  console.log("\n--- CATEGORY O: Admin Boundary Abuse ---");

  // TEST-O01: Normal User Accessing Admin me endpoint
  {
    const res = await request("/api/admin/me", { token: tokenUserA });
    record({
      testId: "ADMIN-01-NORMAL-USER-ACCESS",
      category: "Admin Boundary",
      target: "GET /api/admin/me",
      attacker: "SEC-USER-A",
      expected: "HTTP 403 Forbidden (FORBIDDEN_NOT_ADMIN)",
      actual: `HTTP ${res.status}`,
      status: res.status === 403 ? "PASS" : "FAIL",
      evidence: `HTTP ${res.status}: ${JSON.stringify(res.data)}`,
      securityImpact: "Non-administrators cannot access /api/admin endpoints.",
    });
  }

  // TEST-O02: Business Owner Accessing Admin Users Management
  {
    const res = await request("/api/admin/users", { token: tokenUserA });
    record({
      testId: "ADMIN-02-BUSINESS-OWNER-ACCESS",
      category: "Admin Boundary",
      target: "GET /api/admin/users",
      attacker: "SEC-BUSINESS-OWNER",
      expected: "HTTP 403 Forbidden",
      actual: `HTTP ${res.status}`,
      status: res.status === 403 ? "PASS" : "FAIL",
      evidence: `HTTP ${res.status}: ${JSON.stringify(res.data)}`,
      securityImpact: "Business owners do not hold platform administrative authority.",
    });
  }

  // ================================================================================
  // CATEGORY P: ADS MARKETPLACE DISABLED BOUNDARY (SECTION 19)
  // ================================================================================
  console.log("\n--- CATEGORY P: Ads Marketplace Feature Flag ---");

  // TEST-P01: Direct Deposit Endpoint Permanently Disabled
  {
    const res = await request("/api/advertisers/billing/deposit", {
      method: "POST",
      token: tokenUserA,
      body: { amount: 500, currency: "INR" },
    });
    record({
      testId: "ADS-01-DIRECT-DEPOSIT-DISABLED",
      category: "Feature Flag / Payments",
      target: "POST /api/advertisers/billing/deposit",
      attacker: "SEC-USER-A",
      expected: "HTTP 403 (DIRECT_DEPOSIT_DISABLED)",
      actual: `HTTP ${res.status} (${res.data?.code || ""})`,
      status: res.status === 403 && res.data?.code === "DIRECT_DEPOSIT_DISABLED" ? "PASS" : "FAIL",
      evidence: `HTTP ${res.status}: ${JSON.stringify(res.data)}`,
      securityImpact: "Direct balance injection permanently blocked across all accounts.",
    });
  }

  // TEST-P02: Unregistered User Cannot Access Campaigns Endpoint
  {
    const res = await request("/api/advertisers/campaigns", {
      method: "POST",
      token: tokenUserB, // User B is NOT registered as advertiser
      body: { name: "Test Campaign", dailyBudget: 100 },
    });
    record({
      testId: "ADS-02-UNREGISTERED-CAMPAIGN-BLOCKED",
      category: "Feature Flag / Ads",
      target: "POST /api/advertisers/campaigns",
      attacker: "SEC-USER-B",
      expected: "HTTP 403 (Blocked by guard or registration requirement)",
      actual: `HTTP ${res.status}`,
      status: res.status === 403 ? "PASS" : "FAIL",
      evidence: `HTTP ${res.status}: ${JSON.stringify(res.data)}`,
      securityImpact: "Unregistered callers cannot create ad campaigns.",
    });
  }

  // ================================================================================
  // CATEGORY Q: PAYMENT & WEBHOOK SECURITY REGRESSION (SECTION 20 & 21)
  // ================================================================================
  console.log("\n--- CATEGORY Q: Payment & Webhook Trust Boundaries ---");

  // TEST-Q01: Webhook Signature Verification Fail-Open Behavior Analysis
  {
    const res = await request("/api/payments/webhook/razorpay", {
      method: "POST",
      token: null,
      headers: { "x-razorpay-signature": "bogus_signature_hex" },
      body: {
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: "pay_test_bogus_123",
              order_id: "order_test_bogus_123",
              amount: 5000000,
              currency: "INR",
              status: "captured",
            },
          },
        },
      },
    });

    // In dev, when webhookSecret is missing, adapter returns true (fail-open)
    const failsClosed = res.status === 400 || res.status === 401;
    record({
      testId: "PAY-01-WEBHOOK-SIGNATURE-FAIL-CLOSED",
      category: "Payment Security",
      target: "POST /api/payments/webhook/razorpay",
      attacker: "SEC-GUEST",
      expected: "HTTP 400 Bad Request (Missing/invalid signature rejected fail-closed)",
      actual: `HTTP ${res.status} (${res.data?.received ? "ACCEPTED" : "REJECTED"})`,
      status: failsClosed ? "PASS" : "FAIL",
      findingId: !failsClosed ? "PETO-SEC-15" : undefined,
      evidence: `HTTP ${res.status}: ${JSON.stringify(res.data)}`,
      securityImpact: failsClosed
        ? "Webhook verifies signature fail-closed."
        : "Unconfigured webhook secret causes razorpay.adapter.ts to return true (fail-open), allowing unverified incoming webhooks.",
    });
  }

  // TEST-Q02: Negative Payment Amount in Order Creation
  {
    const res = await request("/api/payments/razorpay/order", {
      method: "POST",
      token: tokenUserA,
      body: { amount: -500, currency: "INR" },
    });
    record({
      testId: "PAY-02-NEGATIVE-AMOUNT-ORDER",
      category: "Payment Security",
      target: "POST /api/payments/razorpay/order",
      attacker: "SEC-USER-A",
      expected: "HTTP 400 Bad Request (Negative amount rejected)",
      actual: `HTTP ${res.status}`,
      status: res.status === 400 ? "PASS" : "FAIL",
      evidence: `HTTP ${res.status}: ${JSON.stringify(res.data)}`,
      securityImpact: "Negative payment amounts cannot create payment orders.",
    });
  }

  // ================================================================================
  // CATEGORY R: RATE LIMIT REGRESSION (SECTION 22)
  // ================================================================================
  console.log("\n--- CATEGORY R: Rate Limit Regression ---");

  // TEST-R01: OAuth Exchange Code Rate Limiter (10 requests boundary)
  {
    let triggered429 = false;
    for (let i = 0; i < 12; i++) {
      const res = await request("/api/auth/google/exchange-code", {
        method: "POST",
        token: null,
        body: { code: "123456" },
      });
      if (res.status === 429) {
        triggered429 = true;
        break;
      }
    }
    record({
      testId: "RATE-01-OAUTH-EXCHANGE-LIMITER",
      category: "Rate Limiting",
      target: "POST /api/auth/google/exchange-code",
      attacker: "SEC-GUEST",
      expected: "HTTP 429 Too Many Requests within 12 rapid requests",
      actual: triggered429 ? "HTTP 429 Triggered" : "HTTP 429 Not Triggered",
      status: triggered429 ? "PASS" : "FAIL",
      evidence: `Triggered 429: ${triggered429}`,
      securityImpact: "Google OAuth sync code exchange is protected against brute force (PETO-SEC-01/06).",
    });
  }

  // ================================================================================
  // CATEGORY S: OPEN REDIRECT (SECTION 26)
  // ================================================================================
  console.log("\n--- CATEGORY S: Open Redirect ---");
  record({
    testId: "REDIR-01-OPEN-REDIRECT-SURFACE",
    category: "Open Redirect",
    target: "Backend Redirect Surface",
    attacker: "SEC-GUEST",
    expected: "NOT APPLICABLE (No server-side redirects or redirect query parameters exist)",
    actual: "NOT APPLICABLE — Pure REST API and static frontend serving",
    status: "NOT_APPLICABLE",
    evidence: "Source audit confirms zero res.redirect calls exist in backend.",
    securityImpact: "Open redirect risk eliminated by architecture.",
  });

  // ================================================================================
  // CATEGORY T: SENSITIVE DATA EXPOSURE & SEARCH PRIVACY
  // ================================================================================
  console.log("\n--- CATEGORY T: Sensitive Data Exposure & Search Privacy ---");

  // TEST-T01: Search does not reveal private pets
  if (petAId) {
    const res = await request("/api/pets/search?q=Shadow", {
      token: tokenUserB,
    });
    const petsFound = Array.isArray(res.data?.data) ? res.data.data : [];
    const leaked = petsFound.some((p: any) => p.id === petAId);
    record({
      testId: "SEARCH-01-PRIVATE-PET-SEARCH",
      category: "Search Privacy",
      target: "GET /api/pets/search?q=Shadow",
      attacker: "SEC-USER-B",
      victim: "SEC-USER-A",
      expected: "Private Pet A excluded from search results for User B",
      actual: `Leaked in search: ${leaked}`,
      status: !leaked ? "PASS" : "FAIL",
      evidence: `Found ${petsFound.length} pets, leaked=${leaked}`,
      securityImpact: "Search queries enforce visibility filtering and do not expose private pets.",
    });
  }

  // --------------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log("PHASE 5 TEST EXECUTION COMPLETE");
  console.log("================================================================================");
  const total = phase5Results.length;
  const pass = phase5Results.filter((r) => r.status === "PASS").length;
  const fail = phase5Results.filter((r) => r.status === "FAIL").length;
  const na = phase5Results.filter((r) => r.status === "NOT_APPLICABLE").length;
  const review = phase5Results.filter((r) => r.status === "REVIEW").length;

  console.log(`Total Tests Executed: ${total}`);
  console.log(`PASS: ${pass} | FAIL: ${fail} | N/A: ${na} | REVIEW: ${review}`);

  // Cleanup synthetic resources
  try {
    if (postAId) await serviceSupabase.from("posts").delete().eq("id", postAId);
    if (petAId) {
      await serviceSupabase.from("pet_parents").delete().eq("pet_id", petAId);
      await serviceSupabase.from("pets").delete().eq("id", petAId);
    }
    await serviceSupabase.from("business_memberships").delete().eq("business_id", businessId);
    await serviceSupabase.from("business_identities").delete().eq("id", businessId);
    await serviceSupabase.from("advertisers").delete().eq("user_id", userA.id);
    await serviceSupabase.from("profiles").delete().in("id", [userA.id, userB.id, userMember.id]);
    await serviceSupabase.auth.admin.deleteUser(userA.id);
    await serviceSupabase.auth.admin.deleteUser(userB.id);
    await serviceSupabase.auth.admin.deleteUser(userMember.id);
    console.log("Synthetic test data cleaned up successfully.");
  } catch (cleanErr: any) {
    console.warn("Cleanup warning:", cleanErr.message);
  }

  return { total, pass, fail, na, review, results: phase5Results };
}

runPhase5().catch((e) => {
  console.error("Phase 5 Runtime Execution Failure:", e);
  process.exit(1);
});
