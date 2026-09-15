export type VerificationStatus =
  | "NOT_STARTED"
  | "DRAFT"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "ADDITIONAL_INFORMATION_REQUIRED"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "SUSPENDED"
  | "REVOKED";

export type VerificationType = "INDIVIDUAL_IDENTITY" | "BUSINESS_PARTNER";

export type DocumentType =
  | "PASSPORT"
  | "DRIVERS_LICENSE"
  | "NATIONAL_ID"
  | "TAX_CERTIFICATE"
  | "INCORPORATION_DOC"
  | "UTILITY_BILL";

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
  business_registration_number_masked?: string;
  business_tax_id_masked?: string;
  business_address?: string;
  business_website?: string;
  authorized_role?: string;

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
