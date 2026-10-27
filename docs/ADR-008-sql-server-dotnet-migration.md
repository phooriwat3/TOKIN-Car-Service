# ADR-008: ASP.NET Core and SQL Server migration target

- Status: Accepted for phased implementation
- Date: 2026-10-27

## Context

TOKIN already operates SQL Server and management selected it as the production database target. The current Next.js and Supabase deployment is a validated staging reference, but its PostgreSQL functions, Row-Level Security policies, authentication, and Edge Functions cannot be moved to SQL Server unchanged.

## Decision

Build a modular ASP.NET Core 10 backend with EF Core and SQL Server while retaining the existing Next.js user interface. Migrate one vertical workflow at a time and keep the Supabase staging branch unchanged until the replacement reaches tested feature parity.

The SQL Server model is divided into these schemas:

- `core`: departments, controlled application accounts, approver mappings, and the employee directory
- `transport`: requests, riders, approvals, normalized assignments, transport units, revisions, and LINE dispatch evidence
- `security`: hashed action tokens and API idempotency records
- `workflow`: durable outbox messages and delivery attempts
- `audit`: append-only audit records
- `infrastructure`: EF Core migration history only

Separate vehicle and driver master tables are intentionally excluded. GA records the actual vehicle and driver together for each approved request, matching the agreed operating process.

## Security and operational constraints

- Raw request, approval, and document tokens must never be stored; only SHA-256 hashes are persisted.
- SQL Server is reachable only by the backend and must never expose port 1433 publicly.
- Development uses a dedicated database or disposable container, never the company production database.
- Database credentials are supplied through environment variables, user secrets, or the hosting provider's secret store and are never committed.
- Row-version columns provide optimistic concurrency for mutable operational records.
- Workflow delivery uses an outbox so request state and notification intent can be committed atomically.
- Public submissions use a serializable transaction covering booking-number allocation, request data, revision history, token hash, outbox intent, rate-limit attempt, and idempotency response.
- Confirmation-token plaintext exists only in process memory. SQL stores its SHA-256 hash for later verification and Data Protection ciphertext in the outbox for the future delivery worker.
- The Data Protection key ring must be persisted and protected by the production host; ephemeral container keys are not acceptable in production.
- Production deployment, Cloudflare, DNS, and the company domain are deferred until hosting and IT requirements are confirmed.

## Consequences

- Positive: aligns with company infrastructure and C# operational support.
- Positive: normalized assignment data improves reporting and removes JSON-only transport-unit storage.
- Positive: schema-level constraints, concurrency tokens, idempotency, outbox delivery, and audit records establish an enterprise baseline.
- Negative: Supabase Auth, RLS, database functions, and Edge Functions must be reimplemented in the API before cutover.
- Negative: staging and migration implementations must coexist temporarily and require feature-parity tests.

## Validation

The initial migration is tested by generating SQL without a connection and by applying it to a disposable SQL Server 2022 container. Validation requires the expected schemas and migration history plus a clean `DBCC CHECKCONSTRAINTS` result. The public submission slice additionally verifies atomic persistence, idempotent replay, conflict rejection, token-at-rest controls, and outbox creation against the disposable database.

The editable Phase 2C workflow is [`diagrams/public-request-sqlserver-flow.excalidraw`](diagrams/public-request-sqlserver-flow.excalidraw).

## Rollback

The Netlify/Supabase staging deployment remains pinned to the frozen staging branch and tag. The SQL Server migration branch can be abandoned without changing the working staging environment.
