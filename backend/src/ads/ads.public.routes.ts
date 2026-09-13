import { Router } from "express";
import {
  getActiveFeedAdsHandler,
  recordAdImpressionHandler,
  recordAdClickHandler,
} from "./ads.public.controller";

const router = Router();

// Publicly accessible ad endpoints for client apps (Web & Mobile)
router.get("/feed", getActiveFeedAdsHandler);
router.post("/:id/impression", recordAdImpressionHandler);
router.post("/:id/click", recordAdClickHandler);

export default router;
