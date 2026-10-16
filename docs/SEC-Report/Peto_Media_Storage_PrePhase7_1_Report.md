# Peto Media and Storage — Pre-Phase 7.1 Report

## 1. Executive Summary

The repository now has a conservative dry-run-first storage cleanup command and a Flutter post-media contract fix. **This is a partial implementation and is not release-validated.** No scheduler was activated, migration 38 was not applied, no Supabase storage was scanned, and no device upload was performed.

## 2. Storage Architecture Inventory

| Bucket | Path | Authoritative references | Visibility | Automatic cleanup |
|---|---|---|---|---|
| `posts-images` | generated UUID `.webp`, plus avatar/cover fallback | `media.url`, `profiles.avatar_url/cover_url`, `business_identities`, `communities`, pet media/profile fields and possibly ad assets | public | excluded: many reference paths |
| `posts-videos` | generated UUID `.mp4` | `media.url`, potentially reused by ads/posts | public | excluded pending exhaustive relationship audit |
| `thumbnails` | generated UUID `.jpg` | `media.thumbnail_url` | public | **included** only for old generated objects |
| `avatars`, `covers` | generated file | profile/business/pet references | public | excluded |
| `pet-media-private` | pet-scoped private path | `pet_media.storage_bucket/storage_path`, media private references | private | excluded |
| `verification-documents` | private document path | `verification_documents` lifecycle | private | excluded |

`storage.service.ts` creates the five public buckets. `petStorage.service.ts` and `secureStorage.service.ts` handle protected media/documents. Post images/videos are uploaded before their `media` row is inserted. Video processing uses FFmpeg, uploads a video and optional thumbnail, then inserts the media row. Existing immediate deletion paths exist in post/pet services. The inventory is from source, not a live bucket listing.

## 3. Orphan Definition

The worker considers only a generated UUID `.jpg` in `thumbnails`, older than the grace period according to both creation and update time, absent from `media.thumbnail_url` at discovery and immediately before removal. Unknown format, missing timestamps, DB errors, folders and every unconfigured bucket are preserved. An object absent from one unrelated table is never sufficient proof for other buckets.

## 4. Cleanup Worker Architecture

`storageCleanup.service.ts` lists one managed bucket in bounded pages, checks references in batches, performs a second lookup before deletion and handles per-object failures. Deletion uses the canonical bucket and object path. Pagination restarts after deletion so shifted offsets cannot skip objects. A 90-minute job deadline stays below the 120-minute lease. API startup does not run this job. The one-shot CLI is `npm run storage:cleanup` in `backend`.

## 5. Grace Period

Default **24 hours**, configurable with `STORAGE_ORPHAN_GRACE_HOURS`; values below 24 are rejected. Listing batch size defaults to 100 and cannot exceed 100.

## 6. Protected Buckets

Verification documents and private pet media are excluded completely. Posts, videos, avatars and covers are also excluded from destructive cleanup because their full cross-table references are not yet proven. Default/system assets are protected by the generated-name allowlist.

## 7. Scheduler / Locking

Migration `38_storage_cleanup_lease.sql` creates a database lease and service-role-only acquire/release RPCs. A second worker exits with `LOCKED`. The CLI documents a **Sunday 03:00 UTC** platform-cron expression (`0 3 * * 0`). No scheduler has been provisioned or activated. It must be a single designated external job; the main API never schedules it. The lease is a second concurrency barrier. **SUNDAY EXECUTION: NO, pending deployment scheduling.**

## 8. Dry Run

Dry run is default. Deletion requires both `--delete` and `STORAGE_CLEANUP_ALLOW_DELETE=true`. CLI emits per-object classifications and a run summary as JSON to the job log, without tokens or signed URLs. Log retention/central audit storage remains a deployment task. Migration 38 must be applied in an isolated/development environment and validated before any destructive run.

## 9. Cleanup Tests

Five local synthetic tests cover referenced thumbnail preservation, dry-run zero deletion, old candidate deletion, new/default-object preservation, DB lookup failure, concurrent lease denial, recheck race, pagination and continuing after a delete failure. They passed within the 65/65 backend test run. Other buckets remain excluded, so the private/verification preservation property follows the allowlist; no live bucket test was run.

## 10. Flutter Video Root Cause

**Confirmed contract mismatch:** Web posts use returned `media.id`, while Flutter sent uploaded URLs. `createPostService` treats a URL as a legacy object and can create/link an additional media row, losing the original video row's thumbnail/metadata relationship. This is a confirmed post-linking defect, but **the user's specific device upload failure layer is not established** without a failing device request or sanitized backend trace. A second likely failure case was found: Flutter labels `.3gp`/`.m4v` as MIME types that Multer rejects, even when the local container has a valid ISO-BMFF `ftyp` signature. It is now mapped to `video/mp4` only after checking that signature. No backend MIME allowlist was weakened.

## 11. Web vs Flutter Request Comparison

Both send `POST /api/media/upload`, `FormData` field `media`, Bearer auth and acting-business headers when selected; both let the HTTP library generate multipart boundaries. Web timeout is 300 seconds. Flutter sends a file with a five-minute send/receive timeout and progress callback. The backend accepts `upload.any()`, validates MIME and magic bytes, processes via image/FFmpeg path, uploads to Supabase and inserts `media`. Web sends IDs on `POST /api/posts`; Flutter previously sent URLs.

