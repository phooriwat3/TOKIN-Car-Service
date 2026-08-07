# TOKIN Transport — Enterprise/Modern Dashboard Redesign
## Design System Analysis & Coder AI Prompt

---

## 1. Current UI/UX Analysis

### Architecture Overview
| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS v3 + custom tokens |
| Components | Custom component library (`components/ui.tsx`) |
| Icons | Lucide React |
| Charts | Recharts |
| Font | Sarabun (Thai/Latin), IBM Plex Sans (imported but unused) |
| Backend | Supabase (Auth + DB) |

### Current Roles & Pages
| Role | Pages |
|------|-------|
| **Admin** | Dashboard, All Bookings, Calendar, Vehicles, Drivers, Reports |
| **Approver** | Dashboard, Approval Queue |
| **Requester** | New Request, My Requests |
| **Driver** | Dashboard, Assigned Trips |

### Current UI/UX Strengths
- ✅ Clean sidebar navigation with dark navy gradient (`#102d44 → #0b2133`)
- ✅ Role-based portal labeling
- ✅ Consistent card/shadow system
- ✅ Badge system with semantic colors
- ✅ Smooth animation system (fadeIn, slideIn, scaleIn)
- ✅ Custom masked inputs (TimeMaskInput, WeeklyHoursInput)

### Current UI/UX Weaknesses
- ❌ No dark mode support
- ❌ Dashboard metric cards are bare — no trend indicators or sparklines
- ❌ Typography feels utilitarian (Sarabun only, no display/heading separation)
- ❌ Sidebar lacks depth — no grouping sections, no active state glow/accent
- ❌ Header is thin with no breadcrumb or context
- ❌ Color system lacks depth — only one shade of brand blue and one accent amber
- ❌ No glassmorphism or modern surface treatments
- ❌ Forms are functional but not visually premium
- ❌ No notification/alert bell in header
- ❌ Empty states are generic and icon-light
- ❌ No data visualization on the dashboard (charts look underutilized)

---

## 2. Enterprise/Modern Dashboard Design System

### 2.1 Color Palette

#### Primary Brand — Deep Sapphire Blue
```
--color-brand-950: #040d1a   /* Deepest — overlays, sidebar depth */
--color-brand-900: #071628   /* Sidebar base */
--color-brand-800: #0a2240   /* Sidebar hover, active bg */
--color-brand-700: #0d3261   /* Dark accent surfaces */
--color-brand-600: #0f4285   /* Brand mid-range */
--color-brand-500: #1457ad   /* Primary interactive */
--color-brand-400: #2e71c9   /* Hover state */
--color-brand-300: #5b99e0   /* Muted accent */
--color-brand-200: #a8cdf0   /* Light accent */
--color-brand-100: #daeaf9   /* Surface tints */
--color-brand-50:  #f0f7fd   /* Lightest background tint */
```

#### Accent — Enterprise Amber/Gold
```
--color-amber-600: #b45309   /* Dark amber text */
--color-amber-500: #d97706   /* Primary amber */
--color-amber-400: #f59e0b   /* Bright accent */
--color-amber-100: #fef3c7   /* Light amber bg */
--color-amber-50:  #fffbeb   /* Lightest amber bg */
```

#### Semantic Status Colors
```
--color-success-700: #15622f   /* Dark success text */
--color-success-500: #22c55e   /* Success icon */
--color-success-100: #dcfce7   /* Success bg */
--color-danger-700:  #9f1239   /* Dark danger text */
--color-danger-500:  #ef4444   /* Danger icon */
--color-danger-100:  #fee2e2   /* Danger bg */
--color-warning-500: #eab308   /* Warning icon */
--color-warning-100: #fef9c3   /* Warning bg */
--color-info-500:    #3b82f6   /* Info icon */
--color-info-100:    #dbeafe   /* Info bg */
--color-violet-500:  #8b5cf6   /* Assignment/driver accent */
--color-violet-100:  #ede9fe   /* Violet bg */
```

#### Neutral/Surface Scale (Light Mode)
```
--color-neutral-950: #0a0f1a   /* Near-black text */
--color-neutral-900: #111827   /* Primary text */
--color-neutral-700: #374151   /* Secondary text */
--color-neutral-500: #6b7280   /* Muted text */
--color-neutral-400: #9ca3af   /* Placeholder text */
--color-neutral-300: #d1d5db   /* Border */
--color-neutral-200: #e5e7eb   /* Divider */
--color-neutral-100: #f3f4f6   /* Subtle bg */
--color-neutral-50:  #f9fafb   /* Page bg */
--color-white:       #ffffff   /* Surface/card bg */
```

