import "dotenv/config";
process.env.REDIS_ENABLED = "true";
process.env.REDIS_RATE_LIMIT_ENABLED = "true";
process.env.REDIS_CACHE_ENABLED = "false";

import test from "node:test";
import assert from "node:assert/strict";
import { getGlobalFeedService, getMyPostsService, getPostById, createPostService, deletePostById } from "../src/posts/post.service.js";
import { supabase } from "../src/config/supabase.js";
import {
  createRateLimiter,
  oauthExchangeRateLimiter,
  loginRateLimiter,
  signupRateLimiter,
  forgotPasswordRateLimiter,
  usernameCheckRateLimiter,
  uploadRateLimiter,
} from "../src/middleware/rateLimiter.js";
import { isRedisRateLimitActive, isRedisReady, _setMockRedisClient } from "../src/config/redis.js";
import postRoutes from "../src/posts/post.routes.js";

// Mock helper for Express req/res
function createMockReqRes(options: {
  headers?: Record<string, string>;
  ip?: string;
  body?: Record<string, any>;
  query?: Record<string, any>;
}) {
  const headers = { ...(options.headers || {}) };
  const ip = options.ip || "192.168.1.100";
  const req: any = {
    headers,
    ip,
    socket: { remoteAddress: ip },
    body: options.body || {},
    query: options.query || {},
    app: {
      get: (key: string) => (key === "trust proxy" ? false : undefined),
    },
  };

  let statusCode = 200;
  let responseData: any = null;
  const responseHeaders: Record<string, any> = {};

  const res: any = {
    status(code: number) {
      statusCode = code;
      return res;
    },
    json(data: any) {
      responseData = data;
      return res;
    },
    setHeader(key: string, val: any) {
      responseHeaders[key.toLowerCase()] = String(val);
      return res;
    },
    getStatusCode() {
      return statusCode;
    },
    getData() {
      return responseData;
    },
    getHeaders() {
      return responseHeaders;
    },
  };

  return { req, res };
}

// Mock Redis client with atomic Lua evaluation simulation
class MockRedisRateLimiter {
  public store = new Map<string, { count: number; expiresAt: number }>();
  public status = "ready";
  public evalLog: Array<{ key: string; windowMs: number }> = [];

  async ping(): Promise<string> {
    return "PONG";
  }

  async eval(script: string, numKeys: number, key: string, windowMs: number): Promise<[number, number]> {
    this.evalLog.push({ key, windowMs });
    const now = Date.now();
    let record = this.store.get(key);

    if (!record || now > record.expiresAt) {
      record = { count: 1, expiresAt: now + windowMs };
      this.store.set(key, record);
      return [1, windowMs];
    } else {
      record.count += 1;
      const ttl = Math.max(0, record.expiresAt - now);
      return [record.count, ttl];
    }
  }

  async quit(): Promise<string> {
    this.status = "close";
    return "OK";
  }

  disconnect(): void {
    this.status = "close";
  }
}

// ============================================================================
// TASK 1 & 4: Route Inspection & Rate Limiter Association
// ============================================================================
test("TASK-1: Audit routes: Confirm which routes use rate limiting and verify post routes have NONE", () => {
  // Inspect post router layer stack
  const postRouteLayers = (postRoutes as any).stack || [];
  const postEndpoints: string[] = [];

  for (const layer of postRouteLayers) {
    if (layer.route) {
      const path = layer.route.path;
      const methods = Object.keys(layer.route.methods).join(",").toUpperCase();
      postEndpoints.push(`${methods} ${path}`);
    }
  }

  // Confirm post endpoints exist
  assert.ok(postEndpoints.length >= 6, "Post routes must define core CRUD and feed endpoints");

  // Verify that the rate limiters exported are only for sensitive auth, media, user check
  assert.equal(typeof oauthExchangeRateLimiter, "function");
  assert.equal(typeof loginRateLimiter, "function");
  assert.equal(typeof signupRateLimiter, "function");
  assert.equal(typeof forgotPasswordRateLimiter, "function");
  assert.equal(typeof usernameCheckRateLimiter, "function");
  assert.equal(typeof uploadRateLimiter, "function");

  // Post routes themselves do NOT have rateLimiter middleware in their layer stack
  for (const layer of postRouteLayers) {
    if (layer.route) {
      for (const handler of layer.route.stack) {
        assert.notEqual(
          handler.name,
          "limiter",
          `Post route ${layer.route.path} must not be blocked by rateLimiter middleware`
        );
      }
    }
  }
});

