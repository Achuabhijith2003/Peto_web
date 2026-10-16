# Peto Media and Storage — Pre-Phase 7.1 Runtime Completion

**Date:** 7 October 2026  
**Environment:** Local backend (`localhost:5000`, and an isolated diagnostic instance on `localhost:5001`) with the development Supabase project `ednleoavhuxlarnnlmkq`. `backend/.env` identifies `NODE_ENV=development` and Razorpay test mode. **Production touched: NO.**

## Summary

The Flutter development environment is restored, and local/backend security regressions pass except for two existing Phase 5 expectation mismatches. A synthetic MP4 with audio uploaded successfully through the backend, produced a thumbnail and exactly one media row, and linked that row to a post by ID. **A physical Android device was unavailable**, so the reported camera/gallery failure has not been reproduced or proven fixed.

The storage cleanup cannot be runtime-validated yet: migration 38 is absent from the development database, and no authenticated SQL migration interface or database connection setting is available in this environment. The default dry-run command exited safely before listing objects. No cleanup deletion was attempted.

## Migration 38 and cleanup

The current worker and migration were inspected and preserved. The worker manages only generated thumbnails, defaults to dry run, requires age ≥24 hours, checks `media.thumbnail_url` twice, and uses a database lease. Its CLI emits sanitized JSON statistics and never starts inside API replicas. The development project was verified from the local environment and earlier development reports, but **migration 38 was not applied** because the available service-role REST client does not provide SQL DDL execution; Supabase CLI/`psql` and an authenticated dashboard browser were unavailable.

A read-only development query for `storage_cleanup_lease` returned `PGRST205` (table unavailable). `npm run storage:cleanup` without `--delete` exited with its fail-safe `Cleanup aborted safely` message. It scanned and deleted **zero** objects; this is **not** a passing dry run. Concurrency RPC grants and two-worker lease behavior cannot be live-verified until migration 38 is applied. Local synthetic lease tests from the preceding phase passed in the backend suite.

The controlled old orphan/referenced thumbnail test was **not run**. Creating a new object would not satisfy the worker's 24-hour minimum grace period, and the production grace check was not weakened for a test. No real or synthetic Storage object was deleted by the worker.

## Scheduler and audit retention

No scheduler is active. The deployment requires **one** designated non-production scheduled job, working directory `backend`, cron `0 3 * * 0` (Sunday 03:00 UTC), command `npm run storage:cleanup` for initial dry runs. After reviewed dry-run evidence and migration verification, destructive mode additionally requires `--delete` and `STORAGE_CLEANUP_ALLOW_DELETE=true`. Do not configure a cron job in each API replica; the database lease is an overlap guard, not a substitute for a single scheduler. **SCHEDULER REQUIRES DEPLOYMENT CONFIGURATION.**

The CLI writes run ID, completion time, dry-run flag, counters, bucket/path classifications and failures to job output. A retained central job-log destination, retention period and alert on failure have not been configured. Do not retain tokens, signed URLs or document contents.

## Mobile source tracking and Flutter environment

`Mobile/peto_user` is a **separate Git repository** containing 206 tracked files. The parent repository ignores that nested checkout intentionally; the changed `lib/services/api_service.dart` and `lib/screens/posts/create_post_screen.dart` are tracked modifications in the mobile repository. Its ignore rules exclude `.dart_tool/`, `build/`, Android `local.properties` and `key.properties`. No force-add or broad ignore change was made.

`flutter pub get` succeeded. `flutter analyze` initially found one braces lint in the changed post screen; it was fixed and the full rerun reported **No issues found**. `flutter test` passed **7/7** existing tests. `flutter devices` listed Windows, Chrome and Edge, with **no physical Android device**. No app was installed or launched, and no production API was contacted by Flutter. The current Flutter default API URL is a hosted `peto-web.onrender.com` endpoint, so a future device test must explicitly point a development build to a verified development backend before installation.

## Video upload and media-ID contract

The source-level post-linking defect remains clear: Web attaches the `media.id` returned by `/api/media/upload`; Flutter previously attached the URL. The current Flutter source attaches the ID and requires both ID and URL in a successful upload response. The `.3gp`/`.m4v` compatibility path checks ISO-BMFF `ftyp` before sending an accepted `video/mp4` MIME. No Android picker output was available, so the exact device failure layer and actual camera MIME/codec remain **unconfirmed**.

A local one-second synthetic MP4 with H.264 video and AAC audio was sent as `media` multipart with `video/mp4` to a diagnostic development backend. The first attempt returned HTTP 500 because the synthetic Auth fixture lacked its required `profiles` row; the database rejected the media insert with foreign-key `23503`. This was a **test fixture error**. The backend's current rollback path removed the uploaded video and thumbnail: cache-busted public HEAD checks for both known synthetic paths returned HTTP 400. The request's temporary files were removed. No media row could have been committed by that failed insert.

