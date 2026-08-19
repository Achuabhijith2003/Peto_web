import { supabase } from "../config/supabase";
import {
    CreateCommunityInput,
    UpdateCommunityInput,
    QueryCommunitiesInput,
    CommunityRole,
    CommunityMemberStatus,
} from "./community.types";
import { createNotification } from "../notifications/notification.service";

// Helper: Slugify names (e.g. "Golden Retrievers Club" -> "golden-retrievers-club")
export function generateSlug(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/[\s_-]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

/*
|--------------------------------------------------------------------------
| 1. Community CRUD Service
|--------------------------------------------------------------------------
*/

export async function createCommunityService(
    userId: string,
    input: CreateCommunityInput
) {
    let baseSlug = input.slug ? generateSlug(input.slug) : generateSlug(input.name);
    if (!baseSlug) baseSlug = `community-${Date.now().toString(36)}`;

    // Ensure slug is unique
    let uniqueSlug = baseSlug;
    let counter = 1;
    while (true) {
        const { data: existing } = await supabase
            .from("communities")
            .select("id")
            .eq("slug", uniqueSlug)
            .maybeSingle();

        if (!existing) break;
        uniqueSlug = `${baseSlug}-${counter++}`;
    }

    // 1. Insert Community
    const { data: community, error: commError } = await supabase
        .from("communities")
        .insert({
            owner_id: userId,
            name: input.name.trim(),
            slug: uniqueSlug,
            description: input.description?.trim() || "",
            category: input.category?.trim() || "General",
            cover_image_url: input.cover_image_url || null,
            icon_url: input.icon_url || null,
            visibility: input.visibility || "public",
            member_count: 1,
            post_count: 0,
        })
        .select()
        .single();

    if (commError) throw commError;

    // 2. Add Creator as Owner Member
    const { error: memberError } = await supabase
        .from("community_members")
        .insert({
            community_id: community.id,
            user_id: userId,
            role: "owner",
            status: "active",
        });

    if (memberError) {
        console.error("Error creating owner membership:", memberError);
    }

    // 3. Insert Initial Rules if provided
    if (input.rules && input.rules.length > 0) {
        const rulesToInsert = input.rules.map((r, index) => ({
            community_id: community.id,
            title: r.title.trim(),
            description: r.description?.trim() || "",
            position: index + 1,
        }));

        await supabase.from("community_rules").insert(rulesToInsert);
    }

    return getCommunityByIdService(community.id, userId);
}

export async function getCommunityByIdService(
    identifier: string, // UUID or slug
    currentUserId?: string
) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

    let query = supabase
        .from("communities")
        .select(`
            *,
            owner:profiles!communities_owner_id_fkey(
                id,
                username,
                full_name,
                avatar_url,
                verified
            ),
            rules:community_rules(
                id,
                title,
                description,
                position,
                created_at,
                updated_at
            )
        `);

    if (isUUID) {
        query = query.eq("id", identifier);
    } else {
        query = query.eq("slug", identifier);
    }

    const { data: community, error } = await query.single();
    if (error || !community) {
        throw new Error("Community not found.");
    }

    // Sort rules by position
    if (community.rules) {
        community.rules.sort((a: any, b: any) => a.position - b.position);
    }

    // Viewer context
    let viewerState = {
        is_member: false,
        role: null as CommunityRole | null,
        status: null as CommunityMemberStatus | null,
        is_banned: false,
    };

    if (currentUserId) {
        const { data: member } = await supabase
            .from("community_members")
            .select("role, status")
            .eq("community_id", community.id)
            .eq("user_id", currentUserId)
            .maybeSingle();

        if (member) {
            viewerState = {
                is_member: member.status === "active",
                role: member.role,
                status: member.status,
                is_banned: member.status === "banned",
            };
        }
    }

    // Private community content protection
    if (community.visibility === "private" && !viewerState.is_member && community.owner_id !== currentUserId) {
        return {
            id: community.id,
            owner_id: community.owner_id,
            name: community.name,
            slug: community.slug,
            description: community.description,
            category: community.category,
            cover_image_url: community.cover_image_url,
            icon_url: community.icon_url,
            visibility: community.visibility,
            member_count: community.member_count,
            post_count: community.post_count,
            is_archived: community.is_archived,
            created_at: community.created_at,
            updated_at: community.updated_at,
            owner: community.owner,
            rules: community.rules,
            viewer: viewerState,
            is_private_restricted: true,
        };
    }

    return {
        ...community,
        viewer: viewerState,
        is_private_restricted: false,
    };
}