#### Sidebar & Header Special Surfaces
```
/* Sidebar — deep navy with subtle blue undertone */
Sidebar BG:     linear-gradient(180deg, #0c1e35 0%, #07152a 60%, #050f1e 100%)
Sidebar Active: rgba(255,255,255,0.10) + border 1px rgba(255,255,255,0.08)
Sidebar Hover:  rgba(255,255,255,0.055)

/* Header — frosted glass */
Header BG: rgba(255,255,255,0.92)
Header Backdrop: blur(12px) saturate(180%)
Header Border: 1px solid rgba(209,213,219,0.6)

/* Metric cards — subtle gradient surfaces */
Metric Blue:   linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)
Metric Amber:  linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)
Metric Green:  linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)
Metric Violet: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 100%)
```

---

### 2.2 Typography

#### Font Stack
```css
/* Display / headings — Inter or Plus Jakarta Sans (modern, high-legibility) */
--font-display: 'Plus Jakarta Sans', 'Inter', 'Segoe UI', system-ui, sans-serif;

/* Body — Inter (neutral, enterprise-grade) */
--font-body: 'Inter', 'Sarabun', 'Segoe UI', system-ui, sans-serif;

/* Mono — for IDs, codes, tabular data */
--font-mono: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
```

> **Google Fonts import**: `Inter` (wght@300..800) + `Plus Jakarta Sans` (wght@400..800)

#### Type Scale
| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `display-2xl` | 36px / 2.25rem | 700 | 1.2 | Hero headings |
| `display-xl` | 30px / 1.875rem | 700 | 1.25 | Page titles (H1) |
| `display-lg` | 24px / 1.5rem | 700 | 1.3 | Section titles (H2) |
| `display-md` | 20px / 1.25rem | 600 | 1.4 | Card headers (H3) |
| `text-xl` | 18px / 1.125rem | 600 | 1.5 | Sub-headings |
| `text-lg` | 16px / 1rem | 500 | 1.5 | Emphasized body |
| `text-md` | 14px / 0.875rem | 400 | 1.57 | Body (default) |
| `text-sm` | 13px / 0.8125rem | 400 | 1.54 | Labels, secondary |
| `text-xs` | 12px / 0.75rem | 500 | 1.5 | Captions, badges |
| `text-2xs` | 11px / 0.6875rem | 600 | 1.4 | Eyebrow labels, nav section titles |

#### Letter Spacing (Tracking)
```
Eyebrow labels:   0.08em — 0.12em  (NAVIGATION, FLEET READINESS)
Display headings: -0.025em          (tighter, more premium)
Body text:        0 (default)
Tabular numbers:  font-feature-settings: "tnum" 1
```

---

### 2.3 Spacing System

```
Base unit: 4px (0.25rem)

4px   (1)  — Icon gaps, tight padding
8px   (2)  — Component internal padding sm
12px  (3)  — Component internal padding md
16px  (4)  — Section gaps, form field gaps
20px  (5)  — Card padding sm
24px  (6)  — Card padding md (standard)
28px  (7)  — Section padding
32px  (8)  — Section separation
40px (10)  — Large section breaks
48px (12)  — Page section padding
64px (16)  — Hero section spacing
```

#### Layout Grid
```
Sidebar width:       260px (collapsed: 72px for icon-only mode)
Header height:       64px
Main content:        max-width 1440px
Content padding:     24px (mobile) → 40px (desktop)
Card grid gap:       20px
Metric grid:         auto-fit, minmax(220px, 1fr)
```

---

### 2.4 Layout Architecture

#### Page Structure
```
┌─────────────────────────────────────────────────┐
│ SIDEBAR (260px fixed)       │ MAIN AREA          │
│ ┌─────────────────────────┐ │ ┌────────────────┐ │
│ │ LOGO + App Name          │ │ │ HEADER (64px)  │ │
│ │─────────────────────────│ │ │ Breadcrumb     │ │
│ │ NAV SECTION LABEL       │ │ │ User + Bell    │ │
│ │  • Nav Link (icon+text) │ │ └────────────────┘ │
│ │  • Nav Link active ●    │ │ ┌────────────────┐ │
│ │─────────────────────────│ │ │ PAGE HEADER    │ │
│ │ NAV SECTION LABEL       │ │ │ H1 + desc      │ │
│ │  • Nav Link             │ │ │ + CTA button   │ │
│ │─────────────────────────│ │ └────────────────┘ │
│ │ USER PROFILE (bottom)   │ │ ┌────────────────┐ │
│ │ Avatar + Name + Dept    │ │ │ KPI METRICS    │ │
│ │ + Sign out button       │ │ │ 3-4 stat cards │ │
│ └─────────────────────────┘ │ └────────────────┘ │
│                             │ ┌──────────┬─────┐ │
│                             │ │Main table│Side │ │
│                             │ │ or panel │card │ │
│                             │ └──────────┴─────┘ │
└─────────────────────────────────────────────────┘
```

