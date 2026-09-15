import { Request } from "express";
import crypto from "crypto";
import { supabase } from "../config/supabase";
import { PaymentRouter } from "./payment.router";
import {
  CreatePaymentRequest,
  CreatePaymentResponse,
  RefundPaymentRequest,
  RefundPaymentResponse,
  WebhookEventResult,
  PaymentProvider,
} from "./payment.types";
import { createAuditLog } from "../admin/services/adminAudit.service";
import { createNotification } from "../notifications/notification.service";

export class PaymentService {
  /**
   * Initialize a new tokenized/hosted payment session with server-side idempotency
   */
  static async createPayment(
    request: CreatePaymentRequest,
    req?: Request
  ): Promise<CreatePaymentResponse> {
    if (!request.amount || request.amount <= 0) {
      const error: any = new Error("Payment amount must be greater than zero.");
      error.status = 400;
      throw error;
    }

    const idempotencyKey =
      request.idempotencyKey ||
      `tx_${crypto.randomBytes(16).toString("hex")}`;

    // 1. Check if transaction with this idempotency key already exists
    try {
      const { data: existing } = await supabase
        .from("payment_transactions")
        .select("*")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (existing) {
        return {
          transactionId: existing.id,
          provider: existing.provider as PaymentProvider,
          providerOrderId: existing.provider_order_id,
          providerTransactionId: existing.provider_transaction_id,
          amount: parseFloat(existing.amount),
          currency: existing.currency,
          status: existing.status,
        };
      }
    } catch {
      // Continue if table doesn't have it
    }

    // 2. Select optimal provider via PaymentRouter
    const { adapter, resolvedProvider, currency } =
      await PaymentRouter.selectProvider(
        request.country,
        request.currency,
        (request.metadata?.preferred_provider as PaymentProvider) || undefined
      );

    const transactionId = `tx_${crypto.randomUUID()}`;

    // 3. Create initial pending record in database
    try {
      await supabase.from("payment_transactions").insert({
        id: transactionId,
        advertiser_id: request.advertiserId || null,
        user_id: request.userId || null,
        provider: resolvedProvider,
        idempotency_key: idempotencyKey,
        amount: request.amount,
        currency,
        country: request.country.toUpperCase(),
        status: "PENDING",
        description: request.description || "Advertising Budget Top-Up",
        metadata: request.metadata || {},
      });
    } catch {
      // Fallback
    }

    // 4. Invoke provider adapter
    const session = await adapter.createPaymentSession(transactionId, {
      ...request,
      currency,
    });

    // 5. Update transaction with provider references
    try {
      await supabase
        .from("payment_transactions")
        .update({
          provider_order_id: session.providerOrderId || null,
          provider_transaction_id: session.providerTransactionId || null,
        })
        .eq("id", transactionId);
    } catch {
      // Non-blocking update
    }

    return session;
  }

  /**
   * Process incoming provider webhooks with strict idempotency and replay protection
   */
  static async handleWebhook(
    provider: PaymentProvider,
    headers: Record<string, any>,
    rawBody: any
  ): Promise<WebhookEventResult> {
    const adapter = PaymentRouter.getAdapter(provider);

    // 1. Verify Cryptographic Signature
    const isValid = adapter.verifyWebhookSignature(headers, rawBody);
    if (!isValid) {
      const error: any = new Error(`Invalid ${provider} webhook signature.`);
      error.status = 400;
      throw error;
    }

    // 2. Parse Event
    const parsed = adapter.parseWebhookEvent(rawBody);

    // 3. Replay Protection: Check if event was already processed
    try {
      const { data: existingEvent } = await supabase
        .from("payment_webhooks")
        .select("id, processed")
        .eq("provider", provider)
        .eq("event_id", parsed.eventId)
        .maybeSingle();

      if (existingEvent && existingEvent.processed) {
        return {
          processed: true,
          provider,
          eventId: parsed.eventId,
          eventType: parsed.eventType,
          message: "Event already processed (idempotent duplicate).",
        };
      }

      if (!existingEvent) {
        await supabase.from("payment_webhooks").insert({
          provider,
          event_id: parsed.eventId,
          event_type: parsed.eventType,
          idempotency_key: parsed.idempotencyKey,
          payload: typeof rawBody === "object" ? rawBody : {},
          processed: false,
        });
      }
    } catch {
      // Non-blocking webhook record creation
    }

    // 4. Update Transaction Status & Ledger on Capture
    if (parsed.status === "CAPTURED" && parsed.transactionId) {
      try {
        const { data: tx } = await supabase
          .from("payment_transactions")
          .select("*")
          .eq("id", parsed.transactionId)
          .maybeSingle();

        if (tx && tx.status !== "CAPTURED") {
          const now = new Date().toISOString();

          // Mark transaction as captured
          await supabase
            .from("payment_transactions")
            .update({
              status: "CAPTURED",
              completed_at: now,
              provider_transaction_id:
                parsed.providerTransactionId || tx.provider_transaction_id,
            })
            .eq("id", tx.id);

          // Credit Advertiser balance and ledger
          if (tx.advertiser_id) {
            const { data: adv } = await supabase
              .from("advertisers")
              .select("id, balance, user_id, company_name")
              .eq("id", tx.advertiser_id)
              .maybeSingle();

            if (adv) {
              const currentBalance = parseFloat(adv.balance || "0");
              const depositAmount = parseFloat(tx.amount || parsed.amount || "0");
              const newBalance = currentBalance + depositAmount;

              // Update advertiser balance
              await supabase
                .from("advertisers")
                .update({ balance: newBalance })
                .eq("id", adv.id);

              // Record entry in double-entry ledger
              await supabase.from("payment_ledger").insert({
                advertiser_id: adv.id,
                transaction_id: tx.id,
                entry_type: "DEPOSIT",
                amount: depositAmount,
                currency: tx.currency,
                balance_after: newBalance,
                description: `Prepaid wallet deposit via ${provider}`,
              });

              // Notify advertiser user
              if (adv.user_id) {
                await createNotification({
                  recipientId: adv.user_id,
                  type: "mention",
                  message: `Your advertising budget deposit of ${tx.currency} ${depositAmount.toFixed(2)} was received successfully.`,
                }).catch(() => {});
              }
            }
          }
        }
      } catch (err: any) {
        console.error(`[PaymentService] Error executing capture settlement:`, err.message);
      }
    }

    // Mark webhook as processed
    try {
      await supabase
        .from("payment_webhooks")
        .update({
          processed: true,
          processed_at: new Date().toISOString(),
        })
        .eq("provider", provider)
        .eq("event_id", parsed.eventId);
    } catch {
      // Non-blocking
    }

    return {
      processed: true,
      provider,
      eventId: parsed.eventId,
      eventType: parsed.eventType,
      transactionId: parsed.transactionId,
      status: parsed.status,
    };
  }

