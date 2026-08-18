# 🚗 TOKIN Car Service — Enterprise System Analysis & Recommendations

> **วันที่วิเคราะห์**: 18 สิงหาคม 2569  
> **Stack ปัจจุบัน**: Next.js 16 · TypeScript · Supabase (PostgreSQL + Auth + Edge Functions) · Tailwind CSS · React Hook Form + Zod  
> **ขนาด**: 27 migrations · 14 Edge Functions · 23 components · ~200K+ lines total

---

## 📊 ภาพรวมระบบที่วิเคราะห์

ระบบนี้คือ **Car Service Requisition System (CSRS)** สำหรับบริษัทขนาดกลาง-ใหญ่ มีฟีเจอร์ดังนี้:

- **Booking workflow**: Employee → Approver (Email/In-app) → Admin (GA) → Driver
- **Overtime transport**: รองรับ OT booking แบบ employee และ HR-direct พร้อม Tiger Space verification
- **Assignment engine**: จับคู่รถ+คนขับ พร้อม double-booking prevention ที่ DB layer
- **Trip logging**: Driver บันทึก mileage, เวลา, ค่าใช้จ่าย
- **External approval**: Callback endpoint สำหรับ Power Automate workflow
- **Public forms**: Token-based access สำหรับ approver ที่ไม่มี account

---

## 🔴 ปัญหาวิกฤติ (Critical Issues)

### 1. God State Anti-pattern ใน `app-provider.tsx`

**ปัญหา**: `AppProvider` เป็น single context ที่ถือ data ทุกอย่าง (bookings, vehicles, drivers, role, auth state) ทำให้:
- ทุก component re-render เมื่อ state ใดๆ เปลี่ยน
- `loadAppData()` ดึง **ทุก booking จาก DB ในครั้งเดียว** (`select *`) โดยไม่มี pagination
- ไม่มี stale-time / cache invalidation strategy ที่ถูกต้อง

```typescript
// ❌ ปัญหา: ดึงทุก booking มา reload ทุกครั้งที่มี action
const refresh = async () => {
  if (!supabase) return;
  setData(await loadAppData(supabase)); // ← O(N) บน production
};
```

**แนวทาง Enterprise**: ใช้ **TanStack Query (React Query)** แยก server state ออกจาก UI state พร้อม `staleTime`, `gcTime`, pagination, และ optimistic updates

---

### 2. ไม่มี Audit Trail ที่แท้จริง

**ปัญหา**: DB schema ออกแบบ `audit_logs` ไว้ใน design doc แต่ **ไม่ได้ implement** ใน migrations จริง (ไม่พบ table `audit_logs` ในไฟล์ migration ใดเลย)

**ผลกระทบ**: ไม่สามารถตรวจสอบย้อนหลังได้ว่าใครเปลี่ยนอะไร เมื่อไหร่ ซึ่งเป็นข้อกำหนดพื้นฐานของระบบ enterprise

**แนวทาง**: สร้าง PostgreSQL trigger บน table หลัก ที่ write ลง `audit_logs` ทุกครั้งที่ INSERT/UPDATE/DELETE

---

### 3. Security: Session Token เก็บใน `localStorage`

```typescript
// ⚠️ ใน app-provider.tsx
function storeSessionBackup(session: SessionBackup | null) {
  if (session)
    window.localStorage.setItem(SESSION_BACKUP_KEY, JSON.stringify(session)); 
    // ← เก็บ access_token + refresh_token ใน localStorage = XSS risk
}
```

**ผลกระทบ**: หาก XSS vulnerability เกิดขึ้น attacker สามารถ steal session token และ impersonate user ได้

**แนวทาง**: ใช้ `HttpOnly` cookies ผ่าน `@supabase/ssr` อย่างถูกต้อง — Supabase SSR จัดการ cookie-based session ให้อยู่แล้ว ไม่จำเป็นต้อง backup เอง

---

### 4. Approval Callback ไม่มี Idempotency Key

```typescript
// ใน approval-callback/index.ts
// ตรวจสอบแค่ status === 'pending_approval' แต่ไม่มี idempotency key
if (booking.status !== 'pending_approval') 
  return json({ ok: true, alreadyProcessed: true });
```

