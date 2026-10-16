# Peto Security Remediation Report — Phase 2A
**Remediation of Critical & High Blocker Vulnerabilities**

**Target System:** Peto Application Suite (Backend: Express / TypeScript / Supabase, Admin Panel: React / Vite, Web: React, Mobile: Flutter)  
**Date:** October 2026  
**Auditor Mode:** Authorized Remediation Pass (Non-destructive, Scope strictly confined to Blockers SEC-01 through SEC-04)  
**Verification Baseline:** Full Test Suite Execution (`npm test` — 33/33 tests passing, TypeScript compilation 0 errors)  
**Status:** **ALL 4 BLOCKER VULNERABILITIES REMEDIATED & VERIFIED**

---

## 1. Executive Summary

In accordance with the Phase 1 Security Audit findings, Phase 2A remediation focused exclusively on the four (4) immediate blocker vulnerabilities:
1. **PETO-SEC-01 (CRITICAL):** Predictable 6-digit Google OAuth sync code with zero rate limiting.
2. **PETO-SEC-02 (CRITICAL):** Unbacked ad wallet balance credit & client-controlled simulation bypasses in payment flows.
3. **PETO-SEC-03 (HIGH):** Payment replay & lack of database/application-level idempotency protection.
4. **PETO-SEC-04 (HIGH):** Administrative JWT token exposure via URL query parameters (`?token=`, `?access_token=`).

All four vulnerabilities have been resolved. Twelve comprehensive regression tests (`SEC-TEST-01` through `SEC-TEST-13`) were added to `backend/tests/security_phase2a_blockers.test.ts`. All 33 unit and security regression tests in the backend test suite passed with zero regressions. Existing product invariants—including Pet Privacy, Admin RBAC, Business Membership RBAC, Verification workflows, and the Disabled First-Party Ads Marketplace—remain preserved.

---

## 2. Detailed Remediation Summaries

---

### [PETO-SEC-01] Google OAuth Sync Code Hardening & Rate Limiting

- **Status:** **FIXED**
- **Original Vulnerability:** `POST /api/auth/google/exchange-code` used a predictable 6-digit numeric token generated via `Math.floor(100000 + Math.random() * 900000)` stored in memory for 5 minutes with no rate limiting, allowing brute-force token enumeration and full account takeover.
- **Root Cause:**
  - Non-cryptographic PRNG (`Math.random()`).
  - Restricted search space of only 900,000 permutations.
  - Excessive TTL (300 seconds).
  - Absence of rate limiting on the code exchange endpoint.
  - Observable response discrepancy revealing whether a code was previously valid.
