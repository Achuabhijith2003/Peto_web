import { supabase } from "../config/supabase";

export async function likePostService(
    userId: string,
    postId: string
) {

    // Already liked?

    const { data: existing } = await supabase

        .from("likes")

        .select("id")

        .eq("user_id", userId)

        .eq("post_id", postId)

        .maybeSingle();

    if (existing) {

        return existing;

    }

    // Insert Like

    const { data, error } = await supabase

        .from("likes")

        .insert({

            user_id: userId,

            post_id: postId

        })

        .select()

        .single();

    if (error) throw error;

    // Increment Counter

    const { data: post } = await supabase

        .from("posts")

        .select("likes_count")

        .eq("id", postId)

        .single();

    await supabase

        .from("posts")

        .update({

            likes_count: (post?.likes_count || 0) + 1

        })

        .eq("id", postId);

    return data;

}

export async function unlikePostService(
    userId: string,
    postId: string
) {

    const { data } = await supabase

        .from("likes")

        .select("id")

        .eq("user_id", userId)

        .eq("post_id", postId)

        .maybeSingle();

    if (!data) return;

    await supabase

        .from("likes")

        .delete()

        .eq("user_id", userId)

        .eq("post_id", postId);

    const { data: post } = await supabase

        .from("posts")

        .select("likes_count")

        .eq("id", postId)

        .single();

    await supabase

        .from("posts")

        .update({

            likes_count: Math.max(
                0,
                (post?.likes_count || 0) - 1
            )

        })

        .eq("id", postId);

}

export async function getLikesService(

    postId: string,

    page: number,

    limit: number

) {

    const from = (page - 1) * limit;

    const to = from + limit - 1;

    const { count } = await supabase

        .from("likes")

        .select("*", {

            count: "exact",

            head: true

        })

        .eq("post_id", postId);

    const { data, error } = await supabase

        .from("likes")

        .select(`
            created_at,
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

            ascending: false

        })

        .range(from, to);

    if (error) throw error;

    return {

        likes: data,

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