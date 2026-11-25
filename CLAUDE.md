@AGENTS.md

# NomadTrip — project rules for every agent

Yurt-trip booking site for Kyrgyzstan. Trips last 2–30 days; every night is in a yurt camp.

## Stack (do not swap or add frameworks without being asked)
Next.js 16 App Router (Cache Components ON, Partial Prefetching ON) · React 19 · TypeScript strict · Tailwind 4 ·
Drizzle ORM + SQLite (better-sqlite3, synchronous) · Zod 4 · Vitest. No new runtime dependency unless the brief allows it.

## Commands
- `npm ci && npm run db:setup` — first run in a fresh checkout/worktree (creates `data/nomadtrip.db`, migrates, seeds; idempotent)
- `npm test` · `npm run typecheck` (run `npx next typegen` first if route types are missing) · `npx eslint src scripts`
- `npm run build` — full gate; route list must show no errors
- Schema change: edit `src/db/schema.ts`, then `npx drizzle-kit generate --name <what>`; commit the SQL in `drizzle/`.
  Dev data is disposable: `rm -rf data && npm run db:setup` to rebuild.

## Next.js 16 rules that bite
- This Next.js differs from training data. Check `node_modules/next/dist/docs/` before using an API you are unsure of.
- Middleware is `src/proxy.ts` (Node runtime). There is only one proxy file — extend it, never add another.
- With Cache Components, any DB read or `params`/`searchParams`/`headers()` access must sit in a component wrapped in
  `<Suspense>`; call `await connection()` (from `next/server`) before synchronous DB reads so they run per request.
- Server Actions are public endpoints: validate input with Zod, check `formData instanceof FormData`, and re-check
  admin auth (`isAdminAuthorization` in `src/lib/admin-auth.ts`) inside every admin action and admin page.

## Invariants (never break)
- A departure is never oversold: seat checks + inserts happen in one `IMMEDIATE` transaction (`createBooking`).
- Prices are computed on the server (`src/lib/pricing.ts`), never trusted from the client.
- Public pages never show a booking's contact, health or emergency details — only `/…/admin` does.
- Cancelled bookings are terminal and free their seats.

## i18n (en default, ru, ky) — every user-facing string goes through this
- Routes live under `src/app/[lang]/`; every internal link is `/${lang}/…`. `src/proxy.ts` redirects locale-less paths.
- Strings: `src/i18n/dictionaries/<en|ru|ky>/<namespace>.json`; namespaces listed in `src/i18n/config.ts` (`namespaces`).
  A new namespace = 3 JSON files + add it to `namespaces` + `src/i18n/dictionaries.ts` loader map.
- Every key must exist in all 3 locales with the same placeholders — `src/i18n/dictionaries.test.ts` enforces it.
  Write real Russian and Kyrgyz (Cyrillic, correct place names: Соң-Көл, Ысык-Көл, Нарын, Ош…), never English placeholders.
- Server: `getDictionary(ns)` and `getLang()` from `src/i18n/dictionaries.ts` (server-only, read `next/root-params`).
  Client components receive strings as props. Server Actions can't read root params: post a hidden `lang` field and
  validate it with `isLocale`.
- Plurals: entries `{one, few, many, other}` in every locale; `plural(forms, n, lang)` / `interpolate(tpl, vars)` in
  `src/i18n/format.ts`. Dates: `formatDate(iso, lang)`.
- Trip text in DB is `Localized<T> = Record<Locale, T>`; read with `localize(value, lang)` (`src/i18n/localize.ts`).
  Regions are keys (`tripRegions` in `src/db/schema.ts`), labels at `common.regions.<key>`.
- Validation errors are codes (`errorCodes` in `src/lib/booking-input.ts`), translated in the UI.

## Layout
- `src/db/` schema + client · `src/lib/` domain logic (pure, tested) · `src/app/` routes · `src/components/` shared UI
- `scripts/seed.ts` sample catalog · `drizzle/` migrations

## Working rules
- Stay inside the files your brief assigns. If you must touch a file outside it, keep the change minimal and say so.
- Put domain logic in `src/lib/` with Vitest tests; keep pages thin.
- Commit your work on your branch with a clear message when done (end with
  `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`). Never push.
- Done = `npm test`, `npm run typecheck`, `npx eslint src scripts` and `npm run build` all pass, plus the brief's
  acceptance checks. Report: what changed (files), how you verified (commands + results), open risks — ≤15 lines.
