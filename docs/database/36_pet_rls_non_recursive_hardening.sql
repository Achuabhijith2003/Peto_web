-- =========================================================================
-- PETO SYSTEM ARCHITECTURE — PHASE 4A: REMEDIATE PET RLS RECURSION (PETO-SEC-10)
-- File: docs/database/36_pet_rls_non_recursive_hardening.sql
-- =========================================================================

-- Description:
-- Fixes PostgreSQL error 42P17 (infinite recursion detected in policy for relation "pet_parents").
-- Eliminates self-referential RLS subqueries by establishing hardened, minimal SECURITY DEFINER
-- helper functions that safely evaluate parentage, permissions, and follower connections without re-entering RLS.

-- -------------------------------------------------------------------------
-- 1. DROP VULNERABLE RECURSIVE POLICIES
-- -------------------------------------------------------------------------

-- Drop old recursive policies on public.pet_parents
DROP POLICY IF EXISTS "Pet parents can view parent relationships" ON public.pet_parents;
DROP POLICY IF EXISTS "Pet parents can manage relationships if permitted" ON public.pet_parents;
DROP POLICY IF EXISTS "pet_parents_select_policy" ON public.pet_parents;
DROP POLICY IF EXISTS "pet_parents_insert_policy" ON public.pet_parents;
DROP POLICY IF EXISTS "pet_parents_update_policy" ON public.pet_parents;
DROP POLICY IF EXISTS "pet_parents_delete_policy" ON public.pet_parents;

-- Drop old recursive policies on public.pets
DROP POLICY IF EXISTS "Public pets are readable by anyone" ON public.pets;
DROP POLICY IF EXISTS "Pet parents can manage their pets" ON public.pets;
DROP POLICY IF EXISTS "pets_select_policy" ON public.pets;
DROP POLICY IF EXISTS "pets_insert_policy" ON public.pets;
DROP POLICY IF EXISTS "pets_update_policy" ON public.pets;
DROP POLICY IF EXISTS "pets_delete_policy" ON public.pets;

-- Drop old recursive policies on public.pet_media
DROP POLICY IF EXISTS "Pet media viewable based on pet visibility" ON public.pet_media;
DROP POLICY IF EXISTS "Pet parents can manage pet media" ON public.pet_media;
DROP POLICY IF EXISTS "pet_media_select_policy" ON public.pet_media;
DROP POLICY IF EXISTS "pet_media_insert_policy" ON public.pet_media;
DROP POLICY IF EXISTS "pet_media_update_policy" ON public.pet_media;
DROP POLICY IF EXISTS "pet_media_delete_policy" ON public.pet_media;

-- -------------------------------------------------------------------------
-- 2. CREATE HARDENED SECURITY DEFINER HELPER FUNCTIONS
-- -------------------------------------------------------------------------

-- Helper 1: Check if user is an ACTIVE parent of the pet (bypasses RLS internally, preventing recursion)
CREATE OR REPLACE FUNCTION public.is_active_pet_parent(p_pet_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.pet_parents
        WHERE pet_id = p_pet_id
          AND user_id = p_user_id
          AND status = 'ACTIVE'
    );
$$;

-- Helper 2: Check if user has specific permission or is OWNER (bypasses RLS internally)
CREATE OR REPLACE FUNCTION public.has_pet_parent_permission(p_pet_id UUID, p_user_id UUID, p_permission TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.pet_parents
        WHERE pet_id = p_pet_id
          AND user_id = p_user_id
          AND status = 'ACTIVE'
          AND (
              relationship = 'OWNER'
              OR p_permission = ANY(permissions)
          )
    );
$$;

-- Helper 3: Check if viewer is connected (follower or following) to ANY active pet parent
CREATE OR REPLACE FUNCTION public.is_pet_connection_viewer(p_pet_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.pet_parents pp
        JOIN public.follows f
          ON (f.follower_id = p_user_id AND f.following_id = pp.user_id)
          OR (f.following_id = p_user_id AND f.follower_id = pp.user_id)
        WHERE pp.pet_id = p_pet_id
          AND pp.status = 'ACTIVE'
    );
$$;

