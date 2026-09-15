import { Request, Response } from "express";
import { AdvertiserService } from "./advertiser.service";

/**
 * GET /api/advertisers/me
 */
export async function getAdvertiserMeHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }
    const advertiser = await AdvertiserService.getAdvertiserByUserId(userId);
    if (!advertiser) {
      res.json({ success: true, registered: false, advertiser: null });
      return;
    }
    res.json({ success: true, registered: true, ...advertiser, advertiser });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

export async function registerAdvertiserHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "Unauthorized", error: "Unauthorized" });
      return;
    }
    const result = await AdvertiserService.registerAdvertiser(userId, req.body);
    res.status(201).json({
      success: true,
      message: "Advertiser account registered successfully.",
      advertiser: result,
      ...result,
    });
  } catch (err: any) {
    res.status(err.status || 400).json({
      success: false,
      message: err.message || "Failed to register advertiser account",
      error: err.message,
    });
  }
}

/**
 * POST /api/advertisers/campaigns
 */
export async function createAdvertiserCampaignHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const result = await AdvertiserService.createCampaign(userId, req.body);
    res.status(201).json({
      success: true,
      message: "Campaign submitted successfully. It is now in queue for Peto review.",
      ...result,
    });
  } catch (err: any) {
    res.status(err.status || 400).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/advertisers/campaigns
 */
export async function getAdvertiserCampaignsHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const campaigns = await AdvertiserService.getCampaigns(userId);
    res.json({ success: true, count: campaigns.length, campaigns });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * PATCH /api/advertisers/campaigns/:id/status
 */
export async function updateAdvertiserCampaignStatusHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const campaignId = req.params.id as string;
    const { status } = req.body;

    const result = await AdvertiserService.updateCampaignStatus(userId, campaignId, status);
    res.json({ success: true, campaign: result });
  } catch (err: any) {
    res.status(err.status || 400).json({ success: false, error: err.message });
  }
}

/**
 * PUT /api/advertisers/campaigns/:id
 */
export async function updateAdvertiserCampaignHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const campaignId = req.params.id as string;
    const result = await AdvertiserService.updateCampaign(userId, campaignId, req.body);
    res.json({ success: true, campaign: result });
  } catch (err: any) {
    res.status(err.status || 400).json({ success: false, error: err.message });
  }
}

/**
 * DELETE /api/advertisers/campaigns/:id
 */
export async function deleteAdvertiserCampaignHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const campaignId = req.params.id as string;
    const result = await AdvertiserService.deleteCampaign(userId, campaignId);
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 400).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/advertisers/billing
 */
export async function getAdvertiserBillingHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const summary = await AdvertiserService.getBillingSummary(userId);
    res.json({ success: true, ...summary });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/advertisers/analytics
 */
export async function getAdvertiserAnalyticsHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const { timeframe } = req.query;
    const analytics = await AdvertiserService.getAnalytics(userId, timeframe as any);
    res.json({ success: true, analytics });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

// ============================================================
// VERIFICATION HANDLERS
// ============================================================

import { AdvertiserVerificationService } from "./verification/verification.service";

/**
 * GET /api/advertisers/verification/status
 */
export async function getVerificationStatusHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const status = await AdvertiserVerificationService.getVerificationStatus(userId);
    res.json({
      success: true,
      has_application: !!status,
      application: status,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/advertisers/verification/guidelines
 */
export async function getVerificationGuidelinesHandler(req: Request, res: Response): Promise<void> {
  try {
    const country = (req.query.country as string) || (req.headers["cf-ipcountry"] as string) || "GLOBAL";
    const guidelines = await AdvertiserVerificationService.getGuidelines(country);
    res.json({ success: true, guidelines });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/advertisers/verification/submit
 */
export async function submitVerificationHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const result = await AdvertiserVerificationService.submitApplication(userId, req.body);
    res.status(201).json({
      success: true,
      message: "Verification application submitted successfully. It is now under compliance review.",
      application: result,
    });
  } catch (err: any) {
    res.status(err.status || 400).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/advertisers/verification/documents
 */
export async function uploadVerificationDocumentHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    const file = req.file;

    if (!file) {
      res.status(400).json({ success: false, error: "Document file is required." });
      return;
    }

    const { applicationId, documentType, documentNumber, countryCode, isFront } = req.body;
    if (!applicationId || !documentType) {
      res.status(400).json({
        success: false,
        error: "Missing required metadata: applicationId and documentType are required.",
      });
      return;
    }

    const doc = await AdvertiserVerificationService.uploadDocument(
      userId,
      applicationId,
      file.buffer,
      file.originalname,
      file.mimetype,
      documentType,
      documentNumber,
      countryCode,
      isFront === "true" || isFront === true
    );

    res.status(201).json({
      success: true,
      message: "Document securely uploaded and encrypted for compliance inspection.",
      document: doc,
    });
  } catch (err: any) {
    res.status(err.status || 400).json({ success: false, error: err.message });
  }
}

