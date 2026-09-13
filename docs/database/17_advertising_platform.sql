-- ============================================================
-- PETO ADMIN SYSTEM — PHASE 8: ADVERTISING PLATFORM
-- File: docs/database/17_advertising_platform.sql
-- ============================================================

-- 1. Advertisers Table
CREATE TABLE IF NOT EXISTS public.advertisers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    company_name TEXT NOT NULL,
    contact_name TEXT NOT NULL,
    contact_email TEXT NOT NULL,
    website_url TEXT,
    industry TEXT DEFAULT 'PET_CARE',
    status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION'
    total_spend NUMERIC(12, 2) DEFAULT 0.00,
    balance NUMERIC(12, 2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_advertisers_status ON public.advertisers(status);
CREATE INDEX IF NOT EXISTS idx_advertisers_user_id ON public.advertisers(user_id);
CREATE INDEX IF NOT EXISTS idx_advertisers_created_at ON public.advertisers(created_at DESC);

-- 2. Ad Campaigns Table
CREATE TABLE IF NOT EXISTS public.ad_campaigns (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    advertiser_id UUID NOT NULL REFERENCES public.advertisers(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    objective TEXT NOT NULL, -- 'AWARENESS', 'TRAFFIC', 'ENGAGEMENT', 'CONVERSIONS', 'APP_PROMOTION'
    budget_type TEXT NOT NULL DEFAULT 'DAILY', -- 'DAILY', 'LIFETIME'
    total_budget NUMERIC(12, 2) DEFAULT 0.00,
    daily_budget NUMERIC(12, 2) DEFAULT 0.00,
    spent NUMERIC(12, 2) DEFAULT 0.00,
    start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_date TIMESTAMPTZ,
    status TEXT NOT NULL DEFAULT 'PENDING_REVIEW', -- 'DRAFT', 'PENDING_REVIEW', 'ACTIVE', 'PAUSED', 'COMPLETED', 'REJECTED', 'CHANGES_REQUESTED'
    rejection_reason TEXT,
    admin_feedback TEXT,
    approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_campaigns_status ON public.ad_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_advertiser_id ON public.ad_campaigns(advertiser_id);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_objective ON public.ad_campaigns(objective);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_dates ON public.ad_campaigns(start_date, end_date);

-- 3. Ad Targeting Table (One-to-One / Dimension Configuration per Campaign)
CREATE TABLE IF NOT EXISTS public.ad_targeting (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
    countries TEXT[] DEFAULT ARRAY['ALL']::TEXT[],
    regions TEXT[] DEFAULT ARRAY[]::TEXT[],
    languages TEXT[] DEFAULT ARRAY['en']::TEXT[],
    pet_interests TEXT[] DEFAULT ARRAY['DOGS', 'CATS']::TEXT[], -- 'DOGS', 'CATS', 'BIRDS', 'REPTILES', 'FISH', 'PET_FOOD', 'VET_HEALTH', 'PET_ADOPTION', 'PET_TRAINING', 'PET_ACCESSORIES'
    devices TEXT[] DEFAULT ARRAY['ALL']::TEXT[], -- 'ALL', 'IOS', 'ANDROID', 'WEB'
    placements TEXT[] DEFAULT ARRAY['FEED', 'REELS']::TEXT[], -- 'FEED', 'REELS', 'COMMUNITIES', 'EXPLORE'
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_ad_targeting_campaign UNIQUE (campaign_id)
);

CREATE INDEX IF NOT EXISTS idx_ad_targeting_campaign_id ON public.ad_targeting(campaign_id);

-- 4. Ad Creatives Table
CREATE TABLE IF NOT EXISTS public.ad_creatives (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    format TEXT NOT NULL DEFAULT 'IMAGE', -- 'IMAGE', 'VIDEO', 'CAROUSEL', 'SPONSORED_POST'
    headline TEXT NOT NULL,
    body_text TEXT,
    call_to_action TEXT NOT NULL DEFAULT 'LEARN_MORE', -- 'LEARN_MORE', 'SHOP_NOW', 'SIGN_UP', 'VISIT_PROFILE', 'ADOPT_NOW', 'CONTACT_US'
    destination_url TEXT NOT NULL,
    media_urls JSONB DEFAULT '[]'::JSONB, -- [{"type": "image", "url": "...", "thumbnail": "..."}]
    status TEXT NOT NULL DEFAULT 'PENDING_REVIEW', -- 'DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED'
    rejection_reason TEXT,
    admin_feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ad_creatives_campaign_id ON public.ad_creatives(campaign_id);
CREATE INDEX IF NOT EXISTS idx_ad_creatives_status ON public.ad_creatives(status);

-- 5. Ad Analytics Daily Table
CREATE TABLE IF NOT EXISTS public.ad_analytics_daily (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
    creative_id UUID REFERENCES public.ad_creatives(id) ON DELETE CASCADE,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    impressions BIGINT NOT NULL DEFAULT 0,
    reach BIGINT NOT NULL DEFAULT 0,
    clicks BIGINT NOT NULL DEFAULT 0,
    views BIGINT NOT NULL DEFAULT 0,
    conversions BIGINT NOT NULL DEFAULT 0,
    spend NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_ad_analytics_campaign_creative_date UNIQUE (campaign_id, creative_id, date)
);

CREATE INDEX IF NOT EXISTS idx_ad_analytics_campaign_date ON public.ad_analytics_daily(campaign_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_ad_analytics_date ON public.ad_analytics_daily(date DESC);

-- ============================================================
-- SEED INITIAL ADVERTISERS, CAMPAIGNS & CREATIVES
-- ============================================================

-- Advertisers
INSERT INTO public.advertisers (id, company_name, contact_name, contact_email, website_url, industry, status, total_spend, balance)
VALUES
    ('a0000000-0000-0000-0000-000000000001', 'Bark & Whiskers Organic Foods', 'Sarah Jenkins', 'partners@barkandwhiskers.pet', 'https://barkandwhiskers.pet', 'PET_FOOD', 'ACTIVE', 3240.50, 759.50),
    ('a0000000-0000-0000-0000-000000000002', 'PawHealth Tele-Vet Services', 'Dr. Marcus Vance', 'ads@pawhealthtele.com', 'https://pawhealthtele.com', 'VET_HEALTH', 'ACTIVE', 5120.00, 1880.00),
    ('a0000000-0000-0000-0000-000000000003', 'SafePaws Smart Collars & GPS', 'Elena Rostova', 'growth@safepaws.io', 'https://safepaws.io', 'PET_ACCESSORIES', 'ACTIVE', 1840.00, 3160.00),
    ('a0000000-0000-0000-0000-000000000004', 'HappyTails Adoption Haven', 'Carlos Mendez', 'director@happytailshaven.org', 'https://happytailshaven.org', 'PET_ADOPTION', 'PENDING_VERIFICATION', 0.00, 500.00)
ON CONFLICT (id) DO NOTHING;

-- Campaigns
INSERT INTO public.ad_campaigns (id, advertiser_id, name, objective, budget_type, total_budget, daily_budget, spent, start_date, end_date, status, approved_at)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Fresh Freeze-Dried Raw Kibble Launch', 'TRAFFIC', 'DAILY', 2000.00, 100.00, 1420.50, now() - INTERVAL '14 days', now() + INTERVAL '16 days', 'ACTIVE', now() - INTERVAL '14 days'),
    ('c0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', '24/7 Virtual Vet Consults for Puppies', 'CONVERSIONS', 'DAILY', 3500.00, 150.00, 2840.00, now() - INTERVAL '20 days', now() + INTERVAL '10 days', 'ACTIVE', now() - INTERVAL '20 days'),
    ('c0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'Never Lose Your Pet: Smart GPS Collar v2', 'AWARENESS', 'DAILY', 1500.00, 50.00, 0.00, now(), now() + INTERVAL '30 days', 'PENDING_REVIEW', NULL),
    ('c0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 'Adopt a Senior Cat This Autumn', 'ENGAGEMENT', 'LIFETIME', 500.00, 25.00, 0.00, now(), now() + INTERVAL '15 days', 'PENDING_REVIEW', NULL)
ON CONFLICT (id) DO NOTHING;

-- Targeting
INSERT INTO public.ad_targeting (campaign_id, countries, regions, languages, pet_interests, devices, placements)
VALUES
    ('c0000000-0000-0000-0000-000000000001', ARRAY['US', 'CA', 'GB'], ARRAY['California', 'Texas', 'New York'], ARRAY['en'], ARRAY['DOGS', 'CATS', 'PET_FOOD'], ARRAY['ALL'], ARRAY['FEED', 'REELS']),
    ('c0000000-0000-0000-0000-000000000002', ARRAY['US'], ARRAY[]::TEXT[], ARRAY['en'], ARRAY['DOGS', 'CATS', 'VET_HEALTH'], ARRAY['IOS', 'ANDROID'], ARRAY['FEED', 'REELS', 'COMMUNITIES']),
    ('c0000000-0000-0000-0000-000000000003', ARRAY['US', 'GB', 'IN'], ARRAY[]::TEXT[], ARRAY['en'], ARRAY['DOGS', 'PET_ACCESSORIES'], ARRAY['ALL'], ARRAY['FEED', 'EXPLORE']),
    ('c0000000-0000-0000-0000-000000000004', ARRAY['US'], ARRAY['East Coast'], ARRAY['en'], ARRAY['CATS', 'PET_ADOPTION'], ARRAY['ALL'], ARRAY['FEED', 'COMMUNITIES'])
ON CONFLICT (campaign_id) DO NOTHING;

-- Creatives
INSERT INTO public.ad_creatives (id, campaign_id, name, format, headline, body_text, call_to_action, destination_url, media_urls, status)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Raw Feast Single Image Feed', 'IMAGE', 'Wholesome Nutrition for Your Furry Companion', '100% natural, human-grade freeze-dried meals crafted by veterinary nutritionists. Claim 20% off your first pet box today.', 'SHOP_NOW', 'https://barkandwhiskers.pet/shop-peto', '[{"type": "image", "url": "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?w=800"}]'::JSONB, 'APPROVED'),
    ('b0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000002', 'Puppy Care Consultation Video', 'VIDEO', 'Instant Vet Care In Your Pocket — 24/7', 'Connect with certified veterinary doctors in under 2 minutes. No stressful car rides or waiting rooms.', 'SIGN_UP', 'https://pawhealthtele.com/consult', '[{"type": "video", "url": "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4", "thumbnail": "https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=800"}]'::JSONB, 'APPROVED'),
    ('b0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000003', 'Smart Collar 3-Card Carousel', 'CAROUSEL', 'Real-Time GPS Tracking & Health Monitoring', 'Waterproof, 30-day battery life, and instant escape alerts directly to your phone. Order with free worldwide shipping.', 'LEARN_MORE', 'https://safepaws.io/v2', '[{"type": "image", "url": "https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=800", "title": "Live GPS Tracking"}, {"type": "image", "url": "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=800", "title": "Waterproof IP68"}, {"type": "image", "url": "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=800", "title": "Activity Ring Insights"}]'::JSONB, 'PENDING_REVIEW'),
    ('b0000000-0000-0000-0000-000000000004', 'c0000000-0000-0000-0000-000000000004', 'Adopt Whiskers Sponsored Community Story', 'SPONSORED_POST', 'Give a Loving Forever Home to Gentle Seniors', 'Meet our calm, affectionate rescue cats looking for warm laps and peaceful households. Adoption fees sponsored this month.', 'ADOPT_NOW', 'https://happytailshaven.org/seniors', '[{"type": "image", "url": "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=800"}]'::JSONB, 'PENDING_REVIEW')
ON CONFLICT (id) DO NOTHING;

-- Analytics Daily
INSERT INTO public.ad_analytics_daily (campaign_id, creative_id, date, impressions, reach, clicks, views, conversions, spend)
VALUES
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '3 days', 8400, 7200, 312, 1850, 24, 102.50),
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '2 days', 9150, 7900, 345, 2100, 28, 114.00),
    ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', CURRENT_DATE - INTERVAL '1 days', 10200, 8850, 420, 2450, 35, 128.50),
    ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', CURRENT_DATE - INTERVAL '3 days', 12400, 10800, 510, 4200, 42, 145.00),
    ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', CURRENT_DATE - INTERVAL '2 days', 13100, 11400, 545, 4600, 48, 152.00),
    ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', CURRENT_DATE - INTERVAL '1 days', 14250, 12300, 610, 5100, 54, 165.00)
ON CONFLICT (campaign_id, creative_id, date) DO NOTHING;