// ============================================================================
// TASK 2 & 6: Redis Rate Limit Counters, Atomic Ops, TTL, and 429 Enforcement
// ============================================================================
test("TASK-2 & 6: Controlled synthetic rate-limit enforcement with atomic Redis operations and TTL", async () => {
  const mockRedis = new MockRedisRateLimiter();
  _setMockRedisClient(mockRedis as any, "ready");

  const testLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 3,
    message: "Rate limit reached for test.",
    code: "TEST_RATE_LIMITED",
    keyPrefix: "test_synth",
  });

  const ip = "10.0.0.99";

  // Requests 1, 2, 3 must PASS (next called, headers set)
  for (let i = 1; i <= 3; i++) {
    const { req, res } = createMockReqRes({ ip });
    let nextCalled = false;
    await testLimiter(req, res, () => {
      nextCalled = true;
    });

    assert.equal(nextCalled, true, `Request ${i} should be permitted`);
    assert.equal(res.getHeaders()["x-ratelimit-limit"], "3");
    assert.equal(res.getHeaders()["x-ratelimit-remaining"], String(3 - i));
    assert.ok(Number(res.getHeaders()["x-ratelimit-reset"]) > 0);
  }

  // Verify atomic Redis evaluation was invoked with correct key format and window
  assert.equal(mockRedis.evalLog.length, 3);
  assert.equal(mockRedis.evalLog[0].key, "peto:rl:test_synth:10.0.0.99");
  assert.equal(mockRedis.evalLog[0].windowMs, 60000);

  // Request 4 must be BLOCKED with HTTP 429 and Retry-After
  const { req, res } = createMockReqRes({ ip });
  let nextCalled4 = false;
  await testLimiter(req, res, () => {
    nextCalled4 = true;
  });

  assert.equal(nextCalled4, false, "Request 4 exceeding limit must NOT call next()");
  assert.equal(res.getStatusCode(), 429, "Must return HTTP 429");
  assert.equal(res.getData()?.code, "TEST_RATE_LIMITED");
  assert.ok(res.getHeaders()["retry-after"] !== undefined, "Must set Retry-After header");
  assert.equal(res.getHeaders()["x-ratelimit-remaining"], "0");

  _setMockRedisClient(null, "disabled");
});

// ============================================================================
// TASK 7: Safe Redis Outage Behavior (Fail-Closed / Local Enforcement)
// ============================================================================
test("TASK-7: Safe Redis Outage: Sensitive routes do NOT become unrestricted when Redis fails", async () => {
  const faultyRedis: any = {
    status: "error",
    eval: async () => {
      throw new Error("Valkey ECONNREFUSED: Server unreachable");
    },
  };
  _setMockRedisClient(faultyRedis, "error");

  const strictLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 2,
    message: "Strict limit exceeded.",
    code: "STRICT_LIMITED",
    keyPrefix: "outage_test",
  });

  const ip = "10.0.1.50";

  // Request 1: Redis throws -> falls back to local in-memory store -> passes
  const { req: req1, res: res1 } = createMockReqRes({ ip });
  let next1 = false;
  await strictLimiter(req1, res1, () => {
    next1 = true;
  });
  assert.equal(next1, true, "First request during outage should be allowed under threshold");

  // Request 2: passes
  const { req: req2, res: res2 } = createMockReqRes({ ip });
  let next2 = false;
  await strictLimiter(req2, res2, () => {
    next2 = true;
  });
  assert.equal(next2, true, "Second request should be allowed under threshold");

  // Request 3: EXCEEDS LIMIT -> Must NOT bypass protection, MUST return HTTP 429
  const { req: req3, res: res3 } = createMockReqRes({ ip });
  let next3 = false;
  await strictLimiter(req3, res3, () => {
    next3 = true;
  });
  assert.equal(next3, false, "CRITICAL: Outage must NOT allow unbounded requests to bypass limit");
  assert.equal(res3.getStatusCode(), 429, "Must enforce 429 in local fallback mode");
  assert.equal(res3.getData()?.code, "STRICT_LIMITED");

  _setMockRedisClient(null, "disabled");
});

