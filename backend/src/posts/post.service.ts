import { supabase } from "../config/supabase";
import { deleteStorageFile } from "../media/storage.service";

interface CreatePostData {

    userId: string;

    text?: string;

    visibility: "public" | "followers" | "private";

    media?: string[];

}

export async function createPostService(

    data: CreatePostData

) {

    const {

        userId,

        text,

        visibility,

        media = []

    } = data;

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


export async function getPostById(

    postId: string,

    currentUserId: string

) {

    //--------------------------------------------------
    // Get Post
    //--------------------------------------------------

    const { data: post, error } = await supabase

        .from("posts")

        .select(`
            *,
            profiles (
                id,
                username,
                full_name,
                avatar_url,
                verified
            )
        `)

        .eq("id", postId)

        .single();

    if (error || !post) {

        return null;

    }

    //--------------------------------------------------
    // Visibility Check
    //--------------------------------------------------

    if (

        post.visibility === "private"

        &&

        post.user_id !== currentUserId

    ) {

        return null;

    }

    //--------------------------------------------------
    // Media
    //--------------------------------------------------

    const { data: media } = await supabase

        .from("media")

        .select("*")

        .eq("post_id", postId)

        .order("created_at");

    //--------------------------------------------------
    // Like Count
    //--------------------------------------------------

    const { count: likeCount } = await supabase

        .from("likes")

        .select("*", {

            head: true,

            count: "exact"

        })

        .eq("post_id", postId);

    //--------------------------------------------------
    // Comment Count
    //--------------------------------------------------

    const { count: commentCount } = await supabase

        .from("comments")

        .select("*", {

            head: true,

            count: "exact"

        })

        .eq("post_id", postId);

    //--------------------------------------------------
    // Bookmark Count
    //--------------------------------------------------

    const { count: bookmarkCount } = await supabase

        .from("bookmarks")

        .select("*", {

            head: true,

            count: "exact"

        })

        .eq("post_id", postId);

    //--------------------------------------------------
    // Did current user like?
    //--------------------------------------------------

    const { data: liked } = await supabase

        .from("likes")

        .select("id")

        .eq("post_id", postId)

        .eq("user_id", currentUserId)

        .maybeSingle();

    //--------------------------------------------------
    // Did current user bookmark?
    //--------------------------------------------------

    const { data: bookmarked } = await supabase

        .from("bookmarks")

        .select("id")

        .eq("post_id", postId)

        .eq("user_id", currentUserId)

        .maybeSingle();

    //--------------------------------------------------
    // Response
    //--------------------------------------------------

    return {

        ...post,

        media,

        stats: {

            likes: likeCount ?? 0,

            comments: commentCount ?? 0,

            bookmarks: bookmarkCount ?? 0

        },

        viewer: {

            liked: !!liked,

            bookmarked: !!bookmarked,

            owner: post.user_id === currentUserId

        }

    };

}



export async function updatePostById(

    postId: string,

    userId: string,

    text?: string,

    visibility?: string

) {

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

    const updateData: Record<string, any> = {

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





export async function deletePostById(

    postId: string,

    userId: string

) {

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


export async function getMyPostsService(
    userId: string,
    page: number,
    limit: number
) {

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    //-----------------------------------
    // Count
    //-----------------------------------

    const { count } = await supabase

        .from("posts")

        .select("*", {

            count: "exact",

            head: true

        })

        .eq("user_id", userId);

    //-----------------------------------
    // Posts
    //-----------------------------------

    const { data, error } = await supabase

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
            media(
                *
            )
        `)

        .eq("user_id", userId)

        .order("created_at", {

            ascending: false

        })

        .range(from, to);

    if (error) throw error;

    return {

        posts: data,

        pagination: {

            page,

            limit,

            total: count,

            totalPages: Math.ceil((count || 0) / limit)

        }

    };

}


export async function getUserPostsService(
    userId: string,
    page: number,
    limit: number
) {

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    //----------------------------------
    // Count
    //----------------------------------

    const { count } = await supabase

        .from("posts")

        .select("*", {

            count: "exact",

            head: true

        })

        .eq("user_id", userId)

        .eq("visibility", "public");

    //----------------------------------
    // Posts
    //----------------------------------

    const { data, error } = await supabase

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
            media(
                *
            )
        `)

        .eq("user_id", userId)

        .eq("visibility", "public")

        .order("created_at", {

            ascending: false

        })

        .range(from, to);

    if (error) throw error;

    return {

        posts: data,

        pagination: {

            page,

            limit,

            total: count,

            totalPages: Math.ceil((count || 0) / limit)

        }

    };

}