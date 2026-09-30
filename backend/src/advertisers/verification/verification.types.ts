export type VerificationStatus =
  | "NOT_STARTED"
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "ADDITIONAL_INFORMATION_REQUIRED"
  | "APPROVED"
  | "REJECTED"
  | "REVERIFICATION_REQUIRED"
  | "EXPIRED"
  | "SUSPENDED"
  | "REVOKED";

export type VerificationType =
  | "INDIVIDUAL_IDENTITY"
  | "BUSINESS_PARTNER"
  | "BUSINESS_IDENTITY";

export type DocumentType =
  | "PASSPORT"
  | "DRIVERS_LICENSE"
  | "NATIONAL_ID"
  | "TAX_CERTIFICATE"
  | "INCORPORATION_DOC"
  | "UTILITY_BILL"
  | "BUSINESS_REGISTRATION_DOCUMENT"
  | "BUSINESS_LICENSE"
  | "TAX_REGISTRATION_DOCUMENT"
  | "PROOF_OF_BUSINESS_ADDRESS"
  | "AUTHORIZED_REPRESENTATIVE_EVIDENCE"
  | "OTHER_SUPPORTING_DOCUMENT";

export interface RegionalVerificationRule {
  country_code: string;
  country_name: string;
  individual_verification_required: boolean;
  business_verification_required: boolean;
  allowed_document_types: DocumentType[];
  minimum_age: number;
  manual_review_required: boolean;
  policy_version: string;
  notes?: string;
}

export interface VerificationDocumentDTO {
  id: string;
  application_id: string;
  document_type: DocumentType;
  country_code: string;
  original_file_name: string;
  file_size_bytes: number;
  mime_type: string;
  document_number_masked?: string;
  expiry_date?: string;
  is_front: boolean;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  rejection_notes?: string;
  created_at: string;
}

export interface VerificationApplicationDTO {
  id: string;
  user_id: string;
  advertiser_id?: string;
  business_id?: string;
  verification_type: VerificationType;
  status: VerificationStatus;
  
  // Individual info
  legal_first_name?: string;
  legal_last_name?: string;
  date_of_birth?: string;
  nationality?: string;
  residential_country: string;
  address_line1?: string;
  city?: string;
  postal_code?: string;

  // Business info
  business_legal_name?: string;
  business_type?: string;
  business_category?: string;
  business_description?: string;
  registration_number?: string;
  registration_identifier_type?: string;
  registration_authority?: string;
  registration_country?: string;
  registration_state?: string;
  registration_date?: string;
  tax_identifier?: string;
  business_registration_number_masked?: string;
  business_tax_id_masked?: string;
  business_address?: string;
  address_line2?: string;
  state_province?: string;
  contact_email?: string;
  contact_phone?: string;
  business_website?: string;
  authorized_role?: string;
  representative_name?: string;
  representative_role?: string;
  representative_email?: string;
  representative_phone?: string;
  representative_relationship?: string;
  submitted_by_user_id?: string;
  declaration_confirmed?: boolean;
  draft_step?: number;

  // Verification Authority
  verified_name?: string;
  verified_at?: string;
  verification_version?: number;
  reverification_reason?: string;
  user_facing_reason?: string;
  admin_internal_notes?: string;
  assigned_admin_id?: string;
  review_started_at?: string;
  review_completed_at?: string;
  decision?: string;
  decision_reason?: string;

  // Feedback & timeline
  rejection_reason?: string;
  additional_info_notes?: string;
  submitted_at?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;

  documents: VerificationDocumentDTO[];
  rule?: RegionalVerificationRule;
}

export interface VerificationRequirementsDTO {
  subjectType: "PERSON" | "BUSINESS";
  country: string;
  businessType?: string;
  supportedBusinessTypes?: { code: string; label: string }[];
  supportedCategories?: string[];
  identifierTypes?: { code: string; label: string; placeholder: string; pattern?: string }[];
  requiredFields: string[];
  optionalFields: string[];
  requiredDocuments: { type: DocumentType; label: string; description: string }[];
  optionalDocuments: { type: DocumentType; label: string; description: string }[];
}

export interface SubmitVerificationInput {
  verification_type: VerificationType;
  residential_country: string;

  // Individual fields
  legal_first_name?: string;
  legal_last_name?: string;
  date_of_birth?: string;
  nationality?: string;
  address_line1?: string;
  city?: string;
  postal_code?: string;

  // Business fields
  business_legal_name?: string;
  business_registration_number?: string;
  business_tax_id?: string;
  business_address?: string;
  business_website?: string;
  authorized_role?: string;
}
