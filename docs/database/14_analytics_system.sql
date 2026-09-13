-- =========================================================================
-- Migration 14: Peto Analytics, Ingestion Events & Daily Metrics System
-- =========================================================================

-- 1. Analytics Events Ingestion Table
CREATE TABLE IF NOT EXISTS public.analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    target_type VARCHAR(50),
    target_id VARCHAR(255),
    properties JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Performance Indexes on Events Table
CREATE INDEX IF NOT EXISTS idx_analytics_events_name_created 
    ON public.analytics_events (event_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_user 
    ON public.analytics_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_analytics_events_target 
    ON public.analytics_events (target_type, target_id);

-- 2. Pre-Aggregated Daily Analytics Snapshots Table
CREATE TABLE IF NOT EXISTS public.analytics_daily_metrics (
    date DATE PRIMARY KEY,
    new_users INT NOT NULL DEFAULT 0,
    dau INT NOT NULL DEFAULT 0,
    wau INT NOT NULL DEFAULT 0,
    mau INT NOT NULL DEFAULT 0,
    posts_created INT NOT NULL DEFAULT 0,
    reels_created INT NOT NULL DEFAULT 0,
    comments_created INT NOT NULL DEFAULT 0,
    likes_count INT NOT NULL DEFAULT 0,
    bookmarks_count INT NOT NULL DEFAULT 0,
    shares_count INT NOT NULL DEFAULT 0,
    post_views INT NOT NULL DEFAULT 0,
    reel_views INT NOT NULL DEFAULT 0,
    reel_watch_time_seconds BIGINT NOT NULL DEFAULT 0,
    community_interactions INT NOT NULL DEFAULT 0,
    revenue_usd NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    retention_d1_pct NUMERIC(5, 2) DEFAULT 0,
    retention_d7_pct NUMERIC(5, 2) DEFAULT 0,
    retention_d14_pct NUMERIC(5, 2) DEFAULT 0,
    retention_d30_pct NUMERIC(5, 2) DEFAULT 0,
    platform_breakdown JSONB NOT NULL DEFAULT '{"ios":0,"android":0,"web":0}'::jsonb,
    geo_breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_date 
    ON public.analytics_daily_metrics (date DESC);

-- 3. Row Level Security
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_daily_metrics ENABLE ROW LEVEL SECURITY;
