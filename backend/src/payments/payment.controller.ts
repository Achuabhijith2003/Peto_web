import { Request, Response } from "express";
import { PaymentService } from "./payment.service";
import { PaymentProvider } from "./payment.types";
import { AdminRequest } from "../admin/middleware/adminAuth.middleware";
import { resolveCountryFromRequest } from "../regions/regional.service";

/**
 * Create a new payment session
 * POST /api/payments/create-session
 */
export async function createPaymentSessionHandler(req: Request, res: Response): Promise<void> {
  try {
    const { amount, currency, country, description, successUrl, cancelUrl, advertiserId } = req.body;
    const userId = (req as any).user?.id;

    const detectedCountry = country || resolveCountryFromRequest(req);

    const session = await PaymentService.createPayment(
      {
        advertiserId: advertiserId || (req as any).advertiserId,
        userId,
        amount: Number(amount),
        currency: currency || "USD",
        country: detectedCountry,
        idempotencyKey: req.headers["x-idempotency-key"] as string,
        description,
        successUrl,
        cancelUrl,
      },
      req
    );

    res.status(201).json({
      success: true,
      session,
    });
  } catch (err: any) {
    res.status(err.status || 400).json({
      success: false,
      error: err.message || "Failed to initialize payment session.",
      code: err.code || "PAYMENT_CREATION_FAILED",
    });
  }
}

/**
 * Handle incoming provider webhooks
 * POST /api/payments/webhook/:provider
 */
export async function handleWebhookHandler(req: Request, res: Response): Promise<void> {
  const rawProvider = req.params.provider;
  const provider = (
    Array.isArray(rawProvider) ? rawProvider[0] : rawProvider || ""
  ).toUpperCase() as PaymentProvider;

  try {
    const result = await PaymentService.handleWebhook(provider, req.headers, req.body);
    res.status(200).json({ received: true, ...result });
  } catch (err: any) {
    // Return 400 on signature failure or bad request
    res.status(err.status || 400).json({
      received: false,
      error: err.message || "Webhook processing failed",
    });
  }
}

/**
 * Admin: Refund a transaction
 * POST /api/admin/payments/refund
 */
export async function refundTransactionHandler(req: AdminRequest, res: Response): Promise<void> {
  try {
    const { transactionId, amount, reason } = req.body;
    const adminId = req.admin?.id || req.admin?.userId;

    const result = await PaymentService.refundPayment(
      {
        transactionId,
        amount: amount ? Number(amount) : undefined,
        reason,
        adminId,
      },
      req
    );

    res.json({
      success: true,
      message: "Refund processed successfully.",
      refund: result,
    });
  } catch (err: any) {
    res.status(err.status || 400).json({
      success: false,
      error: err.message || "Failed to process refund.",
    });
  }
}

/**
 * Admin: List transactions
 * GET /api/admin/payments/transactions
 */
export async function getAdminTransactionsHandler(req: AdminRequest, res: Response): Promise<void> {
  try {
    const { advertiserId, status, provider, page, limit } = req.query;

    const result = await PaymentService.getTransactions({
      advertiserId: advertiserId as string,
      status: status as string,
      provider: provider as string,
      page: page ? parseInt(page as string, 10) : 1,
      limit: limit ? parseInt(limit as string, 10) : 20,
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || "Failed to retrieve payment transactions.",
    });
  }
}