**ผลกระทบ**: ถ้า Power Automate retry call ซ้ำ (ซึ่ง PA ทำโดย default) อาจ insert approval record ซ้ำก่อนที่ status จะ update ได้ (race condition ระหว่าง check และ insert)

**แนวทาง**: ใช้ `INSERT ... ON CONFLICT DO NOTHING` พร้อม unique constraint บน `(booking_id, action)` หรือ `idempotency_key` column

---

### 5. RLS Policy ช่องโหว่ใน `profiles_read`

```sql
-- ❌ ทุก authenticated user มองเห็น profile ทุกคน
create policy profiles_read on public.profiles 
  for select to authenticated using (true);
```

**ผลกระทบ**: Employee สามารถ query ข้อมูล (employee_id, department, role) ของพนักงานทุกคนในองค์กรได้ แม้จะไม่จำเป็น

**แนวทาง**: จำกัดเฉพาะ column ที่จำเป็นสำหรับแต่ละ role และสร้าง view แยกสำหรับ search

---

## 🟡 ปัญหาสำคัญ (High Priority)

### 6. ไม่มี Rate Limiting บน Edge Functions

Edge Functions (`public-submit-request`, `approval-callback` ฯลฯ) ไม่มี rate limiting เลย ทำให้ถูก abuse ได้

**แนวทาง**: เพิ่ม `Upstash Redis` หรือ in-memory counter ใน Edge Function พร้อม `X-RateLimit-*` headers

---

### 7. Database: Booking No Sequence ไม่ Thread-safe สำหรับ Multi-year

```sql
create sequence public.booking_number_seq start 1;
-- ← sequence ไม่ reset ทุกปี! ปีหน้าจะได้ CSR-2027-008xxx ต่อจากเดิม
```

**แนวทาง**: ใช้ per-year sequence หรือ computed column `CSR-YEAR-LPAD(seq, 6, '0')` ที่มี unique constraint compound บน `(year, seq_within_year)`

---

### 8. ไม่มี Soft Delete บน Vehicles และ Drivers

```sql
-- ปัจจุบัน: แค่ flag is_active แต่ยังอ้างอิงจาก FK ได้ปกติ
is_active boolean not null default true
```

**ผลกระทบ**: ถ้า "deactivate" vehicle แล้ว historical booking ยังอ้างอิงถึง vehicle นั้น แต่ถ้า delete จริง FK จะ error

**แนวทาง**: เพิ่ม `deleted_at timestamptz` (proper soft delete) พร้อม view `active_vehicles` และ `active_drivers`

---

### 9. Missing Error Boundaries และ Loading States

Component ขนาดใหญ่ (`public-request-form.tsx` = 39,987 bytes, `public-manage-request.tsx` = 37,210 bytes) ไม่มี `React.Suspense` หรือ Error Boundary ทำให้ถ้า fetch error → blank screen

---

### 10. ไม่มี Database Connection Pooling Configuration

ระบบ production ควรมี PgBouncer หรือ Supabase connection pool configuration แยก environment

---

## 🟢 สิ่งที่ทำได้ดี (Strengths)

| จุดแข็ง | รายละเอียด |
|--------|-----------|
| ✅ **RLS ครบ** | ทุก table มี Row Level Security enable พร้อม helper functions `app_role()`, `can_view_booking()` |
| ✅ **DB-layer Business Logic** | Critical operations เป็น PostgreSQL functions (assign_booking, decide_booking, start_trip, complete_trip) มี FOR UPDATE lock ป้องกัน race condition |
| ✅ **Double-booking Prevention** | ตรวจสอบ overlap ทั้งที่ API layer (business.ts) และ DB layer (assign_booking function) |
| ✅ **Progressive Migration** | 27 migrations ที่ atomic และ backward-compatible ออกแบบได้ดีมาก |
| ✅ **Type Safety** | TypeScript types ครอบคลุมทุก entity, ใช้ Zod validate ทั้ง client และ server |
| ✅ **Demo Mode** | Fallback mock data เมื่อ Supabase ไม่ได้ configure — ช่วย developer experience |
| ✅ **Edge Function Security** | ใช้ `POWER_AUTOMATE_CALLBACK_SECRET` header ป้องกัน unauthorized callback |
| ✅ **Driver License Expiry** | ตรวจสอบ `license_expiry >= using_date` ใน assign_booking function |

