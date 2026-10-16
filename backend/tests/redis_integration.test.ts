// Set test environment flags
process.env.NODE_ENV = "test";
process.env.REDIS_URL = "redis://:renderSecretPass123@red-testinstance.render.internal:6379";
process.env.REDIS_ENABLED = "true";
process.env.REDIS_CACHE_ENABLED = "true";
process.env.REDIS_RATE_LIMIT_ENABLED = "true";

import test from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeRedisUrl,
  getRedisHealth,
  _setMockRedisClient,
  isRedisReady,
  isRedisRateLimitActive,
  isRedisCacheActive,
  initRedis,
} from "../src/config/redis.js";
import { redisConfig } from "../src/config/env.js";
import {
  createRateLimiter,
  getClientIp,
} from "../src/middleware/rateLimiter.js";
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

/**
 * High-fidelity in-memory Mock Redis for deterministic multi-instance
 * distributed testing without needing an external network server.
 */
class MockRedisStore {
  public store = new Map<string, { value: string; expiresAt?: number }>();
  public evalCalls: Array<{ script: string; keys: string[]; args: any[] }> = [];
  public status = "ready";

  async ping(): Promise<string> {
    return "PONG";
  }

  async get(key: string): Promise<string | null> {
    const item = this.store.get(key);
    if (!item) return null;
    if (item.expiresAt && Date.now() > item.expiresAt) {
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
    this.evalCalls.push({ script, keys: [key], args: [windowMs] });
    const now = Date.now();
    let item = this.store.get(key);
    let count = 1;
    let ttl = windowMs;

    if (!item || (item.expiresAt && now > item.expiresAt)) {
      item = {
        value: "1",
        expiresAt: now + windowMs,
      };
      this.store.set(key, item);
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

  async info(section?: string): Promise<string> {
    if (section === "memory") {
      return "# Memory\r\nused_memory_human:4.20M\r\nused_memory_peak_human:6.10M\r\ntotal_system_memory_human:25.00M\r\n";
    }
    if (section === "stats") {
      return "# Stats\r\ntotal_connections_received:42\r\nkeyspace_hits:88\r\nkeyspace_misses:12\r\n";
    }
    if (section === "clients") {
      return "# Clients\r\nconnected_clients:3\r\n";
    }
    if (section === "server") {
      return "# Server\r\nuptime_in_seconds:3600\r\n";
    }
    return "";
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
  headers?: Record<string, string>;
  ip?: string;
  appTrustProxy?: boolean;
}) {
  const headers = options.headers || {};
  const ip = options.ip || "127.0.0.1";
  const req: any = {
    headers,
    ip,
    socket: { remoteAddress: ip },
    app: {
      get: (key: string) => (key === "trust proxy" ? options.appTrustProxy : undefined),
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
      responseHeaders[key.toLowerCase()] = val;
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

// Ensure mock Redis is active so tests do not attempt network connections
_setMockRedisClient(new MockRedisStore() as any, "ready");

// =========================================================================
// 1. CONFIGURATION & URL SANITIZATION TESTS
// =========================================================================

test("REDIS-01: Configuration parses typed environment variables safely", () => {
  assert.equal(typeof redisConfig.url, "string");
  assert.equal(redisConfig.enabled, true);
  assert.equal(redisConfig.cacheEnabled, true);
  assert.equal(redisConfig.rateLimitEnabled, true);
  assert.ok(redisConfig.connectTimeoutMs >= 1000);
  assert.ok(redisConfig.commandTimeoutMs >= 500);
});

test("REDIS-02: sanitizeRedisUrl redacts passwords and secrets from connection strings", () => {
  const secretUrl = "redis://default:SuperSecretPassword123@red-xyz.render.com:6379";
  const sanitized = sanitizeRedisUrl(secretUrl);

  assert.ok(!sanitized.includes("SuperSecretPassword123"), "Secret password must be redacted");
  assert.ok(sanitized.includes("***"), "Password must be masked with asterisks");
  assert.ok(sanitized.includes("red-xyz.render.com:6379"), "Host and port should remain for operational diagnostics");

  const redissUrl = "rediss://:AnotherSecret@red-abc.internal:6379";
  const sanitizedTls = sanitizeRedisUrl(redissUrl);
  assert.ok(!sanitizedTls.includes("AnotherSecret"), "TLS secret must be redacted");
});

test("REDIS-03: Client IP extraction respects trust proxy and rejects spoofed headers when untrusted", () => {
  const spoofedReqUntrusted = createMockReqRes({
    headers: { "x-forwarded-for": "203.0.113.195, 10.0.0.1" },
    ip: "192.168.1.100",
    appTrustProxy: false,
  });
  // Must NOT trust spoofed header when trust proxy is false
  assert.equal(getClientIp(spoofedReqUntrusted.req), "192.168.1.100");

  const trustedReq = createMockReqRes({
    headers: { "x-forwarded-for": "203.0.113.195" },
    ip: "203.0.113.195",
    appTrustProxy: true,
  });
  assert.equal(getClientIp(trustedReq.req), "203.0.113.195");
});

// =========================================================================
// 2. DISTRIBUTED RATE LIMITING & MULTI-INSTANCE TESTS
// =========================================================================

test("REDIS-04: Distributed rate limiter uses atomic Redis counter and enforces threshold", async () => {
  const mockRedis = new MockRedisStore();
  _setMockRedisClient(mockRedis as any, "ready");

  const limiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 3,
    message: "Distributed rate limit reached",
    code: "TEST_RATE_LIMITED",
    keyPrefix: "test_dist",
  });

  const ip = "10.0.5.1";
  let allowedCount = 0;
  let blockedRes: any = null;

  for (let i = 1; i <= 5; i++) {
    const { req, res } = createMockReqRes({ ip });
    let passed = false;

    await limiter(req, res, () => {
      passed = true;
    });

    if (res.getStatusCode() === 429) {
      blockedRes = {
        status: res.getStatusCode(),
        data: res.getData(),
        headers: res.getHeaders(),
      };
    }

    if (passed) allowedCount++;
  }

  assert.equal(allowedCount, 3, "Exactly 3 requests should be permitted");
  assert.ok(blockedRes, "4th and 5th requests must be throttled");
  assert.equal(blockedRes.status, 429);
  assert.equal(blockedRes.data.code, "TEST_RATE_LIMITED");
  assert.ok(blockedRes.headers["x-ratelimit-limit"], "Must include rate limit headers");
  assert.equal(blockedRes.headers["x-ratelimit-remaining"], 0);
  assert.ok(blockedRes.headers["retry-after"], "Must include Retry-After header");
});

test("REDIS-05: Multi-instance rate limiting: two simulated API instances sharing Redis enforce a single shared limit", async () => {
  const sharedRedis = new MockRedisStore();
  _setMockRedisClient(sharedRedis as any, "ready");

  // Simulated Instance 1 (has separate local memory)
  const instance1Limiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 4,
    keyPrefix: "multi_inst",
  });

  // Simulated Instance 2 (has separate local memory, but shares same Redis)
  const instance2Limiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 4,
    keyPrefix: "multi_inst",
  });

  const clientIp = "172.16.0.44";
  let totalAllowed = 0;
  let blockedOnInstance2: any = null;

  // Instance 1 receives 2 requests
  for (let i = 0; i < 2; i++) {
    const { req, res } = createMockReqRes({ ip: clientIp });
    await instance1Limiter(req, res, () => {
      totalAllowed++;
    });
  }

  // Instance 2 receives 2 requests (reaching the limit of 4)
  for (let i = 0; i < 2; i++) {
    const { req, res } = createMockReqRes({ ip: clientIp });
    await instance2Limiter(req, res, () => {
      totalAllowed++;
    });
  }

  // Instance 2 receives a 5th request: must be blocked because the shared counter is 4!
  const { req: req5, res: res5 } = createMockReqRes({ ip: clientIp });
  await instance2Limiter(req5, res5, () => {
    totalAllowed++;
  });
  if (res5.getStatusCode() === 429) {
    blockedOnInstance2 = {
      status: res5.getStatusCode(),
      data: res5.getData(),
    };
  }

  assert.equal(totalAllowed, 4, "Total allowed across both instances must be exactly 4");
  assert.ok(blockedOnInstance2, "Request on Instance 2 must be throttled by shared distributed counter");
  assert.equal(blockedOnInstance2.status, 429);
});

