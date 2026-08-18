# 📐 TOKIN Car Service — Architecture Decision Records (ADR)

> **Document Version**: 1.0  
> **Last Updated**: 18 สิงหาคม 2569  
> **Status**: Active

---

## Index of Architecture Decision Records

| ADR ID | Title | Status | Date |
|--------|-------|--------|------|
| [ADR-001](#adr-001-nextjs-16-app-router--supabase-baas-architecture) | Next.js 16 App Router + Supabase BaaS Architecture | Accepted | 2026-07-14 |
| [ADR-002](#adr-002-database-level-security-via-row-level-security-rls) | Database-Level Security via Row-Level Security (RLS) | Accepted | 2026-07-14 |
| [ADR-003](#adr-003-session-storage--httponly-cookie-authentication) | Session Storage & HttpOnly Cookie Authentication | Accepted | 2026-08-18 |
| [ADR-004](#adr-004-double-booking--overlap-prevention-at-database-layer) | Double-Booking & Overlap Prevention at Database Layer | Accepted | 2026-07-15 |
| [ADR-005](#adr-005-decoupled-email-approval-via-power-automate--edge-functions) | Decoupled Email Approval via Power Automate & Edge Functions | Accepted | 2026-07-16 |
| [ADR-006](#adr-006-tiger-space-ot-verification-and-hr-confirmation-workflow) | Tiger Space OT Verification and HR Confirmation Workflow | Accepted | 2026-08-05 |
| [ADR-007](#adr-007-tanstack-query-for-server-state--pagination) | TanStack Query for Server State & Pagination | Accepted | 2026-08-18 |

---

### ADR-001: Next.js 16 App Router + Supabase BaaS Architecture

- **Status**: Accepted
- **Context**: The company requires a modern, responsive, and auditable vehicle requisition platform to replace paper forms.
- **Decision**: Adopt Next.js 16 (App Router with React Server Components) combined with Supabase (PostgreSQL 15 + Auth + Storage + Edge Functions).
- **Consequences**:
  - Positive: Rapid development, high performance, native TypeScript support, unified auth & storage.
  - Negative: Vendor lock-in risk with Supabase-specific APIs (mitigated by using standard PostgreSQL features and repository abstractions).

---

### ADR-002: Database-Level Security via Row-Level Security (RLS)

- **Status**: Accepted
- **Context**: Different user roles (Requester, Approver, Admin/GA, Driver) require strict data isolation.
- **Decision**: Enforce access control directly in PostgreSQL using Supabase RLS policies and `SECURITY DEFINER` functions (`app_role()`, `can_view_booking()`).
- **Consequences**:
  - Positive: Guarantees data isolation even if client-side or API layer checks are bypassed.
  - Negative: Requires careful policy definition to prevent performance degradation on complex JOIN queries.

---

### ADR-003: Session Storage & HttpOnly Cookie Authentication

- **Status**: Accepted
- **Context**: Storing JWT session tokens in `localStorage` exposes tokens to XSS attacks.
- **Decision**: Use `@supabase/ssr` with HttpOnly, Secure, SameSite cookies. Remove all `localStorage` token backup mechanisms.
- **Consequences**:
  - Positive: Eliminates token theft via client-side script injection.
  - Negative: Requires server-side session refreshes on protected routes via Next.js Middleware.

---

### ADR-004: Double-Booking & Overlap Prevention at Database Layer

- **Status**: Accepted
- **Context**: Vehicle double-booking during overlapping time windows leads to operational failure.
- **Decision**: Implement a database trigger `check_vehicle_overlap()` combined with `FOR UPDATE` row locks inside the `assign_booking()` database function.
- **Consequences**:
  - Positive: Prevents race conditions during simultaneous vehicle assignments across admin sessions.
  - Negative: Concurrent assignment attempts on the same vehicle block until the first transaction commits.

---

### ADR-005: Decoupled Email Approval via Power Automate & Edge Functions

- **Status**: Accepted
- **Context**: Approvers outside the internal network require seamless approval via email without logging into the portal.
- **Decision**: Send approval emails via Power Automate / Resend with secure token callbacks to the `approval-callback` Edge Function.
- **Consequences**:
  - Positive: Frictionless approver experience; no user account creation required for managers.
  - Negative: Relies on Power Automate availability; mitigated by fallback in-app approval queue `/approvals`.

---

### ADR-006: Tiger Space OT Verification and HR Confirmation Workflow

- **Status**: Accepted
- **Context**: Overtime transport requests must match approved OT records from the company's HR system (Tiger Space).
- **Decision**: Allow OT transport requests to be submitted prior to OT approval cutoff. Require HR to upload and confirm Tiger Space report matching before GA confirms vehicle assignment.
- **Consequences**:
  - Positive: Employees don't miss transport cutoffs while waiting for manager OT sign-off.
  - Negative: Transport planning remains pending until HR report matching is completed.

---

### ADR-007: TanStack Query for Server State & Pagination

- **Status**: Accepted
- **Context**: Monolithic state reloading (`loadAppData()`) caused full table re-fetching on every user interaction.
- **Decision**: Adopt TanStack Query (v5) with custom hooks (`useBookingsQuery`), server-side pagination API (`/api/v1/bookings`), `staleTime: 30s`, and optimistic updates.
- **Consequences**:
  - Positive: Reduced network bandwidth, instant UI feedback, automatic background refetching.
  - Negative: Adds minor client-side bundle size (~12KB).
