import { Router, Request, Response } from "express";
import { authenticate } from "../../auth/auth.middleware";
import { IdentityVerificationService } from "./identityVerification.service";
import { uploadSecureDocumentMiddleware } from "../../media/upload.middleware";
import { DocumentType } from "./verification.types";

const router = Router();

// Public verification check for business
router.get("/businesses/:id/public", async (req: Request, res: Response) => {
  try {
    const business = await IdentityVerificationService.getPublicBusiness(req.params.id as string);
    res.json({ success: true, business });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
});

// All subsequent verification routes require active authentication
router.use(authenticate);

// Authoritative verification overview for user and their businesses
router.get("/me", async (req: Request, res: Response) => {
  try {
    const result = await IdentityVerificationService.getMyVerifications((req as any).user.id);
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
});

// Advertiser & Verification eligibility evaluation
router.get("/eligibility", async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const selectedBusinessId = req.query.businessId as string | undefined;
    const eligibility = await IdentityVerificationService.getEligibility(userId, selectedBusinessId);
    res.json({ success: true, eligibility });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
});

// Personal Identity Verification Submission
router.post("/personal/submit", async (req: Request, res: Response) => {
  try {
    const application = await IdentityVerificationService.submitPersonal((req as any).user.id, req.body);
    res.status(201).json({ success: true, application });
  } catch (error: any) {
    res.status(error.status || 400).json({ success: false, error: error.message });
  }
});

// Personal Verification Document Upload
router.post(
  "/personal/documents",
  uploadSecureDocumentMiddleware.single("document"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file || !req.body.applicationId) {
        res.status(400).json({ success: false, error: "Document file and applicationId are required." });
        return;
      }
      const document = await IdentityVerificationService.uploadPersonalDocument(
        (req as any).user.id,
        String(req.body.applicationId),
        req.file,
        (req.body.documentType || "PASSPORT") as DocumentType,
        req.body.documentNumber ? String(req.body.documentNumber) : undefined,
        req.body.countryCode ? String(req.body.countryCode) : undefined
      );
      res.status(201).json({ success: true, document });
    } catch (error: any) {
      res.status(error.status || 400).json({ success: false, error: error.message });
    }
  }
);

// Business Management & Verification
// Verification Requirements
router.get("/requirements", async (req: Request, res: Response) => {
  try {
    const subjectType = (req.query.subjectType === "INDIVIDUAL" ? "INDIVIDUAL" : "BUSINESS") as "BUSINESS" | "INDIVIDUAL";
    const country = String(req.query.country || "IN");
    const businessType = req.query.businessType ? String(req.query.businessType) : undefined;
    const requirements = await IdentityVerificationService.getRequirements(subjectType, country, businessType);
    res.json({ success: true, requirements });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, error: error.message });
  }
});

// Business Management & Verification
router.post("/businesses", async (req: Request, res: Response) => {
  try {
    const business = await IdentityVerificationService.createBusiness((req as any).user.id, req.body);
    res.status(201).json({ success: true, business });
  } catch (error: any) {
    res.status(error.status || 400).json({ success: false, error: error.message });
  }
});

router.patch("/businesses/:id", async (req: Request, res: Response) => {
  try {
    const business = await IdentityVerificationService.updateBusiness(
      (req as any).user.id,
      req.params.id as string,
      req.body
    );
    res.json({ success: true, business });
  } catch (error: any) {
    res.status(error.status || 400).json({ success: false, error: error.message });
  }
});

// Get business application with draft details and uploaded evidence
router.get("/businesses/:id/application", async (req: Request, res: Response) => {
  try {
    const application = await IdentityVerificationService.getBusinessApplication(
      (req as any).user.id,
      req.params.id as string
    );
    res.json({ success: true, ...application });
  } catch (error: any) {
    res.status(error.status || 400).json({ success: false, error: error.message });
  }
});

// Save business verification draft
router.post("/businesses/:id/draft", async (req: Request, res: Response) => {
  try {
    const application = await IdentityVerificationService.saveBusinessDraft(
      (req as any).user.id,
      req.params.id as string,
      req.body
    );
    res.json({ success: true, application });
  } catch (error: any) {
    res.status(error.status || 400).json({ success: false, error: error.message });
  }
});

// Submit business verification
router.post("/businesses/:id/submit", async (req: Request, res: Response) => {
  try {
    const application = await IdentityVerificationService.submitBusiness(
      (req as any).user.id,
      req.params.id as string,
      req.body
    );
    res.status(201).json({ success: true, application });
  } catch (error: any) {
    res.status(error.status || 400).json({ success: false, error: error.message });
  }
});

// Upload business verification document
router.post(
  "/businesses/:id/documents",
  uploadSecureDocumentMiddleware.single("document"),
  async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, error: "Document file is required." });
        return;
      }
      const document = await IdentityVerificationService.uploadBusinessDocument(
        (req as any).user.id,
        req.params.id as string,
        req.body.applicationId ? String(req.body.applicationId) : undefined,
        req.file,
        String(req.body.documentType || "BUSINESS_REGISTRATION_DOCUMENT")
      );
      res.status(201).json({ success: true, document });
    } catch (error: any) {
      res.status(error.status || 400).json({ success: false, error: error.message });
    }
  }
);

// Delete uploaded business verification document
router.delete("/businesses/:id/documents/:docId", async (req: Request, res: Response) => {
  try {
    const result = await IdentityVerificationService.deleteBusinessDocument(
      (req as any).user.id,
      req.params.id as string,
      req.params.docId as string
    );
    res.json({ success: true, ...result });
  } catch (error: any) {
    res.status(error.status || 400).json({ success: false, error: error.message });
  }
});

export default router;
