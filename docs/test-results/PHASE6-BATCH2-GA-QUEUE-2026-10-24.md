# Phase 6 Batch 2 GA operational queue verification - 2026-10-24

## Scope

This batch simplifies the GA booking workspace around the real operating
sequence. It does not change approval authority, booking persistence, email or
Teams delivery, or the GA-to-driver LINE workflow.

## Implemented

- Added one canonical operational-stage model shared by queue counts,
  filtering, assignment eligibility, and smart grouping.
- Replaced mixed status/date/type tabs with the stages `Needs review`, `Ready
  to plan`, `Assigned`, `In progress`, and `Completed`.
- Kept date, department, service type, and assignment state as independent
  filters so GA can combine them without losing the workflow context.
- Made the five summary cards open their matching queue directly.
- Added a clear row action: `Review`, `Assign`, or `Open`, based on the
  request's current operational stage.
- Limited batch selection to requests that are actually ready for assignment.
- Corrected inconsistent `assigned` or `scheduled` records with no fleet
  details by returning them to `Ready to plan`.
- Prevented smart-group suggestions from including requests that are still
  waiting for requester confirmation, department approval, or OT verification.
- Kept the complete in-memory booking set as the primary source while the
  server-pagination migration remains in progress, preventing stage counts
  from being calculated from only the first API page.

## Verification

- TypeScript check passed.
- Full Vitest regression passed: 19 files and 95 tests.
- New operational queue tests cover classification, inconsistent assignment
  recovery, stage counts, stage matching, and assignment eligibility.
- Smart-grouping regression confirms pending approval and verification
  requests are excluded.
- Production build passed with Next.js 16.4.2; all 33 static pages generated.
- The protected GA route continues to redirect an unauthenticated browser to
  the staff sign-in page; security was not bypassed for browser inspection.

## Next Batch 2 work

- Move search, stage filtering, pagination, and aggregate counts fully to the
  server for datasets above 100 requests.
- Add a failed-notification exception queue with safe retry actions.
- Complete authenticated desktop/mobile GA usability verification in staging.