export async function updateCommunityService(
    communityId: string,
    userId: string,
    input: UpdateCommunityInput
) {
    const role = await getCommunityUserRole(communityId, userId);
    if (role !== "owner" && role !== "moderator") {
        throw new Error("Unauthorized: Only owners and moderators can edit the community.");
    }

    const updates: any = {
        updated_at: new Date().toISOString(),
    };

    if (input.name !== undefined) updates.name = input.name.trim();
    if (input.description !== undefined) updates.description = input.description.trim();
    if (input.category !== undefined) updates.category = input.category.trim();
    if (input.cover_image_url !== undefined) updates.cover_image_url = input.cover_image_url;
    if (input.icon_url !== undefined) updates.icon_url = input.icon_url;
    if (input.visibility !== undefined) {
        // Only owner can change visibility
        if (role !== "owner") throw new Error("Only the community owner can change visibility.");
        updates.visibility = input.visibility;
    }

    const { data, error } = await supabase
        .from("communities")
        .update(updates)
        .eq("id", communityId)
        .select()
        .single();

    if (error) throw error;
    return getCommunityByIdService(communityId, userId);
}

export async function deleteCommunityService(communityId: string, userId: string) {
    const { data: community, error: fetchError } = await supabase
        .from("communities")
        .select("owner_id")
        .eq("id", communityId)
        .single();

    if (fetchError || !community) throw new Error("Community not found.");
    if (community.owner_id !== userId) {
        throw new Error("Unauthorized: Only the community owner can delete the community.");
    }

    const { error } = await supabase.from("communities").delete().eq("id", communityId);
    if (error) throw error;
    return { success: true };
}

/*
|--------------------------------------------------------------------------
| 2. Roles & Permissions Helper
|--------------------------------------------------------------------------
*/

export async function getCommunityUserRole(
    communityId: string,
    userId: string
): Promise<CommunityRole | null> {
    const { data } = await supabase
        .from("community_members")
        .select("role, status")
        .eq("community_id", communityId)
        .eq("user_id", userId)
        .maybeSingle();

    if (!data || data.status !== "active") return null;
    return data.role as CommunityRole;
}

export async function isUserBannedFromCommunity(
    communityId: string,
    userId: string
): Promise<boolean> {
    const { data } = await supabase
        .from("community_bans")
        .select("id, expires_at")
        .eq("community_id", communityId)
        .eq("user_id", userId)
        .maybeSingle();

    if (!data) return false;
    if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
        // Ban expired, remove ban
        await supabase.from("community_bans").delete().eq("id", data.id);
        return false;
    }
    return true;
}

/*
|--------------------------------------------------------------------------
| 3. Membership & Join Requests
|--------------------------------------------------------------------------
*/

