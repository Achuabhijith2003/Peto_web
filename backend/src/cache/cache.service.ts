import { getRedisClient, isRedisCacheActive } from "../config/redis";

export interface CachedPublicProfile {
  id: string;
  username: string;
  full_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  location: string | null;
  website: string | null;
  verified: boolean;
  is_verified: boolean;
  badge_type: string | null;
  verification_badge_type: string | null;
  created_at: string;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  errors: number;
  bypasses: number;
  hitRatio: number;
}

const DEFAULT_TTL_SECONDS = 300; // 5 minutes bounded TTL for Free Render Key Value
const MAX_TTL_SECONDS = 600; // 10 minutes maximum cap
const KEY_PREFIX = "peto:v1";

let cacheHits = 0;
let cacheMisses = 0;
let cacheErrors = 0;
let cacheBypasses = 0;

/**
 * Returns current sanitized cache metrics (hits, misses, errors, bypasses).
 * Never exposes credentials or personal data.
 */
export function getCacheMetrics(): CacheMetrics {
  const total = cacheHits + cacheMisses;
  return {
    hits: cacheHits,
    misses: cacheMisses,
    errors: cacheErrors,
    bypasses: cacheBypasses,
    hitRatio: total > 0 ? Number((cacheHits / total).toFixed(4)) : 0,
  };
}

/**
 * Resets cache metrics (useful for testing and admin resets).
 */
export function resetCacheMetrics(): void {
  cacheHits = 0;
  cacheMisses = 0;
  cacheErrors = 0;
  cacheBypasses = 0;
}

/**
 * Validates that cached profile object contains only permitted public fields.
 * CRITICAL SECURITY FILTER: Explicitly forbids private pets, signed URLs,
 * verification documents, balances, ledgers, JWTs, and authorization decisions.
 */
export function sanitizePublicProfileForCache(raw: any): CachedPublicProfile | null {
  if (!raw || typeof raw !== "object" || !raw.id || !raw.username) {
    return null;
  }

  // Ensure no forbidden fields are leaked
  const forbiddenKeys = [
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
  for (const k of forbiddenKeys) {
    if (k in raw && raw[k] !== undefined) {
      delete raw[k];
    }
  }

  return {
    id: String(raw.id),
    username: String(raw.username).toLowerCase(),
    full_name: raw.full_name ? String(raw.full_name) : null,
    bio: raw.bio ? String(raw.bio) : null,
    avatar_url: raw.avatar_url ? String(raw.avatar_url) : null,
    cover_url: raw.cover_url ? String(raw.cover_url) : null,
    location: raw.location ? String(raw.location) : null,
    website: raw.website ? String(raw.website) : null,
    verified: Boolean(raw.verified || raw.is_verified),
    is_verified: Boolean(raw.verified || raw.is_verified),
    badge_type: raw.badge_type || (raw.verified ? "VERIFIED" : null),
    verification_badge_type: raw.verification_badge_type || null,
    created_at: raw.created_at ? String(raw.created_at) : new Date().toISOString(),
  };
}

/**
 * Generic safe JSON get helper.
 */
export async function cacheGet<T>(
  key: string,
  validator?: (val: any) => boolean
): Promise<T | null> {
  if (!isRedisCacheActive()) {
    cacheBypasses++;
    return null;
  }

  try {
    const redis = getRedisClient();
    if (!redis) {
      cacheBypasses++;
      return null;
    }

    const raw = await redis.get(key);
    if (!raw) {
      cacheMisses++;
      return null;
    }

    const parsed = JSON.parse(raw);
    if (validator && !validator(parsed)) {
      cacheMisses++;
      // Data format corrupt or invalid, remove poisoned key
      await redis.del(key).catch(() => {});
      return null;
    }

    cacheHits++;
    return parsed as T;
  } catch (err: any) {
    cacheErrors++;
    cacheMisses++;
    console.warn(`[Cache] Get error for key ${key}: ${err?.message || "error"}`);
    return null;
  }
}

/**
 * Generic safe JSON set helper with bounded TTL.
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<void> {
  if (!isRedisCacheActive()) {
    cacheBypasses++;
    return;
  }

  try {
    const redis = getRedisClient();
    if (!redis) {
      cacheBypasses++;
      return;
    }

    const boundedTtl = Math.max(1, Math.min(MAX_TTL_SECONDS, ttlSeconds));
    const serialized = JSON.stringify(value);
    await redis.set(key, serialized, "EX", boundedTtl);
  } catch (err: any) {
    cacheErrors++;
    console.warn(`[Cache] Set error for key ${key}: ${err?.message || "error"}`);
  }
}

/**
 * Generic safe delete helper.
 */
export async function cacheDel(keys: string | string[]): Promise<void> {
  if (!isRedisCacheActive()) {
    cacheBypasses++;
    return;
  }

  try {
    const redis = getRedisClient();
    if (!redis) {
      cacheBypasses++;
      return;
    }

    const keyList = Array.isArray(keys) ? keys : [keys];
    if (keyList.length === 0) return;
    await redis.del(...keyList);
  } catch (err: any) {
    cacheErrors++;
    console.warn(`[Cache] Del error: ${err?.message || "error"}`);
  }
}

/**
 * Non-blocking pattern invalidation using SCAN (never uses KEYS *).
 */
export async function cacheInvalidatePattern(pattern: string): Promise<void> {
  if (!isRedisCacheActive()) {
    cacheBypasses++;
    return;
  }

  try {
    const redis = getRedisClient();
    if (!redis) {
      cacheBypasses++;
      return;
    }

    let cursor = "0";
    do {
      const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 50);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } while (cursor !== "0");
  } catch (err: any) {
    cacheErrors++;
    console.warn(`[Cache] Invalidate pattern error for ${pattern}: ${err?.message || "error"}`);
  }
}

/**
 * Retrieves public user profile from cache by ID or username.
 */
export async function getPublicProfileFromCache(
  idOrUsername: string
): Promise<CachedPublicProfile | null> {
  if (!idOrUsername || !isRedisCacheActive()) return null;

  const clean = idOrUsername.trim().toLowerCase();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);
  const cacheKey = isUuid ? `${KEY_PREFIX}:p:${clean}` : `${KEY_PREFIX}:u:${clean}`;

  return cacheGet<CachedPublicProfile>(cacheKey, (data) => Boolean(data && data.id && data.username));
}

/**
 * Stores sanitized public user profile in cache under both ID and username keys.
 */
export async function setPublicProfileToCache(
  profile: any,
  ttlSeconds: number = DEFAULT_TTL_SECONDS
): Promise<void> {
  if (!isRedisCacheActive()) return;

  const sanitized = sanitizePublicProfileForCache(profile);
  if (!sanitized) return;

  const idKey = `${KEY_PREFIX}:p:${sanitized.id}`;
  const usernameKey = `${KEY_PREFIX}:u:${sanitized.username}`;

  await Promise.all([
    cacheSet(idKey, sanitized, ttlSeconds),
    cacheSet(usernameKey, sanitized, ttlSeconds),
  ]);
}

/**
 * Invalidates public user profile cache when profile data or verification changes.
 */
export async function invalidatePublicProfileCache(
  userId: string,
  username?: string
): Promise<void> {
  if (!isRedisCacheActive()) return;

  const keysToDelete = [`${KEY_PREFIX}:p:${userId}`];
  if (username) {
    keysToDelete.push(`${KEY_PREFIX}:u:${username.trim().toLowerCase()}`);
  }

  await cacheDel(keysToDelete);
}
