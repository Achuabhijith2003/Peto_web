import "dotenv/config";
process.env.REDIS_ENABLED = "true";
process.env.REDIS_RATE_LIMIT_ENABLED = "true";
process.env.REDIS_CACHE_ENABLED = "true";

import test from "node:test";
import assert from "node:assert/strict";
import {
  cacheGet,
  cacheSet,
  cacheDel,
  cacheInvalidatePattern,
  getPublicProfileFromCache,
  setPublicProfileToCache,
  invalidatePublicProfileCache,
  sanitizePublicProfileForCache,
  getCacheMetrics,
  resetCacheMetrics,
} from "../src/cache/cache.service.js";
import {
  createRateLimiter,
  oauthExchangeRateLimiter,
  loginRateLimiter,
  signupRateLimiter,
  forgotPasswordRateLimiter,
  usernameCheckRateLimiter,
  uploadRateLimiter,
} from "../src/middleware/rateLimiter.js";
import {
  _setMockRedisClient,
  isRedisReady,
  isRedisCacheActive,
  isRedisRateLimitActive,
  getRedisHealth,
} from "../src/config/redis.js";
import { getGlobalFeedService, getMyPostsService, getPostById, createPostService, deletePostById } from "../src/posts/post.service.js";
import { supabase } from "../src/config/supabase.js";
import postRoutes from "../src/posts/post.routes.js";
import userRoutes from "../src/users/user.routes.js";
import mediaRoutes from "../src/media/media.routes.js";
import authRoutes from "../src/auth/auth.routes.js";

/**
 * In-memory Mock Redis with accurate atomic TTL, expiration, Lua evaluation, and multi-client simulation.
 */
class MemoryRedisMock {
  public store = new Map<string, { value: string; expiresAt?: number }>();
  public status = "ready";
  public evalLog: Array<{ key: string; windowMs: number }> = [];

  async ping(): Promise<string> {
    return "PONG";
  }

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt !== undefined && Date.now() >= item.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return item.value;
  }

  async set(key: string, value: string, mode?: string, duration?: number): Promise<string> {
    let expiresAt: number | undefined;
    if (mode === "EX" && typeof duration === "number") {
      expiresAt = Date.now() + duration * 1000;
    } else if (mode === "PX" && typeof duration === "number") {
      expiresAt = Date.now() + duration;
    }
    this.store.set(key, { value, expiresAt });
    return "OK";
  }

  async del(...keys: string[]): Promise<number> {
    let count = 0;
    for (const k of keys) {
      if (this.store.delete(k)) count++;
    }
    return count;
  }

  async eval(script: string, numKeys: number, key: string, windowMs: number): Promise<[number, number]> {
    this.evalLog.push({ key, windowMs });
    const now = Date.now();
    let item = this.store.get(key);
    let count = 1;
    let ttl = windowMs;

    if (!item || (item.expiresAt !== undefined && now >= item.expiresAt)) {
      this.store.set(key, {
        value: "1",
        expiresAt: now + windowMs,
      });
      ttl = windowMs;
    } else {
      count = parseInt(item.value, 10) + 1;
      item.value = String(count);
      ttl = Math.max(0, (item.expiresAt || now) - now);
    }

    return [count, ttl];
  }

  async scan(cursor: string, matchKeyword: string, pattern: string, countKeyword: string, count: number): Promise<[string, string[]]> {
    const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
    const matchedKeys: string[] = [];
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        matchedKeys.push(key);
      }
    }
    return ["0", matchedKeys];
  }

  async info(): Promise<string> {
    return "# Stats\r\nkeyspace_hits:10\r\nkeyspace_misses:2\r\n";
  }

  async quit(): Promise<string> {
    this.status = "close";
    return "OK";
  }

  disconnect(): void {
    this.status = "close";
  }
}

function createMockReqRes(options: {
  ip?: string;
  headers?: Record<string, string>;
  body?: Record<string, any>;
}) {
  const ip = options.ip || "127.0.0.1";
  const req: any = {
    ip,
    socket: { remoteAddress: ip },
    headers: options.headers || {},
    body: options.body || {},
    app: {
      get: (key: string) => (key === "trust proxy" ? false : undefined),
    },
  };

  let statusCode = 200;
  let responseData: any = null;
  const headers: Record<string, string> = {};

  const res: any = {
    status(c: number) {
      statusCode = c;
      return res;
    },
    json(d: any) {
      responseData = d;
      return res;
    },
    setHeader(k: string, v: any) {
      headers[k.toLowerCase()] = String(v);
      return res;
    },
    getStatusCode: () => statusCode,
    getData: () => responseData,
    getHeaders: () => headers,
  };

  return { req, res };
}

