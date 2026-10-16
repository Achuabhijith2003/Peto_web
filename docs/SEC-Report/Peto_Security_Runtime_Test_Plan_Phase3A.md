# PETO SECURITY — RUNTIME TEST PLAN (PHASE 3A)
**PREPARATION OF CONTROLLED RUNTIME SECURITY TEST ENVIRONMENT**

**Target System:** Peto Social Platform & Advertising Suite  
**Assessment Phase:** Phase 3A — Runtime Test Environment Preparation & Threat Surface Inventory  
**Auditor Mode:** Controlled Setup & Inventory Only (No Exploitation, No Production Testing, No RLS Modification)  
**Date:** October 2026  
**Document Status:** Final Phase 3A Test Plan  

---

## 1. TARGET ENVIRONMENT VERIFICATION

A comprehensive inspection of backend, frontend, admin, and mobile configurations was executed to establish authoritative endpoint and project boundaries:

| Dimension | Target Value | Classification |
|---|---|---|
| **Backend Base URL** | `http://localhost:5000` (Local) / `https://peto-web.onrender.com` (Render Dev/Staging) | **LOCAL / DEVELOPMENT** |
| **Supabase Project URL** | `https://ednleoavhuxlarnnlmkq.supabase.co` | **DEVELOPMENT PROJECT** (`ednleoavhuxlarnnlmkq`) |
| **Web Client URL** | `http://localhost:5173` (Local) / `https://peto-web.onrender.com` (Render Staging) | **LOCAL / STAGING** |
| **Admin Panel URL** | `http://localhost:5174` (Local) / `https://peto-admin.onrender.com` (Render Staging) | **LOCAL / STAGING** |
| **Environment Variable** | `NODE_ENV=development` | **DEVELOPMENT** |
| **Payment Gateway** | Razorpay Test Mode (`rzp_test_...` key configured) | **SANDBOX / TEST MODE** |
| **Mobile API Target** | `ApiService(baseUrl: "http://localhost:5000/api")` (Configurable test build) | **LOCAL / DEVELOPMENT** |

> [!IMPORTANT]
> **Production Target Assessment:**  
> The active environment is **STRICTLY DEVELOPMENT / LOCAL / STAGING**. No production credentials, production databases, or live customer instances were detected. **SAFE FOR RUNTIME TESTING.**

---

## 2. SERVICE ROLE BOUNDARY & SECRET SEGREGATION

A complete codebase search across `Frontend/`, `admin/`, and `Mobile/peto_user/` was conducted to verify that privileged infrastructure credentials are never exposed:

- **`SUPABASE_SERVICE_ROLE_KEY` Search:**
  - `Frontend/Peto_user/`: **CLEAN** (0 occurrences)
  - `admin/`: **CLEAN** (0 occurrences)
  - `Mobile/peto_user/`: **CLEAN** (0 occurrences)
  - Result: Confined strictly to backend server environment (`backend/.env` and `backend/src/config/supabase.ts`).
- **`VITE_SUPABASE_ANON_KEY` Exposure:**
  - Present in `Frontend/Peto_user/.env` as standard public client key for Supabase Auth PKCE redirects.
  - This key is **publicly readable** by any browser user, confirming that PostgREST queries using this anon key represent the primary runtime threat surface for Row Level Security (PETO-SEC-10).
- **Payment & Identity Secrets:**
  - `RAZORPAY_KEY_SECRET` and Firebase service accounts reside strictly on the backend.
  - No secret tokens, service role keys, or sensitive customer identity documents are committed to version control or included in this test plan.

---

## 3. DIRECT SUPABASE POSTGREST VS BACKEND API ARCHITECTURE

Peto utilizes a dual-path architecture that mandates distinct testing strategies for backend endpoints vs database RLS:

