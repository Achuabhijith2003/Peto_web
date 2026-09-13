import "dotenv/config";

import {
  getAdvertisersService,
  getAdvertiserDetailService,
  createAdvertiserService,
  updateAdvertiserStatusService,
  getCampaignsService,
  getCampaignDetailService,
  createCampaignService,
  updateCampaignStatusService,
  getPendingReviewQueueService,
  reviewCampaignActionService,
  getAdsAnalyticsSummaryService,
} from "./src/admin/services/adminAds.service";
import { getAuditLogsService } from "./src/admin/services/adminAudit.service";

async function runAdsTests() {
  console.log("=== PHASE 8: PETO ADVERTISING PLATFORM VERIFICATION TEST ===\n");
  const testAdminId = "abd0bd30-b8ba-42c7-a500-5f1f4ad26e80";

  // 1. Advertisers Test
  console.log("1. Testing Advertisers Listing & Detail...");
  const initialAdvertisers = await getAdvertisersService();
  console.log(`Found ${initialAdvertisers.advertisers.length} initial advertisers.`);
  if (initialAdvertisers.advertisers.length < 3) {
    throw new Error(`Expected at least 3 seeded advertisers, found ${initialAdvertisers.advertisers.length}`);
  }

  const advDetail = await getAdvertiserDetailService(initialAdvertisers.advertisers[0].id);
  console.log(`Verified advertiser detail: ${advDetail.company_name} (Status: ${advDetail.status}, Balance: $${advDetail.balance})`);

  console.log("\n2. Testing Advertiser Registration & Status Modification...");
  const createdAdv = await createAdvertiserService(
    {
      companyName: "Canine Supreme Natural Chews",
      contactName: "David Miller",
      contactEmail: "dmiller@caninesupreme.com",
      websiteUrl: "https://caninesupreme.com",
      industry: "PET_FOOD",
      initialBalance: 1200,
    },
    testAdminId
  );
  console.log(`Created advertiser: ${createdAdv.company_name} (ID: ${createdAdv.id})`);

  const updatedAdv = await updateAdvertiserStatusService(createdAdv.id, "SUSPENDED", testAdminId);
  console.log(`Updated advertiser status to: ${updatedAdv.status}`);
  if (updatedAdv.status !== "SUSPENDED") {
    throw new Error("Failed to suspend advertiser");
  }

  // 2. Campaigns & Creatives Creation Test
  console.log("\n3. Testing Campaign Creation with Targeting & Creative...");
  const newCamp = await createCampaignService(
    {
      advertiserId: initialAdvertisers.advertisers[0].id,
      name: "Autumn Dog Treats Mega Sale",
      objective: "CONVERSIONS",
      budgetType: "DAILY",
      totalBudget: 2500,
      dailyBudget: 125,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 20 * 86400000).toISOString(),
      targeting: {
        countries: ["US", "CA"],
        petInterests: ["DOGS", "PET_FOOD", "TRAINING"],
        devices: ["IOS", "ANDROID"],
        placements: ["FEED", "REELS"],
      },
      creative: {
        name: "Autumn Dog Chews Bundle Video",
        format: "VIDEO",
        headline: "Healthy Dental Chews Your Pup Will Crave",
        bodyText: "Grain-free, vet recommended dental chews. Buy 2 get 1 free today only.",
        callToAction: "SHOP_NOW",
        destinationUrl: "https://barkandwhiskers.pet/autumn-sale",
        mediaUrls: [
          {
            type: "video",
            url: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
          },
        ],
      },
    },
    testAdminId
  );
  console.log(`Created Campaign: "${newCamp.name}" (ID: ${newCamp.id}, Status: ${newCamp.status})`);
  if (newCamp.status !== "PENDING_REVIEW") {
    throw new Error(`Expected campaign status PENDING_REVIEW, got ${newCamp.status}`);
  }

  // 3. Pending Review Queue Test
  console.log("\n4. Testing Pending Review Queue...");
  const queueResult = await getPendingReviewQueueService();
  console.log(`Current items in review queue: ${queueResult.queue.length}`);
  const queuedTarget = queueResult.queue.find((c: any) => c.id === newCamp.id);
  if (!queuedTarget) {
    throw new Error("Newly created campaign was not found in review queue");
  }
  console.log(`Verified campaign in queue: "${queuedTarget.name}" with creative: "${queuedTarget.ad_creatives?.[0]?.headline}"`);

  // 4. Review Workflow: Enforce Mandatory Rejection Reason
  console.log("\n5. Testing Rejection Validation (Mandatory Reason)...");
  let caughtError = false;
  try {
    await reviewCampaignActionService(
      newCamp.id,
      {
        action: "REJECT",
        reason: "", // Empty reason should be rejected
      },
      testAdminId
    );
  } catch (err: any) {
    caughtError = true;
    console.log(`Correctly rejected with error: "${err.message}"`);
  }
  if (!caughtError) {
    throw new Error("Expected validation error when rejecting without reason!");
  }

  // 5. Review Workflow: Approval Decision
  console.log("\n6. Testing Campaign Approval Decision...");
  const approvedCamp = await reviewCampaignActionService(
    newCamp.id,
    {
      action: "APPROVE",
    },
    testAdminId
  );
  console.log(`Campaign approved! New status: ${approvedCamp.status}, approved_at: ${approvedCamp.approved_at}`);
  if (approvedCamp.status !== "ACTIVE" || !approvedCamp.approved_at) {
    throw new Error("Approval decision failed to update status to ACTIVE");
  }

  // 6. Campaign Status Toggle (Pause / Resume)
  console.log("\n7. Testing Campaign Status Control (Pause/Resume)...");
  const pausedCamp = await updateCampaignStatusService(newCamp.id, "PAUSED", testAdminId);
  console.log(`Updated campaign status to: ${pausedCamp.status}`);
  if (pausedCamp.status !== "PAUSED") {
    throw new Error("Failed to pause campaign");
  }

  // 7. Ads Analytics Summary Test
  console.log("\n8. Testing Ads Analytics & KPI Calculations...");
  const analyticsSummary = await getAdsAnalyticsSummaryService({ timeframe: "30d" });
  console.log("Analytics Totals:");
  console.log(` - Impressions: ${analyticsSummary.totals.impressions.toLocaleString()}`);
  console.log(` - Reach: ${analyticsSummary.totals.reach.toLocaleString()}`);
  console.log(` - Clicks: ${analyticsSummary.totals.clicks.toLocaleString()}`);
  console.log(` - Avg CTR: ${analyticsSummary.totals.avgCtr}%`);
  console.log(` - Conversions: ${analyticsSummary.totals.conversions}`);
  console.log(` - Spend: $${analyticsSummary.totals.spend}`);
  console.log(`Daily trend data points: ${analyticsSummary.dailyTrends.length}`);

  if (analyticsSummary.totals.impressions <= 0 || analyticsSummary.totals.clicks <= 0) {
    throw new Error("Expected positive metrics in analytics summary");
  }

  // Verify CTR calculation accuracy: (clicks / impressions) * 100
  const expectedCtr = Number(
    ((analyticsSummary.totals.clicks / analyticsSummary.totals.impressions) * 100).toFixed(2)
  );
  if (analyticsSummary.totals.avgCtr !== expectedCtr) {
    throw new Error(`CTR mismatch! Expected ${expectedCtr}%, got ${analyticsSummary.totals.avgCtr}%`);
  }
  console.log(`Verified mathematical accuracy of CTR: ${analyticsSummary.totals.avgCtr}% matches (clicks / impressions * 100).`);

  // 8. Security & Audit Logging Verification
  console.log("\n9. Testing Security & Admin Audit Trail...");
  const auditLogs = await getAuditLogsService({ resourceType: "CAMPAIGN", limit: 10 });
  console.log(`Found ${auditLogs.logs.length} campaign audit logs.`);
  auditLogs.logs.slice(0, 3).forEach((log: any) => {
    console.log(` [AUDIT] ${log.action} on ${log.resource_type} (Admin: ${log.admin_id || log.admin_user_id || "System"})`);
  });

  const hasApprovalAudit = auditLogs.logs.some((l: any) => l.action === "CAMPAIGN_APPROVE");
  if (!hasApprovalAudit) {
    throw new Error("Expected CAMPAIGN_APPROVE action in admin audit logs!");
  }

  console.log("\n>>> ALL PHASE 8 ADVERTISING PLATFORM TESTS PASSED SUCCESSFULLY! <<<\n");
}

runAdsTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
