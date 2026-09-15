import { supabase } from "../../config/supabase";
import {
  VerificationStatus,
  SubmitVerificationInput,
  RegionalVerificationRule,
  VerificationApplicationDTO,
  DocumentType,
} from "./verification.types";
import {
  uploadSecureDocument,
  maskSensitiveIdentifier,
} from "../../media/secureStorage.service";
import { createAdminNotificationService } from "../../admin/services/adminNotifications.service";
import { createNotification } from "../../notifications/notification.service";

export const DEFAULT_GLOBAL_VERIFICATION_RULE: RegionalVerificationRule = {
  country_code: "GLOBAL",
  country_name: "Global Baseline",
  individual_verification_required: true,
  business_verification_required: true,
  allowed_document_types: ["PASSPORT", "NATIONAL_ID", "DRIVERS_LICENSE"],
  minimum_age: 18,
  manual_review_required: true,
  policy_version: "1.0.0",
  notes: "Standard Peto identity & compliance policy",
};

export class AdvertiserVerificationService {
  /**
   * Fetch regional verification rule for country or global default
   */
  static async getRegionalRule(countryCode: string = "GLOBAL"): Promise<RegionalVerificationRule> {
    const code = (countryCode || "GLOBAL").toUpperCase().trim();
    try {
      const { data, error } = await supabase
        .from("regional_verification_rules")
        .select("*")
        .eq("country_code", code)
        .maybeSingle();

      if (!error && data) {
        return data as RegionalVerificationRule;
      }
    } catch {
      // Graceful fallback
    }

    return {
      ...DEFAULT_GLOBAL_VERIFICATION_RULE,
      country_code: code,
    };
  }

