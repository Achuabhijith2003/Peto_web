import fs from "fs/promises";
import sharp from "sharp";
import { supabase } from "../config/supabase";
import { uploadAvatarToStorage, uploadCoverToStorage } from "../media/storage.service";
import { hasBusinessPermission, getBusinessMemberContext } from "./business.rbac";
import { mapPostForFeed } from "../posts/feed.mapper";
import { getMentionsAndTagsForPosts } from "../posts/mention_tag.service";

export class BusinessService {
  /**
   * Helper to safely map business object with all attributes
   */
  private static mapBusinessData(biz: any, verificationApp?: any, membership?: any) {
    const isVerified = verificationApp?.status === "APPROVED";
    const verificationType = isVerified ? "BUSINESS_VERIFIED" : null;

    return {
      id: biz.id,
      owner_id: biz.owner_id,
      name: biz.name,
      legal_name: biz.legal_name,
      username: biz.username || biz.name?.toLowerCase().replace(/\s+/g, "_") || "",
      country_code: biz.country_code || "IN",
      state: biz.state || "",
      city: biz.city || "",
      website_url: biz.website_url || "",
      public_email: biz.public_email || "",
      public_phone: biz.public_phone || "",
      business_type: biz.business_type || "",
      business_category: biz.business_category || "",
      description: biz.description || "",
      avatar_url: biz.avatar_url || null,
      cover_url: biz.cover_url || null,
      profile_media_id: biz.profile_media_id || null,
      cover_media_id: biz.cover_media_id || null,
      role: membership?.role || null,
      can_manage_verification: !!membership?.can_manage_verification,
      identityType: "BUSINESS" as const,
      verification: {
        verified: isVerified,
        type: verificationType,
        status: verificationApp?.status || "NOT_STARTED",
        verified_at: verificationApp?.verified_at || null,
        reverification_reason: verificationApp?.reverification_reason || null,
      },
      is_verified: isVerified,
      created_at: biz.created_at,
      updated_at: biz.updated_at,
    };
  }

  /**
   * Retrieve all businesses managed by the authenticated user
   */
  static async getMyBusinesses(userId: string) {
    const { data: memberships, error: membershipError } = await supabase
      .from("business_memberships")
      .select("business_id, role, can_manage_verification")
      .eq("user_id", userId);

    if (membershipError) throw membershipError;

    const ids = (memberships || []).map((m: any) => m.business_id);
    if (!ids.length) return [];

    const { data: businessesData, error: bizError } = await supabase
      .from("business_identities")
      .select("*")
      .in("id", ids);

    if (bizError) throw bizError;

    const { data: applications, error: appError } = await supabase
      .from("verification_applications")
      .select("id, business_id, status, verified_name, verified_at, rejection_reason, reverification_reason, created_at")
      .eq("verification_type", "BUSINESS_IDENTITY")
      .in("business_id", ids)
      .order("created_at", { ascending: false });

    if (appError) throw appError;

    return (businessesData || []).map((biz: any) => {
      const mem = (memberships || []).find((m: any) => m.business_id === biz.id);
      const app = (applications || []).find((a: any) => a.business_id === biz.id);
      return this.mapBusinessData(biz, app, mem);
    });
  }

  /**
   * Retrieve a single public business profile with authoritative verification status
   */
  static async getBusinessById(businessId: string, currentUserId?: string) {
    const { data: business, error } = await supabase
      .from("business_identities")
      .select("*")
      .eq("id", businessId)
      .maybeSingle();

    if (error || !business) {
      const err: any = new Error("Business identity not found.");
      err.status = 404;
      throw err;
    }

    // Authoritative verification query
    const { data: verification } = await supabase
      .from("verification_applications")
      .select("id, status, verified_name, verified_at, reverification_reason")
      .eq("business_id", businessId)
      .eq("verification_type", "BUSINESS_IDENTITY")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Check membership / permissions of current user if logged in
    const memberCtx = currentUserId
      ? await getBusinessMemberContext(currentUserId, businessId)
      : null;

    const mapped = this.mapBusinessData(business, verification, memberCtx ? { role: memberCtx.role, can_manage_verification: memberCtx.canManageVerification } : null);

    return {
      ...mapped,
      isOwner: !!memberCtx?.isOwner,
      canManage: !!memberCtx?.canManageVerification || !!memberCtx?.isOwner,
      canPost: memberCtx ? await hasBusinessPermission(currentUserId!, businessId, "business.post.create") : false,
      canEditProfile: memberCtx ? await hasBusinessPermission(currentUserId!, businessId, "business.profile.edit") : false,
    };
  }

