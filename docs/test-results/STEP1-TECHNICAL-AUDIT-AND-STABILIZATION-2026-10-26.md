# Step 1 Technical Audit and Stabilization

Date: 2026-10-26
Scope: application architecture, frontend, backend, database, workflow integrations, security, build reproducibility, and deployment readiness.

## Executive result

The repository is a viable foundation for the transport requisition system. The application builds, its TypeScript and unit-test baselines pass, and no known npm dependency vulnerability was reported. The security model already has good foundations: authenticated internal roles, row-level security, service-role isolation, hashed expiring public-link tokens, workflow audit records, idempotency controls, and an outbox for retriable notifications.

It is not ready for an enterprise production release yet. The clean database migration chain and database security tests could not be certified on this workstation because Docker Desktop exhausted local storage and returned container-layer I/O errors. There are also workflow consistency and transactional-boundary items that should be completed before live use.

No production deployment or production database mutation was performed during this audit.

## System inventory

| Layer | Current implementation | Audit note |
| --- | --- | --- |
| Web application | Next.js 16.4.2, React 19.3.1, TypeScript | 38 page/API route files; production build passed before the final health-route refactor |
| UI | Tailwind CSS, MUI, shared project components | Functional shared design system exists; visual consolidation remains a later UX phase |
| Server/API | Next.js route handlers and 15 Supabase Edge Functions | Public signed-link endpoints and authenticated admin endpoints are separated |
| Database | Supabase PostgreSQL with 52 migrations | RLS, restricted functions, audit history, rate limits, lifecycle jobs, workflow outbox |
| Authentication | Supabase authentication for staff/admin; no-login signed links for requester/approver/driver documents | Microsoft login is not required for the requester flow |
| Messaging | Power Automate/Teams email workflows; GA-mediated LINE driver dispatch | Secrets are server-side; LINE remains an audited human handoff |
| Tests | Vitest plus pgTAP SQL tests | 21 Vitest files / 100 tests passed; SQL suite is blocked locally by Docker storage failure |
| Delivery | GitHub Actions CI and scheduled outbox worker | CI now checks all Edge Function entry points; scheduled worker URL is still project-specific |

## Verification evidence

| Check | Result | Detail |
| --- | --- | --- |
| `npm audit` | PASS | 0 known vulnerabilities |
| Unit tests | PASS | 21 files, 100 tests |
| TypeScript | PASS | `tsc --noEmit` passed with a constrained Node heap after Docker memory pressure caused the normal command to terminate without a TypeScript diagnostic |
| Production build | PASS WITH RECHECK | Next.js production build completed and generated 33 application routes before the small health-route refactor; CI must repeat this on a clean runner |
| Diff hygiene | PASS | `git diff --check` found no whitespace errors; line-ending warnings only |
| Edge Function typecheck | CI REQUIRED | Deno is not installed on this workstation; CI is configured to check every Edge Function `index.ts` |
| Clean migration replay | BLOCKED | Supabase image extraction failed due to Docker Desktop/containerd storage I/O errors |
| Database pgTAP tests | BLOCKED | Requires the same local Supabase database stack |
| Database lint | BLOCKED | Requires the same local Supabase database stack |

The blocked database checks are a release gate. They are not evidence of a migration defect, but a release must not infer that the migration chain is valid until the CI database job passes.

## Stabilization completed

1. Added and exactly pinned Supabase CLI `2.122.0`, so database scripts are reproducible on a clean machine.
2. Strengthened `npm run verify` to run typechecking, unit tests, and the production build.
3. Expanded CI Edge Function checks from a partial hard-coded list to every function entry point and added Edge Function permission tests.
4. Aligned the CI Supabase version with the repository dependency.
5. Replaced the health check's unauthorized table read with a data-free, least-privilege `health_check()` RPC.
6. Added unit coverage for the health probe and a pgTAP contract for the database RPC.
7. Added missing deployment-secret documentation for assignment email, OT digest delivery, and OT digest scheduler authentication.
8. Aligned requester edit/cancel permissions with the database token lifecycle. Approved and operational trips can no longer be advertised as editable by the public Edge Functions.

