import assert from 'node:assert/strict';
import { test } from 'node:test';
import { runStorageCleanup, type CleanupAdapter } from '../src/media/storageCleanup.service';

const old = '2020-01-01T00:00:00.000Z';
const fresh = '2026-01-01T00:00:00.000Z';
const path = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}.jpg`;

function fixture(names: string[], refs: string[] = [], failure: string[] = []) {
  const objects = names.map((name, index) => ({ name, id: String(index), created_at: old, updated_at: old }));
  const referenced = new Set(refs);
  const deleted: string[] = [];
  let locked = false;
  const adapter: CleanupAdapter = {
    async acquire() { if (locked) return false; locked = true; return true; },
    async release() { locked = false; },
    async list(_bucket, offset, limit) { return objects.filter(o => !deleted.includes(o.name)).slice(offset, offset + limit); },
    async referenced(_bucket, paths) { if (failure.includes('lookup')) throw new Error('DB unavailable'); return new Set(paths.filter(p => referenced.has(p))); },
    async remove(_bucket, name) { if (failure.includes(name)) throw new Error('Storage unavailable'); deleted.push(name); },
  };
  return { adapter, deleted, referenced, objects };
}

test('referenced thumbnail and dry-run candidate are preserved', async () => {
  const f = fixture([path(1), path(2)], [path(1)]);
  const result = await runStorageCleanup(f.adapter, { now: Date.parse(fresh), batchSize: 1 });
  assert.equal(result.counts.referenced, 1);
  assert.equal(result.counts.candidates, 1);
  assert.deepEqual(f.deleted, []);
});

test('delete checks references again, paginates, and continues after failure', async () => {
  const f = fixture([path(1), path(2), path(3)], [path(1)], [path(2)]);
  const result = await runStorageCleanup(f.adapter, { dryRun: false, now: Date.parse(fresh), batchSize: 2 });
  assert.ok(result.counts.failed >= 1);
  assert.deepEqual(f.deleted, [path(3)]);
});

test('reference appearing immediately before delete preserves object', async () => {
  const f = fixture([path(1)]);
  let calls = 0;
  f.adapter.referenced = async () => ++calls === 1 ? new Set() : new Set([path(1)]);
  const result = await runStorageCleanup(f.adapter, { dryRun: false, now: Date.parse(fresh) });
  assert.equal(result.counts.deleted, 0);
  assert.deepEqual(f.deleted, []);
});

test('unknown paths, new objects, and failed DB lookups cannot be deleted', async () => {
  const f = fixture(['default.jpg', path(1), path(2)], [], ['lookup']);
  f.objects[2].created_at = fresh;
  f.objects[2].updated_at = fresh;
  const result = await runStorageCleanup(f.adapter, { dryRun: false, now: Date.parse(fresh), batchSize: 2 });
  assert.equal(result.counts.protected, 1);
  assert.equal(result.counts.tooNew, 1);
  assert.equal(result.counts.unknown, 1);
  assert.deepEqual(f.deleted, []);
});

test('active lease prevents concurrent run', async () => {
  const f = fixture([path(1)]);
  await f.adapter.acquire('other');
  const result = await runStorageCleanup(f.adapter, { dryRun: false });
  assert.equal(result.status, 'LOCKED');
  assert.deepEqual(f.deleted, []);
});
