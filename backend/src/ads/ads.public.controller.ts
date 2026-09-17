import { Request, Response } from "express";
import { supabase } from "../config/supabase";
import {
  getActiveFeedAdsService,
  recordAdImpressionService,
  recordAdClickService,
} from "./ads.public.service";
import { resolveCountryFromRequest } from "../regions/regional.service";
import { AdDecisionEngine } from "./engine/adDecisionEngine";
import { AdEventTrackerService } from "./adEventTracker.service";

export async function getActiveFeedAdsHandler(req: Request, res: Response): Promise<void> {
  try {
    const { placement } = req.query;
    const country = resolveCountryFromRequest(req);
    const ads = await getActiveFeedAdsService(placement ? String(placement) : "FEED", country);
    res.json({ success: true, count: ads.length, country, ads });
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

/**
 * Request real-time ad placement decision via AdDecisionEngine
 * GET /api/ads/decision
 */
export async function getAdDecisionHandler(req: Request, res: Response): Promise<void> {
  try {
    const { placement, device, language, interests, organicCount } = req.query;
    const country = resolveCountryFromRequest(req);
    const userId = (req as any).user?.id;

    const petInterests = interests ? String(interests).split(",").map((i) => i.trim()) : undefined;

    const result = await AdDecisionEngine.decide({
      userId,
      country,
      placement: (placement as any) || "FEED",
      device: (device as any) || "WEB",
      language: language ? String(language) : "en",
      petInterests,
      organicCountSinceLastAd: organicCount ? parseInt(String(organicCount), 10) : undefined,
    });

    res.json({
      success: true,
      country,
      ...result,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      hasAd: false,
      source: "NONE",
      error: err.message,
    });
  }
}

/**
 * Submit user ad control feedback (Hide / Report / Not Interested)
 * POST /api/ads/:id/feedback
 */
export async function submitAdFeedbackHandler(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { action, reason } = req.body;
    const userId = (req as any).user?.id;

    // Record user ad feedback
    try {
      await supabase.from("user_ad_feedback").insert({
        campaign_id: id,
        user_id: userId || null,
        action: action || "HIDE", // 'HIDE', 'REPORT', 'NOT_INTERESTED'
        reason: reason || null,
      });
    } catch {}

    res.json({
      success: true,
      message: "Feedback recorded. We will use this to improve your recommendations.",
    });
  } catch {
    res.status(200).json({ success: true });
  }
}

/**
 * Record client-side ad lifecycle telemetry event (AD_SHOWN, AD_IMPRESSION, AD_CLICK, AD_ERROR, etc.)
 * POST /api/ads/events
 */
export async function recordAdEventHandler(req: Request, res: Response): Promise<void> {
  try {
    const { eventType, adSource, provider, campaignId, creativeId, placement, platform, errorCode, metadata } = req.body || {};
    const country = resolveCountryFromRequest(req);
    const userId = (req as any).user?.id;

    await AdEventTrackerService.logEvent({
      eventType: eventType || "AD_IMPRESSION",
      adSource: adSource || "EXTERNAL",
      provider: provider || "ADMOB",
      campaignId,
      creativeId,
      placement: placement || "FEED",
      platform: platform || "WEB",
      country,
      userId,
      errorCode,
      metadata,
    });

    res.json({ success: true });
  } catch {
    res.status(200).json({ success: false });
  }
}
