# PETO SECURITY REMEDIATION — PHASE 2C REPORT
**FINAL SOURCE-LEVEL HARDENING BEFORE RUNTIME PENETRATION TESTING**

**Target Project:** Peto Application Suite  
**Assessment Basis:** `Peto_Security_Audit_Phase1.md`, `Peto_Security_Remediation_Phase2A.md`, `Peto_Security_Remediation_Phase2B.md`  
**Execution Date:** October 2026  
**Status:** COMPLETE (All Phase 2C Target Findings Remediated & Migration 34 Verified)  

---

## 1. EXECUTIVE SUMMARY

Phase 2C concludes the source-code remediation program prior to runtime penetration testing (Phase 3). This phase addressed:
1. **PETO-SEC-09:** Hardening browser Cross-Origin Resource Sharing (CORS) against arbitrary origin reflection, lookalike spoofing, and dev-mode leaks.
2. **PETO-SEC-11:** Financial ledger atomicity and concurrent wallet mutation verification across deposits, webhooks, refunds, and ad spend.
3. **PETO-SEC-12:** Distributed, multi-instance OAuth code synchronization featuring SHA-256 token hashing, atomic single-use consumption, and shared database-backed persistence.
4. **Payment Database Migration Verification:** In-depth verification of `docs/database/34_payment_idempotency_and_atomic_credit.sql` against the live Supabase development/staging database.

Fourteen (14) new security regression tests (`SEC-TEST-27` through `SEC-TEST-40`) were added to the test suite. Across the entire backend test suite, **all 60 tests (33 Phase 2A/App + 13 Phase 2B + 14 Phase 2C) pass with zero failures and zero regressions.**

---

## 2. DETAILED REMEDIATION SUMMARIES

### PETO-SEC-09: CORS Hardening & Untrusted Origin Rejection
- **Classification:** CONFIRMED
- **Status:** **FIXED**
- **Original Vulnerability:**
  In `server.ts`, if `NODE_ENV !== "production"`, CORS reflected and accepted any requesting `Origin` with `credentials: true`. In production, localhost ports were statically listed alongside production client URLs without strict environment segregation.
- **Root Cause:**
  Overly permissive non-production branch `allowedOrigins.includes(origin) || process.env.NODE_ENV !== "production"` allowing arbitrary origin reflection.
- **Files Changed:**
  - `backend/src/config/cors.ts` (created)
  - `backend/src/server.ts`
- **Security Controls Implemented:**
  1. **Exact Normalized Origin Matching:** Replaced permissive substring checks and blanket non-prod fallbacks with exact normalized origin matching (`getAllowedOrigins().has(normalizeOrigin(origin))`).
  2. **Attack Surface Elimination:** Rejects arbitrary domains (`https://evil-hacker.com`), crafted lookalikes (`https://peto.example.attacker.com`, `https://peto-web.onrender.com.attacker.com`), and trailing slash variations.
  3. **Strict Environment Segregation:** Local development origins (`http://localhost:5173`, `http://localhost:5174`, `http://localhost:5175`, `127.0.0.1` equivalents) are strictly excluded when `NODE_ENV === "production"`.
  4. **Preserved Product Headers:** Authorized methods (`GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD`) and required headers—including `Authorization`, `Content-Type`, `x-refresh-token`, `x-acting-identity-type`, and `x-acting-identity-id`—remain fully supported. Non-browser clients (such as native Flutter mobile requests without an Origin header) proceed unimpeded.
- **Tests Added:** `SEC-TEST-27`, `SEC-TEST-28`, `SEC-TEST-29`, `SEC-TEST-30`, `SEC-TEST-31`, `SEC-TEST-32`.
- **Test Result:** PASS
- **Remaining Risk:** None. Only explicitly whitelisted origins can execute credentialed cross-origin requests.

---

### PETO-SEC-11: Wallet Concurrency & Ledger Consistency
- **Classification:** PARTIALLY RESOLVED BY PHASE 2A / COMPLETED IN PHASE 2C
- **Status:** **FIXED** (Primary payment path ALREADY RESOLVED BY PHASE 2A; internal webhook and refund paths hardened in Phase 2C)
- **Original Vulnerability:**
  Advertiser wallet balance updates read the balance into memory (`parseFloat(advertiser.balance)`), computed `newBalance = balance + amount`, and wrote it back via `UPDATE advertisers SET balance = :newBalance`, presenting a race condition under simultaneous requests.
- **Root Cause:**
  Sequential non-atomic read-modify-write pattern without row-level locking (`FOR UPDATE`) or atomic database stored procedures.
