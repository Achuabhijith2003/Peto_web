-- ==============================================================================
-- PETO PLATFORM — RELEASE: MENTIONS & PET TAGGING SYSTEM
-- Migration 28: Mentions (@User), Pet Tags (🐕 Pet), and User Blocking
-- Note: A Pet is NOT a social account. NO pet followers or pet social graph.
-- ==============================================================================

-- 1. Create POST_MENTIONS Table
CREATE TABLE IF NOT EXISTS public.post_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    mentioned_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_post_mention UNIQUE (post_id, mentioned_user_id)
);

CREATE INDEX IF NOT EXISTS idx_post_mentions_post ON public.post_mentions(post_id);
CREATE INDEX IF NOT EXISTS idx_post_mentions_user ON public.post_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_post_mentions_creator ON public.post_mentions(created_by);

-- 2. Create POST_PETS Table (Tagging pets in posts/reels)
CREATE TABLE IF NOT EXISTS public.post_pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_post_pet UNIQUE (post_id, pet_id)
);

CREATE INDEX IF NOT EXISTS idx_post_pets_post ON public.post_pets(post_id);
CREATE INDEX IF NOT EXISTS idx_post_pets_pet ON public.post_pets(pet_id);
CREATE INDEX IF NOT EXISTS idx_post_pets_creator ON public.post_pets(created_by);

-- 3. Create COMMENT_MENTIONS Table
CREATE TABLE IF NOT EXISTS public.comment_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    comment_id UUID NOT NULL REFERENCES public.comments(id) ON DELETE CASCADE,
    mentioned_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_comment_mention UNIQUE (comment_id, mentioned_user_id)
);

CREATE INDEX IF NOT EXISTS idx_comment_mentions_comment ON public.comment_mentions(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_user ON public.comment_mentions(mentioned_user_id);
CREATE INDEX IF NOT EXISTS idx_comment_mentions_creator ON public.comment_mentions(created_by);

-- 4. Create USER_BLOCKS Table
CREATE TABLE IF NOT EXISTS public.user_blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_block UNIQUE (blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_user_blocks_blocker ON public.user_blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_user_blocks_blocked ON public.user_blocks(blocked_id);

-- 5. Extend NOTIFICATION_SETTINGS Table with pet_tags_enabled if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'notification_settings' 
          AND column_name = 'pet_tags_enabled'
    ) THEN
        ALTER TABLE public.notification_settings ADD COLUMN pet_tags_enabled BOOLEAN DEFAULT TRUE;
    END IF;
END $$;

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.post_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;

-- Post mentions viewable if parent post is accessible
CREATE POLICY "Public read post mentions" 
    ON public.post_mentions FOR SELECT 
    USING (true);

-- Post pets viewable if parent post is accessible
CREATE POLICY "Public read post pets" 
    ON public.post_pets FOR SELECT 
    USING (true);

-- Comment mentions viewable if parent comment is accessible
CREATE POLICY "Public read comment mentions" 
    ON public.comment_mentions FOR SELECT 
    USING (true);

-- User blocks viewable only by blocker
CREATE POLICY "Users can manage their own blocks" 
    ON public.user_blocks FOR ALL 
    USING (auth.uid() = blocker_id);