## Security assessment

### Controls confirmed

- The Supabase service-role key is used only in server-side Edge Functions; it is not exposed in browser application code.
- Protected application routes use server-side Supabase session checks and role routing.
- Requester, approver, and assignment-document access uses random tokens stored only as SHA-256 hashes, with expiry, revision binding, revocation, and stale-link invalidation.
- Public submission validates company email domains, includes a honeypot, validates department/approver relationships, and applies database-backed rate limiting.
- Approval callbacks and scheduled workers require dedicated shared secrets.
- Database migrations use RLS, explicit grants/revokes, and `security definer` functions with fixed search paths.
- Workflow actions, revisions, dispatch actions, and exceptional operations have audit structures.

### Priority risks and gaps

#### P1 — release blockers

1. **Clean database certification is incomplete.** Run the full migration replay, pgTAP suite, and database lint in GitHub Actions or a healthy Docker host before release.
2. **Requester update is not atomic.** `public-update-request` changes the booking, dependent rows, tokens, history, and notification state across several calls. A mid-operation failure can leave a partially updated request. Move this command into one locked PostgreSQL RPC, following the existing workflow-command pattern.
3. **Late cancellation workflow is contradictory.** The UI guidance says a requester can cancel an approved/assigned trip through the Manage Link, while the security model intentionally revokes that link at approval. Decide and implement one explicit rule. Recommended: pending requests use self-service cancellation; approved/assigned requests use a GA cancellation action that notifies the requester and invalidates or updates driver dispatch.
4. **Final health change needs clean-runner build confirmation.** Type and unit checks pass, but local disk pressure prevented repeating the full production build after that small change.

#### P2 — hardening before wider rollout

1. The scheduled outbox workflow embeds one Supabase project URL. Move it to a protected GitHub environment variable so staging and production cannot be confused.
2. Several public Edge Functions return permissive CORS headers. Token security prevents ordinary unauthorized access, but an allow-list should be used where cross-origin use is not required.
3. Notification flows depend on Power Automate HTTP contracts. Add contract/smoke tests for success, timeout, duplicate delivery, permanent failure, and retry behavior.
4. Recovery and disaster-recovery documentation contains unverified operational assertions. Confirm actual Supabase plan capabilities, backup retention, restore procedure, owners, and a tested recovery date before treating the document as a control.
5. Some existing UI/document text contains encoding artifacts such as malformed punctuation. Include an encoding sweep in the UI consistency phase.
6. Local full-stack development is storage-heavy. Document minimum free disk/RAM and use a database-only local startup or hosted non-production Supabase project where appropriate.

No P0 remotely exploitable issue was confirmed in this audit.

## Recommended implementation order

1. **Release gate:** run CI on a clean runner; require all code and database jobs to pass.
2. **Database command safety:** implement an atomic requester update/cancel RPC with row locking, revision checking, child-row replacement, token rotation, history, and outbox insertion in one transaction.
3. **Cancellation policy:** implement the approved/assigned GA cancellation path and driver/LINE redispatch or withdrawal audit.
4. **Environment promotion:** separate development, staging, and production configuration; remove the hard-coded workflow worker URL.
5. **Integration verification:** test Power Automate/Teams delivery and failure recovery with non-production recipients before production rollout.
6. **UI consistency:** standardize every page on the simple transport-ticket flow and shared TOKIN visual components after backend state transitions are fixed.
7. **Production readiness:** complete backup/restore drill, monitoring, alert ownership, privacy retention review, and deployment runbook sign-off.

## Step 1 exit criteria

Step 1 is complete as a repository audit and local application stabilization pass. Production readiness remains conditional on these checks:

- CI code job passes on the final commit.
- All migrations replay from zero.
- pgTAP and database lint pass.
- Staging Power Automate/Teams tests pass.
- The approved/assigned cancellation policy is accepted and implemented.
- A backup/restore procedure is verified against the selected hosting plan.
