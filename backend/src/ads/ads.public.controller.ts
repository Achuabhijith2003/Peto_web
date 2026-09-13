import { Request, Response } from "express";
import {
  getActiveFeedAdsService,
  recordAdImpressionService,
  recordAdClickService,
} from "./ads.public.service";

export async function getActiveFeedAdsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { placement } = req.query;
    const ads = await getActiveFeedAdsService(placement ? String(placement) : "FEED");
    res.json({ success: true, count: ads.length, ads });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || "Failed to fetch active feed ads." });
  }
}

export async function recordAdImpressionHandler(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { creativeId } = req.body || {};
    const result = await recordAdImpressionService(id, creativeId);
    res.json(result);
  } catch (err: any) {
    res.status(200).json({ success: false }); // Non-blocking
  }
}

export async function recordAdClickHandler(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { creativeId } = req.body || {};
    const result = await recordAdClickService(id, creativeId);
    res.json(result);
  } catch (err: any) {
    res.status(200).json({ success: false }); // Non-blocking
  }
}
