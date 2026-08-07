import { Router } from "express";
import { authenticate } from "../auth/auth.middleware";
import { uploadImage, uploadVideo, upload } from "./upload.middleware";
import { uploadImages, uploadVideoController, uploadMedia } from "./media.controller";

const router = Router();

router.post(
  "/image",
  authenticate,
  uploadImage.any(),
  uploadImages
);

router.post(
  "/video",
  authenticate,
  uploadVideo.any(),
  uploadVideoController
);

router.post(
  "/upload",
  authenticate,
  upload.any(),
  uploadMedia
);

export default router;