  /**
   * Refund an existing transaction (Admin or system initiated)
   */
  static async refundPayment(
    request: RefundPaymentRequest,
    req?: Request
  ): Promise<RefundPaymentResponse> {
    const { data: tx, error: txError } = await supabase
      .from("payment_transactions")
      .select("*")
      .eq("id", request.transactionId)
      .single();

    if (txError || !tx) {
      const error: any = new Error("Transaction not found.");
      error.status = 404;
      throw error;
    }

    if (tx.status !== "CAPTURED") {
      const error: any = new Error("Only captured transactions can be refunded.");
      error.status = 400;
      throw error;
    }

    const refundAmount = request.amount || parseFloat(tx.amount);
    const adapter = PaymentRouter.getAdapter(tx.provider as PaymentProvider);

    // Call provider refund API
    const providerRefund = await adapter.refundPayment(
      tx.provider_transaction_id || tx.id,
      refundAmount,
      request.reason
    );

    const now = new Date().toISOString();

    // 1. Record refund record
    const refundId = `rfnd_${crypto.randomUUID()}`;
    await supabase.from("payment_refunds").insert({
      id: refundId,
      transaction_id: tx.id,
      provider: tx.provider,
      provider_refund_id: providerRefund.refundId,
      amount: refundAmount,
      currency: tx.currency,
      reason: request.reason || "Administrative refund",
      status: "COMPLETED",
      admin_id: request.adminId || null,
    });

    // 2. Update transaction status
    await supabase
      .from("payment_transactions")
      .update({
        status: "REFUNDED",
        refunded_at: now,
      })
      .eq("id", tx.id);

    // 3. Deduct from advertiser balance and record ledger entry
    if (tx.advertiser_id) {
      const { data: adv } = await supabase
        .from("advertisers")
        .select("id, balance")
        .eq("id", tx.advertiser_id)
        .maybeSingle();

      if (adv) {
        const currentBalance = parseFloat(adv.balance || "0");
        const newBalance = Math.max(0, currentBalance - refundAmount);

        await supabase
          .from("advertisers")
          .update({ balance: newBalance })
          .eq("id", adv.id);

        await supabase.from("payment_ledger").insert({
          advertiser_id: adv.id,
          transaction_id: tx.id,
          entry_type: "REFUND",
          amount: -refundAmount,
          currency: tx.currency,
          balance_after: newBalance,
          description: `Refund processed: ${request.reason || "Customer refund"}`,
        });
      }
    }

    // 4. Audit log
    await createAuditLog(
      {
        adminId: request.adminId,
        action: "REFUND_PAYMENT",
        resourceType: "PAYMENT_TRANSACTION",
        resourceId: tx.id,
        details: {
          transactionId: tx.id,
          refundAmount,
          currency: tx.currency,
          provider: tx.provider,
          reason: request.reason,
        },
      },
      req
    );

    return {
      refundId,
      transactionId: tx.id,
      amount: refundAmount,
      currency: tx.currency,
      status: "COMPLETED",
    };
  }

  /**
   * Query transactions with pagination and filters
   */
  static async getTransactions(filters: {
    advertiserId?: string;
    status?: string;
    provider?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    let query = supabase
      .from("payment_transactions")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (filters.advertiserId) {
      query = query.eq("advertiser_id", filters.advertiserId);
    }
    if (filters.status && filters.status !== "ALL") {
      query = query.eq("status", filters.status);
    }
    if (filters.provider && filters.provider !== "ALL") {
      query = query.eq("provider", filters.provider);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      transactions: data || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    };
  }
}
