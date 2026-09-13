import "dotenv/config";

import {
  getPoliciesService,
  createPolicyDraftService,
  publishPolicyService,
  getDataRequestsService,
  createDataRequestService,
  updateDataRequestStatusService,
  getRetentionPoliciesService,
  updateRetentionPolicyService,
  getComplianceAuditLogsService,
} from "./src/admin/services/adminCompliance.service";

async function runTests() {
  console.log("=== PHASE 7: PETO COMPLIANCE VERIFICATION TEST ===");
  const testAdminId = "abd0bd30-b8ba-42c7-a500-5f1f4ad26e80";

  // 1. Policies Test
  console.log("\n1. Testing Compliance Policies Listing...");
  const initialPolicies = await getPoliciesService();
  console.log(`Found ${initialPolicies.length} initial policies.`);
  if (initialPolicies.length < 6) {
    throw new Error(`Expected at least 6 initial seeded policies, found ${initialPolicies.length}`);
  }

  console.log("\n2. Testing Policy Draft Creation...");
  const draft = await createPolicyDraftService(
    {
      policyType: "TERMS_OF_SERVICE",
      version: "v1.1.0",
      title: "Peto Terms of Service v1.1.0",
      content: "# Peto Terms of Service v1.1.0\n\nUpdated compliance clauses for safety and fair use.",
      summaryOfChanges: "Clarified account safety rules and updated administrative dispute terms.",
    },
    testAdminId
  );
  console.log(`Created draft id: ${draft.id}, version: ${draft.version}, status: ${draft.status}`);
  if (draft.status !== "DRAFT" || draft.version !== "v1.1.0") {
    throw new Error("Draft status or version mismatch");
  }

  console.log("\n3. Testing Policy Publishing & Auto-Archiving...");
  const published = await publishPolicyService(draft.id, testAdminId);
  console.log(`Published policy id: ${published.id}, status: ${published.status}, published_at: ${published.published_at}`);
  if (published.status !== "PUBLISHED") {
    throw new Error("Policy failed to publish");
  }

  const policiesAfterPublish = await getPoliciesService({ policyType: "TERMS_OF_SERVICE" });
  console.log(`TERMS_OF_SERVICE versions found: ${policiesAfterPublish.map((p: any) => `${p.version} (${p.status})`).join(", ")}`);
  const activePublished = policiesAfterPublish.filter((p: any) => p.status === "PUBLISHED");
  if (activePublished.length !== 1 || activePublished[0].id !== draft.id) {
    throw new Error("Old published policy was not replaced/archived properly");
  }

  // 4. Data Requests Test
  console.log("\n4. Testing Data Request Creation...");
  const testRequest = await createDataRequestService(
    {
      userId: "e12d41be-713b-4635-bd41-10145e9ae618",
      requestType: "DATA_EXPORT",
      details: "User requested full JSON archive of profile and posts.",
      verificationStatus: "VERIFIED",
    },
    testAdminId
  );
  console.log(`Created Data Request id: ${testRequest.id}, type: ${testRequest.request_type}, status: ${testRequest.status}`);

  console.log("\n5. Testing Data Request Status Updates (PENDING -> PROCESSING -> COMPLETED)...");
  const processingReq = await updateDataRequestStatusService(
    testRequest.id,
    {
      status: "PROCESSING",
      resolutionNotes: "Admin began archiving user exports.",
    },
    testAdminId
  );
  console.log(`Updated to status: ${processingReq.status}`);

  const completedReq = await updateDataRequestStatusService(
    testRequest.id,
    {
      status: "COMPLETED",
      resolutionNotes: "Archive export generated and securely delivered to user email.",
    },
    testAdminId
  );
  console.log(`Updated to status: ${completedReq.status}, completed_at: ${completedReq.completed_at}`);
  if (completedReq.status !== "COMPLETED" || !completedReq.completed_at) {
    throw new Error("Data request completion status or timestamp missing");
  }

  // 6. Retention Policies Test
  console.log("\n6. Testing Retention Policies Query...");
  const retentionPolicies = await getRetentionPoliciesService();
  console.log(`Found ${retentionPolicies.length} retention policies:`);
  retentionPolicies.forEach((p: any) => console.log(` - ${p.name || p.category}: ${p.retention_days} days (${p.legal_basis || p.description})`));

  console.log("\n7. Testing Retention Policy Update...");
  const targetCategory = "DELETED_MEDIA";
  const updatedRetention = await updateRetentionPolicyService(
    targetCategory,
    {
      retentionDays: 21,
      legalBasis: "Extended quarantine window for storage recovery and DMCA review.",
      autoPurgeEnabled: true,
    },
    testAdminId
  );
  console.log(`Updated ${updatedRetention.name || updatedRetention.category} retention to ${updatedRetention.retention_days} days.`);
  if (updatedRetention.retention_days !== 21) {
    throw new Error("Retention days did not update to 21");
  }

  // 8. Compliance Audit Trail Test
  console.log("\n8. Testing Compliance Audit Trail...");
  const auditResult = await getComplianceAuditLogsService({ limit: 50 });
  console.log(`Total compliance audit logs retrieved: ${auditResult.pagination.total}`);
  auditResult.logs.slice(0, 5).forEach((log: any) => {
    console.log(` [AUDIT] ${log.action} on ${log.resource_type} (Admin ID: ${log.admin_id || "System"})`);
  });

  if (!auditResult.logs || auditResult.logs.length === 0) {
    throw new Error("Expected compliance audit logs to be populated from the above actions");
  }

  console.log("\n>>> ALL PHASE 7 COMPLIANCE TESTS PASSED SUCCESSFULLY! <<<\n");
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
