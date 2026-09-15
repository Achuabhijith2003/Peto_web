-- =========================================================================
-- Migration 19: Peto Global Regional Monetization Configuration
-- File: docs/database/19_regional_monetization_config.sql
-- =========================================================================

-- 1. Regional Configuration Table
CREATE TABLE IF NOT EXISTS public.regional_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level TEXT NOT NULL DEFAULT 'COUNTRY', -- 'GLOBAL', 'CONTINENT', 'COUNTRY', 'STATE', 'CITY'
    code VARCHAR(30) NOT NULL UNIQUE, -- e.g. 'GLOBAL', 'IN', 'US', 'GB', 'CA', 'AU', 'EU'
    name TEXT NOT NULL,
    continent VARCHAR(50),
    parent_code VARCHAR(30), -- Self-referential hierarchy (e.g. 'US-CA' -> 'US' -> 'NORTH_AMERICA' -> 'GLOBAL')
    
    -- Feature flags per region
    ads_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    advertiser_registration_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    payments_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    creator_monetization_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    communities_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    reels_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Financial & currency settings
    supported_currencies TEXT[] NOT NULL DEFAULT ARRAY['USD']::TEXT[],
    default_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    supported_payment_providers TEXT[] NOT NULL DEFAULT ARRAY['STRIPE']::TEXT[],
    default_payment_provider VARCHAR(50) NOT NULL DEFAULT 'STRIPE',
    
    -- Ad policy & category rules
    allowed_ad_categories TEXT[] NOT NULL DEFAULT ARRAY[
        'PET_FOOD', 'VET_HEALTH', 'PET_ACCESSORIES', 'PET_CARE', 
        'PET_ADOPTION', 'PET_TRAINING', 'SERVICES'
    ]::TEXT[],
    restricted_ad_categories TEXT[] NOT NULL DEFAULT ARRAY[
        'PET_SUPPLEMENTS', 'BREEDING_SERVICES'
    ]::TEXT[],
    prohibited_ad_categories TEXT[] NOT NULL DEFAULT ARRAY[
        'ILLEGAL_WILDLIFE', 'UNTESTED_MEDICATION', 'ANIMAL_FIGHTING', 
        'ADULT_CONTENT', 'GAMBLING', 'WEAPONS', 'COUNTERFEIT'
    ]::TEXT[],
    
    -- External ad network mediation config
    external_ad_networks JSONB NOT NULL DEFAULT '{
        "admob": {"enabled": true, "priority": 1, "floor_cpm": 0.50}
    }'::jsonb,
    
    -- Regional legal and policy references
    policy_references JSONB NOT NULL DEFAULT '{
        "advertising_policy_version": "1.0.0",
        "tax_policy": "standard"
    }'::jsonb,
    
    custom_flags JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    
    updated_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for ultra-fast lookup during user requests
CREATE INDEX IF NOT EXISTS idx_regional_configs_code ON public.regional_configs(code);
CREATE INDEX IF NOT EXISTS idx_regional_configs_level ON public.regional_configs(level);
CREATE INDEX IF NOT EXISTS idx_regional_configs_is_active ON public.regional_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_regional_configs_ads ON public.regional_configs(ads_enabled);
CREATE INDEX IF NOT EXISTS idx_regional_configs_payments ON public.regional_configs(payments_enabled);

