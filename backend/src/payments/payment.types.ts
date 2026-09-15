export type PaymentProvider = 'STRIPE' | 'RAZORPAY' | 'MOCK';

export type PaymentStatus =
  | 'PENDING'
  | 'AUTHORIZED'
  | 'CAPTURED'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';

export interface CreatePaymentRequest {
  advertiserId: string;
  userId?: string;
  amount: number;
  currency: string;
  country: string;
  idempotencyKey: string;
  description?: string;
  metadata?: Record<string, any>;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CreatePaymentResponse {
  transactionId: string;
  provider: PaymentProvider;
  providerOrderId?: string;
  providerTransactionId?: string;
  checkoutUrl?: string;
  clientSecret?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
}

export interface RefundPaymentRequest {
  transactionId: string;
  amount?: number;
  reason?: string;
  adminId?: string;
}

export interface RefundPaymentResponse {
  refundId: string;
  transactionId: string;
  amount: number;
  currency: string;
  status: string;
}

export interface WebhookEventResult {
  processed: boolean;
  provider: PaymentProvider;
  eventId: string;
  eventType: string;
  transactionId?: string;
  status?: PaymentStatus;
  message?: string;
}
