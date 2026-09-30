import { supabase } from "../../config/supabase";
import { generateSignedDocumentUrl } from "../../media/secureStorage.service";
import { createAuditLog } from "./adminAudit.service";
import { createNotification } from "../../notifications/notification.service";
import { Request } from "express";

export interface VerificationFilterOptions {
  status?: string;
  country?: string;
  type?: string;
  search?: string;
  assignedAdminId?: string;
  page?: number;
  limit?: number;
}

export class AdminVerificationService {
  /**
   * Get verification dashboard counts and metrics
   */
  static async getOverview() {
    const { data, error } = await supabase
      .from("verification_applications")
      .select("status, verification_type");

    if (error) throw error;

    const counts = {
      total: (data || []).length,
      pending: 0,
      underReview: 0,
      approved: 0,
      rejected: 0,
      additionalInfoRequired: 0,
      reverificationRequired: 0,
      suspended: 0,
      revoked: 0,
      personCount: 0,
      businessCount: 0,
    };

    (data || []).forEach((row) => {
      const s = row.status;
      if (s === "SUBMITTED") counts.pending++;
      else if (s === "UNDER_REVIEW") counts.underReview++;
      else if (s === "APPROVED") counts.approved++;
      else if (s === "REJECTED") counts.rejected++;
      else if (s === "ADDITIONAL_INFORMATION_REQUIRED") counts.additionalInfoRequired++;
      else if (s === "REVERIFICATION_REQUIRED") counts.reverificationRequired++;
      else if (s === "SUSPENDED") counts.suspended++;
      else if (s === "REVOKED") counts.revoked++;

      if (row.verification_type === "INDIVIDUAL_IDENTITY") counts.personCount++;
      else counts.businessCount++;
    });

    return counts;
  }