test("REDIS-06: Fail-Safe Fallback: Rate limiter falls back to local in-memory store when Redis throws or disconnects", async () => {
  // Simulate a failing Redis client
  const faultyRedis: any = {
    eval: async () => {
      throw new Error("ECONNRESET: Redis connection severed");
    },
    status: "ready",
  };
  _setMockRedisClient(faultyRedis, "ready");

  const failSafeLimiter = createRateLimiter({
    windowMs: 60 * 1000,
    maxRequests: 2,
    code: "FALLBACK_LIMITED",
    keyPrefix: "failsafe",
  });

  const ip = "192.168.99.1";
  let passedCount = 0;
  let blockedRes: any = null;

  for (let i = 1; i <= 4; i++) {
    const { req, res } = createMockReqRes({ ip });
    await failSafeLimiter(req, res, () => {
      passedCount++;
    });
    if (res.getStatusCode() === 429) {
      blockedRes = {
        status: res.getStatusCode(),
        code: res.getData().code,
      };
    }
  }

  // CRITICAL SECURITY ASSERTION: Even with Redis throwing, the request is STILL rate-limited locally!
  assert.equal(passedCount, 2, "Local fallback must enforce exactly 2 allowed requests");
  assert.ok(blockedRes, "Subsequent requests must be blocked by fallback store");
  assert.equal(blockedRes.status, 429);
  assert.equal(blockedRes.code, "FALLBACK_LIMITED");
});

