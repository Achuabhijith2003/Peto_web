# Peto Security — Phase 7 Pre-Production Gate

**Assessment date:** 7 October 2026  
**Scope:** Current repository and prior security reports; no production access or deployment.

## 1. Executive Summary

**FINAL VERDICT: CONDITIONAL GO.** Current source inspection supports the prior fixes, and backend, web, and admin builds pass. This is **not authorization to admit production traffic**. The clean-database migration path, live RLS/storage behavior, complete runtime regression, production configuration, and backup/restore are not verified in this phase. One verification projection concern needs an isolated runtime test before release approval.

## 2. Final Verdict

The code contains no newly *confirmed* launch-blocking vulnerability from this assessment. Deployment remains conditional on the operational requirements in §39. The prior reports' pass counts are historical evidence, not Phase 7 retest results.

## 3. Environment & Safety Verification

Production touched: **NO**. Real customer data touched: **NO**. No migrations, payments, provider calls, or attack traffic were executed. Repository-only inspection and local builds were performed. The development Supabase project named in earlier reports was not accessed.

## 4. Security History

Phases 1–2 identify and remediate SEC-01–09, 11–12. Phase 3B confirms the pet RLS recursion (SEC-10) and records SEC-13 as an architectural observation. Phase 4A/4A.1 introduce and runtime-test migration 36 (19/19, `42P17=0`). Phase 4B introduces private pet media/migration 37 (20/20). Phase 5 records SEC-15–18 and Phase 6 reports their fixes, 43/43 targeted cases and 5/5 failing cases retested. These are **historical claims**; the current code contains the named controls, but live results were not independently reproduced here.

## 5. Release Security Inventory

| Area | Current control | Enforcement |
|---|---|---|
| Auth, Admin, Business | Supabase JWT verification; server permission and acting-identity checks | Code; provider |
| Pet privacy and private media | Backend visibility checks; RLS migration 36; private bucket migration 37 | Code; database; deployment |
| Verification and documents | Application lifecycle, database triggers, private signed access | Code; database; storage configuration |
| Payments | Signature validation, server order amount, atomic credit RPC, unique provider transaction | Code; database; provider secrets |
| Ads | Disabled defaults and guarded marketplace routes; Google ads separately configurable | Code; database; operational flag |
| Web/Admin/Flutter | Bearer requests and public build variables | Code; build configuration |
| Recovery/monitoring | No verifiable production procedure in repository | Manual/operational |

## 6. Production Configuration Readiness

`backend/src/config/supabase.ts` substitutes placeholder URL/key when required Supabase variables are absent; startup does not conclusively reject a bad production configuration. `.env.example` sets `NODE_ENV=production` alongside localhost `CLIENT_URL`; `docker-compose.yml` also fixes `CLIENT_URL=http://localhost:5173`. These are unsuitable as a production configuration without overrides. Verify `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CLIENT_URL`, `ADMIN_CLIENT_URL`, `ADDITIONAL_ALLOWED_ORIGINS`, `TRUST_PROXY`, provider endpoints and storage buckets before traffic. `JWT_SECRET` is documented but no custom signing path was established in this review. Feature-specific variables: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `FIREBASE_SERVICE_ACCOUNT`/`GOOGLE_APPLICATION_CREDENTIALS`, `VAPID_PRIVATE_KEY`, ad IDs. No complete production environment schema was found.

## 7. Secret Management

Public client config: `VITE_API_URL`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, ad client IDs and Flutter public IDs. Server secrets: service-role key, Razorpay/Stripe secrets and webhook secrets, Firebase credentials, VAPID private key. The service-role key is referenced only in backend source in the inspected paths; public anon keys are deliberately distributable. Source pattern inspection found references and example placeholders, but no active-looking credential was established. **SECRET SCAN: REVIEW**: no dedicated scanner or full Git-history scan ran. Rotate any credential found in history before launch. Never place server secrets in `VITE_*`, Dart defines, frontend documentation, API responses, or logs.

## 8. Environment Separation

