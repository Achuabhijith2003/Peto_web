-- =========================================================================
-- Migration 13: Peto Centralized Content Moderation & Reports System
-- =========================================================================

-- 1. Centralized Reports Table
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    target_type VARCHAR(30) NOT NULL CHECK (target_type IN ('user', 'post', 'reel', 'comment', 'community')),
    target_id VARCHAR(255) NOT NULL,
    reason VARCHAR(100) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'UNDER_REVIEW', 'RESOLVED', 'REJECTED', 'ESCALATED')),
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolution TEXT,
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Performance Indexes for Moderation Queue & Filtering
CREATE INDEX IF NOT EXISTS idx_reports_status_created 
    ON public.reports (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_target 
    ON public.reports (target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_reports_reporter 
    ON public.reports (reporter_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_assigned 
    ON public.reports (assigned_to) 
    WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_reports_priority 
    ON public.reports (priority);

-- 3. Row Level Security (RLS)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Note: The backend Express server interacts via the Supabase Service Role Key,
-- ensuring admin moderation operations bypass client RLS restrictions safely.
