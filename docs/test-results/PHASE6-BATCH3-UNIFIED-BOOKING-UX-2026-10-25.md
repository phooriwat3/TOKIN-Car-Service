# Phase 6 Batch 3 unified booking UX verification - 2026-10-25

## Scope

This batch makes the employee journey feel like one company transport booking
service instead of several unrelated forms. It keeps the existing request,
approval, OT verification, security-token, and GA planning behavior intact.

## Shared booking language

- OT and off-site request pages use the TOKIN Thailand image with a dark blue
  transport hero.
- The live route strip shows origin, destination, travel date, and time using
  the real form values.
- A shared three-step journey communicates passenger, trip, and review state.
- Submission and confirmation outcomes use a digital company transport ticket
  with the request number and truthful workflow status.
- Tracking and confirmation pages use the same visual hierarchy and terms as
  the request forms.
- Secure request management keeps the live route visible while the employee
  edits an allowed request.
- Approvers review the trip inside the same digital-ticket structure, and the
  assignment page becomes the final ticket with route, vehicle, driver, and
  passenger information.
- The design does not introduce fake fares, seats, QR codes, or public-transit
  functions that the company workflow does not support.

## Verification

- TypeScript check passed.
- Full Vitest regression passed: 20 files and 98 tests.
- `git diff --check` passed after normal Windows line-ending notices.
- Local HTTP checks passed for `/request/car-service`, `/request/overtime`,
  `/request/track`, `/request/confirm`, `/request/manage`, `/request/approve`,
  and `/request/assignment`.
- Desktop browser review passed for the off-site form, tracking page, and
  confirmation page.
- Production build could not complete because the host C: drive reported
  `ENOSPC`. Generated Next.js caches were removed and the existing development
  server was recovered; source files and user data were not removed.
