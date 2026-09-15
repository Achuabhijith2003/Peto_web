import {
  PaymentProvider,
  PaymentStatus,
  CreatePaymentRequest,
  CreatePaymentResponse,
} from "../payment.types";

export interface WebhookParsedEvent {
  eventId: string;
  eventType: string;
  idempotencyKey: string;
  transactionId?: string;
  providerTransactionId?: string;
  status: PaymentStatus;
  amount?: number;
  currency?: string;
  metadata?: Record<string, any>;
}

export interface PaymentAdapter {
  readonly providerName: PaymentProvider;

  isConfigured(): boolean;

  createPaymentSession(
    transactionId: string,
    request: CreatePaymentRequest
  ): Promise<CreatePaymentResponse>;

  verifyPayment(
    providerTransactionId: string
  ): Promise<{ status: PaymentStatus; amount: number; currency: string }>;

  refundPayment(
    providerTransactionId: string,
    amount: number,
    reason?: string
  ): Promise<{ refundId: string; status: string }>;

  verifyWebhookSignature(headers: Record<string, any>, rawBody: any): boolean;

  parseWebhookEvent(payload: any): WebhookParsedEvent;
}