  /**
   * Update public business profile information
   * Handles reverification warning and triggers reverification if critical fields change on a verified business.
   */
  static async updateBusinessProfile(businessId: string, userId: string, updates: any) {
    const canEdit = await hasBusinessPermission(userId, businessId, "business.profile.edit");
    if (!canEdit) {
      const err: any = new Error("You are not authorized to update this business profile.");
      err.status = 403;
      throw err;
    }

    const { data: currentBiz, error: fetchErr } = await supabase
      .from("business_identities")
      .select("*")
      .eq("id", businessId)
      .single();

    if (fetchErr || !currentBiz) {
      const err: any = new Error("Business not found.");
      err.status = 404;
      throw err;
    }

    // Check current verification status
    const { data: verification } = await supabase
      .from("verification_applications")
      .select("id, status")
      .eq("business_id", businessId)
      .eq("verification_type", "BUSINESS_IDENTITY")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const isCurrentlyVerified = verification?.status === "APPROVED";

    // Detect critical field modifications
    let reverificationTriggered = false;
    const isChangingName = updates.name !== undefined && updates.name.trim() !== currentBiz.name;
    const isChangingLegalName = updates.legal_name !== undefined && updates.legal_name.trim() !== currentBiz.legal_name;

    if (isCurrentlyVerified && (isChangingName || isChangingLegalName)) {
      reverificationTriggered = true;
    }

    // Build update payload
    const payload: any = {
      updated_at: new Date().toISOString(),
    };

    if (typeof updates.name === "string" && updates.name.trim()) payload.name = updates.name.trim();
    if (typeof updates.legal_name === "string" && updates.legal_name.trim()) payload.legal_name = updates.legal_name.trim();
    if (typeof updates.username === "string") payload.username = updates.username.trim().toLowerCase();
    if (typeof updates.description === "string") payload.description = updates.description.trim();
    if (typeof updates.website_url === "string") payload.website_url = updates.website_url.trim();
    if (typeof updates.business_category === "string") payload.business_category = updates.business_category.trim();
    if (typeof updates.business_type === "string") payload.business_type = updates.business_type.trim();
    if (typeof updates.public_email === "string") payload.public_email = updates.public_email.trim();
    if (typeof updates.public_phone === "string") payload.public_phone = updates.public_phone.trim();
    if (typeof updates.state === "string") payload.state = updates.state.trim();
    if (typeof updates.city === "string") payload.city = updates.city.trim();
    if (typeof updates.country_code === "string") payload.country_code = updates.country_code.trim().toUpperCase();
    if (typeof updates.avatar_url === "string") payload.avatar_url = updates.avatar_url;
    if (typeof updates.cover_url === "string") payload.cover_url = updates.cover_url;

    // Execute update with graceful fallback for columns not yet migrated
    try {
      const { error: updateErr } = await supabase
        .from("business_identities")
        .update(payload)
        .eq("id", businessId);

      if (updateErr) {
        if (updateErr.code === "42703") {
          // Column not in schema yet: fallback to core fields
          const fallbackPayload: any = {
            updated_at: payload.updated_at,
          };
          if (payload.name) fallbackPayload.name = payload.name;
          if (payload.legal_name) fallbackPayload.legal_name = payload.legal_name;
          if (payload.description !== undefined) fallbackPayload.description = payload.description;
          if (payload.website_url !== undefined) fallbackPayload.website_url = payload.website_url;
          if (payload.business_category !== undefined) fallbackPayload.business_category = payload.business_category;
          if (payload.business_type !== undefined) fallbackPayload.business_type = payload.business_type;

          const { error: fallbackErr } = await supabase
            .from("business_identities")
            .update(fallbackPayload)
            .eq("id", businessId);

          if (fallbackErr) throw fallbackErr;
        } else {
          throw updateErr;
        }
      }
    } catch (err) {
      throw err;
    }

    // Invalidate verification if critical fields changed
    if (reverificationTriggered && verification?.id) {
      await supabase
        .from("verification_applications")
        .update({
          status: "REVERIFICATION_REQUIRED",
          reverification_reason: "Verified Business name or legal identity changed. Please submit reverification.",
          updated_at: new Date().toISOString(),
        })
        .eq("id", verification.id);
    }

    const updatedProfile = await this.getBusinessById(businessId, userId);
    return {
      ...updatedProfile,
      reverification_triggered: reverificationTriggered,
      warning_message: reverificationTriggered
        ? "Business verification badge has been removed because the verified name was changed. Reverification is required."
        : null,
    };
  }