## 12. Mobile Fix

Flutter post creation now attaches returned media IDs. Upload response requires both ID and URL, checks client file size, and maps valid `.3gp`/`.m4v` `ftyp` containers to the backend's accepted MP4 MIME. Error messages are user-safe; diagnostics include only stage/status. The existing upload progress callback and submission/loading state remain. The mobile directory is excluded by the repository `.gitignore`, so these changes are present in the shared workspace but will require an explicit mobile tracking decision to travel through Git.

## 13. MIME / Codec Findings

Backend accepts JPEG/PNG/WebP and MP4/WebM/MOV with magic-byte validation. Flutter also advertises AVI/MKV/3GP/M4V/TS; AVI/MKV/TS remain controlled rejections. Actual device codec, audio streams and containers were not inspected. Backend FFmpeg transcodes to H.264/AAC MP4 when successful.

## 14. FFmpeg Findings

`video.service.ts` probes metadata, compresses with FFmpeg and generates a thumbnail; on compression failure it falls back to raw input. This existing fallback may be unsuitable for some mobile containers and needs a real recorded-file test. No device FFmpeg run was made. Server-generated temp names continue to be used.

## 15. Storage / DB Behavior

Video and image processing now attempt to remove newly uploaded Storage objects if the subsequent media-row insert fails. This reduces avoidable orphans but cannot guarantee recovery if the cleanup call itself fails. Successful post attachment via media ID preserves the original row and thumbnail. The scheduled worker does not sweep videos or images; those require a broader reference audit before destructive reconciliation.

## 16. Mobile Video Test Results

VIDEO-01 through VIDEO-16: **NOT RUN on a physical device or isolated running backend.** No actual camera/gallery file, audio/no-audio sample, network interruption, backend media row or thumbnail was observed. Static request-contract comparison and local source fixes are the available evidence. Device upload remains **PARTIAL**.

## 17. Security Regression Results

`npm test` passed **65/65**, including Phase 2 upload validation tests and new cleanup tests. To run the suite in this Windows sandbox, a temporary process-local preload supplied `os.userInfo()` because this Node installation returns `uv_os_get_passwd ENOMEM`; the preload file was removed afterward. Pet RLS (`42P17`) and private pet media Storage regressions require the isolated Supabase target and were **not rerun**. Verification documents remain outside the worker. Ads defaults were covered by the backend tests. Search and UUID runtime suites were not rerun.

## 18. Build / Analyze Results

Backend TypeScript build: **PASS**. Web build: **PASS**. Admin: not touched. Flutter files formatted; targeted Dart analysis could not resolve `dio`, `provider` and other packages in this ignored mobile directory, so **Flutter analyze is not a pass**. No physical device was attached or tested.

## 19. Files Changed

- `backend/src/media/storageCleanup.service.ts`, `storageCleanup.cli.ts`, `backend/tests/storage_cleanup.test.ts`
- `docs/database/38_storage_cleanup_lease.sql`, `backend/package.json`
- `backend/src/media/video.service.ts`, `image.service.ts`
- `Mobile/peto_user/lib/services/api_service.dart`, `lib/screens/posts/create_post_screen.dart` (Git-ignored workspace files)
- This report

## 20. Remaining Risks and Gate

| Field | Result |
|---|---|
| WEEKLY CLEANUP WORKER | **PARTIAL**: command and lock implemented; schedule not activated |
| SCHEDULE / SUNDAY EXECUTION | External platform cron `0 3 * * 0` documented / **NO** active job |
| CONCURRENCY PROTECTION / GRACE PERIOD | **YES** via migration 38 lease / **24 hours** |
| DRY RUN / REFERENCED MEDIA PRESERVED / UNKNOWN REFERENCES | **PASS in synthetic tests** / **PASS for managed thumbnails** / **PRESERVED** |
| PRIVATE PET MEDIA / VERIFICATION DOCUMENTS | **PRESERVED by exclusion / EXCLUDED** |
| ORPHAN DELETE | **PASS in synthetic test only** |
| FLUTTER VIDEO ROOT CAUSE | URL-versus-ID post-link mismatch confirmed; device upload failure remains undiagnosed |
| FLUTTER VIDEO UPLOAD / DEVICE VIDEO / GALLERY VIDEO | **PARTIAL / NOT RUN / NOT RUN** |
| BACKEND VIDEO PROCESSING / FFMPEG / THUMBNAIL / MEDIA DB INSERT | **NOT RUN with mobile video** |
| ORPHAN STORAGE AFTER FAILED UPLOAD | Immediate rollback added; **not runtime-verified** |
| PETO-SEC-05 | **STILL FIXED in local unit suite** |
| PETO-SEC-10 / PETO-SEC-14 / 42P17 | **NOT RETESTED / NOT RETESTED / NOT MEASURED** |
| BACKEND BUILD / WEB / ADMIN | **PASS / PASS / NOT TOUCHED** |
| FLUTTER ANALYZE | **NOT VERIFIED** (dependencies unavailable locally) |
| PRODUCTION TOUCHED | **NO** |

Before Phase 7.1, install migration 38 in an isolated target, review dry-run output, configure a single Sunday scheduler, establish retained audit logs, and complete the device/video matrix. **No production cleanup, migration or deployment was performed.**
