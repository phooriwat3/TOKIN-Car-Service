# Phase 6 Batch 1 employee UX verification - 2026-10-24

## Scope

This batch simplifies the no-login employee request and tracking experience
without changing booking data, approval rules, or the Teams/LINE workflow.

## Implemented experience

- The request landing page exposes a clear **Track request** action on desktop
  and mobile.
- `/request/track` accepts the complete secure management link from a company
  email or Teams message and explains how to recover an expired or missing link.
- A request number alone cannot access private employee or trip information.
- The submission success page and secure management page share a four-stage
  status timeline: Request, Approval/OT verification, Assignment, and Trip.
- Each workflow state has a plain-language current status and requester next
  action.
- Rejected, cancelled, and completed states are represented as terminal states.

## Security boundary

- The existing signed management token remains required to load a request.
- The tracker does not query by request number, email address, employee number,
  or other guessable personal information.
- Tokens are not written to local storage or analytics by the new UI.
- No database migration or workflow contract change is included in this batch.

## Verification

- `npm run typecheck` passed.
- Focused Vitest run passed: 4 files and 23 tests.
- Full Vitest regression passed: 18 files and 90 tests.
- `npm run build` passed with Next.js 16.4.2; all 33 static pages
  generated, including `/request/track`.
- Browser checks passed at the default desktop viewport and at 390 x 844.
- Mobile navigation to `/request/track` passed.
- Request-number-only validation displayed the expected privacy-safe error.
- `git diff --check` passed with line-ending notices only.