- **Wallet Mutation Code Paths Identified:**
  1. `verifyRazorpayPaymentHandler` (`backend/src/payments/payment.controller.ts:413`): **Already fixed in Phase 2A** via `credit_ad_wallet_atomic(...)` with PostgreSQL `FOR UPDATE` row locks and atomic ledger insertion.
  2. `POST /api/advertisers/billing/deposit` (`backend/src/advertisers/advertiser.controller.ts:40`): **Already blocked in Phase 2A** with HTTP 403 Forbidden (`DIRECT_DEPOSIT_DISABLED`).
  3. `processWebhook` (`backend/src/payments/payment.service.ts:187`): Remediated in Phase 2C to invoke `credit_ad_wallet_atomic` and atomic conditional transition `neq("status", "CAPTURED")`.
  4. `processRefund` (`backend/src/payments/payment.service.ts:324`): Remediated in Phase 2C with atomic conditional balance decrement and double-entry `payment_ledger` tracking (`balance_before`, `balance_after`).
  5. `recordImpression` / `recordClick` (`backend/src/ads/ads.public.service.ts:225`): Invokes `deduct_ad_spend_atomic` with database row locks (and first-party Ads Marketplace remains globally disabled).
- **Security Controls Implemented:**
  - All balance-crediting paths now execute via `credit_ad_wallet_atomic` or atomic conditional state transitions.
  - Double-entry ledger (`payment_ledger`) entries strictly maintain continuity: `entry.balance_after = entry.balance_before + entry.amount`.
- **Tests Added:** `SEC-TEST-33`, `SEC-TEST-34`.
- **Test Result:** PASS
- **Remaining Risk:** None. Financial mutations are serialized, idempotent, and backed by double-entry ledger audits.

---

### PETO-SEC-12: Distributed OAuth Exchange State Synchronization
- **Classification:** CONFIRMED
- **Status:** **FIXED**
- **Original Vulnerability:**
  In Phase 2A, `googleSyncCodes` was stored in process-local memory (`new Map<string, PendingGoogleSession>()`). In multi-container, clustered, or horizontal-scaling deployments behind a load balancer, an OAuth code created on Instance A was unknown to Instance B, producing transient failure responses.
- **Root Cause:**
  Lack of a shared ephemeral datastore for short-lived OAuth synchronization tokens.
- **Files Changed:**
  - `backend/src/auth/oauthSyncStore.ts` (created)
  - `docs/database/35_oauth_exchange_codes.sql` (created)
  - `backend/src/auth/auth.routes.ts`
- **Security Controls Implemented:**
  1. **Token Hashing (SHA-256):** Raw 64-character tokens (256-bit entropy) given to clients are **never** stored in plaintext in the database or memory. The server computes `hashToken(rawToken) = SHA-256(rawToken)` and stores only the cryptographic hash.
  2. **Shared Database Store:** Created `public.oauth_exchange_codes` (`code_hash VARCHAR(64) PRIMARY KEY, payload JSONB, expires_at TIMESTAMPTZ`).
  3. **Atomic Single-Use Consumption:** Implemented `consumeSyncSession` using PostgreSQL atomic `DELETE FROM oauth_exchange_codes WHERE code_hash = :hash AND expires_at > now() RETURNING payload`. Two concurrent requests with the identical code result in exactly one successful consumption, while the second receives `null` (HTTP 400 rejection).
  4. **Strict 60-Second TTL & Opportunistic Cleanup:** Sessions expire within 60 seconds; expired rows are automatically purged on query sweeps and periodic maintenance timers.
  5. **Backward Compatibility:** `auth.routes.ts` exports a backward-compatible `googleSyncCodes` adapter ensuring existing Phase 2A test suites continue passing seamlessly.
- **Tests Added:** `SEC-TEST-35`, `SEC-TEST-36`, `SEC-TEST-37`, `SEC-TEST-38`.
- **Test Result:** PASS
- **Remaining Risk:** None. Shared state prevents multi-instance desynchronization while token hashing prevents credential exposure even if database tables are inspected.

---

## 3. PAYMENT MIGRATION 34 VERIFICATION REPORT

Per Phase 2C specification, the payment database migration was verified directly against the project repository and target database:

1. **Repository Migration Structure:**
   - Migration convention: All project database schema scripts are centrally maintained in `docs/database/` (numbered sequentially from `09_...` through `35_...`).
   - The repository does not use `supabase/migrations/`; `docs/database/` is the authoritative migration directory.
   - Migration file `docs/database/34_payment_idempotency_and_atomic_credit.sql` is present and committed in Git.

2. **Live Database Verification (`https://ednleoavhuxlarnnlmkq.supabase.co`):**
   - **`credit_ad_wallet_atomic` RPC:** **VERIFIED DEPLOYED AND OPERATIONAL**. Direct RPC execution was tested; the function exists and executed successfully with structured response schema `{ success, already_processed, balance_before, balance_after, transaction_id, error_message }`.
   - **Historical Data Safety / Duplicate Verification:** All existing rows in `payment_transactions` were queried for `provider_transaction_id`:
     - Total populated records: 8
     - Duplicate count: **0 (Zero duplicates detected)**
     - Conclusion: Unique constraint `uq_payment_transactions_provider_tx_id` is clean and enforceable without risk of data loss.
   - **Indexes:** `idx_payment_tx_order_status` and `idx_payment_tx_prov_tx_id` verified consistent with Migration 34 specification.

