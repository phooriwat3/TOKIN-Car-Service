# Phase 5 Teams and driver LINE rollout

## Goal

Extend the validated Phase 4 delivery pattern to employees and GA/Admin without
building one large flow. Contractor drivers do not use Microsoft Teams; GA
sends a reviewed dispatch message through ordinary LINE chat. PostgreSQL
remains the workflow owner, and Power Automate owns Teams delivery and email
fallback only.

## Flow boundaries

Use two independently deployable Power Automate flows and one GA-controlled
LINE handoff:

1. **Requester lifecycle**: confirmation, confirmed, approval decision,
   changes requested, assignment confirmed, and requester reminders.
2. **GA/Admin alerts**: requests ready for planning and workflow exceptions.
   Cards use secure web links; assignment remains in the GA workspace.
3. **Driver dispatch**: after saving the assignment, GA previews and copies or
   opens a Thai dispatch message in LINE. GA selects the driver chat and presses
   Send; no Teams identity, LINE Login, or driver application is required.

Every Power Automate flow must validate `schemaVersion`, `event`, `audience`, recipient email,
and `delivery.messageId` when the event came from the outbox. Reject unsupported
events before calling a connector.

## Shared payload

Use `docs/power-automate/phase5-audience-notification-schema.json`. The server
supplies a ready-to-send `adaptiveCard`, `emailSubject`, and `emailBodyHtml`.
The flow must not construct business state, authorization data, or signed URLs.

For outbox messages, de-duplicate on `delivery.messageId` before sending. A
successful duplicate returns 2xx without posting a second Teams card or email.

## Delivery policy

- Try Teams first using `recipient.email`.
- Use `string(triggerBody()?['adaptiveCard'])` for the card JSON.
- Send `emailSubject` and `emailBodyHtml` only when Teams delivery or recipient
  resolution fails, is skipped, or times out.
- Return 2xx only after one channel accepted the message.
- Keep a co-owner and document both Teams and Outlook connections.
- Never store a Supabase service-role key, raw signed token, or callback secret
  in card data or flow notes.

## Audience privacy limits

| Audience | Included | Excluded from card |
| --- | --- | --- |
| Requester | Own request number, schedule, route, outcome, secure self-service link | Other employee data, internal workflow metadata |
| GA/Admin | Request number, requester name/department, schedule, route, exception | Personal phone numbers, raw tokens |
| Driver LINE dispatch | Schedule, route, assigned passenger names, operational phone numbers, vehicle and GA instructions | Employee IDs, purpose, approval comments, cost or workflow metadata |

Driver contact data is shown only to GA. The prepared LINE message contains only
the assigned passengers needed for that trip. The audit table records the GA
action and booking IDs, never the LINE message body or passenger details.

## Current implementation checkpoint

- Shared version 1.4 mobile-safe card builders exist for requester
  confirmation/status, GA/Admin alerts, assignment confirmation, driver offer,
  reminders, and escalations.
- Request submission, requester confirmation, approval decision, signed-link
  decision, and assignment notification now include the shared versioned
  envelope and ready-to-send card.
- Approved and rejected decisions now include link-free email fallback content;
  changes requested keeps the expiring management link.
- GA/Admin delivery is enabled for the approved staging recipient. Driver Teams
  delivery remains disabled permanently because contractor drivers use LINE.
- The GA assignment screens require a saved assignment before enabling LINE
  copy/open actions. Both actions write privacy-minimized audit metadata.
- Batch 1 was deployed on 2026-10-24. The deployed versions and verification
  evidence are recorded in `docs/test-results/PHASE5-BATCH1-2026-10-24.md`.
- The company-tenant requester-manage and assignment flows now use Teams-first
  delivery with email fallback. Controlled tests to the approved test recipient
  succeeded and returned HTTP 200.

## Rollout tests

For every Teams event verify:

1. Correct Teams recipient and mobile rendering.
2. Email fallback after Teams failure.
3. Duplicate `delivery.messageId` suppression.
4. Expired link behavior.
5. No PII beyond the audience allow-list.
6. Outbox attempt and sanitized failure evidence.
7. Co-owner recovery after connection replacement.

For driver LINE dispatch verify that assignment is saved first, the Thai
message contains only assigned passengers, purpose and employee IDs are absent,
the deep link is encoded, and copy/open actions produce audit metadata without
storing the message body.

## Rollback

Disable one audience flow or clear only its server-side destination secret.
Signed web links and email fallback remain the recovery path. Do not change
booking state in Power Automate and do not edit outbox payloads manually.
