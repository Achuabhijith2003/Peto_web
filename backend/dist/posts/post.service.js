import { supabase } from "../config/supabase";
import { deleteStorageFile } from "../media/storage.service";
import { mapPostForFeed } from "./feed.mapper";
export async function createPostService(data) {
    const { userId, text, visibility, media = [] } = data;
    // Create Post
    const { data: post, error } = await supabase
        .from("posts")
        .insert({
        user_id: userId,
        text,
        visibility,
        media_count: media.length
    })
        .select()
        .single();
    if (error) {
        throw error;
    }
    // Attach uploaded media
    if (media.length) {
        const { error: mediaError } = await supabase
            .from("media")
            .update({
            post_id: post.id
        })
            .in("id", media)
            .eq("user_id", userId);
        if (mediaError) {
            throw mediaError;
        }
    }
    return post;
}
export async function getPostById(postId, currentUserId) {
    const { data: post, error } = await supabase
        .from("posts")
        .select(`
            *,
            profiles(
                id,
                username,
                full_name,
                avatar_url,
                verified
            ),
            media(*)
        `)
        .eq("id", postId)
        .single();
    if (error)
        throw error;
    const { data: like } = await supabase
        .from("likes")
        .select("post_id")
        .eq("user_id", currentUserId)
        .eq("post_id", post.id)
        .maybeSingle();
    const { data: bookmark } = await supabase
        .from("bookmarks")
        .select("post_id")
        .eq("user_id", currentUserId)
        .eq("post_id", post.id)
        .maybeSingle();
    const likedPosts = new Set();
    const bookmarkedPosts = new Set();
    if (like)
        likedPosts.add(post.id);
    if (bookmark)
        bookmarkedPosts.add(post.id);
    return mapPostForFeed(post, currentUserId, likedPosts, bookmarkedPosts);
}
export async function updatePostById(postId, userId, text, visibility) {
    //--------------------------------------------------
    // Check ownership
    //--------------------------------------------------
    const { data: existing } = await supabase
        .from("posts")
        .select("id,user_id")
        .eq("id", postId)
        .maybeSingle();
    if (!existing) {
        return null;
    }
    if (existing.user_id !== userId) {
        return null;
    }
    //--------------------------------------------------
    // Build update object
    //--------------------------------------------------
    const updateData = {
        updated_at: new Date().toISOString()
    };
    if (text !== undefined) {
        updateData.text = text.trim();
    }
    if (visibility !== undefined) {
        updateData.visibility = visibility;
    }
    //--------------------------------------------------
    // Update
    //--------------------------------------------------
    const { data, error } = await supabase
        .from("posts")
        .update(updateData)
        .eq("id", postId)
        .select()
        .single();
    if (error) {
        throw error;
    }
    return data;
}
export async function deletePostById(postId, userId) {
    //--------------------------------------------------
    // Find post
    //--------------------------------------------------
    const { data: post } = await supabase
        .from("posts")
        .select("*")
        .eq("id", postId)
        .maybeSingle();
    if (!post) {
        return {
            success: false,
            status: 404,
            message: "Post not found."
        };
    }
    //--------------------------------------------------
    // Ownership
    //--------------------------------------------------
    if (post.user_id !== userId) {
        return {
            success: false,
            status: 403,
            message: "Permission denied."
        };
    }
    //--------------------------------------------------
    // Media
    //--------------------------------------------------
    const { data: media } = await supabase
        .from("media")
        .select("*")
        .eq("post_id", postId);
    //--------------------------------------------------
    // Delete storage files
    //--------------------------------------------------
    if (media) {
        for (const item of media) {
            if (item.url) {
                await deleteStorageFile(item.url);
            }
            if (item.thumbnail_url) {
                await deleteStorageFile(item.thumbnail_url);
            }
        }
    }
    //--------------------------------------------------
    // Delete media rows
    //--------------------------------------------------
    const { error: mediaError } = await supabase
        .from("media")
        .delete()
        .eq("post_id", postId);
    if (mediaError) {
        throw mediaError;
    }
    //--------------------------------------------------
    // Delete post
    //--------------------------------------------------
    const { error: postError } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId);
    if (postError) {
        throw postError;
    }
    return {
        success: true,
        status: 200,
        message: "Deleted"
    };
}
export async function getMyPostsService(userId, page, limit) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data: posts, count } = await supabase
        .from("posts")
        .select(`
            *,
            profiles(
                id,
                username,
                full_name,
                avatar_url,
                verified
            ),
            media(*)
        `, { count: "exact" })
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(from, to);
    const postIds = (posts ?? []).map(post => post.id);
    const { data: likes } = await supabase
        .from("likes")
        .select("post_id")
        .eq("user_id", userId)
        .in("post_id", postIds);
    const { data: bookmarks } = await supabase
        .from("bookmarks")
        .select("post_id")
        .eq("user_id", userId)
        .in("post_id", postIds);
    const likedPosts = new Set((likes ?? []).map(x => x.post_id));
    const bookmarkedPosts = new Set((bookmarks ?? []).map(x => x.post_id));
    const feed = posts?.map(post => mapPostForFeed(post, userId, likedPosts, bookmarkedPosts));
    return {
        posts: feed,
        pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil((count ?? 0) / limit)
        }
    };
}
export async function getUserPostsService(profileId, currentUserId, page, limit) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data: posts, count } = await supabase
        .from("posts")
        .select(`
            *,
            profiles(
                id,
                username,
                full_name,
                avatar_url,
                verified
            ),
            media(*)
        `, { count: "exact" })
        .eq("user_id", profileId)
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .range(from, to);
    const postIds = (posts ?? []).map(post => post.id);
    const { data: likes } = await supabase
        .from("likes")
        .select("post_id")
        .eq("user_id", currentUserId)
        .in("post_id", postIds);
    const { data: bookmarks } = await supabase
        .from("bookmarks")
        .select("post_id")
        .eq("user_id", currentUserId)
        .in("post_id", postIds);
    const likedPosts = new Set((likes ?? []).map(x => x.post_id));
    const bookmarkedPosts = new Set((bookmarks ?? []).map(x => x.post_id));
    const feed = posts?.map(post => mapPostForFeed(post, currentUserId, likedPosts, bookmarkedPosts));
    return {
        posts: feed,
        pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil((count ?? 0) / limit)
        }
    };
}
export async function getGlobalFeedService(currentUserId, page, limit) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data: posts, count } = await supabase
        .from("posts")
        .select(`
            *,
            profiles(
                id,
                username,
                full_name,
                avatar_url,
                verified
            ),
            media(*)
        `, { count: "exact" })
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .range(from, to);
    const postIds = (posts ?? []).map(post => post.id);
    const { data: likes } = await supabase
        .from("likes")
        .select("post_id")
        .eq("user_id", currentUserId)
        .in("post_id", postIds);
    const { data: bookmarks } = await supabase
        .from("bookmarks")
        .select("post_id")
        .eq("user_id", currentUserId)
        .in("post_id", postIds);
    const likedPosts = new Set((likes ?? []).map(x => x.post_id));
    const bookmarkedPosts = new Set((bookmarks ?? []).map(x => x.post_id));
    const feed = posts?.map(post => mapPostForFeed(post, currentUserId, likedPosts, bookmarkedPosts));
    return {
        posts: feed,
        pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil((count ?? 0) / limit)
        }
    };
}
export async function searchPostsService(currentUserId, query, page = 1, limit = 20) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data: posts, count } = await supabase
        .from("posts")
        .select(`
            *,
            profiles(
                id,
                username,
                full_name,
                avatar_url,
                verified
            ),
            media(*)
        `, { count: "exact" })
        .ilike("text", `%${query}%`)
        .order("created_at", { ascending: false })
        .range(from, to);
    const postIds = (posts ?? []).map(post => post.id);
    const { data: likes } = await supabase
        .from("likes")
        .select("post_id")
        .eq("user_id", currentUserId)
        .in("post_id", postIds);
    const { data: bookmarks } = await supabase
        .from("bookmarks")
        .select("post_id")
        .eq("user_id", currentUserId)
        .in("post_id", postIds);
    const likedPosts = new Set((likes ?? []).map(x => x.post_id));
    const bookmarkedPosts = new Set((bookmarks ?? []).map(x => x.post_id));
    const feed = posts?.map(post => mapPostForFeed(post, currentUserId, likedPosts, bookmarkedPosts));
    return {
        posts: feed || [],
        pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil((count ?? 0) / limit)
        }
    };
}
