import { supabase } from "../config/supabase";
export async function updatePresence(userId) {
    const { error } = await supabase
        .from("profiles")
        .update({
        is_online: true,
        last_seen: new Date().toISOString()
    })
        .eq("id", userId);
    if (error)
        throw error;
    return {
        success: true
    };
}
export async function setOffline(userId) {
    const { error } = await supabase
        .from("profiles")
        .update({
        is_online: false,
        last_seen: new Date().toISOString()
    })
        .eq("id", userId);
    if (error)
        throw error;
    return {
        success: true
    };
}
export async function getOnlineFriends(userId) {
    const { data: following, error } = await supabase
        .from("follows")
        .select(`
            following:profiles!fk_following(
                id,
                username,
                full_name,
                avatar_url,
                verified,
                is_online,
                last_seen
            )
        `)
        .eq("follower_id", userId);
    if (error)
        throw error;
    return (following ?? [])
        .filter((f) => f.following?.is_online)
        .map((f) => f.following);
}
