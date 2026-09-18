# Farm Stays — Architecture

Stateless, horizontally scalable marketplace built on **Next.js 14** (monolith), **PostgreSQL + Prisma**, **Supabase Auth (JWT)**, **Upstash Redis**, and **Stripe**.

## Design principles

1. **No sticky sessions** — any app instance handles any request.
2. **Server-owned money & bookings** — Prisma/Postgres is source of truth for bookings, availability, promotions.
3. **Spine first** — checkout → pay → confirm → host calendar before growth features.
4. **Degrade gracefully** — slow Redis/Stripe must not freeze the whole app.

## Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend + API | Next.js 14 App Router | Single codebase, SSR/i18n already built |
| Database | PostgreSQL via Prisma | Concurrent writes, transactions, read replicas later |
| Pooling | Supabase pooler URL (`?pgbouncer=true`) in prod; direct URL for migrations | Avoid per-request connections on serverless/scaled containers |
| Auth | **Supabase JWT** (access + refresh in httpOnly cookies) | Stateless across N hosts; OAuth/OTP already integrated |
| Cache / rate limits | Upstash Redis (REST) | Shared counters across all app instances |
| Payments | Stripe webhooks | Async confirmation path |
| Local scale test | Docker Compose + Nginx | `docker compose up --scale app=3` |

### Why JWT (Supabase) instead of Redis sessions?

- Access tokens validate without a DB hit on every request.
- Refresh rotation is handled by Supabase.
- Works identically on Vercel serverless and long-running Docker containers.
- Redis is reserved for **rate limits, profile cache, and job queues** — not session storage.

## Stateless app servers

- No in-memory session store on the Node process.
- No sticky-session requirement at the load balancer.
- `AuthProvider` reads Supabase session client-side; API routes use `getSessionUser()` / `requireSessionUser()` (`src/lib/auth/session.ts`).

## Request flow (login)

```mermaid
sequenceDiagram
  participant Client
  participant Nginx
  participant App
  participant Redis
  participant Supabase

  Client->>Nginx: POST /api/auth/rate-limit
  Nginx->>App: forward + X-Forwarded-For
  App->>Redis: sliding window (IP + email)
  App-->>Client: 200 or 429
  Client->>Supabase: signInWithPassword (client SDK)
  Supabase-->>Client: JWT in httpOnly cookies
  Client->>App: API calls with cookies
  App->>Supabase: getUser() validates JWT
```

## Database

- **Schema:** `prisma/schema.prisma` — PostgreSQL provider with indexes on `User.email`, `Booking.guestId`, listing/status fields.
- **Pooling:** set `DATABASE_URL` to pooler; `DIRECT_URL` for `prisma migrate`.
- **Slow queries:** Prisma extension logs operations >200ms (`src/lib/prisma.ts`).
- **Read replicas (future):** route read-only profile/dashboard queries via a read URL — structure repos in `src/lib/server/` to accept an optional read client.

## Database Portability Rules

These rules keep us free to migrate off Supabase to another Postgres host later without a rewrite.

1. **Keep all queries through Prisma** — never write raw SQL using Supabase-only functions (`auth.uid()`, RPC calls) directly in business logic; ties queries to Supabase's auth layer and won't run on plain Postgres.
2. **Isolate Supabase-specific code** — keep using the `isSupabaseConfigured()` pattern for any Supabase feature (Storage, Realtime) so it can be swapped without touching unrelated code.
3. **Abstract file storage calls** — wrap all file upload/download logic in one module (`src/lib/storage/`) instead of calling the Supabase Storage SDK directly from components or pages; a single adapter is all that changes when we move to S3, R2, or local disk.
4. **Keep schema changes in Prisma migrations only** — never add custom functions, triggers, or RLS policies through the Supabase dashboard SQL editor; dashboard-only DDL is invisible to the repo and breaks restores on any non-Supabase host.
5. **Test a backup/restore dry run periodically** — run `pg_dump` against the Supabase database and confirm it restores cleanly; proves the exit path works before a migration is urgent.

## Caching (cache-aside)

| Key | TTL | Invalidation |
|---|---|---|
| `farm-stays:profile:{userId}` | 5 min | `invalidateCachedProfile()` on profile/role update |

Implementation: `src/lib/cache/redis.ts`. Cache is optional when Upstash env vars are unset (dev/demo).