export async function joinCommunityService(communityId: string, userId: string) {
    // 1. Fetch community
    const { data: community, error } = await supabase
        .from("communities")
        .select("id, name, owner_id, visibility, member_count")
        .eq("id", communityId)
        .single();

    if (error || !community) throw new Error("Community not found.");

    // 2. Check if banned
    const isBanned = await isUserBannedFromCommunity(communityId, userId);
    if (isBanned) {
        throw new Error("You are banned from joining this community.");
    }

    // 3. Check existing membership
    const { data: existing } = await supabase
        .from("community_members")
        .select("id, status, role")
        .eq("community_id", communityId)
        .eq("user_id", userId)
        .maybeSingle();

    if (existing) {
        if (existing.status === "active") {
            throw new Error("You are already a member of this community.");
        }
        if (existing.status === "pending") {
            throw new Error("Your join request is already pending approval.");
        }
        if (existing.status === "banned") {
            throw new Error("You are banned from this community.");
        }
    }

    const isPrivate = community.visibility === "private";
    const status: CommunityMemberStatus = isPrivate ? "pending" : "active";

    const { data: member, error: insertError } = await supabase
        .from("community_members")
        .upsert(
            {
                community_id: communityId,
                user_id: userId,
                role: "member",
                status,
                joined_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            },
            { onConflict: "community_id,user_id" }
        )
        .select()
        .single();

    if (insertError) throw insertError;

    // Increment member count if actively joined
    if (status === "active") {
        await supabase
            .from("communities")
            .update({ member_count: (community.member_count || 0) + 1 })
            .eq("id", communityId);
    } else {
        // Notify owner and moderators of join request
        await createNotification({
            recipientId: community.owner_id,
            actorId: userId,
            type: "system",
            message: `requested to join private community "${community.name}".`,
        });
    }

    return {
        status,
        member,
        message: isPrivate
            ? "Join request submitted. Awaiting moderator approval."
            : "Successfully joined community!",
    };
}

export async function leaveCommunityService(communityId: string, userId: string) {
    const { data: member, error } = await supabase
        .from("community_members")
        .select("id, role, status")
        .eq("community_id", communityId)
        .eq("user_id", userId)
        .maybeSingle();

    if (error || !member) throw new Error("You are not a member of this community.");
    if (member.role === "owner") {
        throw new Error("As owner, you cannot leave the community. Transfer ownership or delete it instead.");
    }

    await supabase.from("community_members").delete().eq("id", member.id);

    if (member.status === "active") {
        const { data: community } = await supabase
            .from("communities")
            .select("member_count")
            .eq("id", communityId)
            .single();

        const count = Math.max(1, (community?.member_count || 1) - 1);
        await supabase.from("communities").update({ member_count: count }).eq("id", communityId);
    }

    return { success: true, message: "Left community successfully." };
}

export async function getCommunityMembersService(
    communityId: string,
    currentUserId?: string,
    page: number = 1,
    limit: number = 20
) {
    const offset = (page - 1) * limit;

    const { data: members, error, count } = await supabase
        .from("community_members")
        .select(`
            id,
            role,
            status,
            joined_at,
            profile:profiles!community_members_user_id_fkey(
                id,
                username,
                full_name,
                avatar_url,
                verified,
                bio
            )
        `, { count: "exact" })
        .eq("community_id", communityId)
        .eq("status", "active")
        .order("role", { ascending: true }) // owner, moderator, member
        .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
        members: members || [],
        pagination: {
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
        },
    };
}

export async function updateMemberRoleService(
    communityId: string,
    targetUserId: string,
    newRole: "moderator" | "member",
    currentUserId: string
) {
    const callerRole = await getCommunityUserRole(communityId, currentUserId);
    if (callerRole !== "owner") {
        throw new Error("Unauthorized: Only the community owner can change member roles.");
    }

    if (targetUserId === currentUserId) {
        throw new Error("Owner cannot change their own role.");
    }

    const { data, error } = await supabase
        .from("community_members")
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq("community_id", communityId)
        .eq("user_id", targetUserId)
        .select()
        .single();

    if (error) throw error;

    await createNotification({
        recipientId: targetUserId,
        actorId: currentUserId,
        type: "system",
        message: `updated your role to ${newRole} in the community.`,
    });

    return data;
}

