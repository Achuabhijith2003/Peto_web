import { supabase } from "../config/supabase";
import { createAuditLog } from "../admin/services/adminAudit.service";

export interface AdSystemControls {
  id: string;
  all_ads_enabled: boolean;
  internal_ads_enabled: boolean;
  peto_ads_marketplace_enabled: boolean;
  external_ads_enabled: boolean;
  google_adsense_enabled: boolean;
  google_admob_enabled: boolean;
  admob_enabled: boolean;
  web_ads_enabled: boolean;
  web_enabled: boolean;
  android_enabled: boolean;
  ios_enabled: boolean;
  feed_enabled: boolean;
  reels_enabled: boolean;
  community_enabled: boolean;
  explore_enabled: boolean;
  emergency_stop_active: boolean;
  emergency_stop_scope: "ALL" | "INTERNAL" | "EXTERNAL" | "NONE";
  emergency_stop_reason?: string | null;
  emergency_stop_by?: string | null;
  emergency_stop_at?: string | null;
  ad_environment: "DEVELOPMENT" | "STAGING" | "PRODUCTION";
  updated_by?: string | null;
  updated_at: string;
}

export const DEFAULT_AD_CONTROLS: AdSystemControls = {
  id: "GLOBAL_CONTROLS",
  all_ads_enabled: true,
  internal_ads_enabled: false,
  peto_ads_marketplace_enabled: false,
  external_ads_enabled: true,
  google_adsense_enabled: true,
  google_admob_enabled: true,
  admob_enabled: true,
  web_ads_enabled: true,
  web_enabled: true,
  android_enabled: true,
  ios_enabled: true,
  feed_enabled: true,
  reels_enabled: true,
  community_enabled: true,
  explore_enabled: true,
  emergency_stop_active: false,
  emergency_stop_scope: "NONE",
  emergency_stop_reason: null,
  emergency_stop_by: null,
  emergency_stop_at: null,
  ad_environment: (process.env.AD_ENVIRONMENT as any) || "DEVELOPMENT",
  updated_at: new Date().toISOString(),
};

// Low-latency in-memory cache
let cachedControls: AdSystemControls = { ...DEFAULT_AD_CONTROLS };
let lastFetchTime = 0;
const CACHE_TTL_MS = 15 * 1000; // 15 seconds TTL for low latency

export class AdControlsService {
  /**
   * Retrieve active system controls with resilient fallback
   */
  static async getControls(): Promise<AdSystemControls> {
    const now = Date.now();
    if (now - lastFetchTime < CACHE_TTL_MS) {
      return cachedControls;
    }

    try {
      const { data, error } = await supabase
        .from("ad_system_controls")
        .select("*")
        .eq("id", "GLOBAL_CONTROLS")
        .maybeSingle();

      if (!error && data) {
        cachedControls = {
          ...DEFAULT_AD_CONTROLS,
          ...data,
        };
        lastFetchTime = now;
        return cachedControls;
      }
    } catch {
      // Fall through to cached / defaults on cold start or network error
    }

    return cachedControls;
  }

