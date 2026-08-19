-- =========================================================================
-- Migration 10: Peto Communities System Schema, Constraints, Indexes & RLS
-- =========================================================================

-- 1. Communities Table
CREATE TABLE IF NOT EXISTS public.communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    category VARCHAR(60) NOT NULL DEFAULT 'General',
    cover_image_url TEXT,
    icon_url TEXT,
    visibility VARCHAR(20) NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
    member_count INTEGER NOT NULL DEFAULT 1,
    post_count INTEGER NOT NULL DEFAULT 0,
    is_archived BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Community Members Table
CREATE TABLE IF NOT EXISTS public.community_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role VARCHAR(20) NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'moderator', 'member')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'pending', 'banned')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_community_member UNIQUE (community_id, user_id)
);

-- 3. Community Rules Table
CREATE TABLE IF NOT EXISTS public.community_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    position INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Community Bans Table
CREATE TABLE IF NOT EXISTS public.community_bans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    banned_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reason TEXT NOT NULL DEFAULT '',
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_community_ban UNIQUE (community_id, user_id)
);

-- 5. Community Reports Table
CREATE TABLE IF NOT EXISTS public.community_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    reported_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('spam', 'harassment', 'hate', 'misinformation', 'inappropriate', 'off-topic', 'other')),
    description TEXT NOT NULL DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'dismissed', 'actioned')),
    resolved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Modify Existing posts Table for Communities Integration
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS community_id UUID NULL REFERENCES public.communities(id) ON DELETE CASCADE;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE;

-- 7. High-Performance Composite Indexes
-- Feed Query: Fetching posts inside a community ordered by recency
CREATE INDEX IF NOT EXISTS idx_posts_community_created 
    ON public.posts (community_id, created_at DESC) 
    WHERE community_id IS NOT NULL;

-- Membership Queries: Checking a user's status across communities
CREATE INDEX IF NOT EXISTS idx_comm_members_user_status 
    ON public.community_members (user_id, status);

-- Community Queries: Checking user role and status in a specific community
CREATE INDEX IF NOT EXISTS idx_comm_members_comm_role 
    ON public.community_members (community_id, role, status);

-- Discovery Queries: Finding communities by unique slug
CREATE INDEX IF NOT EXISTS idx_communities_slug 
    ON public.communities (slug);

-- Discovery Queries: Category browsing and popular public communities
CREATE INDEX IF NOT EXISTS idx_communities_category_public 
    ON public.communities (category, visibility, member_count DESC);

-- Owner Lookup
CREATE INDEX IF NOT EXISTS idx_communities_owner 
    ON public.communities (owner_id);

-- Moderator Queue: Open reports for a community
CREATE INDEX IF NOT EXISTS idx_comm_reports_comm_status 
    ON public.community_reports (community_id, status, created_at DESC);

-- Rules Ordering: Fetching community rules sorted by position
CREATE INDEX IF NOT EXISTS idx_comm_rules_comm_pos 
    ON public.community_rules (community_id, position ASC);

-- 8. Row Level Security (RLS) Policies
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_bans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.community_reports ENABLE ROW LEVEL SECURITY;

-- Communities: Public communities viewable by all; Private communities viewable only by active members & owners
CREATE POLICY "Public communities are viewable by everyone" 
    ON public.communities FOR SELECT 
    USING (visibility = 'public' OR owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.community_members 
        WHERE community_members.community_id = communities.id 
          AND community_members.user_id = auth.uid() 
          AND community_members.status = 'active'
    ));

CREATE POLICY "Authenticated users can create communities" 
    ON public.communities FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated' AND owner_id = auth.uid());

CREATE POLICY "Owners and moderators can update their communities" 
    ON public.communities FOR UPDATE 
    USING (owner_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.community_members 
        WHERE community_members.community_id = communities.id 
          AND community_members.user_id = auth.uid() 
          AND community_members.role IN ('owner', 'moderator') 
          AND community_members.status = 'active'
    ));

CREATE POLICY "Only owners can delete communities" 
    ON public.communities FOR DELETE 
    USING (owner_id = auth.uid());

-- Community Members:
CREATE POLICY "Members viewable if community is public or viewer is active member" 
    ON public.community_members FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM public.communities 
            WHERE communities.id = community_members.community_id 
              AND communities.visibility = 'public'
        ) 
        OR user_id = auth.uid() 
        OR EXISTS (
            SELECT 1 FROM public.community_members AS cm 
            WHERE cm.community_id = community_members.community_id 
              AND cm.user_id = auth.uid() 
              AND cm.status = 'active'
        )
    );

-- 9. Enable Realtime Publications
ALTER PUBLICATION supabase_realtime ADD TABLE public.communities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.community_members;
