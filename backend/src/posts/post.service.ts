import { supabase } from "../config/supabase";
import { deleteStorageFile } from "../media/storage.service";
import { mapPostForFeed } from "./feed.mapper";


interface CreatePostData {
    userId: string;
    text?: string;
    visibility: "public" | "followers" | "private";
    media?: any[];
    communityId?: string;
}

const isUUID = (str: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export async function createPostService(
    data: CreatePostData
) {
    const {
        userId,
        text,
        visibility = "public",
        media = [],
        communityId
    } = data;

    // If posting to a community, verify membership & ban status
    if (communityId) {
        const { data: community, error: commError } = await supabase
            .from("communities")
            .select("id, owner_id, is_archived")
            .eq("id", communityId)
            .single();

        if (commError || !community) {
            throw new Error("Community not found.");
        }

        if (community.is_archived) {
            throw new Error("This community is archived and cannot accept new posts.");
        }

        // Check if banned
        const { data: ban } = await supabase
            .from("community_bans")
            .select("id, expires_at")
            .eq("community_id", communityId)
            .eq("user_id", userId)
            .maybeSingle();

        if (ban) {
            if (!ban.expires_at || new Date(ban.expires_at).getTime() > Date.now()) {
                throw new Error("You are banned from posting in this community.");
            }
        }

        // Check membership if not owner
        if (community.owner_id !== userId) {
            const { data: member } = await supabase
                .from("community_members")
                .select("id, status")
                .eq("community_id", communityId)
                .eq("user_id", userId)
                .maybeSingle();

            if (!member || member.status !== "active") {
                throw new Error("You must be an active member of this community to post.");
            }
        }
    }

    const mediaList = Array.isArray(media) ? media : [];

    // Create Post
    const { data: post, error } = await supabase
        .from("posts")
        .insert({
            user_id: userId,
            text: text || "",
            visibility,
            community_id: communityId || null,
            media_count: mediaList.length
        })
        .select()
        .single();

    if (error) {
        throw error;
    }

    // If community post, increment post_count
    if (communityId) {
        const { data: commData } = await supabase
            .from("communities")
            .select("post_count")
            .eq("id", communityId)
            .single();

        if (commData) {
            await supabase
                .from("communities")
                .update({ post_count: (commData.post_count || 0) + 1 })
                .eq("id", communityId);
        }
    }

    // Attach uploaded media if present
    if (mediaList.length > 0) {
        const uuidList = mediaList.filter((item: any) => typeof item === "string" && isUUID(item));
        const objectList = mediaList.filter((item: any) => !(typeof item === "string" && isUUID(item)));

        // If UUIDs passed, update post_id in media table
        if (uuidList.length > 0) {
            const { error: updateError } = await supabase
                .from("media")
                .update({ post_id: post.id })
                .in("id", uuidList)
                .eq("user_id", userId);

            if (updateError) {
                console.error("Error linking UUID media to post:", updateError);
            }
        }

        // If objects/URLs passed, insert new media rows
        if (objectList.length > 0) {
            const mediaToInsert = objectList.map((item: any) => {
                const url = typeof item === "string" ? item : item?.url || item?.path || item?.src || "";
                const type = typeof item === "object" && item?.type ? item.type : "image";
                return {
                    post_id: post.id,
                    user_id: userId,
                    url,
                    type
                };
            }).filter(m => m.url);

            if (mediaToInsert.length > 0) {
                const { error: insertError } = await supabase
                    .from("media")
                    .insert(mediaToInsert);

                if (insertError) {
                    console.error("Error inserting media objects to post:", insertError);
                }
            }
        }
    }

    return post;
}


export async function getPostById(
    postId: string,
    currentUserId?: string
) {

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

    let likeData = null;
    let bookmarkData = null;

    if (currentUserId) {
        const { data: like } = await supabase
            .from("likes")
            .select("post_id")
            .eq("user_id", currentUserId)
            .eq("post_id", post.id)
            .maybeSingle();
        likeData = like;

        const { data: bookmark } = await supabase
            .from("bookmarks")
            .select("post_id")
            .eq("user_id", currentUserId)
            .eq("post_id", post.id)
            .maybeSingle();
        bookmarkData = bookmark;
    }

    const likedPosts = new Set(likeData ? [post.id] : []);
    const bookmarkedPosts = new Set(bookmarkData ? [post.id] : []);

    return mapPostForFeed(
        post,
        currentUserId,
        likedPosts,
        bookmarkedPosts
    );
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

    const likedPosts = new Set(

        (likes ?? []).map(

            x => x.post_id

        )

    );

    const bookmarkedPosts = new Set(

        (bookmarks ?? []).map(

            x => x.post_id

        )

    );

    const feed = posts?.map(post =>

        mapPostForFeed(

            post,

            userId,

            likedPosts,

            bookmarkedPosts

        )

    );

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

export async function getUserPostsService(
    profileId: string,
    currentUserId?: string,
    page: number = 1,
    limit: number = 10
) {
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

    let likedPosts = new Set<string>();
    let bookmarkedPosts = new Set<string>();

    if (currentUserId && postIds.length > 0) {
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

        likedPosts = new Set((likes ?? []).map(x => x.post_id));
        bookmarkedPosts = new Set((bookmarks ?? []).map(x => x.post_id));
    }

    const feed = (posts ?? []).map(post =>
        mapPostForFeed(
            post,
            currentUserId,
            likedPosts,
            bookmarkedPosts
        )
    );

    return {
        posts: feed,
        pagination: {
            page,
            limit,
            total: count ?? 0,
            totalPages: Math.ceil((count ?? 0) / limit)
        }
    };
}

export async function getGlobalFeedService(
    currentUserId?: string,
    page: number = 1,
    limit: number = 7
) {
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

    let likedPosts = new Set<string>();
    let bookmarkedPosts = new Set<string>();

    if (currentUserId && postIds.length > 0) {
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

        likedPosts = new Set((likes ?? []).map(x => x.post_id));
        bookmarkedPosts = new Set((bookmarks ?? []).map(x => x.post_id));
    }

    const feed = (posts ?? []).map(post =>
        mapPostForFeed(
            post,
            currentUserId,
            likedPosts,
            bookmarkedPosts
        )
    );

    return {
        posts: feed,
        pagination: {
            page,
            limit,
            total: count ?? 0,
            totalPages: Math.ceil((count ?? 0) / limit)
        }
    };
}

export async function searchPostsService(
    currentUserId?: string,
    query: string = "",
    page: number = 1,
    limit: number = 20
) {
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
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .range(from, to);

    const postIds = (posts ?? []).map(post => post.id);

    let likedPosts = new Set<string>();
    let bookmarkedPosts = new Set<string>();

    if (currentUserId && postIds.length > 0) {
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

        likedPosts = new Set((likes ?? []).map(x => x.post_id));
        bookmarkedPosts = new Set((bookmarks ?? []).map(x => x.post_id));
    }

    const feed = (posts ?? []).map(post =>
        mapPostForFeed(
            post,
            currentUserId,
            likedPosts,
            bookmarkedPosts
        )
    );

    return {
        posts: feed || [],
        pagination: {
            page,
            limit,
            total: count ?? 0,
            totalPages: Math.ceil((count ?? 0) / limit)
        }
    };
}

export async function getReelsFeedService(
    currentUserId?: string,
    page: number = 1,
    limit: number = 10
) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: posts } = await supabase
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
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .range(from, to * 2);

    const videoPosts = (posts ?? []).filter(post => {
        if (!post.media || !Array.isArray(post.media)) return false;
        return post.media.some((m: any) => {
            if (m.type === "video") return true;
            const url = typeof m === "string" ? m : m?.url || m?.path || "";
            return /\.(mp4|webm|mov|mkv|avi)(\?.*)?$/i.test(url);
        });
    }).slice(0, limit);

    const postIds = videoPosts.map(post => post.id);

    let likedPosts = new Set<string>();
    let bookmarkedPosts = new Set<string>();

    if (currentUserId && postIds.length > 0) {
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

        likedPosts = new Set((likes ?? []).map(x => x.post_id));
        bookmarkedPosts = new Set((bookmarks ?? []).map(x => x.post_id));
    }

    const feed = videoPosts.map(post =>
        mapPostForFeed(
            post,
            currentUserId,
            likedPosts,
            bookmarkedPosts
        )
    );

    return {
        posts: feed,
        pagination: {
            page,
            limit,
            total: videoPosts.length,
            totalPages: Math.ceil(videoPosts.length / limit)
        }
    };
}

