import { expect, request, test, type Page } from "@playwright/test";
import { addDeparture, allTrips, dict, futureDate, insertBooking, plural, seatsLeft, withDb } from "./helpers";

const lang = "en";
const a = dict(lang, "admin");
const common = dict(lang, "common");

test.describe("admin", () => {
  test("requires HTTP basic auth", async ({ baseURL }) => {
    const anon = await request.newContext({ baseURL });
    for (const path of ["/en/admin", "/ru/admin/trips", "/ky/admin/trips/new", "/en/admin/trips/1"]) {
      const res = await anon.get(path);
      expect(res.status(), path).toBe(401);
      expect(res.headers()["www-authenticate"]).toMatch(/^Basic/i);
    }
    const wrong = await request.newContext({ baseURL, httpCredentials: { username: "admin", password: "nope", send: "always" } });
    expect((await wrong.get("/en/admin")).status()).toBe(401);
    const ok = await request.newContext({ baseURL, httpCredentials: { username: "admin", password: "e2e", send: "always" } });
    expect((await ok.get("/en/admin")).status()).toBe(200);
    await Promise.all([anon.dispose(), wrong.dispose(), ok.dispose()]);
  });

  test.describe("signed in", () => {
    test.use({ httpCredentials: { username: "admin", password: "e2e", send: "always" } });

    const SLUG = "e2e-created-trip";
    const values = {
      "title.en": "E2E Created Trip",
      "title.ru": "E2E Созданная поездка",
      "title.ky": "E2E Түзүлгөн сапар",
      "summary.en": "Summary EN",
      "summary.ru": "Описание РУ кратко",
      "summary.ky": "Кыскача КЫ",
      "description.en": "Long description EN",
      "description.ru": "Длинное описание РУ",
      "description.ky": "Узун сүрөттөмө КЫ",
      "highlights.en": "One\nTwo",
      "highlights.ru": "Раз\nДва",
      "highlights.ky": "Бир\nЭки",
    } as Record<string, string>;
    const days = [0, 1].flatMap((i) =>
      (["en", "ru", "ky"] as const).flatMap((l) => [
        [`day.${i}.title.${l}`, `Day ${i + 1} title ${l}`],
        [`day.${i}.description.${l}`, `Day ${i + 1} description ${l}`],
        [`day.${i}.overnight.${l}`, `Camp ${i + 1} ${l}`],
      ]),
    );

    async function fillTrip(page: Page, slug: string, price: string) {
      await page.locator("#slug").fill(slug);
      await page.locator("#price").fill(price);
      await page.locator("#region").selectOption("chui");
      await page.locator("#difficulty").selectOption("moderate");
      for (const [name, value] of [...Object.entries(values), ...days]) await page.locator(`[name="${name}"]`).fill(value);
    }

    test("create a 2-day trip in all 3 languages; duplicate slug keeps every typed value", async ({ page }) => {
      await page.goto(`/${lang}/admin/trips/new`);
      await fillTrip(page, SLUG, "321");
      await page.getByRole("button", { name: a.form.create }).click();
      await expect(page).toHaveURL(/\/en\/admin\/trips\/\d+$/);
      const tripId = Number(page.url().split("/").pop());
      const row = withDb((db) => db.prepare("select slug, duration_days as d, price_per_person_usd as p, title, itinerary from trips where id = ?").get(tripId) as { slug: string; d: number; p: number; title: string; itinerary: string });
      expect(row).toMatchObject({ slug: SLUG, d: 2, p: 321 });
      expect(JSON.parse(row.title)).toEqual({ en: values["title.en"], ru: values["title.ru"], ky: values["title.ky"] });
      expect(JSON.parse(row.itinerary).ky).toHaveLength(2);

      // Public home in Kyrgyz lists the new trip with its Kyrgyz title.
      await page.context().clearCookies();
      const pub = await page.context().browser()!.newContext(); // no credentials: public view
      const pubPage = await pub.newPage();
      await pubPage.goto(`/ky`);
      await expect(pubPage.locator(`main a[href="/ky/trips/${SLUG}"]`)).toContainText(values["title.ky"]);
      await pubPage.goto(`/ky/trips/${SLUG}`);
      await expect(pubPage.getByRole("heading", { level: 1 })).toHaveText(values["title.ky"]);
      await pub.close();

      // Second attempt with the same slug: error shown and ALL typed input survives.
      await page.goto(`/${lang}/admin/trips/new`);
      await fillTrip(page, SLUG, "654");
      await page.getByRole("button", { name: a.form.create }).click();
      await expect(page.locator("p[role=alert]")).toContainText(a.errors.slug_taken);
      await expect(page).toHaveURL(/\/admin\/trips\/new$/);
      await expect(page.locator("#slug")).toHaveValue(SLUG);
      await expect(page.locator("#price")).toHaveValue("654");
      await expect(page.locator("#region")).toHaveValue("chui");
      await expect(page.locator("#difficulty")).toHaveValue("moderate");
      for (const [name, value] of [...Object.entries(values), ...days]) await expect(page.locator(`[name="${name}"]`), name).toHaveValue(value);
      expect(withDb((db) => (db.prepare("select count(*) as n from trips where slug = ?").get(SLUG) as { n: number }).n)).toBe(1);
    });

    test("edit day 2, save, change price, save: the day-2 edit persists", async ({ page }) => {
      const trip = allTrips().find((t) => t.slug === SLUG)!;
      expect(trip, "created by the previous test").toBeDefined();
      await page.goto(`/${lang}/admin/trips/${trip.id}`);
      await page.locator('[name="day.1.title.en"]').fill("Edited day two");
      await page.locator('[name="day.1.description.ru"]').fill("Правленый второй день");
      const stored = () => withDb((db) => db.prepare("select price_per_person_usd as p, itinerary from trips where id = ?").get(trip.id) as { p: number; itinerary: string });
      await page.getByRole("button", { name: a.form.save }).click();
      await expect.poll(() => JSON.parse(stored().itinerary).en[1].title).toBe("Edited day two");
      await expect(page.getByRole("status").filter({ hasText: a.form.saved })).toBeVisible();

      await page.locator("#price").fill("400");
      await page.getByRole("button", { name: a.form.save }).click();
      await expect.poll(() => stored().p).toBe(400);

      const row = stored();
      const it = JSON.parse(row.itinerary);
      expect(row.p).toBe(400);
      expect(it.en[1].title).toBe("Edited day two");
      expect(it.ru[1].description).toBe("Правленый второй день");
      expect(it.en[0].title).toBe("Day 1 title en");

      await page.reload();
      await expect(page.locator('[name="day.1.title.en"]')).toHaveValue("Edited day two");
      await expect(page.locator("#price")).toHaveValue("400");
    });

    test("add a departure; capacity below booked seats is refused", async ({ page }) => {
      const trip = allTrips().find((t) => t.slug === SLUG)!;
      const start = futureDate(90);
      await page.goto(`/${lang}/admin/trips/${trip.id}`);
      await page.locator("#new-start").fill(start);
      await page.locator("#new-cap").fill("6");
      await page.getByRole("button", { name: a.departures.add, exact: true }).click();
      await expect.poll(() => withDb((db) => db.prepare("select id from departures where trip_id = ? and start_date = ?").get(trip.id, start))).toBeTruthy();
      const dep = withDb((db) => db.prepare("select id, capacity from departures where trip_id = ? and start_date = ?").get(trip.id, start) as { id: number; capacity: number });
      expect(dep.capacity).toBe(6);

      // Same date again: refused.
      await page.locator("#new-start").fill(start);
      await page.getByRole("button", { name: a.departures.add, exact: true }).click();
      await expect(page.locator("p[role=alert]")).toContainText(a.errors.duplicate_date);

      insertBooking({ departureId: dep.id, travelers: 4, status: "confirmed" });
      await page.reload();
      const cap = page.locator(`#cap-${dep.id}`);
      const capacityInDb = () => withDb((db) => (db.prepare("select capacity from departures where id = ?").get(dep.id) as { capacity: number }).capacity);
      const update = cap.locator("xpath=ancestor::form").getByRole("button", { name: a.departures.update });
      // The browser itself blocks values below the booked seats (min = 4) ...
      await cap.fill("3");
      await expect(cap).toHaveAttribute("min", "4");
      await update.click();
      expect(await cap.evaluate((el: HTMLInputElement) => el.validity.rangeUnderflow)).toBe(true);
      expect(capacityInDb()).toBe(6);
      // ... and the server refuses it too when that client-side check is bypassed.
      await cap.evaluate((el: HTMLInputElement) => el.removeAttribute("min"));
      await update.click();
      await expect(page.locator("p[role=alert]")).toContainText(a.errors.below_taken.replace("{taken}", "4"));
      expect(capacityInDb()).toBe(6);

      await cap.fill("4"); // exactly the booked seats is allowed
      await update.click();
      await expect.poll(capacityInDb).toBe(4);
    });

    test("confirm then cancel a booking; cancelling frees the seats on the public page", async ({ page, browser }) => {
      const trip = allTrips().find((t) => t.slug === "talas-manas-ordo")!;
      const dep = addDeparture(trip.id, futureDate(500), 6);
      const { id, reference } = insertBooking({ departureId: dep, travelers: 2, status: "pending", name: "Admin Flow" });
      const status = () => withDb((db) => (db.prepare("select status from bookings where id = ?").get(id) as { status: string }).status);
      const publicSeats = async () => {
        const ctx = await browser.newContext();
        const p = await ctx.newPage();
        await p.goto(`/${lang}/trips/${trip.slug}`);
        const text = await p.locator(`a[href$="departure=${dep}"]`).locator("xpath=ancestor::li").innerText();
        await ctx.close();
        return text;
      };
      expect(await publicSeats()).toContain(plural(common.ui.seatsLeft, 4, lang));

      await page.goto(`/${lang}/admin?q=${reference}`);
      const card = page.locator("details", { hasText: reference });
      await card.locator("summary").click();
      await card.getByRole("button", { name: a.confirm, exact: true }).click();
      await expect.poll(status).toBe("confirmed");
      expect(await publicSeats()).toContain(plural(common.ui.seatsLeft, 4, lang)); // confirming keeps the seats taken

      await page.goto(`/${lang}/admin?q=${reference}`);
      await page.locator("details", { hasText: reference }).locator("summary").click();
      await page.getByRole("button", { name: a.cancelBooking }).click();
      await expect.poll(status).toBe("cancelled");
      expect(seatsLeft(dep)).toBe(6);
      expect(await publicSeats()).toContain(plural(common.ui.seatsLeft, 6, lang));
      // Terminal: no more actions on a cancelled booking.
      await page.goto(`/${lang}/admin?q=${reference}`);
      await page.locator("details", { hasText: reference }).locator("summary").click();
      await expect(page.getByRole("button", { name: a.cancelBooking })).toHaveCount(0);
      await expect(page.getByRole("button", { name: a.confirm, exact: true })).toHaveCount(0);
    });

    test("Cyrillic booking search is case-insensitive", async ({ page }) => {
      const trip = allTrips().find((t) => t.slug === "kel-suu-lake")!;
      const dep = addDeparture(trip.id, futureDate(501), 6);
      const { reference } = insertBooking({ departureId: dep, travelers: 1, name: "Айгуль Токтосунова" });
      const other = insertBooking({ departureId: dep, travelers: 1, name: "Bakyt Somebody" });
      for (const q of ["айгуль", "АЙГУЛЬ", "Айгуль", "токтосун"]) {
        await page.goto(`/${lang}/admin?q=${encodeURIComponent(q)}`);
        await expect(page.locator("details", { hasText: reference }), q).toHaveCount(1);
        await expect(page.locator("details", { hasText: other.reference }), q).toHaveCount(0);
      }
      await page.goto(`/${lang}/admin?q=${encodeURIComponent("несуществующий")}`);
      await expect(page.getByText(a.noMatches)).toBeVisible();
    });
  });
});
