import { Request, Response } from "express";
import { AdminRequest } from "../middleware/adminAuth.middleware";
import {
  getUsersListService,
  getUserDetailService,
  updateUserStatusService,
  updateUserVerificationService,
} from "../services/adminUserManagement.service";

export async function getUsers(req: Request, res: Response) {
  try {
    const {
      page,
      limit,
      search,
      status,
      verified,
      sortBy,
      sortOrder,
      startDate,
      endDate,
    } = req.query;

    const result = await getUsersListService({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search: typeof search === "string" ? search : undefined,
      status: typeof status === "string" ? status : undefined,
      verified: typeof verified === "string" ? verified : undefined,
      sortBy: typeof sortBy === "string" ? sortBy : undefined,
      sortOrder: sortOrder === "asc" || sortOrder === "desc" ? sortOrder : undefined,
      startDate: typeof startDate === "string" ? startDate : undefined,
      endDate: typeof endDate === "string" ? endDate : undefined,
    });

    return res.status(200).json({
      success: true,
      data: result.users,
      pagination: result.pagination,
    });
  } catch (err: any) {
    console.error("[getUsers] Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to retrieve users list.",
    });
  }
}

export async function getUserDetail(req: Request, res: Response) {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    const detail = await getUserDetailService(id);
    return res.status(200).json({
      success: true,
      data: detail,
    });
  } catch (err: any) {
    console.error("[getUserDetail] Error:", err);
    const isNotFound = err.message === "User not found.";
    return res.status(isNotFound ? 404 : 500).json({
      success: false,
      message: err.message || "Failed to retrieve user details.",
    });
  }
}

export async function updateUserStatus(req: Request, res: Response) {
  try {
    const adminReq = req as AdminRequest;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { status, reason, suspendedUntil } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Status field is required (ACTIVE, SUSPENDED, BANNED, DEACTIVATED, DELETED).",
      });
    }

    const result = await updateUserStatusService(
      id,
      { status, reason, suspendedUntil },
      adminReq.admin!,
      req
    );

    return res.status(200).json({
      success: true,
      message: `User status successfully updated to ${status}.`,
      data: result,
    });
  } catch (err: any) {
    console.error("[updateUserStatus] Error:", err);
    return res.status(400).json({
      success: false,
      message: err.message || "Failed to update user status.",
    });
  }
}

export async function updateUserVerification(req: Request, res: Response) {
  try {
    const adminReq = req as AdminRequest;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { verified } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "User ID is required.",
      });
    }

    if (typeof verified !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Verified field must be a boolean (true or false).",
      });
    }

    const result = await updateUserVerificationService(
      id,
      verified,
      adminReq.admin!,
      req
    );

    return res.status(200).json({
      success: true,
      message: `User verification status updated to ${verified ? "Verified" : "Unverified"}.`,
      data: result,
    });
  } catch (err: any) {
    console.error("[updateUserVerification] Error:", err);
    return res.status(400).json({
      success: false,
      message: err.message || "Failed to update user verification.",
    });
  }
}
