import { supabase } from "../config/supabase";
import {
  CreatePetInput,
  Pet,
  PetMediaItem,
  PetParent,
  PetPermission,
  PetRelationship,
  PetVisibility,
  UpdatePetInput,
} from "./pet.types";
import {
  evaluatePetVisibility,
  getPetParentRelationship,
  hasPetPermission,
  sanitizePetForRequester,
} from "./pet.permission";
import { createNotification } from "../notifications/notification.service";

/**
 * 1. Create a new pet and establish caller as primary OWNER
 */
export async function createPetService(
  userId: string,
  input: CreatePetInput
): Promise<Pet> {
  if (!input.name || !input.name.trim()) {
    const error: any = new Error("Pet name is required.");
    error.status = 400;
    throw error;
  }

  if (!input.species) {
    const error: any = new Error("Pet species is required.");
    error.status = 400;
    throw error;
  }

  const visibility: PetVisibility = input.profile_visibility || "PUBLIC";
  const relationship: PetRelationship = input.relationship || "OWNER";

  let profileMediaId = input.profile_media_id || null;
  const avatarUrl = input.profile_media_url || (input as any).profile_photo_url;
  if (!profileMediaId && avatarUrl && typeof avatarUrl === "string" && avatarUrl.trim()) {
    try {
      const { data: existingMedia } = await supabase
        .from("media")
        .select("id")
        .eq("url", avatarUrl.trim())
        .maybeSingle();

      if (existingMedia?.id) {
        profileMediaId = existingMedia.id;
      } else {
        const { data: newMedia } = await supabase
          .from("media")
          .insert({
            user_id: userId,
            type: "image",
            url: avatarUrl.trim(),
            mime_type: "image/webp",
          })
          .select("id")
          .single();
        if (newMedia?.id) profileMediaId = newMedia.id;
      }
    } catch (mediaErr) {
      console.warn("Failed to auto-link media for pet avatar:", mediaErr);
    }
  }

  // 1. Insert into pets table
  const { data: pet, error: petError } = await supabase
    .from("pets")
    .insert({
      name: input.name.trim(),
      species: input.species,
      species_name: input.species === "OTHER" ? input.species_name?.trim() || "Other" : null,
      breed: input.breed?.trim() || null,
      breed_secondary: input.breed_secondary?.trim() || null,
      sex: input.sex || "UNKNOWN",
      date_of_birth: input.date_of_birth || null,
      is_date_of_birth_approximate: Boolean(input.is_date_of_birth_approximate),
      color: input.color?.trim() || null,
      size: input.size || null,
      bio: input.bio?.trim() || null,
      country: input.country?.trim() || null,
      state: input.state?.trim() || null,
      city: input.city?.trim() || null,
      profile_visibility: visibility,
      profile_media_id: profileMediaId,
      cover_media_id: null,
      status: "ACTIVE",
    })
    .select()
    .single();

  if (petError || !pet) {
    throw new Error(petError?.message || "Failed to create pet record.");
  }

  // 2. Establish primary OWNER relationship
  const allPermissions: PetPermission[] = [
    "VIEW_PROFILE",
    "EDIT_PROFILE",
    "UPLOAD_MEDIA",
    "CREATE_PET_POST",
    "MANAGE_PARENTS",
    "MANAGE_PRIVACY",
  ];

  const { error: parentError } = await supabase.from("pet_parents").insert({
    pet_id: pet.id,
    user_id: userId,
    relationship: relationship,
    is_primary: true,
    status: "ACTIVE",
    permissions: allPermissions,
  });

  if (parentError) {
    // Cleanup pet if parent setup fails
    await supabase.from("pets").delete().eq("id", pet.id);
    throw new Error("Failed to register pet parent relationship.");
  }

  // 3. Register media roles if media IDs provided
  if (profileMediaId) {
    await supabase.from("pet_media").insert({
      pet_id: pet.id,
      media_id: profileMediaId,
      role: "PROFILE",
      visibility: "INHERIT",
      is_primary: true,
      created_by: userId,
    });
  }

  if (input.cover_media_id) {
    await supabase.from("pet_media").insert({
      pet_id: pet.id,
      media_id: input.cover_media_id,
      role: "COVER",
      visibility: "INHERIT",
      is_primary: true,
      created_by: userId,
    });
  }

  return await getPetByIdService(pet.id, userId);
}

/**
 * 2. Get Pet by ID with strict server-side visibility enforcement
 */
