-- =========================================================================
-- Migration 25: Unified Ads Control Center, External Providers & Analytics
-- File: docs/database/25_unified_ads_control_and_analytics.sql
-- =========================================================================

-- 1. Unified Ad System Controls (Singleton Governance Table)
CREATE TABLE IF NOT EXISTS public.ad_system_controls (
    id VARCHAR(30) PRIMARY KEY DEFAULT 'GLOBAL_CONTROLS',
    
    -- Global Kill Switches
    all_ads_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    internal_ads_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    external_ads_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Individual External Provider Kill Switches
    admob_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    web_ads_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Platform Switches
    web_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    android_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ios_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Placement Switches
    feed_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    reels_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    community_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    explore_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    
    -- Emergency Kill Switch Controls
    emergency_stop_active BOOLEAN NOT NULL DEFAULT FALSE,
    emergency_stop_scope VARCHAR(50) DEFAULT 'NONE', -- 'ALL', 'INTERNAL', 'EXTERNAL', 'NONE'
    emergency_stop_reason TEXT,
    emergency_stop_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
    emergency_stop_at TIMESTAMPTZ,
    
    -- Environment governance
    ad_environment VARCHAR(20) NOT NULL DEFAULT 'DEVELOPMENT', -- 'DEVELOPMENT', 'STAGING', 'PRODUCTION'
    
    updated_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed initial singleton record
INSERT INTO public.ad_system_controls (id, ad_environment)
VALUES ('GLOBAL_CONTROLS', 'DEVELOPMENT')
ON CONFLICT (id) DO NOTHING;

-- 2. External Provider Configurations Table
CREATE TABLE IF NOT EXISTS public.ad_provider_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL, -- 'ADMOB', 'ADSENSE', 'AD_MANAGER'
    platform VARCHAR(20) NOT NULL, -- 'ANDROID', 'IOS', 'WEB'
    environment VARCHAR(20) NOT NULL DEFAULT 'DEVELOPMENT', -- 'DEVELOPMENT', 'STAGING', 'PRODUCTION'
    app_id VARCHAR(100),
    ad_unit_id VARCHAR(100) NOT NULL,
    placement VARCHAR(50) NOT NULL, -- 'FEED', 'REELS', 'COMMUNITY_FEED', 'EXPLORE'
    format VARCHAR(30) NOT NULL DEFAULT 'NATIVE', -- 'BANNER', 'NATIVE', 'INTERSTITIAL', 'REWARDED'
    floor_cpm NUMERIC(8, 4) DEFAULT 0.5000,
    is_test_mode BOOLEAN NOT NULL DEFAULT TRUE,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_provider_platform_env_placement UNIQUE (provider, platform, environment, placement)
);

CREATE INDEX IF NOT EXISTS idx_ad_provider_configs_lookup 
ON public.ad_provider_configs(provider, platform, environment, is_enabled);

-- Seed baseline development & test configurations
INSERT INTO public.ad_provider_configs 
(provider, platform, environment, app_id, ad_unit_id, placement, format, is_test_mode, is_enabled)
VALUES
-- AdMob Android (Official Google Test Ad Units)
('ADMOB', 'ANDROID', 'DEVELOPMENT', 'ca-app-pub-3940256099942544~3347511713', 'ca-app-pub-3940256099942544/2247696110', 'FEED', 'NATIVE', true, true),
('ADMOB', 'ANDROID', 'DEVELOPMENT', 'ca-app-pub-3940256099942544~3347511713', 'ca-app-pub-3940256099942544/1033173712', 'REELS', 'INTERSTITIAL', true, true),
('ADMOB', 'ANDROID', 'DEVELOPMENT', 'ca-app-pub-3940256099942544~3347511713', 'ca-app-pub-3940256099942544/6300978111', 'COMMUNITY_FEED', 'BANNER', true, true),

-- AdMob iOS (Official Google Test Ad Units)
('ADMOB', 'IOS', 'DEVELOPMENT', 'ca-app-pub-3940256099942544~1458602516', 'ca-app-pub-3940256099942544/3986624511', 'FEED', 'NATIVE', true, true),
('ADMOB', 'IOS', 'DEVELOPMENT', 'ca-app-pub-3940256099942544~1458602516', 'ca-app-pub-3940256099942544/4411468910', 'REELS', 'INTERSTITIAL', true, true),
('ADMOB', 'IOS', 'DEVELOPMENT', 'ca-app-pub-3940256099942544~1458602516', 'ca-app-pub-3940256099942544/2934735716', 'COMMUNITY_FEED', 'BANNER', true, true),