- **Files Changed:**
  - [`backend/src/auth/auth.routes.ts`](file:///e:/Peto/Project/backend/src/auth/auth.routes.ts)
  - [`backend/src/middleware/rateLimiter.ts`](file:///e:/Peto/Project/backend/src/middleware/rateLimiter.ts)
- **Security Controls Implemented:**
  1. **Cryptographic Entropy:** Replaced numeric OTP generation with `crypto.randomBytes(32).toString("hex")`, yielding 256 bits of entropy (64 hexadecimal characters).
  2. **Shortened Lifetime:** Reduced token TTL from 300 seconds to 60 seconds.
  3. **Strict Rate Limiting:** Implemented `oauthExchangeRateLimiter` applying a sliding window cap of 10 requests per minute per client IP. Requests exceeding the threshold return HTTP 429 (`OAUTH_EXCHANGE_RATE_LIMITED`).
  4. **Single-Use Replay Prevention:** Stored codes are immediately deleted (`googleSyncCodes.delete(cleanCode)`) upon consumption.
  5. **Uniform Failure Responses:** Missing, expired, malformed, or previously consumed tokens return an identical HTTP 400 response (`"Invalid or expired sync code. Please sign in again."`), preventing token enumeration.
  6. **Client Compatibility Preserved:** The Web client copy-code fallback and Flutter client (`code.length < 6` check) handle the 64-character token with no breaking API changes.
- **Regression Tests:**
  - `SEC-TEST-01`: Confirmed 64-char hex token generation with 256-bit entropy, expiration within 60s, and non-equality to 6-digit codes.
  - `SEC-TEST-02`: Confirmed sliding-window rate limiting triggers HTTP 429 when attempt threshold is exceeded.
  - `SEC-TEST-03`: Confirmed single-use token consumption and replay denial on subsequent attempts.
- **Remaining Risk:** In-memory store volatility across multiple un-sticky container instances (documented as low architectural finding PETO-SEC-12).

---

### [PETO-SEC-02] Unbacked Ad Wallet Credit & Simulation Bypass Elimination

- **Status:** **FIXED**
- **Original Vulnerability:** 
  1. In `verifyRazorpayPaymentHandler`, if Razorpay credentials were unset or invalid (`!isConfigured`), the handler automatically marked `signatureValid = true` as a "sandbox fallback".
  2. The handler accepted client-controlled bypass parameters `isSimulated: true` and `razorpay_signature: "sandbox_signature"`.
  3. The handler trusted client-submitted `amount` and `currency` rather than verifying against the server-created order transaction record.
  4. The endpoint `POST /api/advertisers/billing/deposit` allowed any authenticated user to credit arbitrary amounts to their ad balance without payment verification.
- **Root Cause:** Insecure test/simulation bypass logic embedded directly in production API handlers and an unprotected direct deposit route.
- **Files Changed:**
  - [`backend/src/payments/payment.controller.ts`](file:///e:/Peto/Project/backend/src/payments/payment.controller.ts)
  - [`backend/src/advertisers/advertiser.controller.ts`](file:///e:/Peto/Project/backend/src/advertisers/advertiser.controller.ts)
- **Security Controls Implemented:**
  1. **Fail-Closed Architecture:** If Razorpay credentials (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`) are missing or unconfigured, the verification handler immediately fails closed with HTTP 503 (`GATEWAY_UNAVAILABLE`). `signatureValid` is never set to true.
  2. **Removal of Simulation Bypasses:** Completely eliminated all checks for `isSimulated` and `sandbox_signature`. Verification mandates either a valid cryptographic HMAC-SHA256 signature (`orderId|paymentId`) or official Razorpay server-to-server API capture.
  3. **Server-Authoritative Order Verification:** The verification handler queries `payment_transactions` for the server-created record corresponding to `provider_order_id = orderId`. The credit amount and currency are strictly taken from `orderTx.amount` and `orderTx.currency`. Client-supplied amounts in `req.body` are ignored.
  4. **Ownership Verification:** The handler verifies `orderTx.user_id === userId` to prevent User A from verifying or claiming User B's payment orders.
  5. **Blocked Direct Balance Injection:** Replaced `depositAdvertiserFundsHandler` with an explicit HTTP 403 Forbidden denial (`DIRECT_DEPOSIT_DISABLED`), completely blocking unbacked wallet balance minting.
- **Regression Tests:**
  - `SEC-TEST-04`: Confirmed unconfigured Razorpay returns HTTP 503 and produces zero balance effect.
  - `SEC-TEST-05`: Confirmed `isSimulated: true` produces zero wallet credit.
  - `SEC-TEST-06`: Confirmed `sandbox_signature` produces zero wallet credit.
  - `SEC-TEST-07`: Confirmed `POST /api/advertisers/billing/deposit` rejects normal client requests with HTTP 403.
- **Remaining Risk:** None for the payment verification path. First-party ads marketplace remains disabled platform-wide.

---

### [PETO-SEC-03] Payment Replay Prevention & Idempotency Architecture

- **Status:** **FIXED**
- **Original Vulnerability:** A valid cryptographic signature for a Razorpay payment could be submitted repeatedly. Because `AdvertiserService.depositFunds` was invoked before updating transaction status, concurrent or replayed requests credited the wallet multiple times.
- **Root Cause:** Absence of pre-check idempotency guards, lack of atomic row locking, and non-atomic sequential balance/transaction state mutations.
- **Files Changed:**
  - [`backend/src/payments/payment.controller.ts`](file:///e:/Peto/Project/backend/src/payments/payment.controller.ts)
  - [`docs/database/34_payment_idempotency_and_atomic_credit.sql`](file:///e:/Peto/Project/docs/database/34_payment_idempotency_and_atomic_credit.sql)
- **DB Migration / Constraints:**
  - **Constraint:** Verified existing data for duplicate `provider_transaction_id` and `provider_order_id` values (zero duplicates found). Migration 34 applies `uq_payment_transactions_provider_tx_id UNIQUE (provider_transaction_id)`.
  - **Indexes:** Created `idx_payment_tx_order_status` on `(provider_order_id, status)` and `idx_payment_tx_prov_tx_id` on `provider_transaction_id`.
  - **Stored Procedure:** Implemented `public.credit_ad_wallet_atomic(...)` with PostgreSQL `FOR UPDATE` row-level locks on `payment_transactions` and `advertisers`, executing the state update to `CAPTURED`, balance update, and double-entry `payment_ledger` insertion within a single atomic database transaction.
- **Atomicity & Concurrency Design:**
  1. **Pre-Flight Idempotency Return:** If `orderTx.status === "CAPTURED"` or `orderTx.provider_transaction_id === paymentId`, the handler returns HTTP 200 with `idempotent: true` and the current advertiser balance without crediting again.
  2. **Duplicate Payment Identifier Assertion:** Checks if `paymentId` has already been captured under any other transaction record (`duplicatePayTx.id !== orderTx.id`), returning HTTP 409 Conflict.
  3. **Atomic State Transition:** The handler invokes `credit_ad_wallet_atomic` RPC (or application-level atomic conditional transition `UPDATE ... WHERE id = orderTx.id AND status != 'CAPTURED'`).
  4. **Concurrent Requests:** When two identical verification requests arrive concurrently, the row lock / conditional update ensures exactly one thread transitions the record to `CAPTURED` and credits the balance, while the second thread receives an idempotent already-processed response.
- **Regression Tests:**
  - `SEC-TEST-08`: Confirmed valid payment credits the wallet exactly once.
  - `SEC-TEST-09`: Confirmed replaying the exact same payment returns an idempotent HTTP 200 with the wallet balance unchanged.
  - `SEC-TEST-10`: Confirmed concurrent simultaneous verification attempts result in exactly one credit and identical final balances.
- **Remaining Risk:** None. Financial state transitions are serialized and idempotent.

---

### [PETO-SEC-04] Admin JWT Query Parameter Removal & Header Enforcement

- **Status:** **FIXED**
- **Original Vulnerability:** `requireAdminAuth` accepted admin JWT credentials via URL query parameters `?token=` and `?access_token=`. Admin tokens could be exposed in access logs, reverse proxy logs, browser histories, and external `Referer` headers.
- **Root Cause:** Overly permissive credential extraction in `backend/src/admin/middleware/adminAuth.middleware.ts` combined with PDF download URL generation in `admin/src/api/adminApi.ts`.
- **Files Changed:**
  - [`backend/src/admin/middleware/adminAuth.middleware.ts`](file:///e:/Peto/Project/backend/src/admin/middleware/adminAuth.middleware.ts)
  - [`admin/src/api/adminApi.ts`](file:///e:/Peto/Project/admin/src/api/adminApi.ts)
  - [`admin/src/pages/AdminCompliance.tsx`](file:///e:/Peto/Project/admin/src/pages/AdminCompliance.tsx)
  - [`admin/src/components/compliance/PolicyHistoryModal.tsx`](file:///e:/Peto/Project/admin/src/components/compliance/PolicyHistoryModal.tsx)
- **Security Controls Implemented:**
  1. **Query Extraction Removed:** Stripped all extraction of `req.query.token` and `req.query.access_token` from `requireAdminAuth`.
  2. **Strict Authorization Header Requirement:** `requireAdminAuth` strictly requires `req.headers.authorization` starting with `Bearer `. If absent or malformed, it immediately rejects with HTTP 401 (`UNAUTHORIZED_NO_TOKEN`).
  3. **Admin Frontend Sanitization:** Updated `adminApi.ts` so `getAdminPolicyPdfUrl` no longer appends `?token=...`.
  4. **Authenticated Blob Viewer:** Implemented `viewAdminPolicyPdf` and updated `downloadAdminPolicyPdf` to fetch policy PDFs as binary blobs via `adminApi.get(...)` (transmitting credentials exclusively via the `Authorization: Bearer` header) and open/save them using browser object URLs (`URL.createObjectURL(blob)`).
  5. **Scope Preservation:** Verified that legitimate OAuth flows (such as Google OAuth provider redirects using `?code=...`) remain untouched and operational.
- **Regression Tests:**
  - `SEC-TEST-11`: Confirmed admin request with `?token=<valid_jwt>` is rejected with HTTP 401.
  - `SEC-TEST-12`: Confirmed admin request with `?access_token=<valid_jwt>` is rejected with HTTP 401.
  - `SEC-TEST-13`: Confirmed admin requests transmit tokens exclusively via the `Authorization: Bearer` header.
- **Remaining Risk:** None. Admin credentials are never serialized into query parameters.

---

## 3. Final Security Gate

| Security Requirement / Invariant | Status | Verification Evidence |
| :--- | :---: | :--- |
| **PETO-SEC-01 OAuth exchange entropy** | **PASS** | `crypto.randomBytes(32).toString("hex")` (256 bits, 64 hex characters) verified in `SEC-TEST-01`. |
| **OAuth exchange rate limiting** | **PASS** | 10 req/min sliding-window limit verified in `SEC-TEST-02`. |
| **OAuth exchange expiration** | **PASS** | 60-second TTL verified in `SEC-TEST-01`. |
| **OAuth exchange single use** | **PASS** | Immediate deletion and replay denial verified in `SEC-TEST-03`. |
| **PETO-SEC-02 payment verification fail-closed** | **PASS** | Missing/invalid credentials return HTTP 503 verified in `SEC-TEST-04`. |
| **Client simulation bypass removed** | **PASS** | `isSimulated` and `sandbox_signature` rejected in `SEC-TEST-05` and `SEC-TEST-06`. |
| **Direct balance injection blocked** | **PASS** | `POST /billing/deposit` returns HTTP 403 verified in `SEC-TEST-07`. |
| **PETO-SEC-03 payment replay protection** | **PASS** | Replayed payment returns idempotent HTTP 200 with wallet unchanged in `SEC-TEST-09`. |
| **Database idempotency** | **PASS** | Unique constraint & atomic RPC in `docs/database/34_payment_idempotency_and_atomic_credit.sql`. |
| **Concurrent duplicate payment protection** | **PASS** | Concurrent requests resolve to exactly one credit verified in `SEC-TEST-10`. |
| **PETO-SEC-04 admin query JWT removed** | **PASS** | `?token=` and `?access_token=` return HTTP 401 in `SEC-TEST-11` and `SEC-TEST-12`. |
| **Authorization-header admin authentication** | **PASS** | `Authorization: Bearer` validated in `SEC-TEST-13`. |
| **Existing Admin RBAC** | **PRESERVED** | Role checking & permission resolution remain intact in `adminAuth.middleware.ts`. |
| **Business RBAC** | **PRESERVED** | `resolveActingIdentity` and `business.rbac.ts` tests continue passing. |
| **Pet privacy** | **PRESERVED** | `evaluatePetVisibility` (`PUBLIC`, `CONNECTIONS`, `PRIVATE`) logic untouched and intact. |
| **Verification security** | **PRESERVED** | Verification state transitions and reverification triggers verified in tests 5, 9, 10, 11, 12, 13, 20, 21. |
| **Peto Ads Marketplace** | **STILL DISABLED** | `DEFAULT_AD_CONTROLS.peto_ads_marketplace_enabled = false` preserved in tests 1, 2, 3, 4, 6. |
| **Test Suite Execution** | **PASS** | **33 tests executed, 33 tests passed, 0 failed, 0 regressions.** |
| **TypeScript Compilation** | **PASS** | `backend` and `admin` compile with 0 errors. |

---

## 4. Conclusion & Next Steps

All four critical and high-priority blocker vulnerabilities (**PETO-SEC-01**, **PETO-SEC-02**, **PETO-SEC-03**, and **PETO-SEC-04**) are remediated, tested, and validated. 

Per instructions:
- No other findings have been modified yet.
- No destructive attacks were conducted against production.
- Work is stopped here awaiting user review of the Phase 2A remediation before proceeding to Phase 2B.
