# Plan 06: Observability, Automated Testing & CI/CD Pipeline

> **Priority**: 🟠 **Priority 5**
> **Status**: ✅ **Completed**
> **Scope**: Vitest unit testing, Playwright E2E testing, GitHub Actions CI/CD, structured logging, and health monitoring
> **Verification**: 100% Typecheck passed, Vitest suites (27/27 tests passed across 7 test suites), Health check endpoint active (/api/health)

---

## 1. Objectives

- Ensure that code regressions cannot be merged into `main` and break the 15:30 transport cutoff.
- Provide end-to-end automated validation of critical factory logistics paths (Submit ➔ Verify ➔ Group ➔ LINE Copy).
- Real-time visibility into database connection saturation, Edge Function latencies, and unhandled errors.
- Enable automated deployments with zero operational downtime.

---

## 2. Work Packages

### Package 6.1: Automated Unit & Business Logic Test Suite

- **Framework**: Vitest (already installed in repository)
- **Target Files**:
  - `lib/smart-grouping.test.ts`: Verify shift-time partitioning, route aggregation, 10-seat overflow detection, and sorting logic.
  - `lib/tiger-space-report.test.ts`: Verify parsing of various Tiger OpenSpace `.xlsx` formats, encoding, whitespace trimming, and employee ID matching.
  - `lib/request-window.test.ts`: Verify 15:30 cutoff boundary conditions (15:29:59 allowed, 15:30:01 locked, GA bypass override).
  - `lib/validation.test.ts`: Test Thai phone numbers, plate numbers, and department code schemas.

### Package 6.2: Playwright End-to-End (E2E) Critical Path Testing

- **Tool**: Playwright (`@playwright/test`)
- **Automated Scenarios**:
  1. **Employee Requisition Flow**: User submits OT request with drop-off stop and phone number; verifies pending status appears.
  2. **HR / GA Tiger Space Verification**: GA uploads test Excel report; unmatched row displays 1-Click Executive Bypass; click bypass updates status to `verified`.
  3. **Batch Van Assignment & LINE Copy**: GA filters by 20:00 shift; selects 4 passengers; assigns contractor van "หจก. นครหลวง"; clicks "Copy for LINE"; verifies clipboard contains properly formatted Thai text.
  4. **Cutoff Lockout Flow**: Clock advances past 15:30; submit button disables with warning banner.

### Package 6.3: Continuous Integration (CI) Pipeline

- **File**: `.github/workflows/ci.yml`
- Runs on every Pull Request and push to `main`:
  ```yaml
  name: Enterprise CI Pipeline
  on: [push, pull_request]
  jobs:
    validate:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v4
        - uses: actions/setup-node@v4
          with:
            node-version: 20
            cache: "npm"
        - run: npm ci
        - run: npm run typecheck
        - run: npm run lint
        - run: npm run test
        - run: npm run build
  ```

### Package 6.4: Observability, Health Checks & Telemetry

- **Files**: `app/api/health/route.ts`, `lib/logger.ts`
- **Health Check Endpoint**:
  - `/api/health`: Verifies Supabase DB connectivity, read/write latency, and Edge Function responsiveness.
  - Used by uptime monitors (BetterStack, UptimeRobot, or internal Nagios/Zabbix).
- **Structured JSON Logging**:
  - Standardized error capture with correlation ID (`trace_id`) across client errors, Server Actions, and Edge Functions.
  - Integration with Sentry or Datadog for instant alerting when error rate exceeds threshold.

---

## 3. Acceptance Criteria

1. 100% of core business calculations (smart grouping, cutoff windows, seat meters) covered by Vitest suites.
2. Playwright E2E suite passes cleanly in headless mode for all 3 critical operational flows.
3. GitHub Actions CI pipeline blocks PR merges if typecheck, lint, or tests fail.
4. `/api/health` returns `200 OK` with DB latency `< 100ms`.
5. Error logging captures full stack traces and correlation IDs without exposing sensitive credentials.
