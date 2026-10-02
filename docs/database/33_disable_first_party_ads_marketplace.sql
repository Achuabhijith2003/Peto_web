-- ==============================================================================
-- PETO PLATFORM — RELEASE: TEMPORARILY DISABLE FIRST-PARTY ADS MARKETPLACE
-- Migration 33: Disable Peto Ads Marketplace by default while preserving
-- Google AdSense (Web), Google AdMob (Mobile), and Business/Person Verification.
-- ==============================================================================

-- 1. Extend public.ad_system_controls with explicit feature flag columns
ALTER TABLE public.ad_system_controls
    ADD COLUMN IF NOT EXISTS peto_ads_marketplace_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS google_adsense_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS google_admob_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Update singleton GLOBAL_CONTROLS record
-- Explicitly disable first-party marketplace while preserving external Google ads
UPDATE public.ad_system_controls
SET 
    peto_ads_marketplace_enabled = FALSE,
    internal_ads_enabled = FALSE,
    google_adsense_enabled = TRUE,
    google_admob_enabled = TRUE,
    web_ads_enabled = TRUE,
    admob_enabled = TRUE,
    all_ads_enabled = TRUE,
    external_ads_enabled = TRUE,
    updated_at = NOW()
WHERE id = 'GLOBAL_CONTROLS';

-- 3. If GLOBAL_CONTROLS does not exist yet, insert with current release defaults
INSERT INTO public.ad_system_controls (
    id,
    all_ads_enabled,
    internal_ads_enabled,
    peto_ads_marketplace_enabled,
    external_ads_enabled,
    google_adsense_enabled,
    google_admob_enabled,
    web_ads_enabled,
    admob_enabled,
    ad_environment
)
VALUES (
    'GLOBAL_CONTROLS',
    TRUE,
    FALSE,
    FALSE,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    TRUE,
    'DEVELOPMENT'
)
ON CONFLICT (id) DO UPDATE SET
    peto_ads_marketplace_enabled = FALSE,
    internal_ads_enabled = FALSE;

-- 4. Notify PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
