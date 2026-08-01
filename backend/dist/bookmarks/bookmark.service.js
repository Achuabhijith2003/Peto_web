import { supabase } from "../config/supabase";
import { mapPostForFeed } from "../posts/feed.mapper";
export async function bookmarkPostService(userId, postId) {
    const { data: existing } = await supabase
        .from("bookmarks")
        .select("id")
        .eq("user_id", userId)
        .eq("post_id", postId)
        .maybeSingle();
    if (existing) {
        return existing;
    }
    const { data, error } = await supabase
        .from("bookmarks")
        .insert({
        user_id: userId,
        post_id: postId
    })
        .select()
        .single();
    if (error)
        throw error;
    const { data: post } = await supabase
        .from("posts")
        .select("bookmarks_count")
        .eq("id", postId)
        .single();
    await supabase
        .from("posts")
        .update({
        bookmarks_count: (post?.bookmarks_count || 0) + 1
    })
        .eq("id", postId);
    return data;
}
export async function removeBookmarkService(userId, postId) {
    const { data } = await supabase
        .from("bookmarks")
        .select("id")
        .eq("user_id", userId)
        .eq("post_id", postId)
        .maybeSingle();
    if (!data)
        return;
    await supabase
        .from("bookmarks")
        .delete()
        .eq("user_id", userId)
        .eq("post_id", postId);
    const { data: post } = await supabase
        .from("posts")
        .select("bookmarks_count")
        .eq("id", postId)
        .single();
    await supabase
        .from("posts")
        .update({
        bookmarks_count: Math.max(0, (post?.bookmarks_count || 0) - 1)
    })
        .eq("id", postId);
}
export async function getBookmarksService(userId, page, limit) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { count } = await supabase
        .from("bookmarks")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
    const { data, error } = await supabase
        .from("bookmarks")
        .select(`
            created_at,
            posts(
                *,
                profiles(
                    id,
                    username,
                    full_name,
                    avatar_url,
                    verified
                ),
                media(*)
            )
        `)
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(from, to);
    if (error)
        throw error;
    const postIds = (data ?? []).map((b) => b.posts?.id).filter(Boolean);
    const { data: likes } = await supabase
        .from("likes")
        .select("post_id")
        .eq("user_id", userId)
        .in("post_id", postIds);
    const likedPosts = new Set((likes ?? []).map((x) => x.post_id));
    const bookmarkedPosts = new Set(postIds);
    const formattedBookmarks = (data ?? [])
        .map((b) => {
        if (!b.posts)
            return null;
        return mapPostForFeed(b.posts, userId, likedPosts, bookmarkedPosts);
    })
        .filter(Boolean);
    return {
        bookmarks: formattedBookmarks,
        pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil((count || 0) / limit)
        }
    };
}
