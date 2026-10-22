import { Router } from "express";
import { authenticate } from "../auth/auth.middleware";
import {
  submitUserPrivacyRequest,
  getMyPrivacyRequests,
  submitCopyrightComplaint,
  getRetentionPolicies,
} from "../controllers/compliance.controller";

const router = Router();

// User data privacy requests (Export, Account Deletion, Rectification)
router.post("/requests", authenticate, submitUserPrivacyRequest);
router.get("/requests/my", authenticate, getMyPrivacyRequests);

// Formal DMCA / Copyright complaint process
router.post("/copyright-complaint", submitCopyrightComplaint);

// Public retention disclosures
router.get("/retention-policies", getRetentionPolicies);

export default router;
