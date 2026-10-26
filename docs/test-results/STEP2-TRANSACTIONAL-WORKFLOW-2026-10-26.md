# Step 2 Transactional Workflow

Date: 2026-10-26
Status: implemented; clean-database execution remains a CI release gate.

## Outcome

Requester changes and cancellations now execute through a single locked
PostgreSQL command. GA also has a dedicated cancellation workflow for approved
or assigned trips, including durable requester/admin notifications and an
audited manual LINE withdrawal for the driver.

## Implemented

### Atomic requester update and cancellation

- Added `public.execute_requester_change(...)` as a service-role-only command.
- Locks the hashed requester token and booking row before checking state.
- Revalidates token expiry, revocation, revision, and permitted status inside
  the transaction, closing the previous read/write race.
- Updates the booking, replaces passenger or OT employee rows, rotates manage
  and approval tokens, and writes the complete revision snapshot atomically.
- Rolls back every mutation if any child row, token, constraint, or history
  write fails.
- Enforces the same active department approver rule used during initial
  submission.
- Edge delivery happens only after the database commits, so a Power Automate
  timeout cannot leave a half-updated request.

### GA cancellation after approval or assignment

- Added `public.admin_cancel_booking(...)`, guarded by the database admin role.
- Requires a cancellation reason and row-locks the booking.
- Permits pre-trip cancellation but refuses in-progress, completed, rejected,
  or already-cancelled trips.
- Advances the revision, revokes stale public links through the existing
  trigger, preserves assignment evidence, and writes revision history.
- Atomically queues `request.cancelled` for the requester.
- When an assignment exists, also queues
  `admin.driver_cancellation_required` for GA.
- The admin booking page now provides the cancellation action and generates a
  privacy-minimized LINE withdrawal for each assigned driver.
- LINE preparation and sent attestations are stored as distinct audit events;
  only `cancellation_sent` means GA confirmed pressing Send.

### UX and documentation

- Requester help now clearly separates self-service cancellation before
  approval from GA-managed cancellation after approval or assignment.
- Off-site and OT guidance use the same rule.
- The Power Automate contract documents both cancellation events and the LINE
  handoff requirement.

## Automated coverage

- TypeScript: passed.
- Vitest: 21 files, 101 tests passed.
- npm dependency audit: 0 known vulnerabilities on the final registry check.
- New pgTAP contract: atomic edit, child replacement, token rotation, revision
  snapshot, and cancellation revocation.
- New pgTAP contract: admin-only cancellation, mandatory reason, preserved
  assignment evidence, two-message outbox fan-out, and LINE sent attestation.
- Edge permission unit tests are configured in CI.
- `git diff --check`: no whitespace errors; repository line-ending warnings
  remain unchanged.

## Release gate still required

The SQL migrations and pgTAP tests could not run locally because Docker
Desktop exhausted the system drive while extracting Supabase images. Before
deployment, the GitHub Actions database job must successfully:

1. start a clean Supabase database;
2. replay all migrations from zero;
3. run every pgTAP database test; and
4. run database lint at warning level.

Do not deploy migrations `202610260001` through `202610260003` until that clean
runner is green.

## Next engineering step

Move requester resubmission approval delivery onto the durable workflow outbox
and register a fresh Teams Adaptive Card action in the same database command.
This removes the remaining direct Power Automate call from the requester update
path and gives resubmissions the same idempotency and retry guarantees as
approval decisions.
