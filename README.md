# Car Service Requisition System

MVP v1.0 for a role-based company vehicle requisition workflow. The app runs entirely on seeded mock data and persists demo changes in browser `localStorage`; Supabase is not required.

## Included scope

- Demo role switcher for Requester, Approver, Admin, and Driver
- Request submission, lists, detail views, approval/rejection, and assignment
- Vehicle/driver overlap detection and vehicle capacity filtering
- Weekly booking schedule and vehicle/driver management
- Driver acceptance, departure, mileage, completion, expenses, and remarks
- Basic reports with Excel and PDF exports

Explicitly excluded: LINE Notify, GPS, QR check-in, AI scheduling, carbon tracking, multi-site support, notifications, attachments, user management, and advanced automation.

## Local setup

Requirements: Node.js 18.17 or newer (Node.js 20 LTS recommended) and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and choose a demo role. To create a production build:

```bash
npm run build
npm start
```

## Architecture

- `app/`: Next.js 14 App Router pages organized by role
- `components/`: shared shell, tables, form primitives, and domain views
- `lib/types.ts`: Supabase-aligned domain types
- `lib/mock-data.ts`: local seed records
- `lib/validation.ts`: Zod request/assignment/trip schemas
- `lib/business.ts`: overlap, cost, and display utilities
- `components/app-provider.tsx`: mock repository/state boundary

The provider is the intended replacement boundary for the next phase. A Supabase repository can implement the same read/write operations without changing page contracts. Environment variable placeholders are documented in `.env.example`.

## Demo reset

State is stored under `csrs-mvp-data` in browser local storage. Clear site data to restore the original seed records.
