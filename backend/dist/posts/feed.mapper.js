export function mapPostForFeed(post, currentUserId, likedPosts, bookmarkedPosts) {
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
        media: post.media ?? [],
        stats: {
            likes: post.likes_count,
            comments: post.comments_count,
            bookmarks: post.bookmarks_count
        },
        viewer: {
            liked: likedPosts.has(post.id),
            bookmarked: bookmarkedPosts.has(post.id),
            owner: post.user_id === currentUserId
        }
    };
}
