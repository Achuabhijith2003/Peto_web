-- =========================================================================
-- Migration 12: Peto User Management Account Status & Audit Tracking
-- =========================================================================

-- 1. Extend profiles table with account lifecycle status fields
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
        CHECK (status IN ('ACTIVE', 'SUSPENDED', 'BANNED', 'DEACTIVATED', 'DELETED')),
    ADD COLUMN IF NOT EXISTS status_reason TEXT,
    ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS suspended_until TIMESTAMPTZ;

-- 2. Performance indexes for user management queries & filtering
CREATE INDEX IF NOT EXISTS idx_profiles_status 
    ON public.profiles(status);

CREATE INDEX IF NOT EXISTS idx_profiles_verified 
    ON public.profiles(verified);

CREATE INDEX IF NOT EXISTS idx_profiles_created 
    ON public.profiles(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_profiles_username_lower 
    ON public.profiles(LOWER(username));

-- 3. Comments describing field semantics
COMMENT ON COLUMN public.profiles.status IS 'Account status: ACTIVE, SUSPENDED, BANNED, DEACTIVATED, DELETED';
COMMENT ON COLUMN public.profiles.status_reason IS 'Administrative explanation or justification for suspension/ban/deactivation';
COMMENT ON COLUMN public.profiles.status_updated_at IS 'Timestamp when account status was last altered by admin';
COMMENT ON COLUMN public.profiles.suspended_until IS 'Optional expiration timestamp for temporary suspensions';
