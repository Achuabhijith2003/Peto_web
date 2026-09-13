-- =========================================================================
-- Migration 11: Peto Admin Control Panel Foundation, RBAC & Audit System
-- =========================================================================

-- 1. Admin Roles Table
CREATE TABLE IF NOT EXISTS public.admin_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    is_system BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Admin Permissions Table
CREATE TABLE IF NOT EXISTS public.admin_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(100) NOT NULL UNIQUE,
    module VARCHAR(50) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Admin Role Permissions Junction Table
CREATE TABLE IF NOT EXISTS public.admin_role_permissions (
    role_id UUID NOT NULL REFERENCES public.admin_roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES public.admin_permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

-- 4. Admin Users Table (Binds existing profiles to administrative roles)
CREATE TABLE IF NOT EXISTS public.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES public.admin_roles(id) ON DELETE RESTRICT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    invited_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Admin Audit Logs Table (Immutable high-integrity action log)
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id UUID REFERENCES public.admin_users(id) ON DELETE SET NULL,
    admin_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Indexes for Performance & Scalability
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON public.admin_users(role_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_active ON public.admin_users(is_active);
CREATE INDEX IF NOT EXISTS idx_admin_role_perms_perm ON public.admin_role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_action ON public.admin_audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_admin ON public.admin_audit_logs(admin_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_resource ON public.admin_audit_logs(resource_type, resource_id);

-- 7. Seed System Roles
INSERT INTO public.admin_roles (name, description, is_system)
VALUES 
    ('Super Admin', 'Full unrestricted platform access to all operational, security, and administrative systems.', TRUE),
    ('Admin', 'Platform management with administrative privileges excluding destructive system permissions.', TRUE),
    ('Moderator', 'Content moderation for posts, reels, comments, communities, and user reports.', TRUE),
    ('Support', 'User assistance and verification with read access to users, reports, and logs.', TRUE),
    ('Analyst', 'Platform performance, engagement, retention, and analytics review access.', TRUE),
    ('Ads Manager', 'Management of advertising accounts, campaigns, creatives, and performance.', TRUE),
    ('Compliance Manager', 'Policies, privacy, user data requests, and regulatory compliance audit management.', TRUE)
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;

-- 8. Seed Standard Granular Permissions
INSERT INTO public.admin_permissions (code, module, description)
VALUES
    -- Users Module
    ('users.view', 'users', 'View user profiles, statuses, and registration details'),
    ('users.edit', 'users', 'Modify user metadata, account credentials, or profile flags'),
    ('users.suspend', 'users', 'Temporarily suspend user accounts from accessing the platform'),
    ('users.ban', 'users', 'Permanently ban user accounts'),
    ('users.verify', 'users', 'Grant or revoke verified badge status on user profiles'),

    -- Content Modules
    ('posts.view', 'posts', 'View all posts, including deleted or restricted community posts'),
    ('posts.remove', 'posts', 'Remove or unpublish posts from the feed'),
    ('comments.view', 'comments', 'Inspect comments across all posts and reels'),
    ('comments.remove', 'comments', 'Delete comments violating community standards'),
    ('reels.view', 'reels', 'View all video reels and associated metrics'),
    ('reels.remove', 'reels', 'Remove video reels from discovery and user feeds'),

    -- Communities Module
    ('communities.view', 'communities', 'Inspect communities, memberships, and community rules'),
    ('communities.manage', 'communities', 'Archive, transfer ownership, or enforce rules on communities'),

    -- Moderation & Reports Module
    ('reports.view', 'reports', 'View platform and community user reports queue'),
    ('reports.manage', 'reports', 'Review, resolve, or dismiss reported content items and users'),

    -- Analytics Module
    ('analytics.view', 'analytics', 'Access platform analytics, retention metrics, and aggregate reports'),

    -- Ads Module
    ('ads.view', 'ads', 'View advertising campaigns, ad spend, and advertiser accounts'),
    ('ads.create', 'ads', 'Create and configure ad placements and campaigns'),
    ('ads.approve', 'ads', 'Review and approve or reject ad creatives'),
    ('ads.manage', 'ads', 'Pause, terminate, or adjust budget for active advertisements'),

    -- Compliance Module
    ('compliance.view', 'compliance', 'Inspect compliance policies, audit trails, and privacy logs'),
    ('compliance.manage', 'compliance', 'Manage policy versions, process GDPR/CCPA data export/deletion requests'),

    -- Admins & Permissions Module
    ('admins.view', 'admins', 'View active administrators and administrative assignments'),
    ('admins.create', 'admins', 'Assign administrative roles to registered Peto users'),
    ('admins.update', 'admins', 'Modify admin roles or toggle active/suspended administrative status'),
    ('roles.view', 'roles', 'Inspect role definitions and permission mappings'),
    ('roles.manage', 'roles', 'Create, update, and configure role-permission assignments'),

    -- System & Settings Module
    ('system.view', 'system', 'Inspect system health, database status, API metrics, and storage'),
    ('system.manage', 'system', 'Modify system settings, maintenance mode, and feature configurations'),
    ('feature_flags.view', 'feature_flags', 'View feature flag statuses and rollout percentages'),
    ('feature_flags.manage', 'feature_flags', 'Toggle feature flags and configure feature rollouts'),

    -- Audit Logs Module
    ('audit_logs.view', 'audit_logs', 'Inspect full immutable administrative audit logs')
ON CONFLICT (code) DO NOTHING;

-- 9. Map Permissions to Roles
DO $$
DECLARE
    super_admin_id UUID;
    admin_id UUID;
    moderator_id UUID;
    support_id UUID;
    analyst_id UUID;
    ads_manager_id UUID;
    compliance_id UUID;
BEGIN
    SELECT id INTO super_admin_id FROM public.admin_roles WHERE name = 'Super Admin';
    SELECT id INTO admin_id FROM public.admin_roles WHERE name = 'Admin';
    SELECT id INTO moderator_id FROM public.admin_roles WHERE name = 'Moderator';
    SELECT id INTO support_id FROM public.admin_roles WHERE name = 'Support';
    SELECT id INTO analyst_id FROM public.admin_roles WHERE name = 'Analyst';
    SELECT id INTO ads_manager_id FROM public.admin_roles WHERE name = 'Ads Manager';
    SELECT id INTO compliance_id FROM public.admin_roles WHERE name = 'Compliance Manager';

    -- Super Admin: ALL permissions
    INSERT INTO public.admin_role_permissions (role_id, permission_id)
    SELECT super_admin_id, id FROM public.admin_permissions
    ON CONFLICT DO NOTHING;

    -- Admin: Operational and management permissions
    INSERT INTO public.admin_role_permissions (role_id, permission_id)
    SELECT admin_id, id FROM public.admin_permissions
    WHERE code IN (
        'users.view', 'users.edit', 'users.suspend', 'users.verify',
        'posts.view', 'posts.remove',
        'comments.view', 'comments.remove',
        'reels.view', 'reels.remove',
        'communities.view', 'communities.manage',
        'reports.view', 'reports.manage',
        'analytics.view',
        'ads.view', 'ads.manage',
        'compliance.view',
        'admins.view',
        'roles.view',
        'system.view',
        'feature_flags.view', 'feature_flags.manage',
        'audit_logs.view'
    )
    ON CONFLICT DO NOTHING;

    -- Moderator: Content moderation & reports
    INSERT INTO public.admin_role_permissions (role_id, permission_id)
    SELECT moderator_id, id FROM public.admin_permissions
    WHERE code IN (
        'users.view',
        'posts.view', 'posts.remove',
        'comments.view', 'comments.remove',
        'reels.view', 'reels.remove',
        'communities.view', 'communities.manage',
        'reports.view', 'reports.manage'
    )
    ON CONFLICT DO NOTHING;

    -- Support: User review, viewing content, reports, and logs
    INSERT INTO public.admin_role_permissions (role_id, permission_id)
    SELECT support_id, id FROM public.admin_permissions
    WHERE code IN (
        'users.view', 'users.verify',
        'posts.view',
        'comments.view',
        'reels.view',
        'reports.view',
        'audit_logs.view'
    )
    ON CONFLICT DO NOTHING;

    -- Analyst: Analytics and viewing platform activity
    INSERT INTO public.admin_role_permissions (role_id, permission_id)
    SELECT analyst_id, id FROM public.admin_permissions
    WHERE code IN (
        'analytics.view',
        'posts.view',
        'reels.view',
        'communities.view',
        'users.view'
    )
    ON CONFLICT DO NOTHING;

    -- Ads Manager: Ads management and analytics
    INSERT INTO public.admin_role_permissions (role_id, permission_id)
    SELECT ads_manager_id, id FROM public.admin_permissions
    WHERE code IN (
        'ads.view', 'ads.create', 'ads.approve', 'ads.manage',
        'analytics.view'
    )
    ON CONFLICT DO NOTHING;

    -- Compliance Manager: Compliance, reports, policies, audits
    INSERT INTO public.admin_role_permissions (role_id, permission_id)
    SELECT compliance_id, id FROM public.admin_permissions
    WHERE code IN (
        'compliance.view', 'compliance.manage',
        'reports.view', 'reports.manage',
        'users.view',
        'audit_logs.view'
    )
    ON CONFLICT DO NOTHING;
END $$;

-- 10. Enable Row Level Security (RLS)
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Note: The backend Express server accesses these tables via the Supabase Service Role Key,
-- ensuring privileged admin tables are never directly exposed through public Supabase anon APIs.
