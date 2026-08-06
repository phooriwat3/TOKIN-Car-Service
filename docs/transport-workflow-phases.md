# Transport workflow implementation phases

The portal treats Tiger Space as the source of truth for OT. TOKIN Transport
records only employees who require transportation and GA's daily arrangement.

## Phase 1 — Backend foundation (implemented)

- Add Tiger Space source/reference fields to transport requests.
- Store daily vehicle and driver details as manual transport units.
- Provide one transactional `assign_booking_manual` RPC for both request types.
- Require every OT passenger requesting transport to be assigned exactly once.
- Keep legacy vehicle/driver records readable for historical bookings.

Deployment: apply
`supabase/migrations/202608040001_transport_only_daily_assignment.sql` before
deploying the updated Edge Functions.

## Phase 2 — Requester and GA experience (implemented)

- OT form is transport-only and requires Tiger Space confirmation.
- OT requests bypass duplicate department OT approval and enter a separate
  Tiger Space verification queue.
- Employees may request transport after submitting OT; they do not wait for OT
  approval before the transport cutoff.
- GA may plan pending requests, but transport cannot be confirmed until HR/GA
  matches employee number, OT date, and OT time against the approved report.
- A report miss remains pending because Tiger Space approval may arrive after
  the transport-request cutoff.
- Outside-company requests retain department approval.
- GA enters the actual vehicle, provider, driver, and phone for each service day.
- GA assigns every passenger to one of the daily vehicles.
- Assignment pages and email notifications understand daily passenger groups.

## Phase 3 — Operational hardening (next)

- Import the Tiger Space normal-OT report in its native .xls or .xlsx format.
- Parse report date (D), employee number/name (E), department (G), start time
  (R), end time (U), duration (W), and note (AA).
- Match employee number + OT date + start/end time. Exact matches are
  preselected, while missing/duplicate/time-mismatch rows remain for HR review.
- Require HR to confirm that the file contains approved OT and press the final
  confirmation button; importing a file never approves transport automatically.
- Add a separate final-confirmation deadline; approvals after that deadline
  become manual exceptions and transport is not guaranteed.
- Replace multi-step public mutations with transactional database RPCs.
- Add notification outbox, retry, and manual resend controls.
- Add realtime/refocus refresh for the GA queue.
- Add business-day validation and configurable request cutoff times.
- Add database-level protection against duplicate daily vehicle/driver entries.

## Phase 4 — Cleanup and reporting (next)

- Remove legacy vehicle/driver master pages after historical-data verification.
- Remove the driver portal if GA remains responsible for trip completion.
- Add a daily dispatch board grouped by date, end time, and drop-off area.
- Add Tiger Space verification and transport-only metrics to exports.
- Add automated workflow, RLS, and migration tests plus CI.
