# Plan 02: UX / UI & Modern Enterprise Design System

> **Priority**: 🟡 **Priority 2 (Directly enhances all screens)**
> **Status**: ✅ **Completed**
> **Scope**: Global UI styling, component consistency, responsive layouts, micro-interactions, and server state decoupling

---

## 1. Design Philosophy

- **Executive & Enterprise Aesthetics**: Clean, calm, authoritative styling suitable for factory administration and executive management.
- **High-Density Information Architecture**: Displays vital dispatch data (times, plates, seats, stops) without clutter or excessive scrolling.
- **Zero Placeholder Culture**: Every UI element, avatar, map preview, and status pill uses curated, real data or accurate mock representations.
- **Factory Floor & Office Dual Ergonomics**: High contrast and readable fonts for fast scanning under factory office lighting; touch-friendly targets for mobile tablets.
- **Performance & Instant Feedback**: No whole-screen re-renders; optimistic mutations and graceful skeleton loaders for all asynchronous operations.

---

## 2. Key Components & Upgrades

### Package 2.1: Unified Design System & Theme Tokens

- **Files**: `tailwind.config.ts`, `components/ui.tsx`, `app/globals.css`
- Standardize brand color palette (Yageo/TOKIN deep corporate slate `#0f172a`, primary cobalt `#1d4ed8`, success emerald `#059669`, amber warning `#d97706`, error crimson `#dc2626`).
- Refine elevation shadows, border radius (`rounded-lg` / `rounded-xl`), and crisp 1px borders (`border-slate-200`).
- Typography hierarchy using modern enterprise typefaces with tabular numerals (`font-mono`) for dates, times, and license plates.

### Package 2.2: Enhanced Data Tables & Batch Toolbars

- **File**: `components/booking-table.tsx`
- Sticky, floating batch action bar when rows are checked.
- Quick filter tabs (All, Overtime, Off-site, Pending Verification, Assigned).
- Inline search bar for instant filtering by Employee ID, Name, Plate, or Route.
- Column sorting (Date, Time, Department, Status).
- Empty state illustrations with contextual action prompts.

### Package 2.3: Mobile & Tablet Responsiveness

- **Files**: `components/app-shell.tsx`, `components/booking-table.tsx`, `components/admin-batch-assignment-modal.tsx`
- Ensure full usability on 768px - 1024px tablets (used by GA supervisors walking the factory floor).
- Responsive modal drawer on narrow viewports.
- Touch-friendly tap targets (minimum 44x44px).

### Package 2.4: Micro-interactions & Visual Polish

- Smooth drawer and modal transitions with blur backdrops.
- Interactive tooltips explaining status meanings.
- Dynamic copy feedback: "Copied to clipboard!" toast animation with checkmark.

### Package 2.5: TanStack Query State Decoupling (Eradicate God-State)

- **Files**: `components/query-provider.tsx`, `lib/hooks/use-bookings-query.ts`, `components/app-provider.tsx`
- Migrate data fetching from monolithic `AppProvider.loadAppData()` to isolated TanStack Query hooks:
  - `staleTime: 30_000` (30s) and `gcTime: 300_000` (5 mins).
  - Optimistic UI updates on status changes (instant feedback before backend roundtrip).
  - Fine-grained invalidation (`queryClient.invalidateQueries({ queryKey: ['bookings', date] })`).

### Package 2.6: Enterprise Skeletons & Resilient Error Boundaries

- **Files**: `components/error-boundary.tsx`, `components/ui.tsx`
- Implement polished skeleton placeholder blocks matching the table and card geometries during initial load.
- Granular React Error Boundaries wrapping complex panels (Tiger Space parser, Batch Modal) with user-friendly retry buttons instead of blank crashes.

---

## 3. Acceptance Criteria

1. Visual cohesion across all user-facing and admin pages.
2. Responsive layout validated across desktop (1520px+), laptop (1280px), and tablet (768px).
3. No monolithic `loadAppData` calls triggered by minor UI state changes.
4. Clean skeleton animations during data loading; error boundaries catch errors with retry CTA.
5. No jarring layout shifts, clipped text, or broken overflows.
