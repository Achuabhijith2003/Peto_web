# Peto Security Audit — Phase 1: Source Code Security Review

**Assessment Type:** Authorized Static Source Code Security Review (White-Box Audit)  
**Methodology:** Strix Security Framework & OWASP Top 10 / OWASP API Security Top 10 (2023)  
**Target Codebase:** Peto Social Platform (Backend: Node.js/Express/TypeScript/Supabase, Frontend: React/TypeScript, Mobile: Flutter)  
**Date:** October 2026  
**Auditor Mode:** Source Review & Threat Modeling Only (Non-destructive, No Auto-patching)  
**Document Status:** Final Audit Deliverable  

---

## 1. Executive Summary

An exhaustive, white-box security review of the Peto source code was conducted across the backend service layer (`backend/src`), web client (`Frontend/Peto_user`), and mobile application (`Mobile/peto_user`). 

The audit evaluated forty (40) mission-critical security dimensions, including authentication systems, role-based access control (RBAC), multi-tenant business identity management, pet privacy controls, financial ledgers/payment processing, Supabase storage and Row Level Security (RLS) integration, input validation, and media upload processing.

### Key Audit Highlights:
- **Architecture Strengths:** Peto exhibits robust domain-level isolation and enterprise-grade permission evaluators in several core areas. Specifically, the Acting Identity Resolution (`resolveActingIdentity`), Pet Privacy State Evaluator (`evaluatePetVisibility`), Business Membership RBAC (`business.rbac.ts`), Verification Document Isolation (`ensurePrivateVerificationBucket` with 300s ephemeral signed URLs and audit logging), and automatic verification revocation upon critical identity changes (`REVERIFICATION_REQUIRED`) are thoughtfully designed and consistently implemented.
- **Critical Vulnerabilities:** Two high-impact security defects were uncovered in authentication and financial processing:
  1. An in-memory, predictable 6-digit Google OAuth synchronization code exchange mechanism with zero rate limiting (`POST /api/auth/google/exchange-code`), presenting an account takeover risk.
  2. Test-mode bypasses, lack of idempotency validation, and unverified direct deposit endpoints in payment processing (`POST /api/payments/razorpay/verify` and `POST /api/advertisers/billing/deposit`), enabling unauthorized ad wallet balance manipulation.
- **High/Medium Findings:** Token exposure in admin query strings, permissive MIME filtering (`application/octet-stream`) in public media uploads, lack of rate limiting across critical public authentication routes, user enumeration in username/password reset flows, and verbose API error message leakage.

---

## 2. Platform Architecture & Threat Model

```
                    +---------------------------------------+
                    |             Clients                   |
                    |  - React SPA (Web)                    |
                    |  - Flutter Mobile (iOS / Android)     |
                    +---------------------------------------+
                                        |
                          HTTPS / Bearer JWT / CORS
                                        v
                    +---------------------------------------+
                    |           Express Backend             |
                    |  - Helmet CSP / JSON Parser (10MB)    |
                    |  - Maintenance Circuit Breaker        |
                    |  - Global Telemetry Middleware        |
                    +---------------------------------------+
                                        |
        +-------------------------------+-------------------------------+
        |                               |                               |
        v                               v                               v
+------------------+          +-------------------+          +--------------------+
|  Authentication  |          | Acting Identity   |          |  Media & Storage   |
|  & RBAC Engine   |          | Resolution System |          |  Pipeline          |
| - Supabase Auth  |          | - User (Personal) |          | - Multer / Sharp   |
| - Admin RBAC     |          | - Pet Profiles    |          | - Private Docs     |
| - Business Roles |          | - Business Entity |          |   (300s Signed URL)|
+------------------+          +-------------------+          +--------------------+
        |                               |                               |
        +-------------------------------+-------------------------------+
                                        |
                   Direct Service-Role Client Access
                                        v
                    +---------------------------------------+
                    |        Supabase PostgreSQL DB         |
                    |  - Service Role Key Bypasses RLS      |
                    |  - Centralized Schema Integrity       |
                    +---------------------------------------+
```

### Core Security Invariants
1. **Human User (`userId`):** Authoritative identity derived exclusively from cryptographically validated JWTs (`req.user.id`).
2. **Acting Identity (`businessId`):** Businesses can never act on their own without human authorization. The backend requires explicit membership verification (`businesses_members`) before any operation is performed in a business context.
3. **Pet Identity (`petId`):** Pet ownership is strictly tied to parental/owner records. Visibility rules (`PUBLIC`, `CONNECTIONS`, `PRIVATE`) are server-enforced before returning posts or profiles.
4. **Admin Role:** Administrative privileges are gatekept via `requireAdminAuth` and DB-backed permissions (`admin_roles`, `admin_permissions`).
5. **Private Documents:** Identity documents are strictly segregated into non-public buckets and accessed via short-lived signed URLs.

---

## 3. Vulnerability Classification Matrix