```
[Attacker / Client with VITE_SUPABASE_ANON_KEY]
      │
      ├─── Path 1: Direct PostgREST Request (Bypasses Backend Express Logic)
      │      └──> https://ednleoavhuxlarnnlmkq.supabase.co/rest/v1/<table_name>
      │           └──> GOVERNED EXCLUSIVELY BY SUPABASE ROW LEVEL SECURITY (RLS)
      │
      └─── Path 2: Express Backend API (Bearer JWT in Authorization Header)
             └──> http://localhost:5000/api/<resource>
                  └──> Backend validates JWT (req.user.id)
                  └──> Resolves acting identity & business membership
                  └──> Executes DB query via SUPABASE_SERVICE_ROLE_KEY (Bypasses DB RLS)
                  └──> GOVERNED EXCLUSIVELY BY BACKEND EXPRESS AUTHORIZATION / RBAC
```

**Key Takeaways for Phase 3 Testing:**
1. **Direct PostgREST API (Path 1):** Tests database-level RLS policies. If a table has RLS disabled or permissive policies, an attacker with the public anon key can read or alter tables without backend validation.
2. **Backend API (Path 2):** Tests application-level authorization, BOLA/IDOR, and business logic. Because the backend uses the service-role client, database RLS does not protect against missing `eq("user_id", ...)` checks in Express controllers.

---

## 4. CONTROLLED SECURITY TEST IDENTITIES MATRIX

The following controlled test accounts are designated for runtime test execution. All accounts use disposable staging credentials:

| Identity ID | Role / Context | Description | Authenticated Context |
|---|---|---|---|
| **SEC-GUEST** | Anonymous / Unauthenticated | Public internet actor with no session or token. | `Authorization: none`, Anon Supabase client |
| **SEC-USER-A** | Primary User (`user_a`) | Normal authenticated user owning primary test assets. | `Bearer <JWT_USER_A>` |
| **SEC-USER-B** | Secondary User (`user_b`) | Unconnected normal authenticated user (Attacker persona). | `Bearer <JWT_USER_B>` |
| **SEC-BUSINESS-OWNER** | Business Owner (`owner_biz_a`) | Human user who owns Business A (`peto_vet_clinic`). Role: `OWNER`. | `Bearer <JWT_OWNER>`, `x-acting-identity-*` |
| **SEC-BUSINESS-MEMBER** | Restricted Business Staff | Staff member of Business A. Role: `STAFF` (can post, cannot delete business or manage roles). | `Bearer <JWT_STAFF>`, `x-acting-identity-*` |
| **SEC-BUSINESS-OUTSIDER** | Business Outsider | Authenticated user with zero affiliation with Business A. | `Bearer <JWT_OUTSIDER>` |
| **SEC-MODERATOR** | Content Moderator | Administrative user with `reports.read` and `content.review` permissions only. | `Bearer <JWT_MODERATOR>` |
| **SEC-ADMIN** | Super Administrator | Full administrative privileges across all modules (`*`). | `Bearer <JWT_ADMIN>` |

---

## 5. CONTROLLED TEST RESOURCES SPECIFICATION

All test resources are isolated from real data and established using dummy staging payloads:

### User A Resources (Owned by `SEC-USER-A`):
- `Profile A`: `id = "usr_00000000-0000-0000-0000-00000000000a"`, `username = "sec_user_a"`
- `Post A`: `id = "pst_00000000-0000-0000-0000-00000000000a"`, caption: "User A Test Post"
- `Comment A`: `id = "cmt_00000000-0000-0000-0000-00000000000a"` on Post A
- `Bookmark A`: Bookmark pointing to Post A
- `Pet A (PUBLIC)`: `visibility = 'PUBLIC'`, name = "Max (Public)"
- `Pet A (CONNECTIONS)`: `visibility = 'CONNECTIONS'`, name = "Bella (Connections Only)"
- `Pet A (PRIVATE)`: `visibility = 'PRIVATE'`, name = "Secret Dog (Private)"
- `Media A`: `id = "med_00000000-0000-0000-0000-00000000000a"`, WebP image in `posts-images`

### User B Resources (Owned by `SEC-USER-B`):
- `Profile B`: `id = "usr_00000000-0000-0000-0000-00000000000b"`, `username = "sec_user_b"`
- `Post B`: `id = "pst_00000000-0000-0000-0000-00000000000b"`
- `Pet B (PRIVATE)`: `visibility = 'PRIVATE'`, name = "Milo (User B Private)"