The repository does not prove separate Supabase projects, OAuth callbacks, storage buckets, or provider credentials for dev/staging/production. Production startup must reject/operationally exclude test Razorpay keys, localhost CORS URLs, debug flags and development project references. Development payment operations must use provider test credentials. This is a deployment gate.

## 9. Payment Readiness

Webhook adapters return false when webhook secrets are absent and use constant-time comparison. The verify handler uses server transaction amount/currency; direct advertiser deposit is disabled. Migration 34 provides unique provider transaction ID and atomic wallet/ledger RPC. These controls require the production migration and provider configuration to be validated. No real transaction or webhook test was performed. **PAYMENT WEBHOOK FAIL-CLOSED: PASS (source inspection); runtime unverified.**

## 10. Ads Marketplace State

`adControls.service.ts` defaults both `peto_ads_marketplace_enabled` and `internal_ads_enabled` to false; migration 33 sets both false. Advertiser campaign routes use the marketplace guard. Google AdSense/AdMob configuration is separate. Business profiles and verification remain supported. **ADS MARKETPLACE: DISABLED by repository defaults; deployed row must be checked before traffic.**

## 11. Database Migration Audit

`docs/database` contains 30 SQL files: `09`, `10`, two distinct `11` files, then `12`–`37`. Number alone does not define a unique order. There is no complete base schema in this directory, and no migration runner/ledger was established. `21_cleanup_and_seed_ads.sql` and `22_purge_all_demo_data.sql` include data deletion: **do not apply to production**. Inspect all earlier scripts for prerequisites and existing-object conflicts before execution. Security-sensitive sequence includes 23/24 payment and ads foundations, 27 pets, 29–31 verification, 32 business identity, 33 ads disabled, 34 atomic payment credit, 35 OAuth exchange codes, 36 nonrecursive pet RLS, 37 private pet storage. Storage bucket provisioning and historical data movement need explicit verification.

**Clean-database migration test: NEEDS DEPLOYMENT PROCEDURE VALIDATION.** No safe isolated local database and complete baseline were available; no migration was run. A fresh clone rehearsal must verify objects, policies, constraints, bucket settings and data migration effects.

## 12. Production Migration Plan

Do not run this plan until an isolated rehearsal and backup exist.

| Order | Migration(s) | Prerequisite and expected result | Validation / compensation |
|---|---|---|---|
| 1 | Baseline through 20, both `11` files | Confirm actual schema and dependency order | Compare catalog/schema; restore backup if incompatibility |
| 2 | 23–24 | Ads/payment tables, currency and atomic ledger foundation | Inspect functions, constraints and ledger totals; restore/forward fix |
| 3 | 27, 29–32 | Pet, verification and business identity models | Check triggers, statuses, grants, RLS and ownership; repair with reviewed migration |
| 4 | 33 | Both marketplace flags false | Query `ad_system_controls`; re-disable immediately if drift |
| 5 | 34–35 | Unique payment IDs, atomic credit, OAuth table | Check duplicates before unique constraint; inspect RPC execute grants; backup/forward fix |
| 6 | 36 | Replace recursive pet policies | Run 19 pet scenarios; `42P17=0`; restore prior policy only via reviewed compensation |
| 7 | 37 | Private bucket and protected pet media | Inspect bucket/public flag, policies, URL migration and all visibility transitions; repair orphaned/public objects |

Exclude scripts 21–22 from production. Identify whether migrations 25, 26 and 28 are already applied; apply in their dependency position. Use transactional execution where supported, record hashes and application order, and verify a restore before live traffic.

## 13. RLS Final Audit

The earlier Phase 3B report covers profiles, posts, comments, likes, bookmarks, follows, pets, pet_parents, pet_media, business identities/memberships, communities/members, notifications, verification tables, advertisers, payment tables, admin tables and OAuth codes. It found public reads for social public rows, owner scoped reads for private rows, and backend-only writes for many tables. Migration 36 replaces pet recursion. A **current complete `pg_class`/`pg_policies` inventory was not possible without connecting to a database**; tables created outside `docs/database` may exist. Service-role Express queries bypass RLS and require independent backend authorization. **RLS: REVIEW** until anon/authenticated PostgREST and service-role tests pass on the release schema.

