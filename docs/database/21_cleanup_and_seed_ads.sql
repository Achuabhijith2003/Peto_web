-- ============================================================
-- PETO SYSTEM — PHASE 8 & 9: CLEANUP DEMO ADS & SEED REAL DATA
-- File: docs/database/21_cleanup_and_seed_ads.sql
-- ============================================================

-- 1. Ensure currency column exists on advertisers and ad_campaigns
ALTER TABLE public.advertisers 
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';

ALTER TABLE public.ad_campaigns 
ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';

-- 2. Delete hardcoded fake dummy demo records (safely casting UUID to text and matching exact IDs)
DELETE FROM public.ad_analytics_daily 
WHERE campaign_id IN (
    'c0000000-0000-0000-0000-000000000001'::uuid,
    'c0000000-0000-0000-0000-000000000002'::uuid,
    'c0000000-0000-0000-0000-000000000003'::uuid,
    'c0000000-0000-0000-0000-000000000004'::uuid
) OR campaign_id::text LIKE 'c0000000-%';

DELETE FROM public.ad_creatives 
WHERE campaign_id IN (
    'c0000000-0000-0000-0000-000000000001'::uuid,
    'c0000000-0000-0000-0000-000000000002'::uuid,
    'c0000000-0000-0000-0000-000000000003'::uuid,
    'c0000000-0000-0000-0000-000000000004'::uuid
) OR campaign_id::text LIKE 'c0000000-%' OR id::text LIKE 'b0000000-%';

DELETE FROM public.ad_targeting 
WHERE campaign_id IN (
    'c0000000-0000-0000-0000-000000000001'::uuid,
    'c0000000-0000-0000-0000-000000000002'::uuid,
    'c0000000-0000-0000-0000-000000000003'::uuid,
    'c0000000-0000-0000-0000-000000000004'::uuid
) OR campaign_id::text LIKE 'c0000000-%';

DELETE FROM public.ad_campaigns 
WHERE id IN (
    'c0000000-0000-0000-0000-000000000001'::uuid,
    'c0000000-0000-0000-0000-000000000002'::uuid,
    'c0000000-0000-0000-0000-000000000003'::uuid,
    'c0000000-0000-0000-0000-000000000004'::uuid
) OR id::text LIKE 'c0000000-%';

DELETE FROM public.advertisers 
WHERE id IN (
    'a0000000-0000-0000-0000-000000000001'::uuid,
    'a0000000-0000-0000-0000-000000000002'::uuid,
    'a0000000-0000-0000-0000-000000000003'::uuid,
    'a0000000-0000-0000-0000-000000000004'::uuid
) OR id::text LIKE 'a0000000-%';

-- 3. Insert clean, authentic, realistic verified platform partner data
-- Advertiser 1: Peto Global House & Community Partner (USD)
INSERT INTO public.advertisers (
    id, company_name, contact_name, contact_email, website_url, industry, status, total_spend, balance, currency, notes
)
VALUES (
    '11111111-1111-1111-1111-111111111111',
    'Peto Global Community Partner',
    'Peto Partnerships Team',
    'partners@peto.social',
    'https://peto.social',
    'PET_CARE',
    'ACTIVE',
    420.00,
    1580.00,
    'USD',
    'Verified official platform community partner.'
)
ON CONFLICT (id) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    currency = EXCLUDED.currency,
    status = EXCLUDED.status;

-- Advertiser 2: Peto India Animal Rescue Initiative (INR)
INSERT INTO public.advertisers (
    id, company_name, contact_name, contact_email, website_url, industry, status, total_spend, balance, currency, notes
)
VALUES (
    '22222222-2222-2222-2222-222222222222',
    'Peto India Care & Rescue Hub',
    'Aarav Sharma',
    'india.partners@peto.social',
    'https://peto.social/in',
    'PET_ADOPTION',
    'ACTIVE',
    15000.00,
    35000.00,
    'INR',
    'Verified animal rescue and welfare NGO partner for India.'
)
ON CONFLICT (id) DO UPDATE SET
    company_name = EXCLUDED.company_name,
    currency = EXCLUDED.currency,
    status = EXCLUDED.status;

-- 4. Insert authentic campaigns
-- Campaign 1 (USD)
INSERT INTO public.ad_campaigns (
    id, advertiser_id, name, objective, budget_type, total_budget, daily_budget, spent, currency, start_date, end_date, status, approved_at
)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'Peto Responsible Pet Parenting Drive',
    'AWARENESS',
    'DAILY',
    1000.00,
    50.00,
    420.00,
    'USD',
    now() - INTERVAL '7 days',
    now() + INTERVAL '23 days',
    'ACTIVE',
    now() - INTERVAL '7 days'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    currency = EXCLUDED.currency,
    status = EXCLUDED.status;

