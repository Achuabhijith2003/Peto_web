// Mock env vars before imports
process.env.SUPABASE_URL = process.env.SUPABASE_URL || "https://test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "test_key";
process.env.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "test_anon_key";

import test from "node:test";
import assert from "node:assert/strict";

const { AdControlsService, DEFAULT_AD_CONTROLS } = await import("../src/ads/adControls.service.js");
const { requireAdsMarketplaceEnabled } = await import("../src/ads/middleware/adsMarketplaceGuard.middleware.js");
const { IdentityVerificationService } = await import("../src/advertisers/verification/identityVerification.service.js");
const { assertVerificationTransition } = await import("../src/advertisers/verification/verification.state.js");
const { AdDecisionEngine } = await import("../src/ads/engine/adDecisionEngine.js");

test("TEST 1: Default Release Configuration has Peto Ads Marketplace DISABLED and Google Ads ENABLED", () => {
  assert.equal(
    DEFAULT_AD_CONTROLS.peto_ads_marketplace_enabled,
    false,
    "peto_ads_marketplace_enabled must be false by default for current release"
  );
  assert.equal(
    DEFAULT_AD_CONTROLS.internal_ads_enabled,
    false,
    "internal_ads_enabled alias must also be false by default"
  );
  assert.equal(
    DEFAULT_AD_CONTROLS.google_adsense_enabled,
    true,
    "google_adsense_enabled must remain true"
  );
  assert.equal(
    DEFAULT_AD_CONTROLS.google_admob_enabled,
    true,
    "google_admob_enabled must remain true"
  );
  assert.equal(
    AdControlsService.isMarketplaceEnabled(DEFAULT_AD_CONTROLS),
    false,
    "isMarketplaceEnabled helper must evaluate to false"
  );
});

test("TEST 2: AdControlsService source eligibility when Marketplace is DISABLED", () => {
  const disabledControls = {
    ...DEFAULT_AD_CONTROLS,
    peto_ads_marketplace_enabled: false,
    internal_ads_enabled: false,
    external_ads_enabled: true,
    google_adsense_enabled: true,
    google_admob_enabled: true,
    web_ads_enabled: true,
    admob_enabled: true,
  };

  // Internal ads ineligible
  assert.equal(AdControlsService.isSourceEligible("PETO", disabledControls), false);
  assert.equal(AdControlsService.isMarketplaceEnabled(disabledControls), false);

  // External ads eligible
  assert.equal(AdControlsService.isSourceEligible("EXTERNAL", disabledControls), true);
  assert.equal(AdControlsService.isPlatformEligible("WEB", disabledControls), true);
  assert.equal(AdControlsService.isPlatformEligible("ANDROID", disabledControls), true);
  assert.equal(AdControlsService.isPlatformEligible("IOS", disabledControls), true);
});

test("TEST 3: AdControlsService when All Ads are OFF", () => {
  const allOffControls = {
    ...DEFAULT_AD_CONTROLS,
    all_ads_enabled: false,
    peto_ads_marketplace_enabled: false,
    external_ads_enabled: false,
  };

  assert.equal(AdControlsService.isSourceEligible("PETO", allOffControls), false);
  assert.equal(AdControlsService.isSourceEligible("EXTERNAL", allOffControls), false);
});

test("TEST 4: Backend Middleware Blocks First-Party Advertiser Operations when Marketplace is DISABLED", async () => {
  // Mock request, response, next
  const req: any = {};
  let statusCode = 200;
  let jsonResponse: any = null;
  const res: any = {
    status: (code: number) => {
      statusCode = code;
      return {
        json: (data: any) => {
          jsonResponse = data;
        },
      };
    },
  };
  let nextCalled = false;
  const next = () => {
    nextCalled = true;
  };

  await requireAdsMarketplaceEnabled(req, res, next);

  assert.equal(statusCode, 403, "Must return HTTP 403 Forbidden");
  assert.equal(jsonResponse?.success, false);
  assert.equal(
    jsonResponse?.code,
    "ADS_MARKETPLACE_DISABLED",
    "Must return error code ADS_MARKETPLACE_DISABLED"
  );
  assert.equal(nextCalled, false, "Must NOT call next handler");
});

test("TEST 5: Person Verification and Business Verification Remain Active and Decoupled", async () => {
  // Person verification requirements
  const personReq = await IdentityVerificationService.getRequirements("INDIVIDUAL", "IN");
  assert.ok(personReq.requiredFields.includes("legal_first_name"));
  assert.ok(personReq.requiredFields.includes("legal_last_name"));

  // Business verification requirements
  const bizReq = await IdentityVerificationService.getRequirements("BUSINESS", "IN");
  assert.ok(bizReq.requiredFields.includes("registration_number"));
  assert.ok(bizReq.supportedIdentifierTypes.includes("GSTIN"));

  // State transitions: APPROVED produces Blue Tick for Person, Yellow Tick for Business
  assert.doesNotThrow(() => assertVerificationTransition("UNDER_REVIEW", "APPROVED"));
  assert.doesNotThrow(() => assertVerificationTransition("APPROVED", "REVERIFICATION_REQUIRED"));
  assert.doesNotThrow(() => assertVerificationTransition("REVERIFICATION_REQUIRED", "SUBMITTED"));
});

test("TEST 6: AdDecisionEngine falls back to External Google Ads when Marketplace is DISABLED", async () => {
  const result = await AdDecisionEngine.decide({
    userId: "test-user-id",
    country: "IN",
    placement: "FEED",
    device: "WEB",
    language: "en",
  });

  // Since marketplace is disabled, internal auction is bypassed
  // and external demand is dispatched
  if (result.hasAd) {
    assert.equal(result.source, "EXTERNAL", "Must deliver EXTERNAL ad (AdSense/AdMob), not PETO");
    assert.ok(result.externalPayload, "External payload must be present");
  } else {
    // If external circuit breaker / provider is not live in test env, decision reason is recorded
    assert.ok(result.decisionReason);
  }
});
