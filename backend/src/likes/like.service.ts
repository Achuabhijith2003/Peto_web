import { supabase } from "../config/supabase";
import { createNotification, removeNotificationByEvent } from "../notifications/notification.service";

export async function likePostService(
    userId: string,
    postId: string,
    businessId?: string,
    actorType?: "USER" | "BUSINESS"
) {
    // Already liked?
    if (businessId) {
        const { data: existing } = await supabase
            .from("likes")
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
        const res = await supabase.from("likes").insert(insertPayload).select().single();
        if (res.error) {
            if (res.error.code === "42703") {
                delete insertPayload.business_id;
                delete insertPayload.actor_type;
                const retry = await supabase.from("likes").insert(insertPayload).select().single();
                if (retry.error) throw retry.error;
                result = retry.data;
            } else {
                throw res.error;
            }
        } else {
            result = res.data;
        }

        // Increment Counter
        const { data: post } = await supabase
            .from("posts")
            .select("likes_count, user_id")
            .eq("id", postId)
            .single();

        await supabase
            .from("posts")
            .update({
                likes_count: (post?.likes_count || 0) + 1
            })
            .eq("id", postId);

        return result;
    }

    // User Like
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
        .select("likes_count, user_id")
        .eq("id", postId)
        .single();

    await supabase
        .from("posts")
        .update({
            likes_count: (post?.likes_count || 0) + 1
        })
        .eq("id", postId);

    if (post) {
        await createNotification({
            recipientId: post.user_id,
            actorId: userId,
            postId,
            type: "like",
            message: "liked your post."
        });
    }

    return data;
}

export async function unlikePostService(
    userId: string,
    postId: string,
    businessId?: string
) {
    if (businessId) {
        const { error } = await supabase
            .from("likes")
            .delete()
            .eq("business_id", businessId)
            .eq("post_id", postId);

        if (error && error.code === "42703") {
            await supabase.from("likes").delete().eq("user_id", userId).eq("post_id", postId);
        }
    } else {
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
    }

    const { data: post } = await supabase
        .from("posts")
        .select("likes_count, user_id")
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

    if (post && !businessId) {
        await removeNotificationByEvent({
            recipientId: post.user_id,
            actorId: userId,
            type: "like",
            postId,
        });
    }
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
            business_id,
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

    let likesData: any[] = (data as any[]) ?? [];
    if (error) {
        // Fallback without business_id if column not created yet
        const retry = await supabase
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
            .order("created_at", { ascending: false })
            .range(from, to);
        if (retry.error) throw retry.error;
        likesData = retry.data;
    }

    // Populate business identities for business likes
    const businessIds = Array.from(new Set((likesData ?? []).map((l: any) => l.business_id).filter(Boolean)));
    const businessMap = new Map<string, any>();
    if (businessIds.length > 0) {
        try {
            const { data: businesses } = await supabase
                .from("business_identities")
                .select("id, name, username, avatar_url, business_category")
                .in("id", businessIds);
            (businesses ?? []).forEach((b: any) => businessMap.set(b.id, b));
        } catch (_) {}
    }

    const mappedLikes = (likesData ?? []).map((l: any) => {
        let profiles = l.profiles;
        if (l.business_id && businessMap.has(l.business_id)) {
            const biz = businessMap.get(l.business_id);
            profiles = {
                id: biz.id,
                username: biz.username || biz.name?.toLowerCase().replace(/\s+/g, '_') || "business",
                full_name: biz.name || "Business",
                avatar_url: biz.avatar_url,
                verified: true,
                badge_type: 'BUSINESS_VERIFIED',
                is_business: true,
                business_id: biz.id
            };
        }
        return {
            created_at: l.created_at,
            profiles,
            user: profiles
        };
    });

    return {
        likes: mappedLikes,
        pagination: {
            page,
            limit,
            total: count,
            totalPages: Math.ceil((count || 0) / limit)
        }
    };
}