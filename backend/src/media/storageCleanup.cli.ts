import 'dotenv/config';
import { runStorageCleanup } from './storageCleanup.service';

// Schedule this separate one-shot command with ONE platform cron job:
// 0 3 * * 0 (Sunday 03:00 UTC). Never import it from the API server.
// Dry-run is the default. Destructive mode requires both an explicit argument
// and an opt-in environment variable after migration 38 and dry-run review.
const destructive = process.argv.includes('--delete') && process.env.STORAGE_CLEANUP_ALLOW_DELETE === 'true';
const graceHours = Number(process.env.STORAGE_ORPHAN_GRACE_HOURS || 24);
const batchSize = Number(process.env.STORAGE_CLEANUP_BATCH_SIZE || 100);

try {
  const result = await runStorageCleanup(undefined, {
    dryRun: !destructive,
    graceHours,
    batchSize,
    onEvent: ({ bucket, path, classification }) => {
      // Only managed public thumbnail paths appear here; no signed URL or token.
      console.log(JSON.stringify({ bucket, path, classification }));
    },
  });
  console.log(JSON.stringify({ job: 'storage-cleanup', completedAt: new Date().toISOString(), ...result }));
} catch (error) {
  console.error(JSON.stringify({ job: 'storage-cleanup', status: 'FAILED', error: 'Cleanup aborted safely' }));
  process.exitCode = 1;
}
