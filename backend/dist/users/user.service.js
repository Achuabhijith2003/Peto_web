import { supabase } from "../config/supabase";
export async function getUserProfile(currentUserId, profileUserId) {
    // ---------------- Profile ----------------
    const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(`
            id,
            username,
            full_name,
            bio,
            avatar_url,
            cover_url,
            verified,
            created_at
        `)
        .eq("id", profileUserId)
        .single();
    if (profileError || !profile) {
        throw new Error("User not found.");
    }
    // ---------------- Followers ----------------
    const { count: followersCount } = await supabase
        .from("follows")
        .select("*", {
        count: "exact",
        head: true
    })
        .eq("following_id", profileUserId);
    // ---------------- Following ----------------
    const { count: followingCount } = await supabase
        .from("follows")
        .select("*", {
        count: "exact",
        head: true
    })
        .eq("follower_id", profileUserId);
    // ---------------- Posts ----------------
    const { count: postsCount } = await supabase
        .from("posts")
        .select("*", {
        count: "exact",
        head: true
    })
        .eq("user_id", profileUserId);
    // ---------------- Viewer follows profile ----------------
    const { data: following } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", currentUserId)
        .eq("following_id", profileUserId)
        .maybeSingle();
    // ---------------- Profile follows viewer ----------------
    const { data: follower } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", profileUserId)
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
export async function searchUsers(currentUserId, query, page, limit) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data: users, error } = await supabase
        .from("profiles")
        .select(`
            id,
            username,
            full_name,
            avatar_url,
            verified,
            bio
        `)
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
        .neq("id", currentUserId)
        .range(from, to);
    if (error)
        throw error;
    const results = [];
    for (const user of users ?? []) {
        const { count: followers } = await supabase
            .from("follows")
            .select("*", {
            count: "exact",
            head: true
        })
            .eq("following_id", user.id);
        const { data: follow } = await supabase
            .from("follows")
            .select("id")
            .eq("follower_id", currentUserId)
            .eq("following_id", user.id)
            .maybeSingle();
        results.push({
            ...user,
            followersCount: followers ?? 0,
            isFollowing: !!follow
        });
    }
    return results;
}