#### KPI Metric Card Pattern
```
┌────────────────────────────────────────┐
│ [Icon bg]  METRIC VALUE    ↗ +12.3%   │
│   [icon]   0               trend chip  │
│            Label text                  │
│            ─────────────────           │
│            vs. last month sparkline    │
└────────────────────────────────────────┘
```

#### Shadow Scale
```
--shadow-xs:     0 1px 2px rgba(0,0,0,0.05)
--shadow-sm:     0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)
--shadow-md:     0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.05)
--shadow-lg:     0 10px 15px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.04)
--shadow-xl:     0 20px 25px rgba(0,0,0,0.10), 0 10px 10px rgba(0,0,0,0.04)
--shadow-2xl:    0 25px 50px rgba(0,0,0,0.20)
--shadow-sidebar: 4px 0 24px rgba(5,15,30,0.18)
--shadow-header:  0 1px 0 rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)
--shadow-card:    0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)
--shadow-card-hover: 0 4px 6px rgba(0,0,0,0.08), 0 12px 24px rgba(0,0,0,0.08)
--shadow-modal:  0 24px 64px rgba(0,0,0,0.22)
--shadow-inner:  inset 0 2px 4px rgba(0,0,0,0.06)
```

#### Border Radius Scale
```
--radius-sm:  4px    /* Chips, small badges */
--radius-md:  8px    /* Buttons, inputs, tags */
--radius-lg:  12px   /* Cards, panels */
--radius-xl:  16px   /* Modal dialogs, overlays */
--radius-2xl: 20px   /* Large cards, hero surfaces */
--radius-full: 9999px /* Pills, avatars */
```

---

## 3. Coder AI Prompt

> **Copy the block below and paste it into Coder AI / Cursor / GitHub Copilot Workspace**

---

