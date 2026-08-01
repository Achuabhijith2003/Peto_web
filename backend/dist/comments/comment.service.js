import { supabase } from "../config/supabase";
import { createNotification } from "../notifications/notification.service";
export async function createCommentService(userId, postId, comment, parent_comment_id) {
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
    if (error)
        throw error;
    const { data: post } = await supabase
        .from("posts")
        .select("comments_count")
        .eq("id", postId)
        .single();
    await supabase
        .from("posts")
        .update({
        comments_count: (post?.comments_count || 0) + 1
    })
        .eq("id", postId);
    const { data: posts } = await supabase
        .from("posts")
        .select("user_id")
        .eq("id", postId)
        .single();
    if (posts) {
        await createNotification({
            recipientId: posts.user_id,
            actorId: userId,
            postId,
            commentId: data.id,
            type: "comment",
            message: "commented on your post."
        });
    }
    // Mention notifications for @username
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    const matches = comment.match(mentionRegex);
    if (matches && matches.length > 0) {
        const usernames = Array.from(new Set(matches.map((m) => m.substring(1))));
        const { data: mentionedProfiles } = await supabase
            .from("profiles")
            .select("id, username")
            .in("username", usernames);
        if (mentionedProfiles) {
            for (const profile of mentionedProfiles) {
                if (profile.id !== userId && profile.id !== posts?.user_id) {
                    await createNotification({
                        recipientId: profile.id,
                        actorId: userId,
                        postId,
                        commentId: data.id,
                        type: "mention",
                        message: "mentioned you in a comment.",
                    });
                }
            }
        }
    }
    return data;
}
export async function getCommentsService(postId, page, limit) {
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
    if (error)
        throw error;
    return {
        comments: data,
        pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil((count || 0) / limit)
        }
    };
}
export async function updateCommentService(userId, commentId, comment) {
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
    if (error)
        throw error;
    return data;
}
export async function deleteCommentService(userId, commentId) {
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
        comments_count: Math.max(0, (post?.comments_count || 0) - 1)
    })
        .eq("id", comment.post_id);
}
