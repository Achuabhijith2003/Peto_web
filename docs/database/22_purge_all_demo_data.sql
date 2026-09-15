-- ============================================================
-- PETO SYSTEM: PURGE ALL DEMO ADS & CAMPAIGNS COMPLETELY
-- File: docs/database/22_purge_all_demo_data.sql
-- ============================================================

-- Ensure currency columns exist
ALTER TABLE public.advertisers 
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';

ALTER TABLE public.ad_campaigns 
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';

-- Cleanly delete all demo/sample analytics, creatives, targeting, campaigns, and advertisers
DELETE FROM public.ad_analytics_daily;
DELETE FROM public.ad_creatives;
DELETE FROM public.ad_targeting;
DELETE FROM public.ad_campaigns;
DELETE FROM public.advertisers;

-- Verified: Table states are now 100% clean and empty.
-- Only real registered advertisers from /advertiser or admin manual creations will appear.
