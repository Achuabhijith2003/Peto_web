import { supabase } from "../config/supabase";

export interface LogAdEventInput {
  eventType:
    | "AD_REQUEST"
    | "AD_REQUEST_SUCCESS"
    | "AD_REQUEST_FAILED"
    | "AD_LOADED"
    | "AD_SHOWN"
    | "AD_IMPRESSION"
    | "AD_CLICK"
    | "AD_DISMISSED"
    | "AD_ERROR"
    | "AD_TIMEOUT"
    | "AD_FALLBACK";
  adSource: "PETO" | "EXTERNAL";
  provider?: string;
  campaignId?: string;
  creativeId?: string;
  placement?: string;
  platform?: "WEB" | "ANDROID" | "IOS";
  country?: string;
  region?: string;
  userId?: string;
  sessionId?: string;
  errorCode?: string;
  latencyMs?: number;
  metadata?: Record<string, any>;
}

export class AdEventTrackerService {
  /**
   * Log an ad lifecycle event asynchronously (non-blocking)
   */
  static async logEvent(input: LogAdEventInput): Promise<void> {
    const payload = {
      event_type: input.eventType,
      ad_source: input.adSource,
      provider: input.provider || (input.adSource === "PETO" ? "PETO_INTERNAL" : "UNKNOWN"),
      campaign_id: input.campaignId || null,
      creative_id: input.creativeId || null,
      placement: input.placement || "FEED",
      platform: input.platform || "WEB",
      country: input.country || "GLOBAL",
      region: input.region || null,
      user_id: input.userId || null,
      session_id: input.sessionId || null,
      error_code: input.errorCode || null,
      latency_ms: input.latencyMs || null,
      metadata: input.metadata || {},
    };

    try {
      await supabase.from("ad_events").insert(payload);
    } catch {
      // Best-effort non-blocking telemetry
    }

    // If external ad event, update daily aggregation
    if (input.adSource === "EXTERNAL" && input.provider) {
      this.updateExternalDailyAggregation(input).catch(() => {});
    }
  }

  /**
   * Increment daily counters for external provider analytics
   */
  private static async updateExternalDailyAggregation(input: LogAdEventInput): Promise<void> {
    const today = new Date().toISOString().split("T")[0];
    const provider = (input.provider || "ADMOB").toUpperCase();
    const platform = input.platform || "WEB";
    const placement = input.placement || "FEED";
    const country = input.country || "GLOBAL";

    try {
      // Fetch or initialize record
      const { data: existing } = await supabase
        .from("ad_external_analytics_daily")
        .select("*")
        .eq("provider", provider)
        .eq("platform", platform)
        .eq("placement", placement)
        .eq("country", country)
        .eq("date", today)
        .maybeSingle();

      const requests = (existing?.requests || 0) + (input.eventType === "AD_REQUEST" ? 1 : 0);
      const filled = (existing?.filled || 0) + (input.eventType === "AD_REQUEST_SUCCESS" ? 1 : 0);
      const impressions = (existing?.impressions || 0) + (input.eventType === "AD_IMPRESSION" ? 1 : 0);
      const clicks = (existing?.clicks || 0) + (input.eventType === "AD_CLICK" ? 1 : 0);
      const errors = (existing?.errors || 0) + (input.eventType === "AD_ERROR" ? 1 : 0);
      const timeouts = (existing?.timeouts || 0) + (input.eventType === "AD_TIMEOUT" ? 1 : 0);
      const fallbacks = (existing?.fallbacks || 0) + (input.eventType === "AD_FALLBACK" ? 1 : 0);

      await supabase.from("ad_external_analytics_daily").upsert({
        provider,
        platform,
        placement,
        country,
        date: today,
        requests,
        filled,
        impressions,
        clicks,
        errors,
        timeouts,
        fallbacks,
        updated_at: new Date().toISOString(),
      });
    } catch {}
  }
}
