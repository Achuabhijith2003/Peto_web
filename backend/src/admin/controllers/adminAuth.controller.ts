import { Request, Response } from "express";
import { AdminRequest } from "../middleware/adminAuth.middleware";

export async function getAdminMe(req: Request, res: Response) {
  try {
    const adminReq = req as AdminRequest;
    if (!adminReq.admin) {
      return res.status(401).json({
        success: false,
        message: "No active admin session found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: adminReq.admin,
    });
  } catch (err: any) {
    console.error("[getAdminMe] Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to retrieve administrator profile.",
    });
  }
}
