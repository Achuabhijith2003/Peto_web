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
  page?: number;
  limit?: number;
}

export class AdminVerificationService {
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
        advertisers:advertiser_id (id, company_name, industry, status),
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

    const { data, count, error } = await query;
    if (error) throw error;

    return {
      items: data || [],
      total: count || 0,
      page,
      limit,
      totalPages: Math.ceil((count || 0) / limit),
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
        advertisers:advertiser_id (id, company_name, industry, status, balance, total_spend, currency),
        verification_documents (*),
        admin_reviewer:admin_reviewer_id (id, username, full_name)
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
   * Process verification decision (APPROVE, REJECT, REQUEST_INFORMATION, SUSPEND, REVOKE)
   */
  static async processDecision(
    applicationId: string,
    adminUserId: string,
    action: "APPROVE" | "REJECT" | "REQUEST_INFORMATION" | "SUSPEND" | "REVOKE",
    notes?: string,
    rejectionReason?: string,
    req?: Request
  ) {
    const app = await this.getDetail(applicationId);
    const previousStatus = app.status;
    let newStatus: string;

    if (action === "APPROVE") newStatus = "APPROVED";
    else if (action === "REJECT") newStatus = "REJECTED";
    else if (action === "REQUEST_INFORMATION") newStatus = "ADDITIONAL_INFORMATION_REQUIRED";
    else if (action === "SUSPEND") newStatus = "SUSPENDED";
    else if (action === "REVOKE") newStatus = "REVOKED";
    else throw new Error("Invalid verification action");

    const updatePayload: any = {
      status: newStatus,
      admin_reviewer_id: adminUserId,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (rejectionReason) updatePayload.rejection_reason = rejectionReason;
    if (notes) updatePayload.additional_info_notes = notes;

    // Update application
    const { data: updatedApp, error: appError } = await supabase
      .from("verification_applications")
      .update(updatePayload)
      .eq("id", applicationId)
      .select()
      .single();

    if (appError) throw appError;

    // Synchronize advertiser record & profile badge
    if (app.advertiser_id) {
      const advUpdate: any = {
        verification_status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (newStatus === "APPROVED") {
        advUpdate.verified_at = new Date().toISOString();
      }
      await supabase.from("advertisers").update(advUpdate).eq("id", app.advertiser_id);
    }

    // Profile badge handling
    if (newStatus === "APPROVED") {
      const badge = app.verification_type === "BUSINESS_PARTNER" ? "BUSINESS" : "ADVERTISER";
      await supabase
        .from("profiles")
        .update({ verification_badge_type: badge, is_verified: true })
        .eq("id", app.user_id);
    } else if (newStatus === "SUSPENDED" || newStatus === "REVOKED") {
      await supabase
        .from("profiles")
        .update({ verification_badge_type: "NONE" })
        .eq("id", app.user_id);

      // Pause active campaigns if suspended
      if (app.advertiser_id) {
        await supabase
          .from("ad_campaigns")
          .update({ status: "PAUSED", updated_at: new Date().toISOString() })
          .eq("advertiser_id", app.advertiser_id)
          .eq("status", "ACTIVE");
      }
    }

    // Write verification audit event
    await supabase.from("verification_audit_events").insert({
      application_id: applicationId,
      actor_id: adminUserId,
      actor_role: "ADMIN",
      action: `VERIFICATION_${action}`,
      previous_status: previousStatus,
      new_status: newStatus,
      reason: rejectionReason || notes || `Admin executed ${action}`,
      metadata: { action, adminUserId },
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
            previousStatus,
            newStatus,
            rejectionReason,
            notes,
          },
        },
        req
      );
    }

    // User Notification
    let notificationMessage = "";
    if (action === "APPROVE") {
      notificationMessage =
        "Congratulations! Your Peto advertiser verification has been approved. Campaign creation is now enabled.";
    } else if (action === "REJECT") {
      notificationMessage = `Your advertiser verification could not be approved. Reason: ${rejectionReason || "Verification criteria not met"}.`;
    } else if (action === "REQUEST_INFORMATION") {
      notificationMessage = `Action required: Please provide additional documentation for your verification. Details: ${notes || "Please check verification guidelines"}.`;
    } else if (action === "SUSPEND") {
      notificationMessage =
        "Your advertiser privileges have been temporarily suspended pending compliance inquiry.";
    }

    if (notificationMessage) {
      await createNotification({
        recipientId: app.user_id,
        type: "mention",
        message: notificationMessage,
      }).catch(() => {});
    }

    return updatedApp;
  }
}