## Rate limiting

- **Per IP:** 10 req/min (`farm-stays:auth:ip`)
- **Per email:** 5 req/min (`farm-stays:auth:user`)
- Endpoint: `POST /api/auth/rate-limit` — call before client-side Supabase sign-in.

## Health & observability

| Endpoint | Purpose |
|---|---|
| `GET /api/healthz` | Load balancer probe (DB check; Redis reported but non-fatal) |
| `GET /api/metrics` | Prometheus text exposition (per-instance counters) |

Structured JSON logs include `requestId`, `userId` (when available), and `durationMs`.

## Horizontal scaling (local)

```bash
# 1. Start Postgres + Redis + app + Nginx
docker compose up --build -d

# 2. Run migrations against compose Postgres
DATABASE_URL="postgresql://farmstays:farmstays@localhost:5432/farmstays" \
DIRECT_URL="postgresql://farmstays:farmstays@localhost:5432/farmstays" \
  npx prisma db push

# 3. Scale app replicas (Nginx round-robins via Docker DNS)
docker compose up --scale app=3 -d

# 4. Load test through Nginx
BASE_URL=http://localhost:8080 k6 run scripts/load-test-auth.js
```

Production on **Vercel**: deploy as today; scale is automatic. Use Docker Compose only to validate stateless behavior before self-hosting.

## Async work (next increment)

Post-login side effects (welcome email, audit log) go through **BullMQ + Redis** — never synchronously in the request path.

| Job | Trigger | Handler |
|---|---|---|
| `welcome-email` | `POST /api/auth/welcome` after sign-up | Worker logs / sends email |
| `booking-confirmed` | Host accept, demo-pay, Stripe webhook | Worker notifies guest |
| `audit-log` | Reserved for admin actions | Worker writes structured log |
| `expire-pending` | Vercel Cron every 15m (`vercel.json`) + Compose `expire-cron` + on booking list/detail GET | Expires stale pending requests, auto-completes due stays, and runs timed check-in / check-out sync |

```bash
# Local worker (requires REDIS_URL)
npm run worker
```

Docker Compose includes a `worker` service alongside `redis`.

## Known gaps (incremental roadmap)

| Priority | Item |
|---|---|
| P0 | Migrate host **pricing + calendar/availability** to DB/API | Done |
| P0 | Migrate **platform config + host profile** to DB/API | Done |
| P0 | Migrate **host promotions + admin promote catalog** to DB/API | Done |
| P0 | Migrate **trust badges + host certifications** to DB/API | Done |
| P0 | Migrate **host/guest reviews + admin moderation** to DB/API | Done |
| P0 | Migrate **host staff team** to DB/API | Done |
| P0 | Migrate **host notifications + admin policy broadcast** to DB/API | Done |
| P0 | Migrate **host add-ons** (activities, products, weather) to DB/API | Done |
| P0 | Migrate **host analytics** to DB/API | Done |
| P0 | **Paid booking spine** — catalog hostId, server quote, Prisma calendar, occupancy in availability | Done |
| P0 | Migrate **platform admin staff** to DB/API | Done |
| P0 | Migrate **admin catalogs** (taxonomy, photo tags, extra charges) to DB/API | Done |
| P0 | Migrate **admin ops** (support tickets, financial settings, admin alerts state) to DB/API | Done |
| P0 | **Pending expiry + guest cancel** — cron, expire-on-read, guest trips cancel with policy refund | Done |
| P0 | **Guest support tickets** — shared ticket store API + account Support page | Done |
| P0 | Enforce `requireSessionUser()` on booking/payment API mutations | Done when Supabase configured |
| P1 | BullMQ worker container in Compose | Done |
| P1 | Circuit breakers/timeouts on Stripe + Supabase calls |
| P2 | Read replica routing for dashboard reads |
| P2 | Multi-region Redis / Postgres |

## Environment variables

See `.env.example`. No hostnames are hardcoded — all services are configured via env.

## Scaling further

- **Read replicas:** add `DATABASE_READ_URL`, use in list/dashboard queries only.
- **Multi-region:** Postgres read replicas per region; Upstash Global Redis; CDN for static assets.
- **Autoscaling:** K8s HPA on CPU + p95 latency from `/api/metrics`; Vercel scales automatically on serverless.
