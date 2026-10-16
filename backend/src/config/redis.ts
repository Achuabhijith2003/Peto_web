import Redis, { RedisOptions } from "ioredis";
import { redisConfig } from "./env";

export type RedisConnectionState =
  | "disabled"
  | "uninitialized"
  | "connecting"
  | "ready"
  | "reconnecting"
  | "close"
  | "error";

export interface RedisHealthInfo {
  enabled: boolean;
  cacheEnabled: boolean;
  rateLimitEnabled: boolean;
  state: RedisConnectionState;
  isReady: boolean;
  latencyMs: number | null;
  sanitizedUrl: string;
  memory?: {
    usedMemoryHuman?: string;
    usedMemoryPeakHuman?: string;
    totalSystemMemoryHuman?: string;
  };
  metrics?: {
    totalConnectionsReceived?: number;
    connectedClients?: number;
    uptimeInSeconds?: number;
    hits?: number;
    misses?: number;
  };
}

let redisInstance: Redis | null = null;
let connectionState: RedisConnectionState = redisConfig.enabled ? "uninitialized" : "disabled";
let lastPingLatency: number | null = null;
let connectingPromise: Promise<void> | null = null;

export interface RedisDiagnosticResult {
  status: "CONNECTED" | "DISABLED" | "FAILED";
  sanitizedUrl: string;
  latencyMs: number | null;
  ping: string | null;
  error?: string;
}

/**
 * Sanitizes Redis connection URL to prevent credentials leakage in logs/APIs.
 */
export function sanitizeRedisUrl(rawUrl: string): string {
  if (!rawUrl) return "";
  try {
    const parsed = new URL(rawUrl);
    if (parsed.password) {
      parsed.password = "***";
    }
    if (parsed.username) {
      parsed.username = "***";
    }
    return parsed.toString();
  } catch {
    // If not a standard URL, mask characters between // and @
    return rawUrl.replace(/:\/\/([^@]+)@/, "://***:***@");
  }
}

/**
 * Initializes and returns the shared singleton ioredis client.
 * Non-blocking: will never prevent server startup if Redis is unreachable.
 */
export function getRedisClient(): Redis | null {
  if (redisInstance) {
    return redisInstance;
  }

  if (!redisConfig.enabled || !redisConfig.url) {
    connectionState = "disabled";
    return null;
  }

  const isTls = redisConfig.url.startsWith("rediss://");
  const options: RedisOptions = {
    connectTimeout: redisConfig.connectTimeoutMs,
    commandTimeout: redisConfig.commandTimeoutMs,
    enableOfflineQueue: false, // Fail fast to local fallbacks when disconnected
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy(times) {
      if (times > redisConfig.maxRetries) {
        return null; // Stop retrying; fail over cleanly to fallback
      }
      return Math.min(times * 200, 2000);
    },
    ...(isTls
      ? {
          tls: {
            rejectUnauthorized: process.env.REDIS_REJECT_UNAUTHORIZED === "true",
          },
        }
      : {}),
  };

  try {
    redisInstance = new Redis(redisConfig.url, options);
    connectionState = "connecting";

    redisInstance.on("connect", () => {
      connectionState = "connecting";
    });

    redisInstance.on("ready", () => {
      connectionState = "ready";
    });

    redisInstance.on("error", (err: any) => {
      connectionState = "error";
      // Sanitized error logging without connection string secrets
      const safeMessage = err?.message || "Unknown Redis error";
      console.warn(`[Redis] Connection warning: ${safeMessage}`);
    });

    redisInstance.on("close", () => {
      connectionState = "close";
    });

    redisInstance.on("reconnecting", () => {
      connectionState = "reconnecting";
    });

    // Initiate non-blocking connection
    connectingPromise = redisInstance.connect().then(() => {
      connectionState = "ready";
    }).catch((err) => {
      connectionState = "error";
      console.warn(`[Redis] Initial connect attempt failed (${err?.message || "unreachable"}). System falling back safely.`);
    });
  } catch (err: any) {
    connectionState = "error";
    console.warn(`[Redis] Initialization exception: ${err?.message || "failed"}`);
    redisInstance = null;
    connectingPromise = null;
  }

  return redisInstance;
}

