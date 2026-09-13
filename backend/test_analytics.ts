import "dotenv/config";

import {
  getAnalyticsOverviewService,
  getUserAnalyticsService,
  getEngagementAnalyticsService,
  getContentAnalyticsService,
  getReelsAnalyticsService,
  getCommunitiesAnalyticsService,
  getRetentionAnalyticsService,
  getRevenueAnalyticsService,
  trackAnalyticsEventService,
} from "./src/admin/services/adminAnalytics.service";
import { convertToCSV, formatFilename } from "./src/admin/services/adminExport.service";

async function runAnalyticsTests() {
  console.log("==================================================");
  console.log("🚀 STARTING PETO ANALYTICS (PHASE 5) TEST SUITE");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`✅ [PASS]: ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL]: ${testName}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // TEST 1: Section 1 - Overview Analytics
  // ----------------------------------------------------
  try {
    const overview = await getAnalyticsOverviewService({ range: "30d" });
    assert(
      overview &&
        typeof overview.summary.totalUsers === "number" &&
        typeof overview.summary.totalPosts === "number" &&
        Array.isArray(overview.growthTrend),
      `Section 1 (Overview): Aggregated ${overview.summary.totalUsers} users, ${overview.summary.totalPosts} posts, ${overview.growthTrend.length} trend points.`
    );
  } catch (err: any) {
    assert(false, `Section 1 (Overview) failed: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 2: Section 2 - Users & Demographics Analytics
  // ----------------------------------------------------
  try {
    const users = await getUserAnalyticsService({ range: "30d" });
    assert(
      users &&
        typeof users.metrics.dau === "number" &&
        typeof users.metrics.wau === "number" &&
        typeof users.metrics.mau === "number" &&
        Array.isArray(users.platformDistribution) &&
        Array.isArray(users.geographicDistribution),
      `Section 2 (Users): DAU=${users.metrics.dau}, WAU=${users.metrics.wau}, MAU=${users.metrics.mau}, Platforms=${users.platformDistribution.length}.`
    );
  } catch (err: any) {
    assert(false, `Section 2 (Users) failed: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 3: Section 3 - Engagement Analytics
  // ----------------------------------------------------
  try {
    const engagement = await getEngagementAnalyticsService({ range: "30d" });
    assert(
      engagement &&
        typeof engagement.totals.likes === "number" &&
        typeof engagement.totals.comments === "number" &&
        typeof engagement.totals.reelViews === "number" &&
        Array.isArray(engagement.breakdown),
      `Section 3 (Engagement): ${engagement.totals.likes} likes, ${engagement.totals.comments} comments, ${engagement.totals.reelViews} reel views.`
    );
  } catch (err: any) {
    assert(false, `Section 3 (Engagement) failed: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 4: Section 4 - Content & Creators Analytics
  // ----------------------------------------------------
  try {
    const content = await getContentAnalyticsService({ range: "30d" });
    assert(
      content &&
        typeof content.metrics.totalPosts === "number" &&
        typeof content.metrics.postsPerDay === "number" &&
        typeof content.mediaDistribution.ratio === "string" &&
        Array.isArray(content.topCreators),
      `Section 4 (Content): ${content.metrics.totalPosts} posts (${content.metrics.postsPerDay}/day), ratio=${content.mediaDistribution.ratio}, ${content.topCreators.length} top creators.`
    );
  } catch (err: any) {
    assert(false, `Section 4 (Content) failed: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 5: Section 5 - Reels Performance Analytics
  // ----------------------------------------------------
  try {
    const reels = await getReelsAnalyticsService({ range: "30d" });
    assert(
      reels &&
        typeof reels.metrics.totalReels === "number" &&
        typeof reels.metrics.totalViews === "number" &&
        typeof reels.metrics.completionRatePct === "number" &&
        Array.isArray(reels.topReels),
      `Section 5 (Reels): ${reels.metrics.totalReels} reels, ${reels.metrics.totalViews} views, ${reels.metrics.completionRatePct}% completion rate.`
    );
  } catch (err: any) {
    assert(false, `Section 5 (Reels) failed: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 6: Section 6 - Communities Analytics
  // ----------------------------------------------------
  try {
    const communities = await getCommunitiesAnalyticsService({ range: "30d" });
    assert(
      communities &&
        typeof communities.metrics.totalCommunities === "number" &&
        typeof communities.metrics.totalMemberships === "number" &&
        Array.isArray(communities.topCommunities),
      `Section 6 (Communities): ${communities.metrics.totalCommunities} communities, ${communities.metrics.totalMemberships} memberships.`
    );
  } catch (err: any) {
    assert(false, `Section 6 (Communities) failed: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 7: Section 7 - Retention Cohort Matrix
  // ----------------------------------------------------
  try {
    const retention = await getRetentionAnalyticsService({ range: "90d" });
    assert(
      retention &&
        Array.isArray(retention.cohorts) &&
        retention.cohorts.length > 0 &&
        typeof retention.averages.d1 === "number" &&
        typeof retention.averages.d7 === "number" &&
        typeof retention.averages.d14 === "number" &&
        typeof retention.averages.d30 === "number",
      `Section 7 (Retention): ${retention.cohorts.length} cohorts generated. Averages -> D1: ${retention.averages.d1}%, D7: ${retention.averages.d7}%, D14: ${retention.averages.d14}%, D30: ${retention.averages.d30}%.`
    );
  } catch (err: any) {
    assert(false, `Section 7 (Retention) failed: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 8: Section 8 - Revenue & Monetization Readiness
  // ----------------------------------------------------
  try {
    const revenue = await getRevenueAnalyticsService({ range: "30d" });
    assert(
      revenue &&
        revenue.readiness.adsEngineReady === true &&
        typeof revenue.estimates.estimatedMonetizableDAU === "number" &&
        typeof revenue.estimates.estimatedMonthlyRevenueUSD === "number" &&
        Array.isArray(revenue.projections),
      `Section 8 (Revenue): Readiness verified. Estimated Monthly Revenue: $${revenue.estimates.estimatedMonthlyRevenueUSD}, ARPU: $${revenue.estimates.estimatedARPU}.`
    );
  } catch (err: any) {
    assert(false, `Section 8 (Revenue) failed: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 9: Modular Export Service (RFC 4180 CSV Generation)
  // ----------------------------------------------------
  try {
    const sampleData = [
      { id: "1", name: "Test User, with comma", score: 99.5, note: 'Quoted "hello"' },
      { id: "2", name: "Second User", score: 85.0, note: "Normal text" },
    ];
    const csvOutput = convertToCSV(sampleData);
    const filename = formatFilename("users", "csv");

    assert(
      csvOutput.includes('"Test User, with comma"') &&
        csvOutput.includes('"Quoted ""hello"""') &&
        filename.startsWith("peto-analytics-users-"),
      `Modular CSV Export: Properly escaped RFC 4180 formatting. Filename: ${filename}`
    );
  } catch (err: any) {
    assert(false, `CSV Export test failed: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 10: Event Ingestion (trackAnalyticsEventService)
  // ----------------------------------------------------
  try {
    const tracked = await trackAnalyticsEventService({
      eventName: "post_view",
      targetType: "post",
      properties: { test: true, source: "test_suite" },
    });
    assert(
      tracked !== null,
      `Event Ingestion: Handled event tracking gracefully (${JSON.stringify(tracked)})`
    );
  } catch (err: any) {
    assert(false, `Event ingestion failed: ${err.message}`);
  }

  console.log("\n==================================================");
  console.log(`🏁 TEST SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runAnalyticsTests().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
