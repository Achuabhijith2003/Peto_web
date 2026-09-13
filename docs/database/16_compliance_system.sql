-- ============================================================
-- PETO ADMIN SYSTEM — PHASE 7: COMPLIANCE & LEGAL MANAGEMENT
-- File: docs/database/16_compliance_system.sql
-- ============================================================

-- 1. Policies Table with Versioning Support
CREATE TABLE IF NOT EXISTS public.compliance_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_type TEXT NOT NULL, -- 'TERMS_OF_SERVICE', 'PRIVACY_POLICY', 'COMMUNITY_GUIDELINES', 'CONTENT_POLICY', 'ADVERTISING_POLICY', 'COOKIE_POLICY'
    title TEXT NOT NULL,
    version TEXT NOT NULL, -- e.g. '1.0.0', '1.1.0'
    status TEXT NOT NULL DEFAULT 'DRAFT', -- 'DRAFT', 'PUBLISHED', 'ARCHIVED'
    content TEXT NOT NULL,
    summary_of_changes TEXT,
    published_at TIMESTAMPTZ,
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_policy_type_version UNIQUE (policy_type, version)
);

CREATE INDEX IF NOT EXISTS idx_compliance_policies_type_status ON public.compliance_policies(policy_type, status);
CREATE INDEX IF NOT EXISTS idx_compliance_policies_created_at ON public.compliance_policies(created_at DESC);

-- 2. Data Requests Management Table
CREATE TABLE IF NOT EXISTS public.compliance_data_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    request_type TEXT NOT NULL, -- 'DATA_ACCESS', 'DATA_EXPORT', 'ACCOUNT_DELETION', 'DATA_CORRECTION', 'PRIVACY_REQUEST'
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PROCESSING', 'COMPLETED', 'REJECTED'
    details TEXT,
    verification_status TEXT DEFAULT 'VERIFIED', -- 'PENDING_VERIFICATION', 'VERIFIED', 'FAILED'
    resolution_notes TEXT,
    processed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_data_requests_status ON public.compliance_data_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_requests_type ON public.compliance_data_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_data_requests_user ON public.compliance_data_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_requests_created ON public.compliance_data_requests(created_at DESC);

-- 3. Data Retention Configuration Table
CREATE TABLE IF NOT EXISTS public.compliance_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT UNIQUE NOT NULL, -- 'DELETED_USERS', 'DELETED_POSTS', 'DELETED_MEDIA', 'REPORTS', 'MODERATION_RECORDS', 'AUDIT_LOGS'
    name TEXT NOT NULL,
    retention_days INTEGER NOT NULL,
    description TEXT NOT NULL,
    legal_basis TEXT NOT NULL,
    auto_purge_enabled BOOLEAN DEFAULT FALSE,
    updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Seed Default Retention Settings
INSERT INTO public.compliance_retention_policies (category, name, retention_days, description, legal_basis, auto_purge_enabled)
VALUES
    ('DELETED_USERS', 'Deleted User Accounts', 30, 'Grace period allowing users to recover accidentally closed accounts before personal identifiable information (PII) is permanently scrubbed or anonymized.', 'GDPR Art. 17 (Right to erasure) with standard 30-day operational recovery grace period.', FALSE),
    ('DELETED_POSTS', 'Deleted Posts & Comments', 30, 'Soft-deleted posts and commentary retained temporarily for abuse prevention, moderation review, and audit reconciliation.', 'Legitimate interests (fraud prevention, platform security) prior to hard deletion.', FALSE),
    ('DELETED_MEDIA', 'Orphaned & Deleted Media', 14, 'Storage retention window for image and video blobs marked for deletion before storage bucket cleanup tasks run.', 'Storage management and operational hygiene.', FALSE),
    ('REPORTS', 'User Content Reports', 365, 'Retention duration for user-submitted safety reports to track repeat offense patterns and evaluate moderation accuracy.', 'Platform safety, community defense, and recurring harassment prevention.', FALSE),
    ('MODERATION_RECORDS', 'Moderator Action Records', 730, 'Administrative moderation decisions, suspension histories, and ban logs preserved for dispute resolution and transparency.', 'Legal defense, regulatory accountability, and DSA compliance records.', FALSE),
    ('AUDIT_LOGS', 'Administrative Audit Logs', 90, 'Immutable administrative action logs kept for security monitoring, forensics, and compliance verification.', 'SOC2 / ISO 27001 operational security and administrative audit requirements.', FALSE)
ON CONFLICT (category) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    legal_basis = EXCLUDED.legal_basis;

