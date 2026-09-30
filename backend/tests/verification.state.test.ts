import test from "node:test";
import assert from "node:assert/strict";
import { assertVerificationTransition } from "../src/advertisers/verification/verification.state";

test("submission and review transitions", () => {
  assert.doesNotThrow(() => assertVerificationTransition("NOT_STARTED", "SUBMITTED"));
  assert.doesNotThrow(() => assertVerificationTransition("ADDITIONAL_INFORMATION_REQUIRED", "SUBMITTED"));
  assert.doesNotThrow(() => assertVerificationTransition("UNDER_REVIEW", "APPROVED"));
});

test("users cannot jump to approval and decided applications cannot be overwritten", () => {
  assert.throws(() => assertVerificationTransition("DRAFT", "APPROVED"));
  assert.throws(() => assertVerificationTransition("APPROVED", "REJECTED"));
  assert.throws(() => assertVerificationTransition("REVOKED", "APPROVED"));
});
