# Step 2 security dependency validation

Date: 2026-10-26
Branch: `validation/step2-20261026`

## Scope

This validation remediates the dependency advisories reported after the Step 2
workflow and database validation. No production environment or linked Supabase
project was changed.

## Controlled upgrades

- Zod 3 to Zod 4.6.7, including preservation of booking passenger error messages.
- React Hook Form resolvers 3 to 5.2.2 for Zod 4 compatibility.
- Tailwind CSS 3 to 4.3.3 and the dedicated `@tailwindcss/postcss` plugin.
- Vitest 4 to 5.0.5 with Vite 8.3.5.
- Node.js project baseline raised to 22.12 because Vitest 5 requires it.
- Removed the no-longer-required Autoprefixer dependency; Tailwind 4 performs
  import processing and vendor prefixing through its PostCSS plugin.

## Verification

- `npm audit --audit-level=moderate`: 0 vulnerabilities.
- `npm run typecheck`: passed.
- `npm test`: 21 files and 102 tests passed.
- `npm run build`: passed; all 33 static pages generated.
- Desktop visual check: home page rendered with the TOKIN theme.
- Responsive visual check: home and overtime request pages rendered without
  horizontal overflow.
- Browser console: no warnings or errors during the visual checks.
- Remote local-database validation completed before this dependency change:
  migration reset, pgTAP database tests, and database lint all returned success.
- Existing `ocrweb` and `ocrwebtest` containers remained running and unchanged.

## Runtime baseline

- Node.js: 22.12 or newer.
- npm: 10 or newer.
- Browser baseline for Tailwind CSS 4: current company-managed Microsoft Edge or
  another browser supporting modern CSS features.

The validation branch must repeat `npm ci`, `npm run verify`, and `npm audit`
on the remote validation computer after pulling this commit.
