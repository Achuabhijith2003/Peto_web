import { supabase } from "../config/supabase";
import { mapPostForFeed } from "../posts/feed.mapper";

export async function bookmarkPostService(
    userId: string,
    postId: string,
    businessId?: string,
    actorType?: "USER" | "BUSINESS"
) {
    if (businessId) {
        const { data: existing } = await supabase
            .from("bookmarks")
            .select("id")
            .eq("business_id", businessId)
            .eq("post_id", postId)
            .maybeSingle();

        if (existing) {
            return existing;
        }

        const insertPayload: any = {
            user_id: userId,
            post_id: postId,
            business_id: businessId,
            actor_type: actorType || "BUSINESS"
        };

        let result: any;
        const res = await supabase.from("bookmarks").insert(insertPayload).select().single();
        if (res.error) {
            if (res.error.code === "42703") {
                delete insertPayload.business_id;
                delete insertPayload.actor_type;
                const retry = await supabase.from("bookmarks").insert(insertPayload).select().single();
                if (retry.error) throw retry.error;
                result = retry.data;
            } else {
                throw res.error;
            }
        } else {
            result = res.data;
        }

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

        return result;
    }

    // User bookmark
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

    if (error) throw error;

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

export async function removeBookmarkService(
    userId: string,
    postId: string,
    businessId?: string
) {
    if (businessId) {
        const { error } = await supabase
            .from("bookmarks")
            .delete()
            .eq("business_id", businessId)
            .eq("post_id", postId);

        if (error && error.code === "42703") {
            await supabase.from("bookmarks").delete().eq("user_id", userId).eq("post_id", postId);
        }
    } else {
        const { data } = await supabase
            .from("bookmarks")
            .select("id")
            .eq("user_id", userId)
            .eq("post_id", postId)
            .maybeSingle();

        if (!data) return;

        await supabase
            .from("bookmarks")
            .delete()
            .eq("user_id", userId)
            .eq("post_id", postId);
    }

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

export async function getBookmarksService(
    userId: string,
    page: number,
    limit: number,
    businessId?: string
) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let countQuery = supabase
        .from("bookmarks")
        .select("*", { count: "exact", head: true });

    if (businessId) {
        countQuery = countQuery.eq("business_id", businessId);
    } else {
        countQuery = countQuery.eq("user_id", userId);
    }

    const { count } = await countQuery;

    let dataQuery = supabase
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
        `);

    if (businessId) {
        dataQuery = dataQuery.eq("business_id", businessId);
    } else {
        dataQuery = dataQuery.eq("user_id", userId);
    }

    const { data, error } = await dataQuery
        .order("created_at", { ascending: false })
        .range(from, to);

    if (error) {
        if (error.code === "42703" && businessId) {
            return {
                bookmarks: [],
                pagination: { page, limit, total: 0, totalPages: 0 }
            };
        }
        throw error;
    }

    const postIds = (data ?? []).map((b: any) => b.posts?.id).filter(Boolean);

    let likedPosts = new Set<string>();
    if (userId && postIds.length > 0) {
        const { data: likes } = await supabase
            .from("likes")
            .select("post_id")
            .eq("user_id", userId)
            .in("post_id", postIds);
        likedPosts = new Set((likes ?? []).map((x: any) => x.post_id));
    }

    const bookmarkedPosts = new Set(postIds);

    const formattedBookmarks = (data ?? [])
        .map((b: any) => {
            if (!b.posts) return null;
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