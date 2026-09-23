import { supabase } from "../config/supabase";

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

    let q = supabase
        .from("profiles")
        .select(`
            id,
            username,
            full_name,
            avatar_url,
            verified,
            bio
        `)
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`);

    if (currentUserId) {
        q = q.neq("id", currentUserId);
    }

    const { data: users, error } = await q.range(from, to);

    if (error) throw error;

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
            followersCount: followers ?? 0,
            isFollowing
        });
    }

    return results;

}