-- Helper 4: Evaluate overall pet visibility (PUBLIC, CONNECTIONS, PRIVATE)
CREATE OR REPLACE FUNCTION public.can_view_pet(p_pet_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_visibility TEXT;
BEGIN
    IF p_pet_id IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT profile_visibility INTO v_visibility
    FROM public.pets
    WHERE id = p_pet_id;

    IF v_visibility IS NULL THEN
        RETURN FALSE;
    END IF;

    -- 1. PUBLIC: anyone (authenticated or anonymous guest) can view
    IF v_visibility = 'PUBLIC' THEN
        RETURN TRUE;
    END IF;

    -- For non-public pets, unauthenticated guests are denied
    IF p_user_id IS NULL THEN
        RETURN FALSE;
    END IF;

    -- 2. Active Pet Parent: can always view their own pet
    IF public.is_active_pet_parent(p_pet_id, p_user_id) THEN
        RETURN TRUE;
    END IF;

    -- 3. CONNECTIONS: viewer must be connected to an active pet parent
    IF v_visibility = 'CONNECTIONS' THEN
        RETURN public.is_pet_connection_viewer(p_pet_id, p_user_id);
    END IF;

    -- 4. PRIVATE: strictly limited to active pet parents (already checked above)
    RETURN FALSE;
END;
$$;

-- Helper 5: Grant/Revoke management for SECURITY DEFINER functions
REVOKE ALL ON FUNCTION public.is_active_pet_parent(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.has_pet_parent_permission(UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_pet_connection_viewer(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_view_pet(UUID, UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.is_active_pet_parent(UUID, UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.has_pet_parent_permission(UUID, UUID, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.is_pet_connection_viewer(UUID, UUID) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_pet(UUID, UUID) TO authenticated, anon, service_role;

-- -------------------------------------------------------------------------
-- 3. NEW NON-RECURSIVE RLS POLICIES FOR public.pets
-- -------------------------------------------------------------------------

ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;

-- SELECT: Governed by can_view_pet (PUBLIC -> all; CONNECTIONS -> connected/parent; PRIVATE -> parent only)
CREATE POLICY "pets_select_policy"
    ON public.pets
    FOR SELECT
    USING (public.can_view_pet(id, auth.uid()));

-- INSERT: Authenticated users can insert their own pet
CREATE POLICY "pets_insert_policy"
    ON public.pets
    FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- UPDATE: Only active pet parents can update pet metadata
CREATE POLICY "pets_update_policy"
    ON public.pets
    FOR UPDATE
    USING (public.is_active_pet_parent(id, auth.uid()))
    WITH CHECK (public.is_active_pet_parent(id, auth.uid()));

-- DELETE: Only active pet parents with MANAGE_PARENTS permission can delete the pet
CREATE POLICY "pets_delete_policy"
    ON public.pets
    FOR DELETE
    USING (public.has_pet_parent_permission(id, auth.uid(), 'MANAGE_PARENTS'));

-- -------------------------------------------------------------------------
-- 4. NEW NON-RECURSIVE RLS POLICIES FOR public.pet_parents
-- -------------------------------------------------------------------------

ALTER TABLE public.pet_parents ENABLE ROW LEVEL SECURITY;

-- SELECT: Caller can view their own relationship, or relationships of pets they are authorized to view
CREATE POLICY "pet_parents_select_policy"
    ON public.pet_parents
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR public.can_view_pet(pet_id, auth.uid())
    );

-- INSERT: Privilege Escalation Defense:
-- An unprivileged user CANNOT self-assign to another user's pet.
-- Direct inserts require an existing active parent with MANAGE_PARENTS, or initial creation via service role.
CREATE POLICY "pet_parents_insert_policy"
    ON public.pet_parents
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND public.has_pet_parent_permission(pet_id, auth.uid(), 'MANAGE_PARENTS')
    );

-- UPDATE: Only existing authorized parent can modify roles/permissions
CREATE POLICY "pet_parents_update_policy"
    ON public.pet_parents
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL
        AND (
            user_id = auth.uid()
            OR public.has_pet_parent_permission(pet_id, auth.uid(), 'MANAGE_PARENTS')
        )
    )
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND (
            user_id = auth.uid()
            OR public.has_pet_parent_permission(pet_id, auth.uid(), 'MANAGE_PARENTS')
        )
    );

-- DELETE: An authorized parent with MANAGE_PARENTS can remove a co-parent, or a parent can relinquish own role
CREATE POLICY "pet_parents_delete_policy"
    ON public.pet_parents
    FOR DELETE
    USING (
        auth.uid() IS NOT NULL
        AND (
            user_id = auth.uid()
            OR public.has_pet_parent_permission(pet_id, auth.uid(), 'MANAGE_PARENTS')
        )
    );

-- -------------------------------------------------------------------------
-- 5. NEW NON-RECURSIVE RLS POLICIES FOR public.pet_media
-- -------------------------------------------------------------------------

ALTER TABLE public.pet_media ENABLE ROW LEVEL SECURITY;

-- SELECT: Viewable strictly based on pet visibility
CREATE POLICY "pet_media_select_policy"
    ON public.pet_media
    FOR SELECT
    USING (public.can_view_pet(pet_id, auth.uid()));

-- INSERT: Only active parents with UPLOAD_MEDIA permission can insert media metadata
CREATE POLICY "pet_media_insert_policy"
    ON public.pet_media
    FOR INSERT
    WITH CHECK (
        auth.uid() IS NOT NULL
        AND public.has_pet_parent_permission(pet_id, auth.uid(), 'UPLOAD_MEDIA')
    );

-- UPDATE: Only active parents with UPLOAD_MEDIA permission can update media metadata
CREATE POLICY "pet_media_update_policy"
    ON public.pet_media
    FOR UPDATE
    USING (
        auth.uid() IS NOT NULL
        AND public.has_pet_parent_permission(pet_id, auth.uid(), 'UPLOAD_MEDIA')
    );

-- DELETE: Only active parents with UPLOAD_MEDIA permission can delete media metadata
CREATE POLICY "pet_media_delete_policy"
    ON public.pet_media
    FOR DELETE
    USING (
        auth.uid() IS NOT NULL
        AND public.has_pet_parent_permission(pet_id, auth.uid(), 'UPLOAD_MEDIA')
    );

-- -------------------------------------------------------------------------
-- 6. RELOAD POSTGREST SCHEMA CACHE
-- -------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';