// =========================================================================
// 3. SAFE CACHING & PRIVATE DATA ISOLATION TESTS
// =========================================================================

test("REDIS-07: Public profile caching stores safe public fields and tracks hits/misses", async () => {
  const mockRedis = new MockRedisStore();
  _setMockRedisClient(mockRedis as any, "ready");
  resetCacheMetrics();

  const sampleProfile = {
    id: "d3b07384-d113-4011-827a-85d10d10b9a8",
    username: "golden_retriever_fan",
    full_name: "Alex Smith",
    bio: "Pet lover & rescuer",
    avatar_url: "https://ednleoavhuxlarnnlmkq.supabase.co/storage/v1/object/public/avatars/alex.webp",
    cover_url: null,
    location: "Seattle, WA",
    website: "https://peto.app",
    verified: true,
    is_verified: true,
    badge_type: "VERIFIED",
    created_at: new Date().toISOString(),
  };

  // Initially cache is empty (miss)
  const initial = await getPublicProfileFromCache(sampleProfile.id);
  assert.equal(initial, null, "First fetch must be cache miss");

  // Store in cache
  await setPublicProfileToCache(sampleProfile);

  // Subsequent fetch by UUID (hit)
  const cachedById = await getPublicProfileFromCache(sampleProfile.id);
  assert.ok(cachedById, "Must retrieve profile from cache by ID");
  assert.equal(cachedById.username, "golden_retriever_fan");
  assert.equal(cachedById.verified, true);

  // Subsequent fetch by username (hit)
  const cachedByUsername = await getPublicProfileFromCache("golden_retriever_fan");
  assert.ok(cachedByUsername, "Must retrieve profile from cache by username");
  assert.equal(cachedByUsername.id, sampleProfile.id);

  const metrics = getCacheMetrics();
  assert.equal(metrics.misses, 1, "Must record 1 initial miss");
  assert.equal(metrics.hits, 2, "Must record 2 hits (by ID and by username)");
  assert.ok(metrics.hitRatio > 0.6, "Hit ratio must reflect hits/total");
});

test("REDIS-08: Invalidation removes cache keys upon profile or verification update", async () => {
  const mockRedis = new MockRedisStore();
  _setMockRedisClient(mockRedis as any, "ready");

  const userId = "44444444-4444-4444-4444-444444444444";
  const username = "fluffy_cat";

  await setPublicProfileToCache({
    id: userId,
    username,
    full_name: "Original Name",
    verified: false,
  });

  // Verify cached
  assert.ok(await getPublicProfileFromCache(userId));

  // Invalidate
  await invalidatePublicProfileCache(userId, username);

  // Verify purged
  assert.equal(await getPublicProfileFromCache(userId), null);
  assert.equal(await getPublicProfileFromCache(username), null);
});