-- 2. Seed Core Global & Country Configurations
INSERT INTO public.regional_configs (
    level, code, name, continent, parent_code,
    ads_enabled, advertiser_registration_enabled, payments_enabled, creator_monetization_enabled,
    supported_currencies, default_currency, supported_payment_providers, default_payment_provider,
    allowed_ad_categories, restricted_ad_categories, prohibited_ad_categories,
    external_ad_networks, policy_references
) VALUES 
-- GLOBAL FALLBACK
(
    'GLOBAL', 'GLOBAL', 'Global Default Baseline', 'GLOBAL', NULL,
    TRUE, TRUE, TRUE, FALSE,
    ARRAY['USD', 'EUR', 'GBP', 'INR', 'CAD', 'AUD', 'JPY']::TEXT[], 'USD',
    ARRAY['STRIPE']::TEXT[], 'STRIPE',
    ARRAY['PET_FOOD', 'VET_HEALTH', 'PET_ACCESSORIES', 'PET_CARE', 'PET_ADOPTION', 'PET_TRAINING', 'SERVICES']::TEXT[],
    ARRAY['PET_SUPPLEMENTS', 'BREEDING_SERVICES']::TEXT[],
    ARRAY['ILLEGAL_WILDLIFE', 'UNTESTED_MEDICATION', 'ANIMAL_FIGHTING', 'ADULT_CONTENT', 'GAMBLING', 'WEAPONS', 'COUNTERFEIT']::TEXT[],
    '{"admob": {"enabled": true, "priority": 1, "floor_cpm": 0.50}}'::jsonb,
    '{"advertising_policy_version": "1.0.0", "tax_policy": "standard"}'::jsonb
),

-- INDIA
(
    'COUNTRY', 'IN', 'India', 'ASIA', 'GLOBAL',
    TRUE, TRUE, TRUE, TRUE,
    ARRAY['INR', 'USD']::TEXT[], 'INR',
    ARRAY['RAZORPAY', 'STRIPE']::TEXT[], 'RAZORPAY',
    ARRAY['PET_FOOD', 'VET_HEALTH', 'PET_ACCESSORIES', 'PET_CARE', 'PET_ADOPTION', 'PET_TRAINING', 'SERVICES']::TEXT[],
    ARRAY['PET_SUPPLEMENTS', 'BREEDING_SERVICES']::TEXT[],
    ARRAY['ILLEGAL_WILDLIFE', 'UNTESTED_MEDICATION', 'ANIMAL_FIGHTING', 'ADULT_CONTENT', 'GAMBLING', 'WEAPONS', 'COUNTERFEIT']::TEXT[],
    '{"admob": {"enabled": true, "priority": 1, "floor_cpm": 0.30}}'::jsonb,
    '{"advertising_policy_version": "1.0.0", "tax_policy": "gst_india", "gst_rate": 0.18}'::jsonb
),

-- UNITED STATES
(
    'COUNTRY', 'US', 'United States', 'NORTH_AMERICA', 'GLOBAL',
    TRUE, TRUE, TRUE, TRUE,
    ARRAY['USD']::TEXT[], 'USD',
    ARRAY['STRIPE']::TEXT[], 'STRIPE',
    ARRAY['PET_FOOD', 'VET_HEALTH', 'PET_ACCESSORIES', 'PET_CARE', 'PET_ADOPTION', 'PET_TRAINING', 'SERVICES']::TEXT[],
    ARRAY['PET_SUPPLEMENTS', 'BREEDING_SERVICES']::TEXT[],
    ARRAY['ILLEGAL_WILDLIFE', 'UNTESTED_MEDICATION', 'ANIMAL_FIGHTING', 'ADULT_CONTENT', 'GAMBLING', 'WEAPONS', 'COUNTERFEIT']::TEXT[],
    '{"admob": {"enabled": true, "priority": 1, "floor_cpm": 1.50}}'::jsonb,
    '{"advertising_policy_version": "1.0.0", "tax_policy": "sales_tax_us"}'::jsonb
),

-- UNITED KINGDOM
(
    'COUNTRY', 'GB', 'United Kingdom', 'EUROPE', 'GLOBAL',
    TRUE, TRUE, TRUE, TRUE,
    ARRAY['GBP', 'EUR', 'USD']::TEXT[], 'GBP',
    ARRAY['STRIPE']::TEXT[], 'STRIPE',
    ARRAY['PET_FOOD', 'VET_HEALTH', 'PET_ACCESSORIES', 'PET_CARE', 'PET_ADOPTION', 'PET_TRAINING', 'SERVICES']::TEXT[],
    ARRAY['PET_SUPPLEMENTS', 'BREEDING_SERVICES']::TEXT[],
    ARRAY['ILLEGAL_WILDLIFE', 'UNTESTED_MEDICATION', 'ANIMAL_FIGHTING', 'ADULT_CONTENT', 'GAMBLING', 'WEAPONS', 'COUNTERFEIT']::TEXT[],
    '{"admob": {"enabled": true, "priority": 1, "floor_cpm": 1.20}}'::jsonb,
    '{"advertising_policy_version": "1.0.0", "tax_policy": "vat_uk", "vat_rate": 0.20}'::jsonb
),