  /**
   * Update system control toggles with auditing
   */
  static async updateControls(
    updates: Partial<AdSystemControls>,
    adminId?: string,
    reason?: string
  ): Promise<AdSystemControls> {
    const prev = await this.getControls();

    // Synchronize aliases so marketplace and external flags are completely consistent
    if (updates.peto_ads_marketplace_enabled !== undefined && updates.internal_ads_enabled === undefined) {
      updates.internal_ads_enabled = updates.peto_ads_marketplace_enabled;
    } else if (updates.internal_ads_enabled !== undefined && updates.peto_ads_marketplace_enabled === undefined) {
      updates.peto_ads_marketplace_enabled = updates.internal_ads_enabled;
    }

    if (updates.google_adsense_enabled !== undefined && updates.web_ads_enabled === undefined) {
      updates.web_ads_enabled = updates.google_adsense_enabled;
    } else if (updates.web_ads_enabled !== undefined && updates.google_adsense_enabled === undefined) {
      updates.google_adsense_enabled = updates.web_ads_enabled;
    }

    if (updates.google_admob_enabled !== undefined && updates.admob_enabled === undefined) {
      updates.admob_enabled = updates.google_admob_enabled;
    } else if (updates.admob_enabled !== undefined && updates.google_admob_enabled === undefined) {
      updates.google_admob_enabled = updates.admob_enabled;
    }

    const payload = {
      ...updates,
      updated_by: adminId || null,
      updated_at: new Date().toISOString(),
    };

    // If emergency stop is toggled off, reset scope and reason
    if (updates.emergency_stop_active === false) {
      payload.emergency_stop_scope = "NONE";
      payload.emergency_stop_reason = null;
      payload.emergency_stop_by = null;
      payload.emergency_stop_at = null;
    }

    try {
      const { data, error } = await supabase
        .from("ad_system_controls")
        .upsert({ id: "GLOBAL_CONTROLS", ...payload })
        .select()
        .single();

      if (!error && data) {
        cachedControls = { ...cachedControls, ...data };
      } else {
        cachedControls = { ...cachedControls, ...payload };
      }
    } catch {
      cachedControls = { ...cachedControls, ...payload };
    }

    lastFetchTime = Date.now();

    // Log admin audit trail with specific action names
    if (adminId) {
      try {
        let action = "AD_SYSTEM_CONTROLS_UPDATED";
        if (updates.emergency_stop_active) {
          action = "EMERGENCY_ADS_STOP_TRIGGERED";
        } else if (updates.peto_ads_marketplace_enabled !== undefined || updates.internal_ads_enabled !== undefined) {
          const isEnabled = updates.peto_ads_marketplace_enabled ?? updates.internal_ads_enabled;
          action = isEnabled ? "PETO_ADS_MARKETPLACE_ENABLED" : "PETO_ADS_MARKETPLACE_DISABLED";
        } else if (updates.google_adsense_enabled !== undefined || updates.web_ads_enabled !== undefined) {
          const isEnabled = updates.google_adsense_enabled ?? updates.web_ads_enabled;
          action = isEnabled ? "GOOGLE_ADSENSE_ENABLED" : "GOOGLE_ADSENSE_DISABLED";
        } else if (updates.google_admob_enabled !== undefined || updates.admob_enabled !== undefined) {
          const isEnabled = updates.google_admob_enabled ?? updates.admob_enabled;
          action = isEnabled ? "GOOGLE_ADMOB_ENABLED" : "GOOGLE_ADMOB_DISABLED";
        }

        await createAuditLog({
          adminId,
          action,
          resourceType: "AD_SYSTEM_CONTROLS",
          resourceId: "GLOBAL_CONTROLS",
          details: {
            previous: prev,
            updates,
            reason: reason || "Admin configuration update",
          },
        });
      } catch {}
    }

    return cachedControls;
  }

  /**
   * Evaluates if Peto First-Party Ads Marketplace is actively enabled
   */
  static isMarketplaceEnabled(controls: AdSystemControls): boolean {
    if (!controls.all_ads_enabled || controls.emergency_stop_active) {
      if (controls.emergency_stop_scope === "ALL" || controls.emergency_stop_scope === "INTERNAL") {
        return false;
      }
    }
    const enabled = controls.peto_ads_marketplace_enabled ?? controls.internal_ads_enabled;
    return Boolean(enabled);
  }

  /**
   * Execute emergency kill switch
   */
  static async executeEmergencyStop(
    scope: "ALL" | "INTERNAL" | "EXTERNAL",
    reason: string,
    adminId?: string
  ): Promise<AdSystemControls> {
    const updates: Partial<AdSystemControls> = {
      emergency_stop_active: true,
      emergency_stop_scope: scope,
      emergency_stop_reason: reason,
      emergency_stop_by: adminId || null,
      emergency_stop_at: new Date().toISOString(),
    };

    if (scope === "ALL") {
      updates.all_ads_enabled = false;
    } else if (scope === "INTERNAL") {
      updates.internal_ads_enabled = false;
      updates.peto_ads_marketplace_enabled = false;
    } else if (scope === "EXTERNAL") {
      updates.external_ads_enabled = false;
    }

    return this.updateControls(updates, adminId, `Emergency Stop: ${reason}`);
  }

  /**
   * Fast evaluation for whether an ad source can serve
   */
  static isSourceEligible(
    source: "PETO" | "EXTERNAL",
    controls: AdSystemControls
  ): boolean {
    if (!controls.all_ads_enabled || controls.emergency_stop_active) {
      if (controls.emergency_stop_scope === "ALL") return false;
      if (controls.emergency_stop_scope === source) return false;
    }

    if (source === "PETO") {
      return this.isMarketplaceEnabled(controls);
    }

    if (source === "EXTERNAL") {
      return controls.external_ads_enabled;
    }

    return false;
  }

  /**
   * Evaluate if a placement is enabled
   */
  static isPlacementEligible(placement: string, controls: AdSystemControls): boolean {
    switch (placement.toUpperCase()) {
      case "FEED":
        return controls.feed_enabled;
      case "REELS":
        return controls.reels_enabled;
      case "COMMUNITY_FEED":
      case "COMMUNITIES":
        return controls.community_enabled;
      case "EXPLORE":
        return controls.explore_enabled;
      default:
        return true;
    }
  }

  /**
   * Evaluate if a platform is enabled
   */
  static isPlatformEligible(platform: string, controls: AdSystemControls): boolean {
    switch (platform.toUpperCase()) {
      case "WEB":
        return controls.web_enabled;
      case "ANDROID":
        return controls.android_enabled;
      case "IOS":
        return controls.ios_enabled;
      default:
        return true;
    }
  }
}
