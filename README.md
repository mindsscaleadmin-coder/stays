# Greenfield Farm Stays

Farmstay & homestay marketplace for the GCC/Middle East market. Built with Next.js 14, PostgreSQL (Prisma), Supabase Auth, Stripe, and English i18n support.

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS |
| i18n | next-intl (English locale) |
| Database | PostgreSQL via Prisma |
| Auth | Supabase Auth (email, phone/OTP, Google) |
| Storage | Supabase Storage |
| Payments | Stripe (test mode) |
| Caching / rate limits | Upstash Redis |
| Hosting | Vercel + Supabase (recommended) |

## Getting Started

```bash
# Install dependencies
npm install

# Copy environment template and fill in Supabase/Stripe/Upstash keys
cp .env.example .env.local

# Generate Prisma client and run migrations
npm run db:generate
npm run db:migrate

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the homepage and [http://localhost:3000/listing/1](http://localhost:3000/listing/1) for the listing detail page.


## Phase 1 Pages

| Route | Status |
|---|---|
| `/` Homepage | ✅ Figma design implemented |
| `/listing/[id]` Listing detail | ✅ From uploaded design + Figma Make source |
| `/search` Search results | 🔲 Scaffold |
| `/login`, `/signup` Auth | 🔲 Scaffold (Supabase wired, UI pending) |
| `/account` Guest dashboard | 🔲 Scaffold |
| `/host/*` Host dashboard + CRUD | 🔲 Scaffold |
| `/admin/*` Admin dashboard | 🔲 Scaffold |
| `/booking/[id]/checkout` | 🔲 Scaffold + API with DB transaction locking |

## Design Reference

- Figma Make: [Website Home Page Design](https://www.figma.com/make/Kkee4a6VxYPLUoocLk5s8V/Website-Home-Page-Design)
- Listing detail: high-fidelity design provided in spec (Green Valley Farmhouse, Al Ain)

## Key Architecture Decisions

- **Double-booking prevention**: `confirmBooking()` wraps availability check + insert in a Prisma transaction with row locking via unique `(listingId, date)` constraint.
- **Connection pooling**: Use Supabase pooler URL (`DATABASE_URL`) for serverless; direct URL (`DIRECT_URL`) for migrations only.
- **ISR**: Homepage and listing pages use `revalidate = 60`.
- **Rate limiting**: Auth endpoints use Upstash Redis sliding window (10 req/min per IP).
- **Roles**: Users hold a `roles[]` array — one account can be both guest and host.

## Load Testing

```bash
# Public pages
k6 run scripts/load-test.js

# Concurrent multi-IP login rate-limit simulation
k6 run scripts/load-test-auth.js

# Through Docker Nginx (after docker compose up --scale app=3)
BASE_URL=http://localhost:8080 k6 run scripts/load-test-auth.js
```

## Architecture & scaling

See [ARCHITECTURE.md](./ARCHITECTURE.md) for stateless design, Docker Compose horizontal scaling, Redis caching, and the incremental roadmap.

**Database:** Prisma is configured for **PostgreSQL**. Update `DATABASE_URL` / `DIRECT_URL` in `.env.local` (SQLite is no longer supported by the schema).

## Open Questions (need your input before implementing)

1. **Commission model** — flat %, tiered, or subscription?
2. **Booking approval window** — how long before pending requests auto-expire?
3. **Cancellation policy** — flexible/moderate/strict tiers, or one platform-wide policy?
4. **Admin-created listings** — can admins create listings on behalf of hosts during cold-start?
5. **Multi-country launch** — UAE only at launch, or UAE + KSA + others?

## Project Structure

```
src/
├── app/[locale]/          # Localized routes (en)
├── components/
│   ├── home/              # Homepage sections
│   ├── listing/           # Listing detail
│   └── layout/            # Header, footer, mega menu
├── lib/
│   ├── booking/           # Transaction-safe booking logic
│   ├── mock/              # Seed data (until DB populated)
│   └── supabase/          # Auth clients
├── i18n/                  # next-intl routing config
messages/                  # en.json UI strings
prisma/schema.prisma       # Database models
scripts/load-test.js       # k6 concurrent load test
```
