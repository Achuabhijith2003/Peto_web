import { supabase } from "../config/supabase";
import { createNotification, removeNotificationByEvent } from "../notifications/notification.service";
export async function followUser(currentUserId, targetUserId) {
    // Cannot follow yourself
    if (currentUserId === targetUserId) {
        throw new Error("You cannot follow yourself.");
    }
    // Check target user exists
    const { data: targetUser, error: userError } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", targetUserId)
        .single();
    if (userError || !targetUser) {
        throw new Error("User not found.");
    }
    // Check already following
    const { data: existing } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", currentUserId)
        .eq("following_id", targetUserId)
        .maybeSingle();
    if (existing) {
        throw new Error("Already following this user.");
    }
    // Insert follow
    const { data, error } = await supabase
        .from("follows")
        .insert({
        follower_id: currentUserId,
        following_id: targetUserId
    })
        .select()
        .single();
    if (error) {
        throw error;
    }
    await createNotification({
        recipientId: targetUserId,
        actorId: currentUserId,
        type: "follow",
        message: "started following you."
    });
    return data;
}
export async function unfollowUser(currentUserId, targetUserId) {
    const { data: follow } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", currentUserId)
        .eq("following_id", targetUserId)
        .maybeSingle();
    if (!follow) {
        throw new Error("You are not following this user.");
    }
    const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", targetUserId);
    if (error) {
        throw error;
    }
    await removeNotificationByEvent({
        recipientId: targetUserId,
        actorId: currentUserId,
        type: "follow"
    });
    return {
        success: true,
        message: "User unfollowed successfully."
    };
}
export async function getFollowStatus(currentUserId, targetUserId) {
    const { data } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", currentUserId)
        .eq("following_id", targetUserId)
        .maybeSingle();
    return {
        isFollowing: !!data
    };
}
export async function getFollowers(userId) {
    const { data, error } = await supabase
        .from("follows")
        .select(`
            created_at,
            follower:profiles!fk_follower(
                id,
                username,
                full_name,
                avatar_url,
                verified
            )
        `)
        .eq("following_id", userId)
        .order("created_at", { ascending: false });
    if (error) {
        throw error;
    }
    return data;
}
export async function getFollowing(userId) {
    const { data, error } = await supabase
        .from("follows")
        .select(`
            created_at,
            following:profiles!fk_following(
                id,
                username,
                full_name,
                avatar_url,
                verified
            )
        `)
        .eq("follower_id", userId)
        .order("created_at", { ascending: false });
    if (error) {
        throw error;
    }
    return data;
}
export async function getFollowerCount(userId) {
    const { count, error } = await supabase
        .from("follows")
        .select("*", {
        count: "exact",
        head: true
    })
        .eq("following_id", userId);
    if (error) {
        throw error;
    }
    return count ?? 0;
}
export async function getFollowingCount(userId) {
    const { count, error } = await supabase
        .from("follows")
        .select("*", {
        count: "exact",
        head: true
    })
        .eq("follower_id", userId);
    if (error) {
        throw error;
    }
    return count ?? 0;
}
// suggesting
export async function getSuggestedFriends(userId, page, limit) {
    // Users already followed
    const { data: following } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", userId);
    const excludedIds = [
        userId,
        ...(following?.map(f => f.following_id) ?? [])
    ];
    // Fetch candidate profiles
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const excluded = excludedIds.map(id => `"${id}"`).join(",");
    console.log(excludedIds);
    const { data: users, error } = await supabase
        .from("profiles")
        .select(`
        id,
        username,
        full_name,
        avatar_url,
        verified,
        created_at
    `)
        .filter("id", "not.in", `(${excluded})`)
        .order("created_at", { ascending: false })
        .range(from, to);
    if (error)
        throw error;
    const suggestions = [];
    for (const user of users ?? []) {
        // Followers count
        const { count: followers } = await supabase
            .from("follows")
            .select("*", {
            count: "exact",
            head: true
        })
            .eq("following_id", user.id);
        // Following count
        const { count: followingCount } = await supabase
            .from("follows")
            .select("*", {
            count: "exact",
            head: true
        })
            .eq("follower_id", user.id);
        // Posts count
        const { count: posts } = await supabase
            .from("posts")
            .select("*", {
            count: "exact",
            head: true
        })
            .eq("user_id", user.id);
        suggestions.push({
            ...user,
            followersCount: followers ?? 0,
            followingCount: followingCount ?? 0,
            postsCount: posts ?? 0
        });
    }
    suggestions.sort((a, b) => b.followersCount - a.followersCount);
    return suggestions;
}
