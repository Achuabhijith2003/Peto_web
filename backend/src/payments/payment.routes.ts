import { Router } from "express";
import { authenticate } from "../auth/auth.middleware";
import {
  createPaymentSessionHandler,
  handleWebhookHandler,
  createRazorpayOrderHandler,
  verifyRazorpayPaymentHandler,
} from "./payment.controller";

const router = Router();

// Hosted payment session initialization
router.post("/create-session", authenticate, createPaymentSessionHandler);

// Razorpay Indian Payments Integration (UPI, Cards, Netbanking)
router.post("/razorpay/order", authenticate, createRazorpayOrderHandler);
router.post("/razorpay/create-order", authenticate, createRazorpayOrderHandler);
router.post("/razorpay/verify", authenticate, verifyRazorpayPaymentHandler);

// Provider Webhooks (Signature verified inside handler)
router.post("/webhook/:provider", handleWebhookHandler);

export default router;
