import { Request, Response } from "express";
import {
  getAdminNotificationsService,
  markAdminNotificationReadService,
  markAllAdminNotificationsReadService,
  createAdminNotificationService,
} from "../services/adminNotifications.service";

/**
 * GET /api/admin/notifications
 * Fetch paginated administrative notifications with filtering by status, category, priority, and text query
 */
export async function getAdminNotifications(req: Request, res: Response): Promise<void> {
  try {
    const { page, limit, status, category, priority, search } = req.query;
    const adminUser = (req as any).admin;

    const result = await getAdminNotificationsService({
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 20,
      status: status as "all" | "unread" | "read",
      category: category as string,
      priority: priority as string,
      search: search as string,
      adminId: adminUser?.id,
    });

    res.json({
      success: true,
      data: result.notifications,
      unread_count: result.unread_count,
      critical_count: result.critical_count,
      pagination: result.pagination,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to fetch admin notifications",
    });
  }
}

/**
 * PATCH /api/admin/notifications/:id/read
 * Mark an individual notification as read or unread
 */
export async function markNotificationRead(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id);
    const isRead = req.body.is_read !== undefined ? Boolean(req.body.is_read) : true;

    if (!id || id === "undefined") {
      res.status(400).json({ success: false, message: "Notification ID is required" });
      return;
    }

    const updated = await markAdminNotificationReadService(id, isRead);

    res.json({
      success: true,
      data: updated,
      message: isRead ? "Notification marked as read" : "Notification marked as unread",
    });
  } catch (error: any) {
    res.status(error.message?.includes("not found") ? 404 : 500).json({
      success: false,
      message: error.message || "Failed to update notification read status",
    });
  }
}

/**
 * POST /api/admin/notifications/mark-all-read
 * Atomically mark all unread notifications as read
 */
export async function markAllNotificationsRead(req: Request, res: Response): Promise<void> {
  try {
    const adminUser = (req as any).admin;
    const result = await markAllAdminNotificationsReadService(adminUser?.id);

    res.json({
      success: true,
      message: "All administrative notifications marked as read",
      read_at: result.read_at,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to mark all notifications as read",
    });
  }
}

/**
 * POST /api/admin/notifications (Internal / Test helper)
 * Create an operational notification
 */
export async function createNotificationHandler(req: Request, res: Response): Promise<void> {
  try {
    const { category, priority, title, message, link, metadata, dedup_key } = req.body;

    if (!category || !title || !message) {
      res.status(400).json({
        success: false,
        message: "Missing required fields: category, title, and message are required",
      });
      return;
    }

    const result = await createAdminNotificationService({
      category,
      priority: priority || "MEDIUM",
      title,
      message,
      link,
      metadata,
      dedup_key,
    });

    res.status(result.created ? 201 : 200).json({
      success: true,
      data: result.notification,
      deduplicated: !result.created,
      message: result.created ? "Notification created successfully" : "Duplicate notification suppressed",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create admin notification",
    });
  }
}