-- CANADA
(
    'COUNTRY', 'CA', 'Canada', 'NORTH_AMERICA', 'GLOBAL',
    TRUE, TRUE, TRUE, TRUE,
    ARRAY['CAD', 'USD']::TEXT[], 'CAD',
    ARRAY['STRIPE']::TEXT[], 'STRIPE',
    ARRAY['PET_FOOD', 'VET_HEALTH', 'PET_ACCESSORIES', 'PET_CARE', 'PET_ADOPTION', 'PET_TRAINING', 'SERVICES']::TEXT[],
    ARRAY['PET_SUPPLEMENTS', 'BREEDING_SERVICES']::TEXT[],
    ARRAY['ILLEGAL_WILDLIFE', 'UNTESTED_MEDICATION', 'ANIMAL_FIGHTING', 'ADULT_CONTENT', 'GAMBLING', 'WEAPONS', 'COUNTERFEIT']::TEXT[],
    '{"admob": {"enabled": true, "priority": 1, "floor_cpm": 1.10}}'::jsonb,
    '{"advertising_policy_version": "1.0.0", "tax_policy": "gst_hst_canada"}'::jsonb
),

-- AUSTRALIA
(
    'COUNTRY', 'AU', 'Australia', 'OCEANIA', 'GLOBAL',
    TRUE, TRUE, TRUE, TRUE,
    ARRAY['AUD', 'USD']::TEXT[], 'AUD',
    ARRAY['STRIPE']::TEXT[], 'STRIPE',
    ARRAY['PET_FOOD', 'VET_HEALTH', 'PET_ACCESSORIES', 'PET_CARE', 'PET_ADOPTION', 'PET_TRAINING', 'SERVICES']::TEXT[],
    ARRAY['PET_SUPPLEMENTS', 'BREEDING_SERVICES']::TEXT[],
    ARRAY['ILLEGAL_WILDLIFE', 'UNTESTED_MEDICATION', 'ANIMAL_FIGHTING', 'ADULT_CONTENT', 'GAMBLING', 'WEAPONS', 'COUNTERFEIT']::TEXT[],
    '{"admob": {"enabled": true, "priority": 1, "floor_cpm": 1.00}}'::jsonb,
    '{"advertising_policy_version": "1.0.0", "tax_policy": "gst_australia", "gst_rate": 0.10}'::jsonb
),

-- GERMANY
(
    'COUNTRY', 'DE', 'Germany', 'EUROPE', 'GLOBAL',
    TRUE, TRUE, TRUE, TRUE,
    ARRAY['EUR', 'USD']::TEXT[], 'EUR',
    ARRAY['STRIPE']::TEXT[], 'STRIPE',
    ARRAY['PET_FOOD', 'VET_HEALTH', 'PET_ACCESSORIES', 'PET_CARE', 'PET_ADOPTION', 'PET_TRAINING', 'SERVICES']::TEXT[],
    ARRAY['PET_SUPPLEMENTS', 'BREEDING_SERVICES']::TEXT[],
    ARRAY['ILLEGAL_WILDLIFE', 'UNTESTED_MEDICATION', 'ANIMAL_FIGHTING', 'ADULT_CONTENT', 'GAMBLING', 'WEAPONS', 'COUNTERFEIT']::TEXT[],
    '{"admob": {"enabled": true, "priority": 1, "floor_cpm": 1.20}}'::jsonb,
    '{"advertising_policy_version": "1.0.0", "tax_policy": "vat_de", "vat_rate": 0.19}'::jsonb
),