---

## 🏗️ แผน Enterprise Redesign

### Architecture ที่แนะนำ

```
┌─────────────────────────────────────────────────────────────────┐
│                    ENTERPRISE ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────────┤
│  Client Layer                                                    │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────────────┐    │
│  │ Next.js 16 │  │ PWA (Driver) │  │ LINE / MS Teams Bot  │    │
│  │ App Router │  │ Offline-first│  │ (Notifications)      │    │
│  └────────────┘  └──────────────┘  └──────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│  State & Data Layer                                              │
│  ┌─────────────────────┐  ┌─────────────────────────────────┐  │
│  │   TanStack Query    │  │      Zustand (UI State)         │  │
│  │   (Server State)    │  │   (Modals, Filters, Prefs)      │  │
│  └─────────────────────┘  └─────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  API Layer                                                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Next.js Route Handlers (/api/v1/**)                       │  │
│  │ • Zod validation  • Rate limiting  • Error normalization  │  │
│  └──────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  Backend (Supabase)                                              │
│  ┌────────────┐  ┌─────────────┐  ┌──────────┐  ┌──────────┐  │
│  │ PostgreSQL │  │ Edge Funcs  │  │ Storage  │  │ Realtime │  │
│  │ + RLS + PG │  │ (Deno)      │  │ (Files)  │  │ (Push)   │  │
│  │   Triggers │  │             │  │          │  │          │  │
│  └────────────┘  └─────────────┘  └──────────┘  └──────────┘  │
├─────────────────────────────────────────────────────────────────┤
│  External Services                                               │
│  ┌───────────┐  ┌─────────────┐  ┌─────────┐  ┌───────────┐  │
│  │  Resend   │  │ Power Auto- │  │ Azure   │  │  Sentry   │  │
│  │  (Email)  │  │ mate (Flow) │  │ AD/SSO  │  │  (Error)  │  │
│  └───────────┘  └─────────────┘  └─────────┘  └───────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📋 Roadmap การปรับปรุง (Priority Order)

### Phase 1 — Security & Stability (Sprint 1-2, ~2 สัปดาห์)

| # | งาน | Impact | Effort |
|---|-----|--------|--------|
| 1.1 | **ลบ localStorage session backup** — ใช้ Supabase SSR cookie ล้วนๆ | 🔴 Critical | S |
| 1.2 | **เพิ่ม `audit_logs` table + trigger** บน bookings, approvals, vehicle_assignments | 🔴 Critical | M |
| 1.3 | **Fix RLS `profiles_read`** — จำกัด column visibility ตาม role | 🔴 Critical | S |
| 1.4 | **Idempotency key** บน approval-callback (unique constraint + ON CONFLICT) | 🔴 Critical | S |
| 1.5 | **Rate limiting** บน public Edge Functions | 🔴 Critical | M |

### Phase 2 — Performance & Scalability (Sprint 3-4, ~2 สัปดาห์)

| # | งาน | Impact | Effort |
|---|-----|--------|--------|
| 2.1 | **แทน AppProvider ด้วย TanStack Query** — pagination, stale time, optimistic updates | 🟠 High | L |
| 2.2 | **Server-side pagination** สำหรับ `/admin/bookings` (cursor-based) | 🟠 High | M |
| 2.3 | **Realtime subscription** แทน full `refresh()` — subscribe เฉพาะ booking ID ที่เปลี่ยน | 🟠 High | M |
| 2.4 | **Database indexes เพิ่มเติม** — `(using_date, status)`, `(approver_id, status)` | 🟠 High | S |
| 2.5 | **Error Boundaries + Suspense** ครอบ critical page components | 🟡 Medium | M |

### Phase 3 — Observability & Operations (Sprint 5-6, ~2 สัปดาห์)

| # | งาน | Impact | Effort |
|---|-----|--------|--------|
| 3.1 | **Sentry integration** — error tracking + performance monitoring | 🟠 High | M |
| 3.2 | **Structured logging** ใน Edge Functions (JSON log format) | 🟡 Medium | S |
| 3.3 | **Health check endpoint** `/api/health` — DB ping, external service status | 🟡 Medium | S |
| 3.4 | **Dashboard KPIs แบบ real-time** — pending queue count, driver availability | 🟡 Medium | M |
| 3.5 | **Cron: License expiry alerts** — แจ้งเตือน admin 30/7 วันก่อน expire | 🟡 Medium | M |

### Phase 4 — Enterprise Features (Sprint 7-10, ~4 สัปดาห์)

| # | งาน | Impact | Effort |
|---|-----|--------|--------|
| 4.1 | **Approval Delegation** — approver มอบหมายให้คนอื่นเมื่อลา | 🟠 High | L |
| 4.2 | **Multi-level approval** — ตาม cost threshold หรือ trip category | 🟠 High | L |
| 4.3 | **Vehicle Maintenance Tracker** — บันทึก service, แจ้ง km ถัดไป | 🟡 Medium | L |
| 4.4 | **Cost Centre Allocation** — split ค่าใช้จ่ายหลาย department | 🟡 Medium | L |
| 4.5 | **Recurring Booking Templates** — daily/weekly trip templates | 🟡 Medium | M |
| 4.6 | **Driver Mobile PWA** — offline-first สำหรับ trip logging | 🟡 Medium | XL |
| 4.7 | **Calendar View (Admin)** — drag-and-drop assignment | 🟡 Medium | L |

---

## 🔧 Code-level Recommendations (ละเอียด)

### 1. แทน AppProvider ด้วย TanStack Query

```typescript
// ❌ ปัจจุบัน: monolithic state
const [data, setData] = useState<AppData>(seedData);
const refresh = async () => setData(await loadAppData(supabase));

