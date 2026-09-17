import { supabase } from "../../config/supabase";

export interface ProviderHealthRecord {
  provider: string; // 'ADMOB', 'ADSENSE', 'AD_MANAGER'
  status: "HEALTHY" | "DEGRADED" | "UNHEALTHY" | "DISABLED";
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  timeout_requests: number;
  avg_latency_ms: number;
  last_success_at?: string | null;
  last_failure_at?: string | null;
  last_error_code?: string | null;
  last_error_message?: string | null;
  failure_rate_pct: number;
  timeout_rate_pct: number;
  updated_at: string;
}

const memoryHealthStore: Record<string, ProviderHealthRecord> = {
  ADMOB: {
    provider: "ADMOB",
    status: "HEALTHY",
    total_requests: 0,
    successful_requests: 0,
    failed_requests: 0,
    timeout_requests: 0,
    avg_latency_ms: 120,
    last_success_at: null,
    last_failure_at: null,
    last_error_code: null,
    last_error_message: null,
    failure_rate_pct: 0,
    timeout_rate_pct: 0,
    updated_at: new Date().toISOString(),
  },
  ADSENSE: {
    provider: "ADSENSE",
    status: "HEALTHY",
    total_requests: 0,
    successful_requests: 0,
    failed_requests: 0,
    timeout_requests: 0,
    avg_latency_ms: 95,
    last_success_at: null,
    last_failure_at: null,
    last_error_code: null,
    last_error_message: null,
    failure_rate_pct: 0,
    timeout_rate_pct: 0,
    updated_at: new Date().toISOString(),
  },
};

export class AdProviderHealthService {
  /**
   * Record telemetry event for provider call
   */
  static async recordProviderResult(
    provider: string,
    success: boolean,
    latencyMs: number,
    errorCode?: string,
    errorMessage?: string,
    isTimeout = false
  ): Promise<void> {
    const p = provider.toUpperCase();
    if (!memoryHealthStore[p]) {
      memoryHealthStore[p] = {
        provider: p,
        status: "HEALTHY",
        total_requests: 0,
        successful_requests: 0,
        failed_requests: 0,
        timeout_requests: 0,
        avg_latency_ms: 100,
        failure_rate_pct: 0,
        timeout_rate_pct: 0,
        updated_at: new Date().toISOString(),
      };
    }

    const rec = memoryHealthStore[p];
    rec.total_requests += 1;

    if (success) {
      rec.successful_requests += 1;
      rec.last_success_at = new Date().toISOString();
    } else {
      rec.failed_requests += 1;
      rec.last_failure_at = new Date().toISOString();
      rec.last_error_code = errorCode || "PROVIDER_REQUEST_FAILED";
      rec.last_error_message = errorMessage || (isTimeout ? "Network timeout" : "Call error");
      if (isTimeout) {
        rec.timeout_requests += 1;
      }
    }

    // Rolling exponential average latency
    rec.avg_latency_ms = Math.round(
      rec.avg_latency_ms * 0.9 + latencyMs * 0.1
    );

    // Compute failure & timeout percentages
    if (rec.total_requests > 0) {
      rec.failure_rate_pct = Number(
        ((rec.failed_requests / rec.total_requests) * 100).toFixed(1)
      );
      rec.timeout_rate_pct = Number(
        ((rec.timeout_requests / rec.total_requests) * 100).toFixed(1)
      );
    }

    // Evaluate health status dynamically
    if (rec.failure_rate_pct > 25 || rec.timeout_rate_pct > 15) {
      rec.status = "UNHEALTHY";
    } else if (rec.failure_rate_pct > 8 || rec.timeout_rate_pct > 5) {
      rec.status = "DEGRADED";
    } else {
      rec.status = "HEALTHY";
    }

    rec.updated_at = new Date().toISOString();

    // Persist async to db (best-effort non-blocking)
    if (rec.total_requests % 5 === 0) {
      try {
        await supabase.from("ad_provider_health").upsert({
          provider: p,
          status: rec.status,
          total_requests: rec.total_requests,
          successful_requests: rec.successful_requests,
          failed_requests: rec.failed_requests,
          timeout_requests: rec.timeout_requests,
          avg_latency_ms: rec.avg_latency_ms,
          last_success_at: rec.last_success_at,
          last_failure_at: rec.last_failure_at,
          last_error_code: rec.last_error_code,
          last_error_message: rec.last_error_message,
          updated_at: rec.updated_at,
        });
      } catch {}
    }
  }

  /**
   * Get all provider health records
   */
  static async getHealthReport(): Promise<ProviderHealthRecord[]> {
    try {
      const { data } = await supabase.from("ad_provider_health").select("*");
      if (data && data.length > 0) {
        data.forEach((row: any) => {
          const p = row.provider.toUpperCase();
          if (memoryHealthStore[p]) {
            memoryHealthStore[p] = {
              ...memoryHealthStore[p],
              ...row,
              failure_rate_pct:
                row.total_requests > 0
                  ? Number(((row.failed_requests / row.total_requests) * 100).toFixed(1))
                  : 0,
              timeout_rate_pct:
                row.total_requests > 0
                  ? Number(((row.timeout_requests / row.total_requests) * 100).toFixed(1))
                  : 0,
            };
          }
        });
      }
    } catch {}

    return Object.values(memoryHealthStore);
  }

  /**
   * Check if provider is currently healthy enough to receive traffic
   */
  static isProviderHealthy(provider: string): boolean {
    const p = provider.toUpperCase();
    const rec = memoryHealthStore[p];
    if (!rec) return true;
    return rec.status !== "DISABLED" && rec.status !== "UNHEALTHY";
  }
}