  /**
   * Upload and set Business Profile Avatar / Logo
   */
  static async uploadBusinessAvatar(businessId: string, userId: string, file: Express.Multer.File) {
    const canManage = await hasBusinessPermission(userId, businessId, "business.media.manage");
    if (!canManage) {
      const err: any = new Error("You are not authorized to upload images for this business.");
      err.status = 403;
      throw err;
    }

    let fileBuffer = file.buffer;
    if (!fileBuffer && file.path) {
      fileBuffer = await fs.readFile(file.path);
    }

    if (!fileBuffer) {
      const err: any = new Error("No image data provided.");
      err.status = 400;
      throw err;
    }

    try {
      // Compress and crop with Sharp (600x600 WebP)
      let processedBuffer: Buffer = fileBuffer;
      try {
        processedBuffer = await sharp(fileBuffer)
          .rotate()
          .resize({ width: 600, height: 600, fit: "cover" })
          .webp({ quality: 85 })
          .toBuffer();
      } catch (sharpErr) {
        console.warn("Sharp business avatar processing warning, using original buffer:", sharpErr);
      }

      const filename = `biz_${businessId}_avatar_${Date.now()}.webp`;
      const avatar_url = await uploadAvatarToStorage(processedBuffer, filename, "image/webp");

      // Create record in media table
      let mediaId: string | null = null;
      try {
        const { data: mediaRec } = await supabase
          .from("media")
          .insert({
            user_id: userId,
            type: "image",
            url: avatar_url,
            size: processedBuffer.length,
            mime_type: "image/webp",
          })
          .select("id")
          .single();
        mediaId = mediaRec?.id || null;
      } catch {
        // media record optional
      }

      // Update business identity record
      try {
        const updatePayload: any = { avatar_url };
        if (mediaId) updatePayload.profile_media_id = mediaId;

        const { error: bizErr } = await supabase
          .from("business_identities")
          .update(updatePayload)
          .eq("id", businessId);

        if (bizErr && bizErr.code === "42703") {
          // If avatar_url column not migrated yet, attempt without profile_media_id
          await supabase.from("business_identities").update({ updated_at: new Date().toISOString() }).eq("id", businessId);
        }
      } catch {
        // graceful
      }

      const business = await this.getBusinessById(businessId, userId);
      return {
        avatar_url,
        media_id: mediaId,
        business: { ...business, avatar_url },
      };
    } finally {
      if (file?.path) {
        try {
          await fs.unlink(file.path);
        } catch (_) {}
      }
    }
  }