test("REDIS-09: STRICT SECURITY GATE: Private pet media, documents, balances, ledgers, and JWTs are NEVER cached", async () => {
  const dangerousRawObject = {
    id: "55555555-5555-5555-5555-555555555555",
    username: "privacy_test_user",
    full_name: "Test User",
    // Forbidden private/sensitive fields
    pets: [{ id: "pet_1", name: "Secret Pet", is_private: true }],
    private_pets: [{ id: "pet_secret", health_notes: "Sensitive diagnosis" }],
    signed_url: "https://supabase.co/storage/v1/object/sign/pet-media-private/secret.jpg?token=secret123",
    verification_documents: [{ doc_id: "passport_scan_01.pdf" }],
    balance: 50000,
    ledger: [{ transaction_id: "tx_999", amount: 500 }],
    jwt: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dangerousToken",
    token: "bearer_secret_token",
    password: "plaintext_hash_attempt",
    phone: "+15551234567",
    email: "confidential@peto.app",
  };

  const sanitized = sanitizePublicProfileForCache(dangerousRawObject);
  assert.ok(sanitized, "Should extract valid public fields");

  // Strict assertions: NONE of the forbidden fields may exist in the cached profile
  const forbiddenFields = [
    "pets",
    "private_pets",
    "signed_url",
    "verification_documents",
    "balance",
    "ledger",
    "jwt",
    "token",
    "password",
    "phone",
    "email",
  ];

  for (const field of forbiddenFields) {
    assert.equal(
      (sanitized as any)[field],
      undefined,
      `SECURITY LEAK DETECTED: Forbidden field '${field}' must not be present in sanitized cache object`
    );
  }
});

test("REDIS-10: Cache Fallback Safety: Cache operations fail gracefully to origin when Redis throws or errors", async () => {
  const faultyRedis: any = {
    get: async () => {
      throw new Error("Redis connection timed out");
    },
    set: async () => {
      throw new Error("Redis write failure");
    },
    status: "ready",
  };
  _setMockRedisClient(faultyRedis, "ready");

  // cacheGet must not throw, must return null
  const result = await cacheGet("peto:v1:p:nonexistent");
  assert.equal(result, null, "Must safely return null on error");

  // cacheSet must not throw
  await assert.doesNotReject(async () => {
    await cacheSet("peto:v1:p:test", { test: 123 });
  }, "cacheSet must not throw on Redis failure");
});

test("REDIS-11: Admin Health Diagnostics: getRedisHealth returns sanitized status and memory metrics without secrets", async () => {
  const mockRedis = new MockRedisStore();
  _setMockRedisClient(mockRedis as any, "ready");

  const health = await getRedisHealth();
  assert.equal(health.isReady, true);
  assert.equal(health.state, "ready");
  assert.ok(typeof health.latencyMs === "number");
  assert.ok(!health.sanitizedUrl.includes("renderSecretPass123"), "Admin diagnostics must NEVER display plaintext password");
  assert.ok(health.memory, "Must include memory diagnostics");
  assert.equal(health.memory?.usedMemoryHuman, "4.20M");
  assert.equal(health.memory?.totalSystemMemoryHuman, "25.00M");
  assert.equal(health.metrics?.connectedClients, 3);
  assert.equal(health.metrics?.hits, 88);

  _setMockRedisClient(null, "disabled");
});

test("REDIS-12: Startup Diagnostics: initRedis verifies PING/PONG and reports CONNECTED without credentials", async () => {
  const mockRedis = new MockRedisStore();
  _setMockRedisClient(mockRedis as any, "ready");

  const diag = await initRedis();
  assert.equal(diag.status, "CONNECTED");
  assert.equal(diag.ping, "PONG");
  assert.ok(typeof diag.latencyMs === "number");
  assert.ok(!diag.sanitizedUrl.includes("renderSecretPass123"), "Endpoint in diagnostics must never expose passwords");
  assert.ok(diag.sanitizedUrl.includes("***"), "Endpoint must have masked password");
  assert.equal(isRedisReady(), true);

  _setMockRedisClient(null, "disabled");
});

test("REDIS-13: Startup Diagnostics: initRedis handles connection/ping failures safely as FAILED without throwing", async () => {
  const failingRedis: any = {
    status: "ready",
    ping: async () => {
      throw new Error("Simulated connection timeout");
    },
  };
  _setMockRedisClient(failingRedis, "ready");

  const diag = await initRedis();
  assert.equal(diag.status, "FAILED");
  assert.ok(diag.error?.includes("Simulated connection timeout"));
  assert.ok(!diag.sanitizedUrl.includes("renderSecretPass123"));
  assert.equal(isRedisReady(), false, "Must fail-safe to false when ping fails");

  _setMockRedisClient(null, "disabled");
});

test("REDIS-14: Startup Diagnostics: initRedis reports DISABLED when Redis is disabled", async () => {
  const origEnabled = process.env.REDIS_ENABLED;
  try {
    process.env.REDIS_ENABLED = "false";
    const diag = await initRedis();
    assert.equal(diag.status, "DISABLED");
    assert.equal(isRedisReady(), false);
  } finally {
    process.env.REDIS_ENABLED = origEnabled;
  }
});
