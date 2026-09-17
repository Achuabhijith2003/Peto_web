import { Request, Response } from "express";
import { AdControlsService } from "../../ads/adControls.service";
import { AdProviderHealthService } from "../../ads/external/adProviderHealth.service";
import { supabase } from "../../config/supabase";

/**
 * GET /api/admin/ads/control-center
 * Get unified control center status, kill switches, and provider health
 */
export async function getAdControlCenterHandler(req: Request, res: Response): Promise<void> {
  try {
    const controls = await AdControlsService.getControls();
    const health = await AdProviderHealthService.getHealthReport();

    res.json({
      success: true,
      controls,
      providerHealth: health,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * PATCH /api/admin/ads/control-center
 * Update kill switches & granular toggles
 */
export async function updateAdControlCenterHandler(req: Request, res: Response): Promise<void> {
  try {
    const adminId = (req as any).admin?.id;
    const { updates, reason } = req.body;

    if (!updates || typeof updates !== "object") {
      res.status(400).json({ success: false, error: "Missing updates object" });
      return;
    }

    const updated = await AdControlsService.updateControls(updates, adminId, reason);
    res.json({
      success: true,
      controls: updated,
      message: "Ad system controls successfully updated",
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/admin/ads/control-center/emergency-stop
 * Trigger Emergency Ads Kill Switch
 */
export async function emergencyStopHandler(req: Request, res: Response): Promise<void> {
  try {
    const adminId = (req as any).admin?.id;
    const { scope, reason } = req.body;

    if (!scope || !["ALL", "INTERNAL", "EXTERNAL"].includes(scope)) {
      res.status(400).json({
        success: false,
        error: "Scope must be one of: ALL, INTERNAL, EXTERNAL",
      });
      return;
    }

    if (!reason || String(reason).trim().length < 5) {
      res.status(400).json({
        success: false,
        error: "A valid operational reason (min 5 characters) is mandatory for emergency stop",
      });
      return;
    }

    const updated = await AdControlsService.executeEmergencyStop(scope, reason, adminId);
    res.json({
      success: true,
      controls: updated,
      message: `Emergency stop initiated for ${scope} advertising`,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/admin/ads/provider-health
 * Get real-time provider health metrics & latency
 */
export async function getProviderHealthHandler(req: Request, res: Response): Promise<void> {
  try {
    const health = await AdProviderHealthService.getHealthReport();
    res.json({
      success: true,
      providers: health,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/admin/ads/providers
 * Get provider configuration registry
 */
export async function getAdProvidersHandler(req: Request, res: Response): Promise<void> {
  try {
    const { data, error } = await supabase
      .from("ad_provider_configs")
      .select("*")
      .order("provider");

    if (error) {
      // Fallback
      res.json({ success: true, configs: [] });
      return;
    }

    res.json({ success: true, configs: data || [] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * PATCH /api/admin/ads/providers/:id
 * Update individual provider ad unit / floor CPM
 */
export async function updateAdProviderHandler(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { is_enabled, is_test_mode, floor_cpm, ad_unit_id, app_id } = req.body;

    const payload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (typeof is_enabled === "boolean") payload.is_enabled = is_enabled;
    if (typeof is_test_mode === "boolean") payload.is_test_mode = is_test_mode;
    if (floor_cpm !== undefined) payload.floor_cpm = Number(floor_cpm);
    if (ad_unit_id) payload.ad_unit_id = ad_unit_id;
    if (app_id) payload.app_id = app_id;

    const { data, error } = await supabase
      .from("ad_provider_configs")
      .update(payload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }

    res.json({ success: true, config: data });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/admin/ads/analytics/external
 * External Network Ad Analytics (AdMob, AdSense)
 */
export async function getExternalAdsAnalyticsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { days = 30, provider } = req.query;
    const numDays = parseInt(String(days), 10) || 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - numDays);
    const dateStr = cutoffDate.toISOString().split("T")[0];

    let query = supabase
      .from("ad_external_analytics_daily")
      .select("*")
      .gte("date", dateStr)
      .order("date", { ascending: false });

    if (provider && provider !== "ALL") {
      query = query.eq("provider", String(provider).toUpperCase());
    }

    const { data } = await query;
    const rows = data || [];

    // Aggregate totals
    const totals = rows.reduce(
      (acc, r) => {
        acc.requests += Number(r.requests || 0);
        acc.filled += Number(r.filled || 0);
        acc.impressions += Number(r.impressions || 0);
        acc.clicks += Number(r.clicks || 0);
        acc.errors += Number(r.errors || 0);
        acc.timeouts += Number(r.timeouts || 0);
        acc.fallbacks += Number(r.fallbacks || 0);
        acc.revenue_usd += Number(r.revenue_usd || 0);
        return acc;
      },
      {
        requests: 0,
        filled: 0,
        impressions: 0,
        clicks: 0,
        errors: 0,
        timeouts: 0,
        fallbacks: 0,
        revenue_usd: 0,
      }
    );

    const fillRate =
      totals.requests > 0 ? Number(((totals.filled / totals.requests) * 100).toFixed(2)) : 0;
    const ctr =
      totals.impressions > 0 ? Number(((totals.clicks / totals.impressions) * 100).toFixed(2)) : 0;
    const ecpm =
      totals.impressions > 0
        ? Number(((totals.revenue_usd / totals.impressions) * 1000).toFixed(2))
        : 0;

    res.json({
      success: true,
      timeframe: `${numDays}d`,
      totals: {
        ...totals,
        fillRate,
        ctr,
        ecpm,
      },
      dailyTrends: rows,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/admin/ads/analytics/combined
 * Unified Internal vs External Side-by-Side Comparison
 */
export async function getCombinedAdsAnalyticsHandler(req: Request, res: Response): Promise<void> {
  try {
    // 1. Internal metrics
    const { data: internalRows } = await supabase
      .from("ad_analytics_daily")
      .select("impressions, clicks, spend, conversions");

    const internalTotals = (internalRows || []).reduce(
      (acc, r) => {
        acc.impressions += Number(r.impressions || 0);
        acc.clicks += Number(r.clicks || 0);
        acc.conversions += Number(r.conversions || 0);
        acc.advertiserSpend += Number(r.spend || 0);
        return acc;
      },
      { impressions: 0, clicks: 0, conversions: 0, advertiserSpend: 0 }
    );

    const internalCtr =
      internalTotals.impressions > 0
        ? Number(((internalTotals.clicks / internalTotals.impressions) * 100).toFixed(2))
        : 0;

    // 2. External metrics
    const { data: externalRows } = await supabase
      .from("ad_external_analytics_daily")
      .select("requests, filled, impressions, clicks, revenue_usd");

    const externalTotals = (externalRows || []).reduce(
      (acc, r) => {
        acc.requests += Number(r.requests || 0);
        acc.filled += Number(r.filled || 0);
        acc.impressions += Number(r.impressions || 0);
        acc.clicks += Number(r.clicks || 0);
        acc.externalRevenue += Number(r.revenue_usd || 0);
        return acc;
      },
      { requests: 0, filled: 0, impressions: 0, clicks: 0, externalRevenue: 0 }
    );

    const externalCtr =
      externalTotals.impressions > 0
        ? Number(((externalTotals.clicks / externalTotals.impressions) * 100).toFixed(2))
        : 0;
    const externalFillRate =
      externalTotals.requests > 0
        ? Number(((externalTotals.filled / externalTotals.requests) * 100).toFixed(2))
        : 0;

    // 3. Combined presentation (strictly keeping spend and revenue separate)
    res.json({
      success: true,
      comparison: {
        internal: {
          label: "Peto Internal Marketplace",
          impressions: internalTotals.impressions,
          clicks: internalTotals.clicks,
          ctr: internalCtr,
          conversions: internalTotals.conversions,
          advertiserSpend: internalTotals.advertiserSpend,
          revenueType: "Advertiser Pre-funded Wallet Spend",
        },
        external: {
          label: "External Ad Networks (AdMob & Web Ads)",
          requests: externalTotals.requests,
          filled: externalTotals.filled,
          fillRate: externalFillRate,
          impressions: externalTotals.impressions,
          clicks: externalTotals.clicks,
          ctr: externalCtr,
          networkRevenue: externalTotals.externalRevenue,
          revenueType: "Third-Party Ad Network Payout",
        },
        total: {
          impressions: internalTotals.impressions + externalTotals.impressions,
          clicks: internalTotals.clicks + externalTotals.clicks,
          combinedCtr:
            internalTotals.impressions + externalTotals.impressions > 0
              ? Number(
                  (
                    ((internalTotals.clicks + externalTotals.clicks) /
                      (internalTotals.impressions + externalTotals.impressions)) *
                    100
                  ).toFixed(2)
                )
              : 0,
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}