export async function getCommunityFeedService(
    communityId: string,
    currentUserId?: string,
    page: number = 1,
    limit: number = 20,
    sort: "new" | "popular" = "new"
) {
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(communityId);

    // 1. Fetch community & verify private access
    let commQuery = supabase.from("communities").select("id, visibility, owner_id");
    if (isUUID) {
        commQuery = commQuery.eq("id", communityId);
    } else {
        commQuery = commQuery.eq("slug", communityId);
    }
    const { data: community, error: commError } = await commQuery.single();

    if (commError || !community) {
        throw new Error("Community not found.");
    }

    const resolvedCommId = community.id;

    if (community.visibility === "private" && community.owner_id !== currentUserId) {
        if (!currentUserId) {
            throw new Error("This community is private. Please join to view discussions.");
        }
        const { data: member } = await supabase
            .from("community_members")
            .select("status")
            .eq("community_id", resolvedCommId)
            .eq("user_id", currentUserId)
            .maybeSingle();

        if (!member || member.status !== "active") {
            throw new Error("This community is private. Please join to view discussions.");
        }
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
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
            communities(
                id,
                name,
                slug,
                icon_url,
                visibility
            ),
            media(*)
        `, { count: "exact" })
        .eq("community_id", resolvedCommId);

    if (sort === "popular") {
        query = query.order("likes_count", { ascending: false }).order("comments_count", { ascending: false });
    } else {
        query = query.order("created_at", { ascending: false });
    }

    const { data: posts, count, error } = await query.range(from, to);
    if (error) throw error;

    const postIds = (posts ?? []).map(post => post.id);

    let likedPosts = new Set<string>();
    let bookmarkedPosts = new Set<string>();

    if (currentUserId && postIds.length > 0) {
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

        likedPosts = new Set((likes ?? []).map(x => x.post_id));
        bookmarkedPosts = new Set((bookmarks ?? []).map(x => x.post_id));
    }

    const feed = (posts ?? []).map(post =>
        mapPostForFeed(
            post,
            currentUserId,
            likedPosts,
            bookmarkedPosts
        )
    );

    return {
        posts: feed,
        pagination: {
            page,
            limit,
            total: count ?? 0,
            totalPages: Math.ceil((count ?? 0) / limit)
        }
    };
}