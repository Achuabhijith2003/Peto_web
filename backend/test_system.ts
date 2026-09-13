import "dotenv/config";

import {
  getSystemHealthService,
  getApiMetricsService,
  getStorageAnalyticsService,
  getFeatureFlagsService,
  createFeatureFlagService,
  updateFeatureFlagService,
  deleteFeatureFlagService,
  getMaintenanceModeService,
  updateMaintenanceModeService,
} from "./src/admin/services/adminSystem.service";
import { telemetryCollector } from "./src/middleware/telemetry.middleware";
import {
  maintenanceMiddleware,
  setCachedMaintenanceState,
} from "./src/middleware/maintenance.middleware";
import { supabase } from "./src/config/supabase";

async function runSystemTests() {
  console.log("==================================================");
  console.log("🚀 STARTING PETO SYSTEM MANAGEMENT (PHASE 6) TEST SUITE");
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
  // TEST 1: System Health Monitor (9 Monitored Services)
  // ----------------------------------------------------
  try {
    const health = await getSystemHealthService();
    const serviceIds = health.services.map((s) => s.id);
    const expected = [
      "api",
      "database",
      "supabase",
      "storage",
      "auth",
      "realtime",
      "image_processing",
      "video_processing",
      "notifications",
    ];

    const hasAll = expected.every((id) => serviceIds.includes(id));
    assert(
      health && hasAll && health.services.length === 9,
      `System Health: All 9 monitored services verified (Overall status: ${health.overallStatus}, Uptime: ${health.uptimeFormatted})`
    );

    for (const svc of health.services) {
      assert(
        typeof svc.latencyMs === "number" && !!svc.status,
        `  -> Service [${svc.name}]: Status ${svc.status} (${svc.latencyMs}ms) - ${svc.details.slice(0, 40)}...`
      );
    }
  } catch (err: any) {
    assert(false, `System Health test failed: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 2: API Telemetry & Metrics Tracking
  // ----------------------------------------------------
  try {
    // Simulate several requests through the telemetry collector
    telemetryCollector.recordRequest(
      { method: "GET", baseUrl: "/api/posts", path: "", originalUrl: "/api/posts", route: { path: "" }, get: () => "TestAgent", headers: {}, socket: {} } as any,
      { statusCode: 200 } as any,
      12.4
    );
    telemetryCollector.recordRequest(
      { method: "POST", baseUrl: "/api/posts", path: "", originalUrl: "/api/posts", route: { path: "" }, get: () => "TestAgent", headers: {}, socket: {} } as any,
      { statusCode: 201 } as any,
      45.8
    );
    telemetryCollector.recordRequest(
      { method: "GET", baseUrl: "/api/users", path: "/123", originalUrl: "/api/users/123", route: { path: "/:id" }, get: () => "TestAgent", headers: {}, socket: {} } as any,
      { statusCode: 404 } as any,
      18.2
    );

    const metrics = getApiMetricsService();
    assert(
      metrics.summary.totalRequests >= 3 &&
        metrics.summary.status2xx >= 2 &&
        metrics.summary.status4xx >= 1 &&
        typeof metrics.summary.errorRatePct === "number" &&
        metrics.recentRequests.length >= 3,
      `API Telemetry: Monitored ${metrics.summary.totalRequests} requests, Error Rate: ${metrics.summary.errorRatePct}%, Avg Latency: ${metrics.summary.avgLatencyMs}ms`
    );
  } catch (err: any) {
    assert(false, `API Telemetry test failed: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 3: Cloud & Media Storage Analytics
  // ----------------------------------------------------
  try {
    const storage = await getStorageAnalyticsService();
    assert(
      storage &&
        typeof storage.totalStorageBytes === "number" &&
        typeof storage.images.count === "number" &&
        typeof storage.videos.count === "number" &&
        Array.isArray(storage.buckets),
      `Storage Analytics: Total ${storage.totalStorageFormatted} (${storage.images.count} images, ${storage.videos.count} videos, ${storage.buckets.length} buckets)`
    );
  } catch (err: any) {
    assert(false, `Storage Analytics test failed: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 4: Feature Flags Lifecycle & Audit Logging
  // ----------------------------------------------------
  let testFlagId: string | null = null;
  const testFlagKey = `test_flag_${Date.now()}`;
  try {
    // 1. Create Flag
    const created = await createFeatureFlagService({
      key: testFlagKey,
      name: "Automated Test Flag",
      description: "Ephemeral flag for test suite validation",
      isEnabled: false,
    });
    testFlagId = created.id;
    assert(
      created && created.key === testFlagKey && created.is_enabled === false,
      `Feature Flags: Created test flag '${testFlagKey}'`
    );

    // 2. Update/Toggle Flag
    const updated = await updateFeatureFlagService(testFlagId, {
      isEnabled: true,
      description: "Updated description in test",
    });
    assert(
      updated && updated.is_enabled === true,
      `Feature Flags: Toggled flag to enabled state`
    );

    // 3. Verify Audit Log was recorded
    const { data: auditLogs } = await supabase
      .from("admin_audit_logs")
      .select("action, resource_type, resource_id")
      .eq("resource_type", "feature_flag")
      .eq("resource_id", testFlagId);

    assert(
      auditLogs && auditLogs.length >= 2,
      `Feature Flags: Audit log recorded operations (${auditLogs?.map((a) => a.action).join(", ")})`
    );

    // 4. Delete Flag
    const deleted = await deleteFeatureFlagService(testFlagId);
    assert(deleted.success === true, `Feature Flags: Deleted test flag successfully`);
  } catch (err: any) {
    assert(false, `Feature Flags test failed: ${err.message}`);
    // Cleanup if needed
    if (testFlagId) {
      await supabase.from("feature_flags").delete().eq("id", testFlagId).catch(() => {});
    }
  }

  // ----------------------------------------------------
  // TEST 5: Controlled Maintenance Mode & Circuit Breaker
  // ----------------------------------------------------
  try {
    // 1. Fetch initial state
    const initial = await getMaintenanceModeService();
    assert(initial !== undefined, `Maintenance Mode: Initial state retrieved (is_enabled: ${initial.is_enabled})`);

    // 2. Activate Maintenance Mode with custom message
    const customMessage = "Peto is upgrading core database clusters. Please return at 18:00 UTC.";
    const activated = await updateMaintenanceModeService({
      isEnabled: true,
      message: customMessage,
    });
    assert(
      activated.is_enabled === true && activated.message === customMessage,
      `Maintenance Mode: Activated with custom downtime message`
    );

    // 3. Verify Maintenance Circuit Breaker Middleware Behavior
    let client503Received = false;
    let client503Message = "";
    const fakeClientReq: any = {
      path: "/api/posts",
      originalUrl: "/api/posts",
      headers: {},
      socket: {},
    };
    const fakeClientRes: any = {
      status: (code: number) => {
        if (code === 503) client503Received = true;
        return {
          json: (body: any) => {
            client503Message = body.message;
          },
        };
      },
    };
    await maintenanceMiddleware(fakeClientReq, fakeClientRes, () => {});
    assert(
      client503Received && client503Message === customMessage,
      `Maintenance Mode Circuit Breaker: General client traffic blocked with HTTP 503 ('${client503Message}')`
    );

    // 4. Verify Admin Exemption (Admin route must pass through!)
    let adminPassed = false;
    const fakeAdminReq: any = {
      path: "/api/admin/users",
      originalUrl: "/api/admin/users",
      headers: {},
      socket: {},
    };
    await maintenanceMiddleware(fakeAdminReq, fakeClientRes, () => {
      adminPassed = true;
    });
    assert(
      adminPassed === true,
      `Maintenance Mode Admin Exemption: /api/admin/* routes remain accessible during maintenance`
    );

    // 5. Restore live state
    const restored = await updateMaintenanceModeService({
      isEnabled: false,
      message: "Peto is currently undergoing scheduled maintenance. Please check back shortly.",
    });
    assert(
      restored.is_enabled === false,
      `Maintenance Mode: Restored system to live status (is_enabled: false)`
    );

    // 6. Verify Audit Log for Maintenance
    const { data: maintAudit } = await supabase
      .from("admin_audit_logs")
      .select("action, resource_type, resource_id")
      .eq("action", "SYSTEM_MAINTENANCE_TOGGLED");

    assert(
      maintAudit && maintAudit.length >= 2,
      `Maintenance Mode: Audit logs generated for all maintenance state changes (${maintAudit?.length} entries)`
    );
  } catch (err: any) {
    assert(false, `Maintenance Mode test failed: ${err.message}`);
  }

  console.log("\n==================================================");
  console.log(`🏁 TEST SUITE COMPLETED: ${passed} PASSED, ${failed} FAILED`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runSystemTests().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