/**
 * Non-blocking startup diagnostic and verification for Redis.
 * Executes PING to verify PONG response, outputs sanitized status (CONNECTED, DISABLED, FAILED),
 * and reports feature flags without logging credentials.
 * Ensures connection errors never crash the backend server or bypass protections.
 */
export async function initRedis(): Promise<RedisDiagnosticResult> {
  if (!redisConfig.enabled) {
    connectionState = "disabled";
    console.log("[Redis] Status: DISABLED (REDIS_ENABLED is false)");
    return {
      status: "DISABLED",
      sanitizedUrl: "",
      latencyMs: null,
      ping: null,
    };
  }

  if (!redisConfig.url) {
    connectionState = "disabled";
    console.log("[Redis] Status: DISABLED (REDIS_URL is not configured)");
    return {
      status: "DISABLED",
      sanitizedUrl: "",
      latencyMs: null,
      ping: null,
    };
  }

  const sanitizedUrl = sanitizeRedisUrl(redisConfig.url);

  try {
    const client = getRedisClient();
    if (!client) {
      connectionState = "disabled";
      console.log("[Redis] Status: DISABLED");
      return {
        status: "DISABLED",
        sanitizedUrl,
        latencyMs: null,
        ping: null,
      };
    }

    // Await connection readiness if not already ready
    if (client.status !== "ready") {
      await Promise.race([
        connectingPromise || Promise.resolve(),
        new Promise<void>((_, reject) =>
          setTimeout(
            () => reject(new Error(`Connection timeout after ${redisConfig.connectTimeoutMs}ms`)),
            redisConfig.connectTimeoutMs
          )
        ),
      ]);
    }

    if (client.status !== "ready") {
      throw new Error(`Client not ready (status: ${client.status})`);
    }

    // Execute Redis PING and verify PONG response
    const start = Date.now();
    const pongResponse = await Promise.race([
      client.ping(),
      new Promise<string>((_, reject) =>
        setTimeout(
          () => reject(new Error(`PING timeout after ${redisConfig.commandTimeoutMs}ms`)),
          redisConfig.commandTimeoutMs
        )
      ),
    ]);

    const latency = Date.now() - start;
    lastPingLatency = latency;

    if (pongResponse === "PONG") {
      connectionState = "ready";
      console.log("[Redis] Status: CONNECTED");
      console.log(`[Redis] Endpoint: ${sanitizedUrl} | Ping: ${pongResponse} | Latency: ${latency}ms`);
      console.log(`[Redis] Feature Flags: Cache=${redisConfig.cacheEnabled ? "ENABLED" : "DISABLED"}, RateLimit=${redisConfig.rateLimitEnabled ? "ENABLED" : "DISABLED"}`);
      return {
        status: "CONNECTED",
        sanitizedUrl,
        latencyMs: latency,
        ping: pongResponse,
      };
    } else {
      connectionState = "error";
      console.warn(`[Redis] Status: FAILED (Unexpected PING response: ${pongResponse})`);
      console.warn(`[Redis] Endpoint: ${sanitizedUrl}`);
      console.warn(`[Redis] System operating safely in local failover mode.`);
      return {
        status: "FAILED",
        sanitizedUrl,
        latencyMs: latency,
        ping: pongResponse,
        error: `Unexpected PING response: ${pongResponse}`,
      };
    }
  } catch (err: any) {
    connectionState = "error";
    const safeError = err?.message || "Connection failed";
    console.warn(`[Redis] Status: FAILED (${safeError})`);
    console.warn(`[Redis] Endpoint: ${sanitizedUrl}`);
    console.warn(`[Redis] System operating safely in local failover mode. Security protections and rate limits fall back to in-memory store.`);
    return {
      status: "FAILED",
      sanitizedUrl,
      latencyMs: null,
      ping: null,
      error: safeError,
    };
  }
}

