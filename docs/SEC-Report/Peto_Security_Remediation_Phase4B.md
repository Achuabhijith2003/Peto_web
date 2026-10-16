# PETO SECURITY — REMEDIATION REPORT (PHASE 4B)
**PRIVATE PET MEDIA STORAGE ISOLATION & AUTHORIZED DELIVERY**

**Target System:** Peto Pet Profile & Storage Authorization Subsystem  
**Environment:** Development (`https://ednleoavhuxlarnnlmkq.supabase.co`)  
**Remediation Phase:** Phase 4B — Storage-Level Privacy Boundary Enforcement for Protected Pet Media  
**Date:** October 2026  
**Status:** ALL 20 RUNTIME TESTS PASSED | PETO-SEC-14 RESOLVED | RLS & BACKEND REGRESSIONS 100% CLEAN  

---

## 1. ORIGINAL OBSERVATION & RUNTIME REPRODUCTION

### 1.1 Original Observation (Discovered in Phase 4A)
During Phase 4A remediation of database RLS recursion (PETO-SEC-10), an architectural vulnerability was identified in the storage layer:
- While database Row-Level Security on `public.pets`, `public.pet_parents`, and `public.pet_media` and the Express API properly restricted metadata and returned opaque 404 boundaries for private/connections pets,
- The underlying image and video blobs were stored in public Supabase Storage buckets (`posts-images`, `avatars`, `posts-videos`) configured with `public: true`.
- Each uploaded file had a permanent public CDN URL (e.g. `https://ednleoavhuxlarnnlmkq.supabase.co/storage/v1/object/public/posts-images/<uuid>.webp`).

