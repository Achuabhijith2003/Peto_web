import { Router } from "express";
import { authenticate } from "../auth/auth.middleware";
import {
  getAdvertiserMeHandler,
  registerAdvertiserHandler,
  createAdvertiserCampaignHandler,
  getAdvertiserCampaignsHandler,
  updateAdvertiserCampaignStatusHandler,
  updateAdvertiserCampaignHandler,
  deleteAdvertiserCampaignHandler,
  getAdvertiserBillingHandler,
  depositAdvertiserFundsHandler,
  getAdvertiserAnalyticsHandler,
  getVerificationStatusHandler,
  getVerificationGuidelinesHandler,
  submitVerificationHandler,
  uploadVerificationDocumentHandler,
  getAdvertiserEligibilityHandler,
} from "./advertiser.controller";
import { uploadSecureDocumentMiddleware } from "../media/upload.middleware";
import { requireAdsMarketplaceEnabled } from "../ads/middleware/adsMarketplaceGuard.middleware";

const router = Router();

// All advertiser operations mandate active authentication
router.use(authenticate);

// Public check for advertiser eligibility (includes marketplace_enabled status)
router.get("/eligibility", getAdvertiserEligibilityHandler);

// Partner & Identity Verification (MUST REMAIN OPERATIONAL PLATFORM-WIDE)
router.get("/verification/status", getVerificationStatusHandler);
router.get("/verification/guidelines", getVerificationGuidelinesHandler);
router.post("/verification/submit", submitVerificationHandler);
router.post(
  "/verification/documents",
  uploadSecureDocumentMiddleware.single("document"),
  uploadVerificationDocumentHandler
);

// Protected First-Party Marketplace Operations (Guarded by peto_ads_marketplace_enabled)
router.get("/profile", requireAdsMarketplaceEnabled, getAdvertiserMeHandler);
router.get("/me", requireAdsMarketplaceEnabled, getAdvertiserMeHandler);
router.post("/register", requireAdsMarketplaceEnabled, registerAdvertiserHandler);

// Campaigns
router.get("/campaigns", requireAdsMarketplaceEnabled, getAdvertiserCampaignsHandler);
router.post("/campaigns", requireAdsMarketplaceEnabled, createAdvertiserCampaignHandler);
router.patch("/campaigns/:id/status", requireAdsMarketplaceEnabled, updateAdvertiserCampaignStatusHandler);
router.put("/campaigns/:id", requireAdsMarketplaceEnabled, updateAdvertiserCampaignHandler);
router.delete("/campaigns/:id", requireAdsMarketplaceEnabled, deleteAdvertiserCampaignHandler);

// Financials & Reporting
router.get("/billing", requireAdsMarketplaceEnabled, getAdvertiserBillingHandler);
router.post("/billing/deposit", requireAdsMarketplaceEnabled, depositAdvertiserFundsHandler);
router.get("/analytics", requireAdsMarketplaceEnabled, getAdvertiserAnalyticsHandler);

export default router;
