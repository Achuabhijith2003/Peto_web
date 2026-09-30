import { supabase } from "../../config/supabase";
import { assertVerificationTransition } from "./verification.state";
import { VerificationStatus, DocumentType } from "./verification.types";
import { createAdminNotificationService } from "../../admin/services/adminNotifications.service";
import { createNotification } from "../../notifications/notification.service";
import { uploadSecureDocument, maskSensitiveIdentifier } from "../../media/secureStorage.service";
import { AdvertiserVerificationService } from "./verification.service";

function badRequest(message: string, status = 400): never {
  const error: any = new Error(message);
  error.status = status;
  throw error;
}

export class IdentityVerificationService {
  /**
   * Public business query with verified badge status
   */
  static async getPublicBusiness(businessId: string) {
    const { data: business, error } = await supabase
      .from("business_identities")
      .select("id, name, legal_name, country_code, website_url")
      .eq("id", businessId)
      .single();
    if (error || !business) badRequest("Business not found.", 404);

    const { data: verification, error: verificationError } = await supabase
      .from("verification_applications")
      .select("id, verified_name, expires_at, status")
      .eq("business_id", businessId)
      .eq("verification_type", "BUSINESS_IDENTITY")
      .eq("status", "APPROVED")
      .eq("verified_name", business.legal_name)
      .order("verified_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (verificationError) throw verificationError;

    const verified = !!verification && (!verification.expires_at || new Date(verification.expires_at).getTime() > Date.now());
    return {
      id: business.id,
      name: business.name,
      legal_name: business.legal_name,
      country_code: business.country_code,
      website_url: business.website_url,
      identityType: "BUSINESS",
      verification: {
        verified,
        type: verified ? "BUSINESS_VERIFIED" : null,
        status: verification?.status || "NOT_STARTED",
      },
    };
  }

  /**
   * Create new business identity
   */
  static async createBusiness(userId: string, input: any) {
    const name = String(input.name || "").trim();
    const legalName = String(input.legal_name || "").trim();
    const countryCode = String(input.country_code || "").trim().toUpperCase();
    if (!name || !legalName || !/^[A-Z]{2}$/.test(countryCode)) {
      badRequest("Business name, legal name, and two-letter country code are required.");
    }
    const { data, error } = await supabase.rpc("create_business_identity_for_owner", {
      p_owner_id: userId,
      p_name: name,
      p_legal_name: legalName,
      p_country_code: countryCode,
    });
    if (error) throw error;
    return data;
  }

  /**
   * Ensure user has verification management rights over the business
   */
  static async requireBusinessManager(userId: string, businessId: string) {
    const { data, error } = await supabase
      .from("business_memberships")
      .select("business_id, role, can_manage_verification")
      .eq("business_id", businessId)
      .eq("user_id", userId)
      .eq("can_manage_verification", true)
      .maybeSingle();
    if (error || !data) badRequest("Business verification access denied.", 403);
    return data;
  }

  /**
   * Update business identity fields.
   * If legal_name changes on an approved business, DB trigger will set REVERIFICATION_REQUIRED.
   */
  static async updateBusiness(userId: string, businessId: string, input: any) {
    await this.requireBusinessManager(userId, businessId);
    const name = String(input.name || "").trim();
    const legalName = String(input.legal_name || "").trim();
    if (!name || !legalName) badRequest("Business and legal names are required.");

    const { data, error } = await supabase
      .from("business_identities")
      .update({ name, legal_name: legalName, updated_at: new Date().toISOString() })
      .eq("id", businessId)
      .select("id, name, legal_name, country_code, website_url")
      .single();
    if (error) throw error;
    return data;
  }

  /**
   * Authoritative verification status for authenticated user and their managed businesses
   */
  static async getMyVerifications(userId: string) {
    // 1. Person verification
    const { data: personApps, error: personError } = await supabase
      .from("verification_applications")
      .select(`
        id,
        status,
        verification_type,
        submitted_at,
        verified_at,
        verified_name,
        legal_first_name,
        legal_last_name,
        residential_country,
        rejection_reason,
        additional_info_notes,
        user_facing_reason,
        admin_internal_notes,
        reverification_reason,
        created_at,
        updated_at,
        verification_documents (id, document_type, country_code, original_file_name, status, created_at)
      `)
      .eq("user_id", userId)
      .eq("verification_type", "INDIVIDUAL_IDENTITY")
      .order("created_at", { ascending: false })
      .limit(1);
    if (personError) throw personError;

    const person = personApps?.[0] || null;
    const isPersonVerified = person?.status === "APPROVED";

    // 2. Business verifications
    const { data: memberships, error: membershipError } = await supabase
      .from("business_memberships")
      .select("business_id, role, can_manage_verification, business_identities:business_id(id, name, legal_name, country_code, website_url)")
      .eq("user_id", userId);
    if (membershipError) throw membershipError;

    const ids = (memberships || []).map((m: any) => m.business_id);
    let applications: any[] = [];
    if (ids.length) {
      const { data, error } = await supabase
        .from("verification_applications")
        .select(`
          id,
          business_id,
          status,
          verification_type,
          submitted_at,
          verified_at,
          verified_name,
          business_legal_name,
          residential_country,
          rejection_reason,
          additional_info_notes,
          user_facing_reason,
          reverification_reason,
          created_at,
          updated_at,
          verification_documents (id, document_type, country_code, original_file_name, status, created_at)
        `)
        .eq("verification_type", "BUSINESS_IDENTITY")
        .in("business_id", ids)
        .order("created_at", { ascending: false });
      if (error) throw error;
      applications = data || [];
    }

    const businesses = (memberships || []).map((membership: any) => {
      const bApp = applications.find((app) => app.business_id === membership.business_id) || null;
      return {
        ...membership.business_identities,
        role: membership.role,
        can_manage_verification: membership.can_manage_verification,
        verification: bApp,
        is_verified: bApp?.status === "APPROVED",
      };
    });

    return {
      person: {
        application: person,
        is_verified: isPersonVerified,
        status: person?.status || "NOT_STARTED",
        badge_type: isPersonVerified ? "PERSON_VERIFIED" : null,
      },
      businesses,
    };
  }

  /**
   * Submit or resubmit Personal Verification
   */
  static async submitPersonal(userId: string, input: any) {
    const legalFirstName = String(input.legal_first_name || "").trim();
    const legalLastName = String(input.legal_last_name || "").trim();
    const country = String(input.residential_country || input.country || "IN").trim().toUpperCase();
    const dob = input.date_of_birth ? String(input.date_of_birth) : null;

    if (!legalFirstName || !legalLastName) {
      badRequest("Legal first and last names are required for personal verification.");
    }

    const rule = await AdvertiserVerificationService.getRegionalRule(country);
    if (dob) {
      const birthDate = new Date(dob);
      const ageDiffMs = Date.now() - birthDate.getTime();
      const ageYears = Math.floor(ageDiffMs / (365.25 * 24 * 60 * 60 * 1000));
      if (ageYears < rule.minimum_age) {
        badRequest(`You must be at least ${rule.minimum_age} years old to verify your identity in ${rule.country_name}.`);
      }
    }

    const { data: current } = await supabase
      .from("verification_applications")
      .select("id, status")
      .eq("user_id", userId)
      .eq("verification_type", "INDIVIDUAL_IDENTITY")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    assertVerificationTransition((current?.status || "NOT_STARTED") as VerificationStatus, "SUBMITTED");

    const now = new Date().toISOString();
    const payload = {
      user_id: userId,
      verification_type: "INDIVIDUAL_IDENTITY",
      status: "SUBMITTED",
      legal_first_name: legalFirstName,
      legal_last_name: legalLastName,
      residential_country: country,
      date_of_birth: dob,
      submitted_at: now,
      updated_at: now,
    };

    const query = current
      ? supabase.from("verification_applications").update(payload).eq("id", current.id).eq("status", current.status)
      : supabase.from("verification_applications").insert(payload);

    const { data: application, error } = await query.select().maybeSingle();
    if (error) throw error;
    if (!application) badRequest("Verification application changed. Refresh and try again.", 409);

    await supabase.from("verification_audit_events").insert({
      application_id: application.id,
      actor_id: userId,
      actor_role: "USER",
      action: "APPLICATION_SUBMITTED",
      previous_status: current?.status || "NOT_STARTED",
      new_status: "SUBMITTED",
      reason: "User submitted personal identity verification",
      metadata: { country, verification_type: "INDIVIDUAL_IDENTITY" },
    });

    await createAdminNotificationService({
      category: "PENDING_ADVERTISEMENT",
      priority: "HIGH",
      title: "Personal Identity Verification Submitted",
      message: `${legalFirstName} ${legalLastName} submitted personal verification (${country}).`,
      link: `/verifications?id=${application.id}`,
      metadata: { applicationId: application.id, userId, country },
      dedup_key: `personal_verification_${application.id}_${now}`,
    });

    await createNotification({
      recipientId: userId,
      type: "system",
      message: "Your personal identity verification was submitted for review.",
    }).catch(() => {});

    return application;
  }

  /**
   * Upload Personal Verification Document
   */
  static async uploadPersonalDocument(
    userId: string,
    applicationId: string,
    file: Express.Multer.File,
    documentType: DocumentType,
    documentNumber?: string,
    countryCode?: string
  ) {
    const { data: application, error } = await supabase
      .from("verification_applications")
      .select("id, status, residential_country, user_id")
      .eq("id", applicationId)
      .eq("user_id", userId)
      .eq("verification_type", "INDIVIDUAL_IDENTITY")
      .single();

    if (error || !application) badRequest("Personal verification application not found.", 404);
    if (!["DRAFT", "SUBMITTED", "ADDITIONAL_INFORMATION_REQUIRED", "REJECTED", "REVERIFICATION_REQUIRED"].includes(application.status)) {
      badRequest("Documents cannot be added in the current verification state.", 409);
    }

    const { storagePath, fileSizeBytes } = await uploadSecureDocument(file.buffer, file.originalname, file.mimetype, applicationId);
    const { data: document, error: documentError } = await supabase
      .from("verification_documents")
      .insert({
        application_id: applicationId,
        document_type: documentType,
        country_code: (countryCode || application.residential_country || "IN").toUpperCase(),
        storage_path: storagePath,
        original_file_name: file.originalname,
        file_size_bytes: fileSizeBytes,
        mime_type: file.mimetype,
        document_number_masked: maskSensitiveIdentifier(documentNumber),
        status: "PENDING",
      })
      .select("id, document_type, status, created_at")
      .single();

    if (documentError) throw documentError;

    await supabase.from("verification_audit_events").insert({
      application_id: applicationId,
      actor_id: userId,
      actor_role: "USER",
      action: "DOCUMENT_UPLOADED",
      reason: `Uploaded ${documentType} for personal verification`,
      metadata: { documentId: document.id, documentType, fileSizeBytes },
    });

    return document;
  }

  /**
   * Dynamic requirements based on subjectType, country, and businessType
   */
  static async getRequirements(subjectType: "BUSINESS" | "INDIVIDUAL" = "BUSINESS", countryCode: string = "IN", _businessType?: string) {
    const country = (countryCode || "IN").toUpperCase();

    if (subjectType === "INDIVIDUAL") {
      return {
        subjectType: "INDIVIDUAL",
        country,
        requiredFields: ["legal_first_name", "legal_last_name", "residential_country"],
        optionalFields: ["date_of_birth"],
        requiredDocuments: [
          { type: "NATIONAL_ID", label: "National ID / Aadhaar / SSN", required: true },
          { type: "PASSPORT", label: "Passport", required: false },
          { type: "DRIVERS_LICENSE", label: "Driver's License", required: false },
        ],
        optionalDocuments: [],
        supportedIdentifierTypes: [],
      };
    }

    // Dynamic country identifier configuration
    const identifierMap: Record<string, { types: string[]; label: string }> = {
      IN: { types: ["GSTIN", "CIN", "PAN", "LLPIN", "OTHER"], label: "GSTIN / CIN / PAN / LLPIN" },
      US: { types: ["EIN", "STATE_BUSINESS_ID", "DUNS", "OTHER"], label: "EIN / State Business ID / DUNS" },
      GB: { types: ["CRN", "VAT_NUMBER", "CHARITY_NUMBER", "OTHER"], label: "Companies House CRN / VAT Number" },
      CA: { types: ["BUSINESS_NUMBER_BN", "CORPORATION_NUMBER", "OTHER"], label: "Business Number (BN) / Corp #" },
      AU: { types: ["ABN", "ACN", "OTHER"], label: "ABN / ACN" },
    };

    const businessTypeMap: Record<string, string[]> = {
      IN: ["PRIVATE_COMPANY", "PUBLIC_COMPANY", "LLP", "SOLE_PROPRIETORSHIP", "PARTNERSHIP", "NON_PROFIT", "OTHER"],
      US: ["LLC", "C_CORP", "S_CORP", "SOLE_PROPRIETORSHIP", "PARTNERSHIP", "NON_PROFIT", "OTHER"],
      GB: ["PRIVATE_COMPANY", "PUBLIC_COMPANY", "LLP", "SOLE_PROPRIETORSHIP", "CHARITY", "OTHER"],
      CA: ["CORPORATION", "SOLE_PROPRIETORSHIP", "PARTNERSHIP", "NON_PROFIT", "OTHER"],
      AU: ["PROPRIETARY_COMPANY", "SOLE_TRADER", "PARTNERSHIP", "PUBLIC_COMPANY", "OTHER"],
    };

    const countryIdentifiers = identifierMap[country] || {
      types: ["BUSINESS_REGISTRATION_NUMBER", "TAX_IDENTIFIER", "OTHER"],
      label: "Official Business Registration Number",
    };

    const countryBusinessTypes = businessTypeMap[country] || [
      "PRIVATE_COMPANY",
      "PUBLIC_COMPANY",
      "LLC",
      "SOLE_PROPRIETORSHIP",
      "PARTNERSHIP",
      "NON_PROFIT",
      "OTHER",
    ];

    const petoCategories = [
      "Pet Food & Nutrition",
      "Pet Products",
      "Pet Accessories",
      "Pet Grooming",
      "Pet Training",
      "Pet Boarding",
      "Pet Shop",
      "Pet Supplies",
      "Pet Adoption",
      "Animal Shelter",
      "Pet Services",
      "Pet Insurance",
      "Pet Technology",
      "Veterinary / Animal Care",
      "Other",
    ];

    const representativeRelationships = [
      "OWNER",
      "DIRECTOR",
      "AUTHORIZED_REPRESENTATIVE",
      "PARTNER",
      "MANAGER",
      "OTHER",
    ];

    return {
      subjectType: "BUSINESS",
      country,
      supportedBusinessTypes: countryBusinessTypes,
      supportedIdentifierTypes: countryIdentifiers.types,
      identifierLabel: countryIdentifiers.label,
      businessCategories: petoCategories,
      representativeRelationships,
      requiredFields: [
        "name",
        "legal_name",
        "business_type",
        "country_code",
        "registration_number",
        "registration_identifier_type",
        "registered_address",
        "city",
        "postal_code",
        "representative_name",
        "representative_role",
        "representative_relationship",
        "declaration_confirmed",
      ],
      optionalFields: [
        "business_category",
        "website_url",
        "business_description",
        "registration_authority",
        "registration_state",
        "registration_date",
        "tax_identifier",
        "address_line2",
        "state_province",
        "contact_email",
        "contact_phone",
        "representative_email",
        "representative_phone",
      ],
      requiredDocuments: [
        {
          type: "BUSINESS_REGISTRATION_DOCUMENT",
          label: "Business Registration Document",
          description: "Certificate of Incorporation, Partnership Deed, or Official Business Registry Extract.",
          required: true,
        },
        {
          type: "PROOF_OF_BUSINESS_ADDRESS",
          label: "Proof of Business Address",
          description: "Utility bill, bank statement, or official lease agreement issued within the last 3 months.",
          required: true,
        },
      ],
      optionalDocuments: [
        {
          type: "TAX_REGISTRATION_DOCUMENT",
          label: "Tax / VAT / GST Registration Document",
          description: "Official tax registration or exemption certificate.",
          required: false,
        },
        {
          type: "BUSINESS_LICENSE",
          label: "Business License / Permit",
          description: "Industry-specific license (e.g., Veterinary, Pet Boarding, Import/Export).",
          required: false,
        },
        {
          type: "AUTHORIZED_REPRESENTATIVE_EVIDENCE",
          label: "Authorization Letter / Power of Attorney",
          description: "Letter authorizing the representative to act on behalf of the business.",
          required: false,
        },
        {
          type: "OTHER_SUPPORTING_DOCUMENT",
          label: "Other Supporting Document",
          description: "Any supplementary verification documents.",
          required: false,
        },
      ],
    };
  }

  /**
   * Retrieve active or draft business verification application with documents
   */
  static async getBusinessApplication(userId: string, businessId: string) {
    await this.requireBusinessManager(userId, businessId);

    const { data: business, error: bError } = await supabase
      .from("business_identities")
      .select("*")
      .eq("id", businessId)
      .single();
    if (bError || !business) badRequest("Business not found.", 404);

    const { data: application, error: appError } = await supabase
      .from("verification_applications")
      .select(`
        *,
        verification_documents (
          id,
          document_type,
          country_code,
          original_file_name,
          file_size_bytes,
          mime_type,
          status,
          created_at
        )
      `)
      .eq("business_id", businessId)
      .eq("verification_type", "BUSINESS_IDENTITY")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (appError) throw appError;

    if (application) {
      application.registered_address = application.registered_address || application.business_address || null;
      application.website_url = application.website_url || application.business_website || business?.website_url || null;
    }

    return {
      business,
      application: application || null,
      status: application?.status || "NOT_STARTED",
      is_verified: application?.status === "APPROVED",
    };
  }

  /**
   * Save draft application progress without submitting for review
   */
  static async saveBusinessDraft(userId: string, businessId: string, input: any) {
    await this.requireBusinessManager(userId, businessId);

    const { data: business, error: bError } = await supabase
      .from("business_identities")
      .select("id, name, legal_name, country_code")
      .eq("id", businessId)
      .single();
    if (bError || !business) badRequest("Business not found.", 404);

    const { data: current } = await supabase
      .from("verification_applications")
      .select("id, status")
      .eq("business_id", businessId)
      .eq("verification_type", "BUSINESS_IDENTITY")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Check if state allows saving drafts
    if (current?.status === "APPROVED") {
      badRequest("Business is already verified. Changes to verified data require formal reverification.", 409);
    }

    const now = new Date().toISOString();
    const draftStatus = current?.status === "ADDITIONAL_INFORMATION_REQUIRED"
      ? "ADDITIONAL_INFORMATION_REQUIRED"
      : "DRAFT";

    const payload: any = {
      user_id: userId,
      business_id: businessId,
      verification_type: "BUSINESS_IDENTITY",
      status: draftStatus,
      submitted_by_user_id: userId,
      draft_step: Number(input.draft_step) || 1,
      business_legal_name: input.legal_name || input.business_legal_name || business.legal_name,
      residential_country: (input.country_code || input.residential_country || business.country_code || "IN").toUpperCase(),
      business_type: input.business_type || null,
      business_category: input.business_category || null,
      business_description: input.business_description || null,
      website_url: input.website_url || null,
      registration_number: input.registration_number || null,
      registration_identifier_type: input.registration_identifier_type || null,
      registration_authority: input.registration_authority || null,
      registration_country: (input.registration_country || input.country_code || business.country_code || "IN").toUpperCase(),
      registration_state: input.registration_state || null,
      registration_date: input.registration_date || null,
      tax_identifier: input.tax_identifier || null,
      registered_address: input.registered_address || null,
      address_line2: input.address_line2 || null,
      city: input.city || null,
      state_province: input.state_province || null,
      postal_code: input.postal_code || null,
      contact_email: input.contact_email || null,
      contact_phone: input.contact_phone || null,
      representative_name: input.representative_name || null,
      representative_role: input.representative_role || null,
      representative_email: input.representative_email || null,
      representative_phone: input.representative_phone || null,
      representative_relationship: input.representative_relationship || null,
      declaration_confirmed: input.declaration_confirmed === true,
      updated_at: now,
    };

    // Populate existing schema column aliases for backward compatibility
    payload.business_address = payload.registered_address;
    payload.business_website = payload.website_url;

    let res = current
      ? await supabase.from("verification_applications").update(payload).eq("id", current.id).select().single()
      : await supabase.from("verification_applications").insert({ ...payload, created_at: now }).select().single();

    if (res.error && (res.error.message?.includes("schema cache") || res.error.message?.includes("column"))) {
      // Fallback: strip fields not yet present in un-migrated schema cache
      const fallbackPayload = { ...payload };
      delete fallbackPayload.registered_address;
      delete fallbackPayload.website_url;
      res = current
        ? await supabase.from("verification_applications").update(fallbackPayload).eq("id", current.id).select().single()
        : await supabase.from("verification_applications").insert({ ...fallbackPayload, created_at: now }).select().single();
    }

    if (res.error) throw res.error;
    const application = res.data;

    // Sync business identity basic fields if provided
    const bizUpdate: any = {};
    if (input.name && input.name !== business.name) bizUpdate.name = input.name;
    if (input.business_type) bizUpdate.business_type = input.business_type;
    if (input.business_category) bizUpdate.business_category = input.business_category;
    if (input.website_url) bizUpdate.website_url = input.website_url;
    if (input.business_description) bizUpdate.description = input.business_description;

    if (Object.keys(bizUpdate).length > 0) {
      await supabase.from("business_identities").update(bizUpdate).eq("id", businessId);
    }

    return application;
  }

  /**
   * Submit Business Verification
   */
  static async submitBusiness(userId: string, businessId: string, input?: any) {
    await this.requireBusinessManager(userId, businessId);
    const { data: business, error: businessError } = await supabase
      .from("business_identities")
      .select("*")
      .eq("id", businessId)
      .single();
    if (businessError || !business) badRequest("Business not found.", 404);

    const { data: current, error: currentError } = await supabase
      .from("verification_applications")
      .select("id, status, declaration_confirmed, representative_name")
      .eq("business_id", businessId)
      .eq("verification_type", "BUSINESS_IDENTITY")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (currentError) throw currentError;

    const currentStatus = (current?.status || "NOT_STARTED") as VerificationStatus;
    assertVerificationTransition(currentStatus, "SUBMITTED");

    const now = new Date().toISOString();
    const legalName = String(input?.legal_name || input?.business_legal_name || business.legal_name || "").trim();
    const country = String(input?.country_code || input?.residential_country || business.country_code || "IN").trim().toUpperCase();
    const businessType = String(input?.business_type || business.business_type || "").trim();
    const registrationNumber = String(input?.registration_number || "").trim();
    const registeredAddress = String(input?.registered_address || "").trim();
    const city = String(input?.city || "").trim();
    const postalCode = String(input?.postal_code || "").trim();
    const repName = String(input?.representative_name || "").trim();
    const repRole = String(input?.representative_role || "").trim();
    const repRel = String(input?.representative_relationship || "").trim();
    const declaration = input?.declaration_confirmed !== undefined ? input.declaration_confirmed : current?.declaration_confirmed;

    // Validation if full input passed
    if (input && Object.keys(input).length > 2) {
      if (!legalName) badRequest("Legal business name is required.");
      if (!businessType) badRequest("Business type is required.");
      if (!registrationNumber) badRequest("Business registration number is required.");
      if (!registeredAddress || !city || !postalCode) badRequest("Registered business address, city, and postal code are required.");
      if (!repName || !repRole || !repRel) badRequest("Authorized representative name, role, and relationship are required.");
      if (!declaration) badRequest("You must confirm the legal accuracy and authorization declaration.");
    }

    const payload: any = {
      user_id: userId,
      business_id: businessId,
      verification_type: "BUSINESS_IDENTITY",
      status: "SUBMITTED",
      submitted_by_user_id: userId,
      business_legal_name: legalName,
      residential_country: country,
      draft_step: 6,
      submitted_at: now,
      updated_at: now,
    };

    if (input) {
      if (businessType) payload.business_type = businessType;
      if (input.business_category) payload.business_category = input.business_category;
      if (input.business_description) payload.business_description = input.business_description;
      if (input.website_url) payload.website_url = input.website_url;
      if (registrationNumber) payload.registration_number = registrationNumber;
      if (input.registration_identifier_type) payload.registration_identifier_type = input.registration_identifier_type;
      if (input.registration_authority) payload.registration_authority = input.registration_authority;
      if (input.registration_country) payload.registration_country = (input.registration_country || country).toUpperCase();
      if (input.registration_state) payload.registration_state = input.registration_state;
      if (input.registration_date) payload.registration_date = input.registration_date;
      if (input.tax_identifier) payload.tax_identifier = input.tax_identifier;
      if (registeredAddress) payload.registered_address = registeredAddress;
      if (input.address_line2) payload.address_line2 = input.address_line2;
      if (city) payload.city = city;
      if (input.state_province) payload.state_province = input.state_province;
      if (postalCode) payload.postal_code = postalCode;
      if (input.contact_email) payload.contact_email = input.contact_email;
      if (input.contact_phone) payload.contact_phone = input.contact_phone;
      if (repName) payload.representative_name = repName;
      if (repRole) payload.representative_role = repRole;
      if (input.representative_email) payload.representative_email = input.representative_email;
      if (input.representative_phone) payload.representative_phone = input.representative_phone;
      if (repRel) payload.representative_relationship = repRel;
      if (declaration !== undefined) payload.declaration_confirmed = declaration === true;
    }

    payload.business_address = registeredAddress;
    payload.business_website = input?.website_url || null;

    let res = current
      ? await supabase.from("verification_applications").update(payload).eq("id", current.id).select().single()
      : await supabase.from("verification_applications").insert({ ...payload, created_at: now }).select().single();

    if (res.error && (res.error.message?.includes("schema cache") || res.error.message?.includes("column"))) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.registered_address;
      delete fallbackPayload.website_url;
      res = current
        ? await supabase.from("verification_applications").update(fallbackPayload).eq("id", current.id).select().single()
        : await supabase.from("verification_applications").insert({ ...fallbackPayload, created_at: now }).select().single();
    }

    if (res.error) throw res.error;
    const application = res.data;

    // Check if at least one evidence document exists
    const { count: docCount, error: docCountError } = await supabase
      .from("verification_documents")
      .select("id", { count: "exact", head: true })
      .eq("application_id", application.id);
    if (docCountError) throw docCountError;

    if (!docCount || docCount === 0) {
      badRequest("At least one business registration document must be uploaded before submitting for verification.");
    }

    await supabase.from("verification_audit_events").insert({
      application_id: application.id,
      actor_id: userId,
      actor_role: "USER",
      action: "APPLICATION_SUBMITTED",
      previous_status: currentStatus,
      new_status: "SUBMITTED",
      reason: `Business verification submitted for ${business.name}`,
      metadata: { businessId, submittedBy: userId, representativeName: repName || application.representative_name },
    });

    await createAdminNotificationService({
      category: "PENDING_ADVERTISEMENT",
      priority: "HIGH",
      title: "Business Identity Verification Submitted",
      message: `${business.name} submitted business identity verification.`,
      link: `/verifications?id=${application.id}`,
      metadata: { applicationId: application.id, businessId },
      dedup_key: `business_verification_${application.id}_${now}`,
    });

    await createNotification({
      recipientId: userId,
      type: "system",
      message: `Your business verification for ${business.name} was submitted for review.`,
    });

    return application;
  }

