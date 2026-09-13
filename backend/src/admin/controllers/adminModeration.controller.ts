import { Request, Response } from "express";
import {
  createReportService,
  getReportsQueueService,
  getReportDetailService,
  updateReportService,
  executeModerationActionService,
} from "../services/adminModeration.service";

/**
 * GET /api/admin/reports
 * Fetch moderation reports queue with filtering & pagination
 */
export async function getReports(req: Request, res: Response) {
  try {
    const filters = {
      status: req.query.status as string | undefined,
      targetType: req.query.targetType as string | undefined,
      priority: req.query.priority as string | undefined,
      assignedTo: req.query.assignedTo as string | undefined,
      search: req.query.search as string | undefined,
      sortBy: req.query.sortBy as string | undefined,
      sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc",
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 15,
    };

    const result = await getReportsQueueService(filters);
    return res.status(200).json({
      success: true,
      data: result.reports,
      metrics: result.metrics,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error("[getReports Controller Error]:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve moderation queue.",
    });
  }
}

/**
 * GET /api/admin/reports/:id
 * Fetch complete report detail, hydrated target entity, and moderation history
 */
export async function getReportDetail(req: Request, res: Response) {
  try {
    const reportId = req.params.id as string;
    if (!reportId) {
      return res.status(400).json({ success: false, message: "Report ID is required." });
    }

    const detail = await getReportDetailService(reportId);
    return res.status(200).json({
      success: true,
      data: detail,
    });
  } catch (error: any) {
    console.error("[getReportDetail Controller Error]:", error);
    const statusCode = error.message === "Report not found." ? 404 : 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to retrieve report detail.",
    });
  }
}

/**
 * PATCH /api/admin/reports/:id
 * Update status, priority, assigned moderator, or resolution notes
 */
export async function updateReport(req: Request, res: Response) {
  try {
    const reportId = req.params.id as string;
    const currentAdmin = (req as any).admin;

    if (!reportId) {
      return res.status(400).json({ success: false, message: "Report ID is required." });
    }

    const { status, priority, assignedTo, resolution } = req.body;
    const updated = await updateReportService(
      reportId,
      { status, priority, assignedTo, resolution },
      currentAdmin,
      req
    );

    return res.status(200).json({
      success: true,
      message: "Report updated successfully.",
      data: updated,
    });
  } catch (error: any) {
    console.error("[updateReport Controller Error]:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to update report.",
    });
  }
}

/**
 * POST /api/admin/reports/:id/action
 * Execute moderation action (Remove, Restrict, Warn, Suspend, Ban, Resolve, Escalate, Reject)
 */
export async function executeAction(req: Request, res: Response) {
  try {
    const reportId = req.params.id as string;
    const currentAdmin = (req as any).admin;

    if (!reportId) {
      return res.status(400).json({ success: false, message: "Report ID is required." });
    }

    const { action, reason, durationDays, overrideResolved } = req.body;
    if (!action) {
      return res.status(400).json({ success: false, message: "Moderation action is required." });
    }

    const result = await executeModerationActionService(
      reportId,
      { action, reason, durationDays, overrideResolved },
      currentAdmin,
      req
    );

    return res.status(200).json({
      success: true,
      message: `Moderation action '${action}' applied successfully.`,
      data: result,
    });
  } catch (error: any) {
    console.error("[executeAction Controller Error]:", error);
    const isPermissionErr = error.message?.includes("Insufficient privileges");
    return res.status(isPermissionErr ? 403 : 400).json({
      success: false,
      message: error.message || "Failed to execute moderation action.",
    });
  }
}

/**
 * POST /api/admin/reports
 * File a new report
 */
export async function createReport(req: Request, res: Response) {
  try {
    const { reporterId, targetType, targetId, reason, description, priority } = req.body;
    const currentAdmin = (req as any).admin;

    const repId = reporterId || currentAdmin?.userId;
    if (!repId) {
      return res.status(400).json({ success: false, message: "Reporter ID is required." });
    }

    const report = await createReportService({
      reporterId: repId,
      targetType,
      targetId,
      reason,
      description,
      priority,
    });

    return res.status(201).json({
      success: true,
      message: "Report created successfully.",
      data: report,
    });
  } catch (error: any) {
    console.error("[createReport Controller Error]:", error);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to create report.",
    });
  }
}