| Issue ID | Vulnerability Title | Category | Severity | Status |
| :--- | :--- | :--- | :--- | :--- |
| **PETO-SEC-01** | Predictable 6-Digit Google OAuth Sync Code with Zero Rate Limiting | Authentication Bypass / Takeover | **CRITICAL** | Confirmed Source Vulnerability |
| **PETO-SEC-02** | Test-Mode Bypass & Direct Balance Injection in Ad Wallet Deposits | Financial Logic / Auth Bypass | **CRITICAL** | Confirmed Source Vulnerability |
| **PETO-SEC-03** | Replay Vulnerability & Missing Idempotency in Razorpay Payment Verification | Payment Logic Abuse / Replay | **HIGH** | Confirmed Source Vulnerability |
| **PETO-SEC-04** | Administrative JWT Token Acceptance via URL Query Parameters | Sensitive Data Exposure | **HIGH** | Confirmed Source Vulnerability |
| **PETO-SEC-05** | MIME Spoofing & Arbitrary Extension Uploads via `application/octet-stream` | File Upload Validation | **HIGH** | Confirmed Source Vulnerability |
| **PETO-SEC-06** | Total Absence of Rate Limiting on Public Authentication & Sensitive Endpoints | Resource Consumption / Brute Force | **MEDIUM** | Confirmed Source Vulnerability |
| **PETO-SEC-07** | User & Identity Enumeration via Differential Responses | Information Disclosure | **MEDIUM** | Confirmed Source Vulnerability |
| **PETO-SEC-08** | Internal Database Error & Schema Leakage via Global Error Handler | API Error Leakage | **MEDIUM** | Confirmed Source Vulnerability |
| **PETO-SEC-09** | Permissive Non-Production CORS Policy Allowing Arbitrary Origins | CORS Misconfiguration | **LOW** | Confirmed Source Vulnerability |
| **PETO-SEC-10** | Database Row Level Security (RLS) Bypassed by Service-Role Client | RLS / Defense-in-Depth | **POTENTIAL** | Potential Risk Requiring Runtime Test |
| **PETO-SEC-11** | Race Condition in Ad Wallet Balance Updates | Concurrency / Double Spend | **POTENTIAL** | Potential Risk Requiring Runtime Test |
| **PETO-SEC-12** | Memory-Bounded State Synchronization in Clustered Deployments | Architecture / Scalability | **LOW** | Potential Risk Requiring Runtime Test |

---

## 4. Confirmed Source Code Vulnerabilities

---

### [PETO-SEC-01] Predictable 6-Digit Google OAuth Sync Code with Zero Rate Limiting (Account Takeover)

