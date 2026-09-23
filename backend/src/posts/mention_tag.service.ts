import { supabase } from "../config/supabase";
import { evaluatePetVisibility } from "../pets/pet.permission";
import { createNotification } from "../notifications/notification.service";

const isUUID = (str: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export const MAX_MENTIONS_PER_POST = 10;
export const MAX_TAGS_PER_POST = 5;
export const MAX_MENTIONS_PER_COMMENT = 5;

export interface MentionedUser {
    id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
    verified?: boolean;
}

export interface TaggedPet {
    id: string;
    name: string;
    species: string;
    breed?: string;
    avatar_url?: string;
    profile_visibility: string;
}

/**
 * Check if bidirectional blocking exists between two users
 */
export async function isUserBlocked(userId1: string, userId2: string): Promise<boolean> {
    if (!userId1 || !userId2 || userId1 === userId2) return false;

    try {
        const { data, error } = await supabase
            .from("user_blocks")
            .select("id")
            .or(`and(blocker_id.eq.${userId1},blocked_id.eq.${userId2}),and(blocker_id.eq.${userId2},blocked_id.eq.${userId1})`)
            .limit(1);

        if (error) {
            // Table might not exist yet; gracefully fallback
            return false;
        }

        return Array.isArray(data) && data.length > 0;
    } catch {
        return false;
    }
}

/**
 * Validates mentioned user IDs:
 * - Checks existence in profiles
 * - Checks blocking rules
 * - Caps at limit
 * - Deduplicates
 */
export async function validateMentions(
    authorId: string,
    rawUserIds: string[] = [],
    maxAllowed = MAX_MENTIONS_PER_POST
): Promise<MentionedUser[]> {
    if (!Array.isArray(rawUserIds) || rawUserIds.length === 0) return [];

    const uniqueIds = Array.from(new Set(rawUserIds.filter(id => id && isUUID(id)))).slice(0, maxAllowed);
    if (uniqueIds.length === 0) return [];

    const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, verified")
        .in("id", uniqueIds);

    if (error || !profiles) {
        return [];
    }

    const validProfiles: MentionedUser[] = [];

    for (const profile of profiles) {
        // Author can't mention blocked or blocking user
        const blocked = await isUserBlocked(authorId, profile.id);
        if (!blocked) {
            validProfiles.push({
                id: profile.id,
                username: profile.username || "user",
                full_name: profile.full_name || profile.username || "User",
                avatar_url: profile.avatar_url || undefined,
                verified: profile.verified || false
            });
        }
    }

    return validProfiles;
}

/**
 * Validates pet IDs for tagging in posts/reels:
 * - Checks existence in pets
 * - Enforces pet visibility permissions
 * - Caps at limit
 * - Deduplicates
 */
export async function validatePetTags(
    authorId: string,
    rawPetIds: string[] = [],
    maxAllowed = MAX_TAGS_PER_POST
): Promise<TaggedPet[]> {
    if (!Array.isArray(rawPetIds) || rawPetIds.length === 0) return [];

    const uniqueIds = Array.from(new Set(rawPetIds.filter(id => id && isUUID(id)))).slice(0, maxAllowed);
    if (uniqueIds.length === 0) return [];

    const { data: pets, error } = await supabase
        .from("pets")
        .select(`
            id,
            name,
            species,
            breed,
            profile_visibility,
            status,
            profile_media:media!pets_profile_media_id_fkey(url)
        `)
        .in("id", uniqueIds);

    if (error || !pets) {
        return [];
    }

    const validPets: TaggedPet[] = [];

    for (const pet of pets) {
        // Must be active (not archived/deleted)
        if (pet.status && pet.status !== "ACTIVE" && pet.status !== "MISSING") {
            continue;
        }

        const visibilityCheck = await evaluatePetVisibility(authorId, {
            id: pet.id,
            profile_visibility: pet.profile_visibility || "PUBLIC"
        });

        if (visibilityCheck.allowed) {
            const avatarUrl = (pet.profile_media as any)?.url || undefined;
            validPets.push({
                id: pet.id,
                name: pet.name,
                species: pet.species,
                breed: pet.breed || undefined,
                avatar_url: avatarUrl,
                profile_visibility: pet.profile_visibility || "PUBLIC"
            });
        }
    }

    return validPets;
}

/**
 * Sync post mentions and pet tags:
 * - Creates/deletes database relationships
 * - Dispatches notifications to mentioned users and tagged pets' parents
 */
export async function syncPostMentionsAndTags(
    postId: string,
    authorId: string,
    rawMentionedUserIds: string[] = [],
    rawTaggedPetIds: string[] = []
) {
    if (!postId || !authorId) return;

    try {
        const validatedMentions = await validateMentions(authorId, rawMentionedUserIds, MAX_MENTIONS_PER_POST);
        const validatedPetTags = await validatePetTags(authorId, rawTaggedPetIds, MAX_TAGS_PER_POST);

        const newMentionIds = new Set(validatedMentions.map(m => m.id));
        const newPetIds = new Set(validatedPetTags.map(p => p.id));

        // 1. Fetch existing mentions for this post
        const { data: existingMentions } = await supabase
            .from("post_mentions")
            .select("id, mentioned_user_id")
            .eq("post_id", postId);

        const existingMentionUserIds = new Set((existingMentions || []).map(m => m.mentioned_user_id));

        // Mentions to add vs remove
        const mentionsToAdd = validatedMentions.filter(m => !existingMentionUserIds.has(m.id));
        const mentionsToRemove = (existingMentions || []).filter(m => !newMentionIds.has(m.mentioned_user_id));

        if (mentionsToRemove.length > 0) {
            const idsToDelete = mentionsToRemove.map(m => m.id);
            await supabase.from("post_mentions").delete().in("id", idsToDelete);
        }

        if (mentionsToAdd.length > 0) {
            const insertPayload = mentionsToAdd.map(m => ({
                post_id: postId,
                mentioned_user_id: m.id,
                created_by: authorId
            }));
            await supabase.from("post_mentions").insert(insertPayload);

            // Send mention notification for each new mention
            for (const mention of mentionsToAdd) {
                if (mention.id !== authorId) {
                    try {
                        await createNotification({
                            recipientId: mention.id,
                            actorId: authorId,
                            postId,
                            type: "mention",
                            message: "mentioned you in a post"
                        });
                    } catch (err) {
                        console.error(`Failed to send mention notification to user ${mention.id}:`, err);
                    }
                }
            }
        }

        // 2. Fetch existing pet tags for this post
        const { data: existingPets } = await supabase
            .from("post_pets")
            .select("id, pet_id")
            .eq("post_id", postId);

        const existingPetIds = new Set((existingPets || []).map(p => p.pet_id));

        const petsToAdd = validatedPetTags.filter(p => !existingPetIds.has(p.id));
        const petsToRemove = (existingPets || []).filter(p => !newPetIds.has(p.pet_id));

        if (petsToRemove.length > 0) {
            const idsToDelete = petsToRemove.map(p => p.id);
            await supabase.from("post_pets").delete().in("id", idsToDelete);
        }

        if (petsToAdd.length > 0) {
            const insertPayload = petsToAdd.map(p => ({
                post_id: postId,
                pet_id: p.id,
                created_by: authorId
            }));
            await supabase.from("post_pets").insert(insertPayload);

            // Notify active pet parents (excluding the author)
            for (const pet of petsToAdd) {
                try {
                    const { data: parents } = await supabase
                        .from("pet_parents")
                        .select("user_id")
                        .eq("pet_id", pet.id)
                        .eq("status", "ACTIVE");

                    for (const parent of parents || []) {
                        if (parent.user_id && parent.user_id !== authorId) {
                            await createNotification({
                                recipientId: parent.user_id,
                                actorId: authorId,
                                postId,
                                type: "mention",
                                message: `tagged your pet ${pet.name} in a post`
                            });
                        }
                    }
                } catch (err) {
                    console.error(`Failed to notify pet parents for pet ${pet.id}:`, err);
                }
            }
        }
    } catch (err) {
        console.error("Error syncing post mentions and tags:", err);
    }
}

/**
 * Handle comment mentions:
 * - Inserts into comment_mentions
 * - Dispatches notifications
 */
export async function syncCommentMentions(
    commentId: string,
    postId: string,
    authorId: string,
    rawMentionedUserIds: string[] = []
) {
    if (!commentId || !postId || !authorId || !rawMentionedUserIds.length) return;

    try {
        const validatedMentions = await validateMentions(authorId, rawMentionedUserIds, MAX_MENTIONS_PER_COMMENT);
        if (validatedMentions.length === 0) return;

        const insertPayload = validatedMentions.map(m => ({
            comment_id: commentId,
            mentioned_user_id: m.id,
            created_by: authorId
        }));

        await supabase.from("comment_mentions").insert(insertPayload);

        for (const mention of validatedMentions) {
            if (mention.id !== authorId) {
                try {
                    await createNotification({
                        recipientId: mention.id,
                        actorId: authorId,
                        postId,
                        commentId,
                        type: "mention",
                        message: "mentioned you in a comment"
                    });
                } catch (err) {
                    console.error(`Failed to send comment mention notification to user ${mention.id}:`, err);
                }
            }
        }
    } catch (err) {
        console.error("Error in syncCommentMentions:", err);
    }
}

/**
 * Batch-loads mentions and tagged pets for an array of post IDs
 */
export async function getMentionsAndTagsForPosts(postIds: string[]): Promise<{
    mentionsByPostId: Map<string, MentionedUser[]>;
    tagsByPostId: Map<string, TaggedPet[]>;
}> {
    const mentionsByPostId = new Map<string, MentionedUser[]>();
    const tagsByPostId = new Map<string, TaggedPet[]>();

    if (!Array.isArray(postIds) || postIds.length === 0) {
        return { mentionsByPostId, tagsByPostId };
    }

    try {
        // Fetch post mentions
        const { data: mentions } = await supabase
            .from("post_mentions")
            .select(`
                post_id,
                mentioned_user:profiles!post_mentions_mentioned_user_id_fkey(
                    id,
                    username,
                    full_name,
                    avatar_url,
                    verified
                )
            `)
            .in("post_id", postIds);

        if (Array.isArray(mentions)) {
            for (const item of mentions) {
                const pId = item.post_id;
                const user = item.mentioned_user as any;
                if (pId && user) {
                    const list = mentionsByPostId.get(pId) || [];
                    list.push({
                        id: user.id,
                        username: user.username || "user",
                        full_name: user.full_name || user.username || "User",
                        avatar_url: user.avatar_url || undefined,
                        verified: user.verified || false
                    });
                    mentionsByPostId.set(pId, list);
                }
            }
        }
    } catch (err) {
        console.warn("Could not query post_mentions:", err);
    }

    try {
        // Fetch post pets
        const { data: petTags } = await supabase
            .from("post_pets")
            .select(`
                post_id,
                pet:pets!post_pets_pet_id_fkey(
                    id,
                    name,
                    species,
                    breed,
                    profile_visibility,
                    profile_media:media!pets_profile_media_id_fkey(url)
                )
            `)
            .in("post_id", postIds);

        if (Array.isArray(petTags)) {
            for (const item of petTags) {
                const pId = item.post_id;
                const pet = item.pet as any;
                if (pId && pet) {
                    const list = tagsByPostId.get(pId) || [];
                    list.push({
                        id: pet.id,
                        name: pet.name,
                        species: pet.species,
                        breed: pet.breed || undefined,
                        avatar_url: (pet.profile_media as any)?.url || undefined,
                        profile_visibility: pet.profile_visibility || "PUBLIC"
                    });
                    tagsByPostId.set(pId, list);
                }
            }
        }
    } catch (err) {
        console.warn("Could not query post_pets:", err);
    }

    return { mentionsByPostId, tagsByPostId };
}