## 14. Storage Security

Repository code references public post/avatar/cover/video media and private verification documents and `pet-media-private`; inspect actual `storage.buckets` and `storage.objects` policies in staging. Migration 37 and backend signed URL flow support protected pet binaries. Prior Phase 4B reported 20/20, including URL and transition checks; this phase did not recreate PUBLIC→PRIVATE, PUBLIC→CONNECTIONS, PRIVATE→PUBLIC, or PRIVATE↔CONNECTIONS transitions. Ensure old public objects are deleted/inaccessible and signed URLs are short lived and never persisted as permanent DB URLs. **PRIVATE PET MEDIA: REVIEW; STORAGE: REVIEW; SEC-14 historically fixed, current runtime unverified.**

## 15. Authentication

OAuth exchange uses high entropy, short expiry, single use and a limiter per Phase 2 source/tests. Admin query-string JWT extraction is absent in the reviewed path. Current missing/malformed/expired/invalid token API probes were not performed. **AUTH: REVIEW (source supports prior fix).**

## 16. Admin RBAC

Admin middleware requires Bearer auth and permission checks; business ownership alone is not an Admin grant. Prior suites tested query-token rejection. Current moderator permission and audit-record behavior require a staging smoke test. **ADMIN RBAC: REVIEW.**

## 17. Business Identity RBAC

The repository model uses owner, admin and member permissions; it does not require a STAFF role. `resolveActingIdentity` is the server-side boundary for supplied business IDs. Prior runtime tests denied outsider and restricted-member actions. Re-run removal, body override, and person-versus-business verification tests on the release schema. **BUSINESS RBAC: REVIEW.**

## 18. Verification Consistency

The canonical lifecycle is `verification_applications`; profile `verified`, `is_verified` and badge type are a projection. Migration 29 has a trigger to project application changes to profile in the same database transaction and a name-change trigger to invalidate an approved record. This materially mitigates the apparent separate-write concern in `adminVerification.service.ts`. However, projection queries test `expires_at > now()` only when a row changes; passage of time alone does not trigger a badge refresh. Web and Flutter render the stored profile booleans. **REVIEW:** on an isolated database, create a short-lived approved synthetic application, let it expire without an update, and inspect API/Web/Flutter badge output. Also inject APPROVED/REVERIFICATION_REQUIRED mismatches and test approve, suspend and revoke. No finding ID was assigned because the release database behavior was not reproduced.

## 19. Verification Document Privacy

Private document bucket and permission-gated signed access are present in source and prior runtime evidence. No current cross-user, business outsider or admin permission probe ran. Confirm signed token expiry, access audit and log redaction on staging. **VERIFICATION DOCUMENT PRIVACY: REVIEW.**

## 20. Search/Input Validation

`postgrestSanitizer.ts` centralizes PostgREST filter handling. Phase 6 historically passed normal, punctuation, wildcard, backslash, Unicode, emoji, SQL-like and grammar probes. No Phase 7 HTTP replay was possible. **SEARCH SECURITY: REVIEW.**

## 21. UUID/Error Handling

`validateUuidParams` and global `22P02` mapping are present. Phase 6 historically covered malformed post/pet routes; remaining business, community, verification and admin routes need representative runtime probes. **UUID VALIDATION: REVIEW.**

## 22. File Upload Security

Media validator checks allowlisted MIME, magic bytes, canonical extensions, size and temporary-file cleanup per current code and Phase 2 tests. Harmless spoof/path/double-extension uploads and orphan checks were not repeated against a running target. **UPLOAD SECURITY: REVIEW.**

## 23. Dependency Audit

Lockfiles exist for backend/root, web, admin and Flutter. Builds do not establish vulnerability absence. `npm audit` and Dart advisory checks were not completed; no package finding or upgrade recommendation can be asserted. **DEPENDENCIES: REVIEW** pending lockfile audits classified by direct/transitive and runtime/dev use.

## 24. Supply Chain Review