### Business A Resources:
- `Business A`: `id = "biz_00000000-0000-0000-0000-00000000000a"`, name = "Peto Vet Clinic"
- `Owner Record`: `SEC-BUSINESS-OWNER` has `role = 'OWNER'` in `businesses_members`
- `Staff Record`: `SEC-BUSINESS-MEMBER` has `role = 'STAFF'` in `businesses_members`
- `Business Post A`: `post_id = "pst_biz_00000000-0000-0000-00000000000a"`, author type `BUSINESS`

### Verification Test Resources:
- `Application A`: `id = "ver_00000000-0000-0000-0000-00000000000a"`, status = `PENDING`
- `Document A`: Storage path `ver_00000000-0000-0000-0000-00000000000a/doc_dummy_id.pdf` in strictly private bucket `verification-documents` (non-sensitive synthetic PDF).

---

## 6. EXPECTED AUTHORIZATION & DENIAL MATRIX

The following matrix documents expected HTTP response status codes and policy outcomes across all security perimeters:

| Target Resource / Operation | SEC-GUEST | SEC-USER-A (Owner) | SEC-USER-B (Attacker) | SEC-BUSINESS-OUTSIDER | SEC-ADMIN | Expected Security Behavior |
|---|:---:|:---:|:---:|:---:|:---:|---|
| **View User A Public Profile** | `200 ALLOW` | `200 ALLOW` | `200 ALLOW` | `200 ALLOW` | `200 ALLOW` | Public profile info readable |
| **Edit User A Profile** | `401 DENY` | `200 ALLOW` | `403 DENY` | `403 DENY` | `200 ALLOW` (Admin) | Strict self-modification only |
| **Delete User A Post** | `401 DENY` | `200 ALLOW` | `403 DENY` | `403 DENY` | `200 ALLOW` (Admin) | Authorship / ownership gate |
| **Edit User A Comment** | `401 DENY` | `200 ALLOW` | `403 DENY` | `403 DENY` | `200 ALLOW` (Admin) | Comment author gate |
| **View Pet A (PUBLIC)** | `200 ALLOW` | `200 ALLOW` | `200 ALLOW` | `200 ALLOW` | `200 ALLOW` | Public pet profile |
| **View Pet A (CONNECTIONS)** | `403/404 DENY` | `200 ALLOW` | `403/404 DENY`* | `403/404 DENY` | `200 ALLOW` | Mutual follower gate (*Denied if not connected) |
| **View Pet A (PRIVATE)** | `403/404 DENY` | `200 ALLOW` | `403/404 DENY` | `403/404 DENY` | `200 ALLOW` (Admin audit) | Authoritative parent gate |
| **Delete Pet A** | `401 DENY` | `200 ALLOW` | `403 DENY` | `403 DENY` | `200 ALLOW` | Parental ownership gate |
| **Edit Business A Profile** | `401 DENY` | `200 ALLOW` (Owner) | `403 DENY` | `403 DENY` | `200 ALLOW` | Business membership & `MANAGE_PROFILE` |
| **Create Business A Post** | `401 DENY` | `200 ALLOW` | `403 DENY` | `403 DENY` | `200 ALLOW` | Valid acting identity + membership |
| **Assign Business A Roles** | `401 DENY` | `200 ALLOW` (Owner) | `403 DENY` | `403 DENY` | `200 ALLOW` | Restricted staff cannot promote/demote |
| **Direct DB Query `payment_transactions`** | `DENY (RLS)` | `ALLOW (Self rows)` | `DENY (Cross-user)` | `DENY` | `ALLOW (Service role)` | Direct PostgREST access restricted |
| **Direct DB Query `advertisers`** | `DENY (RLS)` | `ALLOW (Self rows)` | `DENY (Cross-user)` | `DENY` | `ALLOW (Service role)` | Balance & wallet isolation |
| **View Verification Document URL** | `401 DENY` | `200 ALLOW (Signed)` | `403 DENY` | `403 DENY` | `200 ALLOW (Admin)` | Ephemeral 300s signed URL only |
| **Direct Bucket Access `verification-documents`** | `403 DENY` | `403 DENY` | `403 DENY` | `403 DENY` | `403 DENY` | Bucket is `public: false` (No direct CDN URL) |
| **Admin API `/api/admin/*`** | `401 DENY` | `401/403 DENY` | `401/403 DENY` | `401/403 DENY` | `200 ALLOW` | Requires DB-backed Super Admin role |
| **Admin API with `?token=<JWT>`** | `401 DENY` | `401 DENY` | `401 DENY` | `401 DENY` | `401 DENY` | Phase 2A fix: query tokens rejected |
| **Create First-Party Ad Campaign** | `403 DENY` | `403 DENY` | `403 DENY` | `403 DENY` | `403 DENY` | Peto Ads Marketplace disabled |