/**
 * Checks whether Redis is connected and ready to process commands.
 */
export function isRedisReady(): boolean {
  if (!redisConfig.enabled || !redisInstance) return false;
  const status = (redisInstance as any).status;
  const isStatusReady = status ? status === "ready" : true;
  return connectionState === "ready" && isStatusReady;
}

/**
 * Returns whether distributed rate limiting should use Redis.
 */
export function isRedisRateLimitActive(): boolean {
  return redisConfig.rateLimitEnabled && isRedisReady();
}

/**
 * Returns whether Redis caching should be used.
 */
export function isRedisCacheActive(): boolean {
  return redisConfig.cacheEnabled && isRedisReady();
}

/**
 * Returns connection state.
 */
export function getRedisConnectionState(): RedisConnectionState {
  return connectionState;
}

/**
 * Retrieves comprehensive, sanitized Redis health and memory metrics for admin diagnostics.
 * Never exposes passwords, authorization tokens, or internal credentials.
 */
export async function getRedisHealth(): Promise<RedisHealthInfo> {
  const sanitized = sanitizeRedisUrl(redisConfig.url);
  const base: RedisHealthInfo = {
    enabled: redisConfig.enabled,
    cacheEnabled: redisConfig.cacheEnabled,
    rateLimitEnabled: redisConfig.rateLimitEnabled,
    state: connectionState,
    isReady: isRedisReady(),
    latencyMs: lastPingLatency,
    sanitizedUrl: sanitized,
  };

  if (!isRedisReady() || !redisInstance) {
    return base;
  }

  try {
    const start = Date.now();
    await redisInstance.ping();
    lastPingLatency = Date.now() - start;
    base.latencyMs = lastPingLatency;

    const infoMemory = await redisInstance.info("memory");
    const infoStats = await redisInstance.info("stats");
    const infoClients = await redisInstance.info("clients");
    const infoServer = await redisInstance.info("server");

    const parseInfo = (text: string) => {
      const result: Record<string, string> = {};
      for (const line of text.split("\r\n")) {
        if (line && !line.startsWith("#")) {
          const parts = line.split(":");
          if (parts.length >= 2) {
            result[parts[0].trim()] = parts.slice(1).join(":").trim();
          }
        }
      }
      return result;
    };

    const memParsed = parseInfo(infoMemory);
    const statsParsed = parseInfo(infoStats);
    const clientParsed = parseInfo(infoClients);
    const serverParsed = parseInfo(infoServer);

    base.memory = {
      usedMemoryHuman: memParsed["used_memory_human"],
      usedMemoryPeakHuman: memParsed["used_memory_peak_human"],
      totalSystemMemoryHuman: memParsed["total_system_memory_human"],
    };

    base.metrics = {
      totalConnectionsReceived: Number(statsParsed["total_connections_received"]) || 0,
      connectedClients: Number(clientParsed["connected_clients"]) || 0,
      uptimeInSeconds: Number(serverParsed["uptime_in_seconds"]) || 0,
      hits: Number(statsParsed["keyspace_hits"]) || 0,
      misses: Number(statsParsed["keyspace_misses"]) || 0,
    };
  } catch (err: any) {
    base.isReady = false;
    base.state = "error";
  }

  return base;
}

/**
 * Gracefully shuts down the Redis connection upon process termination.
 */
export async function closeRedis(): Promise<void> {
  if (redisInstance) {
    try {
      await redisInstance.quit();
    } catch {
      redisInstance.disconnect();
    } finally {
      redisInstance = null;
      connectingPromise = null;
      connectionState = redisConfig.enabled ? "close" : "disabled";
    }
  }
}

/**
 * Manually injects or overrides client instance (strictly for unit and mock testing).
 */
export function _setMockRedisClient(mock: Redis | null, state: RedisConnectionState = "ready"): void {
  if (redisInstance && redisInstance !== mock) {
    try {
      redisInstance.disconnect();
    } catch {}
  }
  redisInstance = mock;
  connectingPromise = null;
  connectionState = state;
}
