# Phase 5 driver LINE dispatch verification - 2026-10-24

## Business workflow

Contractor drivers do not use Microsoft Teams. GA remains responsible for
reviewing an approved request, assigning the actual vehicle and driver, and
sending the prepared trip details to the correct driver chat in LINE.

The application does not claim automatic LINE delivery. It provides three
explicit GA actions after the assignment is saved:

1. **Copy for LINE** copies the reviewed Thai dispatch message.
2. **Open LINE** opens LINE with the encoded message, after which GA selects the
   correct driver chat and presses Send.
3. **Mark as sent** requires a second confirmation click and records GA's human
   attestation only after the message was actually sent in LINE.

## Implemented controls

- LINE actions are disabled until the vehicle and driver assignment is saved.
- Editing a saved assignment disables dispatch until GA saves again.
- Both batch OT and individual off-site assignment screens use the same
  formatter and preview component.
- Messages contain request number, schedule, route, vehicle, driver, assigned
  passenger names, operational phone numbers, stops, and GA instructions.
- Employee IDs, request purpose, approval comments, costs, and workflow secrets
  are excluded.
- `driver_dispatch_events` records booking, transport unit, GA actor, action,
  channel, and time. It does not store the message body or passenger data.
- A `sent` event is an explicit human attestation; it is not presented as proof
  from the LINE platform.
- Only an authenticated admin can record or read dispatch audit events.

## Verification

- Migration `202610240002_driver_line_dispatch_audit.sql` applied remotely.
- Migration `202610240003_driver_dispatch_sent_attestation.sql` applied
  remotely.
- `npm run typecheck` passed.
- `npm run build` passed with Next.js 16.4.2.
- Focused tests: 3 files and 18 tests passed.
- LINE formatter tests cover Thai content, passenger contact, capacity,
  purpose/work-description exclusion, and URL encoding.
- `git diff --check` passed for the implementation files.

## Manual staging gate

Use an assigned staging request and a controlled LINE chat. GA must verify the
preview, press **Open LINE**, select the intended driver chat, and visually
confirm the final message before pressing Send. This human recipient check is
intentional because the system does not own contractor LINE identities.
