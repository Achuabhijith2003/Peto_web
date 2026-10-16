export interface RedisConfig {
  readonly url: string;
  readonly enabled: boolean;
  readonly cacheEnabled: boolean;
  readonly rateLimitEnabled: boolean;
  readonly connectTimeoutMs: number;
  readonly commandTimeoutMs: number;
  readonly maxRetries: number;
}

function parseBool(val: string | undefined, defaultVal = false): boolean {
  if (!val) return defaultVal;
  const clean = val.trim().toLowerCase();
  return clean === "true" || clean === "1" || clean === "yes";
}

export const redisConfig: RedisConfig = {
  get url() {
    return process.env.REDIS_URL?.trim() || "";
  },
  get enabled() {
    return parseBool(process.env.REDIS_ENABLED, false);
  },
  get cacheEnabled() {
    return parseBool(process.env.REDIS_CACHE_ENABLED, false);
  },
  get rateLimitEnabled() {
    return parseBool(process.env.REDIS_RATE_LIMIT_ENABLED, false);
  },
  get connectTimeoutMs() {
    return Math.max(1000, Number(process.env.REDIS_CONNECT_TIMEOUT_MS) || 4000);
  },
  get commandTimeoutMs() {
    return Math.max(500, Number(process.env.REDIS_COMMAND_TIMEOUT_MS) || 2000);
  },
  get maxRetries() {
    return Math.max(1, Math.min(10, Number(process.env.REDIS_MAX_RETRIES) || 3));
  },
};

export const isTrustProxyConfigured = (): boolean => {
  return parseBool(process.env.TRUST_PROXY, false);
};
