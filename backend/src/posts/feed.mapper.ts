export function mapPostForFeed(
    post: any,
    currentUserId?: string,
    likedPosts?: Set<string>,
    bookmarkedPosts?: Set<string>
) {
    const isBusiness = post.author_type === 'BUSINESS' || !!post.business_id;
    const business = post.business || post.business_identities || null;
    const author = post.profiles || {};
    const community = post.communities || null;

    let mappedAuthor = {
        id: author.id || post.user_id,
        username: author.username || "user",
        full_name: author.full_name || author.username || "Pet Parent",
        avatar_url: author.avatar_url,
        verified: author.verified || false,
        is_business: false,
        badge_type: author.verified ? 'VERIFIED' : null,
        business_id: null as string | null
    };

    if (isBusiness) {
        mappedAuthor = {
            id: business?.id || post.business_id || author.id || post.user_id,
            username: business?.username || business?.name?.toLowerCase().replace(/\s+/g, '_') || "business",
            full_name: business?.name || "Business",
            avatar_url: business?.avatar_url || null,
            verified: true,
            is_business: true,
            badge_type: 'BUSINESS_VERIFIED',
            business_id: business?.id || post.business_id
        };
    }

    return {
        id: post.id,
        user_id: post.user_id,
        text: post.text,
        visibility: post.visibility,
        community_id: post.community_id || null,
        is_locked: post.is_locked || false,
        author_type: isBusiness ? 'BUSINESS' : 'USER',
        business_id: post.business_id || null,
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
        author: mappedAuthor,
        business: business
            ? {
                  id: business.id,
                  name: business.name,
                  username: business.username || business.name?.toLowerCase().replace(/\s+/g, '_'),
                  avatar_url: business.avatar_url,
                  is_verified: true,
                  badge_type: 'BUSINESS_VERIFIED'
              }
            : null,
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
            owner: currentUserId ? (post.user_id === currentUserId || (isBusiness && post.business_member_ids?.includes(currentUserId))) : false
        },
        mentions: post.mentions ?? [],
        tagged_pets: post.tagged_pets ?? []
    };
}