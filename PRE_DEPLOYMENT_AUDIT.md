# Pre-Deployment Security Audit — Stays

**Project:** Farm Stays (`stays`) — Next.js 14 / Prisma / Supabase booking platform  
**Audit source:** Claud multi-agent pre-deployment review (Sep 2026)  
**Independent verification:** Cursor code review + remediation Phases 0–4  
**Last updated:** 2026-09-19

## Executive summary

| Verdict | Status |
|---------|--------|
| **Production readiness** | **Not yet** — P0/P1 blockers remediated in code; run migration + full test/build locally before deploy |
| **Booking / concurrency core** | Solid — transactional confirms, night-level uniqueness, expiry sweeps |
| **Primary risk area** | Access control, production fail-closed gates, money precision |

---

## Remediation checklist

### Phase 0 — Build unblock ✅

| # | Finding | Severity | Status | Notes |
|---|---------|----------|--------|-------|
| 1 | Typecheck error in `admin-financial-content.tsx` (~461) | P0 | ✅ Fixed | Type predicate + removed unused variable |

### Phase 1 — P0 security ✅

| # | Finding | Severity | Status | Notes |
|---|---------|----------|--------|-------|
| 2 | Listing mass assignment (`hostId`, `featured`, etc.) | P0 | ✅ Fixed | `pick-host-listing-update.ts` allowlist; repo preserves protected fields |
| 3 | 24h unpaid holds blocking calendar | P0 | ✅ Fixed | `UNPAID_PAYMENT_HOLD_MINUTES = 30`; availability route expires stale holds on read |
| 4 | Booking message `senderRole` spoofing | P0-adjacent | ✅ Fixed | `resolveBookingMessageSender()` derives role server-side in production |

### Phase 2 — Production hardening ✅

| # | Finding | Severity | Status | Notes |
|---|---------|----------|--------|-------|
| 5 | Demo auth when Supabase missing in production | P1 | ✅ Fixed | Blocking error screen in `auth-provider`; healthz fails `auth` check |
| 6 | Demo pay in production | P1 | ✅ Fixed | `isDemoPayAllowed()` gated to demo API mode only |
| 7 | Seeded admin null-password bypass | P1 | ✅ Fixed | Limited to `NODE_ENV === "development"` |
| 8 | Stripe webhook unsigned JSON | P1 | ✅ Fixed | Signature required; unsigned only with `ALLOW_UNSIGNED_STRIPE_WEBHOOK=1` and not in prod |
| 9 | Missing security headers | P1 | ✅ Fixed | CSP, HSTS (prod), X-Frame-Options, etc. in `next.config.mjs` |

### Phase 3 — Access control ✅

| # | Finding | Severity | Status | Notes |
|---|---------|----------|--------|-------|
| 10 | Host profile leaks billing notes / WhatsApp | P1 | ✅ Fixed | `toGuestVisibleHostProfile()` on public GET |
| 11 | Platform staff permissions not enforced server-side | P1 | ✅ Fixed | `requirePlatformStaff(permission)` on admin routes |
| 12 | Staff role escalation (self-promote to admin) | P1 | ✅ Fixed | `assertStaffRoleAssignment()` |
| 13 | Host staff PATCH can set `role: "owner"` | P1 | ✅ Fixed | `requireHostStaffManager()`; PATCH blocks owner role |

### Phase 4 — Schema & money integrity ✅ (code); ⏳ migrate locally

| # | Finding | Severity | Status | Notes |
|---|---------|----------|--------|-------|
| 14 | `Float` money columns | P2 | ✅ Migration + helpers | `Decimal(12,2)` on Listing/Booking/Promotion; `prisma-decimal.ts` + boundary normalization |
| 15 | `Review.bookingId` without FK | P2 | ✅ Fixed | FK to `Booking` with `onDelete: SetNull` |
| 16 | `Review.listing` CASCADE deletes history | P2 | ✅ Fixed | `onDelete: Restrict` |
| 17 | `EventAvailabilityRequest` CASCADE | P2 | ✅ Fixed | Listing/host/guest FKs → `Restrict` |
| 18 | Listing delete swallows FK errors | P2 | ✅ Fixed | Returns 409 when reviews/enquiries block delete |

**Migration:** `prisma/migrations/20260919120000_money_decimal_review_integrity/`

---

## Findings verified as correct (original audit)

- Listing host updates could overwrite `hostId` / `featured` — **confirmed, fixed**
- Unpaid checkout holds reused 24h host-approval SLA — **confirmed, fixed**
- Public host profile exposed sensitive fields — **confirmed, fixed**
- Admin API routes lacked granular permission checks — **confirmed, fixed**
- Demo payment paths reachable without demo mode — **confirmed, fixed**
- Stripe webhook accepted unsigned payloads — **confirmed, fixed**
- No security headers — **confirmed, fixed** (via Next config, not middleware)
- Build/typecheck failure in admin financial UI — **confirmed, fixed**

## Findings partially accurate or already addressed

| Finding | Assessment |
|---------|------------|
| Client-controlled `hostId` at checkout | Already remediated before audit (server resolves host from listing row) |
| `senderRole` in messages | Valid concern; fixed in Phase 1 (not in original final P0 list) |
| `middleware.ts` absent | Headers added in `next.config.mjs` instead — acceptable alternative |
| `BookingMessage` CASCADE on booking delete | Intentional — messages are booking lifecycle artifacts |

## Deferred / post-launch (P2–P3)

- Rate limiting on auth and booking endpoints
- Full CSP tightening (`unsafe-inline` / `unsafe-eval` still present for Next/Stripe)
- `middleware.ts` for locale + security if desired
- Audit log immutability / append-only storage
- Automated security regression tests for permission matrix
- Existing bookings with 24h `expiresAt` expire naturally; only new checkouts get 30 min hold

---

## Pre-deploy commands (run locally)

```bash
cd stays
npm install
npx prisma migrate deploy   # or: npx prisma migrate dev
npx prisma generate
npm run typecheck
npm run test
npm run build
```

## Environment requirements (production)

| Variable | Required |
|----------|----------|
| `DATABASE_URL` / `DIRECT_URL` | Yes |
| Supabase URL + anon key | Yes (auth fail-closed without them) |
| `STRIPE_SECRET_KEY` | Yes (if payments enabled) |
| `STRIPE_WEBHOOK_SECRET` | Yes |
| `ALLOW_UNSIGNED_STRIPE_WEBHOOK` | Must **not** be set in production |

---

## Key files introduced / changed

- `src/lib/listings/pick-host-listing-update.ts` — host listing allowlist
- `src/lib/auth/platform-staff-guards.ts` — permission enforcement
- `src/lib/server/host-profile-public.ts` — public profile sanitization
- `src/lib/money/prisma-decimal.ts` — Decimal ↔ number boundaries
- `src/lib/booking/normalize-booking-money.ts` — booking money normalization
- `prisma/migrations/20260919120000_money_decimal_review_integrity/` — schema migration
