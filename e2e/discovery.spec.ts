import { expect, test } from "@playwright/test";
import { allTrips, firstDeparture } from "./helpers";

const lang = "en";
const slug = "song-kul-weekend";

test.describe("departures page", () => {
  test("lists a known departure and its Book link opens the wizard", async ({ page }) => {
    const dep = firstDeparture(slug);
    await page.goto(`/${lang}/departures`);
    const row = page.locator(`[data-departure-id="${dep.id}"]`);
    await expect(row).toBeVisible();
    await expect(row.locator(`a[href="/${lang}/trips/${slug}"]`)).toBeVisible();
    await row.locator(`a[href="/${lang}/trips/${slug}/book?departure=${dep.id}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/trips/${slug}/book\\?departure=${dep.id}$`));
    await expect(page.locator('[name="contactName"]')).toBeVisible();
  });

  test("month filter narrows the list; an invalid month is ignored", async ({ page }) => {
    const dep = firstDeparture(slug);
    await page.goto(`/${lang}/departures`);
    await expect(page.locator("[data-departure-id]").first()).toBeVisible();
    const all = await page.locator("[data-departure-id]").count();
    await page.goto(`/${lang}/departures?month=${dep.startDate.slice(0, 7)}`);
    await expect(page.locator(`[data-departure-id="${dep.id}"]`)).toBeVisible();
    expect(await page.locator("[data-departure-id]").count()).toBeLessThanOrEqual(all);
    await page.goto(`/${lang}/departures?month=garbage`);
    await expect(page.locator("[data-departure-id]")).toHaveCount(all);
  });
});

test.describe("similar trips", () => {
  test("trip page shows at most 3 other trips", async ({ page }) => {
    await page.goto(`/${lang}/trips/${slug}`);
    const links = page.getByTestId("similar-trips").locator("a");
    await expect(links.first()).toBeVisible();
    const hrefs = await links.evaluateAll((els) => els.map((e) => e.getAttribute("href")));
    expect(hrefs.length).toBeLessThanOrEqual(3);
    for (const href of hrefs) expect(href).not.toBe(`/${lang}/trips/${slug}`);
  });
});

test.describe("SEO", () => {
  test("sitemap.xml lists all locales and no admin or booking URLs", async ({ request }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.status()).toBe(200);
    const xml = await res.text();
    for (const l of ["en", "ru", "ky"]) expect(xml).toContain(`/${l}/departures</loc>`);
    for (const t of allTrips()) expect(xml).toContain(`/en/trips/${t.slug}</loc>`);
    expect(xml).toContain('hreflang="x-default"');
    expect(xml).not.toMatch(/\/admin|\/bookings\//);
  });

  test("robots.txt disallows admin and bookings and points to the sitemap", async ({ request }) => {
    const res = await request.get("/robots.txt");
    expect(res.status()).toBe(200);
    const txt = await res.text();
    expect(txt).toContain("Disallow: /*/admin");
    expect(txt).toContain("Disallow: /*/bookings/");
    expect(txt).toMatch(/Sitemap: .+\/sitemap\.xml/);
  });

  test("trip page has TouristTrip JSON-LD, Open Graph tags and hreflang x-default", async ({ page }) => {
    await page.goto(`/${lang}/trips/${slug}`);
    const raw = await page.locator('script[type="application/ld+json"]').first().textContent();
    const ld = JSON.parse(raw!);
    expect(ld["@type"]).toBe("TouristTrip");
    expect(ld.offers.length).toBeGreaterThan(0);
    expect(ld.offers[0].priceCurrency).toBe("USD");
    await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute("content", "en_GB");
    await expect(page.locator('meta[property="og:image"]')).toHaveCount(1);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveCount(1);
    await expect(page.locator('link[rel="alternate"][hreflang="x-default"]')).toHaveAttribute("href", new RegExp(`/en/trips/${slug}$`));
  });
});

test.describe("real 404 status", () => {
  for (const path of ["/trips/no-such-trip", "/trips/no-such-trip/book?departure=1", "/bookings/NT-ZZZZZZZZ", "/bookings/not-a-reference"]) {
    test(`${path} returns 404 and renders a not-found page`, async ({ page }) => {
      const res = await page.goto(`/${lang}${path}`);
      expect(res!.status()).toBe(404);
      await expect(page.getByText(/404/).first()).toBeVisible();
    });
  }

  test("a known trip still returns 200", async ({ request }) => {
    expect((await request.get(`/${lang}/trips/${slug}`)).status()).toBe(200);
  });
});
