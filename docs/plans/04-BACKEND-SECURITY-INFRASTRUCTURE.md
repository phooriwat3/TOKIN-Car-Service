# Plan 04: Backend, Security & Infrastructure

> **Priority**: 🟢 **Priority 4**
> **Status**: ✅ **Completed**
> **Scope**: Database schema, Row-Level Security, audit trails, data integrity, error resiliency, connection pooling, and idempotency
> **Verification**: 100% Typecheck passed, Vitest suites (17/17 tests passed across 5 test suites)

---

## 1. Objectives

- Ensure bulletproof data integrity across thousands of monthly transport records.
- Protect employee personal data (phone numbers, destinations, department records).
- Maintain immutable audit trails for compliance with internal audits (ISO 9001 / IATF 16949).
- Guarantee sub-second response times even under concurrent shift-end traffic spikes (15:00 - 15:30).
- Safeguard external integrations (Power Automate, webhooks) with idempotency and rate limits.

---

## 2. Technical Architecture & Work Packages

### Package 4.1: Database Schema Optimization & Indexing

- **Files**: `supabase/migrations/`, `lib/types.ts`
- Create composite indexes on high-traffic query filters:
  - `(using_date, status)`
  - `(using_date, request_type, end_time)` (critical for OT batch grouping)
  - `(requester_employee_id)`
  - `(department_code, using_date)`
- Add foreign key constraints and cascade rules to prevent orphaned records.
- Implement proper soft delete (`deleted_at timestamptz`) for vehicles and drivers to maintain historical booking referential integrity.

### Package 4.2: Year-Partitioned Booking Number Sequence

- **Files**: `supabase/migrations/`
- Replace single unbounded sequence with a yearly-scoped sequence:
  - Format: `CSR-YYYY-XXXXX` (e.g. `CSR-2026-00001`, `CSR-2027-00001`).
  - Thread-safe generator trigger using `ON CONFLICT` or yearly sequence mapping to prevent collisions across concurrent submissions.

### Package 4.3: Security & Row-Level Security (RLS) Hardening

- Restrict sensitive employee details:
  - Requesters can only read/edit their own active bookings.
  - Approvers can view requests from their assigned departments only.
  - GA Admins have full read/write access to dispatch and contractor billing fields.
  - Fix profiles table read leak: Restrict general employee read to directory-safe fields only (no personal emails/phone numbers visible to unauthorized peers).
  - Prevent unauthorized modification of approved or assigned records.

### Package 4.4: Webhook Idempotency & Rate Limiting

- **Files**: `supabase/functions/approval-callback/`, `app/api/v1/`
- Enforce `Idempotency-Key` or unique constraint on `(booking_id, action, approver_email)` to prevent duplicate approval triggers from Power Automate retries.
- Implement rate limiting headers (`429 Too Many Requests`) on public requisition endpoints to prevent denial-of-service or bot abuse.

### Package 4.5: Connection Pooling & Supavisor Optimization

- Configure Supabase Connection Pooling:
  - **Transaction Mode (port 6543)**: For short-lived Next.js Server Actions and Edge Function API routes to sustain 1,000+ concurrent users during 15:00-15:30 peak cutoff.
  - **Session Mode (port 5432)**: Dedicated for admin batch operations requiring advisory locks and schema migrations.

### Package 4.6: Comprehensive Enterprise Audit Logging

- **Files**: `lib/supabase/audit.ts`, `components/booking-activity-log.tsx`
- Track every state transition with:
  - `timestamp`, `actorId`, `actorName`, `action` (`CREATED`, `VERIFIED_OT`, `GA_EXCEPTION_GRANTED`, `ASSIGNED_BATCH`, `LINE_DISPATCHED`, `COMPLETED`, `CANCELLED`).
  - Snapshot of `oldData` and `newData` for accountability.
  - PostgreSQL trigger write directly to `audit_logs` table ensuring compliance.

---

## 3. Acceptance Criteria

1. RLS policies active and verified via automated security test queries (preventing data leaks between departments).
2. Query execution time for batch groupings < 150ms under simulated load.
3. Power Automate webhook retries with same token return `200 OK (idempotent)` without duplicate state changes.
4. Booking numbers seamlessly format as `CSR-YYYY-XXXXX` and increment atomically.
5. Every admin approval, bypass, and batch assignment produces an immutable audit log entry.