// ✅ Enterprise: TanStack Query
export const useBookings = (filters?: BookingFilters) =>
  useQuery({
    queryKey: ['bookings', filters],
    queryFn: () => fetchBookings(supabase, filters),
    staleTime: 30_000,        // 30 วิก่อน refetch
    gcTime: 5 * 60_000,       // cache 5 นาที
    placeholderData: keepPreviousData, // no flickering during pagination
  });

export const useUpdateBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (args: UpdateBookingArgs) => persistBookingUpdate(supabase, args),
    onMutate: async (args) => {
      // Optimistic update
      await qc.cancelQueries({ queryKey: ['bookings'] });
      const prev = qc.getQueryData(['bookings', args.filters]);
      qc.setQueryData(['bookings', args.filters], (old) => applyPatch(old, args));
      return { prev };
    },
    onError: (_err, _args, ctx) => qc.setQueryData(['bookings'], ctx?.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['bookings'] }),
  });
};
```

---

### 2. Audit Log Trigger (SQL)

```sql
-- สร้าง audit_logs table
CREATE TABLE public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name  TEXT NOT NULL,
  record_id   UUID NOT NULL,
  operation   TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  actor_id    UUID REFERENCES public.profiles(id),
  old_data    JSONB,
  new_data    JSONB,
  changed_fields TEXT[], -- เฉพาะ fields ที่เปลี่ยน
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_record_idx ON public.audit_logs(table_name, record_id);
CREATE INDEX audit_logs_actor_idx ON public.audit_logs(actor_id, created_at DESC);

-- Generic trigger function
CREATE OR REPLACE FUNCTION public.audit_trigger_fn()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  changed TEXT[] := '{}';
  key TEXT;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    FOR key IN SELECT jsonb_object_keys(to_jsonb(NEW)) LOOP
      IF (to_jsonb(OLD) -> key) IS DISTINCT FROM (to_jsonb(NEW) -> key) THEN
        changed := changed || key;
      END IF;
    END LOOP;
  END IF;
  INSERT INTO public.audit_logs (table_name, record_id, operation, actor_id, old_data, new_data, changed_fields)
  VALUES (
    TG_TABLE_NAME,
    CASE TG_OP WHEN 'DELETE' THEN OLD.id ELSE NEW.id END,
    TG_OP,
    (SELECT auth.uid()),
    CASE TG_OP WHEN 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE TG_OP WHEN 'DELETE' THEN NULL ELSE to_jsonb(NEW) END,
    CASE TG_OP WHEN 'UPDATE' THEN changed ELSE NULL END
  );
  RETURN CASE TG_OP WHEN 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

