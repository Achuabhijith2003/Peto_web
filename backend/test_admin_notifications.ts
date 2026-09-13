import "dotenv/config";
import {
  getAdminNotificationsService,
  markAdminNotificationReadService,
  markAllAdminNotificationsReadService,
  createAdminNotificationService,
} from "./src/admin/services/adminNotifications.service";

async function runTests() {
  console.log("=== PHASE 9: ADMIN NOTIFICATIONS VERIFICATION TEST ===\n");

  // 1. Fetch initial notifications
  console.log("1. Testing Notifications Listing & Counters...");
  const initial = await getAdminNotificationsService({ limit: 20 });
  console.log(`Found ${initial.notifications.length} total notifications.`);
  console.log(`Unread count: ${initial.unread_count}, Critical count: ${initial.critical_count}`);
  if (initial.notifications.length === 0) {
    throw new Error("Expected initial notifications to be seeded!");
  }
  console.log("✓ Initial notifications retrieved successfully.\n");

  // 2. Test Category & Priority Filtering
  console.log("2. Testing Filtering by Priority & Category...");
  const critical = await getAdminNotificationsService({ priority: "CRITICAL" });
  console.log(`Critical priority notifications: ${critical.notifications.length}`);
  if (critical.notifications.some((n) => n.priority !== "CRITICAL")) {
    throw new Error("Found non-critical notification in critical filter!");
  }

  const reports = await getAdminNotificationsService({ category: "HIGH_PRIORITY_REPORT" });
  console.log(`High priority report notifications: ${reports.notifications.length}`);
  if (reports.notifications.some((n) => n.category !== "HIGH_PRIORITY_REPORT")) {
    throw new Error("Found non-report notification in category filter!");
  }
  console.log("✓ Priority and category filtering verified.\n");

  // 3. Test Anti-Spam / Deduplication Engine
  console.log("3. Testing Anti-Spam & Deduplication Safeguards...");
  const dedupKey = `test_alert_dedup_${Date.now()}`;
  const alert1 = await createAdminNotificationService({
    category: "STORAGE_WARNING",
    priority: "HIGH",
    title: "Bucket Storage Alert",
    message: "Storage bucket exceeded threshold",
    dedup_key: dedupKey,
  });
  console.log(`Created alert 1 (created: ${alert1.created}, id: ${alert1.notification.id})`);
  if (!alert1.created) {
    throw new Error("Alert 1 should have been created!");
  }

  // Attempt to create identical alert immediately (should be suppressed by dedup_key)
  const alert2 = await createAdminNotificationService({
    category: "STORAGE_WARNING",
    priority: "HIGH",
    title: "Bucket Storage Alert",
    message: "Storage bucket exceeded threshold again",
    dedup_key: dedupKey,
  });
  console.log(`Created alert 2 (created: ${alert2.created}, deduplicated: ${!alert2.created})`);
  if (alert2.created) {
    throw new Error("Alert 2 should have been suppressed by anti-spam deduplication!");
  }
  console.log("✓ Anti-spam deduplication verified: repeated alert suppressed.\n");

  // 4. Test Marking Individual Notification as Read
  console.log("4. Testing Single Notification Read Toggle...");
  const targetId = alert1.notification.id;
  const readResult = await markAdminNotificationReadService(targetId, true);
  console.log(`Notification ${targetId} is_read: ${readResult.is_read}, read_at: ${readResult.read_at}`);
  if (!readResult.is_read || !readResult.read_at) {
    throw new Error("Expected notification to be marked as read!");
  }
  console.log("✓ Single mark read verified.\n");

  // 5. Test Marking All Notifications as Read
  console.log("5. Testing Mark All Notifications as Read...");
  const markAllResult = await markAllAdminNotificationsReadService();
  console.log(`Mark all success: ${markAllResult.success}`);

  const postMarkAll = await getAdminNotificationsService({ status: "unread" });
  console.log(`Remaining unread notifications: ${postMarkAll.notifications.length} (expected: 0)`);
  if (postMarkAll.notifications.length !== 0) {
    throw new Error("Expected 0 unread notifications after mark-all-read!");
  }
  console.log("✓ Mark all read verified.\n");

  console.log("=========================================================");
  console.log("🎉 ALL PHASE 9 ADMIN NOTIFICATIONS TESTS PASSED!");
  console.log("=========================================================");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
