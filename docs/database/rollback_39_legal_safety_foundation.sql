-- ============================================================================
-- ROLLBACK SCRIPT: Undo Migration 39 (Legal & Safety Foundation)
-- File: docs/database/rollback_39_legal_safety_foundation.sql
-- Description: Completely reverses all schema & table changes made by migration 39
-- ============================================================================

BEGIN;

-- 1. Drop all triggers created in migration 39
DROP TRIGGER IF EXISTS compliance_policy_legal_guard ON public.compliance_policies;
DROP TRIGGER IF EXISTS privacy_request_status_notification ON public.compliance_data_requests;
DROP TRIGGER IF EXISTS urgent_safety_report_notification ON public.reports;
DROP TRIGGER IF EXISTS compliance_record_optional_consent ON public.compliance_consent_choices;

-- 2. Drop all functions created in migration 39
DROP FUNCTION IF EXISTS public.guard_policy_legal_review();
DROP FUNCTION IF EXISTS public.publish_reviewed_policy(uuid, uuid);
DROP FUNCTION IF EXISTS public.notify_privacy_request_status();
DROP FUNCTION IF EXISTS public.notify_urgent_safety_report();
DROP FUNCTION IF EXISTS public.record_optional_consent_change();

-- 3. Drop all new tables created in migration 39 (CASCADE drops foreign keys, indexes & rules)
DROP TABLE IF EXISTS public.compliance_export_artifacts CASCADE;
DROP TABLE IF EXISTS public.compliance_report_appeals CASCADE;
DROP TABLE IF EXISTS public.compliance_ip_cases CASCADE;
DROP TABLE IF EXISTS public.compliance_consent_events CASCADE;
DROP TABLE IF EXISTS public.compliance_consent_choices CASCADE;
DROP TABLE IF EXISTS public.compliance_signup_attestations CASCADE;
DROP TABLE IF EXISTS public.compliance_release_config CASCADE;

-- 4. Drop indexes added to pre-existing tables
DROP INDEX IF EXISTS public.compliance_one_open_request;
DROP INDEX IF EXISTS public.compliance_requests_owner;
DROP INDEX IF EXISTS public.compliance_ack_user_document;

-- 5. Restore original constraint on compliance_policy_acknowledgements
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uq_user_policy_acknowledgement'
  ) THEN
    ALTER TABLE public.compliance_policy_acknowledgements
      ADD CONSTRAINT uq_user_policy_acknowledgement UNIQUE (user_id, policy_type, version);
  END IF;
EXCEPTION
  WHEN others THEN
    RAISE NOTICE 'Could not recreate uq_user_policy_acknowledgement constraint: %', SQLERRM;
END $$;

-- 6. Remove columns added to existing tables
ALTER TABLE public.compliance_policies
  DROP COLUMN IF EXISTS legal_review_reference,
  DROP COLUMN IF EXISTS legal_approved_at,
  DROP COLUMN IF EXISTS legal_approved_by;

ALTER TABLE public.compliance_data_requests
  DROP COLUMN IF EXISTS legal_hold,
  DROP COLUMN IF EXISTS public_response,
  DROP COLUMN IF EXISTS export_path,
  DROP COLUMN IF EXISTS export_expires_at;

ALTER TABLE public.compliance_data_requests
  ALTER COLUMN verification_status SET DEFAULT 'VERIFIED';

ALTER TABLE public.compliance_policy_acknowledgements
  DROP COLUMN IF EXISTS region_code,
  DROP COLUMN IF EXISTS minimum_age,
  DROP COLUMN IF EXISTS age_attested;

-- 7. Restore RLS and Table Permissions
-- Migration 39 revoked all permissions from anon & authenticated and locked these tables.
ALTER TABLE public.compliance_policies DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_data_requests DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_policy_acknowledgements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_retention_policies DISABLE ROW LEVEL SECURITY;

GRANT ALL ON public.compliance_policies TO postgres, service_role;
GRANT ALL ON public.compliance_policies TO anon, authenticated;

GRANT ALL ON public.compliance_data_requests TO postgres, service_role;
GRANT ALL ON public.compliance_data_requests TO anon, authenticated;

GRANT ALL ON public.compliance_policy_acknowledgements TO postgres, service_role;
GRANT ALL ON public.compliance_policy_acknowledgements TO anon, authenticated;

GRANT ALL ON public.compliance_retention_policies TO postgres, service_role;
GRANT ALL ON public.compliance_retention_policies TO anon, authenticated;

-- 8. Restore status for any policy that got stuck in legal review workflow
UPDATE public.compliance_policies
SET status = 'PUBLISHED'
WHERE status IN ('LEGAL_REVIEW', 'APPROVED');

COMMIT;
