import { Router } from "express";
import {
  getPublicPolicies,
  getPublicPolicyBySlug,
  getPublicPolicyPdf,
  acknowledgePolicy,
} from "../controllers/publicPolicy.controller";
import { authenticate } from "../auth/auth.middleware";

const router = Router();

// GET /api/policies - list all active published policies
router.get("/", getPublicPolicies);

// GET /api/policies/:slug/pdf - download published policy PDF (supports ?version=)
router.get("/:slug/pdf", getPublicPolicyPdf);

// GET /api/policies/:slug/versions/:version/pdf - specific version PDF
router.get("/:slug/versions/:version/pdf", (req, res) => {
  req.query.version = req.params.version;
  return getPublicPolicyPdf(req, res);
});

// GET /api/policies/:slug/versions/:version - specific historical version
router.get("/:slug/versions/:version", (req, res) => {
  req.query.version = req.params.version;
  return getPublicPolicyBySlug(req, res);
});

// GET /api/policies/:slug - get active published policy by slug or type
router.get("/:slug", getPublicPolicyBySlug);

// POST /api/policies/:slug/acknowledge - record user acknowledgement
router.post("/:slug/acknowledge", authenticate, acknowledgePolicy);

export default router;