  /**
   * Upload Business Verification Document
   */
  static async uploadBusinessDocument(
    userId: string,
    businessId: string,
    applicationId: string | undefined,
    file: Express.Multer.File,
    documentType: string
  ) {
    await this.requireBusinessManager(userId, businessId);

    const { data: business, error: bError } = await supabase
      .from("business_identities")
      .select("id, name, legal_name, country_code")
      .eq("id", businessId)
      .single();
    if (bError || !business) badRequest("Business not found.", 404);

    let activeAppId = applicationId;
    if (!activeAppId) {
      // Find or create draft application
      const { data: existingApp } = await supabase
        .from("verification_applications")
        .select("id, status")
        .eq("business_id", businessId)
        .eq("verification_type", "BUSINESS_IDENTITY")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingApp) {
        activeAppId = existingApp.id;
      } else {
        const { data: newDraft, error: draftErr } = await supabase
          .from("verification_applications")
          .insert({
            user_id: userId,
            business_id: businessId,
            verification_type: "BUSINESS_IDENTITY",
            status: "DRAFT",
            business_legal_name: business.legal_name,
            residential_country: business.country_code,
            submitted_by_user_id: userId,
            draft_step: 5,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select("id")
          .single();
        if (draftErr) throw draftErr;
        activeAppId = newDraft.id;
      }
    }

    const { data: application, error } = await supabase
      .from("verification_applications")
      .select("id, status, residential_country")
      .eq("id", activeAppId)
      .eq("business_id", businessId)
      .eq("verification_type", "BUSINESS_IDENTITY")
      .single();
    if (error || !application) badRequest("Business verification application not found.", 404);

    if (!["DRAFT", "SUBMITTED", "ADDITIONAL_INFORMATION_REQUIRED", "REJECTED", "REVERIFICATION_REQUIRED"].includes(application.status)) {
      badRequest("Documents cannot be added in the current verification state.", 409);
    }

    const allowedBusinessDocTypes = [
      "BUSINESS_REGISTRATION_DOCUMENT",
      "BUSINESS_LICENSE",
      "TAX_REGISTRATION_DOCUMENT",
      "PROOF_OF_BUSINESS_ADDRESS",
      "AUTHORIZED_REPRESENTATIVE_EVIDENCE",
      "OTHER_SUPPORTING_DOCUMENT",
      "TAX_CERTIFICATE",
      "INCORPORATION_DOC",
      "UTILITY_BILL",
    ];

    if (!allowedBusinessDocTypes.includes(documentType)) {
      badRequest(`Unsupported business document type: ${documentType}`);
    }

    const { storagePath, fileSizeBytes } = await uploadSecureDocument(file.buffer, file.originalname, file.mimetype, activeAppId);
    const { data: document, error: documentError } = await supabase
      .from("verification_documents")
      .insert({
        application_id: activeAppId,
        document_type: documentType,
        country_code: application.residential_country || business.country_code || "IN",
        storage_path: storagePath,
        original_file_name: file.originalname,
        file_size_bytes: fileSizeBytes,
        mime_type: file.mimetype,
        document_number_masked: maskSensitiveIdentifier(null),
        status: "PENDING",
      })
      .select("id, document_type, status, original_file_name, file_size_bytes, created_at")
      .single();

    if (documentError) throw documentError;

    await supabase.from("verification_audit_events").insert({
      application_id: activeAppId,
      actor_id: userId,
      actor_role: "USER",
      action: "DOCUMENT_UPLOADED",
      reason: `Uploaded ${documentType} for business verification`,
      metadata: { documentId: document.id, documentType, originalFileName: file.originalname },
    });

    return { ...document, applicationId: activeAppId };
  }

  /**
   * Delete uploaded business verification document before review finalized
   */
  static async deleteBusinessDocument(userId: string, businessId: string, documentId: string) {
    await this.requireBusinessManager(userId, businessId);

    const { data: doc, error: docError } = await supabase
      .from("verification_documents")
      .select("id, application_id, document_type, original_file_name, verification_applications(id, business_id, status)")
      .eq("id", documentId)
      .single();

    if (docError || !doc) badRequest("Document not found.", 404);

    const app = (doc as any).verification_applications;
    if (!app || app.business_id !== businessId) {
      badRequest("Document does not belong to this business.", 403);
    }

    if (!["DRAFT", "SUBMITTED", "ADDITIONAL_INFORMATION_REQUIRED", "REJECTED", "REVERIFICATION_REQUIRED"].includes(app.status)) {
      badRequest("Documents cannot be removed once application review is finalized.", 409);
    }

    const { error: delError } = await supabase
      .from("verification_documents")
      .delete()
      .eq("id", documentId);

    if (delError) throw delError;

    await supabase.from("verification_audit_events").insert({
      application_id: app.id,
      actor_id: userId,
      actor_role: "USER",
      action: "DOCUMENT_DELETED",
      reason: `Removed ${doc.document_type} (${doc.original_file_name})`,
      metadata: { documentId, documentType: doc.document_type },
    });

    return { success: true, id: documentId };
  }

  /**
   * Authoritative advertiser eligibility evaluation
   * Considers Person verification, Business verifications, advertiser profile setup
   */
  static async getEligibility(userId: string, selectedBusinessId?: string) {
    const verificationData = await this.getMyVerifications(userId);
    const { data: advertiser } = await supabase
      .from("advertisers")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    const isPersonVerified = verificationData.person.is_verified;
    const verifiedBusinesses = verificationData.businesses.filter((b: any) => b.is_verified);

    let activeBusiness: any = null;
    if (selectedBusinessId) {
      activeBusiness = verificationData.businesses.find((b: any) => b.id === selectedBusinessId) || null;
    }

    const canAdvertiseAsPerson = isPersonVerified;
    const canAdvertiseAsBusiness = selectedBusinessId
      ? activeBusiness?.is_verified === true
      : verifiedBusinesses.length > 0;

    const canAccessPortal = canAdvertiseAsPerson || canAdvertiseAsBusiness;
    // Setup needed if eligible to advertise but advertiser billing currency / setup has not been finalized
    const setupNeeded = canAccessPortal && (!advertiser || !advertiser.currency || !advertiser.is_currency_locked);

    return {
      canAccessPortal,
      setupNeeded,
      user: {
        id: userId,
        is_verified: isPersonVerified,
        status: verificationData.person.status,
        application: verificationData.person.application,
        canAdvertise: canAdvertiseAsPerson,
      },
      businesses: verificationData.businesses,
      activeBusiness: activeBusiness ? {
        id: activeBusiness.id,
        name: activeBusiness.name,
        legal_name: activeBusiness.legal_name,
        is_verified: activeBusiness.is_verified,
        status: activeBusiness.verification?.status || "NOT_STARTED",
      } : null,
      advertiser: advertiser ? {
        id: advertiser.id,
        company_name: advertiser.company_name,
        currency: advertiser.currency,
        is_currency_locked: advertiser.is_currency_locked,
        status: advertiser.status,
        balance: advertiser.balance,
      } : null,
    };
  }
}
