# Privileged Account Provisioning and Recovery

This runbook applies to `admin`, `finance`, `executive`, and `auditor` accounts. Employees and department approvers do not receive application accounts; they use the public form and expiring links delivered to their company email or Teams workflow.

## Required controls

- Use a named company email account. Do not create shared or personal-email users.
- Use two authorized operators for role grants and removals: one performs the change and one verifies it.
- Never place the Supabase service-role key in browser code, Power Automate, Teams cards, chat, tickets, or this repository.
- Configure production SMTP before relying on recovery email. Supabase's default mail service is intended for limited testing.
- Add every production and staging recovery URL to the Supabase Auth redirect allowlist:
  - `https://<production-host>/auth/recovery`
  - `https://<staging-host>/auth/recovery`
- Record provisioning, role changes, recovery, suspension, and removal in the company access register.

## Provision an account

1. Verify the request with the system owner and the user's manager.
2. In the correct Supabase project, open **Authentication > Users** and create or invite the user's company email. Do not enable Microsoft/Azure OAuth for this application.
3. After the Auth user is created, run the following in the Supabase SQL editor. Replace the example values and choose only one supported role.

```sql
begin;

update public.profiles
set
  employee_id = '1234567',
  full_name = 'Authorized User',
  role = 'admin', -- admin | finance | executive | auditor
  is_active = true,
  updated_at = now()
where id = (
  select id from auth.users where lower(email) = lower('user@yageo.com')
);

select id, employee_id, full_name, email, role, is_active
from public.profiles
where lower(email) = lower('user@yageo.com');

commit;
```

4. Confirm that exactly one profile was updated. If zero or multiple rows are returned, roll back and investigate.
5. Ask the user to complete password setup through the recovery flow and test only the routes allowed for the assigned role.
6. A second operator verifies that an unauthorized route returns **Access denied**.

## User password recovery

1. The user opens `/admin/recover` and submits their company email.
2. The application always displays the same response, whether or not the account exists, to prevent account discovery.
3. The user opens the recovery email. Supabase exchanges the one-time code at `/auth/recovery` and redirects the authenticated recovery session to `/admin/reset-password`.
4. The user sets a password of at least 12 characters, then signs in again.
5. If the email does not arrive, check the SMTP provider delivery and suppression logs, the company mail quarantine, and the Supabase Auth audit logs. Do not create a second account as a workaround.

## Administrator-assisted recovery

Use this only after verifying the user's identity through the company's approved support process.

1. Confirm the account's Auth user ID and `public.profiles` row match.
2. Confirm `is_active = true` and that the role is still authorized.
3. Trigger a password recovery email from the application or Supabase dashboard. Never ask the user to send a password.
4. Revoke active sessions if compromise is suspected, rotate any affected credentials, and record the incident.
5. If access should be suspended instead, set `is_active = false` before revoking sessions.

## Remove or change access

```sql
begin;

update public.profiles
set role = 'requester', is_active = false, updated_at = now()
where lower(email) = lower('user@yageo.com');

commit;
```

After deactivation, revoke the user's Auth sessions. Delete the Auth user only when the retention and investigation requirements allow it; deactivation preserves ownership and audit references.

## Quarterly review

- Export the active privileged profile list and reconcile it with HR and the application owner.
- Remove dormant or transferred users.
- Verify recovery URLs and SMTP delivery in staging.
- Confirm no Azure/Microsoft OAuth provider is enabled for the application.
- Review denied-route events and unusual recovery activity.
