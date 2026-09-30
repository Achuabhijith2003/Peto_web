// Mock env vars before any imports
process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "test_key";
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "test_anon_key";

import test from "node:test";
import assert from "node:assert/strict";

const { IdentityVerificationService } = await import("../src/advertisers/verification/identityVerification.service.js");
const { assertVerificationTransition } = await import("../src/advertisers/verification/verification.state.js");

test("dynamic business requirements per country", async () => {
  // India (IN)
  const inReq = await IdentityVerificationService.getRequirements("BUSINESS", "IN");
  assert.equal(inReq.country, "IN");
  assert.ok(inReq.supportedIdentifierTypes.includes("GSTIN"));
  assert.ok(inReq.supportedIdentifierTypes.includes("CIN"));
  assert.ok(inReq.supportedBusinessTypes.includes("LLP"));
  assert.ok(inReq.requiredDocuments.some((d: any) => d.type === "BUSINESS_REGISTRATION_DOCUMENT"));
  assert.ok(inReq.requiredDocuments.some((d: any) => d.type === "PROOF_OF_BUSINESS_ADDRESS"));

  // United States (US)
  const usReq = await IdentityVerificationService.getRequirements("BUSINESS", "US");
  assert.equal(usReq.country, "US");
  assert.ok(usReq.supportedIdentifierTypes.includes("EIN"));
  assert.ok(usReq.supportedIdentifierTypes.includes("STATE_BUSINESS_ID"));
  assert.ok(usReq.supportedBusinessTypes.includes("LLC"));
  assert.ok(usReq.supportedBusinessTypes.includes("C_CORP"));

  // United Kingdom (GB)
  const gbReq = await IdentityVerificationService.getRequirements("BUSINESS", "GB");
  assert.equal(gbReq.country, "GB");
  assert.ok(gbReq.supportedIdentifierTypes.includes("CRN"));
  assert.ok(gbReq.supportedIdentifierTypes.includes("VAT_NUMBER"));

  // Australia (AU)
  const auReq = await IdentityVerificationService.getRequirements("BUSINESS", "AU");
  assert.equal(auReq.country, "AU");
  assert.ok(auReq.supportedIdentifierTypes.includes("ABN"));
  assert.ok(auReq.supportedIdentifierTypes.includes("ACN"));
});

test("individual identity requirements are distinct from business requirements", async () => {
  const individualReq = await IdentityVerificationService.getRequirements("INDIVIDUAL", "IN");
  assert.equal(individualReq.subjectType, "INDIVIDUAL");
  assert.ok(individualReq.requiredFields.includes("legal_first_name"));
  assert.ok(individualReq.requiredFields.includes("legal_last_name"));
  assert.equal(individualReq.supportedIdentifierTypes.length, 0);

  const businessReq = await IdentityVerificationService.getRequirements("BUSINESS", "IN");
  assert.equal(businessReq.subjectType, "BUSINESS");
  assert.ok(businessReq.requiredFields.includes("registration_number"));
  assert.ok(businessReq.requiredFields.includes("registered_address"));
  assert.ok(businessReq.requiredFields.includes("representative_name"));
});

test("business creation does not verify business or allow bypassing admin review", () => {
  // Creating a business yields NOT_STARTED or DRAFT, never APPROVED
  assert.throws(() => assertVerificationTransition("NOT_STARTED", "APPROVED"));
  assert.throws(() => assertVerificationTransition("DRAFT", "APPROVED"));

  // Proper workflow requires SUBMITTED -> UNDER_REVIEW -> APPROVED
  assert.doesNotThrow(() => assertVerificationTransition("NOT_STARTED", "SUBMITTED"));
  assert.doesNotThrow(() => assertVerificationTransition("DRAFT", "SUBMITTED"));
  assert.doesNotThrow(() => assertVerificationTransition("SUBMITTED", "UNDER_REVIEW"));
  assert.doesNotThrow(() => assertVerificationTransition("UNDER_REVIEW", "APPROVED"));
});

test("admin rejection and additional info cycle", () => {
  assert.doesNotThrow(() => assertVerificationTransition("UNDER_REVIEW", "ADDITIONAL_INFORMATION_REQUIRED"));
  assert.doesNotThrow(() => assertVerificationTransition("ADDITIONAL_INFORMATION_REQUIRED", "SUBMITTED"));
  assert.doesNotThrow(() => assertVerificationTransition("UNDER_REVIEW", "REJECTED"));
  assert.doesNotThrow(() => assertVerificationTransition("REJECTED", "SUBMITTED"));
});

test("reverification transitions when critical identity changes", () => {
  assert.doesNotThrow(() => assertVerificationTransition("APPROVED", "REVERIFICATION_REQUIRED"));
  assert.doesNotThrow(() => assertVerificationTransition("REVERIFICATION_REQUIRED", "SUBMITTED"));
});
