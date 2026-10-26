# Phase 4 Teams approval proof of concept

## Scope and success condition

Create one staging Power Automate workflow that sends the generated TOKIN
Adaptive Card to one assigned approver. The card supports Review, Approve,
Reject, and Request changes. The application remains the owner of identity,
authorization, workflow state, idempotency, and audit evidence.

This proof of concept does not require Microsoft login in the TOKIN web
application or an Entra application registration. It does require a workflow
owner who can use the Microsoft Teams and email connectors in the company
tenant.

## Tenant prerequisites

- The Microsoft Teams Workflows app is available to the workflow owner.
- The owner can use **Post adaptive card and wait for a response**.
- The owner can send the approved company email fallback.
- A second trusted employee is added as co-owner.
- Tenant DLP rules permit the Teams, email, and HTTP actions used by the flow.
- One staging approver profile exists in TOKIN with the exact company email
  returned by the Teams connector.

If the interactive action is blocked, keep the existing secure Review URL and
email fallback. Do not weaken the callback identity checks.

## Application configuration

Deploy the Phase 3/4 migrations and Edge Functions, then set:

```text
POWER_AUTOMATE_APPROVAL_FLOW_URL=<staging HTTP-trigger URL>
POWER_AUTOMATE_CALLBACK_SECRET=<independent random secret>
APP_BASE_URL=<HTTPS staging application origin>
```

The approval flow URL and callback secret are Edge Function secrets. Never put
them in `NEXT_PUBLIC_*`, Adaptive Card data, email content, or source control.

## Flow construction

1. Create a staging cloud flow using **When an HTTP request is received**.
2. Paste `docs/power-automate/phase4-approval-trigger-schema.json` into the
   trigger schema. Important fields are `schemaVersion`, `actionId`, `requestId`,
   `expectedVersion`, `expiresAt`, `approver.email`, `approvalUrl`,
   `callbackUrl`, `adaptiveCard`, `emailSubject`, and `emailBodyHtml`.
3. Reject payloads where `schemaVersion` is not `1`, the event is not
   `request.approval_requested`, or the approver email is empty.
4. Return HTTP `202` immediately. The card wait is long-running and must not
   hold open the Edge Function request.
5. Add the current Microsoft Teams action **Post adaptive card and wait for a
   response**:
   - Post as: Flow bot
   - Post in: Chat with Flow bot
   - Recipient: trigger `approver.email`
   - Card: expression `string(triggerBody()?['adaptiveCard'])`
   - Update message: `Decision received. TOKIN Transport is processing it.`
   - Should update card: `Yes`
   - Action timeout: `P1D`
6. Do not use the non-waiting card action for interactive buttons. It supports
   URL navigation but cannot collect `Action.Submit` responses.
7. After the card response, compose the callback body below. Values such as
   `action`, `comments`, `actionId`, and `requestId` come from card response
   data. `responder.email`, `responder.name`, and `responder.teamsUserId` must
   come from Teams connector response metadata or an Office 365 Users lookup,
   never from editable card data.
   - Map `comments` from the shared **Reject / request changes** form. Both
     decisions use the same required input because Teams requires every element
     ID to be unique across the complete card, including nested show cards.
8. POST the callback JSON to `callbackUrl` with Content-Type
   `application/json` and header
   `x-tokin-callback-secret: <POWER_AUTOMATE_CALLBACK_SECRET>`.
9. Configure the callback action with a short timeout and retry policy. Replays
   are safe because `actionId` is the database idempotency key.
10. Put the Teams step and callback in a Try scope. Add a fallback scope with
    **Run after** set to failed, skipped, or timed out. Send `emailSubject` and
    `emailBodyHtml` to `approver.email`. At the one-day timeout the signed review
    link still has roughly one day remaining.

Callback body:

```json
{
  "schemaVersion": 1,
  "event": "approval.action_submitted",
  "actionId": "<card response actionId>",
  "requestId": "<card response requestId>",
  "expectedVersion": 2,
  "expiresAt": "2026-10-24T10:00:00.000Z",
  "action": "approved",
  "comments": "",
  "responder": {
    "name": "<Teams responder display name>",
    "email": "<Teams responder email>",
    "teamsUserId": "<Teams responder user ID>"
  }
}
```

## Mandatory staging scenarios

Record the flow run ID, request number, correlation ID, expected result, actual
result, tester, and timestamp for every scenario.

| # | Scenario | Expected result |
| --- | --- | --- |
| 1 | Card on Teams desktop | Compact TOKIN card renders and Review opens the signed staging page |
| 2 | Card on Teams mobile | Facts wrap without hiding any decision action |
| 3 | Assigned approver approves | One approval, one state transition, one outbox event |
| 4 | Assigned approver rejects with comment | Rejected once; comment stored |
| 5 | Assigned approver requests changes | Management link queued to requester; comment stored |
| 6 | Repeat the same callback/action ID | HTTP success with `alreadyProcessed: true`; no duplicate approval |
| 7 | Reuse action ID with changed content | Rejected as an idempotency conflict |
| 8 | Wrong Teams responder | Rejected; booking remains pending |
| 9 | Stale `expectedVersion` or expired card | Rejected; booking remains unchanged |
| 10 | Teams action fails or waits one day | Fallback email is sent with the secure Review URL |
| 11 | Callback HTTP retry | One transition only; retry succeeds idempotently |
| 12 | Successful submit | Card is replaced with the configured update message |

The first ten API callback cases are prepared in
`docs/test-payloads/phase4-approval-scenarios.example.json`. Copy it outside
source control, replace every placeholder with dedicated staging records, and
run:

```powershell
$env:PHASE4_CONFIRM_STAGING='yes'
$env:PHASE4_STAGING_HOST='STAGING_PROJECT.supabase.co'
$env:PHASE4_CALLBACK_SECRET='<staging secret>'
$env:PHASE4_SCENARIOS_FILE='C:\secure\phase4-approval-scenarios.json'
npm run test:phase4
```

The harness refuses non-HTTPS URLs, host mismatches, fewer than ten cases, or a
missing explicit staging acknowledgement. It never prints the callback secret.

## Ownership and recovery

- Add at least one co-owner and document the owning account.
- Record which owner connection is used for Teams and email.
- Test the flow after password, MFA, or connection changes.
- Rotate the callback secret independently from the trigger URL.
- If the owner leaves, the co-owner replaces connections before removing the
  old owner.
- Export the flow package after the staging scenarios pass and after every
  production change.

Phase 4 is complete only after the tenant-connected scenarios are executed and
the evidence is reviewed. Code generation and local tests alone do not satisfy
the production gate.