// ============================================================================
// TASK 3 & 5: Post Visibility, Post Listing, and Supabase Query Independence
// ============================================================================
test("TASK-3 & 5: Verify post visibility and Supabase queries operate normally regardless of Redis", async () => {
  // 1. Query feed via service
  const feedResult = await getGlobalFeedService(undefined, 1, 10);
  assert.ok(feedResult, "getGlobalFeedService must return a result object");
  assert.ok(Array.isArray(feedResult.posts), "feedResult.posts must be an array");
  assert.ok(feedResult.pagination !== undefined, "feedResult must have pagination");
  assert.equal(typeof feedResult.pagination.total, "number");

  console.log(`[Diagnostic] Global feed post count in DB: ${feedResult.posts.length} (total: ${feedResult.pagination.total})`);

  // 2. All posts in global feed must have visibility === "public"
  for (const post of feedResult.posts) {
    assert.equal(
      post.visibility,
      "public",
      `Post ${post.id} in global feed must have visibility='public'`
    );
  }

  // 3. Test post detail retrieval for existing post if any exist
  if (feedResult.posts.length > 0) {
    const samplePostId = feedResult.posts[0].id;
    const detail = await getPostById(samplePostId);
    assert.ok(detail, "getPostById must return post detail for valid ID");
    assert.equal(detail.id, samplePostId);
  }

  // 4. Test non-existent post detail returns null safely without throwing
  const nonExistent = await getPostById("00000000-0000-0000-0000-000000000000");
  assert.equal(nonExistent, null, "Non-existent post must return null");

  // 5. Test invalid UUID format returns null safely
  const invalidId = await getPostById("not-a-valid-uuid");
  assert.equal(invalidId, null, "Invalid UUID must return null safely");
});

test("TASK-3b: Test authenticated post creation, post listing, and post detail retrieval lifecycle", async () => {
  // Find a valid profile from Supabase
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .limit(1)
    .maybeSingle();

  if (!profile) {
    console.log("[Diagnostic] Skipping post lifecycle creation test: no profile in DB");
    return;
  }

  const testText = `Automated Verification Post ${Date.now()}`;
  const created = await createPostService({
    userId: profile.id,
    text: testText,
    visibility: "public",
  });

  assert.ok(created?.id, "Post creation must return created post with ID");
  assert.equal(created.text, testText);
  assert.equal(created.visibility, "public");

  try {
    // Detail retrieval
    const retrieved = await getPostById(created.id, profile.id);
    assert.ok(retrieved, "Post detail must be retrievable");
    assert.equal(retrieved.id, created.id);
    assert.equal(retrieved.text, testText);

    // Listing retrieval via getMyPosts
    const myPosts = await getMyPostsService(profile.id);
    assert.ok(Array.isArray(myPosts.posts));
    const foundInMy = myPosts.posts.some((p: any) => p.id === created.id);
    assert.equal(foundInMy, true, "Created post must appear in author's my posts list");

    // Listing retrieval via getGlobalFeed
    const feed = await getGlobalFeedService(profile.id, 1, 10);
    assert.ok(Array.isArray(feed.posts));
    const foundInFeed = feed.posts.some((p: any) => p.id === created.id);
    assert.equal(foundInFeed, true, "Public post must appear in global feed");
  } finally {
    // Cleanup
    await deletePostById(created.id, profile.id);
    const afterDelete = await getPostById(created.id, profile.id);
    assert.equal(afterDelete, null, "Deleted post must no longer be retrievable");
  }
});