```
You are a senior frontend engineer and UI/UX expert working on TOKIN Transport — a Next.js 16 (App Router) enterprise vehicle and OT transportation management system, built with React 19, Tailwind CSS v3, TypeScript, Supabase, Lucide React icons, and Recharts.

## 🎯 Mission
Elevate the entire application to a world-class, enterprise-grade dashboard with a modern, premium, and polished visual identity — inspired by Linear, Vercel Dashboard, Retool, and Notion's design language. Keep all existing logic and data flows completely intact.

## 📁 Project Structure
- `app/globals.css` — Global CSS and CSS variables
- `tailwind.config.ts` — Tailwind theme configuration
- `components/ui.tsx` — Core component library (Button, Card, Input, Select, Textarea, Badge, Field, etc.)
- `components/app-shell.tsx` — Root layout: sidebar + sticky header + main content
- `components/page-header.tsx` — Page title + description + optional CTA action
- `app/dashboard/page.tsx` — Dashboard with role-based KPI metrics and recent activity
- `components/admin-report-workspace.tsx` — Admin reports panel
- `components/admin-assignment-panel.tsx` — Admin booking assignment panel

## 🎨 Design System to Implement

### Google Fonts
Add to `app/globals.css`:
```css
@import url("https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap");
```

### CSS Variables (replace existing :root block in globals.css)
```css
:root {
  /* === Brand — Sapphire Blue === */
  --brand-950: #040d1a;
  --brand-900: #071628;
  --brand-800: #0a2240;
  --brand-700: #0d3261;
  --brand-600: #0f4285;
  --brand-500: #1457ad;
  --brand-400: #2e71c9;
  --brand-300: #5b99e0;
  --brand-200: #a8cdf0;
  --brand-100: #daeaf9;
  --brand-50:  #f0f7fd;

  /* Legacy aliases (for backward compat) */
  --brand: var(--brand-500);
  --brand-dark: var(--brand-700);
  --brand-light: var(--brand-50);

  /* === Amber Accent === */
  --accent-600: #b45309;
  --accent-500: #d97706;
  --accent-400: #f59e0b;
  --accent-100: #fef3c7;
  --accent-50:  #fffbeb;
  --accent: var(--accent-500);
  --accent-light: var(--accent-50);

  /* === Semantic === */
  --success: #16a34a;
  --success-light: #dcfce7;
  --danger: #dc2626;
  --danger-light: #fee2e2;
  --warning: #d97706;
  --warning-light: #fef3c7;
  --info: #2563eb;
  --info-light: #dbeafe;
  --violet: #7c3aed;
  --violet-light: #ede9fe;

  /* === Neutrals === */
  --ink: #0f172a;
  --ink-2: #1e293b;
  --text-secondary: #475569;
  --text-muted: #94a3b8;
  --text-placeholder: #cbd5e1;

  /* === Surfaces === */
  --canvas: #f8fafc;
  --surface: #ffffff;
  --surface-2: #f1f5f9;
  --surface-3: #e2e8f0;
  --line: #e2e8f0;
  --line-2: #cbd5e1;

  /* === Sidebar === */
  --sidebar-bg-from: #0c1e35;
  --sidebar-bg-to: #05101e;
  --sidebar-active-bg: rgba(255,255,255,0.09);
  --sidebar-hover-bg: rgba(255,255,255,0.055);
  --sidebar-border: rgba(255,255,255,0.07);
  --sidebar-text: rgba(255,255,255,0.85);
  --sidebar-text-muted: rgba(148,163,184,0.8);
  --sidebar-accent: #f59e0b;

  /* === Shadows === */
  --shadow-xs: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04);
  --shadow-md: 0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.04);
  --shadow-lg: 0 10px 15px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.04);
  --shadow-xl: 0 20px 25px rgba(0,0,0,0.10), 0 10px 10px rgba(0,0,0,0.04);
  --shadow-sidebar: 4px 0 32px rgba(5,15,30,0.20);
  --shadow-header: 0 1px 0 rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04);
  --shadow-card: 0 1px 3px rgba(15,23,42,0.06), 0 4px 16px rgba(15,23,42,0.04);
  --shadow-card-hover: 0 4px 6px rgba(15,23,42,0.08), 0 12px 28px rgba(15,23,42,0.08);
  --shadow-modal: 0 24px 64px rgba(5,15,30,0.22);
  --shadow-btn: 0 1px 3px rgba(14,87,173,0.25), 0 1px 1px rgba(0,0,0,0.05);

  /* === Layout === */
  --sidebar-w: 260px;
  --header-h: 64px;
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 12px;
  --radius-xl: 16px;
  --radius-2xl: 20px;
}
```

### Tailwind Config Updates (tailwind.config.ts)
Extend the theme to include:
- All new brand shades (50–950) keyed under `colors.brand`
- `colors.ink`, `colors.canvas`, `colors.surface`, `colors.line`
- `colors.accent` with full shade scale
- `colors.neutral` aliased to slate scale
- Font families: `display: ['Plus Jakarta Sans', ...]`, `sans: ['Inter', ...]`
- Box shadows: panel, card, card-hover, sidebar, header, modal, btn, inner
- All border-radius tokens

## 🏗️ Changes to Implement

### 1. `app/globals.css`
- Replace the Google Fonts import with Inter + Plus Jakarta Sans
- Replace the `:root` block with the full variable set above
- Update `body` font to `Inter` 
- Update heading elements to use `Plus Jakarta Sans` (via `font-display` utility class in tailwind)
- Keep all animation keyframes (fadeIn, slideInLeft, scaleIn) and stagger classes
- Add a `font-display` class: `font-family: var(--font-display, 'Plus Jakarta Sans')`
- Refine scrollbar to 5px with `#c7d2de` thumb and `#a0aec0` hover

### 2. `components/app-shell.tsx` — Premium Sidebar & Header

**Sidebar redesign:**
- Background: `linear-gradient(175deg, var(--sidebar-bg-from) 0%, var(--sidebar-bg-to) 100%)`
- Width: 260px, add subtle right border: `border-r border-white/[0.06]`
- Logo area height: 68px, add a subtle bottom separator with gradient line
- Sidebar nav section label: use `text-[10px] font-semibold uppercase tracking-[0.18em] text-white/30`
- Nav links: `px-3 py-2.5 rounded-lg` with smoother transitions
- **Active link**: white pill indicator on left edge (3px wide, 18px tall, rounded-full, amber color `#f59e0b`), bg `rgba(255,255,255,0.09)`, ring `ring-1 ring-white/[0.08]`
- **Hover link**: `rgba(255,255,255,0.055)` bg, text `rgba(255,255,255,0.9)`
- Icon: 17px, active: `text-white`, inactive: `text-slate-400`, hover: `text-white`
- Active dot indicator: replace with left-edge accent bar 
- User section at bottom: avatar with ring `ring-2 ring-white/15`, name `text-sm font-semibold`, dept `text-xs text-slate-400/80`
- Add a sign-out icon button next to the user info
- Add `shadow-sidebar` to the aside element

