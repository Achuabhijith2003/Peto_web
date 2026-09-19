-- ==========================================
-- Migration 11: User Device Tokens for Mobile Push Notifications (FCM)
-- ==========================================

-- Table to store mobile FCM device tokens
CREATE TABLE IF NOT EXISTS public.user_device_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    fcm_token TEXT NOT NULL UNIQUE,
    platform VARCHAR(16) NOT NULL DEFAULT 'android',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookups by user_id
CREATE INDEX IF NOT EXISTS idx_user_device_tokens_user 
    ON public.user_device_tokens (user_id);

-- Enable RLS
ALTER TABLE public.user_device_tokens ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own device tokens
CREATE POLICY "Users can manage their own device tokens" 
    ON public.user_device_tokens
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
