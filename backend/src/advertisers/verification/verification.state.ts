import { VerificationStatus } from "./verification.types";

const transitions: Record<VerificationStatus, readonly VerificationStatus[]> = {
  NOT_STARTED: ["DRAFT", "SUBMITTED"],
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["UNDER_REVIEW", "APPROVED", "REJECTED", "ADDITIONAL_INFORMATION_REQUIRED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED", "ADDITIONAL_INFORMATION_REQUIRED"],
  ADDITIONAL_INFORMATION_REQUIRED: ["SUBMITTED"],
  APPROVED: ["REVERIFICATION_REQUIRED", "SUSPENDED", "REVOKED", "EXPIRED"],
  REJECTED: ["SUBMITTED"],
  REVERIFICATION_REQUIRED: ["SUBMITTED"],
  SUSPENDED: ["REVOKED", "REVERIFICATION_REQUIRED"],
  REVOKED: ["REVERIFICATION_REQUIRED"],
  EXPIRED: ["REVERIFICATION_REQUIRED"],
};

export function assertVerificationTransition(from: VerificationStatus, to: VerificationStatus): void {
  if (!transitions[from]?.includes(to)) {
    const error: any = new Error(`Verification cannot move from ${from} to ${to}.`);
    error.status = 409;
    throw error;
  }
}
