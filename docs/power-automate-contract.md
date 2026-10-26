# Power Automate integration contract

The web application owns request data, authorization, and status. Power Automate owns Teams/email delivery only. Flow trigger URLs are server-side secrets and must never be exposed to the browser.

Phase 5 audience flows use a common versioned envelope containing
`schemaVersion`, `event`, `audience`, `requestId`, `requestNo`, `recipient`,
`adaptiveCard`, `emailSubject`, and `emailBodyHtml`. Outbox deliveries also add
`delivery.messageId`, `delivery.attempt`, and `delivery.correlationId`. See
`docs/power-automate/phase5-audience-notification-schema.json`.

## Flow A: requester confirmation and management

`POWER_AUTOMATE_REQUESTER_MANAGE_FLOW_URL` receives two event types. The first is sent immediately after public submission:

```json
{
  "schemaVersion": 1,
  "event": "request.confirmation_required",
  "audience": "requester",
  "requestId": "uuid",
  "requestNo": "CSR-2026-000001",
  "requestType": "outside_company",
  "requester": {
    "name": "Narin Srisuk",
    "email": "narin@yageo.com",
    "department": "Engineering"
  },
  "recipient": {
    "name": "Narin Srisuk",
    "email": "narin@yageo.com"
  },
  "confirmationUrl": "https://carservice.tokin.co.th/request/confirm?token=REDACTED",
  "expiresAt": "2026-07-27T10:00:00.000Z",
  "adaptiveCard": { "type": "AdaptiveCard", "version": "1.4" },
  "teamsNotification": {
    "event": "request_confirmation_required",
    "audience": "requester",
    "title": "Confirm your transport request",
    "actionUrl": "https://carservice.tokin.co.th/request/confirm?token=REDACTED"
  },
  "emailSubject": "[Confirm request] CSR-2026-000001",
  "emailBodyHtml": "<html>...</html>"
}
```

After the employee presses **Confirm request**, the same flow receives `event: request.confirmed` with `manageUrl`. The confirmation token becomes the management token, so the raw token is never returned by the public submission API.

## Flow B: manager approval

`POWER_AUTOMATE_APPROVAL_FLOW_URL` is called only after requester confirmation.
It includes `approvalUrl`, the ready-to-send `emailSubject` and
`emailBodyHtml`, and `adaptiveCard` for the assigned department approver. The
card action ID is registered server-side against the booking, workflow version,
recipient, and expiration before the flow is called. A successful HTTP trigger
acceptance records the delivery as `queued`; the flow owns Teams delivery and
email fallback.

Supported approval actions are `approved`, `rejected`, and `changes_requested`. Comments are required for rejection and change requests.

The Adaptive Card must carry an immutable `actionId`, `requestId`,
`expectedVersion`, and `expiresAt`. The flow must read the responder identity
from the Teams connector output; do not copy an editable email field from the
card. Send this versioned callback to `approval-callback` with the
`x-tokin-callback-secret` header:

```json
{
  "schemaVersion": 1,
  "event": "approval.action_submitted",
  "actionId": "teams-card-response-id-or-guid",
  "requestId": "uuid",
  "expectedVersion": 1,
  "expiresAt": "2026-07-20T11:00:00+07:00",
  "action": "approved",
  "comments": "Approved",
  "responder": {
    "name": "Pimchanok Dee",
    "email": "pimchanok@yageo.com",
    "teamsUserId": "connector-provided-user-id"
  }
}
```

The callback accepts `approved`, `rejected`, and `changes_requested`. A retry
with the same `actionId` and body returns success without creating another
decision. Reusing an `actionId` for different content is rejected.

## Flow C: requester decision status

`POWER_AUTOMATE_REQUESTER_STATUS_FLOW_URL` receives version 1 outbox messages
for `request.approved`, `request.rejected`, `request.changes_requested`, and
`request.cancelled`.
The changes-requested message includes the expiring `manageUrl` and a rendered
email template. Configure the flow to try Teams first, then send the supplied
email fallback when Teams delivery fails or the user cannot be resolved.
Approved and rejected messages carry link-free email fallback content; changes
requested carries the expiring requester-management link.

Invoke `process-workflow-outbox` on a recurring schedule with the
`x-workflow-secret` header. The worker uses a 10-second HTTP timeout and an
exponential retry schedule. After eight attempts, the message is moved to
`dead_letter` for administrator review. For a staged migration,
`request.changes_requested` falls back to
`POWER_AUTOMATE_REQUESTER_MANAGE_FLOW_URL` when the new status flow URL is not
configured. Each request includes `delivery.messageId` and the same value in
the `X-Idempotency-Key` header. The flow must suppress a repeated message ID
before posting another Teams card or fallback email; delivery can be retried
after a network timeout even when the first workflow run actually started.
Administrators can inspect sanitized failures with
`admin_workflow_delivery_overview` and requeue a failed or dead-letter item
with `admin_retry_workflow_delivery`; neither function exposes the payload.

`request.cancelled` is created by the transactional GA cancellation command.
It includes the requester recipient, trip summary, and mandatory cancellation
reason. When the trip already has an assignment, the same transaction also
queues `admin.driver_cancellation_required` to the admin alert flow. GA then
sends the generated withdrawal message to the driver in LINE and explicitly
records `cancellation_sent`; preparing or opening LINE is not treated as proof
of delivery.

## Flow D: assignment notification

After Admin saves the vehicle schedule, the application sends:

```json
{
  "schemaVersion": 1,
  "event": "assignment.confirmed",
  "audience": "requester",
  "requestId": "uuid",
  "requestNo": "CSR-2026-000001",
  "requesterEmail": "narin@yageo.com",
  "usingDate": "2026-07-20",
  "pickupTime": "19:00",
  "pickupLocation": "TOKIN Main Office",
  "dropoffLocation": "Bang Na",
  "vehicle": "Toyota Commuter / 1 AB 1234",
  "driver": "Somchai Dee",
  "detailUrl": "https://carservice.tokin.co.th/bookings/uuid"
}
```

## Security

- Store Flow trigger URLs and the shared callback secret in Supabase Edge Function secrets.
- Set `COMPANY_EMAIL_DOMAINS=yageo.com` (or the approved comma-separated list) in Edge Function secrets and keep `NEXT_PUBLIC_COMPANY_EMAIL_DOMAINS` aligned in the web deployment.
- Require `x-tokin-callback-secret` on approval callbacks and
  `x-workflow-secret` on the outbox worker; compare both server-side.
- Do not put a Supabase service-role key in Power Automate or the browser.
- Never write confirmation, approval, or management tokens to logs or run-history notes.
- Validate the contract version, event, action ID, request ID, expected version,
  expiration, action, current state, and connector-provided responder identity.
- The database compares the responder to the active assigned approver (or active
  department approver for OT) before changing state.
- `workflow_actions` is the idempotency/audit evidence. `workflow_outbox` and
  `workflow_deliveries` retain delivery state and sanitized failure details.
- Outbox payloads can contain expiring links and are service-role only. The
  administrator overview function intentionally excludes payload content.