---

## 7. SUPABASE ROW LEVEL SECURITY (RLS) INVENTORY (PETO-SEC-10)

Inventory of core tables from the repository schema (`docs/database/` migrations 09–35):

| Table Name | RLS Enabled? | Intended PostgREST Access | Primary RLS Policy Focus | Client Risk if RLS Missing |
|---|:---:|:---:|---|---|
| `profiles` | **YES** | Public read, self-update | Public select; update `auth.uid() = id` | Profile metadata alteration |
| `posts` | **YES** | Public read, author write | Select active posts; insert/update/delete `auth.uid() = user_id` | Post deletion / spoofing |
| `comments` | **YES** | Public read, author write | Select on post; insert/update `auth.uid() = user_id` | Comment hijacking |
| `likes` | **YES** | Public read, self write | Insert/delete `auth.uid() = user_id` | Like inflation / spoofing |
| `bookmarks` | **YES** | Self read / write | Select/insert/delete `auth.uid() = user_id` | Private bookmark exposure |
| `follows` | **YES** | Public read, self write | Insert/delete `auth.uid() = follower_id` | Follow relationship manipulation |
| `media` | **YES** | Public read, uploader write | Insert `auth.uid() = user_id` | Orphan media association |
| `notifications` | **YES** | Self read / update | Select/update `auth.uid() = recipient_id` | Sensitive activity leak |
| `pets` | **YES** | Parent or visibility rule | Evaluate `visibility` (`PUBLIC`/`CONNECTIONS`/`PRIVATE`) | Private pet exposure |
| `pet_parents` | **YES** | Verified parent write | Select all; insert/update parent role | Pet parental hijacking |
| `pet_media` | **YES** | Parent write | Link media to pet | Unverified pet attribution |
| `businesses` | **YES** | Public read, member manage | Update requires membership check | Business identity hijacking |
| `businesses_members` | **YES** | Member read, owner write | Insert/delete requires `OWNER` role | Member privilege escalation |
| `communities` | **YES** | Public read, member write | Select active; update requires admin/mod | Community settings takeover |
| `community_members` | **YES** | Self join, mod manage | Insert self; delete self or mod ban | Unauthorized community moderation |
| `verification_applications` | **YES** | Self read/submit, Admin audit | Select `auth.uid() = user_id`; admin review | Direct self-approval |
| `verification_documents` | **YES** | Self upload, Admin audit | Select `auth.uid() = user_id`; admin review | Identity document leakage |
| `verification_audit_events` | **YES** | Admin audit only | Append-only audit records | Audit trail tampering |
| `advertisers` | **YES** | Self read, Admin audit | Select `auth.uid() = user_id` | Balance / wallet exposure |
| `payment_transactions` | **YES** | Self read, service-role credit | Select `auth.uid() = user_id` | Payment history snooping |
| `payment_ledger` | **YES** | Self read, service-role credit | Select `advertiser_id` matching user | Financial ledger exposure |
| `admin_users` | **YES** | Service-role / Admin only | No direct public access | Super Admin self-grant |
| `admin_roles` | **YES** | Service-role / Admin only | Read-only to authenticated admins | Role definition tampering |
| `admin_permissions` | **YES** | Service-role / Admin only | Read-only to authenticated admins | Permission injection |
| `oauth_exchange_codes` | **YES** | Backend service-role only | Revoked from PUBLIC; accessed via RPC | OAuth token collision/sniffing |

---

## 8. SUPABASE STORAGE BUCKET INVENTORY