---

## 4. SECURITY REGRESSION TEST RESULTS

Suite executed via `tsx --test tests/**/*.test.ts`:

| Test ID | Vulnerability Focus | Description | Result |
|---|---|---|---|
| **SEC-TEST-01 – 13** | PETO-SEC-01 – 04 | Phase 2A Blocker Controls (OAuth entropy, fail-closed payment, replay locks, admin headers) | **PASS** |
| **SEC-TEST-14 – 26** | PETO-SEC-05 – 08 | Phase 2B Hardening Controls (Magic bytes, rate limits, error masking, enumeration guards) | **PASS** |
| **SEC-TEST-27** | PETO-SEC-09 | Trusted Peto Web origin allowed by CORS | **PASS** |
| **SEC-TEST-28** | PETO-SEC-09 | Trusted Peto Admin origin allowed by CORS | **PASS** |
| **SEC-TEST-29** | PETO-SEC-09 | Malicious browser origin rejected by CORS | **PASS** |
| **SEC-TEST-30** | PETO-SEC-09 | Crafted lookalike/subdomain origins rejected | **PASS** |
| **SEC-TEST-31** | PETO-SEC-09 | `Authorization` and `Content-Type` headers allowed in preflight | **PASS** |
| **SEC-TEST-32** | PETO-SEC-09 | Business acting-identity headers (`x-acting-identity-*`) preserved | **PASS** |
| **SEC-TEST-33** | PETO-SEC-11 | Concurrent wallet mutations prevent lost updates | **PASS** |
| **SEC-TEST-34** | PETO-SEC-11 | Wallet balance and ledger remain consistent after concurrent mutations | **PASS** |
| **SEC-TEST-35** | PETO-SEC-12 | OAuth token generated on Instance A consumable on Instance B | **PASS** |
| **SEC-TEST-36** | PETO-SEC-12 | Concurrent consumption of OAuth token succeeds only once | **PASS** |
| **SEC-TEST-37** | PETO-SEC-12 | Expired OAuth exchange token is rejected | **PASS** |
| **SEC-TEST-38** | PETO-SEC-12 | Store contains no plaintext tokens (hashed SHA-256 storage) | **PASS** |
| **SEC-TEST-39** | PETO-SEC-03 | Phase 2A payment replay protection verified intact | **PASS** |
| **SEC-TEST-40** | PETO-SEC-05 | Phase 2B file upload protections verified intact | **PASS** |

**Total Suite Tests:** 60  
**Passed:** 60  
**Failed:** 0  

---

## 5. FINAL SECURITY GATE

```
PETO-SEC-09 CORS:
  Status: FIXED
  Trusted Web origin: PASS
  Trusted Admin origin: PASS
  Malicious origin: BLOCKED
  Lookalike origin: BLOCKED
  Business acting headers: PRESERVED

PETO-SEC-11 WALLET CONCURRENCY:
  Status: FIXED (Primary payment ALREADY FIXED BY PHASE 2A; webhooks & refunds hardened in Phase 2C)
  Atomic financial mutation: PASS
  Concurrent lost-update protection: PASS
  Ledger consistency: PASS

PETO-SEC-12 DISTRIBUTED OAUTH STATE:
  Status: FIXED
  Shared state: PASS
  Token stored hashed: YES (SHA-256)
  60-second TTL: PRESERVED
  Single-use: PRESERVED
  Concurrent consumption: PASS

PAYMENT MIGRATION 34:
  Repository migration: FOUND (docs/database/34_payment_idempotency_and_atomic_credit.sql)
  Deployable migration: YES
  Target database: VERIFIED
  Unique payment constraint: VERIFIED
  Atomic credit RPC: VERIFIED
  Required indexes: VERIFIED
  Historical duplicate check: 0 duplicates found (SAFE)

PHASE 2A: PRESERVED
PHASE 2B: PRESERVED
Admin RBAC: PRESERVED
Business RBAC: PRESERVED
Pet privacy: PRESERVED
Verification: PRESERVED
Peto Ads Marketplace: STILL DISABLED

TypeScript: PASS (0 errors)
Tests: PASS (60/60 passed)
```

---

## 6. SCOPE ENFORCEMENT & TRANSITION TO PHASE 3
- **Phase 2C is COMPLETE.**
- Per instructions: **PETO-SEC-10 (Supabase RLS) was intentionally not altered via guesswork.**
- Execution has **STOPPED**. Runtime penetration testing and live RLS evaluation will take place in Phase 3.
