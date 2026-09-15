import { Router } from "express";
import {
  getActiveFeedAdsHandler,
  getAdDecisionHandler,
  recordAdImpressionHandler,
  recordAdClickHandler,
  submitAdFeedbackHandler,
} from "./ads.public.controller";

const router = Router();

// Publicly accessible ad endpoints for client apps (Web & Mobile)
router.get("/feed", getActiveFeedAdsHandler);
router.get("/decision", getAdDecisionHandler);
router.post("/:id/impression", recordAdImpressionHandler);
router.post("/:id/click", recordAdClickHandler);
router.post("/:id/feedback", submitAdFeedbackHandler);

export default router;
