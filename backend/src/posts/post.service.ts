import { supabase } from "../config/supabase";

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