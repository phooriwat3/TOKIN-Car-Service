# Plan 05: Contractor Billing, Van Invoicing & Cost Analytics

> **Priority**: 🟣 **Priority 5 (Business Value & Financial Governance)**
> **Status**: ✅ **Completed**
> **Scope**: Third-party contractor invoicing, departmental cost allocation, monthly executive reports

---

## 1. Context & Business Need

- TOKIN does not have company-owned vans for daily OT; third-party contractor vans are hired on-demand.
- At month-end, GA receives invoices from van companies/contractors and must cross-check:
  - Which trips were actually dispatched and operated.
  - Which department requested each trip (for internal cost-center cross-charging).
  - Rate per trip vs. contracted rate.
- Management needs clear visibility into monthly overtime transport expenditure trends.

---

## 2. Key Features & Work Packages

### Package 5.1: Van Contractor & Billing Ledger
- **Files**: `lib/contractor-billing.ts`, `components/contractor-billing-ledger.tsx`, `components/admin-report-workspace.tsx`
- Structured ledger parsing (`getContractorBillingLedger`) extracting trip-by-trip vendor data, vehicle plate, driver, passenger count, and agreed THB rate.
- Multi-contractor aggregation (`aggregateContractorBilling`) computing total dispatched trips, passenger headcount, average occupancy, and total invoice sums.
- Instant search filter by contractor name, driver name, vehicle plate, or route label.

### Package 5.2: Departmental Cost Center Breakdown
- **Files**: `components/department-cost-allocation.tsx`, `lib/contractor-billing.ts`
- Pro-rated internal cross-charging allocation (`aggregateDepartmentCostCenters`) partitioning transport expenditure across requesting departments (`PE`, `QA`, `TA MFG`, `EE`, etc.).
- Departmental expenditure matrix with visual budget share progress bars.

### Package 5.3: 1-Click Monthly Accounting Export (.xlsx)
- **Files**: `components/admin-report-workspace.tsx`
- Generates 3-sheet styled financial workbook:
  - **Sheet 1 (`Invoicing Ledger`)**: Granular trip-by-trip accounting with vehicle, contractor, passenger count, and THB cost.
  - **Sheet 2 (`Contractor Totals`)**: Aggregated provider summary with total trips, total pax, avg occupancy, and billing sum.
  - **Sheet 3 (`Department Cost Centers`)**: Internal department cross-charging summary with rides count, total allocated cost, and budget share percentage.

---

## 3. Acceptance Criteria & Verification

1. ✅ GA can filter trips by contractor provider and date range.
2. ✅ Monthly total van expenditure matches individual trip logs with pro-rated department allocation.
3. ✅ 1-click export to Excel formatted with 3 worksheets for TOKIN Finance review.
4. ✅ Automated unit tests verified in `lib/contractor-billing.test.ts` (100% pass rate).