**Header redesign:**
- Height: 64px (already h-16 ✓)
- BG: `rgba(255,255,255,0.92)` with `backdrop-blur-md backdrop-saturate-150`
- Border bottom: `border-b border-slate-200/70`
- Box shadow: `var(--shadow-header)`
- Add breadcrumb trail: `TOKIN / {portalLabel} / {currentPageLabel}` with chevron separators in `text-slate-400`
- Right side: add a notification bell icon button (Lucide `Bell`) with optional badge count (static for now), followed by a user avatar/initials chip
- Role switcher (demo mode): style as a pill select with proper border and focus ring

### 3. `components/ui.tsx` — Premium Component Library

**Button:**
- `primary`: `bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white shadow-btn` with `transition-all duration-150`
- `secondary`: `bg-white border border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 shadow-xs`
- `outline`: `border border-brand-400 text-brand-500 hover:bg-brand-50`
- `danger`: `bg-danger hover:bg-red-700 text-white shadow-xs`
- `ghost`: `text-slate-600 hover:bg-slate-100 hover:text-ink`
- All sizes: `sm: h-8 px-3 text-xs`, `md: h-9 px-4 text-sm`, `lg: h-10 px-5 text-sm`
- Add `focus-visible:ring-2 focus-visible:ring-brand-400/50 focus-visible:ring-offset-2` to all variants

**Card:**
- `rounded-xl border border-slate-200/80 bg-white shadow-card`
- Add `transition-shadow duration-200` 
- Create `CardHover` variant that uses `hover:shadow-card-hover`

**Input / Select / Textarea:**
- Border: `border-slate-300`, focus: `border-brand-400 ring-[3px] ring-brand-400/12`
- Placeholder: `text-slate-400`
- Font: inherit from body (Inter)
- Height for Input/Select: `h-10`
- Border radius: `rounded-lg` (8px)

**Badge:**
- Upgrade to use new color tokens, add a dot indicator before the text
- `completed`: `bg-emerald-50 text-emerald-700 border-emerald-200/70` + green dot
- `rejected`: `bg-red-50 text-red-700 border-red-200/70` + red dot
- `pending_approval`: `bg-amber-50 text-amber-700 border-amber-200/70` + amber dot
- `approved`: `bg-brand-50 text-brand-600 border-brand-200/70` + blue dot
- `assigned`: `bg-violet-50 text-violet-700 border-violet-200/70` + violet dot
- `in_progress`: `bg-indigo-50 text-indigo-700 border-indigo-200/70` + indigo dot
- `cancelled`: `bg-slate-100 text-slate-600 border-slate-200/70` + gray dot
- Add an animated pulse dot for `in_progress` and `pending_approval`
- Shape: `rounded-full`, size: `text-[11px] font-medium px-2.5 py-1`

**Empty State:**
- Upgrade icon container: `rounded-xl bg-brand-50 p-4` with icon `text-brand-400`
- Title: `text-base font-semibold text-slate-800`
- Body: `text-sm text-slate-500`

**Add new: `Stat` component** for KPI metric cards:
```tsx
interface StatProps {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  tone: 'blue' | 'amber' | 'green' | 'violet' | 'red';
  trend?: { value: number; label: string }; // e.g. { value: 12.3, label: 'vs last week' }
  href?: string;
}
```
- Card background: subtle gradient per tone (e.g. blue: `linear-gradient(135deg, #f0f7fd 0%, #dbeafe 100%)`)
- Icon container: `rounded-xl p-2.5` with tone-matched solid bg
- Metric value: `text-3xl font-bold font-display tracking-tight text-ink`
- Trend chip: if positive `text-emerald-700 bg-emerald-50`, if negative `text-red-700 bg-red-50`
- Arrow icon (↑ or ↓) from Lucide `TrendingUp`/`TrendingDown`
- Full card is clickable if `href` is provided

**Add new: `SectionLabel` component** for sidebar/page section labels:
```tsx
<SectionLabel>Fleet Status</SectionLabel>
```
Style: `text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400`

