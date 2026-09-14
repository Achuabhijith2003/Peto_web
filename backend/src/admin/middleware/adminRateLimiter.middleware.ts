import { Request, Response, NextFunction } from "express";

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

/**
 * High-performance, zero-dependency sliding window rate limiter for admin control panel.
 * Default: 120 requests per 60 seconds per IP / client.
 */
export function adminRateLimiter(options: AdminRateLimitOptions = {}) {
  const windowMs = options.windowMs || 60 * 1000; // 1 minute
  const maxRequests = options.maxRequests || 120; // 120 req/min

  return (req: Request, res: Response, next: NextFunction) => {
    // Identify client by admin user ID (if authenticated) or client IP
    const clientKey =
      (req as any).admin?.userId ||
      req.ip ||
      req.headers["x-forwarded-for"] ||
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
}
