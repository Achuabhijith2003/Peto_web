import { supabase } from "../config/supabase";
import { PetParent, PetPermission, PetVisibility } from "./pet.types";

/**
 * Check if a user is an authorized pet parent and retrieve their permissions
 */
export async function getPetParentRelationship(
  userId: string,
  petId: string
): Promise<PetParent | null> {
  if (!userId || !petId) return null;

  try {
    const { data, error } = await supabase
      .from("pet_parents")
      .select("*")
      .eq("pet_id", petId)
      .eq("user_id", userId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (error || !data) return null;
    return data as PetParent;
  } catch {
    return null;
  }
}

/**
 * Validate that a user possesses a specific permission for a pet
 */
export async function hasPetPermission(
  userId: string,
  petId: string,
  permission: PetPermission
): Promise<boolean> {
  if (!userId || !petId) return false;

  const relationship = await getPetParentRelationship(userId, petId);
  if (!relationship) return false;

  // Primary owner has all permissions implicitly
  if (relationship.is_primary) return true;

  return relationship.permissions && relationship.permissions.includes(permission);
}

/**
 * Server-side visibility evaluator.
 * Determines if a requester (logged-in or anonymous) is permitted to see a pet.
 */
export async function evaluatePetVisibility(
  requesterId: string | null,
  pet: { id: string; profile_visibility: PetVisibility; parents?: any[] }
): Promise<{ allowed: boolean; isParent: boolean; relationship: PetParent | null }> {
  // 1. Check if requester is a pet parent
  let isParent = false;
  let relationship: PetParent | null = null;

  if (requesterId) {
    relationship = await getPetParentRelationship(requesterId, pet.id);
    if (relationship && relationship.status === "ACTIVE") {
      isParent = true;
      return { allowed: true, isParent: true, relationship };
    }
  }

  // 2. PUBLIC visibility: open to everyone
  if (pet.profile_visibility === "PUBLIC") {
    return { allowed: true, isParent: false, relationship: null };
  }

  // 3. PRIVATE visibility: strictly restricted to active pet parents
  if (pet.profile_visibility === "PRIVATE") {
    return { allowed: false, isParent: false, relationship: null };
  }

  // 4. CONNECTIONS visibility: requires follower/following connection with at least one pet parent
  if (pet.profile_visibility === "CONNECTIONS") {
    if (!requesterId) {
      return { allowed: false, isParent: false, relationship: null };
    }

    try {
      // Find all active parent user IDs for this pet
      const { data: parents } = await supabase
        .from("pet_parents")
        .select("user_id")
        .eq("pet_id", pet.id)
        .eq("status", "ACTIVE");

      if (!parents || parents.length === 0) {
        return { allowed: false, isParent: false, relationship: null };
      }

      const parentUserIds = parents.map((p) => p.user_id);

      // Check if requester follows any parent, or any parent follows requester
      const { count } = await supabase
        .from("follows")
        .select("id", { count: "exact", head: true })
        .or(
          `and(follower_id.eq.${requesterId},following_id.in.(${parentUserIds.join(",")})),and(follower_id.in.(${parentUserIds.join(",")}),following_id.eq.${requesterId})`
        );

      const isConnected = Boolean(count && count > 0);
      return { allowed: isConnected, isParent: false, relationship: null };
    } catch {
      return { allowed: false, isParent: false, relationship: null };
    }
  }

  return { allowed: false, isParent: false, relationship: null };
}

/**
 * Field-level privacy sanitizer. Strips private administration details for non-parents.
 */
export function sanitizePetForRequester(pet: any, isParent: boolean, requesterId?: string | null): any {
  const sanitized = { ...pet };

  if (Array.isArray(sanitized.parents)) {
    if (!isParent) {
      // Non-parents should only see ACTIVE parents, plus any PENDING invite specifically for the requester
      sanitized.parents = sanitized.parents
        .filter((p: any) => p.status === "ACTIVE" || (requesterId && p.user_id === requesterId))
        .map((p: any) => ({
          id: p.id,
          user_id: p.user_id,
          relationship: p.relationship,
          relationship_type: p.relationship_type || p.relationship,
          is_primary: Boolean(p.is_primary),
          status: p.status,
          username: p.username || p.user?.username,
          full_name: p.full_name || p.user?.full_name,
          avatar_url: p.avatar_url || p.user?.avatar_url,
          user: p.user,
        }));
    } else {
      sanitized.parents = sanitized.parents.map((p: any) => ({
        ...p,
        relationship_type: p.relationship_type || p.relationship,
        username: p.username || p.user?.username,
        full_name: p.full_name || p.user?.full_name,
        avatar_url: p.avatar_url || p.user?.avatar_url,
      }));
    }
  }

  return sanitized;
}
