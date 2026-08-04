export function mapPostForFeed(post, currentUserId, likedPosts, bookmarkedPosts) {
    const author = post.profiles || {};
    return {
        id: post.id,
        user_id: post.user_id,
        text: post.text,
        visibility: post.visibility,
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
