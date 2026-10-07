import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import { supabase as serviceSupabase } from "../src/config/supabase.js";
import { RazorpayAdapter } from "../src/payments/adapters/razorpay.adapter.js";
import { StripeAdapter } from "../src/payments/adapters/stripe.adapter.js";
import { PaymentService } from "../src/payments/payment.service.js";

const BACKEND_BASE = "http://localhost:5000";
const SUPABASE_URL = process.env.SUPABASE_URL || "https://ednleoavhuxlarnnlmkq.supabase.co";
const ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

export interface Phase6TestResult {
  testId: string;
  category: string;
  expected: string;
  actual: string;
  status: "PASS" | "FAIL";
  evidence?: string;
  securityImpact?: string;
}

export const phase6Results: Phase6TestResult[] = [];

function record(r: Phase6TestResult) {
  phase6Results.push(r);
  const mark = r.status === "PASS" ? "✅ PASS" : "❌ FAIL";
  console.log(`[${r.testId}] ${mark} | ${r.category} -> ${r.actual}`);
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

async function runPhase6Tests() {
  console.log("================================================================================");
  console.log("PETO SECURITY — PHASE 6: TARGETED REMEDIATION VALIDATION SUITE");
  console.log("VALIDATING: PETO-SEC-15, PETO-SEC-16, PETO-SEC-17, PETO-SEC-18, P5-OBS-01");
  console.log("================================================================================\n");

  // Synthetic Test User Setup
  const ts = Date.now();
  const testPassword = "SecP@ssw0rd!2026_Phase6";
  const emailVerifiedPerson = `sec_verified_p6_${ts}@petotest.local`;
  const emailUnverifiedPerson = `sec_unverified_p6_${ts}@petotest.local`;

  console.log("[0] Provisioning Isolated Synthetic Test Accounts...");
  const [resVerified, resUnverified] = await Promise.all([
    serviceSupabase.auth.admin.createUser({
      email: emailVerifiedPerson,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: "Original Verified Real Name" },
    }),
    serviceSupabase.auth.admin.createUser({
      email: emailUnverifiedPerson,
      password: testPassword,
      email_confirm: true,
      user_metadata: { full_name: "Unverified Person" },
    }),
  ]);

  const userVerified = resVerified.data?.user;
  const userUnverified = resUnverified.data?.user;

  if (!userVerified || !userUnverified) {
    throw new Error("Failed to create synthetic test users");
  }

  // Seed Profiles
  await serviceSupabase.from("profiles").upsert([
    {
      id: userVerified.id,
      username: `verif_p6_${ts}`,
      full_name: "Original Verified Real Name",
      verified: true,
      is_verified: true,
      verification_badge_type: "PERSON",
    },
    {
      id: userUnverified.id,
      username: `unverif_p6_${ts}`,
      full_name: "Unverified Person",
      verified: false,
      is_verified: false,
      verification_badge_type: "NONE",
    },
  ]);

  // Seed Approved Verification Application for userVerified
  await serviceSupabase.from("verification_applications").insert({
    user_id: userVerified.id,
    verification_type: "INDIVIDUAL_IDENTITY",
    status: "APPROVED",
    verified_name: "Original Verified Real Name",
    legal_first_name: "Original",
    legal_last_name: "Verified",
  });

  // Login to get tokens
  const authClient = createClient(SUPABASE_URL, ANON_KEY);
  const [loginV, loginU] = await Promise.all([
    authClient.auth.signInWithPassword({
      email: emailVerifiedPerson,
      password: testPassword,
    }),
    authClient.auth.signInWithPassword({
      email: emailUnverifiedPerson,
      password: testPassword,
    }),
  ]);

  const tokenVerified = loginV.data?.session?.access_token;
  const tokenUnverified = loginU.data?.session?.access_token;

  if (!tokenVerified || !tokenUnverified) {
    throw new Error("Failed to acquire session JWTs for synthetic test accounts");
  }

  // ============================================================================
  // 1. PETO-SEC-15: PAYMENT WEBHOOK FAIL-OPEN REMEDIATION
  // ============================================================================
  console.log("\n--- SECTION 1: PETO-SEC-15 (Payment Webhook Fail-Closed) ---");

  // SEC15-01: Razorpay missing webhook secret -> REJECT
  {
    const origSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    const adapter = new RazorpayAdapter();
    const isValid = adapter.verifyWebhookSignature(
      { "x-razorpay-signature": "bogus_sig" },
      { event: "payment.captured" }
    );
    if (origSecret) process.env.RAZORPAY_WEBHOOK_SECRET = origSecret;

    record({
      testId: "SEC15-01",
      category: "Payment Webhook",
      expected: "verifyWebhookSignature returns FALSE when secret is missing",
      actual: `Returned ${isValid}`,
      status: isValid === false ? "PASS" : "FAIL",
    });
  }

  // SEC15-02: Razorpay empty / whitespace webhook secret -> REJECT
  {
    const origSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    process.env.RAZORPAY_WEBHOOK_SECRET = "   ";
    const adapter = new RazorpayAdapter();
    const isValid = adapter.verifyWebhookSignature(
      { "x-razorpay-signature": "bogus_sig" },
      { event: "payment.captured" }
    );
    if (origSecret) process.env.RAZORPAY_WEBHOOK_SECRET = origSecret;

    record({
      testId: "SEC15-02",
      category: "Payment Webhook",
      expected: "verifyWebhookSignature returns FALSE when secret is whitespace",
      actual: `Returned ${isValid}`,
      status: isValid === false ? "PASS" : "FAIL",
    });
  }

  // SEC15-03: Razorpay invalid signature -> REJECT via API
  {
    const res = await request("/api/payments/webhook/razorpay", {
      method: "POST",
      headers: { "x-razorpay-signature": "invalid_hex_signature" },
      body: { event: "payment.captured", id: `evt_fake_${Date.now()}` },
    });

    record({
      testId: "SEC15-03",
      category: "Payment Webhook",
      expected: "HTTP 400 Bad Request on invalid signature",
      actual: `HTTP ${res.status} (received: ${res.data?.received})`,
      status: res.status === 400 && res.data?.received !== true ? "PASS" : "FAIL",
    });
  }

  // SEC15-04: Razorpay missing signature header -> REJECT
  {
    const res = await request("/api/payments/webhook/razorpay", {
      method: "POST",
      body: { event: "payment.captured", id: `evt_fake_${Date.now()}` },
    });

    record({
      testId: "SEC15-04",
      category: "Payment Webhook",
      expected: "HTTP 400 Bad Request on missing signature",
      actual: `HTTP ${res.status}`,
      status: res.status === 400 ? "PASS" : "FAIL",
    });
  }

  // SEC15-05: Razorpay valid configured signature -> ACCEPT
  {
    const testSecret = "sec_test_rzp_secret_phase6_12345";
    process.env.RAZORPAY_WEBHOOK_SECRET = testSecret;
    const adapter = new RazorpayAdapter();

    const payload = JSON.stringify({ event: "payment.authorized", event_id: `evt_val_${Date.now()}` });
    const signature = crypto.createHmac("sha256", testSecret).update(payload).digest("hex");

    const isValid = adapter.verifyWebhookSignature(
      { "x-razorpay-signature": signature },
      payload
    );

    record({
      testId: "SEC15-05",
      category: "Payment Webhook",
      expected: "Adapter returns TRUE for cryptographically authentic HMAC signature",
      actual: `Returned ${isValid}`,
      status: isValid === true ? "PASS" : "FAIL",
    });
  }

  // SEC15-06: Rejected Razorpay webhook causes zero financial mutation
  {
    // Snapshot financial tables
    const { count: txCountBefore } = await serviceSupabase
      .from("payment_transactions")
      .select("*", { count: "exact", head: true });
    const { count: ledgerCountBefore } = await serviceSupabase
      .from("payment_ledger")
      .select("*", { count: "exact", head: true });

    // Send forged capture webhook
    await request("/api/payments/webhook/razorpay", {
      method: "POST",
      headers: { "x-razorpay-signature": "forged_malicious_sig" },
      body: {
        event: "payment.captured",
        payload: {
          payment: {
            entity: {
              id: "pay_forged_999",
              order_id: "order_forged_999",
              amount: 5000000,
              currency: "INR",
              status: "captured",
            },
          },
        },
      },
    });

    // Check financial tables unchanged
    const { count: txCountAfter } = await serviceSupabase
      .from("payment_transactions")
      .select("*", { count: "exact", head: true });
    const { count: ledgerCountAfter } = await serviceSupabase
      .from("payment_ledger")
      .select("*", { count: "exact", head: true });

    const zeroMutation = txCountBefore === txCountAfter && ledgerCountBefore === ledgerCountAfter;

    record({
      testId: "SEC15-06",
      category: "Payment Financial Mutation",
      expected: "Zero mutations in payment_transactions and payment_ledger on rejected webhook",
      actual: `tx: ${txCountBefore} -> ${txCountAfter}, ledger: ${ledgerCountBefore} -> ${ledgerCountAfter}`,
      status: zeroMutation ? "PASS" : "FAIL",
    });
  }

  // SEC15-07: Stripe missing webhook secret -> REJECT
  {
    const origSecret = process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const adapter = new StripeAdapter();
    const isValid = adapter.verifyWebhookSignature(
      { "stripe-signature": "t=12345,v1=bogus_sig" },
      { type: "payment_intent.succeeded" }
    );
    if (origSecret) process.env.STRIPE_WEBHOOK_SECRET = origSecret;

    record({
      testId: "SEC15-07",
      category: "Payment Webhook",
      expected: "Stripe adapter returns FALSE when secret is missing",
      actual: `Returned ${isValid}`,
      status: isValid === false ? "PASS" : "FAIL",
    });
  }

  // SEC15-08: Stripe invalid signature -> REJECT via API
  {
    const res = await request("/api/payments/webhook/stripe", {
      method: "POST",
      headers: { "stripe-signature": "t=1700000000,v1=invalid_hex_sig" },
      body: { type: "payment_intent.succeeded", id: `evt_stripe_${Date.now()}` },
    });

    record({
      testId: "SEC15-08",
      category: "Payment Webhook",
      expected: "HTTP 400 Bad Request on invalid Stripe signature",
      actual: `HTTP ${res.status}`,
      status: res.status === 400 ? "PASS" : "FAIL",
    });
  }

  // SEC15-09: Stripe valid configured signature -> ACCEPT
  {
    const testSecret = "sec_test_stripe_whsec_phase6_12345";
    process.env.STRIPE_WEBHOOK_SECRET = testSecret;
    const adapter = new StripeAdapter();

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const payload = JSON.stringify({ type: "checkout.session.completed", id: `evt_val_${Date.now()}` });
    const expectedSig = crypto
      .createHmac("sha256", testSecret)
      .update(`${timestamp}.${payload}`)
      .digest("hex");

    const isValid = adapter.verifyWebhookSignature(
      { "stripe-signature": `t=${timestamp},v1=${expectedSig}` },
      payload
    );

    record({
      testId: "SEC15-09",
      category: "Payment Webhook",
      expected: "Stripe adapter returns TRUE for valid configured signature",
      actual: `Returned ${isValid}`,
      status: isValid === true ? "PASS" : "FAIL",
    });
  }

  // SEC15-10: Rejected Stripe webhook causes zero financial mutation
  {
    const { count: txCountBefore } = await serviceSupabase
      .from("payment_transactions")
      .select("*", { count: "exact", head: true });

    await request("/api/payments/webhook/stripe", {
      method: "POST",
      headers: { "stripe-signature": "t=123,v1=forged" },
      body: { type: "payment_intent.succeeded", id: `evt_forged_${Date.now()}` },
    });

    const { count: txCountAfter } = await serviceSupabase
      .from("payment_transactions")
      .select("*", { count: "exact", head: true });

    record({
      testId: "SEC15-10",
      category: "Payment Financial Mutation",
      expected: "Zero mutations on rejected Stripe webhook",
      actual: `tx: ${txCountBefore} -> ${txCountAfter}`,
      status: txCountBefore === txCountAfter ? "PASS" : "FAIL",
    });
  }

  // ============================================================================
  // 2. PETO-SEC-16: VERIFICATION NAME CHANGE REMEDIATION
  // ============================================================================
  console.log("\n--- SECTION 2: PETO-SEC-16 (Verification Name Change) ---");

  // SEC16-05: Non-critical edit (Bio change) does NOT remove verification
  {
    const res = await request("/api/users/profile", {
      method: "PUT",
      token: tokenVerified,
      body: { bio: "Updated Bio - Loving my dog" },
    });

    const { data: prof } = await serviceSupabase
      .from("profiles")
      .select("verified, is_verified, verification_badge_type")
      .eq("id", userVerified.id)
      .single();

    record({
      testId: "SEC16-05",
      category: "Identity Verification",
      expected: "Bio change preserves verification (verified=true, badge=PERSON)",
      actual: `verified: ${prof?.verified}, badge: ${prof?.verification_badge_type}`,
      status: prof?.verified === true && prof?.verification_badge_type === "PERSON" ? "PASS" : "FAIL",
    });
  }

  // SEC16-06: Non-critical edit (Avatar change) does NOT remove verification
  {
    const res = await request("/api/users/profile", {
      method: "PUT",
      token: tokenVerified,
      body: { avatar_url: "https://example.com/new_avatar.jpg" },
    });

    const { data: prof } = await serviceSupabase
      .from("profiles")
      .select("verified, is_verified, verification_badge_type")
      .eq("id", userVerified.id)
      .single();

    record({
      testId: "SEC16-06",
      category: "Identity Verification",
      expected: "Avatar change preserves verification",
      actual: `verified: ${prof?.verified}`,
      status: prof?.verified === true ? "PASS" : "FAIL",
    });
  }

  // SEC16-07: Non-critical edit (Cover change) does NOT remove verification
  {
    const res = await request("/api/users/profile", {
      method: "PUT",
      token: tokenVerified,
      body: { cover_url: "https://example.com/new_cover.jpg" },
    });

    const { data: prof } = await serviceSupabase
      .from("profiles")
      .select("verified, is_verified, verification_badge_type")
      .eq("id", userVerified.id)
      .single();

    record({
      testId: "SEC16-07",
      category: "Identity Verification",
      expected: "Cover change preserves verification",
      actual: `verified: ${prof?.verified}`,
      status: prof?.verified === true ? "PASS" : "FAIL",
    });
  }

  // SEC16-01 to SEC16-04: Critical Verified Name Alteration
  {
    const res = await request("/api/users/profile", {
      method: "PUT",
      token: tokenVerified,
      body: { full_name: "Completely Changed Celebrity Name" },
    });

    // Check DB profile state
    const { data: updatedProf } = await serviceSupabase
      .from("profiles")
      .select("full_name, verified, is_verified, verification_badge_type")
      .eq("id", userVerified.id)
      .single();

    // Check verification_applications state
    const { data: appData } = await serviceSupabase
      .from("verification_applications")
      .select("status, reverification_reason")
      .eq("user_id", userVerified.id)
      .eq("verification_type", "INDIVIDUAL_IDENTITY")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // SEC16-01: Response and DB signal reverification required
    record({
      testId: "SEC16-01",
      category: "Identity Verification",
      expected: "reverification_required: true in response and status updated in DB",
      actual: `reverification_required: ${res.data?.reverification_required}, app status: ${appData?.status}`,
      status: res.data?.reverification_required === true && appData?.status === "REVERIFICATION_REQUIRED" ? "PASS" : "FAIL",
    });

    // SEC16-02: Public verified status becomes false in database
    record({
      testId: "SEC16-02",
      category: "Identity Verification",
      expected: "verified=false, is_verified=false in profiles table",
      actual: `verified=${updatedProf?.verified}, is_verified=${updatedProf?.is_verified}`,
      status: updatedProf?.verified === false && updatedProf?.is_verified === false ? "PASS" : "FAIL",
    });

    // SEC16-03: Blue badge disappears (verification_badge_type = NONE)
    record({
      testId: "SEC16-03",
      category: "Identity Verification",
      expected: "verification_badge_type = 'NONE'",
      actual: `badge_type: ${updatedProf?.verification_badge_type}`,
      status: updatedProf?.verification_badge_type === "NONE" ? "PASS" : "FAIL",
    });

    // SEC16-04: Verification record preserved (not deleted)
    record({
      testId: "SEC16-04",
      category: "Identity Verification",
      expected: "Verification application record preserved with reason",
      actual: `Preserved record with reason: ${appData?.reverification_reason}`,
      status: Boolean(appData && appData.reverification_reason) ? "PASS" : "FAIL",
    });
  }

  // SEC16-08: Unverified user changing name remains unverified
  {
    const res = await request("/api/users/profile", {
      method: "PUT",
      token: tokenUnverified,
      body: { full_name: "Another Unverified Name" },
    });

    const { data: profU } = await serviceSupabase
      .from("profiles")
      .select("verified, is_verified, verification_badge_type")
      .eq("id", userUnverified.id)
      .single();

    record({
      testId: "SEC16-08",
      category: "Identity Verification",
      expected: "Unverified user remains verified=false after name update",
      actual: `verified=${profU?.verified}, badge=${profU?.verification_badge_type}`,
      status: profU?.verified === false && profU?.verification_badge_type === "NONE" ? "PASS" : "FAIL",
    });
  }

  // SEC16-09: Client cannot restore verified=true via mass assignment
  {
    const res = await request("/api/users/profile", {
      method: "PUT",
      token: tokenUnverified,
      body: {
        bio: "Hacker Bio",
        verified: true,
        is_verified: true,
        verification_badge_type: "PERSON",
      },
    });

    const { data: profSpoof } = await serviceSupabase
      .from("profiles")
      .select("verified, is_verified, verification_badge_type")
      .eq("id", userUnverified.id)
      .single();

    record({
      testId: "SEC16-09",
      category: "Identity Verification Mass Assignment",
      expected: "Client cannot self-grant verified status via request payload",
      actual: `verified in DB: ${profSpoof?.verified}, badge: ${profSpoof?.verification_badge_type}`,
      status: profSpoof?.verified === false && profSpoof?.verification_badge_type === "NONE" ? "PASS" : "FAIL",
    });
  }

  // SEC16-10: Web consumes updated verification state correctly
  {
    const res = await request(`/api/users/${userVerified.id}/profile`, {
      token: tokenVerified,
    });
    const profileData = res.data?.data || res.data;
    const webRendersBadge = Boolean(profileData?.verified || profileData?.is_verified);

    record({
      testId: "SEC16-10",
      category: "Frontend Badge Contract (Web)",
      expected: "Web profile payload exposes verified=false, disabling blue badge",
      actual: `webRendersBadge: ${webRendersBadge} (verified=${profileData?.verified})`,
      status: webRendersBadge === false ? "PASS" : "FAIL",
    });
  }

  // SEC16-11: Flutter consumes updated verification state correctly
  {
    const res = await request(`/api/users/${userVerified.id}`, {
      token: tokenVerified,
    });
    const data = res.data?.data || res.data;
    const flutterIsVerified = data?.is_verified === true || data?.verified === true;

    record({
      testId: "SEC16-11",
      category: "Mobile Badge Contract (Flutter)",
      expected: "Flutter user payload exposes is_verified=false",
      actual: `flutterIsVerified: ${flutterIsVerified}`,
      status: flutterIsVerified === false ? "PASS" : "FAIL",
    });
  }

  // ============================================================================
  // 3. PETO-SEC-17: POSTGREST SEARCH FILTER GRAMMAR SANITIZATION
  // ============================================================================
  console.log("\n--- SECTION 3: PETO-SEC-17 (PostgREST Search Filter Sanitization) ---");

  const searchProbes = [
    { label: "normal text", query: "john doe" },
    { label: "single quote", query: "O'Connor" },
    { label: "double quote", query: '"superdog"' },
    { label: "comma separator", query: "alpha,beta" },
    { label: "parentheses", query: "club (official)" },
    { label: "period delimiter", query: "pet.club" },
    { label: "percent wildcard", query: "100% purebred" },
    { label: "underscore wildcard", query: "pet_lovers" },
    { label: "backslash", query: "test\\search" },
    { label: "spaces", query: "golden retriever club" },
    { label: "Unicode name", query: "日本語ハチ公" },
    { label: "emoji", query: "🐕 Golden Retriever" },
    { label: "SQL injection probe", query: "' OR 1=1 --" },
    { label: "PostgREST filter injection", query: ",id.neq.00000000-0000-0000-0000-000000000000" },
    { label: "nested grammar", query: "nested(logic,tree).in()" },
    { label: "oversized query", query: "a".repeat(250) },
  ];

  for (let i = 0; i < searchProbes.length; i++) {
    const probe = searchProbes[i];
    const userRes = await request(`/api/users/search?q=${encodeURIComponent(probe.query)}`, {
      token: tokenVerified,
    });
    const commRes = await request(`/api/communities?search=${encodeURIComponent(probe.query)}`, {
      token: tokenVerified,
    });

    const isSafe = (userRes.status === 200 || userRes.status === 400) &&
                   (commRes.status === 200 || commRes.status === 400);

    const leaksGrammar =
      JSON.stringify(userRes.data).includes("logic tree") ||
      JSON.stringify(commRes.data).includes("logic tree") ||
      JSON.stringify(userRes.data).includes("syntax error") ||
      JSON.stringify(commRes.data).includes("syntax error");

    record({
      testId: `SEC17-${String(i + 1).padStart(2, "0")}`,
      category: `Search Sanitization [${probe.label}]`,
      expected: "HTTP 200 or 400 without 500 or PostgREST parser leak",
      actual: `Users: HTTP ${userRes.status}, Communities: HTTP ${commRes.status}, Leaks grammar: ${leaksGrammar}`,
      status: isSafe && !leaksGrammar ? "PASS" : "FAIL",
    });
  }

  // ============================================================================
  // 4. PETO-SEC-18: UUID ROUTE VALIDATION
  // ============================================================================
  console.log("\n--- SECTION 4: PETO-SEC-18 (UUID Route Validation) ---");

  const malformedUuids = [
    { label: "not-a-valid-uuid", val: "not-a-valid-uuid" },
    { label: "integer string", val: "123" },
    { label: "all zeros short", val: "0000" },
    { label: "extra characters appended", val: "11111111-1111-1111-1111-111111111111extra" },
    { label: "SQL injection in path", val: "' OR 1=1 --" },
  ];

  for (let i = 0; i < malformedUuids.length; i++) {
    const m = malformedUuids[i];

    // Post route
    const postRes = await request(`/api/posts/${encodeURIComponent(m.val)}`, {
      token: tokenVerified,
    });
    const postCommentsRes = await request(`/api/posts/${encodeURIComponent(m.val)}/comments`, {
      token: tokenVerified,
    });
    const postLikesRes = await request(`/api/posts/${encodeURIComponent(m.val)}/likes`, {
      token: tokenVerified,
    });
    // Pet route (configured with opaqueNotFound)
    const petRes = await request(`/api/pets/${encodeURIComponent(m.val)}`, {
      token: tokenVerified,
    });

    const isPostControlled = postRes.status === 400 || postRes.status === 404;
    const isCommentsControlled = postCommentsRes.status === 400 || postCommentsRes.status === 404;
    const isPetControlled = petRes.status === 400 || petRes.status === 404;

    const leaks22P02 =
      JSON.stringify(postRes.data).includes("22P02") ||
      JSON.stringify(petRes.data).includes("22P02") ||
      JSON.stringify(postRes.data).includes("invalid input syntax for type uuid");

    const passes = isPostControlled && isCommentsControlled && isPetControlled && !leaks22P02;

    record({
      testId: `SEC18-${String(i + 1).padStart(2, "0")}`,
      category: `UUID Validation [${m.label}]`,
      expected: "HTTP 400 or 404 controlled error, no 500, no 22P02 leaked",
      actual: `Post: HTTP ${postRes.status}, Comments: HTTP ${postCommentsRes.status}, Pet: HTTP ${petRes.status}, Leaks 22P02: ${leaks22P02}`,
      status: passes ? "PASS" : "FAIL",
    });
  }

  // ============================================================================
  // 5. P5-OBS-01: ADS MARKETPLACE MASTER FLAG IN DEVELOPMENT
  // ============================================================================
  console.log("\n--- SECTION 5: P5-OBS-01 (Ads Marketplace Master Flag) ---");
  {
    const { data: controls } = await serviceSupabase
      .from("ad_system_controls")
      .select("id, peto_ads_marketplace_enabled, internal_ads_enabled")
      .eq("id", "GLOBAL_CONTROLS")
      .single();

    const isMarketplaceDisabled = controls?.peto_ads_marketplace_enabled === false;

    // Verify campaign creation is rejected by the marketplace guard
    const campRes = await request("/api/advertisers/campaigns", {
      method: "POST",
      token: tokenVerified,
      body: { name: "Prohibited Marketplace Campaign", dailyBudget: 100 },
    });

    const isBlocked = campRes.status === 403;

    record({
      testId: "OBS01-01",
      category: "Ad System Controls",
      expected: "peto_ads_marketplace_enabled is FALSE and campaigns blocked with 403",
      actual: `Flag: ${controls?.peto_ads_marketplace_enabled}, Campaign endpoint: HTTP ${campRes.status}`,
      status: isMarketplaceDisabled && isBlocked ? "PASS" : "FAIL",
    });
  }

  // Clean up synthetic test data
  console.log("\n[Cleanup] Cleaning up synthetic test users...");
  try {
    await serviceSupabase.from("verification_applications").delete().eq("user_id", userVerified.id);
    await serviceSupabase.from("profiles").delete().in("id", [userVerified.id, userUnverified.id]);
    await serviceSupabase.auth.admin.deleteUser(userVerified.id);
    await serviceSupabase.auth.admin.deleteUser(userUnverified.id);
  } catch (cleanErr: any) {
    console.warn("Notice during cleanup:", cleanErr?.message);
  }

  console.log("\n================================================================================");
  console.log("PHASE 6 TEST SUMMARY");
  console.log("================================================================================");
  const total = phase6Results.length;
  const passed = phase6Results.filter((r) => r.status === "PASS").length;
  const failed = phase6Results.filter((r) => r.status === "FAIL").length;
  console.log(`TOTAL TESTS: ${total}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  if (failed === 0) {
    console.log("STATUS: ALL PHASE 6 TARGETED SECURITY TESTS PASSED! ✅\n");
  } else {
    console.error(`STATUS: ${failed} TESTS FAILED! ❌\n`);
    process.exit(1);
  }
}

runPhase6Tests().catch((err) => {
  console.error("Phase 6 tests crashed:", err);
  process.exit(1);
});