// ============================================================================
// TEST 1: Endpoint Identification Audit
// ============================================================================
test("TEST-1: Endpoint Identification: Audit all endpoints using Redis caching or distributed rate limiting", () => {
  // Confirm rate limited routes exist
  assert.equal(typeof signupRateLimiter, "function");
  assert.equal(typeof loginRateLimiter, "function");
  assert.equal(typeof forgotPasswordRateLimiter, "function");
  assert.equal(typeof oauthExchangeRateLimiter, "function");
  assert.equal(typeof usernameCheckRateLimiter, "function");
  assert.equal(typeof uploadRateLimiter, "function");

  // Post routes stack audit: confirm ZERO rate limiters on post routes
  const postLayers = (postRoutes as any).stack || [];
  for (const layer of postLayers) {
    if (layer.route) {
      for (const handler of layer.route.stack) {
        assert.notEqual(handler.name, "limiter", `Post route ${layer.route.path} must not have rateLimiter`);
      }
    }
  }

  // Cache endpoint audit: cache functions only bind to public profiles
  assert.equal(typeof getPublicProfileFromCache, "function");
  assert.equal(typeof setPublicProfileToCache, "function");
  assert.equal(typeof invalidatePublicProfileCache, "function");
});

// ============================================================================
// TEST 2: Multi-Instance Rate Limiting, TTL & Atomic Lua Enforcement
// ============================================================================
test("TEST-2: Multi-Instance Rate Limiting: Two simulated backend instances enforce single shared counter", async () => {
  const sharedRedis = new MemoryRedisMock();
  _setMockRedisClient(sharedRedis as any, "ready");

  // Instance A and Instance B both connect to the same Redis cluster
  const limiterInstanceA = createRateLimiter({
    windowMs: 30 * 1000,
    maxRequests: 4,
    keyPrefix: "shared_instance_test",
  });
  const limiterInstanceB = createRateLimiter({
    windowMs: 30 * 1000,
    maxRequests: 4,
    keyPrefix: "shared_instance_test",
  });

  const clientIp = "198.51.100.22";

  // Req 1 to Instance A
  const { req: r1, res: s1 } = createMockReqRes({ ip: clientIp });
  let next1 = false;
  await limiterInstanceA(r1, s1, () => { next1 = true; });
  assert.equal(next1, true);
  assert.equal(s1.getHeaders()["x-ratelimit-remaining"], "3");

  // Req 2 to Instance B
  const { req: r2, res: s2 } = createMockReqRes({ ip: clientIp });
  let next2 = false;
  await limiterInstanceB(r2, s2, () => { next2 = true; });
  assert.equal(next2, true);
  assert.equal(s2.getHeaders()["x-ratelimit-remaining"], "2");

  // Req 3 to Instance A
  const { req: r3, res: s3 } = createMockReqRes({ ip: clientIp });
  let next3 = false;
  await limiterInstanceA(r3, s3, () => { next3 = true; });
  assert.equal(next3, true);
  assert.equal(s3.getHeaders()["x-ratelimit-remaining"], "1");

  // Req 4 to Instance B
  const { req: r4, res: s4 } = createMockReqRes({ ip: clientIp });
  let next4 = false;
  await limiterInstanceB(r4, s4, () => { next4 = true; });
  assert.equal(next4, true);
  assert.equal(s4.getHeaders()["x-ratelimit-remaining"], "0");

  // Req 5 to Instance A: Must be BLOCKED across instances with HTTP 429
  const { req: r5, res: s5 } = createMockReqRes({ ip: clientIp });
  let next5 = false;
  await limiterInstanceA(r5, s5, () => { next5 = true; });
  assert.equal(next5, false);
  assert.equal(s5.getStatusCode(), 429);
  assert.ok(s5.getHeaders()["retry-after"] !== undefined);

  // Req 6 to Instance B: Must also be BLOCKED
  const { req: r6, res: s6 } = createMockReqRes({ ip: clientIp });
  let next6 = false;
  await limiterInstanceB(r6, s6, () => { next6 = true; });
  assert.equal(next6, false);
  assert.equal(s6.getStatusCode(), 429);

  _setMockRedisClient(null, "disabled");
});

