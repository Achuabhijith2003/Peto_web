export type CommunityVisibility = "public" | "private";
export type CommunityRole = "owner" | "moderator" | "member";
export type CommunityMemberStatus = "active" | "pending" | "banned";
export type CommunityReportReason =
    | "spam"
    | "harassment"
    | "hate"
    | "misinformation"
    | "inappropriate"
    | "off-topic"
    | "other";
export type CommunityReportStatus = "pending" | "reviewed" | "dismissed" | "actioned";

export interface Community {
    id: string;
    owner_id: string;
    name: string;
    slug: string;
    description: string;
    category: string;
    cover_image_url?: string | null;
    icon_url?: string | null;
    visibility: CommunityVisibility;
    member_count: number;
    post_count: number;
    is_archived: boolean;
    created_at: string;
    updated_at: string;
    owner?: {
        id: string;
        username: string;
        full_name: string;
        avatar_url: string | null;
        verified: boolean;
    };
    rules?: CommunityRule[];
    viewer?: {
        is_member: boolean;
        role: CommunityRole | null;
        status: CommunityMemberStatus | null;
        is_banned: boolean;
    };
}

export interface CommunityMember {
    id: string;
    community_id: string;
    user_id: string;
    role: CommunityRole;
    status: CommunityMemberStatus;
    joined_at: string;
    updated_at: string;
    profile?: {
        id: string;
        username: string;
        full_name: string;
        avatar_url: string | null;
        verified: boolean;
        bio?: string | null;
    };
}

export interface CommunityRule {
    id: string;
    community_id: string;
    title: string;
    description: string;
    position: number;
    created_at: string;
    updated_at: string;
}

export interface CommunityBan {
    id: string;
    community_id: string;
    user_id: string;
    banned_by: string;
    reason: string;
    expires_at?: string | null;
    created_at: string;
    user?: {
        id: string;
        username: string;
        full_name: string;
        avatar_url: string | null;
    };
    banner?: {
        id: string;
        username: string;
        full_name: string;
    };
}

export interface CommunityReport {
    id: string;
    community_id: string;
    reporter_id: string;
    reported_user_id?: string | null;
    post_id?: string | null;
    comment_id?: string | null;
    reason: CommunityReportReason;
    description: string;
    status: CommunityReportStatus;
    resolved_by?: string | null;
    resolved_at?: string | null;
    created_at: string;
    reporter?: {
        id: string;
        username: string;
        full_name: string;
        avatar_url: string | null;
    };
    reported_user?: {
        id: string;
        username: string;
        full_name: string;
        avatar_url: string | null;
    };
    post?: any;
    comment?: any;
}

export interface CreateCommunityInput {
    name: string;
    slug?: string;
    description?: string;
    category?: string;
    cover_image_url?: string | null;
    icon_url?: string | null;
    visibility?: CommunityVisibility;
    rules?: { title: string; description: string }[];
}

export interface UpdateCommunityInput {
    name?: string;
    description?: string;
    category?: string;
    cover_image_url?: string | null;
    icon_url?: string | null;
    visibility?: CommunityVisibility;
}

export interface QueryCommunitiesInput {
    search?: string;
    category?: string;
    visibility?: CommunityVisibility;
    sort?: "popular" | "new" | "alphabetical" | "joined";
    page?: number;
    limit?: number;
    userId?: string;
}
