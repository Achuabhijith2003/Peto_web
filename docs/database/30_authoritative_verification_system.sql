-- ============================================================
-- PETO SYSTEM ARCHITECTURE — PHASE 10: AUTHORITATIVE VERIFICATION & ADVERTISER ONBOARDING
-- File: docs/database/30_authoritative_verification_system.sql
-- ============================================================

-- 1. Extend public.verification_applications with audit, admin assignment, and separated notes
ALTER TABLE public.verification_applications
    ADD COLUMN IF NOT EXISTS user_facing_reason TEXT,
    ADD COLUMN IF NOT EXISTS admin_internal_notes TEXT,
    ADD COLUMN IF NOT EXISTS assigned_admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS review_started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS review_completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS decision TEXT,
    ADD COLUMN IF NOT EXISTS decision_reason TEXT;

-- 2. Indexes for efficient queue queries and reviewer assignments
CREATE INDEX IF NOT EXISTS idx_verification_apps_assigned_admin
    ON public.verification_applications(assigned_admin_id)
    WHERE assigned_admin_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_verification_apps_type_status
    ON public.verification_applications(verification_type, status);

CREATE INDEX IF NOT EXISTS idx_verification_apps_user_status
    ON public.verification_applications(user_id, status);

-- 3. Extend admin permissions for granular verification actions
INSERT INTO public.admin_permissions (code, module, description)
VALUES
    ('verification.view', 'verification', 'View verification applications, review queues, and applicant metadata'),
    ('verification.review', 'verification', 'Examine verification submissions and request additional documentation'),
    ('verification.approve', 'verification', 'Approve identity and business verification applications'),
    ('verification.reject', 'verification', 'Reject verification submissions with compliance justification'),
    ('verification.request_information', 'verification', 'Request additional documentation or clarification from applicant'),
    ('verification.reverification', 'verification', 'Require identity or business reverification due to critical changes'),
    ('verification.suspend', 'verification', 'Suspend an approved verification pending compliance inquiry'),
    ('verification.revoke', 'verification', 'Revoke an approved verification due to policy violations'),
    ('verification.documents.view', 'verification', 'Generate short-lived signed URLs to inspect sensitive identity documents'),
    ('verification.manage_rules', 'verification', 'Manage regional verification rules and document requirements'),
    ('verification.audit.view', 'verification', 'Inspect verification audit trail and decision logs')
ON CONFLICT (code) DO NOTHING;

-- 4. Map verification permissions to Super Admin and Compliance Manager
DO $$
DECLARE
    super_admin_role_id UUID;
    compliance_role_id UUID;
    perm RECORD;
BEGIN
    SELECT id INTO super_admin_role_id FROM public.admin_roles WHERE name = 'Super Admin' LIMIT 1;
    SELECT id INTO compliance_role_id FROM public.admin_roles WHERE name = 'Compliance Manager' LIMIT 1;

    IF super_admin_role_id IS NOT NULL THEN
        FOR perm IN SELECT id FROM public.admin_permissions WHERE module = 'verification' LOOP
            INSERT INTO public.admin_role_permissions (role_id, permission_id)
            VALUES (super_admin_role_id, perm.id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;

    IF compliance_role_id IS NOT NULL THEN
        FOR perm IN SELECT id FROM public.admin_permissions WHERE module = 'verification' LOOP
            INSERT INTO public.admin_role_permissions (role_id, permission_id)
            VALUES (compliance_role_id, perm.id)
            ON CONFLICT DO NOTHING;
        END LOOP;
    END IF;
END $$;
