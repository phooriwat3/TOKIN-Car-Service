# Plan 09: TOKIN Blue UI Design System

> Status: Planned
> Primary library: Material UI
> Reference direction: Transportation Website Template 60033
> Design rule: Recreate the visual language as an original TOKIN interface. Do not copy the reference template's source code, logo, photography, or licensed assets.

## 1. Design Goal

Create a clear, trustworthy transport-service experience using TOKIN blue as the primary identity and a restrained yellow accent for important actions.

The public request experience should feel welcoming and simple. The GA/Admin workspace should use the same design tokens but prioritize speed, density, and operational clarity.

## 2. Reference Qualities to Retain

- Strong transport photography with a dark overlay.
- White navigation over a dark/photographic header where contrast permits.
- Royal-blue booking/action panel overlapping the hero area.
- Bright yellow primary call-to-action buttons.
- White cards on very light blue-gray section backgrounds.
- Circular blue service icons.
- Large, centered section headings with a short blue underline.
- Alternating white and light-blue page sections.
- Wide blue call-to-action band near the bottom of public pages.

## 3. Elements Not to Copy

- The Bus Express name, logo, text, route names, pricing, or content.
- Template source code or Bootstrap structure.
- Template photographs or icons unless TOKIN purchases the appropriate license.
- Marketing sections that do not serve the transport-request workflow.
- Large carousels, parallax effects, or decorative animation that slows task completion.

Use TOKIN-owned photography or separately licensed assets featuring company transport, the factory entrance, meeting points, vans, and safe passenger service.

## 4. Color System

### Brand colors

| Token | Value | Use |
| --- | --- | --- |
| `brand.navy` | `#0B2A55` | Hero overlay, footer, dark navigation |
| `brand.900` | `#0D3261` | Active navigation and strong surfaces |
| `brand.700` | `#124E9C` | Secondary blue controls |
| `brand.600` | `#1457AD` | Primary TOKIN action color |
| `brand.500` | `#1E6BC6` | Hover and informational accents |
| `brand.100` | `#DAEAF9` | Selected and informational backgrounds |
| `brand.50` | `#F4F8FD` | Alternating page section background |
| `accent.yellow` | `#FFDC00` | Main public call-to-action and highlights |
| `accent.yellowHover` | `#E6C600` | Yellow button hover state |
| `accent.yellowText` | `#13233A` | Text/icons placed on yellow |

### Neutral colors

| Token | Value | Use |
| --- | --- | --- |
| `surface.page` | `#F8FAFC` | Application background |
| `surface.paper` | `#FFFFFF` | Cards, dialogs, forms |
| `text.primary` | `#0F172A` | Primary text |
| `text.secondary` | `#475569` | Supporting text |
| `border.default` | `#D9E2EC` | Form and card borders |
| `focus.ring` | `#60A5FA` | Accessible keyboard focus |

Workflow statuses keep semantic colors instead of becoming uniformly blue:

- Pending: amber.
- Approved/ready: blue.
- Assigned: violet.
- In progress: indigo.
- Completed: green.
- Rejected/error: red.
- Cancelled/expired: gray.

## 5. Typography

- English/interface font: Inter or Segoe UI.
- Thai font: Sarabun.
- Page title: 28-36 px desktop, 24-28 px mobile, weight 700-750.
- Section title: 24-30 px, weight 700.
- Card title: 16-18 px, weight 650-700.
- Body: 14-16 px with at least 1.5 line height.
- Form labels: 13-14 px, weight 600.
- Avoid uppercase for long labels and operational actions.

## 6. Layout Tokens

- Maximum public content width: 1200 px.
- Maximum application workspace width: 1440 px where tables require it.
- Public section spacing: 64-88 px desktop, 40-56 px mobile.
- Application page spacing: 20-32 px.
- Card radius: 12 px.
- Form control radius: 8 px.
- Button radius: 8 px.
- Standard control height: 44 px minimum.
- Card shadow: subtle; use borders for dense admin interfaces.
- Animation: 150-200 ms for hover, focus, drawer, and dialog transitions.

## 7. Public Landing Page

```text
+--------------------------------------------------------------+
| TOKIN logo                    Help                 Request    |
+--------------------------------------------------------------+
|                                                              |
|  [TOKIN transport photograph with dark navy overlay]         |
|                                                              |
|  Safe transport for every shift                              |
|  Simple request, Teams confirmation, reliable assignment     |
|                                                              |
|  [Request OT Transport]  [Request Business Trip]             |
|                                                              |
+---------------- overlapping blue quick-action panel ---------+
| Request status / Manage request / Service hours              |
+--------------------------------------------------------------+
| Simple Request | Teams Approval | GA Planning | Track Status |
+--------------------------------------------------------------+
| Transport guidelines and today's service notices             |
+--------------------------------------------------------------+
| Need urgent transport? [Review urgent-request rules]          |
+--------------------------------------------------------------+
| Help | Privacy | Contact GA | Service status                  |
+--------------------------------------------------------------+
```

### Hero behavior

- Use one static optimized image rather than a carousel.
- Apply a navy-to-transparent overlay so all text passes contrast requirements.
- Keep only two primary service choices.
- On mobile, place actions in a stacked card below the hero text.
- Do not place personal booking information in the hero or public landing page.

### Public quick-action panel

Inspired by the reference booking panel, but adapted for TOKIN:

- Request OT Transport.
- Request Business Trip.
- Manage Existing Request.
- Read Transport Guidelines.