-- Apply to critical tables
CREATE TRIGGER bookings_audit AFTER INSERT OR UPDATE OR DELETE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER approvals_audit AFTER INSERT ON public.approvals
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
CREATE TRIGGER vehicle_assignments_audit AFTER INSERT OR UPDATE ON public.vehicle_assignments
  FOR EACH ROW EXECUTE FUNCTION public.audit_trigger_fn();
```

---

### 3. Rate Limiting บน Edge Functions

```typescript
// supabase/functions/_shared/rate-limit.ts
const windows = new Map<string, { count: number; reset: number }>();

export function checkRateLimit(
  key: string,
  limit = 20,
  windowMs = 60_000
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const w = windows.get(key);
  
  if (!w || now > w.reset) {
    windows.set(key, { count: 1, reset: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  
  w.count++;
  if (w.count > limit) {
    return { allowed: false, remaining: 0, resetAt: w.reset };
  }
  return { allowed: true, remaining: limit - w.count, resetAt: w.reset };
}
```

---

### 4. Centralized API Error Handling

```typescript
// lib/api/errors.ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly statusCode: number = 400,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const Errors = {
  UNAUTHORIZED: () => new AppError('UNAUTHORIZED', 'Authentication required', 401),
  FORBIDDEN: (action: string) => new AppError('FORBIDDEN', `Not authorized to ${action}`, 403),
  NOT_FOUND: (entity: string) => new AppError('NOT_FOUND', `${entity} not found`, 404),
  CONFLICT: (msg: string) => new AppError('CONFLICT', msg, 409),
  VALIDATION: (details: unknown) => new AppError('VALIDATION_ERROR', 'Validation failed', 422, details),
} as const;

// lib/api/response.ts
export function apiError(error: unknown) {
  if (error instanceof AppError) {
    return Response.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      { status: error.statusCode }
    );
  }
  // Log unexpected errors to Sentry
  console.error('[Unhandled]', error);
  return Response.json({ error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } }, { status: 500 });
}
```

---

### 5. Schema: Role ควรเป็น Multi-role

```sql
-- ❌ ปัจจุบัน: single role (ไม่รองรับ admin ที่ต้องทำ OT request ด้วย)
role text not null check (role in ('requester','approver','admin','driver'))

-- ✅ Enterprise: roles array หรือ separate permissions table
CREATE TABLE public.user_roles (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role    TEXT NOT NULL CHECK (role IN ('requester','approver','admin','driver')),
  PRIMARY KEY (user_id, role)
);

-- Helper function ที่ตรวจสอบ ANY role
CREATE OR REPLACE FUNCTION public.user_has_role(p_role TEXT)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = p_role
  )
$$;
```

---

### 6. Booking Number: Per-Year Reset

```sql
-- ✅ แทน global sequence ด้วย per-year approach
CREATE OR REPLACE FUNCTION public.generate_booking_no()
RETURNS text LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  current_year INT := EXTRACT(YEAR FROM CURRENT_DATE)::INT;
  next_seq BIGINT;
BEGIN
  -- upsert year counter
  INSERT INTO public.booking_year_counters (year, last_seq)
  VALUES (current_year, 1)
  ON CONFLICT (year) DO UPDATE
    SET last_seq = public.booking_year_counters.last_seq + 1
  RETURNING last_seq INTO next_seq;
  
  RETURN 'CSR-' || current_year || '-' || LPAD(next_seq::TEXT, 6, '0');
END;
$$;
```

---

## 📐 Database Schema ที่ขาดหาย (ควรเพิ่ม)

```sql
-- 1. Approval Delegation
CREATE TABLE public.approval_delegations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delegator_id UUID NOT NULL REFERENCES public.profiles(id),
  delegate_id  UUID NOT NULL REFERENCES public.profiles(id),
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  reason      TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT no_self_delegation CHECK (delegator_id <> delegate_id),
  CONSTRAINT valid_date_range CHECK (end_date >= start_date)
);

