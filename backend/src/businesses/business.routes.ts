import { Router } from "express";
import { authenticate, optionalAuthenticate } from "../auth/auth.middleware";
import { uploadImage } from "../media/upload.middleware";
import {
  getMyBusinessesHandler,
  getBusinessByIdHandler,
  updateBusinessProfileHandler,
  uploadBusinessAvatarHandler,
  uploadBusinessCoverHandler,
  getBusinessPostsHandler,
} from "./business.controller";

const router = Router();

// My managed businesses
router.get("/me", authenticate, getMyBusinessesHandler);

// Public / Member Business Profile
router.get("/:id", optionalAuthenticate, getBusinessByIdHandler);

// Update business profile
router.patch("/:id", authenticate, updateBusinessProfileHandler);
router.put("/:id", authenticate, updateBusinessProfileHandler);

// Upload / update Business logo & avatar
router.patch("/:id/avatar", authenticate, uploadImage.any(), uploadBusinessAvatarHandler);
router.post("/:id/avatar", authenticate, uploadImage.any(), uploadBusinessAvatarHandler);

// Upload / update Business cover banner
router.patch("/:id/cover", authenticate, uploadImage.any(), uploadBusinessCoverHandler);
router.post("/:id/cover", authenticate, uploadImage.any(), uploadBusinessCoverHandler);

// Posts created by this business
router.get("/:id/posts", optionalAuthenticate, getBusinessPostsHandler);

export default router;
