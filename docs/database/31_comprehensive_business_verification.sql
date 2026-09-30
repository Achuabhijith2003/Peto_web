-- ============================================================
-- PETO SYSTEM ARCHITECTURE — PHASE 11: COMPREHENSIVE BUSINESS VERIFICATION
-- File: docs/database/31_comprehensive_business_verification.sql
-- ============================================================

-- 1. Extend public.verification_applications with multi-step business verification fields
ALTER TABLE public.verification_applications
    ADD COLUMN IF NOT EXISTS registered_address TEXT,
    ADD COLUMN IF NOT EXISTS website_url TEXT,
    ADD COLUMN IF NOT EXISTS business_type TEXT,
    ADD COLUMN IF NOT EXISTS business_category TEXT,
    ADD COLUMN IF NOT EXISTS business_description TEXT,
    ADD COLUMN IF NOT EXISTS registration_number TEXT,
    ADD COLUMN IF NOT EXISTS registration_identifier_type TEXT,
    ADD COLUMN IF NOT EXISTS registration_authority TEXT,
    ADD COLUMN IF NOT EXISTS registration_country TEXT,
    ADD COLUMN IF NOT EXISTS registration_state TEXT,
    ADD COLUMN IF NOT EXISTS registration_date DATE,
    ADD COLUMN IF NOT EXISTS tax_identifier TEXT,
    ADD COLUMN IF NOT EXISTS address_line2 TEXT,
    ADD COLUMN IF NOT EXISTS state_province TEXT,
    ADD COLUMN IF NOT EXISTS contact_email TEXT,
    ADD COLUMN IF NOT EXISTS contact_phone TEXT,
    ADD COLUMN IF NOT EXISTS representative_name TEXT,
    ADD COLUMN IF NOT EXISTS representative_role TEXT,
    ADD COLUMN IF NOT EXISTS representative_email TEXT,
    ADD COLUMN IF NOT EXISTS representative_phone TEXT,
    ADD COLUMN IF NOT EXISTS representative_relationship TEXT,
    ADD COLUMN IF NOT EXISTS submitted_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS declaration_confirmed BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS draft_step INTEGER NOT NULL DEFAULT 1;

-- 2. Extend business_identities with optional category and description
ALTER TABLE public.business_identities
    ADD COLUMN IF NOT EXISTS business_type TEXT,
    ADD COLUMN IF NOT EXISTS business_category TEXT,
    ADD COLUMN IF NOT EXISTS description TEXT;

-- 3. Extend verification_documents with rejection notes and reason aliases
ALTER TABLE public.verification_documents
    ADD COLUMN IF NOT EXISTS rejection_notes TEXT,
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- 4. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_verification_apps_business_type ON public.verification_applications(business_id, business_type);
CREATE INDEX IF NOT EXISTS idx_verification_apps_submitted_by ON public.verification_applications(submitted_by_user_id);

-- 5. Reload PostgREST schema cache immediately
NOTIFY pgrst, 'reload schema';
