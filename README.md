# NomadTrip — yurt journeys across Kyrgyzstan

Trip booking site for 2-day to 30-day journeys with every night in a yurt camp. English, Russian and Kyrgyz.

**Stack:** Next.js 16 (App Router, Cache Components, Server Actions) · React 19 · TypeScript · Tailwind CSS 4 ·
Drizzle ORM + SQLite (better-sqlite3) · Zod 4 · Vitest · Playwright.

## Run

```bash
npm install
cp .env.example .env.local      # set ADMIN_PASSWORD (and SITE_URL / TRUST_PROXY_HOPS in production)
npm run db:setup                # create data/nomadtrip.db, apply migrations, seed 18 trips (idempotent; re-run to add new catalog trips)
npm run build && npm start      # http://localhost:3000  (or `npm run dev` while developing)
```

| Script | |
| --- | --- |
| `npm test` | unit + integration tests (Vitest) |
| `npm run test:e2e` | browser tests (Playwright, Chromium; builds the app; port `E2E_PORT`, default 3480) |
| `npm run typecheck` / `npm run lint` | |
| `npm run db:generate` | new migration after editing `src/db/schema.ts` |

## Settings (`.env.local`)

| Variable | Purpose |
| --- | --- |
| `ADMIN_USER`, `ADMIN_PASSWORD` | HTTP Basic login for `/<lang>/admin`. Admin is disabled when the password is empty. |
| `DATABASE_PATH` | SQLite file (default `data/nomadtrip.db`). |
| `SITE_URL` | Public origin, e.g. `https://nomadtrip.kg` — used by the sitemap, social previews and calendar links. |
| `TRUST_PROXY_HOPS` | Set to `1` (or the number of proxies) only when the app runs behind a reverse proxy you control (Nginx, Cloudflare…); enables per-IP rate limits. Leave empty otherwise. |

## What's in it

**Visitors** — trip catalog with filters (region, length, price, dates, sort) · trip pages with day-by-day plans,
live seats and similar trips · all-departures calendar · 3-step booking wizard (who's coming → experience → confirm)
· confirmation page + add-to-calendar (.ics) · "My booking" lookup (reference + email) · custom trip request form ·
info pages: What's included, Experiences, About, Yurt life, FAQ, Photo credits · language switcher (en/ru/ky).

**Staff** (`/<lang>/admin`) — bookings with filters/search (Cyrillic-aware), confirm/cancel, CSV export · trips
(create/edit in 3 languages, itinerary editor) · departures (add, capacity, delete) · custom trip inquiries.

**Rules the code guarantees** (see `CLAUDE.md`)
- A departure is never oversold (seat check + insert in one `IMMEDIATE` transaction; race-tested).
- Prices are computed on the server. Public pages never show contact, health or emergency details.
- A booked trip's length can't change; capacity can't drop below seats taken.
- Personal data never goes into URLs; booking lookup doesn't reveal whether a reference exists.
- Unknown pages return a real 404. Search engines get a sitemap, hreflang and structured trip data.

## Content notes
- Photos are freely licensed from Wikimedia Commons (`src/lib/images.ts`, credited on every page and at
  `/photo-credits`). Replace a file in `public/images/` with your own photo under the same name to swap it.
- Sample departures are generated for the next summer season (June–September), when yurt camps operate.
- Translation glossary for en/ru/ky: `docs/glossary.md`.

## Not included yet
Online payment, email/Telegram notifications, customer reviews. SQLite suits a single server; switch Drizzle to
Postgres for multi-instance hosting (the in-memory rate limiter would then need a shared store too).
