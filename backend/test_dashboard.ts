import dotenv from "dotenv";
dotenv.config();

import { getDashboardOverviewService } from "./src/admin/services/adminDashboard.service";

async function runDashboardTests() {
  console.log("==================================================");
  console.log("🚀 STARTING ADMIN DASHBOARD (PHASE 4) TEST SUITE");
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
  // TEST 1: Default 30-Day Dashboard Overview Aggregation
  // ----------------------------------------------------
  let overview30d: any = null;
  try {
    overview30d = await getDashboardOverviewService({ range: "30d", refresh: true });
    assert(
      !!overview30d && overview30d.meta.range === "30d" && typeof overview30d.metrics.users.total === "number",
      `Dashboard aggregated metrics for 30d range successfully (Total Users: ${overview30d.metrics.users.total})`
    );
  } catch (err: any) {
    assert(false, `Default dashboard query failed: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 2: Content & Media Storage Metrics Aggregation
  // ----------------------------------------------------
  if (overview30d) {
    const { content, storage, engagement } = overview30d.metrics;
    assert(
      typeof content.totalPosts === "number" &&
        typeof content.totalComments === "number" &&
        typeof storage.totalBytes === "number" &&
        typeof engagement.totalInteractions === "number",
      `Content and storage aggregated: ${content.totalPosts} posts, ${content.totalComments} comments, ${storage.formattedMB} MB storage`
    );
  }

  // ----------------------------------------------------
  // TEST 3: System Infrastructure Health & DB Latency
  // ----------------------------------------------------
  if (overview30d) {
    const health = overview30d.widgets.systemHealth;
    assert(
      health.status === "OPTIMAL" &&
        typeof health.dbLatencyMs === "number" &&
        health.dbLatencyMs >= 0 &&
        Array.isArray(health.services),
      `Infrastructure health verified: Status '${health.status}', Latency ${health.dbLatencyMs}ms, ${health.services.length} active services`
    );
  }

  // ----------------------------------------------------
  // TEST 4: Date Range Filtering (7 Days vs Today)
  // ----------------------------------------------------
  try {
    const overview7d = await getDashboardOverviewService({ range: "7d", refresh: true });
    assert(
      overview7d.meta.range === "7d" && Array.isArray(overview7d.trends.userGrowth),
      `7-day range filter successfully bucketed time-series data (${overview7d.trends.userGrowth.length} points)`
    );

    const overviewToday = await getDashboardOverviewService({ range: "today", refresh: true });
    assert(
      overviewToday.meta.range === "today" && Array.isArray(overviewToday.trends.userGrowth),
      `Today range filter successfully bucketed 24-hour time-series data (${overviewToday.trends.userGrowth.length} points)`
    );
  } catch (err: any) {
    assert(false, `Date range filtering failed: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 5: Custom Date Range Filtering
  // ----------------------------------------------------
  try {
    const customStart = "2026-07-01T00:00:00.000Z";
    const customEnd = "2026-08-01T23:59:59.000Z";
    const customOverview = await getDashboardOverviewService({
      range: "custom",
      startDate: customStart,
      endDate: customEnd,
      refresh: true,
    });

    assert(
      customOverview.meta.range === "custom" && customOverview.meta.startDate === customStart,
      "Custom date range filtering successfully applied bounds"
    );
  } catch (err: any) {
    assert(false, `Custom date filtering failed: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 6: Operational Widgets Population
  // ----------------------------------------------------
  if (overview30d) {
    const { pendingReports, recentAdminActions, recentUsers } = overview30d.widgets;
    assert(
      Array.isArray(pendingReports) && Array.isArray(recentAdminActions) && Array.isArray(recentUsers),
      `Operational widgets populated: ${recentAdminActions.length} audit logs, ${recentUsers.length} recent users`
    );
  }

  // ----------------------------------------------------
  // TEST 7: Server-Side In-Memory Caching (Sub-Second Response)
  // ----------------------------------------------------
  try {
    // 1st call without refresh: should be cached
    const cachedOverview = await getDashboardOverviewService({ range: "30d", refresh: false });
    assert(
      cachedOverview.cached === true,
      `Server-side cache hit verified: Served from in-memory cache (${cachedOverview.cacheAgeSeconds}s old)`
    );

    // 2nd call with refresh: should bypass cache
    const freshOverview = await getDashboardOverviewService({ range: "30d", refresh: true });
    assert(
      freshOverview.cached === false,
      "Manual refresh verified: Bypassed cache and re-aggregated database"
    );
  } catch (err: any) {
    assert(false, `Cache verification failed: ${err.message}`);
  }

  console.log("\n==================================================");
  console.log(`📊 TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runDashboardTests().catch((e) => {
  console.error("Test runner encountered an unhandled exception:", e);
  process.exit(1);
});
