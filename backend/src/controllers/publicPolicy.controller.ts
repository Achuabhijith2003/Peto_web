import { Request, Response } from "express";
import {
  getPublicPoliciesService,
  getPublicPolicyBySlugService,
  acknowledgePolicyService,
} from "../admin/services/adminCompliance.service";
import { generatePolicyPdf } from "../services/policyPdf.service";

export async function getPublicPolicies(_req: Request, res: Response) {
  try {
    const policies = await getPublicPoliciesService();
    return res.status(200).json({
      success: true,
      data: policies,
    });
  } catch (error: any) {
    console.error("[PublicPolicyController] getPublicPolicies error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to fetch published policies.",
    });
  }
}

export async function getPublicPolicyBySlug(req: Request, res: Response) {
  try {
    const slug = String(req.params.slug);
    const version = req.query.version ? String(req.query.version) : undefined;
    const policy = await getPublicPolicyBySlugService(slug, version);

    return res.status(200).json({
      success: true,
      data: policy,
    });
  } catch (error: any) {
    console.error(`[PublicPolicyController] getPublicPolicyBySlug(${req.params.slug}) error:`, error);
    return res.status(error.status || 404).json({
      success: false,
      message: error.message || "Requested policy was not found or is not published.",
    });
  }
}

export async function getPublicPolicyPdf(req: Request, res: Response) {
  try {
    const slug = String(req.params.slug);
    const version = req.query.version ? String(req.query.version) : undefined;
    const policy = await getPublicPolicyBySlugService(slug, version);
    const pdfBuffer = await generatePolicyPdf(policy);

    const filename = `peto-${policy.slug || slug}-v${policy.version}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);
    return res.end(pdfBuffer);
  } catch (error: any) {
    console.error(`[PublicPolicyController] getPublicPolicyPdf(${req.params.slug}) error:`, error);
    return res.status(error.status || 404).json({
      success: false,
      message: error.message || "Failed to generate policy PDF.",
    });
  }
}

export async function acknowledgePolicy(req: Request, res: Response) {
  try {
    const user = (req as any).user;
    const userId = user?.id || user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to record policy acknowledgement.",
      });
    }

    const slug = String(req.params.slug);
    const { version } = req.body;

    if (!version) {
      return res.status(400).json({
        success: false,
        message: "Policy version is required for acknowledgement.",
      });
    }

    const ack = await acknowledgePolicyService(userId, slug, String(version), {
      ip: req.ip || req.headers["x-forwarded-for"]?.toString(),
      userAgent: req.headers["user-agent"],
    });

    return res.status(200).json({
      success: true,
      message: "Policy acknowledgement successfully recorded.",
      data: ack,
    });
  } catch (error: any) {
    console.error("[PublicPolicyController] acknowledgePolicy error:", error);
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to record policy acknowledgement.",
    });
  }
}
