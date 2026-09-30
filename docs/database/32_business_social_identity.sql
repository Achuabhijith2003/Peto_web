-- ============================================================
-- PETO SYSTEM ARCHITECTURE — PHASE 32: BUSINESS SOCIAL IDENTITY
-- File: docs/database/32_business_social_identity.sql
-- Upgrades Business Profile into a first-class social identity
-- ============================================================

-- 1. Extend public.business_identities with social profile & contact attributes
ALTER TABLE public.business_identities
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS cover_url TEXT,
    ADD COLUMN IF NOT EXISTS username TEXT,
    ADD COLUMN IF NOT EXISTS public_email TEXT,
    ADD COLUMN IF NOT EXISTS public_phone TEXT,
    ADD COLUMN IF NOT EXISTS state TEXT,
    ADD COLUMN IF NOT EXISTS city TEXT,
    ADD COLUMN IF NOT EXISTS profile_media_id UUID REFERENCES public.media(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS cover_media_id UUID REFERENCES public.media(id) ON DELETE SET NULL;

-- Unique case-insensitive username index for businesses where provided
CREATE UNIQUE INDEX IF NOT EXISTS uq_business_identities_username
    ON public.business_identities (lower(trim(username)))
    WHERE username IS NOT NULL AND length(trim(username)) > 0;

-- 2. Extend public.posts with Business authorship
ALTER TABLE public.posts
    ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.business_identities(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS author_type TEXT NOT NULL DEFAULT 'USER';

CREATE INDEX IF NOT EXISTS idx_posts_business_id
    ON public.posts(business_id)
    WHERE business_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_posts_author_type
    ON public.posts(author_type);

-- 3. Extend public.comments with Business authorship
ALTER TABLE public.comments
    ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.business_identities(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS author_type TEXT NOT NULL DEFAULT 'USER';

CREATE INDEX IF NOT EXISTS idx_comments_business_id
    ON public.comments(business_id)
    WHERE business_id IS NOT NULL;

-- 4. Extend public.likes with Business actor identity
ALTER TABLE public.likes
    ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.business_identities(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS actor_type TEXT NOT NULL DEFAULT 'USER';

-- Unique constraint ensuring each business can like a post at most once
CREATE UNIQUE INDEX IF NOT EXISTS uq_likes_business_post
    ON public.likes(business_id, post_id)
    WHERE business_id IS NOT NULL;

-- 5. Extend public.bookmarks with Business actor identity
ALTER TABLE public.bookmarks
    ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.business_identities(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS actor_type TEXT NOT NULL DEFAULT 'USER';

CREATE UNIQUE INDEX IF NOT EXISTS uq_bookmarks_business_post
    ON public.bookmarks(business_id, post_id)
    WHERE business_id IS NOT NULL;

-- 6. Ensure Service Role and authenticated permissions
GRANT SELECT, INSERT, UPDATE ON public.business_identities TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.likes TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bookmarks TO service_role;

-- 7. Notify PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
