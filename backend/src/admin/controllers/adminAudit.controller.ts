import { Request, Response } from "express";
import { getAuditLogsService } from "../services/adminAudit.service";

export async function getAuditLogs(req: Request, res: Response) {
  try {
    const {
      page,
      limit,
      action,
      adminUserId,
      resourceType,
      startDate,
      endDate,
    } = req.query;

    const result = await getAuditLogsService({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      action: typeof action === "string" ? action : undefined,
      adminUserId: typeof adminUserId === "string" ? adminUserId : undefined,
      resourceType: typeof resourceType === "string" ? resourceType : undefined,
      startDate: typeof startDate === "string" ? startDate : undefined,
      endDate: typeof endDate === "string" ? endDate : undefined,
    });

    return res.status(200).json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (err: any) {
    console.error("[getAuditLogs] Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to retrieve audit logs.",
    });
  }
}
