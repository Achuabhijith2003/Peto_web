import { Request, Response } from "express";
import {
  getPoliciesService,
  getPolicyDetailService,
  createPolicyDraftService,
  updatePolicyDraftService,
  publishPolicyService,
  getPolicyVersionsService,
  rollbackPolicyService,
  getDataRequestsService,
  getDataRequestDetailService,
  createDataRequestService,
  updateDataRequestStatusService,
  getRetentionPoliciesService,
  updateRetentionPolicyService,
  getComplianceAuditLogsService,
} from "../services/adminCompliance.service";
import { generatePolicyPdf } from "../../services/policyPdf.service";

// ============================================================
// POLICIES CONTROLLERS
// ============================================================

export async function getPolicies(req: Request, res: Response) {
  try {
    const { policyType, status, search } = req.query;
    const policies = await getPoliciesService({
      policyType: policyType ? String(policyType) : undefined,
      status: status ? String(status) : undefined,
      search: search ? String(search) : undefined,
    });

    return res.status(200).json({
      success: true,
      data: policies,
    });
  } catch (error: any) {
    console.error("[ComplianceController] getPolicies error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to fetch compliance policies.",
    });
  }
}

export async function getPolicyDetail(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const policy = await getPolicyDetailService(id);

    return res.status(200).json({
      success: true,
      data: policy,
    });
  } catch (error: any) {
    console.error("[ComplianceController] getPolicyDetail error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to fetch policy details.",
    });
  }
}

export async function createPolicyDraft(req: Request, res: Response) {
  try {
    const adminUser = (req as any).admin;
    const adminUserId = adminUser?.userId || adminUser?.id;

    const {
      policyType,
      title,
      version,
      content,
      slug,
      summaryOfChanges,
      effectiveDate,
      regionCode,
      requiresAcknowledgement,
    } = req.body;

    const policy = await createPolicyDraftService(
      {
        policyType,
        title,
        version,
        content,
        slug,
        summaryOfChanges,
        effectiveDate,
        regionCode,
        requiresAcknowledgement,
      },
      adminUserId
    );

    return res.status(201).json({
      success: true,
      message: "Policy draft created successfully.",
      data: policy,
    });
  } catch (error: any) {
    console.error("[ComplianceController] createPolicyDraft error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to create policy draft.",
    });
  }
}

export async function updatePolicyDraft(req: Request, res: Response) {
  try {
    const adminUser = (req as any).admin;
    const adminUserId = adminUser?.userId || adminUser?.id;
    const id = String(req.params.id);

    const policy = await updatePolicyDraftService(id, req.body, adminUserId);

    return res.status(200).json({
      success: true,
      message: "Policy draft updated successfully.",
      data: policy,
    });
  } catch (error: any) {
    console.error("[ComplianceController] updatePolicyDraft error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to update policy draft.",
    });
  }
}

export async function publishPolicy(req: Request, res: Response) {
  try {
    const adminUser = (req as any).admin;
    const adminUserId = adminUser?.userId || adminUser?.id;
    const id = String(req.params.id);

    const published = await publishPolicyService(id, adminUserId);

    return res.status(200).json({
      success: true,
      message: "Policy version successfully published. Prior version is now superseded.",
      data: published,
    });
  } catch (error: any) {
    console.error("[ComplianceController] publishPolicy error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to publish policy version.",
    });
  }
}

export async function getPolicyVersions(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const policy = await getPolicyDetailService(id);
    const versions = await getPolicyVersionsService(policy.policy_type);

    return res.status(200).json({
      success: true,
      data: versions,
    });
  } catch (error: any) {
    console.error("[ComplianceController] getPolicyVersions error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to fetch policy versions.",
    });
  }
}

export async function rollbackPolicy(req: Request, res: Response) {
  try {
    const adminUser = (req as any).admin;
    const adminUserId = adminUser?.userId || adminUser?.id;
    const id = String(req.params.id);
    const { targetVersion } = req.body;

    const draft = await rollbackPolicyService(id, targetVersion, adminUserId);

    return res.status(201).json({
      success: true,
      message: `Rollback draft v${draft.version} created successfully.`,
      data: draft,
    });
  } catch (error: any) {
    console.error("[ComplianceController] rollbackPolicy error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to create rollback revision.",
    });
  }
}

