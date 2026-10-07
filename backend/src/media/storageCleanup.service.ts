import crypto from 'crypto';
import { supabase } from '../config/supabase';

// Only generated thumbnails have one conclusively identified reference column.
// All other buckets are intentionally outside destructive scope.
export const MANAGED_BUCKETS = ['thumbnails'] as const;
export const EXCLUDED_BUCKETS = ['posts-images', 'posts-videos', 'avatars', 'covers', 'pet-media-private', 'verification-documents'] as const;
const GENERATED_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jpg$/i;

export type CleanupCounts = { scanned: number; referenced: number; tooNew: number; protected: number; unknown: number; candidates: number; deleted: number; failed: number };
export interface CleanupAdapter {
  acquire(owner: string): Promise<boolean>;
  release(owner: string): Promise<void>;
  list(bucket: string, offset: number, limit: number): Promise<{ name: string; id?: string | null; created_at?: string | null; updated_at?: string | null }[]>;
  referenced(bucket: string, paths: string[]): Promise<Set<string>>;
  remove(bucket: string, path: string): Promise<void>;
}

export const storageCleanupAdapter: CleanupAdapter = {
  async acquire(owner) {
    const { data, error } = await supabase.rpc('acquire_storage_cleanup_lease', { p_owner: owner, p_minutes: 120 });
    if (error) throw error;
    return data === true;
  },
  async release(owner) {
    const { error } = await supabase.rpc('release_storage_cleanup_lease', { p_owner: owner });
    if (error) throw error;
  },
  async list(bucket, offset, limit) {
    const { data, error } = await supabase.storage.from(bucket).list('', { offset, limit, sortBy: { column: 'name', order: 'asc' } });
    if (error) throw error;
    return data ?? [];
  },
  async referenced(bucket, paths) {
    if (bucket !== 'thumbnails') throw new Error('Unknown reference architecture');
    const urls = paths.map(path => supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl);
    const { data, error } = await supabase.from('media').select('thumbnail_url').in('thumbnail_url', urls);
    if (error) throw error;
    const found = new Set<string>();
    for (const row of data ?? []) {
      const match = paths.find((path, index) => row.thumbnail_url === urls[index]);
      if (match) found.add(match);
    }
    return found;
  },
  async remove(bucket, path) {
    const { data, error } = await supabase.storage.from(bucket).remove([path]);
    if (error || !data?.length) throw error ?? new Error('Storage did not confirm deletion');
  },
};

export async function runStorageCleanup(adapter: CleanupAdapter = storageCleanupAdapter, options: { dryRun?: boolean; graceHours?: number; batchSize?: number; now?: number; onEvent?: (event: { bucket: string; path: string; classification: string }) => void } = {}) {
  const dryRun = options.dryRun !== false;
  const graceHours = options.graceHours ?? 24;
  const batchSize = options.batchSize ?? 100;
  if (!Number.isFinite(graceHours) || graceHours < 24 || !Number.isInteger(batchSize) || batchSize < 1 || batchSize > 100) throw new Error('Unsafe cleanup configuration');
  const now = options.now ?? Date.now();
  const deadline = Date.now() + 90 * 60_000; // shorter than the 120-minute lease
  const owner = crypto.randomUUID();
  const counts: CleanupCounts = { scanned: 0, referenced: 0, tooNew: 0, protected: 0, unknown: 0, candidates: 0, deleted: 0, failed: 0 };
  if (!await adapter.acquire(owner)) return { runId: owner, status: 'LOCKED', dryRun, counts };
  try {
    for (const bucket of MANAGED_BUCKETS) {
      let offset = 0;
      while (true) {
        if (Date.now() >= deadline) throw new Error('Cleanup time limit reached');
        const objects = await adapter.list(bucket, offset, batchSize);
        if (!objects.length) break;
        offset += objects.length;
        const eligible: string[] = [];
        for (const object of objects) {
          counts.scanned++;
          const path = object.name;
          if (!object.id || !GENERATED_NAME.test(path)) { counts.protected++; options.onEvent?.({ bucket, path, classification: 'PROTECTED' }); continue; }
          const created = Date.parse(object.created_at ?? '');
          const updated = Date.parse(object.updated_at ?? '');
          if (!Number.isFinite(created) || !Number.isFinite(updated)) { counts.unknown++; options.onEvent?.({ bucket, path, classification: 'UNKNOWN_REFERENCE' }); continue; }
          if (Math.max(created, updated) > now - graceHours * 3600000) { counts.tooNew++; options.onEvent?.({ bucket, path, classification: 'TOO_NEW' }); continue; }
          eligible.push(path);
        }
        let references: Set<string>;
        try { references = await adapter.referenced(bucket, eligible); }
        catch { counts.unknown += eligible.length; continue; }
        let deletedInPage = false;
        for (const path of eligible) {
          if (references.has(path)) { counts.referenced++; options.onEvent?.({ bucket, path, classification: 'REFERENCED' }); continue; }
          counts.candidates++;
          options.onEvent?.({ bucket, path, classification: 'ORPHAN_CANDIDATE' });
          if (dryRun) continue;
          try {
            if (Date.now() >= deadline) throw new Error('Cleanup time limit reached');
            const fresh = await adapter.referenced(bucket, [path]);
            if (fresh.has(path)) { counts.referenced++; continue; }
            await adapter.remove(bucket, path);
            counts.deleted++;
            deletedInPage = true;
            options.onEvent?.({ bucket, path, classification: 'DELETED' });
          } catch { counts.failed++; options.onEvent?.({ bucket, path, classification: 'DELETE_FAILED' }); }
        }
        // Offset pagination shifts after deletion. Rescan from the beginning
        // to avoid skipping the object that moved into a deleted slot.
        if (deletedInPage) { offset = 0; continue; }
        if (objects.length < batchSize) break;
      }
    }
    return { runId: owner, status: 'COMPLETE', dryRun, counts };
  } finally {
    await adapter.release(owner);
  }
}