-- Web Google AdSense / Ad Manager Web Units
('ADSENSE', 'WEB', 'DEVELOPMENT', 'ca-pub-0000000000000000', 'peto_web_feed_responsive_01', 'FEED', 'BANNER', true, true),
('ADSENSE', 'WEB', 'DEVELOPMENT', 'ca-pub-0000000000000000', 'peto_web_community_banner_01', 'COMMUNITY_FEED', 'BANNER', true, true)
ON CONFLICT (provider, platform, environment, placement) DO NOTHING;

-- 3. Ad Provider Health & Telemetry State
CREATE TABLE IF NOT EXISTS public.ad_provider_health (
    provider VARCHAR(50) PRIMARY KEY,
    status VARCHAR(30) NOT NULL DEFAULT 'HEALTHY', -- 'HEALTHY', 'DEGRADED', 'UNHEALTHY', 'DISABLED'
    total_requests BIGINT NOT NULL DEFAULT 0,
    successful_requests BIGINT NOT NULL DEFAULT 0,
    failed_requests BIGINT NOT NULL DEFAULT 0,
    timeout_requests BIGINT NOT NULL DEFAULT 0,
    avg_latency_ms NUMERIC(8, 2) NOT NULL DEFAULT 0.00,
    last_success_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ,
    last_error_code VARCHAR(100),
    last_error_message TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.ad_provider_health (provider, status)
VALUES 
('ADMOB', 'HEALTHY'),
('ADSENSE', 'HEALTHY')
ON CONFLICT (provider) DO NOTHING;

-- 4. Unified Granular Ad Lifecycle Events
CREATE TABLE IF NOT EXISTS public.ad_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL, -- 'AD_REQUEST', 'AD_REQUEST_SUCCESS', 'AD_REQUEST_FAILED', 'AD_LOADED', 'AD_SHOWN', 'AD_IMPRESSION', 'AD_CLICK', 'AD_DISMISSED', 'AD_ERROR', 'AD_TIMEOUT', 'AD_FALLBACK'
    ad_source VARCHAR(20) NOT NULL, -- 'PETO', 'EXTERNAL'
    provider VARCHAR(50), -- 'PETO_INTERNAL', 'ADMOB', 'ADSENSE', 'AD_MANAGER'
    campaign_id UUID REFERENCES public.ad_campaigns(id) ON DELETE SET NULL,
    creative_id UUID REFERENCES public.ad_creatives(id) ON DELETE SET NULL,
    placement VARCHAR(50) NOT NULL DEFAULT 'FEED',
    platform VARCHAR(20) NOT NULL DEFAULT 'WEB', -- 'WEB', 'ANDROID', 'IOS'
    country VARCHAR(10) NOT NULL DEFAULT 'GLOBAL',
    region VARCHAR(50),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    session_id VARCHAR(100),
    error_code VARCHAR(100),
    latency_ms NUMERIC(8, 2),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_events_type_time ON public.ad_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_events_source_provider ON public.ad_events(ad_source, provider);
CREATE INDEX IF NOT EXISTS idx_ad_events_campaign ON public.ad_events(campaign_id) WHERE campaign_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ad_events_created_at ON public.ad_events(created_at DESC);

-- 5. Daily External Ad Analytics Aggregation Table
CREATE TABLE IF NOT EXISTS public.ad_external_analytics_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider VARCHAR(50) NOT NULL,
    platform VARCHAR(20) NOT NULL,
    placement VARCHAR(50) NOT NULL,
    country VARCHAR(10) NOT NULL DEFAULT 'GLOBAL',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    requests BIGINT NOT NULL DEFAULT 0,
    filled BIGINT NOT NULL DEFAULT 0,
    impressions BIGINT NOT NULL DEFAULT 0,
    clicks BIGINT NOT NULL DEFAULT 0,
    errors BIGINT NOT NULL DEFAULT 0,
    timeouts BIGINT NOT NULL DEFAULT 0,
    fallbacks BIGINT NOT NULL DEFAULT 0,
    
    revenue_usd NUMERIC(12, 4) NOT NULL DEFAULT 0.0000,
    ecpm_usd NUMERIC(8, 4) NOT NULL DEFAULT 0.0000,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_external_analytics_daily UNIQUE (provider, platform, placement, country, date)
);

CREATE INDEX IF NOT EXISTS idx_ext_analytics_date_prov ON public.ad_external_analytics_daily(date DESC, provider);
