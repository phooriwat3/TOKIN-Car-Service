# Phase 5 closure verification - 2026-10-24

## Completed rollout controls

- GitHub Actions workflow `Workflow Outbox Delivery` invokes the protected
  Supabase worker every five minutes and supports manual dispatch.
- `WORKFLOW_OUTBOX_SECRET` is stored independently in GitHub Actions and
  Supabase. The value is not committed or included in this evidence.
- Manual GitHub Actions dispatch completed successfully against the deployed
  worker (run `40059512664`, 10 seconds total; delivery job 6 seconds).
- `process-workflow-outbox` version 14 is active and returns privacy-safe result
  metadata for operations without exposing the queued payload.
- Permanent Power Automate client responses (`400`, `401`, `403`, `404`, `410`,
  and `422`) now move directly to `dead_letter`; transient failures retain the
  existing exponential retry behavior.
- GA can record a separately confirmed `sent` attestation after completing the
  manual driver LINE send. The application does not claim LINE delivery proof.

## Deployment evidence

- GitHub workflow commit: `24c8fe3ee9adbcbb8e3afa51856c1cd7041d98fb`.
- Remote migrations `202610240003` and `202610240004` match the local migration
  history.
- A protected direct worker invocation returned HTTP 200.
- Initial historical queue drain claimed four items: one delivery succeeded and
  three legacy requester events returned HTTP 400. Those incompatible legacy
  items are no longer claimable. New permanent client failures are quarantined
  by migration `202610240004_workflow_permanent_failure.sql`.

## Verification

- `npm run typecheck` passed.
- `npm run build` passed with Next.js 16.4.2; all 32 static pages generated.
- Focused Vitest run passed: 3 files and 18 tests.
- `git diff --check` passed with line-ending notices only.

## Remaining human gate

Use a representative assigned request and a controlled driver LINE chat. GA
must review the preview, open or copy the message, select the intended driver,
press Send in LINE, then use **Mark as sent** in the application. Verify the
resulting `sent` audit event. This recipient check cannot be automated because
contractor drivers do not have managed Teams or application identities.
