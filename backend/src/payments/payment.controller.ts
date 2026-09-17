import { Request, Response } from "express";
import crypto from "crypto";
import { PaymentService } from "./payment.service";
import { PaymentProvider } from "./payment.types";
import { AdminRequest } from "../admin/middleware/adminAuth.middleware";
import { resolveCountryFromRequest } from "../regions/regional.service";
import { supabase } from "../config/supabase";
import { AdvertiserService } from "../advertisers/advertiser.service";

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

/**
 * Create a Razorpay Order for Indian / Regional Users
 * POST /api/payments/razorpay/order
 */
export async function createRazorpayOrderHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: "Authentication required" });
      return;
    }

    const advertiser = await AdvertiserService.getAdvertiserByUserId(userId);
    if (!advertiser) {
      res.status(404).json({ success: false, error: "Advertiser profile not found. Please register first." });
      return;
    }

    const { amount } = req.body;
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      res.status(400).json({ success: false, error: "Deposit amount must be greater than zero." });
      return;
    }

    const orderCurrency = (advertiser.currency || req.body.currency || "INR").toUpperCase();

    const keyId = (process.env.RAZORPAY_KEY_ID || "").trim();
    const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
    const isConfigured = Boolean(keyId && keySecret && keyId.startsWith("rzp_"));

    const amountInPaise = Math.round(numAmount * 100);
    const orderReceipt = `rcpt_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
    let orderId = `order_${crypto.randomBytes(8).toString("hex")}`;
    let isSandbox = !isConfigured;

    if (isConfigured) {
      try {
        const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
        const rzpResponse = await fetch("https://api.razorpay.com/v1/orders", {
          method: "POST",
          headers: {
            Authorization: `Basic ${authHeader}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            amount: amountInPaise,
            currency: orderCurrency,
            receipt: orderReceipt,
            notes: {
              userId,
              advertiserId: advertiser.id,
              environment: process.env.NODE_ENV || "development",
            },
          }),
        });

        const rzpData: any = await rzpResponse.json();
        if (rzpData && rzpData.id) {
          orderId = rzpData.id;
          isSandbox = false;
        } else if (rzpData?.error?.description) {
          res.status(400).json({
            success: false,
            error: `Razorpay Gateway Error: ${rzpData.error.description}`,
          });
          return;
        } else {
          console.warn("[Razorpay] Order API fallback, error from gateway:", rzpData);
        }
      } catch (err: any) {
        console.warn("[Razorpay] Order creation API connection fallback:", err.message);
      }
    }

    // Record pending transaction
    const txId = crypto.randomUUID();
    try {
      await supabase.from("payment_transactions").insert({
        id: txId,
        advertiser_id: advertiser.id,
        user_id: userId,
        provider: "RAZORPAY",
        provider_order_id: orderId,
        idempotency_key: `rzp_ord_${orderId}`,
        amount: numAmount,
        currency: orderCurrency,
        country: advertiser.country_code || "IN",
        status: "PENDING",
        description: `Ad Wallet Deposit via Razorpay`,
        metadata: {
          receipt: orderReceipt,
          isSandbox,
        },
      });
    } catch (dbErr: any) {
      console.warn("[PaymentController] Failed to record initial transaction:", dbErr.message);
    }

    res.status(200).json({
      success: true,
      orderId,
      amount: amountInPaise,
      currency: orderCurrency,
      keyId: keyId || "rzp_test_mockkey123",
      isSandbox,
      transactionId: txId,
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || "Failed to initialize Razorpay order.",
    });
  }
}

/**
 * Verify Razorpay Payment Signature and Credit Funds
 * POST /api/payments/razorpay/verify
 */
export async function verifyRazorpayPaymentHandler(req: Request, res: Response): Promise<void> {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      res.status(401).json({ success: false, error: "Authentication required" });
      return;
    }

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
      currency = "INR",
      isSimulated,
    } = req.body;

    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      res.status(400).json({ success: false, error: "Invalid payment amount." });
      return;
    }

    const keySecret = (process.env.RAZORPAY_KEY_SECRET || "").trim();
    const keyId = (process.env.RAZORPAY_KEY_ID || "").trim();
    const isConfigured = Boolean(keyId && keySecret && keyId.startsWith("rzp_"));
    const isTestMode = keyId.startsWith("rzp_test_") || process.env.NODE_ENV !== "production";

    const orderId = (razorpay_order_id || "").trim();
    const paymentId = (razorpay_payment_id || "").trim();
    const signature = (razorpay_signature || "").trim();

    let signatureValid = false;

    // A. If simulated fast test deposit is requested in test/dev mode
    if ((isSimulated || signature === "sandbox_signature") && isTestMode) {
      signatureValid = true;
    } else if (isConfigured && signature && orderId && paymentId) {
      // B. Primary: Real cryptographic HMAC-SHA256 signature verification
      const generatedSignature = crypto
        .createHmac("sha256", keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest("hex");

      if (generatedSignature === signature) {
        signatureValid = true;
      } else {
        console.warn(`[Razorpay] Signature mismatch for order ${orderId}: expected ${generatedSignature}, received ${signature}. Checking directly with Razorpay API...`);
      }
    } else if (!isConfigured) {
      signatureValid = true; // sandbox fallback
    }

    // C. Secondary Fallback: Query Razorpay official API to verify payment state
    if (!signatureValid && isConfigured && paymentId && !paymentId.startsWith("pay_sim_")) {
      try {
        const authHeader = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
        const checkRes = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
          headers: { Authorization: `Basic ${authHeader}` },
        });
        const payData: any = await checkRes.json();

        if (payData && payData.id === paymentId) {
          if (payData.status === "captured") {
            signatureValid = true;
          } else if (payData.status === "authorized") {
            // Auto-capture authorized payment if not yet captured
            const capRes = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/capture`, {
              method: "POST",
              headers: {
                Authorization: `Basic ${authHeader}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                amount: payData.amount,
                currency: payData.currency,
              }),
            });
            const capData: any = await capRes.json();
            if (capData && (capData.status === "captured" || capData.status === "authorized")) {
              signatureValid = true;
            }
          }
        }
      } catch (apiErr: any) {
        console.error("[Razorpay] Direct API verification check failed:", apiErr.message);
      }
    }

    if (!signatureValid) {
      res.status(400).json({
        success: false,
        error: "Payment verification failed: Invalid transaction signature or unverified payment.",
      });
      return;
    }

    // Credit Advertiser Balance using centralized depositFunds
    const paymentRef = paymentId || `pay_sim_${Date.now()}`;
    const result = await AdvertiserService.depositFunds(
      userId,
      numAmount,
      currency,
      `Razorpay (${paymentRef})`
    );

    // Update transaction to CAPTURED in DB
    if (orderId) {
      try {
        await supabase
          .from("payment_transactions")
          .update({
            status: "CAPTURED",
            provider_transaction_id: paymentRef,
            completed_at: new Date().toISOString(),
          })
          .eq("provider_order_id", orderId);
      } catch {
        // Non-blocking
      }
    }

    res.status(200).json({
      success: true,
      balance: result.balance,
      amount: numAmount,
      currency: (currency || "INR").toUpperCase(),
      message: "Razorpay payment verified and credited to advertising wallet.",
    });
  } catch (err: any) {
    res.status(500).json({
      success: false,
      error: err.message || "Failed to verify Razorpay payment.",
    });
  }
}
