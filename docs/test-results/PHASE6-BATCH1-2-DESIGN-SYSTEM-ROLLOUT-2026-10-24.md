# Phase 6 Batch 1.2 design-system rollout verification - 2026-10-24

## Scope

This batch applies the TOKIN blue/yellow transport visual system across every
page family without changing database contracts, authorization, approval
rules, Teams notifications, or the GA-to-driver LINE process.

## Shared design rollout

- Public request pages use the same blue top accent, subtle canvas treatment,
  shared header/footer, rounded cards, and mobile-first controls.
- Secure email-link pages for approval, confirmation, management, tracking,
  and driver assignment now visually belong to the same public portal.
- Staff sign-in, password recovery, password reset, and access-denied pages use
  the TOKIN Thailand image with a dark accessible overlay and focused white
  task card.
- Authenticated pages share a dark TOKIN-blue navigation shell, amber active
  indicator, compact breadcrumb header, and responsive mobile drawer.
- Dashboard, All bookings, Daily transport setup, calendar, employee,
  reporting, advanced, booking, and driver pages share branded page headers,
  cards, buttons, and status treatment.
- The Material UI theme and the existing UI primitives now use matching
  radius, border, surface, shadow, and table-header rules.

## Responsive browser review

Representative pages were inspected in the running local application at
desktop and mobile breakpoints:

- `/request`
- `/request/help`
- `/request/track`
- `/request/overtime`
- `/request/car-service`
- `/admin/login`
- `/admin/recover`
- `/access-denied`

No horizontal overflow was detected on the checked mobile pages. Protected
workspace navigation correctly redirected an unauthenticated session to the
staff sign-in page; authentication was not bypassed for visual inspection.

## Verification

- `npm run typecheck` passed.
- Full Vitest regression passed: 18 files and 90 tests.
- `npm run build` passed with Next.js 16.4.2; all 33 static pages generated.
- Responsive browser inspection passed for the representative route set.
- Workflow and persistence behavior remain unchanged by this presentation
  batch.