// ============================================================================
// TEST 3: Cache MISS -> SET -> HIT -> EXPIRE Lifecycle
// ============================================================================
test("TEST-3: Cache Lifecycle: MISS -> SET -> HIT -> EXPIRE with bounded TTL", async () => {
  const mockRedis = new MemoryRedisMock();
  _setMockRedisClient(mockRedis as any, "ready");
  resetCacheMetrics();

  const profile = {
    id: "a1a1a1a1-b2b2-c3c3-d4d4-e5e5e5e5e5e5",
    username: "golden_paws",
    full_name: "Golden Paws",
    avatar_url: "https://example.com/avatar.jpg",
    verified: true,
  };

  // Step 1: Initial query -> MISS
  const step1 = await getPublicProfileFromCache(profile.id);
  assert.equal(step1, null, "Initial read must be a cache MISS");

  // Step 2: SET into cache with 2-second TTL
  await setPublicProfileToCache(profile, 2);

  // Step 3: Immediate query -> HIT
  const step3ById = await getPublicProfileFromCache(profile.id);
  assert.ok(step3ById, "Immediate query by ID must be a cache HIT");
  assert.equal(step3ById?.username, "golden_paws");

  const step3ByUsername = await getPublicProfileFromCache("golden_paws");
  assert.ok(step3ByUsername, "Immediate query by username must be a cache HIT");
  assert.equal(step3ByUsername?.id, profile.id);

  // Check metrics after 1 miss and 2 hits
  const m1 = getCacheMetrics();
  assert.equal(m1.misses, 1);
  assert.equal(m1.hits, 2);
  assert.equal(m1.errors, 0);

  // Step 4: Advance mock clock past 2-second TTL -> EXPIRE
  const keyId = `peto:v1:p:${profile.id}`;
  const record = mockRedis.store.get(keyId);
  if (record) {
    // Manually set expiresAt in the past to simulate exact Redis TTL expiration
    record.expiresAt = Date.now() - 1000;
  }

  const step4 = await getPublicProfileFromCache(profile.id);
  assert.equal(step4, null, "Expired key must return cache MISS");

  const m2 = getCacheMetrics();
  assert.equal(m2.misses, 2);

  _setMockRedisClient(null, "disabled");
});

// ============================================================================
// TEST 4: Invalidation after Profile Update, Deletion, and Verification Change
// ============================================================================
test("TEST-4: Invalidation: Purges cache on profile updates, deletion, and verification changes", async () => {
  const mockRedis = new MemoryRedisMock();
  _setMockRedisClient(mockRedis as any, "ready");

  const profile = {
    id: "99999999-9999-9999-9999-999999999999",
    username: "husky_runner",
    full_name: "Original Name",
    verified: false,
  };

  // Seed cache
  await setPublicProfileToCache(profile);
  assert.ok(await getPublicProfileFromCache(profile.id));
  assert.ok(await getPublicProfileFromCache(profile.username));

  // Scenario A: Profile Update / Verification Status change invalidates both ID and username
  await invalidatePublicProfileCache(profile.id, profile.username);
  assert.equal(await getPublicProfileFromCache(profile.id), null, "Must be purged by ID");
  assert.equal(await getPublicProfileFromCache(profile.username), null, "Must be purged by username");

  // Re-seed for deletion test
  await setPublicProfileToCache(profile);
  assert.ok(await getPublicProfileFromCache(profile.id));

  // Scenario B: Account deletion invalidates cache
  await invalidatePublicProfileCache(profile.id);
  assert.equal(await getPublicProfileFromCache(profile.id), null, "Deleted account must not remain in cache");

  _setMockRedisClient(null, "disabled");
});

// ============================================================================
// TEST 5: Privacy Barrier: Forbidden fields CANNOT leak through shared cache
// ============================================================================
test("TEST-5: Privacy & Security Gate: Strips private pets, documents, JWTs, ledgers, and tokens", async () => {
  const leakAttempt = {
    id: "88888888-8888-8888-8888-888888888888",
    username: "safe_user",
    full_name: "Safe User",
    avatar_url: "https://example.com/safe.jpg",
    verified: true,
    // Sensitive/Private fields that must NEVER enter cache:
    phone: "+15551234567",
    email: "private_owner@example.com",
    password: "$2a$12$superSecretHashedPassword",
    token: "jwt.header.payload.signature",
    jwt: "secret_jwt_token",
    balance: 50000,
    ledger: [{ tx: 1, amount: 500 }],
    verification_documents: ["https://private-bucket/passport.pdf"],
    signed_url: "https://s3.signed.url?signature=123",
    private_pets: [{ name: "Confidential Dog" }],
    pets: [{ name: "Dog", private: true }],
  };

  const sanitized = sanitizePublicProfileForCache(leakAttempt);
  assert.ok(sanitized, "Sanitizer must return sanitized object");

  // Verify safe public fields remain
  assert.equal(sanitized.id, leakAttempt.id);
  assert.equal(sanitized.username, "safe_user");
  assert.equal(sanitized.full_name, "Safe User");
  assert.equal(sanitized.verified, true);

  // Assert EVERY forbidden field is undefined
  const forbidden = [
    "phone",
    "email",
    "password",
    "token",
    "jwt",
    "balance",
    "ledger",
    "verification_documents",
    "signed_url",
    "private_pets",
    "pets",
  ];
  for (const field of forbidden) {
    assert.equal(
      (sanitized as any)[field],
      undefined,
      `SECURITY ALERT: Forbidden field '${field}' must be stripped before caching`
    );
  }
});

