# Phase 6 Batch 2.2 server queue and UI verification - 2026-10-25

## Scope

This batch finishes the first enterprise GA queue pass by moving queue reads
and filters to the authenticated server API, exposing the existing secure
workflow retry controls, and visually aligning the GA workspace with the TOKIN
employee home page.

## UI and UX alignment

- The GA booking workspace now uses the TOKIN Thailand facility image, dark
  blue overlay, amber primary action, and floating service-card composition
  used by the employee landing page.
- The operational version stays compact: the hero explains the current task,
  while five cards open Needs review, Ready to plan, Assigned, In progress,
  and Completed queues directly.
- Queue tabs, filters, table actions, loading feedback, errors, and pagination
  use the shared TOKIN card and button system.
- Mobile layouts preserve horizontal access to all workflow stages and keep
  the primary OT creation action at least 44 pixels high.

## Server-backed queue

- Authenticated GA pages request 25 mapped booking records at a time.
- Stage, department, search, date range, service type, assignment state,
  urgency, and OT verification filters execute in the server route.
- The route validates paging and enum inputs, caps page size at 100, and
  removes PostgREST control characters from search text.
- Database rows are mapped into the application Booking contract before being
  returned to the browser.
- Stage totals are calculated independently from the current page so dashboard
  counts remain accurate beyond 100 requests.
- Demo mode keeps using its local dataset and does not call the protected API.

## Delivery exception handling

- The GA workspace shows a healthy state when the latest workflow events have
  no failures.
- Failed and dead-letter email or Teams workflow events can be expanded and
  reviewed without exposing message payloads or secure links.
- Queue retry calls the existing `admin_retry_workflow_delivery` database
  function, which checks the signed-in admin role and only accepts failed or
  dead-letter events.
- Retry returns the event to the existing outbox worker; it does not deliver
  directly from the browser.

## Verification

- TypeScript check passed.
- Full Vitest regression passed: 20 files and 98 tests.
- Booking-query tests cover pagination caps, supported filters, invalid input,
  and search sanitization.
- Production build passed with Next.js 16.4.2; all 33 static pages generated.
- `git diff --check` passed after normal Windows line-ending notices.
- The public TOKIN landing page remains responsive with no horizontal overflow.
- The GA route correctly redirects the available unauthenticated browser
  session to staff sign-in. Authenticated visual review still requires a valid
  administrator session and was not bypassed.
