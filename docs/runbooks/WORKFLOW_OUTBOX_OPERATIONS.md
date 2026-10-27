# Workflow outbox operations

## Purpose

Approval decisions commit to PostgreSQL before any Teams or email delivery is
attempted. `process-workflow-outbox` leases pending messages, calls the
Power Automate status flow, and records every completed attempt. A failed HTTP
call cannot roll back or duplicate an approval decision.

## Required secrets

Configure these as Supabase Edge Function secrets, never browser variables:

- `POWER_AUTOMATE_CALLBACK_SECRET`: authenticates the Teams approval callback.
- `WORKFLOW_OUTBOX_SECRET`: authenticates scheduled worker invocations.
- `POWER_AUTOMATE_REQUESTER_STATUS_FLOW_URL`: preferred decision-notification
  flow.
- `POWER_AUTOMATE_REQUESTER_MANAGE_FLOW_URL`: temporary fallback destination
  for `request.changes_requested` only.
- `POWER_AUTOMATE_ADMIN_ALERT_FLOW_URL`: dedicated Teams-first GA/Admin alert
  flow.
- `POWER_AUTOMATE_ADMIN_RECIPIENT_EMAIL` and
  `POWER_AUTOMATE_ADMIN_RECIPIENT_NAME`: controlled GA/Admin recipient used
  when the server builds the privacy-minimized notification.
- `APP_BASE_URL`: public application origin used for expiring links.

Use independent random values for the two secrets. Rotate them separately and
update the caller and Edge secret in the same maintenance window.

## Schedule

GitHub Actions workflow `Workflow Outbox Delivery` calls
`POST /functions/v1/process-workflow-outbox` every five minutes and also
supports a manual dispatch. It sends:

```text
x-workflow-secret: <WORKFLOW_OUTBOX_SECRET>
```

Configure the target project as the GitHub Actions repository variable
`SUPABASE_PROJECT_REF`. Keep staging and production repositories or GitHub
environments pointed at their matching Supabase project. The workflow fails
closed when this variable is missing or malformed; it never falls back to a
hardcoded project.

Only one schedule is required. Concurrent invocations are safe because rows are
leased with `FOR UPDATE SKIP LOCKED`. Do not place the secret in a query string.
Keep the same independently generated secret in the GitHub Actions repository
secret `WORKFLOW_OUTBOX_SECRET` and the Supabase Edge Function secret. Rotate
both values in the same maintenance window.

## Power Automate delivery rule

The status flow must:

1. Reject unsupported `schemaVersion` or `event` values.
2. De-duplicate on `delivery.messageId` (also sent as
   `X-Idempotency-Key`) before sending anything.
3. Try the Teams recipient first.
4. Send the email fallback when Teams delivery or identity resolution fails.
5. Return a 2xx response only after one channel accepted the message.
6. Return or expose the workflow run ID header when available.

The Edge worker times out after 10 seconds. A timeout is retried even if the
first workflow run started, which is why flow-level message de-duplication is
mandatory.

## Failure handling

- `failed`: waiting for the next exponential retry.
- `dead_letter`: automatic attempts are exhausted, the final lease expired, or
  Power Automate returned a permanent client error (`400`, `401`, `403`, `404`,
  `410`, or `422`).
- `delivered`: Power Automate returned a successful response.

Admins can call `admin_workflow_delivery_overview` to view message metadata,
attempt counts, correlation IDs, and sanitized errors. The function never
returns the payload or an expiring URL.

After correcting the destination, tenant permission, or flow error, an admin
can call `admin_retry_workflow_delivery(outbox_id)`. This preserves delivery
history and adds eight more attempts. Requeue only after checking the message ID
in Power Automate run history to avoid a duplicate human notification.

Do not repeatedly retry a permanent client error. Correct the payload contract,
credential, URL, or tenant permission first, then use the explicit admin retry.

## Incident checks

1. Find the outbox item by correlation ID or request ID.
2. Confirm its status and last sanitized error in the admin overview.
3. Check Power Automate run history using the correlation ID and message ID.
4. Confirm the flow's de-duplication record before requeueing.
5. If a payload contains an expired management link, issue a fresh link through
   the supported request workflow instead of editing the outbox payload.

Never copy outbox payloads, callback secrets, or signed URLs into tickets or
chat messages.
