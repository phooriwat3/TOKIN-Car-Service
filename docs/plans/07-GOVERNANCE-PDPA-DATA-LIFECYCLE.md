# Plan 07: Enterprise Governance, PDPA Compliance & Data Lifecycle

> **Priority**: 🛡️ **Priority 7 (Compliance, Legal & Corporate Governance)**
> **Status**: ✅ **Completed**
> **Scope**: Thailand PDPA compliance, PII data masking, role-based access control (RBAC), data retention & archival, and DRP fallback runbook

---

## 1. Context & Regulatory Imperatives

- **Personal Data Protection Act (PDPA Thailand)**: Employee mobile numbers, residential drop-off locations, and overtime travel logs are Personally Identifiable Information (PII). Uncontrolled exposure across departments violates compliance.
- **Factory & Financial Audits**: TOKIN is subject to ISO 9001 / IATF 16949 internal audits and Yageo Group financial governance requiring 3-year immutable records of all transportation disbursements.
- **High Operational Dependency**: Daily operations cannot stop even if internet connectivity drops during the 15:00 - 15:30 cutoff window.

---

## 2. Key Work Packages & Implementation

### Package 7.1: Enterprise Role-Based Access Control (RBAC) Matrix
- **Files**: `lib/rbac.ts`, `lib/role-routes.ts`, `components/app-shell.tsx`, `app/dashboard/page.tsx`
- Complete permission matrix for 7 enterprise roles:
  - `requester`: Submit OT/business requests, view own history, self-contact details.
  - `approver`: Department-scoped approval workflow; employee phone numbers masked.
  - `admin`: Full unmasked operational dispatch, van batching, contractor assignment, DRP override.
  - `driver`: Operational view with passenger headcount and route drop-offs.
  - `finance`: Financial ledger access, contractor rate verification, and departmental cross-charging.
  - `executive`: Priority requests and corporate fleet analytics dashboard.
  - `auditor`: Read-only access to immutable audit trails and compliance events.

### Package 7.2: PII Data Masking & Privacy Controls
- **Files**: `lib/privacy.ts`, `components/booking-detail.tsx`, `components/booking-table.tsx`
- `maskPhoneNumber`: Masks Thai mobile numbers (e.g. `081-***-5678`) for all non-admin viewers.
- `maskEmployeeId`: Masks employee IDs (e.g. `TK***76`) for unauthorized peer viewers.
- `maskDropoffLocation`: Generalizes private sub-sois/house numbers while retaining the primary route drop-off.
- `anonymizeBookingForArchival`: Scrubs PII from historical records (>1 year old) to `[PDPA_SCRUBBED]`.
- PDPA visual indicator badge in request details: Displays "Admin Dispatch View" for GA and "PDPA Masked" for regular staff.

### Package 7.3: Data Retention, Partitioning & Archival Lifecycle
- **Files**: `lib/data-lifecycle.ts`, `supabase/migrations/202609080002_data_lifecycle_and_archival.sql`
- **Hot Data Storage (0 – 90 Days)**: Rapid query access for active dispatch.
- **Cold Archival (91 Days – 3 Years)**: Retained in `archived_bookings` table with PostgreSQL stored procedure `archive_cold_bookings(retention_days INT)`.
- **PDPA Anonymization (> 1 Year)**: Automated stored procedure `anonymize_stale_pii(anonymize_after_days INT)` scrubbing contact details while retaining department codes and cost-center figures for 3-year audits.

### Package 7.4: Disaster Recovery Plan (DRP) Fallback Runbook
- **Files**: `components/drp-fallback-modal.tsx`, `components/admin-report-workspace.tsx`
- 1-Click offline printable Excel dispatch sheet generator (`TOKIN_OT_EMERGENCY_DISPATCH.xlsx`) containing cached trips + 15 blank rows for handwritten driver/passenger sign-off.
- Offline emergency LINE broadcast message formatter (browser-native, zero backend dependency).
- Step-by-step post-outage reconciliation procedure documented and accessible in GA Admin workspace.

---

## 3. Acceptance Criteria & Verification

1. ✅ Non-GA users cannot see full unmasked phone numbers of other employees in UI tables or detail cards (`lib/privacy.test.ts`).
2. ✅ RBAC matrix enforced across all 7 enterprise roles (`lib/rbac.test.ts`).
3. ✅ Automated archiving logic partitions records older than 90 days (`lib/data-lifecycle.test.ts`).
4. ✅ Historical records older than 1 year have PII anonymized while retaining financial cost center data.
5. ✅ DRP offline contingency validated and accessible directly from Admin Reports.
6. ✅ `npm run typecheck` passes with 0 compilation errors.
7. ✅ `npm run test` passes 59/59 tests across 11 test suites (100% pass rate).
