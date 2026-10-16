import { Router } from "express";
import { authenticate } from "../auth/auth.middleware";
import { uploadImage, uploadVideo, upload } from "./upload.middleware";
import { uploadImages, uploadVideoController, uploadMedia } from "./media.controller";
import { uploadRateLimiter } from "../middleware/rateLimiter";

const router = Router();

router.post(
  "/image",
  authenticate,
  uploadRateLimiter,
  uploadImage.any(),
  uploadImages
);

router.post(
  "/video",
  authenticate,
  uploadRateLimiter,
  uploadVideo.any(),
  uploadVideoController
);

router.post(
  "/upload",
  authenticate,
  uploadRateLimiter,
  upload.any(),
  uploadMedia
);

export default router;