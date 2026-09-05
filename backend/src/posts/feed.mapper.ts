export function mapPostForFeed(
    post: any,
    currentUserId?: string,
    likedPosts?: Set<string>,
    bookmarkedPosts?: Set<string>
) {
    const author = post.profiles || {};
    const community = post.communities || null;

    return {
        id: post.id,
        user_id: post.user_id,
        text: post.text,
        visibility: post.visibility,
        community_id: post.community_id || null,
        is_locked: post.is_locked || false,
        community: community
            ? {
                  id: community.id,
                  name: community.name,
                  slug: community.slug,
                  icon_url: community.icon_url,
                  visibility: community.visibility,
              }
            : null,
        created_at: post.created_at,
        updated_at: post.updated_at,
        author: {
            id: author.id || post.user_id,
            username: author.username || "user",
            full_name: author.full_name || author.username || "Pet Parent",
            avatar_url: author.avatar_url,
            verified: author.verified || false
        },
        media: post.media ?? [],
        content: post.text ?? "",
        likes_count: post.likes_count ?? 0,
        comments_count: post.comments_count ?? 0,
        bookmarks_count: post.bookmarks_count ?? 0,
        is_liked: likedPosts ? likedPosts.has(post.id) : false,
        is_bookmarked: bookmarkedPosts ? bookmarkedPosts.has(post.id) : false,
        stats: {
            likes: post.likes_count ?? 0,
            comments: post.comments_count ?? 0,
            bookmarks: post.bookmarks_count ?? 0
        },
        viewer: {
            liked: likedPosts ? likedPosts.has(post.id) : false,
            bookmarked: bookmarkedPosts ? bookmarkedPosts.has(post.id) : false,
            owner: currentUserId ? post.user_id === currentUserId : false
        }
    };
}