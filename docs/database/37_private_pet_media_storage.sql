-- =========================================================================
-- PETO SYSTEM ARCHITECTURE — PHASE 4B: PRIVATE PET MEDIA STORAGE ISOLATION
-- File: docs/database/37_private_pet_media_storage.sql
-- =========================================================================

-- Description:
-- Extends the media repository with canonical storage references (storage_bucket, storage_path).
-- Enables storage-level isolation for private and connections-restricted pet media,
-- eliminating reliance on permanent public CDN URLs for protected entities.

-- 1. Add canonical storage columns to public.media
ALTER TABLE public.media
    ADD COLUMN IF NOT EXISTS storage_bucket TEXT,
    ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- 2. Performance index for storage-level lookups and cleanup tasks
CREATE INDEX IF NOT EXISTS idx_media_storage
    ON public.media(storage_bucket, storage_path);

-- 3. Backfill existing media rows from legacy public URLs
UPDATE public.media
SET 
    storage_bucket = substring(url from '/storage/v1/object/public/([^/]+)/'),
    storage_path = substring(url from '/storage/v1/object/public/[^/]+/(.+)$')
WHERE 
    storage_bucket IS NULL 
    AND url LIKE '%/storage/v1/object/public/%';

-- 4. Audit comments
COMMENT ON COLUMN public.media.storage_bucket IS 'Canonical Supabase Storage bucket name (e.g. posts-images, avatars, pet-media-private)';
COMMENT ON COLUMN public.media.storage_path IS 'Canonical object path within the bucket (e.g. pets/<pet_id>/<media_id>.webp)';

-- 5. Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
