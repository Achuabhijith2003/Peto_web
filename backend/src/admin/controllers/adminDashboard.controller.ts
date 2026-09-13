import { Request, Response } from "express";
import { getDashboardOverviewService } from "../services/adminDashboard.service";

/**
 * GET /api/admin/dashboard
 * Aggregated metrics, time-series charts, and operational widgets
 */
export async function getDashboardOverview(req: Request, res: Response) {
  try {
    const range = req.query.range as any;
    const startDate = req.query.startDate as string | undefined;
    const endDate = req.query.endDate as string | undefined;
    const refresh = req.query.refresh === "true";

    const overview = await getDashboardOverviewService({
      range,
      startDate,
      endDate,
      refresh,
    });

    return res.status(200).json({
      success: true,
      data: overview,
    });
  } catch (error: any) {
    console.error("[getDashboardOverview Controller Error]:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to retrieve admin dashboard overview.",
    });
  }
}