| Bucket Name | Access Model | Max Size | Allowed MIME Types | Intended Path Ownership | Verification Focus |
|---|:---:|:---:|:---:|---|---|
| `posts-images` | **PUBLIC** | 30 MB | JPEG, PNG, WebP | Author UUID prefix | Public CDN delivery |
| `posts-videos` | **PUBLIC** | 200 MB | MP4, WebM, MOV | Author UUID prefix | Public CDN video streaming |
| `thumbnails` | **PUBLIC** | 10 MB | JPEG, PNG, WebP | Media UUID prefix | Video preview posters |
| `avatars` | **PUBLIC** | 10 MB | JPEG, PNG, WebP | User UUID prefix | User profile photos |
| `covers` | **PUBLIC** | 15 MB | JPEG, PNG, WebP | User UUID prefix | Header background images |
| `verification-documents` | **STRICTLY PRIVATE** | 10 MB | JPEG, PNG, WebP, PDF | Application UUID prefix | **Never exposed publicly; ephemeral signed URLs only** |

---

## 9. IDOR / BOLA TARGET ENDPOINT INVENTORY

| Endpoint | HTTP Method | Object Identifier | Ownership / Security Rule | Expected Denial |
|---|:---:|---|---|:---:|
| `/api/users/:id/profile` | GET | `id` (User ID / Username) | Public info returned; private contact masked | 200 (Masked) |
| `/api/users/profile` | PATCH | Implicit (`req.user.id`) | Self only; cannot pass foreign user ID in body | 403 Forbidden |
| `/api/posts/:id` | DELETE | `id` (Post UUID) | `post.user_id === req.user.id` or Super Admin | 403 Forbidden |
| `/api/comments/:id` | DELETE | `id` (Comment UUID) | `comment.user_id === req.user.id` or Post Author | 403 Forbidden |
| `/api/pets/:id` | GET | `id` (Pet UUID) | Parent ownership or `evaluatePetVisibility` | 404/403 Denied |
| `/api/pets/:id` | PATCH / DELETE | `id` (Pet UUID) | Parental ownership record in `pet_parents` | 403 Forbidden |
| `/api/businesses/:id` | PATCH | `id` (Business UUID) | Active membership with `MANAGE_PROFILE` | 403 Forbidden |
| `/api/businesses/:id/members/:userId` | DELETE | `userId` (Member) | Active membership with `MANAGE_ROLES` or Owner | 403 Forbidden |
| `/api/communities/:id` | PATCH | `id` (Community UUID) | Creator or assigned Moderator | 403 Forbidden |
| `/api/verification/applications/:id` | GET | `id` (App UUID) | `app.user_id === req.user.id` or Admin Reviewer | 403 Forbidden |
| `/api/verification/applications/:id/approve` | POST | `id` (App UUID) | Admin RBAC role with `verification.review` | 403 Forbidden |
| `/api/advertisers/:id/balance` | GET | `id` (Advertiser UUID) | `adv.user_id === req.user.id` | 403 Forbidden |

---

## 10. TARGETED RUNTIME SECURITY TEST SCENARIOS

### Scenario Suite A: Business Identity Spoofing & RBAC
- **Test BIZ-01:** Request with spoofed `x-acting-identity-type: BUSINESS` and foreign `x-acting-identity-id` -> **Expect HTTP 403 Forbidden** (`NOT_A_MEMBER`).
- **Test BIZ-02:** Valid Business ID where user is not in `businesses_members` -> **Expect HTTP 403 Forbidden**.
- **Test BIZ-03:** Member with `STAFF` role attempts to delete business or modify roles -> **Expect HTTP 403 Forbidden** (`INSUFFICIENT_ROLE`).
- **Test BIZ-04:** User A member of Business A attempts actions on Business B -> **Expect HTTP 403 Forbidden**.

### Scenario Suite B: Pet Privacy Boundary Enforcement
- **Test PET-01:** Unauthenticated user fetches `PUBLIC` pet -> **Expect HTTP 200 OK**.
- **Test PET-02:** Unconnected User B directly queries `CONNECTIONS` pet by known UUID -> **Expect HTTP 404 / 403**.
- **Test PET-03:** Unrelated User B directly queries `PRIVATE` pet by known UUID -> **Expect HTTP 404 / 403**.
- **Test PET-04:** Search API queries for private pet names -> **Expect Private pets omitted from search results**.

