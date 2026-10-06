import { CorsOptions } from "cors";

/**
 * Normalizes an origin string by trimming whitespace and removing trailing slashes.
 */
export function normalizeOrigin(origin: string): string {
  return origin.trim().toLowerCase().replace(/\/+$/, "");
}

/**
 * Builds the authoritative set of allowed browser origins (PETO-SEC-09).
 * - Exact normalized matching only (no wildcards, no substring matching).
 * - Distinguishes production vs local development origins.
 */
export function getAllowedOrigins(): Set<string> {
  const allowed = new Set<string>();

  // 1. Configured production and staging origins from environment
  if (process.env.CLIENT_URL) {
    allowed.add(normalizeOrigin(process.env.CLIENT_URL));
  }
  if (process.env.ADMIN_CLIENT_URL) {
    allowed.add(normalizeOrigin(process.env.ADMIN_CLIENT_URL));
  }
  if (process.env.ADDITIONAL_ALLOWED_ORIGINS) {
    process.env.ADDITIONAL_ALLOWED_ORIGINS.split(",")
      .map((o) => normalizeOrigin(o))
      .filter(Boolean)
      .forEach((o) => allowed.add(o));
  }

  // 2. Known production domains for Peto Web and Admin
  allowed.add(normalizeOrigin("https://peto-web.onrender.com"));
  allowed.add(normalizeOrigin("https://peto-admin.onrender.com"));

  // 3. Local development origins enabled ONLY in non-production environments
  const isProduction = process.env.NODE_ENV === "production";
  if (!isProduction) {
    allowed.add("http://localhost:5173");
    allowed.add("http://localhost:5174");
    allowed.add("http://localhost:5175");
    allowed.add("http://127.0.0.1:5173");
    allowed.add("http://127.0.0.1:5174");
    allowed.add("http://127.0.0.1:5175");
  }

  return allowed;
}

/**
 * Authoritative, hardened CORS configuration (PETO-SEC-09)
 */
export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Non-browser clients (native mobile Flutter app, curl, server-to-server) do not send Origin header
    if (!origin) {
      return callback(null, true);
    }

    const normalized = normalizeOrigin(origin);
    const allowed = getAllowedOrigins();

    // Exact match against whitelist
    if (allowed.has(normalized)) {
      return callback(null, true);
    }

    // Explicit rejection for untrusted or lookalike origins
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
  allowedHeaders: [
    "Authorization",
    "Content-Type",
    "Accept",
    "Origin",
    "X-Requested-With",
    "x-refresh-token",
    // Preserved Peto Business identity headers
    "x-acting-identity-type",
    "x-acting-identity-id",
    // Client telemetry headers
    "x-client-platform",
    "x-client-version",
  ],
  exposedHeaders: [
    "X-RateLimit-Limit",
    "X-RateLimit-Remaining",
    "X-RateLimit-Reset",
    "Retry-After",
  ],
  maxAge: 86400, // 24 hours preflight cache
};
