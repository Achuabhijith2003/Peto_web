# Mobile post upload queue

Pressing Post first copies selected files into the application's support directory
and saves the post payload, account ID, selected identity, and stable request IDs.
Only then does the composer close. The Home feed displays queued, transferring,
processing, publishing, retry, failure, and completion states.

On Android, Workmanager runs the queue as a `dataSync` foreground service with a
notification. It owns the work independently of the composer and survives normal
app backgrounding, screen lock, and app removal from Recents. Network constraints
and exponential backoff defer interrupted work. Completed media IDs are saved after
each upload. Five failed attempts require the user to tap Retry. Credentials are
read from secure storage at execution time, never copied into queue files. Each
request checks the queued account, and the original business identity is preserved.

Transfer percentages reflect bytes sent, not server transcoding. Processing and
publishing use an indeterminate indicator. Native progress notifications continue
when the Flutter home screen is not visible. Completed files are removed locally;
the completion card remains until dismissed.

Deploy the backend before installing the new APK. `/api/media/status/:id` allows
the owner to recover an upload whose HTTP response was lost. `client_media_id` and
`client_post_id` use existing UUID primary keys to prevent duplicate media records
and posts on retry. No database migration is required. Workmanager's Android
dataSync manifest is enabled in `android/gradle.properties`; this foreground-service
type also needs the corresponding declaration when publishing to Google Play.

## Platform limits

- Android Settings > Force stop prevents execution until the app is opened again.
  Relaunch reconciles the persisted queue. Vendor battery restrictions can also
  defer work. Swiping Recents is different from Force stop.
- iOS uses a registered BGProcessing task and starts foreground work immediately.
  iOS decides when deferred processing can run and can suspend it; user force-quit
  prevents automatic relaunch. The pending queue survives for the next launch.
  iOS deployment target is 14.0. iOS build/device verification requires Xcode.
- File transfer resumes at the media-item level, not within a partially sent file.
  Interrupted transfers restart that file. Completed uploads are reused.

## Verification

Automated Flutter tests cover persistent file copies after picker cache removal,
reopening the store, media checkpoints on post failure, stable post IDs, lost upload
responses, account switching, percentage display, and multipart auth refresh.
Backend tests cover duplicate IDs, ownership isolation, post retries, and portrait
HEVC conversion with and without audio.

Before release, test on the target Android device against the updated backend:

1. Submit a video and return to Home. Verify percentage and processing states.
2. Lock the screen, then remove the app from Recents; verify the notification
   continues and the post is published exactly once.
3. Disable network during transfer, restore it, and verify automatic retry.
4. Reopen the app during processing and verify recovery without another post.
5. Force stop, then reopen, and verify the saved queue resumes.
6. Switch accounts while a post is pending. Verify it cannot post under the new
   account; sign back into the original account and tap Retry.

No real account, storage, or device lifecycle test is performed by the unit tests.

## Backend memory on small instances

A reported 4K upload caused Render to terminate the API for exceeding 512 MB.
The video pipeline now limits decoder and encoder threads separately, uses
ultrafast/zero-latency encoding to reduce frame buffering, and caps output at
1080 pixels on the longer side and 30 fps. The faster encoder can produce larger
files than the previous preset at the same CRF.

Only one video pipeline can run per Node process. Overlapping requests receive a
retryable 503 with `VIDEO_PROCESSING_BUSY` and `Retry-After: 30`; their incoming
temporary files are reclaimed. Output video uploads stream from disk instead of
allocating a full-file buffer. Stage/progress logs include **Node-only** RSS; this
does not include the FFmpeg child process. Use Render Metrics/Events to check the
whole instance's memory.

Tests cover a synthetic 4K 10-bit HEVC/60 fps conversion, capacity ownership and
release, busy-request cleanup, streaming, audio, thumbnails, and retry ownership.
They do not establish a 512 MB peak-memory guarantee for every phone recording.
Deploy the backend changes and retry the original clip while watching Render's
instance memory and restart events.

Platform references: [Android long-running workers](https://developer.android.com/develop/background-work/background-tasks/persistent/how-to/long-running)
and [Workmanager platform setup](https://docs.page/fluttercommunity/flutter_workmanager/quickstart).
