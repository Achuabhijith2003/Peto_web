import { supabase } from "../config/supabase";

export async function mapPostForFeed(
    post: any,
    currentUserId: string
) {

    // Check if current user liked the post
    const { data: like } = await supabase

        .from("likes")

        .select("id")

        .eq("post_id", post.id)

        .eq("user_id", currentUserId)

        .maybeSingle();

    // Check if current user bookmarked the post
    const { data: bookmark } = await supabase

        .from("bookmarks")

        .select("id")

        .eq("post_id", post.id)

        .eq("user_id", currentUserId)

        .maybeSingle();

    return {

        id: post.id,

        text: post.text,

        visibility: post.visibility,

        created_at: post.created_at,

        updated_at: post.updated_at,

        author: {

            id: post.profiles.id,

            username: post.profiles.username,

            full_name: post.profiles.full_name,

            avatar_url: post.profiles.avatar_url,

            verified: post.profiles.verified

        },

        media: post.media || [],

        stats: {

            likes: post.likes_count || 0,

            comments: post.comments_count || 0,

            bookmarks: post.bookmarks_count || 0

        },

        viewer: {

            liked: !!like,

            bookmarked: !!bookmark,

            owner: post.user_id === currentUserId

        }

    };

}