### Scenario Suite C: Identity Verification & Private Storage
- **Test VER-01:** Normal User B attempts direct POST to `/api/admin/verifications/:id/approve` -> **Expect HTTP 401/403**.
- **Test VER-02:** User B requests signed URL for User A's uploaded verification document -> **Expect HTTP 403 Forbidden**.
- **Test VER-03:** Direct public HTTP GET against `https://<supabase>/storage/v1/object/public/verification-documents/<path>` -> **Expect HTTP 400/403 (Bucket is strictly private)**.
- **Test VER-04:** Reusing an expired signed document URL (>300 seconds) -> **Expect HTTP 403/400 (Token expired)**.

### Scenario Suite D: Administrative Perimeter & Query Token Defense
- **Test ADM-01:** Normal user accessing `/api/admin/users` -> **Expect HTTP 401/403 Forbidden**.
- **Test ADM-02:** Business Owner accessing `/api/admin/financials` -> **Expect HTTP 401/403 Forbidden**.
- **Test ADM-03:** Request to `/api/admin/users?token=<VALID_ADMIN_JWT>` -> **Expect HTTP 401 Unauthorized** (Phase 2A fix verification).
- **Test ADM-04:** Request to `/api/admin/users?access_token=<VALID_ADMIN_JWT>` -> **Expect HTTP 401 Unauthorized**.

### Scenario Suite E: Ads Marketplace Feature-Flag Boundary
- **Test ADS-01:** Direct POST to `/api/advertisers/campaigns` while marketplace disabled -> **Expect HTTP 403 Forbidden** (`MARKETPLACE_DISABLED`).
- **Test ADS-02:** Direct POST to `/api/ads/create` while marketplace disabled -> **Expect HTTP 403 Forbidden**.
- **Test ADS-03:** Direct deposit attempt via `POST /api/advertisers/billing/deposit` -> **Expect HTTP 403 Forbidden** (`DIRECT_DEPOSIT_DISABLED`).

---

## 11. SAFE TESTING RULES FOR STRIX PENTEST EXECUTION

The following operational constraints are binding during all subsequent runtime testing:
1. **No Production Access:** Tests must only target local processes (`localhost:5000`) or dedicated staging projects.
2. **No Destructive Exploits:** Do not run `DROP TABLE`, bulk unlinks, or database trashing.
3. **No DoS / Flooding:** Do not execute high-volume volumetric denial-of-service tests against Cloudflare, Supabase, or Render.
4. **No Third-Party Attacks:** Do not attack Google OAuth servers, Razorpay payment APIs, or Supabase platform infrastructure.
5. **No Secret Ingestion:** Never log or commit valid auth tokens, service role credentials, or private test documents.
6. **Synthetic Test Data Only:** Use purely synthetic test users (`sec_user_a`, `sec_user_b`) and mock PDF files.

---

## 12. FINAL SECURITY GATE — PHASE 3A

```
TARGET ENVIRONMENT: LOCAL / DEVELOPMENT / STAGING
SAFE FOR RUNTIME TEST: YES
PRODUCTION TARGET DETECTED: NO
SERVICE ROLE EXPOSED CLIENT-SIDE: NO (Verified in Frontend, Admin, and Mobile)

RLS INVENTORY COMPLETE: YES (35 tables inventoried)
STORAGE INVENTORY COMPLETE: YES (5 public, 1 strictly private bucket)
TEST IDENTITIES READY: YES (8 distinct security test roles)
TEST RESOURCES READY: YES (Specifications established for Users, Pets, Businesses)

AUTHORIZATION MATRIX READY: YES (Multi-dimensional role vs resource map)
IDOR/BOLA TARGET LIST READY: YES (12 high-risk object endpoints mapped)
BUSINESS SECURITY TESTS READY: YES
PET PRIVACY TESTS READY: YES
VERIFICATION TESTS READY: YES
ADMIN TESTS READY: YES
ADS FLAG TESTS READY: YES

STRIX RUNTIME PENTEST: NOT STARTED (Pending User Review & Authorization)
```

---

**Execution stopped per Phase 3A instructions. Ready for review before Phase 3B.**