-- FRANCE
(
    'COUNTRY', 'FR', 'France', 'EUROPE', 'GLOBAL',
    TRUE, TRUE, TRUE, TRUE,
    ARRAY['EUR', 'USD']::TEXT[], 'EUR',
    ARRAY['STRIPE']::TEXT[], 'STRIPE',
    ARRAY['PET_FOOD', 'VET_HEALTH', 'PET_ACCESSORIES', 'PET_CARE', 'PET_ADOPTION', 'PET_TRAINING', 'SERVICES']::TEXT[],
    ARRAY['PET_SUPPLEMENTS', 'BREEDING_SERVICES']::TEXT[],
    ARRAY['ILLEGAL_WILDLIFE', 'UNTESTED_MEDICATION', 'ANIMAL_FIGHTING', 'ADULT_CONTENT', 'GAMBLING', 'WEAPONS', 'COUNTERFEIT']::TEXT[],
    '{"admob": {"enabled": true, "priority": 1, "floor_cpm": 1.15}}'::jsonb,
    '{"advertising_policy_version": "1.0.0", "tax_policy": "vat_fr", "vat_rate": 0.20}'::jsonb
),

-- JAPAN
(
    'COUNTRY', 'JP', 'Japan', 'ASIA', 'GLOBAL',
    TRUE, TRUE, TRUE, TRUE,
    ARRAY['JPY', 'USD']::TEXT[], 'JPY',
    ARRAY['STRIPE']::TEXT[], 'STRIPE',
    ARRAY['PET_FOOD', 'VET_HEALTH', 'PET_ACCESSORIES', 'PET_CARE', 'PET_ADOPTION', 'PET_TRAINING', 'SERVICES']::TEXT[],
    ARRAY['PET_SUPPLEMENTS', 'BREEDING_SERVICES']::TEXT[],
    ARRAY['ILLEGAL_WILDLIFE', 'UNTESTED_MEDICATION', 'ANIMAL_FIGHTING', 'ADULT_CONTENT', 'GAMBLING', 'WEAPONS', 'COUNTERFEIT']::TEXT[],
    '{"admob": {"enabled": true, "priority": 1, "floor_cpm": 1.30}}'::jsonb,
    '{"advertising_policy_version": "1.0.0", "tax_policy": "consumption_tax_jp"}'::jsonb
),

-- BRAZIL
(
    'COUNTRY', 'BR', 'Brazil', 'SOUTH_AMERICA', 'GLOBAL',
    TRUE, TRUE, TRUE, FALSE,
    ARRAY['BRL', 'USD']::TEXT[], 'BRL',
    ARRAY['STRIPE']::TEXT[], 'STRIPE',
    ARRAY['PET_FOOD', 'VET_HEALTH', 'PET_ACCESSORIES', 'PET_CARE', 'PET_ADOPTION', 'PET_TRAINING', 'SERVICES']::TEXT[],
    ARRAY['PET_SUPPLEMENTS', 'BREEDING_SERVICES']::TEXT[],
    ARRAY['ILLEGAL_WILDLIFE', 'UNTESTED_MEDICATION', 'ANIMAL_FIGHTING', 'ADULT_CONTENT', 'GAMBLING', 'WEAPONS', 'COUNTERFEIT']::TEXT[],
    '{"admob": {"enabled": true, "priority": 1, "floor_cpm": 0.40}}'::jsonb,
    '{"advertising_policy_version": "1.0.0", "tax_policy": "standard"}'::jsonb
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    ads_enabled = EXCLUDED.ads_enabled,
    advertiser_registration_enabled = EXCLUDED.advertiser_registration_enabled,
    payments_enabled = EXCLUDED.payments_enabled,
    supported_currencies = EXCLUDED.supported_currencies,
    default_currency = EXCLUDED.default_currency,
    supported_payment_providers = EXCLUDED.supported_payment_providers,
    default_payment_provider = EXCLUDED.default_payment_provider;

-- 3. Row Level Security (RLS)
ALTER TABLE public.regional_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_regional_configs" ON public.regional_configs
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "public_read_regional_configs" ON public.regional_configs
    FOR SELECT USING (is_active = TRUE);