Inspected package scripts use TypeScript/Vite/tsx and Flutter toolchain; no evidence of an application-specific `curl | shell` installer was established. Dependency install scripts and CI provenance were not exhaustively audited. No automatic upgrades were made.

## 25. Security Headers

Express uses Helmet, CSP, MIME and referrer protections. Its CSP currently permits `unsafe-inline` and `unsafe-eval` for scripts and localhost connections, so tighten or document necessity for the production edge. Web/Admin headers and HSTS depend on Nginx/host/CDN configuration and were not observed on production HTTPS. **SECURITY HEADERS: REVIEW.**

## 26. CORS

`config/cors.ts` exact-matches normalized origins and excludes built-in localhost entries when `NODE_ENV=production`; originless native requests are allowed. Explicit configured `CLIENT_URL` and `ADDITIONAL_ALLOWED_ORIGINS` can still add localhost in production, and Docker Compose currently sets `CLIENT_URL` to localhost. Replace with exact production origins and test suffix/prefix attacks. **CORS: REVIEW.**

## 27. Rate Limiting

Auth/username/OAuth limits exist in source. Verify which paths use process memory versus shared Redis and configure trusted proxy correctly. Multiple backend instances weaken process-local limits. **RATE LIMITING: REVIEW** until deployment topology and distributed backing are verified.

## 28. Logging

Admin/verification/financial audit paths exist. `morgan("dev")`, telemetry and controller error logs need production redaction review for JWTs, signed URLs, document metadata and sensitive body fields. No secret value is reproduced here. **LOGGING: REVIEW.**

## 29. Observability

Repository inspection did not establish alerting for auth failures, webhook rejection, 500 spikes, RLS/storage errors, payment failures or Admin events. Define monitors and an on-call route before traffic.

## 30. Backup/Recovery

**NOT VERIFIED — OPERATIONAL ACTION REQUIRED.** No production database restore drill, storage recovery procedure, ledger reconciliation or migration compensation runbook was established. Do not infer Supabase backup capabilities from provider branding.

## 31. Data Deletion

Prior authorization patterns prevent obvious cross-user deletion, but account/business deletion, document cleanup and retained financial/audit records were not end-to-end retested. Verify on staging with synthetic records.

## 32. Frontend Security Boundary

The frontend renders permission and badge state, while backend and database controls must decide authorization. Admin, business acting identity, verification, pet media and payment calls require corresponding server checks; prior phases contain targeted evidence, current full regression is incomplete.

## 33. Client Build Configuration

Web and Admin production builds passed. Only `VITE_*` public values should enter their bundles. Audit produced bundle and source maps for any server secret before release; no service-role reference was found in client source inspected. Flutter public IDs/URLs may be bundled, never service-role or provider secrets.

## 34. Debug/Test Code Audit

Earlier payment simulation bypasses are absent in the reviewed handlers. Test fixtures remain under `backend/tests`; no production-reachable bypass was confirmed. Keep test keys and debug logging out of release configuration.

## 35. CI/CD Security

No `.github` workflow was located. Dockerfiles and Compose exist, but no verified mandatory test gate, migration approval step or release environment lock was established. **CI/CD: REVIEW.**

## 36. Strix Status

**STRIX AVAILABLE: NO** in the inspected PATH. **STRIX EXECUTED: NO.** No network scan was run. Historical Phase 5 also records it unavailable.

## 37. Complete Regression Results

| Gate | Phase 7 result |
|---|---|
| Phase 2 60/60 | **NOT VERIFIED**: `npm.cmd test` aborted before tests; Node `uv_os_get_passwd` ENOMEM |
| Phase 4A.1 19/19 / `42P17=0` | **NOT RUN**: requires isolated Supabase credentials/fixture |
| Phase 4B 20/20 | **NOT RUN**: requires isolated storage fixture |
| Phase 5 5/5 | **NOT RUN**: requires running development target |
| Phase 6 43/43 | **NOT RUN**: requires running development target |
| Backend TypeScript | **PASS** (`npm.cmd run build`) |
| Web | **PASS** (`npm.cmd run build`) |
| Admin | **PASS** (`npm.cmd run build`) |
| Flutter | **NOT VERIFIED**: analyzer did not return during assessment |

