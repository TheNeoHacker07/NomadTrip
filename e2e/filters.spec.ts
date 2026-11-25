import { expect, test, type Page } from "@playwright/test";
import { addDays, formatDate } from "../src/lib/pricing";
import { allTrips, dict, futureDate, insertBooking, withDb, addDeparture, todayIso, type TripRow } from "./helpers";

const lang = "en";
const f = dict(lang, "filters");

type Row = TripRow & { nextOpen: string | null; inRange?: boolean };

/** Independent oracle: earliest future departure with a free seat inside the optional range, straight from SQL. */
function load(range?: { from?: string; to?: string }): Row[] {
  const today = todayIso();
  return allTrips().map((t) => {
    const deps = withDb(
      (db) =>
        db
          .prepare(
            `select d.start_date as s from departures d where d.trip_id = ? and d.start_date > ?
             and d.capacity > coalesce((select sum(traveler_count) from bookings b where b.departure_id = d.id and b.status != 'cancelled'), 0)
             order by d.start_date`,
          )
          .all(t.id, today) as { s: string }[],
    );
    const inRange = deps.filter((d) => (!range?.from || d.s >= range.from) && (!range?.to || d.s <= range.to));
    return { ...t, nextOpen: (range?.from || range?.to ? inRange : deps)[0]?.s ?? null };
  });
}

type Sort = "soonest" | "price_asc" | "price_desc" | "duration";
function order(rows: Row[], sort: Sort) {
  const cmp: Record<Sort, (a: Row, b: Row) => number> = {
    soonest: (a, b) =>
      Number(a.nextOpen === null) - Number(b.nextOpen === null) ||
      (a.nextOpen ?? "").localeCompare(b.nextOpen ?? "") ||
      a.duration_days - b.duration_days,
    price_asc: (a, b) => a.price_per_person_usd - b.price_per_person_usd || a.duration_days - b.duration_days,
    price_desc: (a, b) => b.price_per_person_usd - a.price_per_person_usd || a.duration_days - b.duration_days,
    duration: (a, b) => a.duration_days - b.duration_days || a.price_per_person_usd - b.price_per_person_usd,
  };
  return [...rows].sort((a, b) => cmp[sort](a, b) || a.id - b.id);
}

const shownSlugs = (page: Page) =>
  page.locator("main a[href^='/en/trips/']").evaluateAll((as) => as.map((a) => (a.getAttribute("href") ?? "").split("/").pop()!));

async function apply(page: Page) {
  await page.getByRole("button", { name: f.apply }).click();
}

async function expectList(page: Page, expected: Row[]) {
  await expect(page.locator("main a[href^='/en/trips/']")).toHaveCount(expected.length);
  expect(await shownSlugs(page)).toEqual(expected.map((t) => t.slug));
}

const bucket: Record<string, [number, number]> = { "2-3": [2, 3], "4-7": [4, 7], "8-14": [8, 14], "15-30": [15, 30] };

