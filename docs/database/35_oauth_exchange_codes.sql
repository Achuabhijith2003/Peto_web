-- =========================================================================
-- Migration 35: Ephemeral OAuth Exchange Codes (PETO-SEC-12)
-- File: docs/database/35_oauth_exchange_codes.sql
-- =========================================================================

-- 1. Create table for short-lived, hashed OAuth sync code exchange
CREATE TABLE IF NOT EXISTS public.oauth_exchange_codes (
    code_hash VARCHAR(64) PRIMARY KEY,
    payload JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Index for fast expiration sweeps
CREATE INDEX IF NOT EXISTS idx_oauth_exchange_codes_expires_at 
ON public.oauth_exchange_codes(expires_at);

-- 3. Atomic consumption function: single-use, returns payload if valid & unexpired, then deletes
CREATE OR REPLACE FUNCTION public.consume_oauth_exchange_code(p_code_hash VARCHAR)
RETURNS JSONB AS $$
DECLARE
    v_payload JSONB;
BEGIN
    DELETE FROM public.oauth_exchange_codes
    WHERE code_hash = p_code_hash
      AND expires_at > now()
    RETURNING payload INTO v_payload;

    -- Opportunistic cleanup of expired codes
    DELETE FROM public.oauth_exchange_codes WHERE expires_at < now();

    RETURN v_payload;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Secure permissions (only service_role backend can access/execute)
REVOKE ALL ON TABLE public.oauth_exchange_codes FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_oauth_exchange_code(VARCHAR) FROM PUBLIC;

GRANT ALL ON TABLE public.oauth_exchange_codes TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_oauth_exchange_code(VARCHAR) TO service_role;
