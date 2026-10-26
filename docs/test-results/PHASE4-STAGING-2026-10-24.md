# Phase 4 Teams approval staging evidence

Date: 2026-10-24 (Asia/Bangkok)

Environment: YAGEO default Power Automate environment and the linked TOKIN
Supabase staging proof of concept. This file intentionally excludes trigger
URLs, callback secrets, raw access tokens, and card payloads.

## Tenant configuration

- Flow: `TOKIN - Request Approval - Phase 4 Staging`
- Flow ID: `590d9961-9ef5-4759-b6f0-6733353205b4`
- Primary owner: Watcharaphong Punupa
- Co-owner: Phooriwat Pungpech
- Assigned staging approver: `phooriwat.pungpech@yageo.com`
- Normal Teams action timeout restored to `P1D` after the timeout test.

## Scenario results

| # | Scenario | Evidence | Result |
| --- | --- | --- | --- |
| 1 | Card on Teams desktop | CSR-2026-000010 through CSR-2026-000012 rendered and accepted user actions | Pass |
| 2 | Card on Teams mobile | CSR-2026-000017 displayed successfully in the Teams mobile client; user confirmed no blocking rendering issue | Pass |
| 3 | Assigned approver approves | CSR-2026-000010; correlation `b36fddb9-5875-45ea-a159-3d4e353716ee`; workflow version 1 to 2 | Pass |
| 4 | Assigned approver rejects with comment | CSR-2026-000011; correlation `b9193e65-6122-48d3-8f06-fcfd67a58249`; one non-empty comment | Pass |
| 5 | Assigned approver requests changes | CSR-2026-000012; correlation `fd016fe8-34a8-4953-8579-9f2ce277c9cf`; one non-empty comment | Pass |
| 6 | Repeat the same callback/action ID | CSR-2026-000016 returned HTTP 200 with `alreadyProcessed: true` | Pass |
| 7 | Reuse action ID with changed content | CSR-2026-000016 returned HTTP 409; no second transition | Pass |
| 8 | Wrong Teams responder | CSR-2026-000013 returned HTTP 409 and remained pending | Pass (callback simulation) |
| 9 | Stale version and expired card | CSR-2026-000014 and CSR-2026-000015 returned HTTP 409 and remained pending | Pass |
| 10 | Teams timeout uses email fallback | CSR-2026-000017; Power Automate run `08584088293863025530372291277CU12`; Teams timed out, callback skipped, email succeeded | Pass |
| 11 | Callback HTTP retry | CSR-2026-000016; two exact retries returned HTTP 200 with `alreadyProcessed: true`; one approval/action/outbox row remained | Pass |
| 12 | Successful submit replaces the card | User confirmed Teams replaced the submitted card with the configured processing message | Pass |

The rejection/change flow runs were
`08584088301440883640799664323CU26` and
`08584088301422448073566757846CU13`. Both callbacks succeeded and both email
fallback actions were skipped.

## Additional security checks

- Missing rejection comment: HTTP 409.
- Unsupported callback contract: HTTP 409.
- Unsigned callback: HTTP 401 (verified during initial deployment).
- Test fixtures for wrong responder, stale version, and expiration created no
  workflow action or approval rows.
- Callback secret and trigger URL temporary files were removed after testing.
- The workflow action timeout was restored from `PT1M` to `P1D` after the
  fallback scenario.

## Open observations

- The connector-provided company email is captured and matched to the active
  assigned approver. The Teams user ID remains empty in workflow audit rows;
  mapping the tenant directory ID is a follow-up hardening item.
- Mobile layout and the final card replacement message were confirmed in the
  actual Teams clients on 2026-10-24.

## Final gate

All 12 mandatory Phase 4 staging scenarios passed. The tenant-connected Teams
approval proof of concept is validated for approval, rejection, request
changes, idempotency, authorization rejection, stale/expired actions, retry,
timeout fallback, desktop rendering, mobile rendering, and card replacement.