-- 5. Seed Initial Published Policies (Version 1.0.0)
INSERT INTO public.compliance_policies (policy_type, title, version, status, content, summary_of_changes, published_at)
VALUES
    ('TERMS_OF_SERVICE', 'Terms of Service', '1.0.0', 'PUBLISHED', 
     '# Peto Terms of Service\n\n**Effective Date: January 1, 2026**\n\nWelcome to Peto! By accessing or using our mobile application, website, and services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our platform.\n\n### 1. User Eligibility\nYou must be at least 13 years old to create an account on Peto. By registering, you warrant that all information provided is accurate and truthful.\n\n### 2. Community Standards\nYou agree not to post content that depicts animal cruelty, illegal wildlife trade, harassment, hate speech, or sexually explicit material.\n\n### 3. Account Termination\nPeto reserves the right to suspend or terminate accounts that violate our community standards or pose a security risk.\n\n### 4. Contact\nFor questions regarding these Terms, contact legal@peto.app.', 
     'Initial official release of Peto Terms of Service.', now()),

    ('PRIVACY_POLICY', 'Privacy Policy', '1.0.0', 'PUBLISHED',
     '# Peto Privacy Policy\n\n**Effective Date: January 1, 2026**\n\nYour privacy is paramount to us. This Privacy Policy explains how Peto collects, uses, protects, and discloses personal information.\n\n### 1. Information Collected\nWe collect information you provide directly (username, profile details, pet information, uploaded photos and videos) and usage data (interactions, likes, bookmarks).\n\n### 2. How Information is Used\nTo deliver social features, suggest relevant pet communities, ensure community safety, and prevent fraudulent activity.\n\n### 3. Your Rights (GDPR & CCPA)\nYou have the right to request access to your data, request data exports, correct inaccuracies, or request permanent account deletion via our Privacy Center.\n\n### 4. Data Security\nWe employ TLS encryption and enterprise database access controls to safeguard your data.',
     'Initial official release of Peto Privacy Policy.', now()),

    ('COMMUNITY_GUIDELINES', 'Community Guidelines', '1.0.0', 'PUBLISHED',
     '# Peto Community Guidelines\n\n**Effective Date: January 1, 2026**\n\nPeto is dedicated to creating a safe, loving, and supportive space for pets and pet parents.\n\n### 1. Animal Welfare First\nWe maintain zero tolerance for animal neglect, animal cruelty, abusive training methods, or illegal animal fighting.\n\n### 2. Kindness & Respect\nTreat fellow pet lovers with empathy. Bullying, hate speech, and personal harassment will result in immediate suspension.\n\n### 3. Authentic Content\nShare genuine stories and advice. Misleading medical advice or deceptive commercial scams are strictly prohibited.',
     'Initial official release of Peto Community Guidelines.', now()),

    ('CONTENT_POLICY', 'Content & Media Policy', '1.0.0', 'PUBLISHED',
     '# Peto Content & Media Policy\n\n**Effective Date: January 1, 2026**\n\nThis policy outlines acceptable media formats, copyright standards, and prohibited visual content across posts, reels, and comments.\n\n### 1. Intellectual Property\nOnly upload photos, videos, and media that you own or have explicit permission to share.\n\n### 2. Sensitive Content\nGraphic injury depictions or hazardous animal situations will be removed or restricted behind warning screens.\n\n### 3. Moderation Enforcement\nContent flagged by users undergoes review by human moderators and automated safety filters.',
     'Initial official release of Peto Content Policy.', now()),

    ('ADVERTISING_POLICY', 'Advertising & Promotion Policy', '1.0.0', 'PUBLISHED',
     '# Peto Advertising Policy\n\n**Effective Date: January 1, 2026**\n\nGuidelines for sponsored content, advertisements, and community promotions on Peto.\n\n### 1. Prohibited Products\nWe prohibit advertising for non-certified pet pharmaceuticals, puppy mills, aggressive commercial breeding, and untested supplements.\n\n### 2. Transparency\nAll sponsored content and paid campaigns must clearly declare sponsor attribution.\n\n### 3. Compliance Review\nAll ad creatives are pre-screened for compliance before delivery.',
     'Initial official release of Peto Advertising Policy.', now()),

    ('COOKIE_POLICY', 'Cookie & Tracking Policy', '1.0.0', 'PUBLISHED',
     '# Peto Cookie Policy\n\n**Effective Date: January 1, 2026**\n\nExplanation of cookies, local storage, and tracking technologies utilized on the Peto web platform.\n\n### 1. Essential Cookies\nRequired for authentication, session continuity, and account security.\n\n### 2. Functional & Analytical Storage\nUsed to remember preferences (e.g. theme, volume) and gather aggregate performance metrics to improve response times.\n\n### 3. Managing Cookies\nYou can control or disable non-essential cookies through your browser settings.',
     'Initial official release of Peto Cookie Policy.', now())
ON CONFLICT (policy_type, version) DO UPDATE SET
    title = EXCLUDED.title,
    content = EXCLUDED.content,
    summary_of_changes = EXCLUDED.summary_of_changes;