export async function getPetByIdService(
  petId: string,
  requesterId: string | null
): Promise<Pet> {
  const { data: pet, error } = await supabase
    .from("pets")
    .select("*")
    .eq("id", petId)
    .single();

  if (error || !pet) {
    const err: any = new Error("Pet not found.");
    err.status = 404;
    throw err;
  }

  // Server-side visibility evaluation
  const { allowed, isParent, relationship } = await evaluatePetVisibility(requesterId, pet);

  if (!allowed) {
    // Return 404 to avoid leaking existence of private pets
    const err: any = new Error("Pet not found.");
    err.status = 404;
    throw err;
  }

  // Fetch Pet Parents
  const { data: parentsRaw } = await supabase
    .from("pet_parents")
    .select(`
      id,
      pet_id,
      user_id,
      relationship,
      is_primary,
      status,
      permissions,
      created_at,
      updated_at,
      profiles:user_id(id, username, full_name, avatar_url)
    `)
    .eq("pet_id", petId)
    .in("status", ["ACTIVE", "PENDING"]);

  const parents: any[] = (parentsRaw || []).map((p: any) => {
    const userProfile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
    return {
      id: p.id,
      pet_id: p.pet_id,
      user_id: p.user_id,
      relationship: p.relationship,
      relationship_type: p.relationship,
      is_primary: Boolean(p.is_primary),
      status: p.status,
      permissions: p.permissions || [],
      created_at: p.created_at,
      updated_at: p.updated_at,
      username: userProfile?.username,
      full_name: userProfile?.full_name,
      avatar_url: userProfile?.avatar_url,
      user: userProfile,
    };
  });

  // Fetch Pet Media
  const { data: mediaRaw } = await supabase
    .from("pet_media")
    .select(`
      id,
      pet_id,
      media_id,
      role,
      visibility,
      caption,
      alt_text,
      sort_order,
      is_primary,
      created_by,
      created_at,
      media:media_id(id, url, type, thumbnail_url)
    `)
    .eq("pet_id", petId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  const mediaList: PetMediaItem[] = (mediaRaw || []).map((m: any) => {
    const mediaObj = m.media;
    const mediaUrl = mediaObj?.url || null;
    const isVideo =
      mediaObj?.type === "video" ||
      mediaUrl?.toLowerCase().endsWith(".mp4") ||
      mediaUrl?.toLowerCase().endsWith(".mov") ||
      mediaUrl?.toLowerCase().endsWith(".mkv") ||
      mediaUrl?.toLowerCase().endsWith(".webm");
    const mediaType = isVideo ? "VIDEO" : "IMAGE";

    return {
      id: m.id,
      pet_id: m.pet_id,
      media_id: m.media_id,
      role: m.role,
      visibility: m.visibility,
      caption: m.caption,
      alt_text: m.alt_text,
      sort_order: m.sort_order,
      is_primary: m.is_primary,
      created_by: m.created_by,
      created_at: m.created_at,
      url: mediaUrl,
      media_url: mediaUrl,
      type: mediaObj?.type || (isVideo ? "video" : "image"),
      media_type: mediaType,
      thumbnail_url: mediaObj?.thumbnail_url || null,
      is_profile: m.role === "PROFILE" || Boolean(m.is_primary),
      is_cover: m.role === "COVER",
    };
  });

  // Resolve Profile and Cover URLs
  let profileUrl: string | null = null;
  let coverUrl: string | null = null;

  if (pet.profile_media_id) {
    const found = mediaList.find((m) => m.media_id === pet.profile_media_id);
    if (found?.url) profileUrl = found.url;
    else {
      const { data: m } = await supabase
        .from("media")
        .select("url")
        .eq("id", pet.profile_media_id)
        .maybeSingle();
      if (m?.url) profileUrl = m.url;
    }
  }

  if (pet.cover_media_id) {
    const found = mediaList.find((m) => m.media_id === pet.cover_media_id);
    if (found?.url) coverUrl = found.url;
    else {
      const { data: m } = await supabase
        .from("media")
        .select("url")
        .eq("id", pet.cover_media_id)
        .maybeSingle();
      if (m?.url) coverUrl = m.url;
    }
  }

  const canEdit = Boolean(
    isParent &&
      (relationship?.is_primary ||
        relationship?.permissions?.includes("EDIT_PROFILE"))
  );

  const canManageParents = Boolean(
    isParent &&
      (relationship?.is_primary ||
        relationship?.permissions?.includes("MANAGE_PARENTS"))
  );

  const canManagePrivacy = Boolean(
    isParent &&
      (relationship?.is_primary ||
        relationship?.permissions?.includes("MANAGE_PRIVACY"))
  );

  const enrichedPet: Pet = {
    ...pet,
    visibility: pet.profile_visibility || "PUBLIC",
    profile_visibility: pet.profile_visibility || "PUBLIC",
    profile_photo_url: profileUrl,
    cover_photo_url: coverUrl,
    profile_media_url: profileUrl,
    cover_media_url: coverUrl,
    parents: parents,
    media: mediaList,
    current_user_relationship: relationship,
    is_parent: isParent,
    can_edit: canEdit,
    can_manage_parents: canManageParents,
    viewer_permissions: {
      can_view: true,
      can_edit: canEdit,
      can_upload_media: isParent,
      can_manage_parents: canManageParents,
      can_manage_privacy: canManagePrivacy,
    },
    viewer_relationship: {
      is_parent: isParent,
      is_primary: relationship?.is_primary || false,
      relationship_type: relationship?.relationship,
      permissions: relationship?.permissions,
    },
  };

  return sanitizePetForRequester(enrichedPet, isParent, requesterId);
}

/**
 * 3. Update Pet details (Requires EDIT_PROFILE permission)
 */
export async function updatePetService(
  petId: string,
  userId: string,
  input: UpdatePetInput
): Promise<Pet> {
  const allowed = await hasPetPermission(userId, petId, "EDIT_PROFILE");
  if (!allowed) {
    const error: any = new Error("You do not have permission to edit this pet's profile.");
    error.status = 403;
    throw error;
  }

  const updatePayload: any = {
    updated_at: new Date().toISOString(),
  };

  if (input.name !== undefined) updatePayload.name = input.name.trim();
  if (input.species !== undefined) updatePayload.species = input.species;
  if (input.species_name !== undefined) updatePayload.species_name = input.species_name;
  if (input.breed !== undefined) updatePayload.breed = input.breed ? input.breed.trim() : null;
  if (input.breed_secondary !== undefined) updatePayload.breed_secondary = input.breed_secondary ? input.breed_secondary.trim() : null;
  if (input.sex !== undefined) updatePayload.sex = input.sex;
  if (input.date_of_birth !== undefined) updatePayload.date_of_birth = input.date_of_birth || null;
  if (input.is_date_of_birth_approximate !== undefined) updatePayload.is_date_of_birth_approximate = input.is_date_of_birth_approximate;
  if (input.color !== undefined) updatePayload.color = input.color ? input.color.trim() : null;
  if (input.size !== undefined) updatePayload.size = input.size || null;
  if (input.bio !== undefined) updatePayload.bio = input.bio ? input.bio.trim() : null;
  if (input.country !== undefined) updatePayload.country = input.country ? input.country.trim() : null;
  if (input.state !== undefined) updatePayload.state = input.state ? input.state.trim() : null;
  if (input.city !== undefined) updatePayload.city = input.city ? input.city.trim() : null;
  if (input.status !== undefined) updatePayload.status = input.status;
  if (input.profile_media_id !== undefined) {
    updatePayload.profile_media_id = input.profile_media_id || null;
  } else if (input.profile_media_url || (input as any).profile_photo_url) {
    const avatarUrl = input.profile_media_url || (input as any).profile_photo_url;
    if (typeof avatarUrl === "string" && avatarUrl.trim()) {
      try {
        const { data: existingMedia } = await supabase
          .from("media")
          .select("id")
          .eq("url", avatarUrl.trim())
          .maybeSingle();
        if (existingMedia?.id) {
          updatePayload.profile_media_id = existingMedia.id;
        } else {
          const { data: newMedia } = await supabase
            .from("media")
            .insert({
              user_id: userId,
              type: "image",
              url: avatarUrl.trim(),
              mime_type: "image/webp",
            })
            .select("id")
            .single();
          if (newMedia?.id) updatePayload.profile_media_id = newMedia.id;
        }
      } catch (mediaErr) {
        console.warn("Failed to auto-link media for pet avatar update:", mediaErr);
      }
    }
  }

  // Visibility check requires separate MANAGE_PRIVACY permission
  if (input.profile_visibility !== undefined) {
    const canManagePrivacy = await hasPetPermission(userId, petId, "MANAGE_PRIVACY");
    if (!canManagePrivacy) {
      const error: any = new Error("You do not have permission to modify this pet's visibility settings.");
      error.status = 403;
      throw error;
    }
    updatePayload.profile_visibility = input.profile_visibility;
  }

  const { error } = await supabase
    .from("pets")
    .update(updatePayload)
    .eq("id", petId);

  if (error) throw error;

  return await getPetByIdService(petId, userId);
}

/**
 * 4. Delete/Archive Pet (Requires primary OWNER)
 */
export async function deletePetService(petId: string, userId: string): Promise<void> {
  const relationship = await getPetParentRelationship(userId, petId);
  if (!relationship || !relationship.is_primary) {
    const error: any = new Error("Only the primary owner can delete this pet.");
    error.status = 403;
    throw error;
  }

  const { error } = await supabase.from("pets").delete().eq("id", petId);
  if (error) throw error;
}

/**
 * 5. Update Pet Visibility (Requires MANAGE_PRIVACY permission)
 */
export async function updatePetVisibilityService(
  petId: string,
  userId: string,
  visibility: PetVisibility
): Promise<Pet> {
  const allowed = await hasPetPermission(userId, petId, "MANAGE_PRIVACY");
  if (!allowed) {
    const error: any = new Error("You do not have permission to modify this pet's visibility settings.");
    error.status = 403;
    throw error;
  }

  const { error } = await supabase
    .from("pets")
    .update({ profile_visibility: visibility, updated_at: new Date().toISOString() })
    .eq("id", petId);

  if (error) throw error;

  return await getPetByIdService(petId, userId);
}

/**
 * 6. Get Showcase Pets for a User Profile (Respects visibility)
 */
export async function getUserPetsService(
  targetUserId: string,
  requesterId: string | null
): Promise<Pet[]> {
  const { data: parentRows, error } = await supabase
    .from("pet_parents")
    .select(`
      pet_id,
      relationship,
      is_primary,
      pets:pet_id(*)
    `)
    .eq("user_id", targetUserId)
    .eq("status", "ACTIVE");

  if (error || !parentRows) return [];

  const visiblePets: Pet[] = [];

  for (const row of parentRows) {
    const pet = Array.isArray(row.pets) ? row.pets[0] : row.pets;
    if (!pet) continue;

    const { allowed } = await evaluatePetVisibility(requesterId, pet);
    if (!allowed) continue;

    // Resolve avatar URL if available
    let avatarUrl: string | null = null;
    if (pet.profile_media_id) {
      const { data: m } = await supabase
        .from("media")
        .select("url")
        .eq("id", pet.profile_media_id)
        .maybeSingle();
      if (m?.url) avatarUrl = m.url;
    }

    if (!avatarUrl) {
      const { data: petMediaRows } = await supabase
        .from("pet_media")
        .select("media:media_id(url), role, is_primary")
        .eq("pet_id", pet.id)
        .order("is_primary", { ascending: false });

      if (petMediaRows && petMediaRows.length > 0) {
        const profileMedia = petMediaRows.find((pm: any) => pm.role === "PROFILE") || petMediaRows[0];
        if ((profileMedia as any)?.media?.url) {
          avatarUrl = (profileMedia as any).media.url;
        }
      }
    }

    visiblePets.push({
      ...pet,
      visibility: pet.profile_visibility || "PUBLIC",
      profile_visibility: pet.profile_visibility || "PUBLIC",
      profile_photo_url: avatarUrl,
      profile_media_url: avatarUrl,
      is_parent: requesterId === targetUserId,
    });
  }

  return visiblePets;
}

/**
 * 7. Get Current User's Owned/Co-owned Pets
 */
export async function getMyPetsService(userId: string): Promise<Pet[]> {
  const { data: parentRows, error } = await supabase
    .from("pet_parents")
    .select(`
      pet_id,
      relationship,
      is_primary,
      status,
      permissions,
      pets:pet_id(*)
    `)
    .eq("user_id", userId)
    .eq("status", "ACTIVE");

  if (error || !parentRows) return [];

  const results: Pet[] = [];

  for (const row of parentRows) {
    const pet = Array.isArray(row.pets) ? row.pets[0] : row.pets;
    if (!pet) continue;

    let avatarUrl: string | null = null;
    let coverUrl: string | null = null;

    if (pet.profile_media_id) {
      const { data: m } = await supabase
        .from("media")
        .select("url")
        .eq("id", pet.profile_media_id)
        .maybeSingle();
      if (m?.url) avatarUrl = m.url;
    }

    if (!avatarUrl) {
      const { data: petMediaRows } = await supabase
        .from("pet_media")
        .select("media:media_id(url), role, is_primary")
        .eq("pet_id", pet.id)
        .order("is_primary", { ascending: false });

      if (petMediaRows && petMediaRows.length > 0) {
        const profileMedia = petMediaRows.find((pm: any) => pm.role === "PROFILE") || petMediaRows[0];
        if ((profileMedia as any)?.media?.url) {
          avatarUrl = (profileMedia as any).media.url;
        }
      }
    }

    if (pet.cover_media_id) {
      const { data: m } = await supabase
        .from("media")
        .select("url")
        .eq("id", pet.cover_media_id)
        .maybeSingle();
      if (m?.url) coverUrl = m.url;
    }

    results.push({
      ...pet,
      visibility: pet.profile_visibility || "PUBLIC",
      profile_visibility: pet.profile_visibility || "PUBLIC",
      profile_photo_url: avatarUrl,
      profile_media_url: avatarUrl,
      cover_photo_url: coverUrl,
      cover_media_url: coverUrl,
      current_user_relationship: {
        id: "",
        pet_id: pet.id,
        user_id: userId,
        relationship: row.relationship,
        is_primary: row.is_primary,
        status: row.status,
        permissions: row.permissions || [],
        created_at: "",
        updated_at: "",
      },
      is_parent: true,
      can_edit: true,
      can_manage_parents: row.is_primary || (row.permissions && row.permissions.includes("MANAGE_PARENTS")),
      viewer_permissions: {
        can_view: true,
        can_edit: true,
        can_upload_media: true,
        can_manage_parents: row.is_primary || (row.permissions && row.permissions.includes("MANAGE_PARENTS")),
        can_manage_privacy: row.is_primary || (row.permissions && row.permissions.includes("MANAGE_PRIVACY")),
      },
      viewer_relationship: {
        is_parent: true,
        is_primary: row.is_primary || false,
        relationship_type: row.relationship,
        permissions: row.permissions || [],
      },
    });
  }

  return results;
}

/**
 * 8. Add Pet Media (Photo / Video / Memory)
 */
export async function addPetMediaService(
  petId: string,
  userId: string,
  input: {
    mediaId?: string;
    media_id?: string;
    url?: string;
    mediaUrl?: string;
    media_url?: string;
    role?: "PROFILE" | "COVER" | "GALLERY" | "MEMORY";
    caption?: string;
    altText?: string;
    alt_text?: string;
    isPrimary?: boolean;
    is_primary?: boolean;
  }
): Promise<PetMediaItem> {
  const allowed = await hasPetPermission(userId, petId, "UPLOAD_MEDIA");
  if (!allowed) {
    const error: any = new Error("You do not have permission to upload media for this pet.");
    error.status = 403;
    throw error;
  }

  let mediaId = input.mediaId || (input as any).media_id;
  const rawUrl = input.url || (input as any).mediaUrl || (input as any).media_url;

  // Fallback: If mediaId is missing but URL is provided, find or create the media record
  if (!mediaId && rawUrl && typeof rawUrl === "string" && rawUrl.trim()) {
    try {
      const { data: existingMedia } = await supabase
        .from("media")
        .select("id")
        .eq("url", rawUrl.trim())
        .maybeSingle();

      if (existingMedia?.id) {
        mediaId = existingMedia.id;
      } else {
        const isVideo =
          rawUrl.toLowerCase().includes(".mp4") ||
          rawUrl.toLowerCase().includes(".mov") ||
          rawUrl.toLowerCase().includes(".webm");
        const { data: newMedia } = await supabase
          .from("media")
          .insert({
            user_id: userId,
            type: isVideo ? "video" : "image",
            url: rawUrl.trim(),
            mime_type: isVideo ? "video/mp4" : "image/webp",
          })
          .select("id")
          .single();
        if (newMedia?.id) mediaId = newMedia.id;
      }
    } catch (lookupErr) {
      console.warn("Failed to find/create media record for pet gallery:", lookupErr);
    }
  }

  if (!mediaId) {
    const error: any = new Error("media_id or media_url is required to add media to pet gallery.");
    error.status = 400;
    throw error;
  }

  const role = (input.role || "GALLERY").toUpperCase() as "PROFILE" | "COVER" | "GALLERY" | "MEMORY";
  const caption = (input.caption || (input as any).caption)?.trim() || null;
  const altText = (input.altText || (input as any).alt_text)?.trim() || null;
  const isPrimary = Boolean(input.isPrimary ?? (input as any).is_primary);

  const { data: mediaRecord, error } = await supabase
    .from("pet_media")
    .insert({
      pet_id: petId,
      media_id: mediaId,
      role: role,
      visibility: "INHERIT",
      caption: caption,
      alt_text: altText,
      is_primary: isPrimary,
      created_by: userId,
    })
    .select(`
      id,
      pet_id,
      media_id,
      role,
      visibility,
      caption,
      alt_text,
      sort_order,
      is_primary,
      created_by,
      created_at,
      media:media_id(id, url, type, thumbnail_url)
    `)
    .single();

  if (error || !mediaRecord) {
    console.error("addPetMediaService error:", error);
    throw error || new Error("Failed to link media to pet.");
  }

  // If role is PROFILE, update pets.profile_media_id
  if (role === "PROFILE") {
    await supabase.from("pets").update({ profile_media_id: mediaId }).eq("id", petId);
  } else if (role === "COVER") {
    await supabase.from("pets").update({ cover_media_id: mediaId }).eq("id", petId);
  }

  const mediaObj = (mediaRecord as any).media;
  const mediaUrl = mediaObj?.url || rawUrl || null;
  const isVideo =
    mediaObj?.type === "video" ||
    mediaUrl?.toLowerCase().endsWith(".mp4") ||
    mediaUrl?.toLowerCase().endsWith(".mov");
  const mediaType = isVideo ? "VIDEO" : "IMAGE";

  return {
    id: mediaRecord.id,
    pet_id: mediaRecord.pet_id,
    media_id: mediaRecord.media_id,
    role: mediaRecord.role,
    visibility: mediaRecord.visibility,
    caption: mediaRecord.caption,
    alt_text: mediaRecord.alt_text,
    sort_order: mediaRecord.sort_order,
    is_primary: mediaRecord.is_primary,
    created_by: mediaRecord.created_by,
    created_at: mediaRecord.created_at,
    url: mediaUrl,
    media_url: mediaUrl,
    type: mediaObj?.type || (isVideo ? "video" : "image"),
    media_type: mediaType,
    thumbnail_url: mediaObj?.thumbnail_url || null,
    is_profile: mediaRecord.role === "PROFILE" || mediaRecord.is_primary,
    is_cover: mediaRecord.role === "COVER",
  };
}

/**
 * 9. Delete Pet Media
 */
export async function deletePetMediaService(
  petId: string,
  mediaId: string,
  userId: string
): Promise<void> {
  const allowed = await hasPetPermission(userId, petId, "UPLOAD_MEDIA");
  if (!allowed) {
    const error: any = new Error("You do not have permission to delete media for this pet.");
    error.status = 403;
    throw error;
  }

  // Check if this media was set as current profile or cover photo
  const { data: pet } = await supabase
    .from("pets")
    .select("profile_media_id, cover_media_id")
    .eq("id", petId)
    .single();

  if (pet?.profile_media_id === mediaId) {
    await supabase.from("pets").update({ profile_media_id: null }).eq("id", petId);
  }
  if (pet?.cover_media_id === mediaId) {
    await supabase.from("pets").update({ cover_media_id: null }).eq("id", petId);
  }

  const { error } = await supabase
    .from("pet_media")
    .delete()
    .eq("pet_id", petId)
    .or(`media_id.eq.${mediaId},id.eq.${mediaId}`);

  if (error) throw error;
}

/**
 * 10. Invite a Co-Parent / Caregiver (Human-to-Human Authorization)
 */
export async function invitePetParentService(
  petId: string,
  invitingUserId: string,
  inviteeIdentifier: string, // username or user_id
  relationship: PetRelationship,
  permissions?: PetPermission[]
): Promise<any> {
  const canManage = await hasPetPermission(invitingUserId, petId, "MANAGE_PARENTS");
  if (!canManage) {
    const error: any = new Error("You do not have permission to manage parents for this pet.");
    error.status = 403;
    throw error;
  }

  // Find target user
  let targetUser: any = null;
  const { data: byId } = await supabase
    .from("profiles")
    .select("id, username, full_name")
    .eq("id", inviteeIdentifier)
    .maybeSingle();

  if (byId) {
    targetUser = byId;
  } else {
    const { data: byUsername } = await supabase
      .from("profiles")
      .select("id, username, full_name")
      .eq("username", inviteeIdentifier.replace(/^@/, "").trim())
      .maybeSingle();
    targetUser = byUsername;
  }

  if (!targetUser) {
    const error: any = new Error(`User "${inviteeIdentifier}" not found.`);
    error.status = 404;
    throw error;
  }

  if (targetUser.id === invitingUserId) {
    const error: any = new Error("You are already an owner of this pet.");
    error.status = 400;
    throw error;
  }

  // Check if relationship already exists
  const { data: existing } = await supabase
    .from("pet_parents")
    .select("id, status")
    .eq("pet_id", petId)
    .eq("user_id", targetUser.id)
    .maybeSingle();

  if (existing) {
    if (existing.status === "ACTIVE") {
      const error: any = new Error("This user is already an active parent of this pet.");
      error.status = 400;
      throw error;
    }
    if (existing.status === "PENDING_INVITE") {
      const error: any = new Error("An invitation is already pending for this user.");
      error.status = 400;
      throw error;
    }
  }

  const defaultPermissions: PetPermission[] =
    permissions && permissions.length > 0
      ? permissions
      : ["VIEW_PROFILE", "EDIT_PROFILE", "UPLOAD_MEDIA", "CREATE_PET_POST"];

  const { data: newParent, error: insertError } = await supabase
    .from("pet_parents")
    .upsert({
      pet_id: petId,
      user_id: targetUser.id,
      relationship: relationship,
      is_primary: false,
      status: "PENDING_INVITE",
      permissions: defaultPermissions,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (insertError) throw insertError;

  // Fetch pet name for notification
  const { data: pet } = await supabase.from("pets").select("name").eq("id", petId).single();

  // Send human-centric notification
  try {
    await createNotification({
      recipientId: targetUser.id,
      actorId: invitingUserId,
      type: "mention", // Using existing notification types
      message: `invited you to be a ${relationship.toLowerCase().replace("_", " ")} for pet "${pet?.name || "a pet"}".`,
    });
  } catch {}

  return newParent;
}

/**
 * 11. Get Current User's Pending Pet Invitations
 */
export async function getMyPendingPetInvitesService(userId: string): Promise<any[]> {
  const { data: invites, error } = await supabase
    .from("pet_parents")
    .select(`
      id,
      pet_id,
      relationship,
      permissions,
      status,
      created_at,
      pets:pet_id (
        id,
        name,
        species,
        species_name,
        breed,
        profile_media_id,
        status
      )
    `)
    .eq("user_id", userId)
    .eq("status", "PENDING_INVITE");

  if (error || !invites) return [];

  const enrichedInvites: any[] = [];
  for (const inv of invites) {
    const pet = Array.isArray(inv.pets) ? inv.pets[0] : inv.pets;
    if (!pet) continue;

    // Resolve avatar
    let avatarUrl: string | null = null;
    if (pet.profile_media_id) {
      const { data: m } = await supabase
        .from("media")
        .select("url")
        .eq("id", pet.profile_media_id)
        .maybeSingle();
      if (m?.url) avatarUrl = m.url;
    }
    if (!avatarUrl) {
      const { data: pm } = await supabase
        .from("pet_media")
        .select("media:media_id(url)")
        .eq("pet_id", pet.id)
        .limit(1)
        .maybeSingle();
      if ((pm as any)?.media?.url) avatarUrl = (pm as any).media.url;
    }

    // Get primary owner / inviter
    const { data: primaryOwnerRow } = await supabase
      .from("pet_parents")
      .select("user_id, profiles:user_id(id, username, full_name, avatar_url)")
      .eq("pet_id", pet.id)
      .eq("is_primary", true)
      .maybeSingle();

    const inviter = (primaryOwnerRow as any)?.profiles || null;

    enrichedInvites.push({
      id: inv.id,
      pet_id: inv.pet_id,
      relationship: inv.relationship,
      permissions: inv.permissions,
      status: inv.status,
      created_at: inv.created_at,
      pet: {
        ...pet,
        avatar_url: avatarUrl,
        profile_photo_url: avatarUrl,
      },
      inviter: inviter,
    });
  }

  return enrichedInvites;
}

/**
 * 12. Respond to Pet Parent Invitation (Accept / Decline)
 */
export async function respondPetParentInviteService(
  petIdOrInviteId: string,
  userId: string,
  accept: boolean
): Promise<any> {
  // Can look up either by pet_id + user_id or by id (invite_id) + user_id
  let query = supabase
    .from("pet_parents")
    .select("*, pets:pet_id(name)")
    .eq("user_id", userId)
    .eq("status", "PENDING_INVITE");

  if (petIdOrInviteId) {
    query = query.or(`id.eq.${petIdOrInviteId},pet_id.eq.${petIdOrInviteId}`);
  }

  const { data: invite, error } = await query.maybeSingle();

  if (error || !invite) {
    const err: any = new Error("Pending invitation not found.");
    err.status = 404;
    throw err;
  }

  const newStatus = accept ? "ACTIVE" : "DECLINED";

  const { data: updated, error: updateError } = await supabase
    .from("pet_parents")
    .update({ status: newStatus, updated_at: new Date().toISOString() })
    .eq("id", invite.id)
    .select()
    .single();

  if (updateError) throw updateError;

  // Notify primary owner of the response
  try {
    const { data: primaryOwner } = await supabase
      .from("pet_parents")
      .select("user_id")
      .eq("pet_id", invite.pet_id)
      .eq("is_primary", true)
      .maybeSingle();

    const { data: responderProfile } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .maybeSingle();

    const petName = (invite as any)?.pets?.name || "your pet";

    if (primaryOwner?.user_id && responderProfile?.username) {
      const verb = accept ? "accepted" : "declined";
      await supabase.from("notifications").insert({
        user_id: primaryOwner.user_id,
        actor_id: userId,
        type: "PET_INVITE_RESPONSE",
        message: `@${responderProfile.username} ${verb} your invitation to be a ${(invite.relationship || "co_owner").toLowerCase().replace("_", " ")} for "${petName}".`,
        read: false,
      });
    }
  } catch (notifErr) {
    console.warn("Failed to dispatch pet invite response notification:", notifErr);
  }

  return updated;
}

/**
 * 12. Remove a Pet Parent (Requires MANAGE_PARENTS or self-removal)
 */
export async function removePetParentService(
  petId: string,
  targetParentUserId: string,
  callerId: string
): Promise<void> {
  const targetParent = await getPetParentRelationship(targetParentUserId, petId);
  if (!targetParent) {
    const error: any = new Error("Pet parent record not found.");
    error.status = 404;
    throw error;
  }

  if (targetParent.is_primary) {
    const error: any = new Error("The primary owner cannot be removed.");
    error.status = 400;
    throw error;
  }

  // Caller can remove themselves, or must have MANAGE_PARENTS permission
  const isSelf = callerId === targetParentUserId;
  const canManage = await hasPetPermission(callerId, petId, "MANAGE_PARENTS");

  if (!isSelf && !canManage) {
    const error: any = new Error("You do not have permission to remove this pet parent.");
    error.status = 403;
    throw error;
  }

  const { error } = await supabase
    .from("pet_parents")
    .delete()
    .eq("pet_id", petId)
    .eq("user_id", targetParentUserId);

  if (error) throw error;
}

/**
 * 13. Get Posts associated with a Pet (Respects Pet Visibility)
 */
export async function getPetPostsService(
  petId: string,
  requesterId: string | null,
  page: number = 1,
  limit: number = 10
): Promise<{ posts: any[]; count: number }> {
  // 1. Evaluate Pet visibility first
  const { data: pet } = await supabase.from("pets").select("id, profile_visibility").eq("id", petId).single();
  if (!pet) {
    const err: any = new Error("Pet not found.");
    err.status = 404;
    throw err;
  }

  const { allowed } = await evaluatePetVisibility(requesterId, pet);
  if (!allowed) {
    const err: any = new Error("Pet not found.");
    err.status = 404;
    throw err;
  }

  const offset = (page - 1) * limit;

  const { data: posts, error, count } = await supabase
    .from("posts")
    .select(`
      *,
      user:user_id(id, username, full_name, avatar_url),
      post_media(id, media_id, sort_order, media(id, url, type)),
      pet:pet_id(id, name, species, profile_media_id)
    `, { count: "exact" })
    .eq("pet_id", petId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  return {
    posts: posts || [],
    count: count || 0,
  };
}

/**
 * Search pets eligible for tagging by the current user:
 * - Current user's own/co-owned pets always prioritized
 * - If query provided, searches pets matching query
 * - Enforces evaluatePetVisibility so private pets of others are NEVER returned
 * - Prevents archived/deleted pets from appearing
 */
export async function searchTaggablePetsService(
  userId: string,
  query: string = ""
): Promise<any[]> {
  const cleanQuery = (query || "").trim();

  // 1. Get user's own pets first
  const myPets = await getMyPetsService(userId);
  const myPetIds = new Set(myPets.map(p => p.id));

  const taggablePets: any[] = myPets
    .filter(p => !cleanQuery || p.name.toLowerCase().includes(cleanQuery.toLowerCase()))
    .map(p => ({
      id: p.id,
      name: p.name,
      species: p.species,
      breed: p.breed,
      avatar_url: p.profile_photo_url || p.profile_media_id,
      profile_visibility: p.profile_visibility,
      is_own_pet: true
    }));

  // 2. If query provided, search other pets
  if (cleanQuery.length > 0) {
    const { data: matchedPets, error } = await supabase
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
      .ilike("name", `%${cleanQuery}%`)
      .eq("status", "ACTIVE")
      .limit(20);

    if (!error && Array.isArray(matchedPets)) {
      for (const pet of matchedPets) {
        if (myPetIds.has(pet.id)) continue;

        const vis = await evaluatePetVisibility(userId, {
          id: pet.id,
          profile_visibility: (pet.profile_visibility as any) || "PUBLIC"
        });

        if (vis.allowed) {
          taggablePets.push({
            id: pet.id,
            name: pet.name,
            species: pet.species,
            breed: pet.breed,
            avatar_url: (pet.profile_media as any)?.url || null,
            profile_visibility: pet.profile_visibility || "PUBLIC",
            is_own_pet: false
          });
        }
      }
    }
  }

  return taggablePets;
}

