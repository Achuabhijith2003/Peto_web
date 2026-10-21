import { test } from 'node:test';
import assert from 'node:assert/strict';
import { supabase } from '../src/config/supabase';
import { saveMediaRecord, findOwnedMedia } from '../src/media/mediaRecord.service';
import { createPostService } from '../src/posts/post.service';

test('stable media/post IDs recover lost responses without crossing account ownership', async () => {
  const original = supabase.from;
  const tables: Record<string, Map<string, any>> = { posts: new Map(), media: new Map() };
  (supabase as any).from = (table: string) => {
    const filters: Record<string, any> = {};
    let insert: any;
    const q: any = {
      insert(value: any) { insert = value; return q; },
      select() { return q; }, eq(key: string, value: any) { filters[key] = value; return q; },
      async single() {
        if (tables[table].has(insert.id)) return { data: null, error: { code: '23505' } };
        tables[table].set(insert.id, { ...insert });
        return { data: { ...insert }, error: null };
      },
      async maybeSingle() {
        const row = [...tables[table].values()].find(row =>
          Object.entries(filters).every(([key, value]) => row[key] === value));
        return { data: row ?? null, error: null };
      },
    };
    return q;
  };
  try {
    const mediaId = 'be3c227a-094e-4d3e-9261-86aeb35b034a';
    const values = { user_id: 'alice', url: 'original', type: 'video' };
    assert.equal((await saveMediaRecord(values, mediaId)).created, true);
    const retry = await saveMediaRecord({ ...values, url: 'retry-output' }, mediaId);
    assert.equal(retry.created, false);
    assert.equal(retry.data.url, 'original');
    assert.equal(await findOwnedMedia(mediaId, 'bob'), null);
    await assert.rejects(saveMediaRecord({ ...values, user_id: 'bob' }, mediaId));
    assert.equal(tables.media.size, 1);

    const postId = 'fe3c227a-094e-4d3e-9261-86aeb35b034a';
    const payload = { userId: 'alice', clientPostId: postId, text: 'Hello', visibility: 'public' as const };
    const first = await createPostService(payload);
    const second = await createPostService(payload);
    assert.equal(first.id, second.id);
    assert.equal(tables.posts.size, 1);
    await assert.rejects(createPostService({ ...payload, userId: 'bob' }));
    await assert.rejects(createPostService({ ...payload, text: 'Different draft' }));
  } finally {
    (supabase as any).from = original;
  }
});
