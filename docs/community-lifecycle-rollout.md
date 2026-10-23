# Community lifecycle rollout

This change reuses existing communities, owner_id, community_members, roles, reports, rules, posts, comments and admin_audit_logs. No remote migration or deployment has been performed. Credentials and OAuth configuration are unchanged.

## Implementation scope

The repository already provided a hard-delete endpoint and moderator role management. It mentioned ownership transfer in a leave error, but contained no implemented community transfer handler. This change exposes transfer through the existing member-role endpoint with role=owner; it does not add another ownership or moderation system. Confirm this checkout matches the deployed ownership flow before release, especially if production has additional unpublished code.

## Manual production steps

1. Back up production and restore a staging clone. Compare the actual schema with repository migrations 10 (communities), 11 (RBAC/audit) and 16 (retention). Confirm admin_audit_logs permits admin_id=null and admin_user_id references profiles. Check that posts/comments/community tables have the expected foreign keys and roles owner/moderator/member; resolve inconsistent owner memberships deliberately, without changing production ownership automatically.
2. Inspect owner memberships and retention values using read-only queries:

```sql
select c.id,c.owner_id,m.role,m.status
from public.communities c left join public.community_members m
on m.community_id=c.id and m.user_id=c.owner_id
where m.id is null or m.role<>'owner' or m.status<>'active';
select community_id,user_id from public.community_members m
where role='owner' and not exists(select 1 from public.communities c where c.id=m.community_id and c.owner_id=m.user_id);
select category,retention_days,auto_purge_enabled
from public.compliance_retention_policies
where category in ('DELETED_POSTS','REPORTS','MODERATION_RECORDS');
```

3. Apply `docs/database/42_community_lifecycle.sql` once in staging using the migration ledger. It adds tombstone fields, write guards, transactional governance and RLS visibility restrictions. It does not recreate tables, reset data, remove members/content, delete Storage objects or disable RLS. Any existing tombstones are reconciled onto associated posts. Confirm all clients join and edit via the backend; direct anon/authenticated writes to community and membership tables are revoked to prevent bypassing owner checks.
4. Run the checks below, then test two independent PostgreSQL sessions racing transfer against deletion, two transfers, member departure against transfer, and comment/post insertion against deletion. The isolated test engine queues calls and does not establish multi-session lock behavior. Transactions that encounter deadlocks must fail without partial changes; clients should refresh and retry.
5. Drain old backend processes during a coordinated maintenance window, apply migration 42 to production, and release the new backend before clients. Do not mix old hard-delete servers with new ones. Existing application post queries now require the new column, so coordinate migration and backend release. Release the web build and Android app afterwards. No automatic deployment is included.
6. In staging and production smoke checks, confirm the owner sees deletion, moderators do not; type a wrong name and check disabled submission; test failure and retry; delete and check discovery, joined lists, slug/UUID links, post links, feeds, reels, bookmarks, search and comments. Verify new joins/posts/comments are blocked while unrelated personal/community posting remains available.
7. Transfer via the member menu, refresh both accounts, verify the former owner loses settings/deletion/role permissions and the new owner gains them. Promote and demote active members and verify badges update. Existing public joining and private pending/approval flows must remain intact.

## Retention and cleanup

Deletion hides the community and its discussions immediately but retains posts, comments, profiles, media, memberships, reports, bans and rules. It records a cleanup-review time using the longest configured DELETED_POSTS, REPORTS and MODERATION_RECORDS retention period, with a 90-day fallback if none exist. `deletion_hold=true` marks a tombstone for extended retention. No automatic community purge job is installed.

Do not hard-delete communities or remove storage folders merely because purge_after has passed. Existing foreign keys include communities->posts ON DELETE CASCADE and profiles->owned communities ON DELETE CASCADE. Review these dependencies, user-deletion workflows, outstanding reports, moderation/audit retention and legal holds before any permanent cleanup. Check every media reference across independent posts, pets and other consumers; shared objects must remain. Cleanup requires a separately reviewed operation after all applicable retention periods expire. Audit retention remains governed by the existing audit policy.

Previously issued public media URLs are not retracted by tombstoning a community. The app no longer exposes its posts, but a known shared URL can remain reachable. Existing member devices may retain rendered content until their next refresh; the deleting client invalidates its own community/feed/bookmark state and refreshes reels.

## Local verification

Temporary test tools stay in .test-tools, outside application dependencies:

```powershell
npm.cmd install --prefix .test-tools --no-save --package-lock=false @electric-sql/pglite@0.5.11 jsdom@29.1.1
node backend/tests/community_lifecycle.database.test.mjs
node_modules/.bin/tsx.cmd --test backend/tests/community_lifecycle.api.test.ts backend/tests/upload_retry.test.ts
node_modules/.bin/tsx.cmd --tsconfig Frontend/Peto_user/tsconfig.app.json --test Frontend/Peto_user/tests/communityDelete.test.ts
npm.cmd run build --prefix backend
npm.cmd run build --prefix Frontend/Peto_user
# From Mobile/peto_user with installed dependencies:
flutter test --no-pub test/community_delete_test.dart
```

Database tests execute migrations 10, 11 and 42 against representative foundation tables in isolated PostgreSQL. They cover owner/moderator/member/unrelated authorization, transfer eligibility, former/new owner permissions, role changes, typed-name validation, idempotence, retained content, post visibility, RLS/direct-client denial and rollback on audit failure. API tests check authenticated actor derivation and direct-post exclusion. React DOM and Flutter widget tests cover confirmation, request loading, success and failure/retry. Real browser/device navigation and production-schema/multi-session checks remain staging steps.

The parent repository ignores Mobile/peto_user. Those files are changed in place and packaged in `docs/mobile-community-management.patch` for review and transfer into the Flutter checkout, after the earlier mobile pet/upload patches if using the same baseline.

## Rollback

Prefer a forward fix. Pause mutation traffic while investigating; keep the new backend so old hard-deletion behavior is not restored. Do not drop tombstones, revive communities by clearing fields, discard audits, reset data or restore unsafe client write grants as a rollback. A failed migration transaction rolls back its own changes.

## Executed results

Backend TypeScript and web production builds passed. All 41 web unit tests passed, including both deletion-dialog cases. The community database suite passed 3 scenario groups; the focused backend API and existing pet/post-upload regression selection passed 7 tests. Flutter passed 13 tests (3 deletion widgets plus 10 existing post/pet upload tests), and analysis of the changed community sources reported no issues. The mobile delivery patch was applied to temporary baseline copies and verified against all 7 edited files. No production-schema, live-storage, real-device/browser navigation or independent-session concurrency test was performed.
