import { supabase } from "../config/supabase";
import { buildPostgrestOrIlike, sanitizeSearchQuery } from "../utils/postgrestSanitizer";

export async function getUserProfile(
    currentUserId: string,
    profileUserId: string
) {

    // ---------------- Profile ----------------
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profileUserId);

    let profileQuery = supabase
        .from("profiles")
        .select(`
            id,
            username,
            full_name,
            bio,
            avatar_url,
            cover_url,
            location,
            website,
            phone,
            date_of_birth,
            verified,
            created_at
        `);

    if (isUuid) {
        profileQuery = profileQuery.eq("id", profileUserId);
    } else {
        profileQuery = profileQuery.ilike("username", profileUserId.trim());
    }

    const { data: profile, error: profileError } = await profileQuery.maybeSingle();

    if (profileError || !profile) {
        // Fallback: check if profileUserId is a business ID or business username
        try {
            let bizQuery = supabase
                .from("business_identities")
                .select("id, name, legal_name, username, avatar_url, cover_url, description, business_category, country_code, verification_status, status");

            if (isUuid) {
                bizQuery = bizQuery.eq("id", profileUserId);
            } else {
                const cleanSlug = sanitizeSearchQuery(profileUserId.replace(/^@+/, ""));
                const bizOr = buildPostgrestOrIlike(["username", "name"], cleanSlug);
                if (bizOr) {
                    bizQuery = bizQuery.or(bizOr);
                }
            }

            const { data: biz } = await bizQuery.maybeSingle();
            if (biz) {
                const isBizVerified = biz.verification_status === "APPROVED" || biz.status === "VERIFIED";
                return {
                    id: biz.id,
                    username: biz.username || biz.name.toLowerCase().replace(/\s+/g, "_"),
                    full_name: biz.name,
                    name: biz.name,
                    bio: biz.description || biz.business_category || "",
                    avatar_url: biz.avatar_url,
                    cover_url: biz.cover_url,
                    location: biz.country_code || "",
                    verified: isBizVerified,
                    is_verified: isBizVerified,
                    is_business: true,
                    type: "BUSINESS",
                    badge_type: isBizVerified ? "BUSINESS_VERIFIED" : null,
                    verification_badge_type: isBizVerified ? "BUSINESS_VERIFIED" : null,
                    business_id: biz.id,
                    followers_count: 0,
                    following_count: 0,
                    posts_count: 0,
                    is_following: false,
                    isFollowing: false,
                    created_at: new Date().toISOString(),
                };
            }
        } catch (_) {}

        throw new Error("User not found.");
    }

    const actualUserId = profile.id;

    // ---------------- Followers ----------------

    const { count: followersCount } = await supabase
        .from("follows")
        .select("*", {
            count: "exact",
            head: true
        })
        .eq("following_id", actualUserId);

    // ---------------- Following ----------------

    const { count: followingCount } = await supabase
        .from("follows")
        .select("*", {
            count: "exact",
            head: true
        })
        .eq("follower_id", actualUserId);

    // ---------------- Posts ----------------

    const { count: postsCount } = await supabase
        .from("posts")
        .select("*", {
            count: "exact",
            head: true
        })
        .eq("user_id", actualUserId);

    // ---------------- Viewer follows profile ----------------

    const { data: following } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", currentUserId)
        .eq("following_id", actualUserId)
        .maybeSingle();

    // ---------------- Profile follows viewer ----------------

    const { data: follower } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", actualUserId)
        .eq("following_id", currentUserId)
        .maybeSingle();

    return {

        ...profile,

        followersCount: followersCount ?? 0,

        followingCount: followingCount ?? 0,

        postsCount: postsCount ?? 0,

        isFollowing: !!following,

        isFollower: !!follower

    };

}