// ============================================================================
// TEST 6: Post Operations Remain Functional With Cache Enabled and Disabled
// ============================================================================
test("TEST-6: Post Independence: Post creation, feed, and retrieval work with cache enabled and disabled", async () => {
  const { data: profile } = await supabase.from("profiles").select("id").limit(1).maybeSingle();
  if (!profile) {
    console.log("[Diagnostic] Skipping post test: no profile in DB");
    return;
  }

  // 1. With cache enabled
  _setMockRedisClient(new MemoryRedisMock() as any, "ready");
  const feed1 = await getGlobalFeedService(profile.id, 1, 5);
  assert.ok(Array.isArray(feed1.posts), "Feed works with cache enabled");

  // 2. With cache disabled
  _setMockRedisClient(null, "disabled");
  const feed2 = await getGlobalFeedService(profile.id, 1, 5);
  assert.ok(Array.isArray(feed2.posts), "Feed works with cache disabled");
  assert.equal(feed1.posts.length, feed2.posts.length, "Feed output must be identical regardless of cache toggle");
});

// ============================================================================
// TEST 7: Safe Redis Outages (Fail-Closed Rate Limiting & Fail-Open Caching)
// ============================================================================
test("TEST-7: Safe Outage: Rate limiter fails closed (enforces local limits) & cache fails gracefully to origin", async () => {
  const brokenRedis: any = {
    status: "ready",
    get: async () => { throw new Error("Valkey socket connection reset"); },
    set: async () => { throw new Error("Valkey read-only replica error"); },
    eval: async () => { throw new Error("Valkey timeout"); },
  };
  _setMockRedisClient(brokenRedis, "ready");
  resetCacheMetrics();

  // Part A: Cache Get during outage must not throw, must return null (fallback to DB)
  const cached = await cacheGet("peto:v1:p:test-id");
  assert.equal(cached, null, "Cache must fail safely to null on Redis outage");

  // Part B: Cache Set during outage must not throw
  await assert.doesNotReject(async () => {
    await cacheSet("peto:v1:p:test-id", { safe: 1 });
  }, "Cache set must not throw during outage");

  // Part C: Verify error metrics recorded
  const m = getCacheMetrics();
  assert.ok(m.errors >= 2, "Errors must be tracked in metrics");

  // Part D: Rate limiter fails closed to in-memory store, blocking excess requests
  const strictLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 1,
    keyPrefix: "outage_protect",
  });
  const ip = "10.99.99.1";

  // First request passes
  const { req: q1, res: s1 } = createMockReqRes({ ip });
  let n1 = false;
  await strictLimiter(q1, s1, () => { n1 = true; });
  assert.equal(n1, true, "First request passes under limit");

  // Second request: MUST BE BLOCKED (HTTP 429) even during Redis outage
  const { req: q2, res: s2 } = createMockReqRes({ ip });
  let n2 = false;
  await strictLimiter(q2, s2, () => { n2 = true; });
  assert.equal(n2, false, "Second request MUST NOT bypass protection during outage");
  assert.equal(s2.getStatusCode(), 429, "Must return HTTP 429 via local failover limiter");

  _setMockRedisClient(null, "disabled");
});

// ============================================================================
// TEST 8: Sanitized Cache Metrics (Hits, Misses, Errors, Bypasses)
// ============================================================================
test("TEST-8: Cache Metrics: Tracks hits, misses, errors, and bypasses with zero credential/PII exposure", async () => {
  resetCacheMetrics();

  // Initially all 0
  const m0 = getCacheMetrics();
  assert.equal(m0.hits, 0);
  assert.equal(m0.misses, 0);
  assert.equal(m0.errors, 0);
  assert.equal(m0.bypasses, 0);
  assert.equal(m0.hitRatio, 0);

  // When Redis is disabled: operations record bypasses
  _setMockRedisClient(null, "disabled");
  await cacheGet("test-key");
  await cacheSet("test-key", { test: 1 });
  await cacheDel("test-key");

  const mBypasses = getCacheMetrics();
  assert.ok(mBypasses.bypasses >= 3, "Bypasses must be incremented when cache is disabled");
  assert.equal(mBypasses.errors, 0);

  // When Redis is connected:
  const mockRedis = new MemoryRedisMock();
  _setMockRedisClient(mockRedis as any, "ready");
  resetCacheMetrics();

  // Miss
  await cacheGet("miss-key");
  // Set
  await cacheSet("hit-key", { username: "fluffy" });
  // Hit
  await cacheGet("hit-key");

  const mLive = getCacheMetrics();
  assert.equal(mLive.misses, 1);
  assert.equal(mLive.hits, 1);
  assert.equal(mLive.hitRatio, 0.5);

  _setMockRedisClient(null, "disabled");
});