With a synthetic profile added, the second run returned upload HTTP **201** with `media.id`, URL and thumbnail metadata. The backend reported MP4, one-second duration and a thumbnail. `POST /api/posts` with that exact media ID returned **201**; a database read showed `media.post_id` equal to the created post ID, and an exact-URL query returned **one** media row. `GET /api/posts/:id` and a thumbnail GET both returned **200**. The synthetic script attempted to remove its post, media row, public objects, profile and Auth user afterward; it did not perform a post-cleanup inventory check, so zero remaining objects from the successful run is not independently proven.

FFmpeg reached compression on the diagnostic server and completed enough to store an MP4 and thumbnail. No raw-input fallback was observed in that successful run. The synthetic post was read through the API; browser/mobile playback and feed rendering were **not** visually tested.

## Security regression and builds

| Check | Current result |
|---|---|
| Backend `npm test` | **65/65 pass**, including upload validation and cleanup synthetic tests |
| Phase 4A.1 pet RLS | **19/19 pass**, synthetic cleanup completed; `42P17=0` |
| Phase 4B private pet media | **20/20 pass**, synthetic cleanup completed; public/private transitions, signed URL expiry and spoof rejection passed |
| Phase 5 runtime | **41 pass, 2 fail, 2 N/A**; both failures described below |
| Phase 6 targeted | **43/43 pass**, including search, UUID, webhook and verification checks |
| Backend TypeScript / Web build | **PASS / PASS** |
| Flutter pub get / analyze / tests | **PASS / PASS / 7 of 7 PASS** |
| Admin build | Not rerun; Admin was not changed |

The Phase 5 failures are `ADS-01-DIRECT-DEPOSIT-DISABLED` (actual HTTP 403 `ADS_MARKETPLACE_DISABLED`, while the test requires HTTP 403 `DIRECT_DEPOSIT_DISABLED`) and `PAY-02-NEGATIVE-AMOUNT-ORDER` (actual HTTP 404 because the synthetic user has no advertiser profile, before amount validation). Neither response credited funds or created a payment order. The test expectations were **not** changed or counted as passes. Phase 5 exits with code 0 despite reporting these two failures, so its printed summary is authoritative.

The Node test runner on this Windows host raises `uv_os_get_passwd ENOMEM`; a temporary process-local `os.userInfo()` shim allowed `tsx` suites to run. The shim and raw logs were removed after extracting counts. No credential values or signed URLs are included here.

## Remaining work before Phase 7.1

1. Apply migration 38 through an authenticated SQL channel in the confirmed development project; verify table, function grants, anon/authenticated denial and concurrent lease acquisition.
2. Run the development dry run and record sanitized counts; devise a safe ≥24-hour synthetic fixture, then test candidate, referenced preservation and controlled deletion without weakening the grace period.
3. Configure exactly one Sunday scheduled job and retained audit logs with failure alerts.
4. Use an authorized physical Android device with an explicit development API target to trace gallery and camera uploads, codec, FFmpeg, thumbnail and playback; complete VIDEO-01–16 where applicable.
5. Review the two Phase 5 expectation mismatches and repeat the negative amount check with an advertiser fixture before claiming that case passes.

## Final gate

| Field | Result |
|---|---|
| MIGRATION 38 DEVELOPMENT | **NOT APPLIED** |
| CLEANUP DRY RUN | **FAIL** — safe abort, missing lease table; no scan/delete |
| CONTROLLED ORPHAN DELETE / REFERENCED MEDIA PRESERVED | **NOT RUN / NOT RUN** (live cleanup) |
| SCHEDULER / SUNDAY SCHEDULE | **DEPLOYMENT CONFIG REQUIRED / NOT CONFIRMED** |
| CONCURRENCY LEASE | **NOT RUN live** (local synthetic test passed) |
| AUDIT LOG RETENTION | **OPERATIONAL CONFIG REQUIRED** |
| MOBILE SOURCE TRACKING | **RESOLVED** — separate tracked mobile repository |
| FLUTTER PUB GET / ANALYZE | **PASS / PASS** |
| PHYSICAL DEVICE | **UNAVAILABLE** |
| GALLERY VIDEO / CAMERA VIDEO / DEVICE VIDEO MIME | **NOT RUN / NOT RUN / NOT RUN** |
| FFMPEG / THUMBNAIL / MEDIA ID LINKAGE | **PASS on synthetic backend MP4 / PASS / PASS** |
| DUPLICATE MEDIA ROW | **NONE in synthetic backend test** |
| FEED VIDEO PLAYBACK | **NOT RUN**; API post read passed |
| FAILED-UPLOAD STORAGE ORPHAN | **NONE for the verified failed synthetic video and thumbnail paths** |
| PETO-SEC-05 / 10 / 14 / 17 / 18 | **STILL FIXED in executed relevant tests** |
| 42P17 | **0** in Phase 4A.1 runtime suite |
| BACKEND / WEB / FLUTTER | **PASS / PASS / PASS** (Flutter analyze and existing tests; device upload unverified) |
| PRODUCTION TOUCHED | **NO** |
| READY FOR PHASE 7.1 | **NO** |

**Stop point:** This report. No production migration, cleanup or deployment was performed; Phase 7.1 was not started.
