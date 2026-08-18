# 🛡️ TOKIN Car Service — Risk Register & Disaster Recovery Plan (DRP)

> **Document Version**: 1.0  
> **Last Updated**: 18 สิงหาคม 2569  
> **Target RTO (Recovery Time Objective)**: < 1 ชั่วโมง  
> **Target RPO (Recovery Point Objective)**: < 15 นาที

---

## 📊 Risk Register Matrix

| Risk ID | Failure Scenario | Risk Level | Impact | Likelihood | Mitigation / Preventive Measure | Recovery & Fallback Protocol |
|---------|------------------|------------|--------|------------|---------------------------------|------------------------------|
| **RISK-01** | **Supabase Database / Cloud Outage** | 🔴 High | Critical | Low | • Daily automated DB backups<br>• LocalStorage demo mode fallback (`csrs-mvp-data`) | 1. Activate Local Fallback / Standby Read Replica<br>2. GA exports daily dispatch PDF/Excel before operating hours<br>3. Manual paper log fallback |
| **RISK-02** | **Power Automate / Email Delivery Failure** | 🟡 Medium | High | Medium | • Edge function rate limiting & retry outbox<br>• `approval-callback` idempotency checks | 1. Managers approve directly via `/approvals` portal<br>2. Admin manually triggers approval override with HR ticket |
| **RISK-03** | **Tiger Space HR System Import Failure / Delay** | 🟡 Medium | Medium | Medium | • Flexible Excel parser matching (`lib/tiger-space-report.ts`) supporting `.xls` & `.xlsx`<br>• Fuzzy matching (Exact, Time check, Not found) | 1. HR uses `manager_exception` verification mode in portal<br>2. Manual entry of employee OT confirmation note |
| **RISK-04** | **Double-Booking / Concurrent Assignment Conflict** | 🟢 Low | High | Low | • PostgreSQL trigger `check_vehicle_overlap()`<br>• Database function `FOR UPDATE` row lock | 1. Transaction rolls back cleanly with error toast<br>2. GA selects alternative available vehicle from dynamic fleet pool |
| **RISK-05** | **Driver Mobile Connection Loss during Trip Entry** | 🟢 Low | Low | Medium | • Optimistic UI updates with offline state persistence | 1. Driver logs mileage on paper dispatch ticket<br>2. GA enters trip departure/arrival mileage on behalf of driver at end of day |
| **RISK-06** | **Session Hijacking / XSS Attack** | 🔴 High | Critical | Low | • `HttpOnly` Secure SameSite cookies via `@supabase/ssr`<br>• Removed `localStorage` token backups<br>• Security headers in `next.config.mjs` | 1. Immediate Supabase Auth session revocation (`auth.signOut()`)<br>2. Rotate JWT secret key in Supabase console |

---

## 🚨 Incident Response & Contingency Protocols (Step-by-Step)

### Scenario 1: Total Cloud Infrastructure Outage (Supabase Down)

```
[System Outage Detected]
         │
         ├──> 1. GA Action: Open /admin/reports and print/export Daily Dispatch Sheet (PDF/Excel)
         │
         ├──> 2. Requester Action: Switch to Offline Emergency Form (or GA Emergency Contact Line)
         │
         ├──> 3. Tech Action: Check Supabase Status Page (status.supabase.com)
         │       └── If prolonged (> 1hr): Restore Point-in-Time Backup (PITR) to standby instance
         │
         └──> 4. Post-Incident: Sync manual paper bookings back into PostgreSQL upon restoration
```

---

### Scenario 2: Email Approval Flow Disruption (Power Automate Down)

```
[Approval Email Not Received]
         │
         ├──> 1. Requester alerts GA or Manager
         │
         ├──> 2. Manager signs in directly at https://tokin-transport.company.com/approvals
         │       └── Review and click "Approve" / "Reject" directly in portal
         │
         └──> 3. Technical Admin checks Edge Function logs (`public-submit-request` & `approval-callback`)
                 └── Resend approval payload via Power Automate retry dashboard
```

---

### Scenario 3: Tiger Space OT Verification Deadline Exceeded

```
[OT Report Delayed Past Transport Cutoff (e.g. 15:00)]
         │
         ├──> 1. System flags booking as "Waiting for OT verification"
         │
         ├──> 2. GA may pre-plan daily vehicle assignment (status remains "Assigned - Draft")
         │
         ├──> 3. HR performs manual verification via "Manager Exception Mode" on Portal
         │
         └──> 4. Vehicle assignment confirmed for departure
```

---

## 📝 Compliance & Maintenance Checklist

- [x] **Automated Database Backups**: Supabase Daily PITR enabled (7-day retention minimum).
- [x] **Idempotent Callbacks**: Power Automate callbacks retry safely without duplicate database records.
- [x] **Rate Limiting**: Public endpoints protected against DDoS and automated brute-force attacks.
- [x] **Audit Trail**: Every mutation logged in `public.audit_logs` with actor ID and timestamp.
- [x] **Dispatch Continuity**: Excel/PDF dispatch sheets generated daily at 16:00 for offline driver fallback.