  /**
   * Upload and set Business Cover Image
   */
  static async uploadBusinessCover(businessId: string, userId: string, file: Express.Multer.File) {
    const canManage = await hasBusinessPermission(userId, businessId, "business.media.manage");
    if (!canManage) {
      const err: any = new Error("You are not authorized to upload images for this business.");
      err.status = 403;
      throw err;
    }

    let fileBuffer = file.buffer;
    if (!fileBuffer && file.path) {
      fileBuffer = await fs.readFile(file.path);
    }

    if (!fileBuffer) {
      const err: any = new Error("No image data provided.");
      err.status = 400;
      throw err;
    }

    try {
      // Compress and resize with Sharp (1400x600 WebP)
      let processedBuffer: Buffer = fileBuffer;
      try {
        processedBuffer = await sharp(fileBuffer)
          .rotate()
          .resize({ width: 1400, height: 600, fit: "cover" })
          .webp({ quality: 85 })
          .toBuffer();
      } catch (sharpErr) {
        console.warn("Sharp business cover processing warning, using original buffer:", sharpErr);
      }

      const filename = `biz_${businessId}_cover_${Date.now()}.webp`;
      const cover_url = await uploadCoverToStorage(processedBuffer, filename, "image/webp");

      let mediaId: string | null = null;
      try {
        const { data: mediaRec } = await supabase
          .from("media")
          .insert({
            user_id: userId,
            type: "image",
            url: cover_url,
            size: processedBuffer.length,
            mime_type: "image/webp",
          })
          .select("id")
          .single();
        mediaId = mediaRec?.id || null;
      } catch {
        // media record optional
      }

      try {
        const updatePayload: any = { cover_url };
        if (mediaId) updatePayload.cover_media_id = mediaId;

        const { error: bizErr } = await supabase
          .from("business_identities")
          .update(updatePayload)
          .eq("id", businessId);

        if (bizErr && bizErr.code === "42703") {
          await supabase.from("business_identities").update({ updated_at: new Date().toISOString() }).eq("id", businessId);
        }
      } catch {
        // graceful
      }

      const business = await this.getBusinessById(businessId, userId);
      return {
        cover_url,
        media_id: mediaId,
        business: { ...business, cover_url },
      };
    } finally {
      if (file?.path) {
        try {
          await fs.unlink(file.path);
        } catch (_) {}
      }
    }
  }

  /**
   * Retrieve posts created as this Business
   */
  static async getBusinessPosts(
    businessId: string,
    currentUserId?: string,
    page: number = 1,
    limit: number = 10
  ) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // Check if business exists
    const { data: biz } = await supabase
      .from("business_identities")
      .select("id, name, username, avatar_url")
      .eq("id", businessId)
      .maybeSingle();

    if (!biz) {
      return {
        posts: [],
        pagination: { page, limit, total: 0, totalPages: 0, hasNextPage: false },
      };
    }

    let postsQuery = supabase
      .from("posts")
      .select(
        `
        *,
        profiles(
            id,
            username,
            full_name,
            avatar_url,
            verified
        ),
        media(*)
      `,
        { count: "exact" }
      )
      .eq("business_id", businessId)
      .eq("visibility", "public")
      .order("created_at", { ascending: false })
      .range(from, to);

    let { data: posts, count, error } = await postsQuery;

    // If business_id column not present in posts table yet, return empty list gracefully
    if (error && error.code === "42703") {
      return {
        posts: [],
        pagination: { page, limit, total: 0, totalPages: 0, hasNextPage: false },
      };
    }

    const postIds = (posts ?? []).map((p) => p.id);

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

      likedPosts = new Set((likes ?? []).map((x) => x.post_id));
      bookmarkedPosts = new Set((bookmarks ?? []).map((x) => x.post_id));
    }

    const { mentionsByPostId, tagsByPostId } = await getMentionsAndTagsForPosts(postIds);

    const feed = (posts ?? []).map((post) => {
      post.mentions = mentionsByPostId.get(post.id) || [];
      post.tagged_pets = tagsByPostId.get(post.id) || [];
      if (biz) {
        post.business = biz;
      }
      return mapPostForFeed(post, currentUserId, likedPosts, bookmarkedPosts);
    });

    return {
      posts: feed,
      pagination: {
        page,
        limit,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / limit),
        hasNextPage: to < (count ?? 0) - 1,
      },
    };
  }
}
