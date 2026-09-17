-- =========================================================================
-- Migration 24: Billing Currency Governance & Atomic Financial Ledger
-- File: docs/database/24_billing_currency_and_atomic_ledger.sql
-- =========================================================================

-- 1. Ensure advertisers has currency column and non-negative balance constraint
ALTER TABLE public.advertisers 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS is_currency_locked BOOLEAN NOT NULL DEFAULT TRUE;

-- Add check constraint to strictly disallow negative balance
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_advertisers_balance_non_negative'
    ) THEN
        ALTER TABLE public.advertisers 
        ADD CONSTRAINT chk_advertisers_balance_non_negative CHECK (balance >= 0);
    END IF;
END $$;

-- 2. Ensure ad_campaigns has currency column
ALTER TABLE public.ad_campaigns 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'USD';

-- 3. Ensure ad_analytics_daily has currency column for explicit monetary attribution
ALTER TABLE public.ad_analytics_daily 
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) NOT NULL DEFAULT 'USD';

-- 4. Extend payment_ledger with full double-entry auditing fields
ALTER TABLE public.payment_ledger 
ADD COLUMN IF NOT EXISTS balance_before NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES public.ad_campaigns(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reference_id TEXT,
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(14, 6),
ADD COLUMN IF NOT EXISTS original_amount NUMERIC(12, 2),
ADD COLUMN IF NOT EXISTS original_currency VARCHAR(3);

CREATE INDEX IF NOT EXISTS idx_payment_ledger_campaign ON public.payment_ledger(campaign_id);
CREATE INDEX IF NOT EXISTS idx_payment_ledger_ref ON public.payment_ledger(reference_id);

-- 5. Atomic Ad Spend Deduction Function (Row Lock + Balance Check + Ledger Insert)
CREATE OR REPLACE FUNCTION public.deduct_ad_spend_atomic(
    p_advertiser_id UUID,
    p_campaign_id UUID,
    p_amount NUMERIC,
    p_currency VARCHAR,
    p_description TEXT,
    p_reference_id TEXT
) RETURNS TABLE(
    success BOOLEAN,
    balance_before NUMERIC,
    balance_after NUMERIC,
    error_message TEXT
) AS $$
DECLARE
    v_current_balance NUMERIC;
    v_new_balance NUMERIC;
BEGIN
    -- Acquire exclusive row lock on advertiser record to serialize concurrent billing events
    SELECT balance INTO v_current_balance 
    FROM public.advertisers 
    WHERE id = p_advertiser_id 
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 0.00, 0.00, 'Advertiser record not found'::TEXT;
        RETURN;
    END IF;

    -- Validate sufficient balance
    IF v_current_balance < p_amount THEN
        RETURN QUERY SELECT FALSE, v_current_balance, v_current_balance, 'Insufficient wallet balance'::TEXT;
        RETURN;
    END IF;

    v_new_balance := ROUND((v_current_balance - p_amount)::NUMERIC, 2);

    -- Update balance and cumulative spend atomically
    UPDATE public.advertisers 
    SET balance = v_new_balance, 
        total_spend = ROUND((COALESCE(total_spend, 0) + p_amount)::NUMERIC, 2), 
        updated_at = now() 
    WHERE id = p_advertiser_id;

    -- Update campaign spent
    IF p_campaign_id IS NOT NULL THEN
        UPDATE public.ad_campaigns
        SET spent = ROUND((COALESCE(spent, 0) + p_amount)::NUMERIC, 2),
            updated_at = now()
        WHERE id = p_campaign_id;
    END IF;

    -- Insert immutable double-entry ledger record
    INSERT INTO public.payment_ledger (
        advertiser_id,
        campaign_id,
        entry_type,
        amount,
        currency,
        balance_before,
        balance_after,
        description,
        reference_id,
        created_at
    ) VALUES (
        p_advertiser_id,
        p_campaign_id,
        'AD_SPEND',
        -p_amount,
        UPPER(p_currency),
        v_current_balance,
        v_new_balance,
        p_description,
        p_reference_id,
        now()
    );

    RETURN QUERY SELECT TRUE, v_current_balance, v_new_balance, NULL::TEXT;
END;
$$ LANGUAGE plpgsql;
