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
} from "./advertiser.controller";
import { uploadSecureDocumentMiddleware } from "../media/upload.middleware";

const router = Router();

// All advertiser operations mandate active authentication
router.use(authenticate);

router.get("/profile", getAdvertiserMeHandler);
router.get("/me", getAdvertiserMeHandler);
router.post("/register", registerAdvertiserHandler);

// Partner & Identity Verification
router.get("/verification/status", getVerificationStatusHandler);
router.get("/verification/guidelines", getVerificationGuidelinesHandler);
router.post("/verification/submit", submitVerificationHandler);
router.post(
  "/verification/documents",
  uploadSecureDocumentMiddleware.single("document"),
  uploadVerificationDocumentHandler
);

// Campaigns
router.get("/campaigns", getAdvertiserCampaignsHandler);
router.post("/campaigns", createAdvertiserCampaignHandler);
router.patch("/campaigns/:id/status", updateAdvertiserCampaignStatusHandler);
router.put("/campaigns/:id", updateAdvertiserCampaignHandler);
router.delete("/campaigns/:id", deleteAdvertiserCampaignHandler);

// Financials & Reporting
router.get("/billing", getAdvertiserBillingHandler);
router.post("/billing/deposit", depositAdvertiserFundsHandler);
router.get("/analytics", getAdvertiserAnalyticsHandler);

export default router;
