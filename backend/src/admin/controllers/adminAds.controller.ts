import { Response } from "express";
import { AdminRequest } from "../middleware/adminAuth.middleware";
import {
  getAdvertisersService,
  getAdvertiserDetailService,
  createAdvertiserService,
  updateAdvertiserStatusService,
  getCampaignsService,
  getCampaignDetailService,
  createCampaignService,
  updateCampaignStatusService,
  getPendingReviewQueueService,
  reviewCampaignActionService,
  reviewCreativeActionService,
  getAdsAnalyticsSummaryService,
} from "../services/adminAds.service";

// ============================================================
// ADVERTISERS CONTROLLERS
// ============================================================

export async function getAdvertisersHandler(req: AdminRequest, res: Response): Promise<void> {
  try {
    const { status, search, page, limit } = req.query;
    const result = await getAdvertisersService({
      status: status as string,
      search: search as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || "Failed to fetch advertisers." });
  }
}

export async function getAdvertiserDetailHandler(req: AdminRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const result = await getAdvertiserDetailService(id);
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || "Failed to fetch advertiser." });
  }
}

export async function createAdvertiserHandler(req: AdminRequest, res: Response): Promise<void> {
  try {
    const adminId = req.admin?.id || req.admin?.userId;
    const result = await createAdvertiserService(req.body, adminId);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(err.status || 400).json({ error: err.message || "Failed to create advertiser." });
  }
}

export async function updateAdvertiserStatusHandler(req: AdminRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { status } = req.body;
    const adminId = req.admin?.id || req.admin?.userId;
    const result = await updateAdvertiserStatusService(id, status, adminId);
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 400).json({ error: err.message || "Failed to update advertiser status." });
  }
}

// ============================================================
// CAMPAIGNS CONTROLLERS
// ============================================================

export async function getCampaignsHandler(req: AdminRequest, res: Response): Promise<void> {
  try {
    const { status, objective, advertiserId, search, page, limit } = req.query;
    const result = await getCampaignsService({
      status: status as string,
      objective: objective as string,
      advertiserId: advertiserId as string,
      search: search as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || "Failed to fetch campaigns." });
  }
}

export async function getCampaignDetailHandler(req: AdminRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const result = await getCampaignDetailService(id);
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || "Failed to fetch campaign." });
  }
}

export async function createCampaignHandler(req: AdminRequest, res: Response): Promise<void> {
  try {
    const adminId = req.admin?.id || req.admin?.userId;
    const result = await createCampaignService(req.body, adminId);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(err.status || 400).json({ error: err.message || "Failed to create campaign." });
  }
}

export async function updateCampaignStatusHandler(req: AdminRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { status } = req.body;
    const adminId = req.admin?.id || req.admin?.userId;
    const result = await updateCampaignStatusService(id, status, adminId);
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 400).json({ error: err.message || "Failed to update campaign status." });
  }
}

// ============================================================
// REVIEW & APPROVAL WORKFLOW CONTROLLERS
// ============================================================

export async function getPendingReviewQueueHandler(req: AdminRequest, res: Response): Promise<void> {
  try {
    const { search, page, limit } = req.query;
    const result = await getPendingReviewQueueService({
      search: search as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || "Failed to fetch review queue." });
  }
}

export async function reviewCampaignActionHandler(req: AdminRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const adminId = req.admin?.id || req.admin?.userId;
    const result = await reviewCampaignActionService(id, req.body, adminId);
    res.json({ message: "Campaign review decision recorded successfully.", campaign: result });
  } catch (err: any) {
    res.status(err.status || 400).json({ error: err.message || "Failed to process campaign review." });
  }
}

export async function reviewCreativeActionHandler(req: AdminRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const adminId = req.admin?.id || req.admin?.userId;
    const result = await reviewCreativeActionService(id, req.body, adminId);
    res.json({ message: "Creative review decision recorded successfully.", creative: result });
  } catch (err: any) {
    res.status(err.status || 400).json({ error: err.message || "Failed to process creative review." });
  }
}

// ============================================================
// ANALYTICS CONTROLLERS
// ============================================================

export async function getAdsAnalyticsSummaryHandler(req: AdminRequest, res: Response): Promise<void> {
  try {
    const { timeframe, campaignId } = req.query;
    const result = await getAdsAnalyticsSummaryService({
      timeframe: timeframe as any,
      campaignId: campaignId as string,
    });
    res.json(result);
  } catch (err: any) {
    res.status(err.status || 500).json({ error: err.message || "Failed to fetch ads analytics." });
  }
}
