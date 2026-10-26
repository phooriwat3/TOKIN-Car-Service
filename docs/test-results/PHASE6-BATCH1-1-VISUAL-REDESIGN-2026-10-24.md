# Phase 6 Batch 1.1 visual redesign verification - 2026-10-24

## Scope

This batch translates the supplied transportation website reference into a
TOKIN-branded employee portal. It changes presentation and navigation only;
the database, request contracts, approval rules, Teams workflows, and driver
LINE process are unchanged.

## Implemented design

- Full-width TOKIN Thailand facility hero with a dark blue contrast overlay.
- Floating service panel with direct actions for OT transport, off-site
  business travel, and secure request tracking.
- Yellow is used as a focused action accent while TOKIN blue remains the
  primary brand color.
- Operational advantages explain no-login access, automatic routing, GA
  assignment, and employee notifications.
- Four-step request-to-trip workflow replaces marketing-oriented ticket cards.
- Practical guidance cards cover the OT cutoff, secure tracking, and help.
- GA Teams and extension 2513 are available in a high-visibility support
  banner.
- The layout preserves the existing secure forms and shared public footer.

## Responsive and accessibility checks

- Default desktop and 390 x 844 mobile layouts were visually reviewed.
- All three primary service links remain visible and usable on mobile.
- Hero copy remains readable over the image at both viewports.
- OT service navigation opened the existing `/request/overtime` form.
- Page landmarks, one primary heading, descriptive image text, link labels,
  and keyboard focus styling are retained.
- No browser console errors were observed.

## Verification

- `npm run typecheck` passed.
- Full Vitest regression passed: 18 files and 90 tests.
- `npm run build` passed with Next.js 16.4.2; all 33 static pages
  generated.
- `git diff --check` passed with line-ending notices only.
