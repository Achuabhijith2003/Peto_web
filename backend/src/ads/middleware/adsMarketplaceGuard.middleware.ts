import { Request, Response, NextFunction } from "express";
import { AdControlsService } from "../adControls.service";

/**
 * Backend Authoritative Guard: Protects First-Party Peto Ads Marketplace
 * When marketplace is disabled, blocks access to campaign creation, ad modification,
 * advertiser billing deposits, and marketplace analytics with standard code ADS_MARKETPLACE_DISABLED.
 */
export async function requireAdsMarketplaceEnabled(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const controls = await AdControlsService.getControls();

    if (!AdControlsService.isMarketplaceEnabled(controls)) {
      res.status(403).json({
        success: false,
        code: "ADS_MARKETPLACE_DISABLED",
        error: "Peto Ads Marketplace is currently unavailable.",
        message:
          "Peto's first-party advertiser marketplace is temporarily disabled for this release. Existing campaigns and accounts remain preserved.",
      });
      return;
    }

    next();
  } catch (err: any) {
    res.status(500).json({
      success: false,
      code: "ADS_CONTROLS_ERROR",
      error: "Unable to evaluate advertising marketplace status.",
    });
  }
}
