import { Request, Response } from "express";
import { BusinessService } from "./business.service";

/**
 * GET /api/businesses/me
 * Returns businesses managed by the authenticated user
 */
export async function getMyBusinessesHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }
    const businesses = await BusinessService.getMyBusinesses(userId);
    res.json({ success: true, count: businesses.length, businesses });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/businesses/:id
 * Returns public or member business profile with authoritative verification status
 */
export async function getBusinessByIdHandler(req: Request, res: Response): Promise<void> {
  try {
    const businessId = req.params.id as string;
    const currentUserId = (req as any).user?.id || undefined;
    const business = await BusinessService.getBusinessById(businessId, currentUserId);
    res.json({ success: true, business });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
}

/**
 * PATCH /api/businesses/:id
 * Updates public business profile fields with reverification protection
 */
export async function updateBusinessProfileHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }
    const businessId = req.params.id as string;
    const business = await BusinessService.updateBusinessProfile(businessId, userId, req.body);
    res.json({
      success: true,
      message: (business as any).reverification_triggered
        ? "Business profile updated. Reverification is required because critical identity fields were changed."
        : "Business profile updated successfully.",
      business,
    });
  } catch (err: any) {
    res.status(err.status || 400).json({ success: false, error: err.message });
  }
}

/**
 * PATCH /api/businesses/:id/avatar
 * Uploads Business profile image / logo
 */
export async function uploadBusinessAvatarHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }
    const businessId = req.params.id as string;
    const file = req.file || (req.files && Array.isArray(req.files) ? req.files[0] : undefined);
    if (!file) {
      res.status(400).json({ success: false, error: "No image file provided." });
      return;
    }
    const result = await BusinessService.uploadBusinessAvatar(businessId, userId, file);
    res.json({
      success: true,
      message: "Business logo updated successfully.",
      ...result,
    });
  } catch (err: any) {
    res.status(err.status || 400).json({ success: false, error: err.message });
  }
}

/**
 * PATCH /api/businesses/:id/cover
 * Uploads Business cover banner image
 */
export async function uploadBusinessCoverHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: "Unauthorized" });
      return;
    }
    const businessId = req.params.id as string;
    const file = req.file || (req.files && Array.isArray(req.files) ? req.files[0] : undefined);
    if (!file) {
      res.status(400).json({ success: false, error: "No cover image provided." });
      return;
    }
    const result = await BusinessService.uploadBusinessCover(businessId, userId, file);
    res.json({
      success: true,
      message: "Business cover updated successfully.",
      ...result,
    });
  } catch (err: any) {
    res.status(err.status || 400).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/businesses/:id/posts
 * Retrieves posts created by this business
 */
export async function getBusinessPostsHandler(req: Request, res: Response): Promise<void> {
  try {
    const businessId = req.params.id as string;
    const currentUserId = (req as any).user?.id || undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;

    const result = await BusinessService.getBusinessPosts(businessId, currentUserId, page, limit);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
}