export async function searchUsers(
    currentUserId: string | undefined,
    query: string,
    page: number,
    limit: number
) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const cleanQuery = sanitizeSearchQuery(query.replace(/^@+/, ""));
    if (!cleanQuery) {
        return [];
    }

    let q = supabase
        .from("profiles")
        .select(`
            id,
            username,
            full_name,
            avatar_url,
            verified,
            bio
        `);

    const orFilter = buildPostgrestOrIlike(["username", "full_name"], cleanQuery);
    if (orFilter) {
        q = q.or(orFilter);
    }

    if (currentUserId) {
        q = q.neq("id", currentUserId);
    }

    let users: any[] = [];
    try {
        const { data, error } = await q.range(from, to);
        if (error) {
            console.warn("[searchUsers] PostgREST query notice:", error.message);
            return [];
        }
        users = data || [];
    } catch (queryErr: any) {
        console.warn("[searchUsers] Exception during user search query:", queryErr?.message || queryErr);
        return [];
    }

    let blockedUserIds = new Set<string>();
    if (currentUserId) {
        try {
            const { data: blocks } = await supabase
                .from("user_blocks")
                .select("blocker_id, blocked_id")
                .or(`blocker_id.eq.${currentUserId},blocked_id.eq.${currentUserId}`);

            if (Array.isArray(blocks)) {
                for (const b of blocks) {
                    if (b.blocker_id === currentUserId) blockedUserIds.add(b.blocked_id);
                    if (b.blocked_id === currentUserId) blockedUserIds.add(b.blocker_id);
                }
            }
        } catch {
            // graceful fallback
        }
    }

    const results = [];

    // Search business identities
    if (cleanQuery.length > 0) {
        try {
            const bizFilter = buildPostgrestOrIlike(
                ["name", "legal_name", "username", "business_category"],
                cleanQuery
            );
            const { data: businesses, error: bizErr } = bizFilter
                ? await supabase
                    .from("business_identities")
                    .select("id, name, legal_name, username, avatar_url, business_category, description, country_code")
                    .or(bizFilter)
                    .limit(limit)
                : { data: [], error: null };

            if (bizErr) {
                console.error("Error querying business_identities in searchUsers:", bizErr);
            }

            if (businesses && businesses.length > 0) {
                const bizIds = businesses.map(b => b.id);
                const { data: verifs } = await supabase
                    .from("verification_applications")
                    .select("business_id, status")
                    .eq("verification_type", "BUSINESS_IDENTITY")
                    .eq("status", "APPROVED")
                    .in("business_id", bizIds);
                const verifiedSet = new Set((verifs ?? []).map(v => v.business_id));

                for (const b of businesses) {
                    const isVerified = verifiedSet.has(b.id);
                    results.push({
                        id: b.id,
                        type: "BUSINESS",
                        name: b.name,
                        username: b.username || b.name.toLowerCase().replace(/\s+/g, "_"),
                        full_name: b.name,
                        avatar_url: b.avatar_url || null,
                        category: b.business_category || "Business",
                        bio: b.description || b.business_category || "",
                        verified: isVerified,
                        is_verified: isVerified,
                        badge_type: isVerified ? "BUSINESS_VERIFIED" : null,
                        verification_badge_type: isVerified ? "BUSINESS_VERIFIED" : null,
                        is_business: true,
                        followersCount: 0,
                        isFollowing: false
                    });
                }
            }
        } catch (err) {
            console.error("Failed to search business identities:", err);
        }
    }

    for (const user of users ?? []) {
        if (blockedUserIds.has(user.id)) continue;

        const { count: followers } = await supabase
            .from("follows")
            .select("*", {
                count: "exact",
                head: true
            })
            .eq("following_id", user.id);

        let isFollowing = false;
        if (currentUserId) {
            const { data: follow } = await supabase
                .from("follows")
                .select("id")
                .eq("follower_id", currentUserId)
                .eq("following_id", user.id)
                .maybeSingle();
            isFollowing = !!follow;
        }

        results.push({
            ...user,
            type: "PERSON",
            badge_type: user.verified ? "VERIFIED" : null,
            followersCount: followers ?? 0,
            isFollowing
        });
    }

    return results;

}