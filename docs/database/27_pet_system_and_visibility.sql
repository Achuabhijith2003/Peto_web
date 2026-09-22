-- ==============================================================================
-- PETO PLATFORM — RELEASE: PET SYSTEM & VISIBILITY
-- Migration 27: Pet Entity, Pet Parents, Pet Media, Visibility & Post Association
-- Note: NO pet followers, NO doctor/veterinary ecosystem in this release.
-- ==============================================================================

-- 1. Create PETS Table
CREATE TABLE IF NOT EXISTS public.pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    species TEXT NOT NULL, -- DOG, CAT, BIRD, RABBIT, HAMSTER, GUINEA_PIG, FISH, REPTILE, HORSE, OTHER
    species_name TEXT,     -- Custom species label when species = 'OTHER'
    breed TEXT,
    breed_secondary TEXT,
    sex TEXT CHECK (sex IN ('MALE', 'FEMALE', 'UNKNOWN')) DEFAULT 'UNKNOWN',
    date_of_birth DATE,
    is_date_of_birth_approximate BOOLEAN DEFAULT FALSE,
    color TEXT,
    size TEXT CHECK (size IN ('EXTRA_SMALL', 'SMALL', 'MEDIUM', 'LARGE', 'EXTRA_LARGE')),
    bio TEXT,
    country TEXT,
    state TEXT,
    city TEXT,
    profile_visibility TEXT NOT NULL DEFAULT 'PUBLIC' CHECK (profile_visibility IN ('PUBLIC', 'CONNECTIONS', 'PRIVATE')),
    profile_media_id UUID REFERENCES public.media(id) ON DELETE SET NULL,
    cover_media_id UUID REFERENCES public.media(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MISSING', 'REHOMED', 'DECEASED', 'ARCHIVED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create PET_PARENTS Table (Multi-human authorization & permissions)
CREATE TABLE IF NOT EXISTS public.pet_parents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    relationship TEXT NOT NULL DEFAULT 'OWNER' CHECK (relationship IN ('OWNER', 'CO_OWNER', 'PET_PARENT', 'FAMILY_MEMBER', 'CAREGIVER', 'FOSTER_PARENT', 'GUARDIAN')),
    is_primary BOOLEAN DEFAULT FALSE,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING_INVITE', 'DECLINED', 'REMOVED')),
    permissions TEXT[] NOT NULL DEFAULT ARRAY['VIEW_PROFILE', 'EDIT_PROFILE', 'UPLOAD_MEDIA', 'CREATE_PET_POST', 'MANAGE_PARENTS', 'MANAGE_PRIVACY'],
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_pet_parent UNIQUE (pet_id, user_id)
);

-- 3. Create PET_MEDIA Table (Profile, Cover, Gallery, Memories)
CREATE TABLE IF NOT EXISTS public.pet_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    media_id UUID NOT NULL REFERENCES public.media(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'GALLERY' CHECK (role IN ('PROFILE', 'COVER', 'GALLERY', 'MEMORY')),
    visibility TEXT NOT NULL DEFAULT 'INHERIT' CHECK (visibility IN ('INHERIT', 'PUBLIC', 'PRIVATE')),
    caption TEXT,
    alt_text TEXT,
    sort_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Extend POSTS table with optional pet_id
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS pet_id UUID REFERENCES public.pets(id) ON DELETE SET NULL;

-- 5. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_pets_visibility ON public.pets(profile_visibility);
CREATE INDEX IF NOT EXISTS idx_pets_species ON public.pets(species);
CREATE INDEX IF NOT EXISTS idx_pets_status ON public.pets(status);
CREATE INDEX IF NOT EXISTS idx_pets_created_at ON public.pets(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_pet_parents_pet_id ON public.pet_parents(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_parents_user_id ON public.pet_parents(user_id);
CREATE INDEX IF NOT EXISTS idx_pet_parents_lookup ON public.pet_parents(pet_id, user_id, status);

CREATE INDEX IF NOT EXISTS idx_pet_media_pet_id ON public.pet_media(pet_id);
CREATE INDEX IF NOT EXISTS idx_pet_media_role ON public.pet_media(pet_id, role);

CREATE INDEX IF NOT EXISTS idx_posts_pet_id ON public.posts(pet_id);

-- 6. Row-Level Security (RLS) Policies
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_parents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pet_media ENABLE ROW LEVEL SECURITY;

-- Allow public pets to be read by all authenticated users
CREATE POLICY "Public pets are readable by anyone"
    ON public.pets
    FOR SELECT
    USING (
        profile_visibility = 'PUBLIC'
        OR auth.uid() IN (
            SELECT user_id FROM public.pet_parents
            WHERE pet_id = pets.id AND status = 'ACTIVE'
        )
    );

-- Pet Parents access policy
CREATE POLICY "Pet parents can manage their pets"
    ON public.pets
    FOR ALL
    USING (
        auth.uid() IN (
            SELECT user_id FROM public.pet_parents
            WHERE pet_id = pets.id AND status = 'ACTIVE'
        )
    );

-- Pet Parents table policy
CREATE POLICY "Pet parents can view parent relationships"
    ON public.pet_parents
    FOR SELECT
    USING (
        status = 'ACTIVE'
        OR user_id = auth.uid()
        OR pet_id IN (
            SELECT pet_id FROM public.pet_parents
            WHERE user_id = auth.uid() AND status = 'ACTIVE'
        )
    );

CREATE POLICY "Pet parents can manage relationships if permitted"
    ON public.pet_parents
    FOR ALL
    USING (
        user_id = auth.uid()
        OR pet_id IN (
            SELECT pet_id FROM public.pet_parents
            WHERE user_id = auth.uid()
            AND status = 'ACTIVE'
            AND 'MANAGE_PARENTS' = ANY(permissions)
        )
    );

-- Pet media policy
CREATE POLICY "Pet media viewable based on pet visibility"
    ON public.pet_media
    FOR SELECT
    USING (
        pet_id IN (
            SELECT id FROM public.pets
            WHERE profile_visibility = 'PUBLIC'
            OR id IN (
                SELECT pet_id FROM public.pet_parents
                WHERE user_id = auth.uid() AND status = 'ACTIVE'
            )
        )
    );

CREATE POLICY "Pet parents can manage pet media"
    ON public.pet_media
    FOR ALL
    USING (
        pet_id IN (
            SELECT pet_id FROM public.pet_parents
            WHERE user_id = auth.uid()
            AND status = 'ACTIVE'
            AND 'UPLOAD_MEDIA' = ANY(permissions)
        )
    );
