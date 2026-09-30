import { supabase } from "../config/supabase";

export type BusinessRole = "OWNER" | "ADMIN" | "EDITOR" | "MARKETING" | "SUPPORT" | "ANALYST" | "MEMBER";

export type BusinessPermission =
  | "business.profile.edit"
  | "business.media.manage"
  | "business.post.create"
  | "business.post.edit"
  | "business.post.delete"
  | "business.comment.create"
  | "business.like"
  | "business.bookmark"
  | "business.products.manage"
  | "business.members.manage"
  | "business.verification.manage";

const ROLE_PERMISSIONS: Record<string, BusinessPermission[]> = {
  OWNER: [
    "business.profile.edit",
    "business.media.manage",
    "business.post.create",
    "business.post.edit",
    "business.post.delete",
    "business.comment.create",
    "business.like",
    "business.bookmark",
    "business.products.manage",
    "business.members.manage",
    "business.verification.manage",
  ],
  ADMIN: [
    "business.profile.edit",
    "business.media.manage",
    "business.post.create",
    "business.post.edit",
    "business.post.delete",
    "business.comment.create",
    "business.like",
    "business.bookmark",
    "business.products.manage",
    "business.verification.manage",
  ],
  EDITOR: [
    "business.post.create",
    "business.post.edit",
    "business.post.delete",
    "business.comment.create",
    "business.like",
    "business.bookmark",
    "business.media.manage",
  ],
  MARKETING: [
    "business.post.create",
    "business.comment.create",
    "business.like",
    "business.bookmark",
    "business.products.manage",
  ],
  MEMBER: [
    "business.post.create",
    "business.comment.create",
    "business.like",
    "business.bookmark",
  ],
  SUPPORT: [
    "business.comment.create",
    "business.like",
  ],
  ANALYST: [
    "business.like",
    "business.bookmark",
  ],
};

export interface BusinessMemberContext {
  business: any;
  role: BusinessRole;
  isOwner: boolean;
  canManageVerification: boolean;
}

/**
 * Get membership and authorization context of a user for a given business
 */
export async function getBusinessMemberContext(
  userId: string,
  businessId: string
): Promise<BusinessMemberContext | null> {
  if (!userId || !businessId) return null;

  const { data: biz, error: bizErr } = await supabase
    .from("business_identities")
    .select("*")
    .eq("id", businessId)
    .maybeSingle();

  if (bizErr || !biz) return null;

  if (biz.owner_id === userId) {
    return {
      business: biz,
      role: "OWNER",
      isOwner: true,
      canManageVerification: true,
    };
  }

  const { data: mem, error: memErr } = await supabase
    .from("business_memberships")
    .select("role, can_manage_verification")
    .eq("business_id", businessId)
    .eq("user_id", userId)
    .maybeSingle();

  if (memErr || !mem) return null;

  const role = (mem.role || "MEMBER").toUpperCase() as BusinessRole;

  return {
    business: biz,
    role,
    isOwner: role === "OWNER",
    canManageVerification: !!mem.can_manage_verification || role === "OWNER",
  };
}

/**
 * Check whether a user has a specific business permission
 */
export async function hasBusinessPermission(
  userId: string,
  businessId: string,
  permission: BusinessPermission
): Promise<boolean> {
  const ctx = await getBusinessMemberContext(userId, businessId);
  if (!ctx) return false;
  if (ctx.isOwner || ctx.role === "OWNER") return true;

  const permissions = ROLE_PERMISSIONS[ctx.role] || [];
  return permissions.includes(permission);
}

/**
 * Check whether a user can act as a business for general participation
 */
export async function canActAsBusiness(
  userId: string,
  businessId: string
): Promise<boolean> {
  const ctx = await getBusinessMemberContext(userId, businessId);
  return ctx !== null;
}

export interface ActingIdentityResult {
  type: "USER" | "BUSINESS";
  id: string;
  userId: string;
  businessId?: string;
  business?: any;
}

/**
 * Extract and validate requested acting identity from request body and headers.
 * Throws 403 error if user attempts to act as a business they do not have rights for.
 */
export async function resolveActingIdentity(
  reqUser: any,
  payload: any,
  headers?: any,
  requiredPermission?: BusinessPermission
): Promise<ActingIdentityResult> {
  const userId = reqUser?.id;
  if (!userId) {
    const err: any = new Error("Authentication required.");
    err.status = 401;
    throw err;
  }

  const headerType = headers?.["x-acting-identity-type"] || headers?.["x-acting-type"];
  const headerId = headers?.["x-acting-identity-id"] || headers?.["x-acting-id"];

  const reqType = (
    payload?.author_type ||
    payload?.actor_type ||
    payload?.acting_type ||
    payload?.acting_as?.type ||
    payload?.actingIdentity?.type ||
    headerType ||
    "USER"
  ).toUpperCase();

  const businessId =
    payload?.business_id ||
    payload?.businessId ||
    payload?.acting_as?.id ||
    payload?.actingIdentity?.id ||
    headerId;

  if (reqType === "BUSINESS" && businessId) {
    const isAllowed = requiredPermission
      ? await hasBusinessPermission(userId, businessId, requiredPermission)
      : await canActAsBusiness(userId, businessId);

    if (!isAllowed) {
      const err: any = new Error("You are not authorized to act as this business.");
      err.status = 403;
      throw err;
    }

    const ctx = await getBusinessMemberContext(userId, businessId);
    return {
      type: "BUSINESS",
      id: businessId,
      userId,
      businessId,
      business: ctx?.business,
    };
  }

  return {
    type: "USER",
    id: userId,
    userId,
  };
}