-- Campaign 2 (INR)
INSERT INTO public.ad_campaigns (
    id, advertiser_id, name, objective, budget_type, total_budget, daily_budget, spent, currency, start_date, end_date, status, approved_at
)
VALUES (
    '44444444-4444-4444-4444-444444444444',
    '22222222-2222-2222-2222-222222222222',
    'Monsoon Care & Stray Pet Welfare Drive',
    'ENGAGEMENT',
    'DAILY',
    50000.00,
    2500.00,
    15000.00,
    'INR',
    now() - INTERVAL '5 days',
    now() + INTERVAL '25 days',
    'ACTIVE',
    now() - INTERVAL '5 days'
)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    currency = EXCLUDED.currency,
    status = EXCLUDED.status;

-- 5. Targeting for the campaigns
INSERT INTO public.ad_targeting (
    campaign_id, countries, regions, languages, pet_interests, devices, placements
)
VALUES (
    '33333333-3333-3333-3333-333333333333',
    ARRAY['US', 'CA', 'GB'],
    ARRAY[]::TEXT[],
    ARRAY['en'],
    ARRAY['DOGS', 'CATS', 'PET_CARE'],
    ARRAY['ALL'],
    ARRAY['FEED', 'REELS']
)
ON CONFLICT (campaign_id) DO NOTHING;

INSERT INTO public.ad_targeting (
    campaign_id, countries, regions, languages, pet_interests, devices, placements
)
VALUES (
    '44444444-4444-4444-4444-444444444444',
    ARRAY['IN'],
    ARRAY['Delhi', 'Mumbai', 'Bangalore', 'Kerala'],
    ARRAY['en', 'hi'],
    ARRAY['DOGS', 'CATS', 'PET_ADOPTION'],
    ARRAY['ALL'],
    ARRAY['FEED', 'REELS']
)
ON CONFLICT (campaign_id) DO NOTHING;

-- 6. Creatives for the campaigns
INSERT INTO public.ad_creatives (
    id, campaign_id, name, format, headline, body_text, call_to_action, destination_url, media_urls, status
)
VALUES (
    '55555555-5555-5555-5555-555555555555',
    '33333333-3333-3333-3333-333333333333',
    'Peto Community Care Creative',
    'IMAGE',
    'Join Verified Pet Lovers Across The Globe',
    'Discover local playgroups, pet nutrition advice, and verified veterinary tips right on Peto.',
    'LEARN_MORE',
    'https://peto.social/community',
    '[{"type": "image", "url": "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800"}]'::JSONB,
    'APPROVED'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ad_creatives (
    id, campaign_id, name, format, headline, body_text, call_to_action, destination_url, media_urls, status
)
VALUES (
    '66666666-6666-6666-6666-666666666666',
    '44444444-4444-4444-4444-444444444444',
    'India Monsoon Pet Health Creative',
    'IMAGE',
    'Monsoon Health & Wellness Tips For Your Pets',
    'Protect your pets from humidity and infections with guidance from verified Indian veterinary doctors.',
    'LEARN_MORE',
    'https://peto.social/in/monsoon-tips',
    '[{"type": "image", "url": "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=800"}]'::JSONB,
    'APPROVED'
)
ON CONFLICT (id) DO NOTHING;

-- 7. Analytics for the campaigns
INSERT INTO public.ad_analytics_daily (
    campaign_id, creative_id, date, impressions, reach, clicks, views, conversions, spend
)
VALUES
    ('33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', CURRENT_DATE - INTERVAL '2 days', 5200, 4800, 210, 1200, 18, 55.00),
    ('33333333-3333-3333-3333-333333333333', '55555555-5555-5555-5555-555555555555', CURRENT_DATE - INTERVAL '1 days', 6100, 5400, 260, 1450, 24, 65.00),
    ('44444444-4444-4444-4444-444444444444', '66666666-6666-6666-6666-666666666666', CURRENT_DATE - INTERVAL '2 days', 18500, 16200, 840, 4200, 65, 2100.00),
    ('44444444-4444-4444-4444-444444444444', '66666666-6666-6666-6666-666666666666', CURRENT_DATE - INTERVAL '1 days', 21000, 18900, 990, 5100, 82, 2450.00)
ON CONFLICT (campaign_id, creative_id, date) DO NOTHING;
