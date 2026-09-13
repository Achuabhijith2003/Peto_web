import { Request, Response } from "express";
import { createUserReportService } from "./report.service";

export async function submitUserReport(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    if (!user || !user.id) {
      return res.status(401).json({
        success: false,
        message: "You must be signed in to submit a report.",
      });
    }

    const targetType = req.body.targetType || req.body.target_type;
    const targetId = req.body.targetId || req.body.target_id;
    const reason = req.body.reason;
    const description = req.body.description;

    if (!targetType || !targetId || !reason) {
      return res.status(400).json({
        success: false,
        message: "targetType, targetId, and reason are required.",
      });
    }

    const validTargetTypes = ["post", "reel", "comment", "user", "community"];
    if (!validTargetTypes.includes(targetType.toLowerCase())) {
      return res.status(400).json({
        success: false,
        message: `Invalid targetType. Supported types: ${validTargetTypes.join(", ")}`,
      });
    }

    const report = await createUserReportService({
      reporterId: user.id,
      targetType: targetType.toLowerCase(),
      targetId: String(targetId),
      reason: String(reason),
      description: description ? String(description) : "",
    });

    return res.status(201).json({
      success: true,
      message: "Report submitted successfully. Thank you for helping keep Peto safe.",
      data: {
        id: report.id,
        status: report.status,
        createdAt: report.created_at,
      },
    });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    return res.status(statusCode).json({
      success: false,
      message: error.message || "Failed to submit report.",
    });
  }
}
