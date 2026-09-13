import { Request, Response } from "express";
import { AdminRequest } from "../middleware/adminAuth.middleware";
import {
  getAdminsService,
  createAdminService,
  updateAdminService,
  deleteAdminService,
  getAllRolesService,
  getAllPermissionsService,
} from "../services/adminManagement.service";

export async function getAdmins(req: Request, res: Response) {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;

    const result = await getAdminsService(page, limit, search);
    return res.status(200).json({
      success: true,
      data: result.admins,
      pagination: result.pagination,
    });
  } catch (err: any) {
    console.error("[getAdmins] Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to retrieve administrators.",
    });
  }
}

export async function createAdmin(req: Request, res: Response) {
  try {
    const adminReq = req as AdminRequest;
    const { userId, roleId } = req.body;

    if (!userId || !roleId) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: userId and roleId are mandatory.",
      });
    }

    const newAdmin = await createAdminService(
      { userId, roleId },
      adminReq.admin!,
      req
    );

    return res.status(201).json({
      success: true,
      message: "Administrator role assigned successfully.",
      data: newAdmin,
    });
  } catch (err: any) {
    console.error("[createAdmin] Error:", err);
    return res.status(400).json({
      success: false,
      message: err.message || "Failed to create administrator.",
    });
  }
}

export async function updateAdmin(req: Request, res: Response) {
  try {
    const adminReq = req as AdminRequest;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { roleId, isActive } = req.body;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Target administrator ID is required.",
      });
    }

    if (roleId === undefined && isActive === undefined) {
      return res.status(400).json({
        success: false,
        message: "Please provide either roleId or isActive to update.",
      });
    }

    const updated = await updateAdminService(
      id,
      { roleId, isActive },
      adminReq.admin!,
      req
    );

    return res.status(200).json({
      success: true,
      message: "Administrator updated successfully.",
      data: updated,
    });
  } catch (err: any) {
    console.error("[updateAdmin] Error:", err);
    return res.status(400).json({
      success: false,
      message: err.message || "Failed to update administrator.",
    });
  }
}

export async function deleteAdmin(req: Request, res: Response) {
  try {
    const adminReq = req as AdminRequest;
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: "Target administrator ID is required.",
      });
    }

    const result = await deleteAdminService(id, adminReq.admin!, req);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error("[deleteAdmin] Error:", err);
    return res.status(400).json({
      success: false,
      message: err.message || "Failed to revoke administrator access.",
    });
  }
}

export async function getRoles(req: Request, res: Response) {
  try {
    const roles = await getAllRolesService();
    return res.status(200).json({
      success: true,
      data: roles,
    });
  } catch (err: any) {
    console.error("[getRoles] Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to retrieve administrative roles.",
    });
  }
}

export async function getPermissions(req: Request, res: Response) {
  try {
    const permissions = await getAllPermissionsService();
    return res.status(200).json({
      success: true,
      data: permissions,
    });
  } catch (err: any) {
    console.error("[getPermissions] Error:", err);
    return res.status(500).json({
      success: false,
      message: err.message || "Failed to retrieve permissions catalog.",
    });
  }
}