export async function getPendingJoinRequestsService(communityId: string, currentUserId: string) {
    const role = await getCommunityUserRole(communityId, currentUserId);
    if (role !== "owner" && role !== "moderator") {
        throw new Error("Unauthorized: Only owners and moderators can view join requests.");
    }

    const { data, error } = await supabase
        .from("community_members")
        .select(`
            id,
            community_id,
            user_id,
            status,
            joined_at,
            profile:profiles!community_members_user_id_fkey(
                id,
                username,
                full_name,
                avatar_url,
                verified,
                bio
            )
        `)
        .eq("community_id", communityId)
        .eq("status", "pending")
        .order("joined_at", { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function handleJoinRequestService(
    communityId: string,
    requestId: string,
    action: "approve" | "reject",
    currentUserId: string
) {
    const role = await getCommunityUserRole(communityId, currentUserId);
    if (role !== "owner" && role !== "moderator") {
        throw new Error("Unauthorized: Only owners and moderators can handle join requests.");
    }

    const { data: memberRecord, error } = await supabase
        .from("community_members")
        .select("id, user_id, community_id, status")
        .eq("id", requestId)
        .eq("community_id", communityId)
        .single();

    if (error || !memberRecord) throw new Error("Join request not found.");
    if (memberRecord.status !== "pending") throw new Error("This request has already been processed.");

    const { data: community } = await supabase
        .from("communities")
        .select("name, member_count")
        .eq("id", communityId)
        .single();

    if (action === "approve") {
        await supabase
            .from("community_members")
            .update({ status: "active", updated_at: new Date().toISOString() })
            .eq("id", requestId);

        await supabase
            .from("communities")
            .update({ member_count: (community?.member_count || 0) + 1 })
            .eq("id", communityId);

        await createNotification({
            recipientId: memberRecord.user_id,
            actorId: currentUserId,
            type: "system",
            message: `approved your request to join "${community?.name || "the community"}".`,
        });

        return { success: true, message: "Member approved." };
    } else {
        await supabase.from("community_members").delete().eq("id", requestId);

        await createNotification({
            recipientId: memberRecord.user_id,
            actorId: currentUserId,
            type: "system",
            message: `declined your request to join "${community?.name || "the community"}".`,
        });

        return { success: true, message: "Request rejected." };
    }
}

/*
|--------------------------------------------------------------------------
| 4. Community Rules Service
|--------------------------------------------------------------------------
*/

export async function getCommunityRulesService(communityId: string) {
    const { data, error } = await supabase
        .from("community_rules")
        .select("*")
        .eq("community_id", communityId)
        .order("position", { ascending: true });

    if (error) throw error;
    return data || [];
}

export async function createCommunityRuleService(
    communityId: string,
    userId: string,
    input: { title: string; description?: string; position?: number }
) {
    const role = await getCommunityUserRole(communityId, userId);
    if (role !== "owner" && role !== "moderator") {
        throw new Error("Unauthorized: Only owners and moderators can add rules.");
    }

    let position = input.position;
    if (position === undefined) {
        const { count } = await supabase
            .from("community_rules")
            .select("id", { count: "exact", head: true })
            .eq("community_id", communityId);
        position = (count || 0) + 1;
    }

    const { data, error } = await supabase
        .from("community_rules")
        .insert({
            community_id: communityId,
            title: input.title.trim(),
            description: input.description?.trim() || "",
            position,
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function updateCommunityRuleService(
    communityId: string,
    ruleId: string,
    userId: string,
    input: { title?: string; description?: string; position?: number }
) {
    const role = await getCommunityUserRole(communityId, userId);
    if (role !== "owner" && role !== "moderator") {
        throw new Error("Unauthorized: Only owners and moderators can edit rules.");
    }

    const updates: any = { updated_at: new Date().toISOString() };
    if (input.title !== undefined) updates.title = input.title.trim();
    if (input.description !== undefined) updates.description = input.description.trim();
    if (input.position !== undefined) updates.position = input.position;

    const { data, error } = await supabase
        .from("community_rules")
        .update(updates)
        .eq("id", ruleId)
        .eq("community_id", communityId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function deleteCommunityRuleService(
    communityId: string,
    ruleId: string,
    userId: string
) {
    const role = await getCommunityUserRole(communityId, userId);
    if (role !== "owner" && role !== "moderator") {
        throw new Error("Unauthorized: Only owners and moderators can delete rules.");
    }

    const { error } = await supabase
        .from("community_rules")
        .delete()
        .eq("id", ruleId)
        .eq("community_id", communityId);

    if (error) throw error;
    return { success: true };
}

/*
|--------------------------------------------------------------------------
| 5. Search, Discovery & Suggestions
|--------------------------------------------------------------------------
*/

export async function queryCommunitiesService(params: QueryCommunitiesInput) {
    const {
        search,
        category,
        visibility,
        sort = "popular",
        page = 1,
        limit = 20,
        userId,
    } = params;
    const offset = (page - 1) * limit;

    let query = supabase
        .from("communities")
        .select(`
            *,
            owner:profiles!communities_owner_id_fkey(
                id,
                username,
                full_name,
                avatar_url,
                verified
            )
        `, { count: "exact" })
        .eq("is_archived", false);

    if (search) {
        query = query.or(`name.ilike.%${search}%,description.ilike.%${search}%,slug.ilike.%${search}%`);
    }

    if (category && category.toLowerCase() !== "all") {
        query = query.ilike("category", category);
    }

    if (visibility) {
        query = query.eq("visibility", visibility);
    }

    if (sort === "joined" && userId) {
        // Fetch community IDs joined by user
        const { data: userMemberships } = await supabase
            .from("community_members")
            .select("community_id")
            .eq("user_id", userId)
            .eq("status", "active");

        const commIds = (userMemberships || []).map((m) => m.community_id);
        if (commIds.length === 0) {
            return {
                communities: [],
                pagination: { page, limit, total: 0, totalPages: 0 },
            };
        }
        query = query.in("id", commIds);
    } else if (sort === "new") {
        query = query.order("created_at", { ascending: false });
    } else if (sort === "alphabetical") {
        query = query.order("name", { ascending: true });
    } else {
        // Popular: sorted by member count then post count
        query = query.order("member_count", { ascending: false }).order("post_count", { ascending: false });
    }

    const { data: communities, error, count } = await query.range(offset, offset + limit - 1);
    if (error) throw error;

    // Attach viewer membership state if user logged in
    let userMembershipsMap = new Map<string, { role: CommunityRole; status: CommunityMemberStatus }>();
    if (userId && communities && communities.length > 0) {
        const cIds = communities.map((c) => c.id);
        const { data: mData } = await supabase
            .from("community_members")
            .select("community_id, role, status")
            .eq("user_id", userId)
            .in("community_id", cIds);

        if (mData) {
            mData.forEach((m) => {
                userMembershipsMap.set(m.community_id, {
                    role: m.role as CommunityRole,
                    status: m.status as CommunityMemberStatus,
                });
            });
        }
    }

    const mapped = (communities || []).map((comm) => {
        const mem = userMembershipsMap.get(comm.id);
        return {
            ...comm,
            viewer: {
                is_member: mem?.status === "active",
                role: mem?.role || null,
                status: mem?.status || null,
                is_banned: mem?.status === "banned",
            },
        };
    });

    return {
        communities: mapped,
        pagination: {
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
        },
    };
}

export async function getPopularCommunitiesService(limit: number = 8, userId?: string) {
    return queryCommunitiesService({
        sort: "popular",
        visibility: "public",
        limit,
        userId,
    });
}

export async function getSuggestedCommunitiesService(userId: string, limit: number = 6) {
    // 1. Get communities user is already part of
    const { data: userMemberships } = await supabase
        .from("community_members")
        .select("community_id")
        .eq("user_id", userId);

    const userCommIds = new Set((userMemberships || []).map((m) => m.community_id));

    // 2. Find communities joined by people the user follows
    const { data: followings } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId);

    const followingIds = (followings || []).map((f) => f.following_id);

    let candidateIds: string[] = [];

    if (followingIds.length > 0) {
        const { data: friendCommunities } = await supabase
            .from("community_members")
            .select("community_id")
            .in("user_id", followingIds)
            .eq("status", "active");

        if (friendCommunities) {
            candidateIds = friendCommunities
                .map((m) => m.community_id)
                .filter((id) => !userCommIds.has(id));
        }
    }

    // 3. Query communities
    let query = supabase
        .from("communities")
        .select(`
            *,
            owner:profiles!communities_owner_id_fkey(
                id,
                username,
                full_name,
                avatar_url,
                verified
            )
        `)
        .eq("visibility", "public")
        .eq("is_archived", false);

    if (candidateIds.length > 0) {
        query = query.in("id", Array.from(new Set(candidateIds)));
    } else {
        query = query.order("member_count", { ascending: false });
    }

    const { data: communities, error } = await query.limit(limit * 2);
    if (error) throw error;

    // Filter out already joined communities
    const filtered = (communities || [])
        .filter((c) => !userCommIds.has(c.id))
        .slice(0, limit);

    return filtered.map((c) => ({
        ...c,
        viewer: {
            is_member: false,
            role: null,
            status: null,
            is_banned: false,
        },
    }));
}

/*
|--------------------------------------------------------------------------
| 6. Moderation, Reports & Bans
|--------------------------------------------------------------------------
*/

export async function createCommunityReportService(
    communityId: string,
    reporterId: string,
    input: {
        reported_user_id?: string;
        post_id?: string;
        comment_id?: string;
        reason: any;
        description?: string;
    }
) {
    const { data, error } = await supabase
        .from("community_reports")
        .insert({
            community_id: communityId,
            reporter_id: reporterId,
            reported_user_id: input.reported_user_id || null,
            post_id: input.post_id || null,
            comment_id: input.comment_id || null,
            reason: input.reason,
            description: input.description?.trim() || "",
            status: "pending",
        })
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function getCommunityReportsService(communityId: string, userId: string) {
    const role = await getCommunityUserRole(communityId, userId);
    if (role !== "owner" && role !== "moderator") {
        throw new Error("Unauthorized: Only owners and moderators can view reports.");
    }

    const { data, error } = await supabase
        .from("community_reports")
        .select(`
            *,
            reporter:profiles!community_reports_reporter_id_fkey(
                id, username, full_name, avatar_url
            ),
            reported_user:profiles!community_reports_reported_user_id_fkey(
                id, username, full_name, avatar_url
            ),
            post:posts!community_reports_post_id_fkey(
                id, text, user_id, created_at
            ),
            comment:comments!community_reports_comment_id_fkey(
                id, comment, user_id, created_at
            )
        `)
        .eq("community_id", communityId)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function updateCommunityReportService(
    communityId: string,
    reportId: string,
    status: "pending" | "reviewed" | "dismissed" | "actioned",
    userId: string
) {
    const role = await getCommunityUserRole(communityId, userId);
    if (role !== "owner" && role !== "moderator") {
        throw new Error("Unauthorized: Only owners and moderators can manage reports.");
    }

    const { data, error } = await supabase
        .from("community_reports")
        .update({
            status,
            resolved_by: userId,
            resolved_at: new Date().toISOString(),
        })
        .eq("id", reportId)
        .eq("community_id", communityId)
        .select()
        .single();

    if (error) throw error;
    return data;
}

export async function banUserFromCommunityService(
    communityId: string,
    targetUserId: string,
    reason: string,
    expiresAt: string | null | undefined,
    currentUserId: string
) {
    const callerRole = await getCommunityUserRole(communityId, currentUserId);
    if (callerRole !== "owner" && callerRole !== "moderator") {
        throw new Error("Unauthorized: Only owners and moderators can ban users.");
    }

    const targetRole = await getCommunityUserRole(communityId, targetUserId);
    if (targetRole === "owner") {
        throw new Error("Cannot ban the community owner.");
    }
    if (callerRole === "moderator" && targetRole === "moderator") {
        throw new Error("Moderators cannot ban fellow moderators.");
    }

    // 1. Insert Ban
    const { data: ban, error: banError } = await supabase
        .from("community_bans")
        .upsert(
            {
                community_id: communityId,
                user_id: targetUserId,
                banned_by: currentUserId,
                reason,
                expires_at: expiresAt || null,
                created_at: new Date().toISOString(),
            },
            { onConflict: "community_id,user_id" }
        )
        .select()
        .single();

    if (banError) throw banError;

    // 2. Update membership status to banned
    await supabase
        .from("community_members")
        .upsert(
            {
                community_id: communityId,
                user_id: targetUserId,
                role: "member",
                status: "banned",
                updated_at: new Date().toISOString(),
            },
            { onConflict: "community_id,user_id" }
        );

    // 3. Decrement member count
    const { data: comm } = await supabase
        .from("communities")
        .select("name, member_count")
        .eq("id", communityId)
        .single();

    if (comm) {
        const count = Math.max(1, (comm.member_count || 1) - 1);
        await supabase.from("communities").update({ member_count: count }).eq("id", communityId);
    }

    // 4. Notify banned user
    await createNotification({
        recipientId: targetUserId,
        actorId: currentUserId,
        type: "system",
        message: `banned you from community "${comm?.name || "Community"}" for: ${reason}`,
    });

    return ban;
}

export async function unbanUserFromCommunityService(
    communityId: string,
    targetUserId: string,
    currentUserId: string
) {
    const callerRole = await getCommunityUserRole(communityId, currentUserId);
    if (callerRole !== "owner" && callerRole !== "moderator") {
        throw new Error("Unauthorized: Only owners and moderators can unban users.");
    }

    await supabase
        .from("community_bans")
        .delete()
        .eq("community_id", communityId)
        .eq("user_id", targetUserId);

    await supabase
        .from("community_members")
        .delete()
        .eq("community_id", communityId)
        .eq("user_id", targetUserId);

    return { success: true, message: "User unbanned successfully." };
}

export async function getCommunityBansService(communityId: string, currentUserId: string) {
    const callerRole = await getCommunityUserRole(communityId, currentUserId);
    if (callerRole !== "owner" && callerRole !== "moderator") {
        throw new Error("Unauthorized: Only owners and moderators can view bans.");
    }

    const { data, error } = await supabase
        .from("community_bans")
        .select(`
            *,
            user:profiles!community_bans_user_id_fkey(
                id, username, full_name, avatar_url
            ),
            banner:profiles!community_bans_banned_by_fkey(
                id, username, full_name
            )
        `)
        .eq("community_id", communityId)
        .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
}

export async function moderatePostService(
    communityId: string,
    postId: string,
    action: "delete" | "lock",
    currentUserId: string
) {
    const callerRole = await getCommunityUserRole(communityId, currentUserId);
    if (callerRole !== "owner" && callerRole !== "moderator") {
        throw new Error("Unauthorized: Only owners and moderators can moderate posts.");
    }

    // Verify post belongs to this community
    const { data: post, error } = await supabase
        .from("posts")
        .select("id, community_id, user_id, is_locked")
        .eq("id", postId)
        .eq("community_id", communityId)
        .single();

    if (error || !post) throw new Error("Post not found in this community.");

    if (action === "delete") {
        await supabase.from("posts").delete().eq("id", postId);

        // Decrement community post count
        const { data: comm } = await supabase
            .from("communities")
            .select("post_count")
            .eq("id", communityId)
            .single();

        if (comm) {
            const pCount = Math.max(0, (comm.post_count || 1) - 1);
            await supabase.from("communities").update({ post_count: pCount }).eq("id", communityId);
        }

        await createNotification({
            recipientId: post.user_id,
            actorId: currentUserId,
            type: "system",
            message: "A moderator removed your post in the community for violating rules.",
        });

        return { success: true, message: "Post removed by moderator." };
    } else {
        // Toggle lock
        const newLockState = !post.is_locked;
        await supabase.from("posts").update({ is_locked: newLockState }).eq("id", postId);

        return {
            success: true,
            is_locked: newLockState,
            message: newLockState ? "Discussion locked." : "Discussion unlocked.",
        };
    }
}