-- 2. Notifications (พบใน design doc แต่ไม่มีใน migrations)
CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  booking_id  UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  type        TEXT NOT NULL,  -- 'approval_required','status_changed','trip_assigned'
  title       TEXT NOT NULL,
  body        TEXT,
  action_url  TEXT,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  read_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX notifications_user_unread_idx ON public.notifications(user_id, is_read, created_at DESC)
  WHERE is_read = false;

-- 3. Vehicle Maintenance
CREATE TABLE public.vehicle_maintenance (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id      UUID NOT NULL REFERENCES public.vehicles(id),
  service_type    TEXT NOT NULL,  -- 'oil_change','tire_rotation','annual_inspection'
  service_date    DATE NOT NULL,
  mileage_at_service NUMERIC(10,1),
  next_service_mileage NUMERIC(10,1),
  next_service_date DATE,
  cost            NUMERIC(10,2),
  notes           TEXT,
  serviced_by     TEXT,
  recorded_by     UUID REFERENCES public.profiles(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 🧪 Testing Strategy (ปัจจุบันไม่มีเลย)

```
Unit Tests (Vitest):
├── lib/business.ts          — overlaps(), findAssignmentConflict()
├── lib/validation.ts        — bookingSchema, tripCompleteSchema
└── lib/date-format.ts       — date utilities

Integration Tests (Vitest + Supabase local):
├── RLS policies             — ทดสอบว่าแต่ละ role เห็นอะไรได้บ้าง
├── DB functions             — decide_booking, assign_booking, start_trip, complete_trip
└── Migration integrity      — schema ถูกต้องหลัง apply ทุก migration

E2E Tests (Playwright):
├── Full booking flow:        Requester → Approver → Admin → Driver
├── Rejection flow:           Reject + resubmit
├── OT transport flow:        Tiger Space verification
└── Admin direct booking:     HR-direct flow
```

---

## 📊 Performance Benchmarks ที่ควรตั้ง

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Page Load (LCP) | < 2.5s | > 4s |
| API Response (P95) | < 500ms | > 2s |
| DB Query (P99) | < 100ms | > 500ms |
| Booking Creation | < 1s | > 3s |
| `loadAppData()` | ยกเลิก — ใช้ pagination | - |

---

## 🔐 Security Checklist (Enterprise Standard)

- [ ] **CSP Headers** — Content Security Policy บน Next.js
- [ ] **CORS Configuration** — ล็อค origin บน Edge Functions
- [ ] **Input Sanitization** — HTML encoding ก่อน render ทุก user-generated content  
- [ ] **File Upload Validation** — ตรวจ MIME type จริงๆ ไม่ใช่แค่ extension
- [ ] **Dependency Audit** — `npm audit` ใน CI/CD pipeline
- [ ] **Secret Rotation** — มีกระบวนการ rotate `POWER_AUTOMATE_CALLBACK_SECRET`
- [ ] **2FA** — บังคับสำหรับ Admin role
- [ ] **Session Timeout** — กำหนด JWT expiry ที่เหมาะสม (8-12 ชั่วโมง)

---

## 🎯 สรุป — สิ่งที่ทำทันที vs ระยะยาว

### ✅ ทำทันที (Quick Wins, < 1 วัน)
1. ลบ `storeSessionBackup` / `readSessionBackup` ออกทั้งหมด
2. เพิ่ม `X-Content-Type-Options`, `X-Frame-Options` headers ใน `next.config.mjs`
3. Fix RLS `profiles_read` — จำกัดเฉพาะ columns ที่จำเป็น
4. เพิ่ม `.env.example` ให้ครบ (ปัจจุบันมีแล้ว — ตรวจสอบว่าครบ)

### 📅 ระยะกลาง (2-4 สัปดาห์)
1. Implement `audit_logs` + triggers
2. แทน AppProvider ด้วย TanStack Query
3. เพิ่ม server-side pagination
4. เพิ่ม `notifications` table + real-time push
5. เพิ่ม E2E tests ด้วย Playwright

### 🏢 Enterprise (1-3 เดือน)
1. Approval Delegation system
2. Multi-level approval routing
3. Driver Mobile PWA (offline-first)
4. Fleet Analytics Dashboard
5. SSO/AD integration (ปัจจุบันมี Microsoft OAuth แล้ว — ขยายได้)
6. Compliance reporting (ISO-ready audit export)
