import { supabase } from "../config/supabase";

export async function createCommentService(
    userId: string,
    postId: string,
    comment: string,
    parent_comment_id?: string
) {

    const { data, error } = await supabase

        .from("comments")

        .insert({

            post_id: postId,

            user_id: userId,

            comment,

            parent_comment_id: parent_comment_id || null

        })

        .select()

        .single();

    if (error) throw error;

    const { data: post } = await supabase

        .from("posts")

        .select("comments_count")

        .eq("id", postId)

        .single();

    await supabase

        .from("posts")

        .update({

            comments_count:
                (post?.comments_count || 0) + 1

        })

        .eq("id", postId);

    return data;

}

export async function getCommentsService(
    postId: string,
    page: number,
    limit: number
) {

    const from = (page - 1) * limit;

    const to = from + limit - 1;

    const { count } = await supabase

        .from("comments")

        .select("*", {

            count: "exact",

            head: true

        })

        .eq("post_id", postId);

    const { data, error } = await supabase

        .from("comments")

        .select(`
            *,
            profiles(
                id,
                username,
                full_name,
                avatar_url,
                verified
            )
        `)

        .eq("post_id", postId)

        .order("created_at", {

            ascending: true

        })

        .range(from, to);

    if (error) throw error;

    return {

        comments: data,

        pagination: {

            page,

            limit,

            total: count,

            totalPages: Math.ceil(
                (count || 0) / limit
            )

        }

    };

}

export async function updateCommentService(
    userId: string,
    commentId: string,
    comment: string
) {

    const { data: existing } = await supabase

        .from("comments")

        .select("*")

        .eq("id", commentId)

        .single();

    if (!existing)
        throw new Error("Comment not found");

    if (existing.user_id !== userId)
        throw new Error("Unauthorized");

    const { data, error } = await supabase

        .from("comments")

        .update({

            comment,

            edited: true,

            updated_at: new Date()

        })

        .eq("id", commentId)

        .select()

        .single();

    if (error) throw error;

    return data;

}

export async function deleteCommentService(
    userId: string,
    commentId: string
) {

    const { data: comment } = await supabase

        .from("comments")

        .select("*")

        .eq("id", commentId)

        .single();

    if (!comment)
        throw new Error("Comment not found");

    if (comment.user_id !== userId)
        throw new Error("Unauthorized");

    await supabase

        .from("comments")

        .delete()

        .eq("id", commentId);

    const { data: post } = await supabase

        .from("posts")

        .select("comments_count")

        .eq("id", comment.post_id)

        .single();

    await supabase

        .from("posts")

        .update({

            comments_count: Math.max(
                0,
                (post?.comments_count || 0) - 1
            )

        })

        .eq("id", comment.post_id);

}