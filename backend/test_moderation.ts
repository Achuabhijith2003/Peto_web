import dotenv from "dotenv";
dotenv.config();

import {
  createReportService,
  getReportsQueueService,
  getReportDetailService,
  updateReportService,
  executeModerationActionService,
} from "./src/admin/services/adminModeration.service";
import { supabase } from "./src/config/supabase";
import { AdminSessionContext } from "./src/admin/admin.types";

async function runModerationTests() {
  console.log("==================================================");
  console.log("🚀 STARTING CONTENT MODERATION (PHASE 3) TEST SUITE");
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

  // 1. Fetch valid profiles & post for real testing
  const { data: users } = await supabase.from("profiles").select("id, username").limit(3);
  const { data: posts } = await supabase.from("posts").select("id, user_id").limit(1);

  if (!users || users.length < 2) {
    throw new Error("Insufficient sample users to run tests.");
  }

  const reporterId = users[0].id;
  const targetUserId = users[1].id;
  const targetPostId = posts && posts.length > 0 ? posts[0].id : null;

  // Fetch real admin if available
  const { data: realAdmin } = await supabase
    .from("admin_users")
    .select("id, user_id")
    .limit(1)
    .maybeSingle();

  // Mock Admin Sessions
  const fullAdmin: AdminSessionContext = {
    id: realAdmin?.id || undefined as any,
    userId: realAdmin?.user_id || reporterId,
    fullName: "Super Admin Tester",
    username: users[0].username,
    role: { id: "role-1", name: "Super Admin", description: "All perms", is_system: true },
    permissions: ["*"],
    isActive: true,
  };

  const restrictedAdmin: AdminSessionContext = {
    id: realAdmin?.id || undefined as any,
    userId: realAdmin?.user_id || reporterId,
    fullName: "Restricted Mod",
    username: users[0].username,
    role: { id: "role-2", name: "Support", description: "View only", is_system: false },
    permissions: ["reports.view"], // Missing reports.manage, posts.remove, users.ban
    isActive: true,
  };

  // ----------------------------------------------------
  // TEST 1: Report Creation (Valid User Target)
  // ----------------------------------------------------
  let createdUserReport: any = null;
  try {
    createdUserReport = await createReportService({
      reporterId,
      targetType: "user",
      targetId: targetUserId,
      reason: "Harassment and Hate Speech",
      description: "User is sending repeated threatening comments.",
      priority: "HIGH",
    });
    assert(
      !!createdUserReport && createdUserReport.target_id === targetUserId && createdUserReport.status === "PENDING",
      "Report creation on valid user target succeeds with status PENDING"
    );
  } catch (err: any) {
    assert(false, `Report creation on user target failed: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 2: Report Creation (Valid Post Target)
  // ----------------------------------------------------
  let createdPostReport: any = null;
  if (targetPostId) {
    try {
      createdPostReport = await createReportService({
        reporterId,
        targetType: "post",
        targetId: targetPostId,
        reason: "Misinformation / Fake Content",
        description: "Post spreads fabricated news.",
        priority: "MEDIUM",
      });
      assert(
        !!createdPostReport && createdPostReport.target_type === "post",
        "Report creation on valid post target succeeds"
      );
    } catch (err: any) {
      assert(false, `Report creation on post target failed: ${err.message}`);
    }
  }

  // ----------------------------------------------------
  // TEST 3: Invalid Targets Handling
  // ----------------------------------------------------
  try {
    await createReportService({
      reporterId,
      targetType: "user",
      targetId: "00000000-0000-0000-0000-000000000000",
      reason: "Testing invalid target",
    });
    assert(false, "Invalid target was expected to throw an error but succeeded");
  } catch (err: any) {
    assert(
      err.message.includes("does not exist"),
      `Invalid target properly rejected with error: '${err.message}'`
    );
  }

  // ----------------------------------------------------
  // TEST 4: Report Retrieval (Queue Listing & Filtering)
  // ----------------------------------------------------
  try {
    const queue = await getReportsQueueService({
      status: "ALL",
      page: 1,
      limit: 10,
    });
    assert(
      Array.isArray(queue.reports) && queue.reports.length > 0 && typeof queue.metrics.totalCount === "number",
      `Queue listing retrieved ${queue.reports.length} reports with queue metrics`
    );

    const pendingQueue = await getReportsQueueService({
      status: "PENDING",
    });
    const allPending = pendingQueue.reports.every((r) => r.status === "PENDING");
    assert(allPending, "Filtering by status 'PENDING' returns only pending reports");
  } catch (err: any) {
    assert(false, `Queue retrieval failed: ${err.message}`);
  }

  // ----------------------------------------------------
  // TEST 5: Report Detail Hydration
  // ----------------------------------------------------
  const reportToInspect = createdUserReport || createdPostReport;
  if (reportToInspect) {
    try {
      const detail = await getReportDetailService(reportToInspect.id);
      assert(
        detail.report.id === reportToInspect.id && !!detail.targetEntity,
        "Report detail retrieved and target entity successfully hydrated"
      );
    } catch (err: any) {
      assert(false, `Report detail retrieval failed: ${err.message}`);
    }
  }

  // ----------------------------------------------------
  // TEST 6: Report Status & Priority Update (PATCH)
  // ----------------------------------------------------
  if (reportToInspect) {
    try {
      const updated = await updateReportService(
        reportToInspect.id,
        { status: "UNDER_REVIEW", priority: "CRITICAL" },
        fullAdmin
      );
      assert(
        updated.status === "UNDER_REVIEW" && updated.priority === "CRITICAL",
        "Report status updated to UNDER_REVIEW and priority to CRITICAL"
      );
    } catch (err: any) {
      assert(false, `Report update failed: ${err.message}`);
    }
  }

  // ----------------------------------------------------
  // TEST 7: Permission Checks on Moderation Actions
  // ----------------------------------------------------
  if (reportToInspect) {
    try {
      // restrictedAdmin lacks 'reports.manage' and 'users.ban'
      await executeModerationActionService(
        reportToInspect.id,
        {
          action: "BAN_USER",
          reason: "Unauthorized ban attempt",
        },
        restrictedAdmin
      );
      assert(false, "Restricted admin was expected to fail permission check but succeeded");
    } catch (err: any) {
      assert(
        err.message.includes("Insufficient privileges"),
        `Permission enforcement prevented unauthorized action: '${err.message}'`
      );
    }
  }

  // ----------------------------------------------------
  // TEST 8: Moderation Action Execution (Authorized Admin)
  // ----------------------------------------------------
  if (reportToInspect) {
    try {
      const actionResult = await executeModerationActionService(
        reportToInspect.id,
        {
          action: "RESOLVE_REPORT",
          reason: "Content reviewed and determined resolved following policy guidelines.",
        },
        fullAdmin
      );
      assert(
        actionResult.success && actionResult.status === "RESOLVED",
        "Authorized moderation action 'RESOLVE_REPORT' successfully executed and marked RESOLVED"
      );
    } catch (err: any) {
      assert(false, `Moderation action failed: ${err.message}`);
    }
  }

  // ----------------------------------------------------
  // TEST 9: Already-Resolved Reports Guard Check
  // ----------------------------------------------------
  if (reportToInspect) {
    try {
      // Trying to action again without overrideResolved should throw
      await executeModerationActionService(
        reportToInspect.id,
        {
          action: "WARN_USER",
          reason: "Trying to act on closed report",
          overrideResolved: false,
        },
        fullAdmin
      );
      assert(false, "Action on already-resolved report should have thrown error");
    } catch (err: any) {
      assert(
        err.message.includes("already closed"),
        `Already-resolved report guarded against duplicate action: '${err.message}'`
      );
    }
  }

  // ----------------------------------------------------
  // TEST 10: Audit Logging Verification
  // ----------------------------------------------------
  try {
    const { data: auditLogs } = await supabase
      .from("admin_audit_logs")
      .select("id, action, resource_type, resource_id, created_at")
      .eq("resource_type", "report")
      .order("created_at", { ascending: false })
      .limit(5);

    assert(
      Array.isArray(auditLogs) && auditLogs.length > 0,
      `Audit logging verified: Found ${auditLogs?.length} recent moderation audit logs`
    );
  } catch (err: any) {
    assert(false, `Audit log check failed: ${err.message}`);
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

runModerationTests().catch((e) => {
  console.error("Test runner encountered an unhandled exception:", e);
  process.exit(1);
});