The panel is not a full form. It directs users into the appropriate focused flow.

## 8. Request Form Experience

- Use a focused form surface with a visible request-type title.
- Break long forms into a maximum of three logical sections.
- Keep a sticky mobile action area for Back and Continue/Submit.
- Show field validation beside the field, not only in a top alert.
- Display service hours and cutoff rules before the final submission step.
- After submission, explain that a Teams confirmation will arrive and that the request is not active until confirmed.
- Use a clear progress indicator:
  - Details
  - Passengers/OT
  - Review and submit

## 9. GA/Admin Workspace

The admin workspace uses the TOKIN theme but does not imitate a marketing homepage.

### Structure

- Permanent desktop side navigation; drawer navigation on mobile/tablet.
- Compact white top bar with page title, alerts, profile, and service status.
- Light blue-gray page background.
- White operational panels with restrained shadows or borders.
- Blue for navigation and selected filters.
- Yellow only for primary attention actions, not every button.

### Main dispatch view

- Queue tabs: Needs Review, Ready to Plan, Assigned, In Progress, Completed.
- Summary cards based on server aggregates, not the visible table page.
- Server-side search, filters, and pagination.
- Clear failed Teams/email delivery indicator.
- Status, urgency, and exception chips remain visible in the first columns.
- Batch assignment actions stay visible while rows are selected.
- Destructive actions use red and always require confirmation.

## 10. Teams-to-Web Continuity

Teams Adaptive Cards and web pages should feel related:

- Same blue, yellow, status colors, wording, and action hierarchy.
- Same request number and status label.
- Card Review buttons open a matching request-summary page.
- Web pages clearly identify whether the action is pending, completed, stale, or expired.
- Teams cards remain simpler than web pages and contain only minimum necessary PII.

## 11. Material UI Component Standard

Use Material UI for:

- `AppBar`, `Drawer`, `Toolbar`, `Breadcrumbs`.
- `Button`, `IconButton`, `ButtonGroup`.
- `TextField`, `Select`, `Autocomplete`, `Checkbox`, `RadioGroup`.
- `Card`, `Paper`, `Stack`, `Grid`, `Container`.
- `Alert`, `Snackbar`, `Dialog`, `Drawer`.
- `Chip`, `Badge`, `Avatar`, `Tooltip`.
- `Tabs`, `Stepper`, `Skeleton`, `LinearProgress`.

Keep TanStack Table for operational tables during the first migration. Render table controls and states with Material UI. Do not introduce another general-purpose UI library.

Create application-level components only where domain behavior repeats:

- `RequestStatusChip`
- `WorkflowActionPanel`
- `RequestSummaryCard`
- `TransportFormSection`
- `DataTableToolbar`
- `DeliveryStatusIndicator`
- `ConfirmBusinessActionDialog`
- `PageLoadingState`
- `PageErrorState`
- `EmptyQueueState`

## 12. Styling Migration Rule

1. New screens use Material UI and centralized theme tokens.
2. Existing Tailwind/custom components remain functional during migration.
3. Migrate one complete workflow/page at a time.
4. Enable MUI CSS layers while Tailwind and MUI coexist.
5. Do not keep duplicate MUI and custom versions after a page is migrated.
6. Remove unused Tailwind primitives only after repository-wide usage is verified.

## 13. Accessibility and Responsive Requirements

- WCAG AA contrast for text, controls, and status information.
- All actions usable by keyboard.
- Visible focus indicator on every interactive control.
- Minimum 44 x 44 px mobile targets.
- Status must not rely on color alone.
- Form errors connected to fields with accessible descriptions.
- Dialog focus trapping and return focus verified.
- Reduced-motion preference respected.
- Desktop, tablet, Teams mobile browser, and standard mobile browser tested.

## 14. Acceptance Criteria

- Public pages visibly follow the TOKIN blue/yellow transport theme without copying licensed template assets.
- Employee users can identify the correct request type within five seconds.
- The primary action is visually clear on desktop and mobile.
- Admin screens remain information-dense and do not use oversized marketing sections.
- New pages use the centralized MUI theme and shared domain components.
- No page mixes duplicate MUI and custom controls for the same interaction.
- Loading, empty, error, success, expired, and unauthorized states are designed.
- Accessibility checks and responsive screenshots are included in UI review.
- Teams cards and linked web pages use consistent terminology and status colors.

## 15. Implementation Sequence

> Rollout checkpoint (2026-10-24): steps 1-8 are represented in the shared
> application shells and route families. The remaining work is cleanup of
> unused legacy primitives plus formal accessibility, visual-regression, and
> authenticated usability review.

> Booking UX checkpoint (2026-10-25): the live OT and off-site request flows,
> request review, submission receipt, secure confirmation, and tracking pages
> now share a transport-booking hero, live route strip, journey progress, and
> digital-ticket pattern. Secure request management, approver review, and the
> final vehicle assignment use the same route-and-ticket language. Company
> approval rules and GA controls remain unchanged.

1. Create the centralized MUI theme and TOKIN design tokens.
2. Configure MUI CSS layers for temporary Tailwind coexistence.
3. Build shared status, feedback, form-section, and action components.
4. Redesign the public landing/request-selection page.
5. Redesign the two public request flows.
6. Redesign signed-link review/manage/assignment pages.
7. Redesign the GA queue and booking detail workspace.
8. Migrate remaining admin, reporting, and driver screens.
9. Remove unused legacy UI primitives and styles.
10. Run responsive, accessibility, visual-regression, and usability review.
