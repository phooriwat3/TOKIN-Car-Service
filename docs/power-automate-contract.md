# Power Automate integration contract

The web application owns request data and status. Power Automate owns approval/email delivery only.

## Flow A: manager approval

The application will call the Flow trigger with a server-side secret; the trigger URL must never be exposed to the browser.

```json
{
  "event": "request.submitted",
  "requestId": "uuid",
  "requestNo": "CSR-2026-000001",
  "requestType": "overtime",
  "requester": {
    "name": "Narin Srisuk",
    "email": "narin@example.com",
    "department": "Engineering"
  },
  "approver": {
    "id": "uuid",
    "name": "Pimchanok Arun",
    "email": "pimchanok@example.com"
  },
  "summary": {
    "usingDate": "2026-07-20",
    "purpose": "OT production support",
    "employeeCount": 4
  },
  "detailUrl": "https://carservice.tokin.co.th/approvals/uuid",
  "callbackUrl": "https://PROJECT.supabase.co/functions/v1/power-automate-callback"
}
```

Use custom responses `approved`, `rejected`, and `changes_requested`. A comment is required for the last two outcomes.

Callback payload:

```json
{
  "event": "approval.completed",
  "requestId": "uuid",
  "outcome": "approved",
  "comment": "Approved",
  "approverEmail": "pimchanok@example.com",
  "respondedAt": "2026-07-20T10:30:00+07:00"
}
```

## Flow B: assignment notification

After Admin saves the vehicle schedule, the application sends:

```json
{
  "event": "assignment.confirmed",
  "requestId": "uuid",
  "requestNo": "CSR-2026-000001",
  "requesterEmail": "narin@example.com",
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
- Require `x-workflow-secret` on callbacks and compare it server-side.
- Do not put a Supabase service-role key in Power Automate or the browser.
- Validate `requestId`, outcome, approver email, and current status before accepting a callback.
- Store every callback in an audit log and make retries idempotent.