- **Issue ID:** PETO-SEC-01
- **Title:** In-Memory Predictable 6-Digit Google OAuth Sync Code with Zero Rate Limiting
- **Severity:** **CRITICAL**
- **CWE:** [CWE-330](https://cwe.mitre.org/data/definitions/330.html) (Use of Insufficiently Random Values), [CWE-307](https://cwe.mitre.org/data/definitions/307.html) (Improper Restriction of Excessive Authentication Attempts), [CWE-287](https://cwe.mitre.org/data/definitions/287.html) (Improper Authentication)
- **OWASP Category:** API2:2023 Broken Authentication
- **Affected File:** [backend/src/auth/auth.routes.ts](file:///e:/Peto/Project/backend/src/auth/auth.routes.ts#L354-L413)
- **Affected Endpoint:** `POST /api/auth/google/exchange-code`
- **Requires Runtime Verification:** No (Confirmed directly in source)
- **False-Positive Possibility:** None

#### Evidence
In `backend/src/auth/auth.routes.ts`, lines 354–366:
```typescript
// Generate a short-lived one-time code to safely pass tokens to the web client
const syncCode = Math.floor(100000 + Math.random() * 900000).toString();
googleSyncCodes.set(syncCode, {
  session: data.session,
  user: data.user,
  profile,
  expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
});
```
And lines 396–413:
```typescript
router.post("/google/exchange-code", (req: Request, res: Response) => {
  const { code } = req.body;
  if (!code || typeof code !== "string") {
    return res.status(400).json({ success: false, message: "Sync code is required." });
  }

  const syncData = googleSyncCodes.get(code.trim());
  if (!syncData) {
    return res.status(400).json({ success: false, message: "Invalid or expired sync code." });
  }

  if (Date.now() > syncData.expiresAt) {
    googleSyncCodes.delete(code.trim());
    return res.status(400).json({ success: false, message: "Sync code has expired." });
  }

  // Consume code immediately (single-use)
  googleSyncCodes.delete(code.trim());

  return res.json({
    success: true,
    session: syncData.session,
    user: syncData.user,
    profile: syncData.profile,
  });
});
```

#### Root Cause Analysis
1. `Math.random()` is not cryptographically secure (PRNG state can be deduced).
2. The search space is merely $900,000$ values ($100000$ to $999999$).
3. The exchange endpoint (`/api/auth/google/exchange-code`) has **no rate limiting**, **no CAPTCHA**, and **no source IP binding**.
4. The code remains valid for **5 minutes** (300 seconds).

#### Attack Scenario
1. A legitimate user logs in via Google OAuth on the web or mobile app.
2. The backend completes the OAuth callback and assigns a 6-digit integer stored in `googleSyncCodes`.
3. An attacker runs a multi-threaded HTTP script sending bursts of requests against `/api/auth/google/exchange-code` testing numbers between 100000 and 999999.
4. With a throughput of 3,000 requests/second on a local or low-latency connection, the attacker can sweep 900,000 permutations in under 5 minutes, successfully claiming the active `session` (including `access_token` and `refresh_token`), leading to **full account takeover**.

#### Exploitability & Impact
- **Exploitability:** High. Requires no prior credentials.
- **Impact:** Critical. Complete compromise of user accounts and authentication sessions.

#### Recommended Fix
1. Replace numeric codes with high-entropy cryptographic strings:
   ```typescript
   const syncCode = crypto.randomBytes(32).toString("hex"); // 256 bits of entropy
   ```
2. Bind the sync code to a cryptographic challenge or state parameter generated by the initiating client (PKCE style).
3. Apply strict IP rate limiting (e.g. max 5 failed attempts per IP per minute) to `/api/auth/google/exchange-code`.
4. Reduce TTL to 60 seconds.

---

### [PETO-SEC-02] Test-Mode Bypass & Direct Balance Injection in Ad Wallet Deposits

- **Issue ID:** PETO-SEC-02
- **Title:** Test-Mode Bypass & Direct Balance Injection in Ad Wallet Deposits
- **Severity:** **CRITICAL**
- **CWE:** [CWE-290](https://cwe.mitre.org/data/definitions/290.html) (Authentication Bypass by Spoofing), [CWE-840](https://cwe.mitre.org/data/definitions/840.html) (Business Logic Errors)
- **OWASP Category:** API8:2023 Security Misconfiguration & API10:2023 Unrestricted Resource Consumption
- **Affected Files:**
  - [backend/src/payments/payment.controller.ts](file:///e:/Peto/Project/backend/src/payments/payment.controller.ts#L274-L355)
  - [backend/src/advertisers/advertiser.controller.ts](file:///e:/Peto/Project/backend/src/advertisers/advertiser.controller.ts#L138-L147)
- **Affected Endpoints:**
  - `POST /api/payments/razorpay/verify`
  - `POST /api/advertisers/billing/deposit`
- **Requires Runtime Verification:** No (Confirmed directly in source)
- **False-Positive Possibility:** None

#### Evidence
In `backend/src/payments/payment.controller.ts`, lines 274–303:
```typescript
const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
const keyId = (process.env.RAZORPAY_KEY_ID || "").trim();
const isConfigured = Boolean(keyId && keySecret && keyId.startsWith("rzp_"));
const isTestMode = keyId.startsWith("rzp_test_") || process.env.NODE_ENV !== "production";
...
let signatureValid = false;

// A. If simulated fast test deposit is requested in test/dev mode
if ((isSimulated || signature === "sandbox_signature") && isTestMode) {
  signatureValid = true;
} else if (isConfigured && signature && orderId && paymentId) {
  ...
} else if (!isConfigured) {
  signatureValid = true; // sandbox fallback
}
...
// Credit Advertiser Balance using centralized depositFunds
const paymentRef = paymentId || `pay_sim_${Date.now()}`;
const result = await AdvertiserService.depositFunds(
  userId,
  numAmount,
  currency,
  `Razorpay (${paymentRef})`
);
```
Furthermore, in `backend/src/advertisers/advertiser.controller.ts`, lines 138–146:
```typescript
export async function depositAdvertiserFundsHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const { amount, currency, paymentMethod } = req.body;
    const result = await AdvertiserService.depositFunds(userId, Number(amount), currency, paymentMethod);
    res.status(200).json(result);
  } catch (err: any) {
    res.status(err.status || 400).json({ success: false, error: err.message });
  }
}
```

#### Root Cause Analysis
1. **Fallback Bypass:** In `verifyRazorpayPaymentHandler`, if Razorpay environment variables are omitted or invalid (`!isConfigured`), `signatureValid` is unconditionally set to `true`. Any arbitrary unverified payload will credit the advertiser balance.
2. **Client-Controlled Simulation:** If `NODE_ENV` is anything other than `production` (or if test keys are used in a pre-prod/staging environment), passing `isSimulated: true` or `razorpay_signature: "sandbox_signature"` bypasses verification.
3. **Unprotected Direct Deposit Route:** The endpoint `POST /api/advertisers/billing/deposit` accepts `{ amount: 50000 }` from `req.body` and immediately credits the user's advertiser balance without any payment gateway validation or token proof.

#### Attack Scenario
1. An authenticated advertiser creates an account.
2. The user sends `POST /api/payments/razorpay/verify` with `{ amount: 100000, isSimulated: true }`.
3. If deployed on a non-production server or one where Razorpay keys were not loaded, the server responds 200 OK and credits 100,000 currency units to the user's ad balance.
4. Alternatively, if ads marketplace is active, calling `POST /api/advertisers/billing/deposit` with `{ amount: 999999 }` adds arbitrary ad funds immediately.

#### Exploitability & Impact
- **Exploitability:** High. Any authenticated user can execute this.
- **Impact:** Critical. Unauthorized generation of financial credit and ledger corruption.

#### Recommended Fix
1. Completely remove `isSimulated`, `"sandbox_signature"`, and `!isConfigured` automatic pass logic from production handlers. If Razorpay is not configured, the verification must fail with 503 Service Unavailable.
2. Remove or strictly guard `POST /api/advertisers/billing/deposit` so that it cannot be called directly by clients; funds should only be deposited via verified webhooks or verified gateway captures.

---

### [PETO-SEC-03] Replay Vulnerability & Missing Idempotency in Razorpay Payment Verification

- **Issue ID:** PETO-SEC-03
- **Title:** Replay Vulnerability & Missing Idempotency in Razorpay Payment Verification
- **Severity:** **HIGH**
- **CWE:** [CWE-294](https://cwe.mitre.org/data/definitions/294.html) (Authentication Bypass by Capture-replay), [CWE-670](https://cwe.mitre.org/data/definitions/670.html) (Always-Incorrect Control Flow Implementation)
- **OWASP Category:** API6:2023 Server-Side Request Forgery / Unrestricted Access to Sensitive Business Flows
- **Affected File:** [backend/src/payments/payment.controller.ts](file:///e:/Peto/Project/backend/src/payments/payment.controller.ts#L288-L370)
- **Affected Endpoint:** `POST /api/payments/razorpay/verify`
- **Requires Runtime Verification:** No (Confirmed directly in source)
- **False-Positive Possibility:** None

#### Evidence
In `backend/src/payments/payment.controller.ts`:
```typescript
// 1. Valid HMAC is verified against orderId | paymentId
const generatedSignature = crypto
  .createHmac("sha256", keySecret)
  .update(`${orderId}|${paymentId}`)
  .digest("hex");

if (generatedSignature === signature) {
  signatureValid = true;
}
...
// 2. Funds are deposited FIRST
const paymentRef = paymentId || `pay_sim_${Date.now()}`;
const result = await AdvertiserService.depositFunds(
  userId,
  numAmount,
  currency,
  `Razorpay (${paymentRef})`
);

// 3. Status is updated AFTER deposit, without checking if transaction was ALREADY CAPTURED
if (orderId) {
  try {
    await supabase
      .from("payment_transactions")
      .update({
        status: "CAPTURED",
        provider_transaction_id: paymentRef,
        completed_at: new Date().toISOString(),
      })
      .eq("provider_order_id", orderId);
  } catch {
    // Non-blocking
  }
}
```

#### Root Cause Analysis
1. The code calculates the HMAC of `${orderId}|${paymentId}`. Once generated by Razorpay for a legitimate payment, this signature remains cryptographically valid forever.
2. The controller does **not** check whether `payment_transactions` for this `orderId` or `paymentId` is **already** in status `"CAPTURED"`.
3. The deposit (`depositFunds`) occurs before the transaction status update.
4. There is no unique database constraint check or distributed lock on `paymentId` inside `depositFunds`.

#### Attack Scenario
1. An attacker pays ₹100 legitimately via Razorpay and receives `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature`.
2. The client intercepts the completion payload.
3. The attacker replays the `POST /api/payments/razorpay/verify` request 50 times.
4. Because the signature check passes every time and the code does not verify whether `status === 'CAPTURED'`, `AdvertiserService.depositFunds` is invoked 50 times, crediting ₹5,000 for a ₹100 payment.

#### Exploitability & Impact
- **Exploitability:** High. Standard HTTP request replay.
- **Impact:** High. Double-spending / fund multiplication.

#### Recommended Fix
1. Query `payment_transactions` before verifying:
   ```typescript
   const { data: existingTx } = await supabase
     .from("payment_transactions")
     .select("status")
     .eq("provider_order_id", orderId)
     .single();

   if (existingTx && existingTx.status === "CAPTURED") {
     return res.status(409).json({ success: false, error: "Payment has already been processed and credited." });
   }
   ```
2. Add a `UNIQUE` database constraint on `provider_transaction_id` in `payment_transactions`.
3. Wrap ledger insertion in an atomic database transaction.

---

### [PETO-SEC-04] Administrative JWT Token Acceptance via URL Query Parameters

- **Issue ID:** PETO-SEC-04
- **Title:** Administrative JWT Token Acceptance via URL Query Parameters
- **Severity:** **HIGH**
- **CWE:** [CWE-598](https://cwe.mitre.org/data/definitions/598.html) (Information Exposure Through Query Strings in GET Request), [CWE-200](https://cwe.mitre.org/data/definitions/200.html) (Exposure of Sensitive Information)
- **OWASP Category:** API2:2023 Broken Authentication
- **Affected File:** [backend/src/admin/middleware/adminAuth.middleware.ts](file:///e:/Peto/Project/backend/src/admin/middleware/adminAuth.middleware.ts#L22-L26)
- **Affected Endpoint:** All endpoints under `/api/admin/*`
- **Requires Runtime Verification:** No (Confirmed directly in source)
- **False-Positive Possibility:** None

#### Evidence
In `backend/src/admin/middleware/adminAuth.middleware.ts`, lines 21–26:
```typescript
const authHeader = req.headers.authorization;
const queryToken = (req.query.token as string) || (req.query.access_token as string);

if (!authHeader && !queryToken) {
  res.status(401).json({ success: false, error: "Authentication token required." });
  return;
}

const token = authHeader ? authHeader.replace(/^Bearer\s+/i, "") : queryToken;
```

#### Root Cause Analysis
Accepting session credentials via URL query parameters (`?token=...` or `?access_token=...`) allows admin tokens to be exposed through:
1. Server access logs (Apache/Nginx/Express/Cloudflare).
2. Browser history and bookmarks.
3. Corporate proxy and firewall logs.
4. HTTP `Referer` headers when an admin clicks any external link from the admin console.

#### Attack Scenario
1. An administrator views an admin dashboard page or export endpoint passing `?token=<JWT>`.
2. An external image or link is loaded, sending the full URL containing the JWT in the `Referer` header to a third-party server.
3. The third party captures the token and gains immediate, full Super Admin access to the platform.

#### Exploitability & Impact
- **Exploitability:** Medium.
- **Impact:** High. Administrative account compromise and privilege escalation.

#### Recommended Fix
Remove query parameter token extraction entirely. Require authentication tokens exclusively in the `Authorization: Bearer <token>` header:
```typescript
const authHeader = req.headers.authorization;
if (!authHeader || !authHeader.startsWith("Bearer ")) {
  res.status(401).json({ success: false, error: "Authorization header required." });
  return;
}
const token = authHeader.replace(/^Bearer\s+/i, "").trim();
```

---

### [PETO-SEC-05] MIME Spoofing & Arbitrary Extension Uploads via `application/octet-stream`

- **Issue ID:** PETO-SEC-05
- **Title:** MIME Spoofing & Arbitrary Extension Uploads via `application/octet-stream`
- **Severity:** **HIGH**
- **CWE:** [CWE-434](https://cwe.mitre.org/data/definitions/434.html) (Unrestricted Upload of File with Dangerous Type)
- **OWASP Category:** API8:2023 Security Misconfiguration
- **Affected File:** [backend/src/media/upload.middleware.ts](file:///e:/Peto/Project/backend/src/media/upload.middleware.ts#L16-L45)
- **Affected Endpoints:**
  - `POST /api/media/upload`
  - `POST /api/media/upload/image`
  - `POST /api/media/upload/video`
- **Requires Runtime Verification:** No (Confirmed directly in source)
- **False-Positive Possibility:** None

#### Evidence
In `backend/src/media/upload.middleware.ts`:
```typescript
filename: (_req, file, cb) => {
  const ext = path.extname(file.originalname || "") || (file.mimetype.startsWith("video/") ? ".mp4" : ".jpg");
  const uniqueName = `${crypto.randomUUID()}${ext}`;
  cb(null, uniqueName);
},
...
const imageFilter: multer.Options["fileFilter"] = (req, file, cb) => {
  if (file.mimetype.startsWith("image/") || file.mimetype === "application/octet-stream") {
    return cb(null, true);
  }
  cb(new Error("Unsupported image format"));
};

const videoFilter: multer.Options["fileFilter"] = (req, file, cb) => {
  if (file.mimetype.startsWith("video/") || file.mimetype === "application/octet-stream") {
    return cb(null, true);
  }
  cb(new Error("Invalid video format"));
};

const mediaFilter: multer.Options["fileFilter"] = (req, file, cb) => {
  if (
    file.mimetype.startsWith("image/") ||
    file.mimetype.startsWith("video/") ||
    file.mimetype === "application/octet-stream"
  ) {
    return cb(null, true);
  }
  cb(new Error("Unsupported file format. Please upload an image or video."));
};
```

#### Root Cause Analysis
1. `file.mimetype === "application/octet-stream"` is explicitly accepted by all media upload filters.
2. The destination filename uses `path.extname(file.originalname)`.
3. If an attacker sends a file named `payload.html` or `exploit.svg` with `Content-Type: application/octet-stream`, Multer accepts it and writes `<uuid>.html` or `<uuid>.svg`.
4. While images undergo Sharp re-encoding, video and raw media uploads (via `uploadVideo` and `upload`) bypass Sharp and are saved directly to public Supabase buckets.

#### Attack Scenario
1. An attacker crafts an HTML file containing malicious JavaScript or an SVG with embedded `<script>` tags.
2. The attacker posts the file to `/api/media/upload` with `Content-Type: application/octet-stream` and `filename="xss.html"`.
3. Multer accepts the upload, preserving `.html` as the extension, and uploads it to the public storage bucket.
4. When another user or administrator opens the media URL in a browser, the script executes in the context of the domain (Stored XSS).

#### Exploitability & Impact
- **Exploitability:** High.
- **Impact:** High. Stored Cross-Site Scripting (XSS), phishing, and malware distribution via platform storage.

#### Recommended Fix
1. Disallow `application/octet-stream`. Whitelist only exact, verified MIME types:
   ```typescript
   const ALLOWED_IMAGE_MIMES = ["image/jpeg", "image/png", "image/webp"];
   const ALLOWED_VIDEO_MIMES = ["video/mp4", "video/webm", "video/quicktime"];
   ```
2. Whitelist permitted file extensions regardless of `originalname`. Map the verified MIME type to a canonical extension (e.g. `image/jpeg` -> `.jpg`).
3. Verify magic bytes (file signatures) using a library like `file-type` rather than trusting client-sent HTTP headers.

---

### [PETO-SEC-06] Total Absence of Rate Limiting on Public Authentication & Sensitive Endpoints

- **Issue ID:** PETO-SEC-06
- **Title:** Total Absence of Rate Limiting on Public Authentication & Sensitive Endpoints
- **Severity:** **MEDIUM**
- **CWE:** [CWE-307](https://cwe.mitre.org/data/definitions/307.html) (Improper Restriction of Excessive Authentication Attempts), [CWE-799](https://cwe.mitre.org/data/definitions/799.html) (Improper Control of Interaction Frequency)
- **OWASP Category:** API4:2023 Unrestricted Resource Consumption
- **Affected Files:**
  - [backend/src/auth/auth.routes.ts](file:///e:/Peto/Project/backend/src/auth/auth.routes.ts)
  - [backend/src/users/user.routes.ts](file:///e:/Peto/Project/backend/src/users/user.routes.ts)
  - [backend/src/server.ts](file:///e:/Peto/Project/backend/src/server.ts)
- **Affected Endpoints:**
  - `POST /api/auth/login`
  - `POST /api/auth/signup`
  - `POST /api/auth/forgot-password`
  - `POST /api/auth/google/exchange-code`
  - `GET /api/users/check-username`
- **Requires Runtime Verification:** No (Confirmed directly in source)
- **False-Positive Possibility:** None

#### Evidence
In `backend/src/server.ts`, rate limiting is mounted **only** on `/api/admin` routes (via `adminRateLimiter` in `backend/src/admin/admin.routes.ts:100`).
No rate limiter middleware (`express-rate-limit`) is applied to `authRoutes`, `userRoutes`, or globally in `server.ts`.

#### Root Cause Analysis
Crucial public endpoints lack frequency caps. This allows automated actors to execute credential stuffing, user enumeration, and spam email dispatching through password resets.

#### Attack Scenario
An attacker uses an automated tool to send thousands of password-guessing attempts against `/api/auth/login` without being throttled or locked out.

#### Exploitability & Impact
- **Exploitability:** High.
- **Impact:** Medium. Account compromise via credential stuffing, resource exhaustion, and email quota depletion.

#### Recommended Fix
Apply `express-rate-limit` to all public authentication and onboarding routes:
```typescript
import rateLimit from "express-rate-limit";

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  message: { success: false, message: "Too many attempts. Please try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post("/login", authLimiter, loginHandler);
router.post("/forgot-password", authLimiter, forgotPasswordHandler);
router.post("/signup", authLimiter, signupHandler);
```

---

### [PETO-SEC-07] User & Identity Enumeration via Differential Responses

- **Issue ID:** PETO-SEC-07
- **Title:** User & Identity Enumeration via Differential Responses
- **Severity:** **MEDIUM**
- **CWE:** [CWE-204](https://cwe.mitre.org/data/definitions/204.html) (Observable Response Discrepancy)
- **OWASP Category:** API2:2023 Broken Authentication
- **Affected Files:**
  - [backend/src/users/user.controller.ts](file:///e:/Peto/Project/backend/src/users/user.controller.ts#L468-L518)
  - [backend/src/auth/auth.routes.ts](file:///e:/Peto/Project/backend/src/auth/auth.routes.ts#L200-L235)
- **Affected Endpoints:**
  - `GET /api/users/check-username`
  - `POST /api/auth/forgot-password`
- **Requires Runtime Verification:** No (Confirmed directly in source)
- **False-Positive Possibility:** None

#### Evidence
In `backend/src/users/user.controller.ts`:
```typescript
export const checkUsernameAvailability = async (req: Request, res: Response) => {
  const username = String(req.query.username || "").trim().toLowerCase();
  ...
  const { data } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  return res.status(200).json({
    success: true,
    available: !data,
    username,
  });
};
```
And in `backend/src/auth/auth.routes.ts`:
```typescript
if (resetError) {
  return res.status(400).json({
    success: false,
    message: resetError.message || "Failed to process password reset.",
  });
}
```

#### Root Cause Analysis
1. `check-username` is accessible without authentication or rate limiting, explicitly returning `{ available: false }` when a username exists.
2. `forgot-password` returns distinct error messages if an email address does not exist in Supabase Auth vs when a reset email was successfully dispatched.

#### Attack Scenario
An attacker harvests the platform's user base by feeding wordlists into `check-username` and `forgot-password`, compiling a list of valid user accounts and emails for targeted spear phishing.

#### Exploitability & Impact
- **Exploitability:** High.
- **Impact:** Medium. Reconnaissance enabling subsequent targeted attacks.

#### Recommended Fix
1. Require rate limiting on `check-username` (e.g. 20 requests per minute).
2. Standardize `forgot-password` responses to be uniform regardless of whether the email exists:
   ```typescript
   return res.status(200).json({
     success: true,
     message: "If an account exists for that email, a password reset link has been sent.",
   });
   ```

---

### [PETO-SEC-08] Internal Database Error & Schema Leakage via Global Error Handler

- **Issue ID:** PETO-SEC-08
- **Title:** Internal Database Error & Schema Leakage via Global Error Handler
- **Severity:** **MEDIUM**
- **CWE:** [CWE-209](https://cwe.mitre.org/data/definitions/209.html) (Generation of Error Message Containing Sensitive Information)
- **OWASP Category:** API8:2023 Security Misconfiguration
- **Affected File:** [backend/src/server.ts](file:///e:/Peto/Project/backend/src/server.ts#L288-L295)
- **Affected Endpoint:** Global (all backend routes)
- **Requires Runtime Verification:** No (Confirmed directly in source)
- **False-Positive Possibility:** None

#### Evidence
In `backend/src/server.ts`, lines 288–294:
```typescript
console.error(err);

res.status(500).json({
  success: false,
  message: err?.message || "Internal Server Error",
});
```

#### Root Cause Analysis
When an unhandled exception or database error occurs (e.g. PostgreSQL foreign key violation, syntax error, or Supabase connection timeout), `err.message` typically contains internal database table names, constraint identifiers, or column names. Returning this directly in HTTP 500 responses leaks technical implementation details to clients.

#### Attack Scenario
An attacker intentionally provides malformed inputs to trigger edge-case SQL or database errors, analyzing the error messages to map out the internal schema and column names.

#### Exploitability & Impact
- **Exploitability:** Medium.
- **Impact:** Low to Medium. Information leakage aiding further exploitation.

#### Recommended Fix
Sanitize error messages in production environments:
```typescript
res.status(500).json({
  success: false,
  message: process.env.NODE_ENV === "production" 
    ? "An unexpected internal server error occurred." 
    : err?.message || "Internal Server Error",
});
```

---

### [PETO-SEC-09] Permissive Non-Production CORS Policy Allowing Arbitrary Origins

- **Issue ID:** PETO-SEC-09
- **Title:** Permissive Non-Production CORS Policy Allowing Arbitrary Origins
- **Severity:** **LOW**
- **CWE:** [CWE-942](https://cwe.mitre.org/data/definitions/942.html) (Permissive Cross-Domain Policy with Untrusted Domains)
- **OWASP Category:** API8:2023 Security Misconfiguration
- **Affected File:** [backend/src/server.ts](file:///e:/Peto/Project/backend/src/server.ts#L126-L138)
- **Affected Endpoint:** All API endpoints
- **Requires Runtime Verification:** No (Confirmed directly in source)
- **False-Positive Possibility:** None

#### Evidence
In `backend/src/server.ts`, lines 126–138:
```typescript
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production") {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);
```

#### Root Cause Analysis
If `NODE_ENV` is not set explicitly to `"production"` (e.g., in a staging or preview deployment), the CORS policy reflects and allows **any** requesting origin while maintaining `credentials: true`.

#### Attack Scenario
If a staging or pre-production instance is accessible over the internet with an unset or default `NODE_ENV`, a malicious website could initiate authenticated cross-origin requests against it.

#### Exploitability & Impact
- **Exploitability:** Low. Requires a misconfigured non-production deployment.
- **Impact:** Low. Cross-origin data disclosure in non-prod environments.

#### Recommended Fix
Explicitly restrict origins in non-production environments to a whitelist of localhost ports and known staging domains:
```typescript
const isProduction = process.env.NODE_ENV === "production";
const devAllowedOrigins = ["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"];

if (allowedOrigins.includes(origin) || (!isProduction && devAllowedOrigins.includes(origin))) {
  return callback(null, true);
}
```

---

## 5. Potential Risks Requiring Runtime Testing

---

### [PETO-SEC-10] Database Row Level Security (RLS) Bypassed by Service-Role Client

- **Issue ID:** PETO-SEC-10
- **Title:** Database Row Level Security (RLS) Bypassed by Service-Role Client
- **Severity:** **POTENTIAL / HIGH**
- **CWE:** [CWE-285](https://cwe.mitre.org/data/definitions/285.html) (Improper Authorization)
- **OWASP Category:** API1:2023 Broken Object Level Authorization (BOLA)
- **Affected File:** [backend/src/config/supabase.ts](file:///e:/Peto/Project/backend/src/config/supabase.ts#L6-L14)
- **Requires Runtime Verification:** **YES**
- **False-Positive Possibility:** High (if all endpoints have flawless backend authorization logic)

#### Analysis & Runtime Test Recommendation
In `backend/src/config/supabase.ts`:
```typescript
export const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
```
The backend executes all database queries using the `SUPABASE_SERVICE_ROLE_KEY`. Under PostgreSQL / Supabase, the service role bypasses all RLS policies.
Therefore:
1. Database-level RLS policies offer **zero protection** against backend authorization bugs.
2. If any backend query omits an explicit `.eq("user_id", currentUserId)` or `.eq("business_id", actingBusinessId)`, an IDOR vulnerability immediately manifests.
3. Furthermore, runtime verification is required to confirm whether the Supabase anon key (`VITE_SUPABASE_ANON_KEY`) exposed in the frontend client has access to read or modify any tables directly via the Supabase PostgREST client without going through the Express backend.

**Runtime Test Plan:**
1. Use `curl` or Postman with the `VITE_SUPABASE_ANON_KEY` to query `https://<supabase-id>.supabase.co/rest/v1/profiles`, `verification_applications`, `advertisers`, and `payment_transactions`.
2. Confirm that RLS denies direct select/insert/update operations from anon clients.

---

### [PETO-SEC-11] Race Condition in Ad Wallet Balance Updates

- **Issue ID:** PETO-SEC-11
- **Title:** Race Condition in Ad Wallet Balance Updates
- **Severity:** **POTENTIAL / MEDIUM**
- **CWE:** [CWE-362](https://cwe.mitre.org/data/definitions/362.html) (Concurrent Execution using Shared Resource with Improper Synchronization)
- **OWASP Category:** API10:2023 Unrestricted Resource Consumption
- **Affected File:** [backend/src/advertisers/advertiser.service.ts](file:///e:/Peto/Project/backend/src/advertisers/advertiser.service.ts#L710-L722)
- **Requires Runtime Verification:** **YES**
- **False-Positive Possibility:** Medium (Depends on database locking and concurrency)

#### Evidence
```typescript
const currentBalance = parseFloat(advertiser.balance || "0");
const newBalance = parseFloat((currentBalance + finalAmount).toFixed(2));

// 1. Update advertiser balance
const { error: updateError } = await supabase
  .from("advertisers")
  .update({
    balance: newBalance,
    updated_at: new Date().toISOString(),
  })
  .eq("id", advertiser.id);
```

#### Analysis & Runtime Test Recommendation
The balance deposit implementation reads the balance from memory and then issues an `UPDATE advertisers SET balance = :newBalance WHERE id = :id`.
If two deposit webhooks or concurrent requests execute simultaneously:
1. Thread A reads balance: ₹100.
2. Thread B reads balance: ₹100.
3. Thread A computes ₹100 + ₹50 = ₹150 and writes ₹150.
4. Thread B computes ₹100 + ₹50 = ₹150 and writes ₹150.
Result: ₹50 is lost (or in reversal scenarios, funds duplicated).

**Runtime Test Plan:**
1. Send 10 concurrent requests to deposit funds.
2. Check final balance against sum of deposits.

---

### [PETO-SEC-12] Memory-Bounded State Synchronization in Clustered Deployments

- **Issue ID:** PETO-SEC-12
- **Title:** Memory-Bounded State Synchronization in Clustered Deployments
- **Severity:** **POTENTIAL / LOW**
- **CWE:** [CWE-662](https://cwe.mitre.org/data/definitions/662.html) (Improper Synchronization)
- **OWASP Category:** API8:2023 Security Misconfiguration
- **Affected File:** [backend/src/auth/auth.routes.ts](file:///e:/Peto/Project/backend/src/auth/auth.routes.ts#L34)
- **Requires Runtime Verification:** **YES** (Only manifests when backend runs multiple Node.js cluster processes or Docker replicas)
- **False-Positive Possibility:** High (if running on a single instance)

#### Analysis
`googleSyncCodes` is maintained in a local JavaScript `Map`. If Peto is deployed across multiple container instances behind an AWS ALB or Google Cloud Run without sticky sessions, an OAuth sync code stored in Instance 1 will not exist in Instance 2, causing random 400 Bad Request errors for users.

---

## 6. Comprehensive Review Across All 40 Priority Areas

The following matrix documents the verification results across all 40 priority areas requested in the audit specification:

| # | Priority Area | Audit Finding / Status | Notes & Code References |
| :---: | :--- | :---: | :--- |
| **1** | Authentication bypass | **Vulnerable** | In-memory 6-digit sync code brute-force (`auth.routes.ts:354`). Fixed JWT verification otherwise. |
| **2** | Broken authorization | **Secure** | Checked across routes; user context derived from validated JWT. |
| **3** | IDOR / BOLA | **Secure** | Resource modification endpoints verify ownership before update/delete (`post.service.ts`, `comment.service.ts`). |
| **4** | User A accessing User B private resources | **Secure** | Pet visibility and private profile filters prevent cross-user leakage. |
| **5** | Business identity spoofing | **Secure** | `resolveActingIdentity` strictly queries `businesses_members` table (`business.rbac.ts:161`). |
| **6** | Business membership privilege escalation | **Secure** | Strict role permissions matrix (`ROLE_PERMISSIONS`); cannot elevate role without `MANAGE_ROLES` permission. |
| **7** | Admin RBAC bypass | **Low Risk** | Super Admin has wildcard `*`, but self-modification checks exist (`adminManagement.service.ts:192`). Query token exposure noted (`PETO-SEC-04`). |
| **8** | Verification approval bypass | **Secure** | Status changes require Admin role; applications follow draft step validation. |
| **9** | Hardcoded verification status | **Secure** | Verification status read directly from database; no hardcoded `true` values. |
| **10** | Supabase RLS mistakes | **Potential Risk** | Backend uses service-role key, bypassing DB RLS (`PETO-SEC-10`). |
| **11** | Service-role key exposure | **Secure** | Key confined to `backend/src/config/supabase.ts`; not leaked to frontend or mobile bundles. |
| **12** | Private storage exposure | **Secure** | Public buckets restricted; private bucket `public: false` enforced. |
| **13** | Verification document exposure | **Secure** | Private bucket, 300s ephemeral signed URLs, and audit logging in `verification_audit_events`. |
| **14** | Mass assignment | **Secure** | `updateProfile` and `updateBusinessProfile` explicitly whitelist accepted fields. |
| **15** | Unsafe req.body spreading into DB updates | **Secure** | Spread objects explicitly sanitized before database insertion. |
| **16** | SQL/NoSQL injection risks | **Secure** | PostgREST parameterized query builder prevents SQL injection. |
| **17** | Command injection | **Secure** | No `child_process`, `exec`, or `eval` used for dynamic commands. |
| **18** | File upload validation | **Vulnerable** | `application/octet-stream` accepted in media uploads (`PETO-SEC-05`). |
| **19** | MIME spoofing | **Vulnerable** | Client-sent MIME accepted without magic bytes inspection (`PETO-SEC-05`). |
| **20** | Path traversal | **Secure** | Multer generates UUIDs for stored files (`upload.middleware.ts:17`). |
| **21** | SSRF through URL fetches | **Secure** | Server-side `fetch` restricted to hardcoded Razorpay and Stripe domains. |
| **22** | XSS / HTML injection | **Medium Risk** | Media upload arbitrary extensions (`.html`, `.svg`) can lead to stored XSS via bucket (`PETO-SEC-05`). |
| **23** | CSRF where applicable | **Not Applicable** | Bearer token authorization used in headers; no ambient cookie auth. |
| **24** | JWT / token validation | **Secure** | `supabase.auth.getUser(token)` verifies signature and expiration on every request. |
| **25** | Session/token refresh weaknesses | **Secure** | Refresh token handled via Supabase Auth standard flows. |
| **26** | Rate limiting | **Vulnerable** | Completely missing on public auth and onboarding endpoints (`PETO-SEC-06`). |
| **27** | Username/email enumeration | **Vulnerable** | `/api/users/check-username` leaks existence without auth/rate limits (`PETO-SEC-07`). |
| **28** | Password reset weaknesses | **Medium Risk** | Observable response discrepancy in password reset errors (`PETO-SEC-07`). |
| **29** | Sensitive information in logs | **Secure** | Passwords omitted; tokens in query params risk server log exposure (`PETO-SEC-04`). |
| **30** | API error leakage | **Vulnerable** | Global error handler returns `err?.message` to client (`PETO-SEC-08`). |
| **31** | Environment secret leakage | **Secure** | Secrets isolated to backend `.env`; no service keys in client builds. |
| **32** | CORS misconfiguration | **Low Risk** | Non-production allows any origin with `credentials: true` (`PETO-SEC-09`). |
| **33** | Security headers | **Secure** | Helmet installed with Content Security Policy, X-Content-Type-Options, Frameguard. |
| **34** | Open redirects | **Secure** | Redirect URLs in OAuth and payment sessions validated or restricted to pre-configured client URLs. |
| **35** | Business logic abuse | **Vulnerable** | Direct deposit route allows arbitrary wallet fund injection (`PETO-SEC-02`). |
| **36** | Race conditions | **Potential Risk** | Concurrent wallet balance updates without database row lock (`PETO-SEC-11`). |
| **37** | Duplicate payment operations | **Vulnerable** | Missing replay check in `verifyRazorpayPaymentHandler` (`PETO-SEC-03`). |
| **38** | Ledger manipulation | **Vulnerable** | Ad balance can be increased without payment gateway capture (`PETO-SEC-02`). |
| **39** | Feature-flag bypass | **Secure** | `requireAdsMarketplaceEnabled` blocks campaign and advertiser actions when flag is disabled. |
| **40** | Privacy bypass for pets (PRIVATE/CONNECTIONS) | **Secure** | `evaluatePetVisibility` strictly verifies parental ownership and mutual follower connections. |

---

## 7. Product Security Invariant Verification

### A. Human User Identity
- **Finding:** Authenticated human identity is correctly anchored to `req.user.id` through `authenticate` middleware.
- **Verification:** Frontend cannot spoof `userId` in posts, comments, or likes.

### B. Business Acting Identity
- **Finding:** Verified secure.
- **Mechanism:** When a user passes `businessId` or `actingAsBusiness: true`, `resolveActingIdentity` queries `businesses_members` to ensure:
  1. The user has an active membership record.
  2. The user has the required permission (e.g. `CREATE_POST`, `MANAGE_PROFILE`).
  3. The business is not suspended or deactivated.

### C. Verification Integrity & Reverification Triggers
- **Finding:** Verified secure.
- **Mechanism:** In `BusinessService.updateBusinessProfile` and `UserController.updateProfile`:
  - Changing business name or legal business name immediately resets `verification_status` to `"REVERIFICATION_REQUIRED"` and revokes `is_verified`.
  - Verification documents are uploaded to an unlisted private bucket (`verification-documents`) and served only via 300-second expiring signed URLs.

### D. Pet Privacy Enforcement
- **Finding:** Verified secure.
- **Mechanism:** In `backend/src/pets/pet.permission.ts`:
  - `PUBLIC`: Accessible by any authenticated or unauthenticated viewer.
  - `CONNECTIONS`: Requires mutual follow relationship between viewer and pet parent.
  - `PRIVATE`: Strictly accessible only by the pet parent/owner.

---

## 8. Prioritized Remediation Roadmap

The following remediation roadmap is recommended for Phase 2:

### Immediate Priority (Sprint 1 — Blockers)
1. **Fix PETO-SEC-01:** Upgrade Google OAuth sync code to `crypto.randomBytes(32).toString("hex")` and add IP rate limiting on `/api/auth/google/exchange-code`.
2. **Fix PETO-SEC-02:** Remove `isSimulated` and `!isConfigured` bypasses from `verifyRazorpayPaymentHandler`. Remove or restrict `POST /api/advertisers/billing/deposit` to prevent unbacked balance credits.
3. **Fix PETO-SEC-03:** Add idempotency status validation in `verifyRazorpayPaymentHandler` to verify that `status !== 'CAPTURED'` before crediting funds.
4. **Fix PETO-SEC-04:** Disallow `req.query.token` and `req.query.access_token` in `adminAuth.middleware.ts`. Require `Authorization: Bearer <token>`.

### High Priority (Sprint 2 — Hardening)
5. **Fix PETO-SEC-05:** Disallow `application/octet-stream` in Multer file filters. Whitelist explicit media MIME types and enforce canonical extensions.
6. **Fix PETO-SEC-06:** Implement `express-rate-limit` across `/api/auth/login`, `/signup`, `/forgot-password`, and `/api/users/check-username`.
7. **Fix PETO-SEC-07:** Standardize responses on password reset and rate-limit username availability checks.
8. **Fix PETO-SEC-08:** Sanitize error messages in the global error handler for production environments.

### Medium Priority (Sprint 3 — Defense in Depth)
9. **Fix PETO-SEC-09:** Tighten CORS origin evaluation in non-production environments.
10. **Fix PETO-SEC-11:** Use atomic database queries (e.g. `UPDATE advertisers SET balance = balance + :amount`) or PostgreSQL transactions for wallet updates.
11. **Runtime Audit PETO-SEC-10:** Run Strix API security tests against Supabase anon client to confirm table-level RLS policies are active.

---
*Report generated strictly following non-destructive, white-box audit methodology. No source files were modified during this assessment.*