### 4. `components/page-header.tsx`
- H1: `text-2xl sm:text-[28px] font-bold font-display tracking-tight text-ink`
- Description: `mt-1.5 text-sm leading-6 text-slate-500`
- Add optional `eyebrow` prop: small uppercase label above H1 (styled `text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-500`)
- Border bottom: `border-b border-slate-200`
- Bottom padding: `pb-5 mb-6`

### 5. `app/dashboard/page.tsx` — Premium Dashboard

**Hero section:**
- Greeting H1: `text-3xl sm:text-[34px] font-bold font-display tracking-tight text-ink`
- Eyebrow: role label in brand color with uppercase tracking
- Description: `text-sm text-slate-500 mt-2 leading-6`
- CTA button: upgrade to `Button` primary size `lg` with icon

**KPI Metrics section:**
- Replace bare metric grid with `Stat` component cards from ui.tsx
- Add `grid gap-5 sm:grid-cols-2 lg:grid-cols-4` (4 columns for admin, 3 for others)
- For admin: add 4th stat card — "Fleet ready" (available vehicles / total)
- Each card should have a relevant Lucide icon and gradient bg by tone

**Recent Activity card:**
- Use premium `Card` component
- Table rows: `hover:bg-slate-50` transition, `py-4 px-6`
- Destination text: `font-semibold text-slate-800 group-hover:text-brand-500 transition-colors`
- Sub-info: `text-xs text-slate-500` with `MapPin` icon
- Date/time column: styled with tabular mono font
- "View all" link: right-aligned, `text-sm font-semibold text-brand-500 hover:text-brand-700`
- Add row hover state with subtle left border accent

**Fleet readiness card:**
- Section label eyebrow: "Fleet Readiness"
- Title H2: `text-lg font-semibold font-display text-ink`
- Progress bars: `h-2 rounded-full` with `bg-brand-500` fill and `bg-slate-100` track
- Labels: left `text-sm text-slate-600`, right `font-semibold text-ink`
- Value fraction: `font-semibold text-ink` + `/total` in `text-slate-400`

## ⚙️ Technical Rules
1. **TypeScript strict** — all component props must be fully typed, no `any`
2. **No logic changes** — only visual/CSS/class changes unless adding new components
3. **Preserve all existing Tailwind classes** that affect layout, just upgrade styling ones
4. **Use CSS variables** via `[color:var(--brand-500)]` where Tailwind can't express it
5. **Keep bilingual support** — Sarabun fallback must remain in the font stack
6. **Animation timing** — keep existing 200ms default, use `cubic-bezier(0.4,0,0.2,1)` easing
7. **Accessibility** — preserve all focus-visible rings, aria attributes, and keyboard navigation
8. **No external UI libraries** — implement all components from scratch using Tailwind

## 📋 Deliverables (in order)
1. Update `app/globals.css` — new fonts, full CSS variable block, refined scrollbar
2. Update `tailwind.config.ts` — full new color/font/shadow/radius theme
3. Update `components/ui.tsx` — all component upgrades + new Stat + SectionLabel
4. Update `components/app-shell.tsx` — premium sidebar + header
5. Update `components/page-header.tsx` — eyebrow prop + typography upgrade
6. Update `app/dashboard/page.tsx` — use Stat cards, upgraded layout

Apply all changes while ensuring `npm run dev` builds without TypeScript errors.
```

---

## 4. Quick Reference — Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Inter** body font | Industry-standard for enterprise dashboards (Linear, Vercel, Notion) |
| **Plus Jakarta Sans** display | Geometric humanist — premium feel without being trendy |
| **Sapphire blue scale** (not flat #07529a) | Full scale enables proper semantic gradation and dark mode readiness |
| **Sidebar depth gradient** | Deep navy-to-near-black creates visual hierarchy and reduces eye strain |
| **Glassmorphism header** | Allows content to bleed through, feels modern and lightweight |
| **Frosted-glass + blur** | Premium SaaS signature detail (Linear, Figma) |
| **Left-edge active indicator** | Clear, accessible active state without cluttering text |
| **Animated pulse dot** | Draws attention to actionable/live states without being distracting |
| **4-stat KPI grid** (admin) | Maximizes data density at a glance — enterprise dashboard standard |
| **Trend chips on metrics** | Contextualizes data — turns numbers into insights |
| **Eyebrow labels** | Establishes page context and role instantly |
| **Tabular numbers** | Prevents layout shift in dynamic metric values |
