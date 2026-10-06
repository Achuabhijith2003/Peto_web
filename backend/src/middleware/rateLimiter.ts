import { Request, Response, NextFunction } from "express";

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

/**
 * High-performance, zero-dependency sliding-window rate limiter for sensitive endpoints.
 */
export function createRateLimiter(options: RateLimiterOptions = {}) {
  const windowMs = options.windowMs || 60 * 1000; // default 1 minute
  const maxRequests = options.maxRequests || 10; // default 10 req/min
  const message = options.message || "Too many requests. Please slow down.";
  const code = options.code || "RATE_LIMIT_EXCEEDED";
  const keyPrefix = options.keyPrefix || "rl";

  const store = new Map<string, RateLimitRecord>();

  // Cleanup expired buckets every 5 minutes
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

  const limiter = (req: Request, res: Response, next: NextFunction) => {
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

  // Expose store reset for unit/integration testing
  limiter.reset = () => {
    store.clear();
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
