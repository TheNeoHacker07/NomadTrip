# NomadTrip — yurt journeys across Kyrgyzstan

Book 2-day to 30-day trips with nights in yurt camps. The booking form captures what the team needs to tailor
each trip: every traveler's age, nationality, diet, allergies and riding level, plus yurt arrangement, fitness,
interests, health notes, celebrations, arrival/airport pickup and an emergency contact.

**Stack:** Next.js 16 (App Router, Cache Components, Server Actions) · React 19 · TypeScript · Tailwind CSS 4 ·
Drizzle ORM + SQLite (better-sqlite3) · Zod 4 · Vitest.

## Run

```bash
npm install
cp .env.example .env.local      # set ADMIN_PASSWORD to enable /admin
npm run db:setup                # create data/nomadtrip.db, apply migrations, seed 4 trips (idempotent)
npm run dev                     # http://localhost:3000
```

| Script | |
| --- | --- |
| `npm test` | booking rules, form parsing, pricing |
| `npm run typecheck` / `npm run lint` | |
| `npm run db:generate` | new migration after editing `src/db/schema.ts` |

## How it works

- `/` trips → `/trips/[slug]` itinerary + departures with live seats → `/trips/[slug]/book?departure=…` form →
  `/bookings/[reference]` confirmation (shows no contact or health data).
- `/admin` (HTTP Basic, `ADMIN_USER`/`ADMIN_PASSWORD`; disabled if no password) lists every booking with all
  collected details and lets staff **confirm** or **cancel** (cancelling frees the seats).
- **No overselling:** `createBooking` (`src/lib/bookings.ts`) counts seats and inserts inside one SQLite
  `IMMEDIATE` transaction. Price is always computed on the server (`src/lib/pricing.ts`).
- Bookings start as `pending`; nothing is charged — staff confirm and send payment details.

## Not included yet

Online payment, email/Telegram notifications, staff UI for editing trips/departures (edit `scripts/seed.ts` or
the DB), multi-language content. SQLite suits one server; switch Drizzle to Postgres for multi-instance hosting.