test.describe("home filters (en)", () => {
  test("no filters: every trip, soonest first", async ({ page }) => {
    await page.goto(`/${lang}`);
    await expectList(page, order(load(), "soonest"));
  });

  test("region narrows the list, for every region that has trips", async ({ page }) => {
    const regions = [...new Set(allTrips().map((t) => t.region))];
    expect(regions.length).toBeGreaterThan(3);
    for (const region of regions) {
      await page.goto(`/${lang}`);
      await page.locator("#f-region").selectOption(region);
      await apply(page);
      await expect(page).toHaveURL(new RegExp(`region=${region}`));
      await expectList(page, order(load().filter((t) => t.region === region), "soonest"));
    }
  });

  test("duration buckets", async ({ page }) => {
    for (const [value, [lo, hi]] of Object.entries(bucket)) {
      await page.goto(`/${lang}`);
      await page.locator("#f-duration").selectOption(value);
      await apply(page);
      await expectList(page, order(load().filter((t) => t.duration_days >= lo && t.duration_days <= hi), "soonest"));
    }
  });

  test("price min / max (inclusive)", async ({ page }) => {
    const rows = load();
    const prices = rows.map((t) => t.price_per_person_usd).sort((a, b) => a - b);
    const max = prices[Math.floor(prices.length / 2)];
    await page.goto(`/${lang}`);
    await page.locator("#f-priceMax").fill(String(max));
    await apply(page);
    await expectList(page, order(rows.filter((t) => t.price_per_person_usd <= max), "soonest"));

    await page.locator("#f-priceMin").fill(String(prices[1]));
    await apply(page);
    await expectList(page, order(rows.filter((t) => t.price_per_person_usd <= max && t.price_per_person_usd >= prices[1]), "soonest"));
  });

  test("applying filters updates the list in place: no full page reload, scroll position kept", async ({ page }) => {
    await page.goto(`/${lang}`);
    await page.locator("#f-region").scrollIntoViewIfNeeded();
    // A marker on window survives client-side navigation but not a full document reload.
    await page.evaluate(() => ((window as unknown as { __noReload?: boolean }).__noReload = true));
    const scrollBefore = await page.evaluate(() => window.scrollY);
    expect(scrollBefore).toBeGreaterThan(0);

    const region = allTrips()[0].region;
    await page.locator("#f-region").selectOption(region);
    await apply(page);
    await expect(page).toHaveURL(new RegExp(`[?&]region=${region}`));
    await expect(page.locator("#f-region")).toHaveValue(region);

    expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true);
    expect(Math.abs((await page.evaluate(() => window.scrollY)) - scrollBefore)).toBeLessThan(200);

    // Back returns to the unfiltered list (filters push history entries).
    await page.goBack();
    await expect(page).not.toHaveURL(/region=/);
  });

  test("date range uses open departures only (a sold-out departure drops the trip from that window)", async ({ page }) => {
    // Window around the victim's second departure (read from the DB, so it follows the seeded season);
    // fill that departure so only it is affected.
    const victim = allTrips().find((t) => t.slug === "batken-ak-suu")!;
    const dep = withDb((db) =>
      db.prepare("select id, capacity, start_date from departures where trip_id = ? order by start_date limit 1 offset 1").get(victim.id) as
        | { id: number; capacity: number; start_date: string }
        | undefined,
    );
    expect(dep).toBeDefined();
    insertBooking({ departureId: dep!.id, travelers: dep!.capacity, status: "confirmed" });
    // Another trip gets a departure inside the window that no seeded departure shares.
    const loner = allTrips().find((t) => t.slug === "song-kul-weekend")!;
    const lonerDate = addDays(dep!.start_date, -7);
    addDeparture(loner.id, lonerDate, 4);

    const from = addDays(dep!.start_date, -8);
    const to = addDays(dep!.start_date, 2);
    await page.goto(`/${lang}`);
    await page.locator("#f-from").fill(from);
    await page.locator("#f-to").fill(to);
    await apply(page);
    const expected = order(load({ from, to }).filter((t) => t.nextOpen !== null), "soonest");
    expect(expected.map((t) => t.slug)).not.toContain(victim.slug);
    expect(expected.length).toBeGreaterThan(0);
    await expectList(page, expected);
    // The date shown on the card is the first open date inside the window.
    const loneCard = page.locator(`main a[href="/${lang}/trips/${loner.slug}"]`);
    await expect(loneCard).toContainText(`${f.nextDeparture}: ${formatDate(lonerDate, lang)}`);

    // A window with no open dates at all: empty state.
    const emptyFrom = futureDate(1000);
    await page.goto(`/${lang}?from=${emptyFrom}&to=${emptyFrom}`);
    await expect(page.getByText(f.emptyTitle)).toBeVisible();
  });

  test("sort orders", async ({ page }) => {
    for (const sort of ["price_asc", "price_desc", "duration", "soonest"] as Sort[]) {
      await page.goto(`/${lang}`);
      await page.locator("#f-sort").selectOption(sort);
      await apply(page);
      await expect(page).toHaveURL(new RegExp(`sort=${sort}`));
      await expectList(page, order(load(), sort));
    }
  });

  test("invalid params are ignored and every trip shows", async ({ page }) => {
    await page.goto(`/${lang}?region=atlantis&duration=99&priceMin=abc&priceMax=-5&from=2026-13-45&to=nope&sort=cheapest`);
    await expectList(page, order(load(), "soonest"));
    await expect(page.locator("#f-region")).toHaveValue("");
    await expect(page.locator("#f-priceMax")).toHaveValue("");
    await expect(page.locator("#f-sort")).toHaveValue("soonest");
  });

  test("filter values round-trip into the form; Clear resets", async ({ page }) => {
    const from = futureDate(10);
    const to = futureDate(200);
    await page.goto(`/${lang}?region=naryn&duration=4-7&priceMin=100&priceMax=2500&from=${from}&to=${to}&sort=price_desc`);
    await expect(page.locator("#f-region")).toHaveValue("naryn");
    await expect(page.locator("#f-duration")).toHaveValue("4-7");
    await expect(page.locator("#f-priceMin")).toHaveValue("100");
    await expect(page.locator("#f-priceMax")).toHaveValue("2500");
    await expect(page.locator("#f-from")).toHaveValue(from);
    await expect(page.locator("#f-to")).toHaveValue(to);
    await expect(page.locator("#f-sort")).toHaveValue("price_desc");

    // Clear is a client-side navigation to `/en#trips`; the list must show every trip again.
    await page.getByRole("link", { name: f.clear }).first().click();
    await expectList(page, order(load(), "soonest"));
    await expect(page.getByRole("link", { name: f.clear })).toHaveCount(0);
  });

  // Regression: uncontrolled filter inputs kept stale values after a client-side "Clear filters".
  test("Clear also resets the form controls", async ({ page }) => {
    await page.goto(`/${lang}?region=naryn&duration=4-7&priceMin=100&priceMax=2500&sort=price_desc`);
    await page.getByRole("link", { name: f.clear }).first().click();
    await expect(page.getByRole("link", { name: f.clear })).toHaveCount(0);
    await expect(page.locator("#f-region")).toHaveValue("", { timeout: 3000 });
    await expect(page.locator("#f-duration")).toHaveValue("");
    await expect(page.locator("#f-priceMin")).toHaveValue("");
    await expect(page.locator("#f-priceMax")).toHaveValue("");
    await expect(page.locator("#f-sort")).toHaveValue("soonest");
  });
});
