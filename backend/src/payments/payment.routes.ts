import { Router } from "express";
import { authenticate } from "../auth/auth.middleware";
import {
  createPaymentSessionHandler,
  handleWebhookHandler,
} from "./payment.controller";

const router = Router();

// Hosted payment session initialization
router.post("/create-session", authenticate, createPaymentSessionHandler);

// Provider Webhooks (Signature verified inside handler)
router.post("/webhook/:provider", handleWebhookHandler);

export default router;