### 1.2 Runtime Reproduction (DEVELOPMENT Environment)
A reproduction test harness ([`backend/tests/reproduce_phase4b_pet_media.ts`](file:///e:/Peto/Project/backend/tests/reproduce_phase4b_pet_media.ts)) was executed against the live development Supabase instance:
1. Created synthetic pet `PET-PRIVATE-A` (`profile_visibility = 'PRIVATE'`) owned by `User A`.
2. Uploaded a synthetic non-sensitive image via the media upload pipeline (`posts-images`).
3. Associated the media with `PET-PRIVATE-A`.
4. Performed direct unauthenticated HTTP requests to the public CDN URL:
   - **Anonymous Direct GET:** Returned `HTTP 200 OK` (binary received: 94 bytes).
   - **Unrelated User B GET:** Returned `HTTP 200 OK`.
   - **Post-Metadata-Deletion GET:** Returned `HTTP 200 OK` (orphan binary persisted).
5. **Issue Status:** **CONFIRMED**.
6. **Finding Classification:** **PETO-SEC-14 (Severity: HIGH)** — *Private Pet Media Accessible Through Public Storage URL*.

---

## 2. ROOT CAUSE ANALYSIS & THREAT MODEL

### 2.1 Root Cause
1. **Shared Public Bucket:** All images uploaded via `/api/media/upload` or `/api/media/image` defaulted to bucket `posts-images`, which is configured with `public: true` for social feed posts.
2. **Permanent CDN URLs Stored in Database:** The media service generated permanent public URLs (`getPublicUrl`) and stored them directly in `public.media.url`.
3. **Decoupled Privacy Boundaries:** Changing a pet's privacy in PostgreSQL (`profile_visibility = 'PRIVATE'`) only affected SQL query filters; it had zero effect on the Cloudflare/Supabase Storage CDN layer, which continued serving the binary indefinitely to anyone possessing the URL.

### 2.2 Security Invariant Established for Phase 4B
- **PUBLIC Pet Media:** Retrievable publicly according to product requirements.
- **CONNECTIONS Pet Media:** Retrievable **only** by active pet parents and verified connected social followers according to Peto's authoritative visibility model.
- **PRIVATE Pet Media:** Retrievable **strictly and exclusively** by active authorized pet parents.
- **Invariant:** Knowledge of a pet ID, media ID, database UUID, storage path, filename, or former public URL **must not bypass authorization**.

---

## 3. REMEDIATION ARCHITECTURE & CHOSEN STORAGE DESIGN

### 3.1 Dedicated Private Storage Bucket (`pet-media-private`)
Rather than privatizing the entire social feed (which would add unnecessary signed-URL overhead to public posts), Peto implemented storage isolation specifically for protected pet media:
- **Bucket:** `pet-media-private`
- **Configuration:** `public: false` (strictly private).
- **Access Control:** Direct unauthenticated requests to `https://<supabase>/storage/v1/object/public/pet-media-private/...` are rejected by Supabase Storage (`HTTP 400 Bad Request / Object not found`).
- **Object Path Convention:** `pets/<pet_id>/<media_id>.<canonical-ext>`.

### 3.2 Authorized Delivery via Short-Lived Signed URLs
- When an authorized client queries an individual pet (`getPetByIdService`), showcases (`getUserPetsService`), or owner lists (`getMyPetsService`):
  - If the pet is `PUBLIC`, the permanent public URL is delivered (zero latency/overhead).
  - If the pet is `PRIVATE` or `CONNECTIONS`, the backend authoritatively evaluates viewer permissions and dynamically generates a short-lived signed URL (`createSignedUrl`).
- **Signed URL TTL:** **300 seconds (5 minutes)**.
- **Cache Control:** Response headers explicitly declare `Cache-Control: private, no-cache, no-store, must-revalidate` and `Pragma: no-cache` to prevent proxy or shared caching of signed tokens.
- **Database Privacy:** Signed URLs are **never stored in the database**. The database stores only canonical storage paths.

### 3.3 Dedicated Media Access Endpoint
A new authoritative endpoint was added for on-demand media access and token renewal:
```
GET /api/pets/:id/media/:mediaId/access
```
- Performs server-side lookup of `pets` and `pet_media`.
- Authoritatively evaluates viewer permissions via `evaluatePetVisibility(requesterId, pet)`.
- If unauthorized: Returns opaque `HTTP 404 Not Found` (protecting pet existence and media existence).
- If authorized: Returns `{ success: true, data: { url: "<signed_url>", is_public: false, expires_in_seconds: 300 } }`.

### 3.4 Atomic Visibility Transitions (PUBLIC ↔ PRIVATE ↔ CONNECTIONS)
When a pet owner alters visibility via `PATCH /api/pets/:id/visibility`:
1. **Restrictive Transitions (`PUBLIC -> PRIVATE`, `PUBLIC -> CONNECTIONS`):**
   - Loads all media associated with the pet (`profile_media_id`, `cover_media_id`, `pet_media`).
   - For each public object:
     1. Downloads the binary from public storage.
     2. Uploads the binary into `pet-media-private` under `pets/<pet_id>/<media_id>.<ext>`.
     3. Verifies that the new private storage object is readable.
     4. Updates the database record to reference private storage (`private://pet-media-private/...`).
     5. Deletes the original public object from `posts-images`.
   - **Fail-Closed Guarantee:** If any step fails during transition, the operation aborts with `HTTP 500` before changing the pet's visibility, preventing partial exposure.
2. **Less-Restrictive Transitions (`PRIVATE -> PUBLIC`, `CONNECTIONS -> PUBLIC`):**
   - Downloads binary from `pet-media-private`.
   - Re-uploads into public storage (`posts-images`).
   - Updates database record with the new public CDN URL.
   - Deletes private object from `pet-media-private`.
3. **Protected Lateral Transitions (`PRIVATE ↔ CONNECTIONS`):**
   - Media remains securely inside `pet-media-private`. Only the database `profile_visibility` attribute is updated.

---

## 4. DATABASE & REPOSITORY MIGRATIONS

### 4.1 Schema Migration 37
Created [`docs/database/37_private_pet_media_storage.sql`](file:///e:/Peto/Project/docs/database/37_private_pet_media_storage.sql):
- Adds `storage_bucket TEXT` and `storage_path TEXT` to `public.media`.
- Creates composite index `idx_media_storage ON public.media(storage_bucket, storage_path)`.
- Backfills legacy public URLs.
- Graceful backward compatibility: The backend handles both `storage_bucket/storage_path` columns and canonical `private://<bucket>/<path>` URI references in `media.url`.

---

## 5. CLIENT INTEGRATION (WEB & FLUTTER)

### 5.1 Web Application (`Frontend/Peto_user`)
- In [`PetProfilePage.tsx`](file:///e:/Peto/Project/Frontend/Peto_user/src/pages/pets/PetProfilePage.tsx):
  - Consumes signed URLs directly from `/api/pets/:id` responses for avatar, cover, and gallery items.
  - On visibility change (`handleVisibilityChange`), automatically re-fetches the pet profile to obtain refreshed signed URLs for newly privatized media.
  - TypeScript compilation: **PASS (0 errors)**.

### 5.2 Mobile Application (`Mobile/peto_user`)
- In [`pet_profile_screen.dart`](file:///e:/Peto/Project/Mobile/peto_user/lib/screens/pets/pet_profile_screen.dart):
  - Consumes signed URLs seamlessly via `CachedNetworkImage(imageUrl: ...)`.
  - Automatically re-fetches pet details following media uploads or parent invitations.
  - Flutter analysis: **PASS (`No issues found!`)**.

---

## 6. RUNTIME SECURITY TEST MATRIX (MEDIA-SEC-01 THROUGH MEDIA-SEC-20)

Harness executed: [`backend/tests/security_phase4b_pet_media.ts`](file:///e:/Peto/Project/backend/tests/security_phase4b_pet_media.ts) against the live development Supabase instance with synthetic actors (`SEC-GUEST`, `SEC-USER-A`, `SEC-USER-B`, `SEC-USER-C`).

| Test ID | Test Scenario | Actor | Expected Result | Actual Runtime Result | Status |
|---|---|---|---|---|:---:|
| **MEDIA-SEC-01** | Anonymous cannot fetch PRIVATE pet media binary | SEC-GUEST (Anon) | BLOCKED (No public URL, direct download fails) | `BLOCKED (Binary completely inaccessible to anonymous)` | **PASS** |
| **MEDIA-SEC-02** | User B cannot fetch User A PRIVATE pet media | SEC-USER-B (Attacker) | BLOCKED (Opaque denial, storage denied) | `BLOCKED (User B opaque denial and storage denied)` | **PASS** |
| **MEDIA-SEC-03** | Authorized Parent A can access PRIVATE pet media | SEC-USER-A (Parent) | ALLOW (Signed URL generated and delivers binary) | `ALLOW (HTTP 200 via signed delivery)` | **PASS** |
| **MEDIA-SEC-04** | Anonymous cannot fetch CONNECTIONS pet media | SEC-GUEST (Anon) | BLOCKED (Direct public access denied) | `BLOCKED (Connections media protected from guest)` | **PASS** |
| **MEDIA-SEC-05** | Unconnected User B cannot fetch CONNECTIONS pet media | SEC-USER-B (Unconnected) | BLOCKED (404 opaque access boundary) | `BLOCKED (Opaque 404 access boundary enforced)` | **PASS** |
| **MEDIA-SEC-06** | Connected User C can access CONNECTIONS pet media | SEC-USER-C (Follower) | ALLOW (Signed URL delivered to follower) | `ALLOW (HTTP 200 delivered to connected follower)` | **PASS** |
| **MEDIA-SEC-07** | PUBLIC pet media remains accessible | SEC-GUEST (Public) | ALLOW (Public CDN URL returns HTTP 200) | `ALLOW (Public URL returns HTTP 200)` | **PASS** |
| **MEDIA-SEC-08** | Knowing private storage path does not bypass authorization | SEC-USER-B (Path Guessing) | BLOCKED (Storage rejects unauthenticated download) | `BLOCKED (Object not found)` | **PASS** |
| **MEDIA-SEC-09** | Knowing media ID does not bypass authorization | SEC-GUEST (ID Guessing) | BLOCKED (Visibility check rejects) | `BLOCKED (Rejected by authoritative visibility check)` | **PASS** |
| **MEDIA-SEC-10** | Expired signed URL is unusable after expiration | SEC-USER (Expired Token) | BLOCKED (HTTP 400/403 upon TTL expiry) | `BLOCKED (HTTP 400 after TTL expiry)` | **PASS** |
| **MEDIA-SEC-11** | User B cannot request signed URL for User A PRIVATE pet media | SEC-USER-B (Attacker) | BLOCKED (Server refuses to issue signed URL) | `BLOCKED (No signed URL generated for unauthorized caller)` | **PASS** |
| **MEDIA-SEC-12** | User B cannot delete User A protected pet media | SEC-USER-B (Attacker) | BLOCKED (HTTP 403, record & binary preserved) | `PROTECTED (Delete refused, record remains intact)` | **PASS** |
| **MEDIA-SEC-13** | User B cannot replace User A protected pet media | SEC-USER-B (Attacker) | BLOCKED (Permission check prevents linking) | `PROTECTED (Unauthorized media linking rejected)` | **PASS** |
| **MEDIA-SEC-14** | PUBLIC → PRIVATE removes/revokes old public accessibility | SEC-SYSTEM (Transition) | SAFE (Before: 200, After: 400; public object deleted) | `SAFE (Before: HTTP 200, After: HTTP 400, storage deleted)` | **PASS** |
| **MEDIA-SEC-15** | PUBLIC → CONNECTIONS removes unrestricted public access | SEC-SYSTEM (Transition) | SAFE (Public URL revoked upon transition) | `SAFE (Public URL returns HTTP 400)` | **PASS** |
| **MEDIA-SEC-16** | PRIVATE → PUBLIC behaves according to documented design | SEC-SYSTEM (Transition) | PASS (Media published and accessible) | `PASS (Restored to public storage, HTTP 200)` | **PASS** |
| **MEDIA-SEC-17** | Protected media upload retains Phase 2B magic-byte validation | SEC-VALIDATOR | PASS (Valid WebP file signature accepted) | `PASS (Magic bytes verified successfully)` | **PASS** |
| **MEDIA-SEC-18** | HTML/SVG/executable spoof remains blocked | SEC-VALIDATOR (Active Content) | BLOCKED (Fake image containing scripts/HTML rejected) | `BLOCKED (Both active content payloads strictly rejected)` | **PASS** |
| **MEDIA-SEC-19** | Private bucket listing unavailable to unauthorized clients | SEC-USER-B / SEC-GUEST | BLOCKED (Zero objects returned in directory list) | `BLOCKED (Empty list / inaccessible to unauthorized callers)` | **PASS** |
| **MEDIA-SEC-20** | Pet deletion cleans protected media without affecting foreign objects | SEC-SYSTEM (Cleanup) | SAFE (Target pet objects cleaned, foreign untouched) | `SAFE (PetPriv media remains intact after other pet deleted)` | **PASS** |

**Summary: 20/20 PASS (100% Passing)**

---

## 7. REGRESSION TEST RESULTS

1. **Phase 4A.1 Pet RLS Retest (`security_phase4a_pet_rls.ts`):**
   - Tests: **19/19 PASS** (RLS-PET-01 through 14 + API-PET-01 through 05).
   - PostgreSQL `42P17`: **0 occurrences**.
   - PETO-SEC-10 Status: **STILL FIXED**.
2. **Automated Security Regression Suite (`npm test`):**
   - Tests: **60/60 PASS (0 failures)**.
3. **Web Frontend (`Frontend/Peto_user`):**
   - TypeScript Check: **PASS (0 errors)**.
4. **Flutter Mobile (`Mobile/peto_user`):**
   - Flutter Analyze: **PASS (No issues found)**.

---

## 8. UNRESOLVED RISKS & RECOMMENDATIONS

- **Zero Unresolved Vulnerabilities Identified in Scope.**
- **Operational Recommendation:** When migrating the production database to Release 4B, apply [`docs/database/37_private_pet_media_storage.sql`](file:///e:/Peto/Project/docs/database/37_private_pet_media_storage.sql) and ensure bucket `pet-media-private` is created with `public: false`.

---

## 9. FINAL SECURITY GATE — PHASE 4B

```
PETO-SEC-14:
FIXED

Private pet binary anonymous access:
BLOCKED

Private pet binary cross-user access:
BLOCKED

Connections pet anonymous access:
BLOCKED

Connections pet unconnected-user access:
BLOCKED

Connections pet authorized-user access:
WORKS

Public pet media:
WORKS

Private storage bucket:
CONFIGURED

Permanent public URL for protected media:
REMOVED

Signed URL authorization:
PASS

Signed URL expiration:
PASS

Storage path guessing:
BLOCKED

Media ID guessing:
BLOCKED

Cross-user media deletion:
BLOCKED

PUBLIC → PRIVATE transition:
SAFE

PUBLIC → CONNECTIONS transition:
SAFE

PRIVATE → PUBLIC transition:
PASS

Existing protected-media migration:
READY

Phase 2B upload protections:
PRESERVED

PETO-SEC-10:
STILL FIXED

42P17:
0

Phase 4A.1 RLS tests:
PASS

Existing security regression:
PASS

Web:
PASS

Flutter:
PASS

TypeScript:
PASS

Production touched:
NO
```