The counts above are not represented as fresh passes. Local `npm test` also failed on retry, before executing a test case.

## 38. New Findings

**New confirmed Critical/High/Medium/Low: 0/0/0/0.** No new numbered PETO-SEC finding is assigned. The expiry/projection case in §18 is a specific unvalidated candidate; demonstrate it on an isolated database before deciding whether it is PETO-SEC-19 and launch-blocking.

## 39. Operational Requirements

1. Rehearse full migration order and clean restore on an isolated complete baseline; exclude destructive demo scripts.
2. Re-run all security suites and the verification expiry/mismatch cases against an authorized isolated target; establish `42P17=0`.
3. Verify production project, exact origins, live provider secrets, private buckets/policies, ads flags and client bundles.
4. Verify backup and restore, monitoring/alerting, dependency audit and incident ownership.
5. Obtain human release approval after evidence is recorded.

## 40. Production Deployment Checklist

1. Confirm dedicated production Supabase project, backup and restore drill.
2. Provision server secrets via secret store; check OAuth callbacks, webhook secrets and exact CORS origins.
3. Confirm ads marketplace and internal ads flags are false.
4. Apply only rehearsed migrations in the verified dependency order; record hashes/results.
5. Verify private buckets, storage policies, public URL revocation, RLS policies/functions/grants.
6. Run safe auth, Admin/Business RBAC, private pet media and verification document smoke tests with synthetic accounts.
7. Use provider-supported safe webhook verification test; confirm failed signatures cause no financial mutation.
8. Verify monitoring, rollback/compensation and ledger reconciliation; obtain final human approval.

**This checklist has not been executed.**

## 41. Final Security Gate

| Required field | Result |
|---|---|
| FINAL VERDICT | **CONDITIONAL GO** |
| PRODUCTION / REAL CUSTOMER DATA TOUCHED | **NO / NO** |
| PETO-SEC-10, 14, 15, 16, 17, 18 | **Historically fixed; current runtime status REVIEW** |
| 42P17 | **Not measured in Phase 7** (historical 0) |
| PRIVATE PET MEDIA / VERIFICATION DOCUMENT PRIVACY / VERIFICATION STATE CONSISTENCY | **REVIEW / REVIEW / REVIEW** |
| PAYMENT WEBHOOK FAIL-CLOSED / ADS MARKETPLACE | **PASS in source / DISABLED by default** |
| SERVICE ROLE CLIENT EXPOSURE / SECRET SCAN | **NONE found in inspected client source / REVIEW** |
| DATABASE MIGRATION READINESS / RLS / STORAGE | **REVIEW / REVIEW / REVIEW** |
| AUTH / ADMIN RBAC / BUSINESS RBAC / UPLOAD / SEARCH / UUID | **REVIEW / REVIEW / REVIEW / REVIEW / REVIEW / REVIEW** |
| CORS / SECURITY HEADERS / DEPENDENCIES / RATE LIMITING / LOGGING | **REVIEW / REVIEW / REVIEW / REVIEW / REVIEW** |
| BACKUP / RESTORE / CI-CD | **NOT VERIFIED / REVIEW** |
| STRIX AVAILABLE / EXECUTED | **NO / NO** |
| PHASE 2 / 4A.1 / 4B / 5 RETEST / 6 | **NOT VERIFIED / NOT RUN / NOT RUN / NOT RUN / NOT RUN** |
| BACKEND TYPESCRIPT / WEB / ADMIN / FLUTTER | **PASS / PASS / PASS / NOT VERIFIED** |
| NEW CONFIRMED CRITICAL / HIGH / MEDIUM / LOW | **0 / 0 / 0 / 0** |
| CONFIRMED LAUNCH BLOCKERS / OPERATIONAL REQUIREMENTS | **0 / 5** |

**Stop point:** Human review of this report. Production deployment and production migrations remain outside this phase.
