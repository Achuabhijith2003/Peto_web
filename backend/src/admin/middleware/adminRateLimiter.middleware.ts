import { Request, Response, NextFunction } from "express";
import { getRedisClient, isRedisRateLimitActive } from "../../config/redis";

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up expired buckets periodically (every 5 minutes) to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000).unref();

export interface AdminRateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
}

const REDIS_ADMIN_RATE_LIMIT_LUA = `
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
 * Distributed rate limiter for admin control panel.
 * Uses atomic Redis Lua operations when active with seamless in-memory fallback.
 * Default: 120 requests per 60 seconds per IP / client.
 */
export function adminRateLimiter(options: AdminRateLimitOptions = {}) {
  const windowMs = options.windowMs || 60 * 1000; // 1 minute
  const maxRequests = options.maxRequests || 120; // 120 req/min

  const executeLocal = (req: Request, res: Response, next: NextFunction) => {
    const clientKey =
      (req as any).admin?.userId ||
      req.ip ||
      (req.headers["x-forwarded-for"] as string) ||
      "unknown-admin";

    const key = `admin_rl:${String(clientKey)}`;
    const now = Date.now();

    let record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      rateLimitStore.set(key, record);
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
        message: "Too many requests to admin control panel. Please slow down.",
        code: "RATE_LIMIT_EXCEEDED",
        retryAfterSeconds: resetSeconds,
      });
    }

    next();
  };

  const executeRedis = async (req: Request, res: Response, next: NextFunction) => {
    const clientKey =
      (req as any).admin?.userId ||
      req.ip ||
      (req.headers["x-forwarded-for"] as string) ||
      "unknown-admin";

    const redis = getRedisClient();
    if (!redis || !isRedisRateLimitActive()) {
      return executeLocal(req, res, next);
    }

    try {
      const redisKey = `peto:rl:admin:${String(clientKey)}`;
      const result = (await redis.eval(
        REDIS_ADMIN_RATE_LIMIT_LUA,
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
          message: "Too many requests to admin control panel. Please slow down.",
          code: "RATE_LIMIT_EXCEEDED",
          retryAfterSeconds: resetSeconds,
        });
      }

      next();
    } catch {
      return executeLocal(req, res, next);
    }
  };

  return (req: Request, res: Response, next: NextFunction) => {
    if (isRedisRateLimitActive()) {
      executeRedis(req, res, next);
      return;
    }
    executeLocal(req, res, next);
  };
}
