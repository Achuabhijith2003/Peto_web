# Pet lifecycle and custom RBAC rollout

No migrations have been applied to a remote database and nothing has been deployed. Credentials, OAuth and existing system role mappings are unchanged.

## Manual migration

1. Back up the database and confirm migrations through 38 plus the existing admin and pet foundations are present. Compare production columns, foreign keys and grants with migrations 11, 27, 28 and 36. These changes reuse those tables.
2. Run these read-only preflight queries. Resolve inconsistent primary ownership or case-insensitive role duplicates deliberately before proceeding; never pick a new owner automatically.

```sql
select p.id, count(pp.id) filter(where pp.is_primary and pp.status='ACTIVE') as primary_count
from public.pets p left join public.pet_parents pp on pp.pet_id=p.id
where p.status<>'ARCHIVED' group by p.id
having count(pp.id) filter(where pp.is_primary and pp.status='ACTIVE')<>1;
select lower(btrim(name)),count(*) from public.admin_roles group by 1 having count(*)>1;
select count(*) from public.admin_users u join public.admin_roles r on r.id=u.role_id
where u.is_active and r.is_system and r.name='Super Admin';
```

3. In a staging clone, apply `docs/database/40_pet_membership_lifecycle.sql`, then `41_custom_admin_roles.sql`. Each is transactional. Apply each once through the normal migration ledger. Neither resets data nor disables RLS. The partial unique index rejects multiple active primaries; the role index rejects normalized duplicate names.
4. Run the automated checks below and the staging scenarios below. The migration intentionally removes direct client pet/membership writes and all direct admin-table access; these operations must use the authenticated backend. Confirm any other clients follow that contract.
5. During a coordinated maintenance window, drain old backend instances before applying production migrations and releasing the new backend. An old backend can still hard-delete pets using its service key, so do not run mixed old/new instances. Release the admin and mobile changes after the backend.
6. Confirm existing built-in roles/mappings and assignments survived, role counts load, and a custom role can be assigned using the existing Administrators screen. Validate role update audit records and permission changes on a fresh API request.
7. After retention policy approval, schedule a privileged daily database job calling `select public.purge_expired_pets(100);`. No schedule is installed automatically. This function purges expired pet metadata/associations, preserves posts and `media` rows/files, skips locked pets and honors `deletion_hold`. The default minimum retention is 90 days; approve this period against applicable policies before launch. Set `deletion_hold=true` on a tombstone when retention must be extended. File reclamation requires a separate dependency/hold review and the existing storage cleanup workflow; never delete a whole shared storage folder.

## Local checks

```powershell
npm.cmd install --prefix .test-tools --no-save --package-lock=false @electric-sql/pglite@0.5.11
npm.cmd run test:governance --prefix backend
node_modules/.bin/tsx.cmd --test backend/tests/membership_rbac.api.test.ts
npm.cmd run build --prefix backend
npm.cmd run build --prefix admin
# From Mobile/peto_user, with the existing SDK/dependencies available:
dart analyze lib/screens/pets/pet_profile_screen.dart lib/services/api_service.dart
```

The database suite runs the actual SQL migrations against an isolated in-memory PostgreSQL engine and representative foundation tables. It covers caretaker/co-owner removal, primary transfer/leave, deletion, retained content, holds/purge, direct client denial, protected/assigned roles, selected permissions, live permission updates, escalation, and atomic audit. The API suite tests the real permission middleware and RPC error adapters. Local tests do not contact production.

## Staging checks and limits

Use two independent PostgreSQL sessions to race transfer against removal, two transfers, and transfer against deletion. Both lifecycle actions lock the pet first, and a deferred constraint rejects membership changes that orphan a live pet; verify exactly one active primary on every surviving live pet. Repeat concurrent Super Admin demotions and custom-role edits/assignments; governance mutations share an advisory transaction lock. Embedded PostgreSQL queues operations, so the local competing-action test does not prove multi-session lock behavior. Deadlocks caused by legacy invitation updates can abort one transaction safely; retry after refreshing current state.

Verify removal/deletion on Flutter including canceled dialogs, typed DELETE, no eligible transfer recipient, transfer succeeding before a leave request fails, lost responses/retries, profile refresh and feed refresh. Verify admin form validation, grouped permission selection, protected system cards, assigned-role deletion errors and assignment of custom roles. UI interactions have not been exercised on a device/browser in this change.

Previously issued signed media URLs can remain usable until expiry. Existing public media URLs can remain directly accessible; deleting a shared pet removes application access and tags but cannot retract a URL without potentially affecting independent posts. Existing client screens need a refresh to discard already rendered data. Retained `media` rows deliberately continue to protect shared files from deletion.

## Rollback

Prefer a forward fix. Keep the new backend during incident response so service-role hard deletion is not restored. Do not drop tombstone fields, recreate original unsafe grants or delete custom roles/assignments as a rollback. Disable mutation UI/traffic while investigating; retain audit records and tombstones. Each failed migration transaction rolls back its own changes.

## Mobile source delivery

`Mobile/peto_user` is ignored by the parent repository. The two source files are updated in place. `docs/mobile-membership.patch` also contains the exact feature patch so these changes remain reviewable and can be applied in the separately managed Flutter source tree. No global ignore rules were changed.

## Executed verification

Backend TypeScript build and React production build passed. The focused API suite passed 3 tests; the embedded PostgreSQL suite passed 3 scenario groups. Dart analysis of both changed Flutter files reported no issues using the existing package cache. Full repository tests, device/browser interaction and multi-session PostgreSQL concurrency tests were not run.

## Missing helper error while applying migration 40

An earlier version of migration 40 called is_active_pet_parent(uuid,uuid) and
is_pet_connection_viewer(uuid,uuid) from migration 36. Production installations
without those helpers rejected its can_view_pet function with error 42883.

The updated migration 40 evaluates active membership and connections directly in
its SECURITY DEFINER visibility function, with explicit grants. It does not require
those two helpers or overwrite their definitions if they already exist. Its own
named lifecycle policies and triggers are replaced transactionally on a retry;
existing pet rows and unrelated policies are preserved.

After backup and staging validation, run the entire updated file rather than the
old pasted version or selected individual statements. If the entire failed attempt
was run inside its BEGIN/COMMIT transaction, none of its changes were committed.
If the SQL session reports an aborted transaction, issue ROLLBACK first. Existing
primary-owner data must still satisfy the preflight checks above.

This fixes the missing-function dependency, not arbitrary differences in the live
schema. Migration 36 contains other RLS hardening; inspect existing production
policies separately rather than blindly replaying older migrations. Local tests
apply 40 to the migration-27 schema with neither helper installed, verify private
and connection visibility/deletion, and reapply it while preserving existing pets.
All four membership/RBAC database scenario groups passed after this correction.