  /**
   * Get paginated verification queue with filters
   */
  static async getQueue(options: VerificationFilterOptions = {}) {
    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(options.limit) || 15));
    const offset = (page - 1) * limit;

    let query = supabase
      .from("verification_applications")
      .select(
        `
        *,
        profiles:user_id (id, username, full_name, avatar_url),
        business_identities:business_id (id, name, legal_name, country_code),
        advertisers:advertiser_id (id, company_name, industry, status),
        assigned_admin:assigned_admin_id (id, username, full_name),
        verification_documents (id, document_type, status, document_number_masked, is_front)
      `,
        { count: "exact" }
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (options.status && options.status !== "ALL") {
      query = query.eq("status", options.status);
    }
    if (options.country && options.country !== "ALL") {
      query = query.eq("residential_country", options.country.toUpperCase());
    }
    if (options.type && options.type !== "ALL") {
      query = query.eq("verification_type", options.type);
    }
    if (options.assignedAdminId && options.assignedAdminId !== "ALL") {
      query = query.eq("assigned_admin_id", options.assignedAdminId);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    let items = data || [];
    if (options.search && options.search.trim()) {
      const q = options.search.trim().toLowerCase();
      items = items.filter((item: any) => {
        const uName = (item.profiles?.full_name || item.profiles?.username || "").toLowerCase();
        const bName = (item.business_identities?.name || item.business_identities?.legal_name || item.business_legal_name || "").toLowerCase();
        const id = (item.id || "").toLowerCase();
        return uName.includes(q) || bName.includes(q) || id.includes(q);
      });
    }

    return {
      items,
      total: count || items.length,
      page,
      limit,
      totalPages: Math.ceil((count || items.length) / limit),
    };
  }

  /**
   * Get single verification application details
   */
  static async getDetail(applicationId: string) {
    const { data: app, error } = await supabase
      .from("verification_applications")
      .select(
        `
        *,
        profiles:user_id (id, username, full_name, avatar_url),
        business_identities:business_id (id, name, legal_name, country_code),
        advertisers:advertiser_id (id, company_name, industry, status, balance, total_spend, currency),
        verification_documents (*),
        admin_reviewer:admin_reviewer_id (id, username, full_name),
        assigned_admin:assigned_admin_id (id, username, full_name)
      `
      )
      .eq("id", applicationId)
      .single();

    if (error || !app) {
      const err: any = new Error("Verification application not found.");
      err.status = 404;
      throw err;
    }

    // Fetch audit timeline
    const { data: auditEvents } = await supabase
      .from("verification_audit_events")
      .select("*")
      .eq("application_id", applicationId)
      .order("created_at", { ascending: false });

    return {
      ...app,
      audit_events: auditEvents || [],
    };
  }

  /**
   * Assign verification application to an admin reviewer
   */
  static async assignAdmin(applicationId: string, assignedAdminId: string | null, actorAdminId: string, req?: Request) {
    const now = new Date().toISOString();
    const updatePayload: any = {
      assigned_admin_id: assignedAdminId || null,
      updated_at: now,
    };
    if (assignedAdminId) {
      updatePayload.review_started_at = now;
      updatePayload.status = "UNDER_REVIEW";
    }

    const { data, error } = await supabase
      .from("verification_applications")
      .update(updatePayload)
      .eq("id", applicationId)
      .select()
      .single();

    if (error) throw error;

    await supabase.from("verification_audit_events").insert({
      application_id: applicationId,
      actor_id: actorAdminId,
      actor_role: "ADMIN",
      action: assignedAdminId ? "VERIFICATION_ASSIGNED" : "VERIFICATION_UNASSIGNED",
      reason: assignedAdminId ? `Assigned to reviewer ${assignedAdminId}` : "Unassigned from reviewer",
      metadata: { assignedAdminId },
    });

    if (req) {
      await createAuditLog(
        {
          action: assignedAdminId ? "VERIFICATION_ASSIGNED" : "VERIFICATION_UNASSIGNED",
          resourceType: "verification_application",
          resourceId: applicationId,
          details: { assignedAdminId },
        },
        req
      );
    }

    return data;
  }

  /**
   * Generate short-lived signed URL for a reviewer to inspect document
   */
  static async getSignedDocumentUrl(
    applicationId: string,
    documentId: string,
    adminUserId: string,
    req?: Request
  ) {
    const { data: doc, error } = await supabase
      .from("verification_documents")
      .select("id, application_id, storage_path, document_type, original_file_name")
      .eq("id", documentId)
      .eq("application_id", applicationId)
      .single();

    if (error || !doc) {
      const err: any = new Error("Document not found.");
      err.status = 404;
      throw err;
    }

    const signedUrl = await generateSignedDocumentUrl(doc.storage_path, 300); // 5 min TTL

    // Audit document view (Zero-tolerance compliance requirement)
    await supabase.from("verification_audit_events").insert({
      application_id: applicationId,
      actor_id: adminUserId,
      actor_role: "ADMIN",
      action: "DOCUMENT_VIEWED",
      reason: `Admin inspected ${doc.document_type} (${doc.original_file_name})`,
      metadata: { documentId: doc.id, documentType: doc.document_type },
    });

    if (req) {
      await createAuditLog(
        {
          action: "VERIFICATION_DOCUMENT_INSPECTED",
          resourceType: "verification_document",
          resourceId: doc.id,
          details: { applicationId, documentType: doc.document_type },
        },
        req
      );
    }

    return {
      signed_url: signedUrl,
      expires_in_seconds: 300,
      document_type: doc.document_type,
    };
  }

  /**
   * Process verification decision (APPROVE, REJECT, REQUEST_INFORMATION, REQUIRE_REVERIFICATION, SUSPEND, REVOKE)
   */
  static async processDecision(
    applicationId: string,
    adminUserId: string,
    action: "APPROVE" | "REJECT" | "REQUEST_INFORMATION" | "REQUIRE_REVERIFICATION" | "SUSPEND" | "REVOKE",
    notes?: string,
    rejectionReason?: string,
    userFacingReason?: string,
    adminInternalNotes?: string,
    req?: Request
  ) {
    const app = await this.getDetail(applicationId);
    const previousStatus = app.status;
    let newStatus: string;

    if (action === "APPROVE") newStatus = "APPROVED";
    else if (action === "REJECT") newStatus = "REJECTED";
    else if (action === "REQUEST_INFORMATION") newStatus = "ADDITIONAL_INFORMATION_REQUIRED";
    else if (action === "REQUIRE_REVERIFICATION") newStatus = "REVERIFICATION_REQUIRED";
    else if (action === "SUSPEND") newStatus = "SUSPENDED";
    else if (action === "REVOKE") newStatus = "REVOKED";
    else throw new Error("Invalid verification action");

    const now = new Date().toISOString();
    const safeUserReason = userFacingReason || rejectionReason || notes || undefined;
    const internalNotes = adminInternalNotes || notes || undefined;

    const updatePayload: any = {
      status: newStatus,
      decision: action,
      decision_reason: safeUserReason,
      user_facing_reason: safeUserReason,
      admin_internal_notes: internalNotes,
      admin_reviewer_id: adminUserId,
      reviewed_at: now,
      review_completed_at: now,
      updated_at: now,
    };

    if (safeUserReason) {
      updatePayload.rejection_reason = safeUserReason;
      updatePayload.additional_info_notes = safeUserReason;
    }

    const isBusiness = app.verification_type === "BUSINESS_IDENTITY" || app.verification_type === "BUSINESS_PARTNER";

    if (newStatus === "APPROVED") {
      updatePayload.verified_at = now;
      updatePayload.verification_version = (app.verification_version || 0) + 1;
      if (isBusiness) {
        updatePayload.verified_name = app.business_identities?.legal_name || app.business_legal_name || app.business_identities?.name || "Verified Business";
      } else {
        const pName = `${app.legal_first_name || ""} ${app.legal_last_name || ""}`.trim() || app.profiles?.full_name || app.profiles?.username || "Verified Person";
        updatePayload.verified_name = pName;
      }
    } else if (newStatus === "REVERIFICATION_REQUIRED") {
      updatePayload.reverification_reason = safeUserReason || "Verification-critical information required review";
    }

    // Update application record
    const { data: updatedApp, error: appError } = await supabase
      .from("verification_applications")
      .update(updatePayload)
      .eq("id", applicationId)
      .select()
      .single();

    if (appError) throw appError;

    // Synchronize advertiser record
    if (app.advertiser_id) {
      const advUpdate: any = {
        verification_status: newStatus,
        updated_at: now,
      };
      if (newStatus === "APPROVED") {
        advUpdate.verified_at = now;
      }
      await supabase.from("advertisers").update(advUpdate).eq("id", app.advertiser_id);
    }

    // Authority Badge Management:
    // If PERSON: directly manage profile badge state
    // If BUSINESS: badge belongs to the BUSINESS identity record, NOT the human user account!
    if (!isBusiness) {
      if (newStatus === "APPROVED") {
        await supabase
          .from("profiles")
          .update({ verification_badge_type: "PERSON", is_verified: true, verified: true })
          .eq("id", app.user_id);
      } else if (["REVERIFICATION_REQUIRED", "SUSPENDED", "REVOKED", "REJECTED"].includes(newStatus)) {
        await supabase
          .from("profiles")
          .update({ verification_badge_type: "NONE", is_verified: false, verified: false })
          .eq("id", app.user_id);
      }
    }

    // If suspended or revoked, pause active campaigns if advertiser is attached
    if (["SUSPENDED", "REVOKED"].includes(newStatus) && app.advertiser_id) {
      await supabase
        .from("ad_campaigns")
        .update({ status: "PAUSED", updated_at: now })
        .eq("advertiser_id", app.advertiser_id)
        .eq("status", "ACTIVE");
    }

    // Write verification audit event
    await supabase.from("verification_audit_events").insert({
      application_id: applicationId,
      actor_id: adminUserId,
      actor_role: "ADMIN",
      action: `VERIFICATION_${action}`,
      previous_status: previousStatus,
      new_status: newStatus,
      reason: safeUserReason || internalNotes || `Admin executed ${action}`,
      metadata: { action, adminUserId, isBusiness, internalNotes },
    });

    // Write general admin audit log
    if (req) {
      await createAuditLog(
        {
          action: `VERIFICATION_${action}`,
          resourceType: "verification_application",
          resourceId: applicationId,
          details: {
            applicantId: app.user_id,
            businessId: app.business_id,
            previousStatus,
            newStatus,
            safeUserReason,
          },
        },
        req
      );
    }

    // User Notification
    let notificationMessage = "";
    if (action === "APPROVE") {
      notificationMessage = isBusiness
        ? "Congratulations! Your business identity verification has been approved. The yellow business badge is now active."
        : "Congratulations! Your identity verification has been approved. The blue verification badge is now active.";
    } else if (action === "REJECT") {
      notificationMessage = `Your verification request could not be approved. Reason: ${safeUserReason || "Verification criteria not met"}.`;
    } else if (action === "REQUEST_INFORMATION") {
      notificationMessage = `Action required: Please provide additional information or documentation for your verification. Details: ${safeUserReason || "Please check verification guidelines"}.`;
    } else if (action === "REQUIRE_REVERIFICATION") {
      notificationMessage = "Your verification requires review because verified identity information changed. Please submit reverification.";
    } else if (action === "SUSPEND") {
      notificationMessage = "Your verification privileges have been temporarily suspended pending compliance review.";
    } else if (action === "REVOKE") {
      notificationMessage = "Your verification has been revoked due to platform compliance requirements.";
    }

    if (notificationMessage) {
      await createNotification({
        recipientId: app.user_id,
        type: "system",
        message: notificationMessage,
      }).catch(() => {});
    }

    return updatedApp;
  }
}
