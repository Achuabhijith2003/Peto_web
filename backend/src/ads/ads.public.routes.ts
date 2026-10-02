import { Router } from "express";
import { optionalAuthenticate } from "../auth/auth.middleware";
import {
  getActiveFeedAdsHandler,
  getAdDecisionHandler,
  recordAdImpressionHandler,
  recordAdClickHandler,
  submitAdFeedbackHandler,
  recordAdEventHandler,
  getPublicAdFeaturesHandler,
} from "./ads.public.controller";

const router = Router();

// Public ad platform capabilities and features
router.get("/features", getPublicAdFeaturesHandler);

// Ad endpoints for client apps (Web & Mobile) with optional authentication to resolve user pet identity
router.get("/feed", optionalAuthenticate, getActiveFeedAdsHandler);
router.get("/decision", optionalAuthenticate, getAdDecisionHandler);
router.post("/events", recordAdEventHandler);
router.post("/:id/impression", optionalAuthenticate, recordAdImpressionHandler);
router.post("/:id/click", optionalAuthenticate, recordAdClickHandler);
router.post("/:id/feedback", optionalAuthenticate, submitAdFeedbackHandler);

export default router;
