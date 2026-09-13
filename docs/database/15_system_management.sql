-- =========================================================================
-- Migration 15: Peto System Management, Feature Flags & Maintenance Mode
-- =========================================================================

-- 1. System Settings Table (Global configuration & Maintenance Mode)
CREATE TABLE IF NOT EXISTS public.system_settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT NOT NULL DEFAULT '',
    updated_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default maintenance mode setting
INSERT INTO public.system_settings (key, value, description)
VALUES (
    'maintenance_mode',
    '{
        "is_enabled": false,
        "message": "Peto is currently undergoing scheduled maintenance. Please check back shortly.",
        "enabled_at": null,
        "allowed_ips": []
    }'::jsonb,
    'Controls public API maintenance window and user circuit breaker'
)
ON CONFLICT (key) DO NOTHING;

-- 2. Feature Flags Table
CREATE TABLE IF NOT EXISTS public.feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(150) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for feature flags lookup
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON public.feature_flags (key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON public.feature_flags (is_enabled);

-- Seed Standard Peto Feature Flags
INSERT INTO public.feature_flags (key, name, description, is_enabled)
VALUES
    ('reels_enabled', 'Short-form Video Reels', 'Enables vertical video reels feed and upload pipeline', TRUE),
    ('communities_enabled', 'Peto Communities', 'Enables group creation, memberships, and community discovery', TRUE),
    ('ai_moderation_enabled', 'AI Content Moderation', 'Automated machine learning moderation for text and media uploads', FALSE),
    ('new_feed_enabled', 'Next-Gen Discovery Feed', 'Algorithmic feed ranking based on user interactions and vector similarity', TRUE),
    ('direct_messaging_enabled', 'Direct Messaging & Realtime Chat', 'Peer-to-peer messaging and presence indicators', TRUE)
ON CONFLICT (key) DO NOTHING;

-- 3. Row Level Security (RLS)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

-- Service role full access
CREATE POLICY "service_role_all_system_settings" ON public.system_settings
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "service_role_all_feature_flags" ON public.feature_flags
    FOR ALL USING (auth.role() = 'service_role');

-- Read-only policy for public feature flags evaluation
CREATE POLICY "public_read_feature_flags" ON public.feature_flags
    FOR SELECT USING (TRUE);
