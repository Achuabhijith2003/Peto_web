-- =========================================================================
-- Migration 34: Payment Idempotency, Replay Prevention & Atomic Wallet Credit
-- File: docs/database/34_payment_idempotency_and_atomic_credit.sql
-- =========================================================================

-- 1. Ensure provider_transaction_id uniqueness on payment_transactions
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'uq_payment_transactions_provider_tx_id'
    ) THEN
        -- Only add if not already enforced by another unique constraint
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conrelid = 'public.payment_transactions'::regclass 
              AND contype = 'u' 
              AND conkey = ARRAY[(SELECT attnum FROM pg_attribute WHERE attrelid = 'public.payment_transactions'::regclass AND attname = 'provider_transaction_id')]
        ) THEN
            ALTER TABLE public.payment_transactions
            ADD CONSTRAINT uq_payment_transactions_provider_tx_id UNIQUE (provider_transaction_id);
        END IF;
    END IF;
END $$;

-- 2. Indexes for fast authoritative lookup and concurrency locking
CREATE INDEX IF NOT EXISTS idx_payment_tx_order_status ON public.payment_transactions(provider_order_id, status);
CREATE INDEX IF NOT EXISTS idx_payment_tx_prov_tx_id ON public.payment_transactions(provider_transaction_id);

-- 3. Atomic Ad Wallet Crediting Function (Strict Idempotency + Row Lock + Ledger Insert)
CREATE OR REPLACE FUNCTION public.credit_ad_wallet_atomic(
    p_order_id TEXT,
    p_payment_id TEXT,
    p_amount NUMERIC,
    p_currency VARCHAR,
    p_description TEXT DEFAULT NULL
) RETURNS TABLE(
    success BOOLEAN,
    already_processed BOOLEAN,
    balance_before NUMERIC,
    balance_after NUMERIC,
    transaction_id UUID,
    error_message TEXT
) AS $$
DECLARE
    v_tx RECORD;
    v_advertiser RECORD;
    v_current_balance NUMERIC;
    v_new_balance NUMERIC;
    v_credit_amount NUMERIC;
BEGIN
    -- 1. Look up the pending order transaction and lock row FOR UPDATE
    SELECT * INTO v_tx
    FROM public.payment_transactions
    WHERE provider_order_id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        -- Check if already captured by provider_transaction_id (idempotency fallback)
        SELECT * INTO v_tx
        FROM public.payment_transactions
        WHERE provider_transaction_id = p_payment_id
        FOR UPDATE;

        IF FOUND AND v_tx.status = 'CAPTURED' THEN
            SELECT balance INTO v_current_balance FROM public.advertisers WHERE id = v_tx.advertiser_id;
            RETURN QUERY SELECT TRUE, TRUE, v_current_balance, v_current_balance, v_tx.id, NULL::TEXT;
            RETURN;
        END IF;

        RETURN QUERY SELECT FALSE, FALSE, 0.00, 0.00, NULL::UUID, 'Payment transaction record not found'::TEXT;
        RETURN;
    END IF;

    -- 2. Idempotency assertion: if already captured or provider_transaction_id matches
    IF v_tx.status = 'CAPTURED' OR (v_tx.provider_transaction_id IS NOT NULL AND v_tx.provider_transaction_id = p_payment_id) THEN
        SELECT balance INTO v_current_balance FROM public.advertisers WHERE id = v_tx.advertiser_id;
        RETURN QUERY SELECT TRUE, TRUE, v_current_balance, v_current_balance, v_tx.id, NULL::TEXT;
        RETURN;
    END IF;

    -- 3. Assert provider_transaction_id has not already been used by ANY other transaction
    IF EXISTS (
        SELECT 1 FROM public.payment_transactions 
        WHERE provider_transaction_id = p_payment_id AND id != v_tx.id
    ) THEN
        RETURN QUERY SELECT FALSE, FALSE, 0.00, 0.00, v_tx.id, 'Payment ID has already been credited on another transaction'::TEXT;
        RETURN;
    END IF;

    -- 4. Lock advertiser row
    SELECT * INTO v_advertiser
    FROM public.advertisers
    WHERE id = v_tx.advertiser_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, FALSE, 0.00, 0.00, v_tx.id, 'Advertiser record not found'::TEXT;
        RETURN;
    END IF;

    -- 5. Calculate authoritative credit amount (from server order transaction record)
    v_credit_amount := v_tx.amount;
    v_current_balance := COALESCE(v_advertiser.balance, 0.00);
    v_new_balance := ROUND((v_current_balance + v_credit_amount)::NUMERIC, 2);

    -- 6. Mark transaction CAPTURED
    UPDATE public.payment_transactions
    SET status = 'CAPTURED',
        provider_transaction_id = p_payment_id,
        completed_at = now()
    WHERE id = v_tx.id;

    -- 7. Update advertiser balance
    UPDATE public.advertisers
    SET balance = v_new_balance,
        updated_at = now()
    WHERE id = v_tx.advertiser_id;

    -- 8. Insert double-entry ledger entry
    INSERT INTO public.payment_ledger (
        advertiser_id,
        transaction_id,
        entry_type,
        amount,
        currency,
        balance_before,
        balance_after,
        description,
        reference_id,
        created_at
    ) VALUES (
        v_tx.advertiser_id,
        v_tx.id,
        'DEPOSIT',
        v_credit_amount,
        COALESCE(v_tx.currency, 'INR'),
        v_current_balance,
        v_new_balance,
        COALESCE(p_description, 'Ad wallet deposit via Razorpay (' || p_payment_id || ')'),
        p_payment_id,
        now()
    );

    RETURN QUERY SELECT TRUE, FALSE, v_current_balance, v_new_balance, v_tx.id, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 4. Permissions
REVOKE ALL ON FUNCTION public.credit_ad_wallet_atomic(TEXT, TEXT, NUMERIC, VARCHAR, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_ad_wallet_atomic(TEXT, TEXT, NUMERIC, VARCHAR, TEXT) TO service_role;
