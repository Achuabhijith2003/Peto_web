-- Extend the existing verification application and document system.
-- Run after 23_advertiser_verification_system.sql.

CREATE TABLE IF NOT EXISTS public.business_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    legal_name TEXT NOT NULL CHECK (length(trim(legal_name)) > 0),
    country_code TEXT NOT NULL,
    website_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.business_memberships (
    business_id UUID NOT NULL REFERENCES public.business_identities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('OWNER', 'ADMIN', 'MEMBER')),
    can_manage_verification BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (business_id, user_id)
);

ALTER TABLE public.verification_applications
    ADD COLUMN IF NOT EXISTS business_id UUID REFERENCES public.business_identities(id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS verified_name TEXT,
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS verification_version INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS reverification_reason TEXT;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;

-- Existing applications remain personal or advertiser applications. A business
-- identity application must point to one concrete business, never its operator.
CREATE INDEX IF NOT EXISTS idx_verification_apps_business
    ON public.verification_applications(business_id)
    WHERE business_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_verification_apps_business_identity
    ON public.verification_applications(business_id)
    WHERE business_id IS NOT NULL AND verification_type = 'BUSINESS_IDENTITY';

CREATE INDEX IF NOT EXISTS idx_verification_apps_person_approved
    ON public.verification_applications(user_id, verified_at DESC)
    WHERE verification_type = 'INDIVIDUAL_IDENTITY' AND status = 'APPROVED';

CREATE INDEX IF NOT EXISTS idx_verification_apps_business_approved
    ON public.verification_applications(business_id, verified_at DESC)
    WHERE business_id IS NOT NULL AND status = 'APPROVED';

-- Browser clients cannot mutate decisions or read private evidence directly.
-- The existing backend uses the service-role Supabase client for authorized access.
ALTER TABLE public.business_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_audit_events ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.business_identities TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.business_memberships TO service_role;

-- Creation and owner membership must commit together. Only the backend's
-- service-role client may call this function; clients cannot forge owner_id.
CREATE OR REPLACE FUNCTION public.create_business_identity_for_owner(
    p_owner_id UUID,
    p_name TEXT,
    p_legal_name TEXT,
    p_country_code TEXT
) RETURNS public.business_identities
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    created public.business_identities;
BEGIN
    IF length(trim(coalesce(p_name, ''))) = 0 OR
       length(trim(coalesce(p_legal_name, ''))) = 0 OR
       p_country_code !~ '^[A-Z]{2}$' THEN
        RAISE EXCEPTION 'Invalid business identity information';
    END IF;

    INSERT INTO public.business_identities(owner_id, name, legal_name, country_code)
    VALUES (p_owner_id, trim(p_name), trim(p_legal_name), p_country_code)
    RETURNING * INTO created;

    INSERT INTO public.business_memberships(business_id, user_id, role, can_manage_verification)
    VALUES (created.id, p_owner_id, 'OWNER', true);
    RETURN created;
END;
$$;

REVOKE ALL ON FUNCTION public.create_business_identity_for_owner(UUID, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_business_identity_for_owner(UUID, TEXT, TEXT, TEXT) TO service_role;

-- The application record drives the legacy profile flag used by feed/search.
-- A name change invalidates the record and this projection in one transaction.
CREATE OR REPLACE FUNCTION public.invalidate_person_verification_on_name_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    changed_application UUID;
    invalidated BOOLEAN := false;
BEGIN
    IF trim(coalesce(NEW.full_name, '')) IS DISTINCT FROM trim(coalesce(OLD.full_name, '')) THEN
        FOR changed_application IN
            UPDATE public.verification_applications
            SET status = 'REVERIFICATION_REQUIRED',
                reverification_reason = 'Verified legal name changed',
                updated_at = now()
            WHERE user_id = NEW.id
              AND verification_type = 'INDIVIDUAL_IDENTITY'
              AND status = 'APPROVED'
              AND trim(coalesce(verified_name, '')) IS DISTINCT FROM trim(coalesce(NEW.full_name, ''))
            RETURNING id
        LOOP
            invalidated := true;
            INSERT INTO public.verification_audit_events
                (application_id, actor_id, actor_role, action, previous_status, new_status, reason)
            VALUES
                (changed_application, NEW.id, 'SYSTEM', 'VERIFICATION_REVERIFICATION_REQUIRED',
                 'APPROVED', 'REVERIFICATION_REQUIRED', 'Verified legal name changed');
            INSERT INTO public.notifications(recipient_id, type, message)
            VALUES (NEW.id, 'system', 'Your verified identity name changed. Please complete reverification.');
        END LOOP;
        IF invalidated THEN
            NEW.verified := false;
            NEW.is_verified := false;
            NEW.verification_badge_type := 'NONE';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_person_verification_name_change ON public.profiles;
CREATE TRIGGER trg_person_verification_name_change
BEFORE UPDATE OF full_name ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.invalidate_person_verification_on_name_change();

-- Reject direct badge grants from browser JWTs even if an older profile RLS
-- policy permits editing other profile fields. Name-change invalidation above
-- may only clear the badge.
CREATE OR REPLACE FUNCTION public.prevent_client_verification_badge_write()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
    IF current_user NOT IN ('postgres', 'service_role')
       AND coalesce(current_setting('request.jwt.claim.role', true), '') <> 'service_role' THEN
        IF (NEW.verified IS DISTINCT FROM OLD.verified OR
            NEW.is_verified IS DISTINCT FROM OLD.is_verified OR
            NEW.verification_badge_type IS DISTINCT FROM OLD.verification_badge_type)
           AND NOT (
              NEW.full_name IS DISTINCT FROM OLD.full_name AND
              NEW.verified = false AND NEW.is_verified = false AND
              NEW.verification_badge_type = 'NONE'
           ) THEN
            RAISE EXCEPTION 'Verification badges are managed by the verification service';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_verification_badge ON public.profiles;
CREATE TRIGGER trg_protect_verification_badge
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.prevent_client_verification_badge_write();

CREATE OR REPLACE FUNCTION public.invalidate_business_verification_on_name_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    changed_application UUID;
BEGIN
    IF trim(NEW.legal_name) IS DISTINCT FROM trim(OLD.legal_name) THEN
        FOR changed_application IN
            UPDATE public.verification_applications
            SET status = 'REVERIFICATION_REQUIRED',
                reverification_reason = 'Verified business legal name changed',
                updated_at = now()
            WHERE business_id = NEW.id
              AND verification_type = 'BUSINESS_IDENTITY'
              AND status = 'APPROVED'
              AND trim(coalesce(verified_name, '')) IS DISTINCT FROM trim(NEW.legal_name)
            RETURNING id
        LOOP
            INSERT INTO public.verification_audit_events
                (application_id, actor_id, actor_role, action, previous_status, new_status, reason)
            VALUES
                (changed_application, NEW.owner_id, 'SYSTEM', 'VERIFICATION_REVERIFICATION_REQUIRED',
                 'APPROVED', 'REVERIFICATION_REQUIRED', 'Verified business legal name changed');
            INSERT INTO public.notifications(recipient_id, type, message)
            VALUES (NEW.owner_id, 'system', 'Your verified business legal name changed. Please complete reverification.');
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_business_verification_name_change ON public.business_identities;
CREATE TRIGGER trg_business_verification_name_change
AFTER UPDATE OF legal_name ON public.business_identities
FOR EACH ROW EXECUTE FUNCTION public.invalidate_business_verification_on_name_change();

CREATE OR REPLACE FUNCTION public.project_person_verification_badge()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
    has_approved BOOLEAN;
BEGIN
    IF NEW.verification_type <> 'INDIVIDUAL_IDENTITY' THEN RETURN NEW; END IF;
    -- A profile-name trigger already sets the badge on its NEW row. Updating
    -- the same row again from its nested application update is unsafe.
    IF pg_trigger_depth() > 1 THEN RETURN NEW; END IF;
    SELECT EXISTS (
        SELECT 1 FROM public.verification_applications a
        JOIN public.profiles p ON p.id = a.user_id
        WHERE a.user_id = NEW.user_id
          AND a.verification_type = 'INDIVIDUAL_IDENTITY'
          AND a.status = 'APPROVED'
          AND a.verified_name = p.full_name
          AND (a.expires_at IS NULL OR a.expires_at > now())
    ) INTO has_approved;
    UPDATE public.profiles
    SET verified = has_approved,
        is_verified = has_approved,
        verification_badge_type = CASE WHEN has_approved THEN 'PERSON' ELSE 'NONE' END
    WHERE id = NEW.user_id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_person_verification_badge ON public.verification_applications;
CREATE TRIGGER trg_person_verification_badge
AFTER INSERT OR UPDATE OF status, verified_name, expires_at ON public.verification_applications
FOR EACH ROW EXECUTE FUNCTION public.project_person_verification_badge();

-- One-time migration of approved person applications. Legacy manual and
-- advertiser badges are intentionally not treated as person verification.
UPDATE public.verification_applications
SET verified_name = trim(concat_ws(' ', legal_first_name, legal_last_name)),
    verified_at = coalesce(verified_at, reviewed_at),
    verification_version = greatest(verification_version, 1)
WHERE verification_type = 'INDIVIDUAL_IDENTITY'
  AND status = 'APPROVED'
  AND verified_name IS NULL;

UPDATE public.profiles p
SET verified = EXISTS (
        SELECT 1 FROM public.verification_applications a
        WHERE a.user_id = p.id AND a.verification_type = 'INDIVIDUAL_IDENTITY'
          AND a.status = 'APPROVED' AND a.verified_name = p.full_name
          AND (a.expires_at IS NULL OR a.expires_at > now())
    ),
    is_verified = EXISTS (
        SELECT 1 FROM public.verification_applications a
        WHERE a.user_id = p.id AND a.verification_type = 'INDIVIDUAL_IDENTITY'
          AND a.status = 'APPROVED' AND a.verified_name = p.full_name
          AND (a.expires_at IS NULL OR a.expires_at > now())
    ),
    verification_badge_type = CASE WHEN EXISTS (
        SELECT 1 FROM public.verification_applications a
        WHERE a.user_id = p.id AND a.verification_type = 'INDIVIDUAL_IDENTITY'
          AND a.status = 'APPROVED' AND a.verified_name = p.full_name
          AND (a.expires_at IS NULL OR a.expires_at > now())
    ) THEN 'PERSON' ELSE 'NONE' END;

COMMENT ON COLUMN public.verification_applications.business_id IS
    'Business verification subject. NULL for legacy advertiser and person applications.';

INSERT INTO public.admin_permissions(code, module, description) VALUES
    ('verification.reverification', 'verification', 'Require identity reverification'),
    ('verification.suspend', 'verification', 'Suspend an approved verification'),
    ('verification.revoke', 'verification', 'Revoke an approved verification')
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.admin_role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM public.admin_roles r
CROSS JOIN public.admin_permissions p
WHERE r.name IN ('Super Admin', 'Compliance Manager')
  AND p.code IN ('verification.reverification', 'verification.suspend', 'verification.revoke')
ON CONFLICT DO NOTHING;
