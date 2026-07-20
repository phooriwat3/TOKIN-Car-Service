# TOKIN Transport - Public request and email approval

## Roles

- Public requester: no account. Opens `/request`, chooses OT transportation or an outside-company trip, and submits the form.
- Approver: no account. Receives an approval email and chooses Approve or Reject.
- Admin: the only Supabase Auth account. Signs in at `/admin/login`, plans a vehicle/driver while approval is pending, and confirms the assignment after approval.

## Workflow

1. The browser calls the public `public-submit-request` Edge Function.
2. The function validates and rate-limits the request, then inserts it using the service role.
3. The function calls the approval-email flow with the request details and callback URL.
4. The approval flow sends the decision to `approval-callback` with the callback secret.
5. Approved requests unlock Admin's Confirm assignment action.
6. Confirm assignment calls `notify-requester-assignment`.
7. The assignment-email flow sends the vehicle, driver, pickup point, date, and time to the requester email.

## Supabase deployment

Apply migrations in order, then deploy:

```bash
supabase db push
supabase functions deploy search-company-users
supabase functions deploy public-submit-request
supabase functions deploy approval-callback
supabase functions deploy notify-requester-assignment
```

Create these Edge Function secrets:

```text
POWER_AUTOMATE_USER_SEARCH_FLOW_URL
POWER_AUTOMATE_APPROVAL_FLOW_URL
POWER_AUTOMATE_ASSIGNMENT_EMAIL_FLOW_URL
POWER_AUTOMATE_CALLBACK_SECRET
```

The Power Automate approval flow must POST this header to the callback:

```text
x-tokin-callback-secret: <same value as POWER_AUTOMATE_CALLBACK_SECRET>
```

Callback JSON:

```json
{
  "requestId": "<requestId from the trigger payload>",
  "outcome": "Approve",
  "comments": "",
  "approverName": "Manager name",
  "approverEmail": "manager@company.com"
}
```

Accepted outcomes are `Approve` and `Reject`. Rejection requires comments.

## Admin account

Create the Admin user in Supabase Authentication, then set the matching `profiles.role` to `admin`. Public requesters and approvers must not be created in Authentication.
