-- ============================================================
-- PETO SYSTEM — POLICY PREVIEW, PUBLISHING, VERSIONING & PDF
-- File: docs/database/26_policy_management_extension.sql
-- ============================================================

-- 1. Extend compliance_policies table with publishing, slug & regional metadata
ALTER TABLE public.compliance_policies 
ADD COLUMN IF NOT EXISTS slug TEXT,
ADD COLUMN IF NOT EXISTS effective_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS superseded_policy_id UUID REFERENCES public.compliance_policies(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS requires_acknowledgement BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS region_code TEXT DEFAULT 'GLOBAL',
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- 2. Populate default slugs for existing types
UPDATE public.compliance_policies
SET slug = CASE policy_type
    WHEN 'TERMS_OF_SERVICE' THEN 'terms-of-service'
    WHEN 'PRIVACY_POLICY' THEN 'privacy-policy'
    WHEN 'COMMUNITY_GUIDELINES' THEN 'community-guidelines'
    WHEN 'CONTENT_POLICY' THEN 'content-policy'
    WHEN 'ADVERTISING_POLICY' THEN 'advertising-policy'
    WHEN 'COOKIE_POLICY' THEN 'cookie-policy'
    ELSE lower(replace(policy_type, '_', '-'))
END
WHERE slug IS NULL;

-- 3. Backfill effective_date with published_at or created_at if null
UPDATE public.compliance_policies
SET effective_date = COALESCE(published_at, created_at, now())
WHERE effective_date IS NULL;

-- 4. Create indexes for rapid public resolution and version history lookups
CREATE INDEX IF NOT EXISTS idx_compliance_policies_slug_status 
ON public.compliance_policies(slug, status);

CREATE INDEX IF NOT EXISTS idx_compliance_policies_type_status_ver 
ON public.compliance_policies(policy_type, status, version);

CREATE INDEX IF NOT EXISTS idx_compliance_policies_region 
ON public.compliance_policies(region_code);

-- 5. User Policy Acknowledgements Table
CREATE TABLE IF NOT EXISTS public.compliance_policy_acknowledgements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    policy_id UUID NOT NULL REFERENCES public.compliance_policies(id) ON DELETE CASCADE,
    policy_type TEXT NOT NULL,
    version TEXT NOT NULL,
    acknowledged_at TIMESTAMPTZ DEFAULT now(),
    ip_address TEXT,
    user_agent TEXT,
    CONSTRAINT uq_user_policy_acknowledgement UNIQUE (user_id, policy_type, version)
);

CREATE INDEX IF NOT EXISTS idx_policy_ack_user ON public.compliance_policy_acknowledgements(user_id);
CREATE INDEX IF NOT EXISTS idx_policy_ack_policy ON public.compliance_policy_acknowledgements(policy_id);
