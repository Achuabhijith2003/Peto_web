import { Request, Response } from "express";
import { AdminRequest } from "../admin/middleware/adminAuth.middleware";
import {
  resolveCountryFromRequest,
  getRegionalConfig,
  getAllRegionalConfigs,
  updateRegionalConfigService,
} from "./regional.service";

/**
 * Public endpoint: Returns the regional configuration for the current caller's location
 * GET /api/regions/current
 */
export async function getPublicCurrentRegionHandler(req: Request, res: Response): Promise<void> {
  try {
    const country = resolveCountryFromRequest(req);
    const config = await getRegionalConfig(country);

    // Return client-safe configuration
    res.json({
      success: true,
      detected_country: country,
      config: {
        code: config.code,
        name: config.name,
        continent: config.continent,
        ads_enabled: config.ads_enabled,
        advertiser_registration_enabled: config.advertiser_registration_enabled,
        payments_enabled: config.payments_enabled,
        creator_monetization_enabled: config.creator_monetization_enabled,
        communities_enabled: config.communities_enabled,
        reels_enabled: config.reels_enabled,
        supported_currencies: config.supported_currencies,
        default_currency: config.default_currency,
        supported_payment_providers: config.supported_payment_providers,
        default_payment_provider: config.default_payment_provider,
        allowed_ad_categories: config.allowed_ad_categories,
        external_ad_networks: config.external_ad_networks,
        policy_references: config.policy_references,
      },
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: "Failed to resolve regional configuration.",
    });
  }
}

/**
 * Public endpoint: Returns the catalog of supported countries and currencies
 * GET /api/regions/list
 */
export async function getPublicRegionListHandler(req: Request, res: Response): Promise<void> {
  try {
    const configs = await getAllRegionalConfigs();
    const publicList = configs.map((c) => ({
      code: c.code,
      name: c.name,
      continent: c.continent,
      ads_enabled: c.ads_enabled,
      payments_enabled: c.payments_enabled,
      advertiser_registration_enabled: c.advertiser_registration_enabled,
      supported_currencies: c.supported_currencies,
      default_currency: c.default_currency,
    }));

    res.json({
      success: true,
      regions: publicList,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: "Failed to fetch region list.",
    });
  }
}

/**
 * Admin endpoint: Returns all regional configs with full settings
 * GET /api/admin/regions
 */
export async function getAdminRegionsHandler(req: AdminRequest, res: Response): Promise<void> {
  try {
    const configs = await getAllRegionalConfigs();
    res.json({
      success: true,
      regions: configs,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: "Failed to retrieve administrative regional configurations.",
    });
  }
}

/**
 * Admin endpoint: Update region toggles (ads_enabled, payments_enabled, etc.)
 * PATCH /api/admin/regions/:code
 */
export async function updateAdminRegionHandler(req: AdminRequest, res: Response): Promise<void> {
  try {
    const code = req.params.code as string;
    const adminId = req.admin?.id || req.admin?.userId;

    const updated = await updateRegionalConfigService(code, req.body, adminId, req);

    res.json({
      success: true,
      message: `Regional settings for ${code.toUpperCase()} updated successfully.`,
      region: updated,
    });
  } catch (err: any) {
    res.status(err.status || 400).json({
      success: false,
      error: err.message || "Failed to update regional configuration.",
    });
  }
}
