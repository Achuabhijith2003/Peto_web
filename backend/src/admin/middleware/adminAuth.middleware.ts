import { Request, Response, NextFunction } from "express";
import { supabase } from "../../config/supabase";
import { resolveAdminContext } from "../services/adminAuth.service";
import { AdminSessionContext } from "../admin.types";

export interface AdminRequest extends Request {
  admin?: AdminSessionContext;
  user?: any;
}

/**
 * Ensures caller is an authenticated user with active administrator status.
 */
export async function requireAdminAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.substring(7)
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Authentication required: Missing access token.",
      code: "UNAUTHORIZED_NO_TOKEN",
    });
  }

  try {
    // 1. Authenticate with Supabase
    const { data, error } = await supabase.auth.getUser(token);

    if (error || !data.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication failed: Invalid or expired access token.",
        code: "UNAUTHORIZED_INVALID_TOKEN",
      });
    }

    // 2. Resolve admin profile and permissions
    const adminContext = await resolveAdminContext(data.user.id);

    if (!adminContext) {
      return res.status(403).json({
        success: false,
        message: "Access Denied: You do not have administrative privileges on Peto.",
        code: "FORBIDDEN_NOT_ADMIN",
      });
    }

    // 3. Verify active status
    if (!adminContext.isActive) {
      return res.status(403).json({
        success: false,
        message: "Access Denied: Your administrator account is inactive or suspended.",
        code: "FORBIDDEN_ACCOUNT_SUSPENDED",
      });
    }

    // Attach to request
    (req as AdminRequest).user = data.user;
    (req as AdminRequest).admin = adminContext;

    next();
  } catch (err: any) {
    console.error("[requireAdminAuth] Unexpected error during verification:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error verifying administrative credentials.",
    });
  }
}

/**
 * Enforces granular permission checking.
 * Super Admin bypasses all individual permission checks.
 */
export function requirePermission(...requiredPermissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const adminReq = req as AdminRequest;

    if (!adminReq.admin) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
        code: "UNAUTHORIZED",
      });
    }

    // Super Admin has unrestricted access
    if (adminReq.admin.role.name === "Super Admin") {
      return next();
    }

    // Verify all specified permissions are present
    const missingPermissions = requiredPermissions.filter(
      (perm) => !adminReq.admin?.permissions.includes(perm)
    );

    if (missingPermissions.length > 0) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: You lack the required permission: [${missingPermissions.join(", ")}]`,
        code: "FORBIDDEN_PERMISSION_DENIED",
        required: requiredPermissions,
        missing: missingPermissions,
      });
    }

    next();
  };
}

/**
 * Enforces that caller holds at least one of the specified permissions.
 */
export function requireAnyPermission(...allowedPermissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const adminReq = req as AdminRequest;

    if (!adminReq.admin) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
        code: "UNAUTHORIZED",
      });
    }

    // Super Admin has unrestricted access
    if (adminReq.admin.role.name === "Super Admin") {
      return next();
    }

    const hasAny = allowedPermissions.some((perm) =>
      adminReq.admin?.permissions.includes(perm)
    );

    if (!hasAny) {
      return res.status(403).json({
        success: false,
        message: `Forbidden: You lack the required permission to perform this action. Requires one of: [${allowedPermissions.join(", ")}]`,
        code: "FORBIDDEN_PERMISSION_DENIED",
        allowed: allowedPermissions,
      });
    }

    next();
  };
}
