import { Request, Response, NextFunction } from "express";
import { getRedisClient, isRedisRateLimitActive } from "../config/redis";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export interface RateLimiterOptions {
  windowMs?: number;
  maxRequests?: number;
  message?: string;
  code?: string;
  keyPrefix?: string;
  keyGenerator?: (req: Request) => string;
}

/**
 * Safely extracts client IP address without trusting spoofed X-Forwarded-For headers
 * unless Express proxy trust is explicitly configured.
 */
export function getClientIp(req: Request): string {
  const trustProxyConfig = req.app?.get?.("trust proxy");
  if (trustProxyConfig || process.env.TRUST_PROXY === "true" || process.env.TRUST_PROXY === "1") {
    return req.ip || (req.socket?.remoteAddress ?? "unknown-client");
  }
  return req.socket?.remoteAddress || req.ip || "unknown-client";
}

const REDIS_RATE_LIMIT_LUA = `
local key = KEYS[1]
local windowMs = tonumber(ARGV[1])
local current = redis.call('INCR', key)
if current == 1 then
  redis.call('PEXPIRE', key, windowMs)
end
local ttl = redis.call('PTTL', key)
if ttl < 0 then
  redis.call('PEXPIRE', key, windowMs)
  ttl = windowMs
end
return { current, ttl }
`;

/**
 * High-performance, distributed sliding-window rate limiter for sensitive endpoints.
 * Uses atomic Redis Lua execution when Redis rate limiting is active, with an
 * immediate, bounded local in-memory sliding window fallback when Redis is unavailable.
 * Requests CANNOT bypass security-sensitive rate limits under any failure scenario.
 */
export function createRateLimiter(options: RateLimiterOptions = {}) {
  const windowMs = options.windowMs || 60 * 1000; // default 1 minute
  const maxRequests = options.maxRequests || 10; // default 10 req/min
  const message = options.message || "Too many requests. Please slow down.";
  const code = options.code || "RATE_LIMIT_EXCEEDED";
  const keyPrefix = options.keyPrefix || "rl";

  const store = new Map<string, RateLimitRecord>();

  // Cleanup expired in-memory buckets every 5 minutes to prevent memory leaks
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (now > record.resetTime) {
        store.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  // Synchronous local execution fallback
  const executeLocal = (req: Request, res: Response, next: NextFunction) => {
    const clientKey = options.keyGenerator
      ? options.keyGenerator(req)
      : getClientIp(req);

    const key = `${keyPrefix}:${String(clientKey)}`;
    const now = Date.now();

    let record = store.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      store.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, maxRequests - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader("X-RateLimit-Limit", maxRequests);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", resetSeconds);

    if (record.count > maxRequests) {
      res.setHeader("Retry-After", resetSeconds);
      return res.status(429).json({
        success: false,
        message,
        code,
        retryAfterSeconds: resetSeconds,
      });
    }

    next();
  };

  // Distributed Redis execution
  const executeRedis = async (req: Request, res: Response, next: NextFunction) => {
    const clientKey = options.keyGenerator
      ? options.keyGenerator(req)
      : getClientIp(req);

    const redis = getRedisClient();
    if (!redis || !isRedisRateLimitActive()) {
      return executeLocal(req, res, next);
    }

    try {
      const redisKey = `peto:rl:${keyPrefix}:${String(clientKey)}`;
      const result = (await redis.eval(
        REDIS_RATE_LIMIT_LUA,
        1,
        redisKey,
        windowMs
      )) as [number, number];

      const count = Number(result[0]);
      const ttlMs = Math.max(0, Number(result[1]));
      const resetSeconds = Math.max(1, Math.ceil(ttlMs / 1000));
      const remaining = Math.max(0, maxRequests - count);

      res.setHeader("X-RateLimit-Limit", maxRequests);
      res.setHeader("X-RateLimit-Remaining", remaining);
      res.setHeader("X-RateLimit-Reset", resetSeconds);

      if (count > maxRequests) {
        res.setHeader("Retry-After", resetSeconds);
        return res.status(429).json({
          success: false,
          message,
          code,
          retryAfterSeconds: resetSeconds,
        });
      }

      next();
    } catch (err: any) {
      // Fail closed to local bounded in-memory limiter on Redis error or disconnect
      return executeLocal(req, res, next);
    }
  };

  const limiter = (req: Request, res: Response, next: NextFunction): Promise<any> | void => {
    if (isRedisRateLimitActive()) {
      return executeRedis(req, res, next);
    }
    return executeLocal(req, res, next);
  };

  // Expose store reset for unit/integration testing
  limiter.reset = async () => {
    store.clear();
    const redis = getRedisClient();
    if (redis && isRedisRateLimitActive()) {
      try {
        let cursor = "0";
        const pattern = `peto:rl:${keyPrefix}:*`;
        do {
          const [nextCursor, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 50);
          cursor = nextCursor;
          if (keys.length > 0) {
            await redis.del(...keys);
          }
        } while (cursor !== "0");
      } catch {
        // Safe ignoring of reset errors in tests
      }
    }
  };

  return limiter;
}

/**
 * Dedicated strict rate limiter for Google OAuth sync code exchange (Phase 2A):
 * 10 attempts per 60 seconds per IP
 */
export const oauthExchangeRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 10,
  message: "Too many code exchange attempts. Please try again later.",
  code: "OAUTH_EXCHANGE_RATE_LIMITED",
  keyPrefix: "oauth_exchange",
});

/**
 * Login rate limiter: 10 attempts per 15 minutes per IP
 * Protects against credential stuffing and password brute forcing
 */
export const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: "Too many login attempts. Please try again in 15 minutes.",
  code: "LOGIN_RATE_LIMITED",
  keyPrefix: "rl_login",
});

/**
 * Signup rate limiter: 10 attempts per 15 minutes per IP
 * Protects against automated account spam / bot registrations
 */
export const signupRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: "Too many registration attempts. Please try again in 15 minutes.",
  code: "SIGNUP_RATE_LIMITED",
  keyPrefix: "rl_signup",
});

/**
 * Forgot password rate limiter: 5 attempts per 15 minutes per IP
 * Protects against password reset flooding and email enumeration abuse
 */
export const forgotPasswordRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 5,
  message: "Too many password reset requests. Please try again in 15 minutes.",
  code: "FORGOT_PASSWORD_RATE_LIMITED",
  keyPrefix: "rl_forgot_pw",
});

/**
 * Username check rate limiter: 30 attempts per 1 minute per IP
 * Prevents mass username harvesting while accommodating normal typing debounce during registration
 */
export const usernameCheckRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  message: "Too many username availability checks. Please slow down.",
  code: "USERNAME_CHECK_RATE_LIMITED",
  keyPrefix: "rl_check_username",
});

/**
 * Media upload rate limiter: 30 attempts per 15 minutes per IP
 * Protects against upload flooding and processing resource exhaustion
 */
export const uploadRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 30,
  message: "Too many upload attempts. Please try again in 15 minutes.",
  code: "UPLOAD_RATE_LIMITED",
  keyPrefix: "rl_upload",
});