export async function getAdminPolicyPdf(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const policy = await getPolicyDetailService(id);
    const pdfBuffer = await generatePolicyPdf(policy);

    const filename = `peto-${policy.slug || policy.policy_type.toLowerCase()}-v${policy.version}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    return res.end(pdfBuffer);
  } catch (error: any) {
    console.error("[ComplianceController] getAdminPolicyPdf error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to generate policy PDF.",
    });
  }
}

// ============================================================
// DATA PRIVACY REQUESTS CONTROLLERS
// ============================================================

export async function getDataRequests(req: Request, res: Response) {
  try {
    const { status, requestType, search, page, limit } = req.query;

    const result = await getDataRequestsService({
      status: status ? String(status) : undefined,
      requestType: requestType ? String(requestType) : undefined,
      search: search ? String(search) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });

    return res.status(200).json({
      success: true,
      data: result.requests,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error("[ComplianceController] getDataRequests error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to fetch data requests.",
    });
  }
}

export async function getDataRequestDetail(req: Request, res: Response) {
  try {
    const id = String(req.params.id);
    const requestItem = await getDataRequestDetailService(id);

    return res.status(200).json({
      success: true,
      data: requestItem,
    });
  } catch (error: any) {
    console.error("[ComplianceController] getDataRequestDetail error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to fetch data request details.",
    });
  }
}

export async function createDataRequest(req: Request, res: Response) {
  try {
    const adminUser = (req as any).admin;
    const adminUserId = adminUser?.userId || adminUser?.id;

    const { userId, requestType, details, verificationStatus } = req.body;

    const requestItem = await createDataRequestService(
      {
        userId,
        requestType,
        details,
        verificationStatus,
      },
      adminUserId
    );

    return res.status(201).json({
      success: true,
      message: "Data request logged successfully.",
      data: requestItem,
    });
  } catch (error: any) {
    console.error("[ComplianceController] createDataRequest error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to create data request.",
    });
  }
}

export async function updateDataRequestStatus(req: Request, res: Response) {
  try {
    const adminUser = (req as any).admin;
    const adminUserId = adminUser?.userId || adminUser?.id;
    const id = String(req.params.id);
    const { status, resolutionNotes } = req.body;

    const updated = await updateDataRequestStatusService(
      id,
      { status, resolutionNotes },
      adminUserId
    );

    return res.status(200).json({
      success: true,
      message: `Data request status updated to ${status}.`,
      data: updated,
    });
  } catch (error: any) {
    console.error("[ComplianceController] updateDataRequestStatus error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to update data request status.",
    });
  }
}

// ============================================================
// DATA RETENTION POLICIES CONTROLLERS
// ============================================================

export async function getRetentionPolicies(_req: Request, res: Response) {
  try {
    const policies = await getRetentionPoliciesService();

    return res.status(200).json({
      success: true,
      data: policies,
    });
  } catch (error: any) {
    console.error("[ComplianceController] getRetentionPolicies error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to fetch data retention settings.",
    });
  }
}

export async function updateRetentionPolicy(req: Request, res: Response) {
  try {
    const adminUser = (req as any).admin;
    const adminUserId = adminUser?.userId || adminUser?.id;
    const category = String(req.params.category);
    const { retentionDays, autoPurgeEnabled, description, legalBasis } = req.body;

    const updated = await updateRetentionPolicyService(
      category,
      {
        retentionDays,
        autoPurgeEnabled,
        description,
        legalBasis,
      },
      adminUserId
    );

    return res.status(200).json({
      success: true,
      message: `Retention policy for ${category} updated successfully.`,
      data: updated,
    });
  } catch (error: any) {
    console.error("[ComplianceController] updateRetentionPolicy error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to update data retention setting.",
    });
  }
}

// ============================================================
// COMPLIANCE AUDIT TRAIL CONTROLLER
// ============================================================

export async function getComplianceAuditLogs(req: Request, res: Response) {
  try {
    const { page, limit, search } = req.query;

    const result = await getComplianceAuditLogsService({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search: search ? String(search) : undefined,
    });

    return res.status(200).json({
      success: true,
      data: result.logs,
      pagination: result.pagination,
    });
  } catch (error: any) {
    console.error("[ComplianceController] getComplianceAuditLogs error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to fetch compliance audit trail.",
    });
  }
}
