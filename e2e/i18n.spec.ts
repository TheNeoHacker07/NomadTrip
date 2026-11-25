import { expect, request, test } from "@playwright/test";
import { locales, localeLabels, type Locale } from "../src/i18n/config";

test.describe("locale negotiation", () => {
  test("/ redirects by Accept-Language", async ({ baseURL }) => {
    for (const [header, expected] of [["ru-RU,ru;q=0.9,en;q=0.8", "ru"], ["ky", "ky"], ["de,fr;q=0.5", "en"], ["en;q=0.2,ru;q=0.9", "ru"]]) {
      const ctx = await request.newContext({ baseURL, extraHTTPHeaders: { "accept-language": header } });
      const res = await ctx.get("/", { maxRedirects: 0 });
      expect(res.status(), header).toBeGreaterThanOrEqual(300);
      expect(new URL(res.headers()["location"], baseURL).pathname, header).toBe(`/${expected}`);
      await ctx.dispose();
    }
  });

  test("NEXT_LOCALE cookie beats Accept-Language; deep paths keep their path", async ({ baseURL }) => {
    const ctx = await request.newContext({ baseURL, extraHTTPHeaders: { "accept-language": "ru", cookie: "NEXT_LOCALE=ky" } });
    const res = await ctx.get("/trips/song-kul-weekend", { maxRedirects: 0 });
    expect(new URL(res.headers()["location"], baseURL).pathname).toBe("/ky/trips/song-kul-weekend");
    await ctx.dispose();
  });

  test("browser with ru locale lands on /ru", async ({ browser }) => {
    const context = await browser.newContext({ locale: "ru-RU" });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/ru$/);
    await context.close();
  });

  test("<html lang> matches the route", async ({ page }) => {
    for (const lang of locales) {
      await page.goto(`/${lang}/faq`);
      await expect(page.locator("html")).toHaveAttribute("lang", lang);
    }
  });

  test("language switcher keeps the path and query, and remembers the choice", async ({ page }) => {
    await page.goto("/en/trips/song-kul-weekend?x=1");
    for (const target of ["ru", "ky", "en"] as Locale[]) {
      await page.locator(`ul a[hreflang="${target}"]:visible`).click();
      await expect(page).toHaveURL(new RegExp(`/${target}/trips/song-kul-weekend\\?x=1$`));
      await expect(page.locator("html")).toHaveAttribute("lang", target);
      const current = page.locator(`ul a[hreflang="${target}"][aria-current="true"]`);
      await expect(current).toBeVisible();
      await expect(current).toHaveText(localeLabels[target]);
    }
    // (Cache Components keeps the previous route's DOM hidden, hence `:visible` above.)
    // The last choice (en) is stored; a fresh visit to / uses the cookie, not the browser language.
    await page.locator('ul a[hreflang="ky"]:visible').click();
    await expect(page).toHaveURL(/\/ky\//);
    await page.goto("/");
    await expect(page).toHaveURL(/\/ky$/);
  });
});
