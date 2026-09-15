-- =========================================================================
-- Migration 20: Peto Global Payment Architecture & Financial Ledger
-- File: docs/database/20_payment_architecture.sql
-- =========================================================================

-- 1. Payment Customers Table (Tokenized provider references)
CREATE TABLE IF NOT EXISTS public.payment_customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    advertiser_id UUID REFERENCES public.advertisers(id) ON DELETE SET NULL,
    provider VARCHAR(50) NOT NULL, -- 'STRIPE', 'RAZORPAY'
    provider_customer_id TEXT NOT NULL,
    email TEXT NOT NULL,
    country VARCHAR(2) DEFAULT 'US',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_payment_customer_provider_id UNIQUE (provider, provider_customer_id),
    CONSTRAINT uq_payment_customer_user_provider UNIQUE (user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_payment_customers_user_id ON public.payment_customers(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_customers_adv_id ON public.payment_customers(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_payment_customers_provider ON public.payment_customers(provider, provider_customer_id);

-- 2. Tokenized Payment Methods Table (NEVER storing raw PAN or CVV)
CREATE TABLE IF NOT EXISTS public.payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID NOT NULL REFERENCES public.payment_customers(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_payment_method_id TEXT NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'card', -- 'card', 'upi', 'netbanking'
    brand VARCHAR(50), -- 'visa', 'mastercard', 'amex', etc.
    last4 VARCHAR(4),
    exp_month INT,
    exp_year INT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_payment_method_provider UNIQUE (provider, provider_payment_method_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_methods_customer ON public.payment_methods(customer_id);

-- 3. Payment Transactions Table (State confirmed server-side only)
CREATE TABLE IF NOT EXISTS public.payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advertiser_id UUID REFERENCES public.advertisers(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    provider VARCHAR(50) NOT NULL, -- 'STRIPE', 'RAZORPAY'
    provider_transaction_id TEXT UNIQUE,
    provider_order_id TEXT,
    idempotency_key TEXT UNIQUE NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    country VARCHAR(2) NOT NULL DEFAULT 'US',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'
    payment_method_type VARCHAR(50) DEFAULT 'card',
    description TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ,
    refunded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payment_tx_status ON public.payment_transactions(status);
CREATE INDEX IF NOT EXISTS idx_payment_tx_adv_id ON public.payment_transactions(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_provider ON public.payment_transactions(provider, provider_transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_tx_idempotency ON public.payment_transactions(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_payment_tx_created ON public.payment_transactions(created_at DESC);

-- 4. Payment Refunds Table
CREATE TABLE IF NOT EXISTS public.payment_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.payment_transactions(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    provider_refund_id TEXT UNIQUE,
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    reason TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'COMPLETED', -- 'PENDING', 'COMPLETED', 'FAILED'
    admin_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_refunds_tx ON public.payment_refunds(transaction_id);

-- 5. Payment Webhooks Table (Strict deduplication & replay prevention)
CREATE TABLE IF NOT EXISTS public.payment_webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,
    event_id TEXT NOT NULL,
    event_type TEXT NOT NULL,
    idempotency_key TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_payment_webhooks_provider_event UNIQUE (provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_webhooks_provider ON public.payment_webhooks(provider, event_id);
CREATE INDEX IF NOT EXISTS idx_payment_webhooks_processed ON public.payment_webhooks(processed);

-- 6. Payment Financial Ledger Table (Double-entry balance tracking)
CREATE TABLE IF NOT EXISTS public.payment_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advertiser_id UUID NOT NULL REFERENCES public.advertisers(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES public.payment_transactions(id) ON DELETE SET NULL,
    entry_type VARCHAR(50) NOT NULL, -- 'DEPOSIT', 'AD_SPEND', 'REFUND', 'PROMOTIONAL_CREDIT', 'ADJUSTMENT'
    amount NUMERIC(12, 2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    balance_after NUMERIC(12, 2) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_ledger_adv ON public.payment_ledger(advertiser_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_ledger_tx ON public.payment_ledger(transaction_id);

-- 7. Row Level Security (RLS)
ALTER TABLE public.payment_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_payment_customers" ON public.payment_customers FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_payment_methods" ON public.payment_methods FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_payment_transactions" ON public.payment_transactions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_payment_refunds" ON public.payment_refunds FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_payment_webhooks" ON public.payment_webhooks FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_all_payment_ledger" ON public.payment_ledger FOR ALL USING (auth.role() = 'service_role');
