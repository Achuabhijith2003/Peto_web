import { Request, Response } from "express";
import { AdminVerificationService } from "../services/adminVerification.service";

/**
 * GET /api/admin/verifications/overview
 */
export async function getAdminVerificationOverviewHandler(req: Request, res: Response): Promise<void> {
  try {
    const overview = await AdminVerificationService.getOverview();
    res.json({ success: true, overview });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/admin/verifications
 */
export async function getAdminVerificationQueueHandler(req: Request, res: Response): Promise<void> {
  try {
    const queue = await AdminVerificationService.getQueue(req.query);
    res.json({ success: true, ...queue });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/admin/verifications/:id
 */
export async function getAdminVerificationDetailHandler(req: Request, res: Response): Promise<void> {
  try {
    const applicationId = req.params.id as string;
    const detail = await AdminVerificationService.getDetail(applicationId);
    res.json({ success: true, application: detail });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/admin/verifications/:id/assign
 */
export async function assignAdminVerificationHandler(req: Request, res: Response): Promise<void> {
  try {
    const adminUserId = (req as any).user?.id;
    const applicationId = req.params.id as string;
    const { assignedAdminId } = req.body;

    const result = await AdminVerificationService.assignAdmin(
      applicationId,
      assignedAdminId || null,
      adminUserId,
      req
    );

    res.json({
      success: true,
      message: assignedAdminId ? "Reviewer assigned successfully." : "Reviewer unassigned.",
      application: result,
    });
  } catch (err: any) {
    res.status(err.status || 400).json({ success: false, error: err.message });
  }
}

/**
 * GET /api/admin/verifications/:id/documents/:docId/view-token
 */
export async function getAdminSignedDocumentUrlHandler(req: Request, res: Response): Promise<void> {
  try {
    const adminUserId = (req as any).user?.id;
    const applicationId = req.params.id as string;
    const documentId = req.params.docId as string;
    const result = await AdminVerificationService.getSignedDocumentUrl(
      applicationId,
      documentId,
      adminUserId,
      req
    );
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/admin/verifications/:id/review
 */
export async function reviewVerificationApplicationHandler(req: Request, res: Response): Promise<void> {
  try {
    const adminUserId = (req as any).user?.id;
    const applicationId = req.params.id as string;
    const { action, notes, rejectionReason, userFacingReason, adminInternalNotes } = req.body;

    if (!action) {
      res.status(400).json({ success: false, error: "Action is required." });
      return;
    }

    const updated = await AdminVerificationService.processDecision(
      applicationId,
      adminUserId,
      action,
      notes,
      rejectionReason,
      userFacingReason,
      adminInternalNotes,
      req
    );

    res.json({
      success: true,
      message: `Verification successfully processed with status ${updated.status}.`,
      application: updated,
    });
  } catch (err: any) {
    res.status(err.status || 400).json({ success: false, error: err.message });
  }
}

/**
 * Explicit helper action handlers
 */
export async function approveVerificationHandler(req: Request, res: Response): Promise<void> {
  req.body.action = "APPROVE";
  return reviewVerificationApplicationHandler(req, res);
}

export async function rejectVerificationHandler(req: Request, res: Response): Promise<void> {
  req.body.action = "REJECT";
  return reviewVerificationApplicationHandler(req, res);
}

export async function requestInformationVerificationHandler(req: Request, res: Response): Promise<void> {
  req.body.action = "REQUEST_INFORMATION";
  return reviewVerificationApplicationHandler(req, res);
}

export async function reverificationVerificationHandler(req: Request, res: Response): Promise<void> {
  req.body.action = "REQUIRE_REVERIFICATION";
  return reviewVerificationApplicationHandler(req, res);
}

export async function suspendVerificationHandler(req: Request, res: Response): Promise<void> {
  req.body.action = "SUSPEND";
  return reviewVerificationApplicationHandler(req, res);
}

export async function revokeVerificationHandler(req: Request, res: Response): Promise<void> {
  req.body.action = "REVOKE";
  return reviewVerificationApplicationHandler(req, res);
}
