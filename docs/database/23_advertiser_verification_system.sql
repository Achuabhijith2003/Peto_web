-- ============================================================
-- PETO SYSTEM ARCHITECTURE — PHASE 9: ADVERTISER & PARTNER VERIFICATION
-- File: docs/database/23_advertiser_verification_system.sql
-- ============================================================

-- 1. Extend public.advertisers with verification lifecycle status
ALTER TABLE public.advertisers 
ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'NOT_STARTED',
ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_advertisers_verification_status ON public.advertisers(verification_status);

-- 2. Extend public.profiles with distinct verification badge type
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS verification_badge_type TEXT NOT NULL DEFAULT 'NONE'; -- 'NONE', 'PERSON', 'ADVERTISER', 'BUSINESS'

CREATE INDEX IF NOT EXISTS idx_profiles_verification_badge ON public.profiles(verification_badge_type);

-- 3. Verification Applications Table
CREATE TABLE IF NOT EXISTS public.verification_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    advertiser_id UUID REFERENCES public.advertisers(id) ON DELETE CASCADE,
    verification_type TEXT NOT NULL DEFAULT 'INDIVIDUAL_IDENTITY', -- 'INDIVIDUAL_IDENTITY', 'BUSINESS_PARTNER'
    status TEXT NOT NULL DEFAULT 'NOT_STARTED', -- 'NOT_STARTED', 'DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'ADDITIONAL_INFORMATION_REQUIRED', 'APPROVED', 'REJECTED', 'EXPIRED', 'SUSPENDED', 'REVOKED'
    
    -- Individual Identity Information (Encrypted / Separated from public profiles)
    legal_first_name TEXT,
    legal_last_name TEXT,
    date_of_birth DATE,
    nationality TEXT,
    residential_country TEXT NOT NULL DEFAULT 'US',
    address_line1 TEXT,
    city TEXT,
    postal_code TEXT,

    -- Business / Partner Information
    business_legal_name TEXT,
    business_registration_number_masked TEXT,
    business_tax_id_masked TEXT,
    business_address TEXT,
    business_website TEXT,
    authorized_role TEXT, -- 'DIRECTOR', 'OWNER', 'AUTHORIZED_REPRESENTATIVE', 'AGENCY'

    -- Review & Moderation Workflow
    rejection_reason TEXT,
    additional_info_notes TEXT,
    admin_reviewer_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    submitted_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_apps_user ON public.verification_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_apps_advertiser ON public.verification_applications(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_verification_apps_status ON public.verification_applications(status);
CREATE INDEX IF NOT EXISTS idx_verification_apps_country ON public.verification_applications(residential_country);
CREATE INDEX IF NOT EXISTS idx_verification_apps_submitted ON public.verification_applications(submitted_at DESC);

-- 4. Verification Documents Table (Private storage metadata & masked identifiers)
CREATE TABLE IF NOT EXISTS public.verification_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES public.verification_applications(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL, -- 'PASSPORT', 'DRIVERS_LICENSE', 'NATIONAL_ID', 'TAX_CERTIFICATE', 'INCORPORATION_DOC', 'UTILITY_BILL'
    country_code TEXT NOT NULL DEFAULT 'US',
    storage_path TEXT NOT NULL, -- Private path in 'verification-documents' bucket
    original_file_name TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    document_number_masked TEXT, -- Strictly masked: e.g. 'XXXX-XXXX-1234'
    expiry_date DATE,
    is_front BOOLEAN NOT NULL DEFAULT TRUE,
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'ACCEPTED', 'REJECTED'
    rejection_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_docs_app ON public.verification_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_verification_docs_status ON public.verification_documents(status);

-- 5. Regional Verification Rules Table
CREATE TABLE IF NOT EXISTS public.regional_verification_rules (
    country_code TEXT PRIMARY KEY,
    country_name TEXT NOT NULL,
    individual_verification_required BOOLEAN NOT NULL DEFAULT TRUE,
    business_verification_required BOOLEAN NOT NULL DEFAULT TRUE,
    allowed_document_types TEXT[] NOT NULL DEFAULT ARRAY['PASSPORT', 'DRIVERS_LICENSE', 'NATIONAL_ID']::TEXT[],
    minimum_age INTEGER NOT NULL DEFAULT 18,
    manual_review_required BOOLEAN NOT NULL DEFAULT TRUE,
    policy_version TEXT NOT NULL DEFAULT '1.0.0',
    notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed Baseline Regional Verification Rules
INSERT INTO public.regional_verification_rules 
    (country_code, country_name, individual_verification_required, business_verification_required, allowed_document_types, minimum_age, manual_review_required, policy_version, notes)
VALUES
    ('GLOBAL', 'Global Default Policy', TRUE, TRUE, ARRAY['PASSPORT', 'NATIONAL_ID', 'DRIVERS_LICENSE']::TEXT[], 18, TRUE, '1.0.0', 'Baseline standard for international partner compliance.'),
    ('IN', 'India', TRUE, TRUE, ARRAY['NATIONAL_ID', 'PASSPORT', 'DRIVERS_LICENSE', 'TAX_CERTIFICATE']::TEXT[], 18, TRUE, '1.0.0', 'Supports PAN Card, Aadhaar Card (masked), and GSTIN registration for business partners.'),
    ('US', 'United States', TRUE, TRUE, ARRAY['DRIVERS_LICENSE', 'PASSPORT', 'NATIONAL_ID', 'TAX_CERTIFICATE', 'INCORPORATION_DOC']::TEXT[], 18, TRUE, '1.0.0', 'Requires state driver license/passport and EIN/W9 documentation for organizations.'),
    ('GB', 'United Kingdom', TRUE, TRUE, ARRAY['PASSPORT', 'DRIVERS_LICENSE', 'NATIONAL_ID', 'INCORPORATION_DOC']::TEXT[], 18, TRUE, '1.0.0', 'Companies House registration required for UK registered businesses.'),
    ('CA', 'Canada', TRUE, TRUE, ARRAY['DRIVERS_LICENSE', 'PASSPORT', 'NATIONAL_ID', 'INCORPORATION_DOC']::TEXT[], 18, TRUE, '1.0.0', 'Provincial photo ID and federal business numbers supported.'),
    ('AU', 'Australia', TRUE, TRUE, ARRAY['DRIVERS_LICENSE', 'PASSPORT', 'NATIONAL_ID', 'TAX_CERTIFICATE']::TEXT[], 18, TRUE, '1.0.0', 'Requires ABN validation and state licensing for commercial advertisers.'),
    ('DE', 'Germany', TRUE, TRUE, ARRAY['NATIONAL_ID', 'PASSPORT', 'INCORPORATION_DOC']::TEXT[], 18, TRUE, '1.0.0', 'Personalausweis or Reisepass with Handelsregister extract.'),
    ('FR', 'France', TRUE, TRUE, ARRAY['NATIONAL_ID', 'PASSPORT', 'INCORPORATION_DOC']::TEXT[], 18, TRUE, '1.0.0', 'Carte Nationale d''Identité and SIREN/SIRET verification.')
ON CONFLICT (country_code) DO UPDATE SET
    allowed_document_types = EXCLUDED.allowed_document_types,
    individual_verification_required = EXCLUDED.individual_verification_required,
    business_verification_required = EXCLUDED.business_verification_required,
    notes = EXCLUDED.notes;

-- 6. Verification Audit Events Table
CREATE TABLE IF NOT EXISTS public.verification_audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID REFERENCES public.verification_applications(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    actor_role TEXT NOT NULL DEFAULT 'USER', -- 'USER', 'ADMIN', 'SYSTEM'
    action TEXT NOT NULL, -- 'APPLICATION_CREATED', 'APPLICATION_SUBMITTED', 'DOCUMENT_UPLOADED', 'DOCUMENT_VIEWED', 'INFORMATION_REQUESTED', 'APPROVED', 'REJECTED', 'SUSPENDED', 'REVOKED'
    previous_status TEXT,
    new_status TEXT,
    reason TEXT,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_audit_app ON public.verification_audit_events(application_id);
CREATE INDEX IF NOT EXISTS idx_verification_audit_created ON public.verification_audit_events(created_at DESC);

-- 7. Seed Granular Admin Permissions for Verification Management
INSERT INTO public.admin_permissions (code, module, description)
VALUES
    ('verification.view', 'verification', 'View verification applications, review queues, and applicant metadata'),
    ('verification.review', 'verification', 'Examine verification submissions and request additional documentation'),
    ('verification.approve', 'verification', 'Approve identity and business verification applications'),
    ('verification.reject', 'verification', 'Reject verification submissions with compliance justification'),
    ('verification.documents.view', 'verification', 'Generate time-limited signed URLs to inspect sensitive identity documents'),
    ('verification.manage', 'verification', 'Manage regional verification rules, suspend or revoke advertiser badges')
ON CONFLICT (code) DO NOTHING;

-- Map Verification Permissions to Super Admin and Compliance Manager Roles
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