  /**
   * Retrieve applicant's current verification status & documents
   */
  static async getVerificationStatus(userId: string): Promise<VerificationApplicationDTO | null> {
    const { data: app, error } = await supabase
      .from("verification_applications")
      .select(`
        *,
        verification_documents (
          id,
          application_id,
          document_type,
          country_code,
          original_file_name,
          file_size_bytes,
          mime_type,
          document_number_masked,
          expiry_date,
          is_front,
          status,
          rejection_notes,
          created_at
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !app) {
      return null;
    }

    const rule = await this.getRegionalRule(app.residential_country || "GLOBAL");

    return {
      ...app,
      documents: app.verification_documents || [],
      rule,
    };
  }

  /**
   * Submit or update a verification application
   */
  static async submitApplication(
    userId: string,
    input: SubmitVerificationInput
  ): Promise<VerificationApplicationDTO> {
    const country = (input.residential_country || "US").toUpperCase().trim();
    const rule = await this.getRegionalRule(country);

    // Age validation if individual
    if (input.verification_type === "INDIVIDUAL_IDENTITY" && input.date_of_birth) {
      const birthDate = new Date(input.date_of_birth);
      const ageDiffMs = Date.now() - birthDate.getTime();
      const ageYears = Math.floor(ageDiffMs / (365.25 * 24 * 60 * 60 * 1000));
      if (ageYears < rule.minimum_age) {
        const err: any = new Error(
          `You must be at least ${rule.minimum_age} years old to register as an advertiser in ${rule.country_name}.`
        );
        err.status = 400;
        throw err;
      }
    }

    // Check if advertiser profile exists
    const { data: advertiser } = await supabase
      .from("advertisers")
      .select("id, status")
      .eq("user_id", userId)
      .maybeSingle();

    const existingApp = await this.getVerificationStatus(userId);

    const payload = {
      user_id: userId,
      advertiser_id: advertiser?.id || null,
      verification_type: input.verification_type || "INDIVIDUAL_IDENTITY",
      status: "SUBMITTED" as VerificationStatus,
      legal_first_name: input.legal_first_name?.trim() || null,
      legal_last_name: input.legal_last_name?.trim() || null,
      date_of_birth: input.date_of_birth || null,
      nationality: input.nationality?.trim() || null,
      residential_country: country,
      address_line1: input.address_line1?.trim() || null,
      city: input.city?.trim() || null,
      postal_code: input.postal_code?.trim() || null,
      business_legal_name: input.business_legal_name?.trim() || null,
      business_registration_number_masked: maskSensitiveIdentifier(input.business_registration_number),
      business_tax_id_masked: maskSensitiveIdentifier(input.business_tax_id),
      business_address: input.business_address?.trim() || null,
      business_website: input.business_website?.trim() || null,
      authorized_role: input.authorized_role || "OWNER",
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let applicationId: string;

    if (existingApp) {
      const { data, error } = await supabase
        .from("verification_applications")
        .update(payload)
        .eq("id", existingApp.id)
        .select()
        .single();

      if (error) throw error;
      applicationId = data.id;
    } else {
      const { data, error } = await supabase
        .from("verification_applications")
        .insert(payload)
        .select()
        .single();

      if (error) throw error;
      applicationId = data.id;
    }

    // Update advertiser record verification status
    if (advertiser?.id) {
      await supabase
        .from("advertisers")
        .update({
          verification_status: "SUBMITTED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", advertiser.id);
    }

    // Log verification audit event
    await supabase.from("verification_audit_events").insert({
      application_id: applicationId,
      actor_id: userId,
      actor_role: "USER",
      action: "APPLICATION_SUBMITTED",
      previous_status: existingApp?.status || "NOT_STARTED",
      new_status: "SUBMITTED",
      reason: "User submitted verification application for review",
      metadata: { verification_type: input.verification_type, country },
    });

    // Notify Admin Queue
    await createAdminNotificationService({
      category: "PENDING_ADVERTISEMENT",
      priority: "HIGH",
      title: "New Partner Verification Submitted",
      message: `User submitted ${input.verification_type.toLowerCase().replace("_", " ")} verification (${country}).`,
      link: `/verifications?id=${applicationId}`,
      metadata: { applicationId, userId, country },
      dedup_key: `verification_${applicationId}`,
    });

    // Notify User
    await createNotification({
      recipientId: userId,
      type: "mention",
      message: "Your advertiser verification application has been submitted and is currently under compliance review.",
    }).catch(() => {});

    const updated = await this.getVerificationStatus(userId);
    return updated!;
  }

  /**
   * Securely upload and associate an identity/business document
   */
  static async uploadDocument(
    userId: string,
    applicationId: string,
    fileBuffer: Buffer,
    originalFilename: string,
    mimeType: string,
    documentType: DocumentType,
    rawDocumentNumber?: string,
    countryCode?: string,
    isFront: boolean = true
  ) {
    // Verify application ownership
    const { data: app, error: appErr } = await supabase
      .from("verification_applications")
      .select("id, user_id, status")
      .eq("id", applicationId)
      .eq("user_id", userId)
      .single();

    if (appErr || !app) {
      const err: any = new Error("Verification application not found or access denied.");
      err.status = 404;
      throw err;
    }

    // Upload to private bucket
    const { storagePath, fileSizeBytes } = await uploadSecureDocument(
      fileBuffer,
      originalFilename,
      mimeType,
      applicationId
    );

    // Insert document record with strictly masked document number
    const { data: doc, error: docErr } = await supabase
      .from("verification_documents")
      .insert({
        application_id: applicationId,
        document_type: documentType,
        country_code: (countryCode || "US").toUpperCase(),
        storage_path: storagePath,
        original_file_name: originalFilename,
        file_size_bytes: fileSizeBytes,
        mime_type: mimeType,
        document_number_masked: maskSensitiveIdentifier(rawDocumentNumber),
        is_front: isFront,
        status: "PENDING",
      })
      .select()
      .single();

    if (docErr) throw docErr;

    // Log document upload audit
    await supabase.from("verification_audit_events").insert({
      application_id: applicationId,
      actor_id: userId,
      actor_role: "USER",
      action: "DOCUMENT_UPLOADED",
      reason: `Uploaded ${documentType} (${originalFilename})`,
      metadata: { documentId: doc.id, documentType, fileSizeBytes },
    });

    return {
      id: doc.id,
      document_type: doc.document_type,
      document_number_masked: doc.document_number_masked,
      status: doc.status,
      created_at: doc.created_at,
    };
  }

  /**
   * Return verification guidelines and accepted documents by country
   */
  static async getGuidelines(countryCode: string = "GLOBAL") {
    const rule = await this.getRegionalRule(countryCode);
    return {
      country_code: rule.country_code,
      country_name: rule.country_name,
      individual_required: rule.individual_verification_required,
      business_required: rule.business_verification_required,
      allowed_documents: rule.allowed_document_types,
      minimum_age: rule.minimum_age,
      review_timeframe: "24-48 hours",
      policy_version: rule.policy_version,
      privacy_disclosure:
        "Identity and business verification documents are stored in secure, private encrypted cloud storage with strict zero-knowledge access controls. Government ID numbers are masked upon receipt and are never shared publicly or displayed on your public Peto profile.",
    };
  }
}
