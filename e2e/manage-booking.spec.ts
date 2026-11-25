import { expect, request, test } from "@playwright/test";
import { dict, firstDeparture, insertBooking } from "./helpers";

const lang = "en";
const m = dict(lang, "manage");
const slug = "song-kul-weekend";
const EMAIL = "fill@example.com"; // the address insertBooking stores

test.describe("manage my booking", () => {
  test("finds a booking by reference + email (case-insensitive), shows the calendar link and serves text/calendar", async ({ page, baseURL }) => {
    const { reference } = insertBooking({ departureId: firstDeparture(slug).id, travelers: 2, status: "confirmed", name: "Manage Guest" });
    await page.goto(`/${lang}/manage-booking`);
    await page.getByLabel(m.form.reference).fill(` ${reference.toLowerCase()} `);
    await page.getByLabel(m.form.email).fill(EMAIL.toUpperCase());
    await page.getByRole("button", { name: m.form.submit }).click();

    await expect(page.getByRole("heading", { name: m.result.title })).toBeVisible();
    await expect(page.getByText(reference, { exact: true })).toBeVisible();
    await expect(page.getByText("Manage Guest 1, Manage Guest 2")).toBeVisible();
    // The email is never put in the URL, and contact/health details are not rendered.
    expect(page.url()).not.toContain("fill%40");
    expect(page.url()).not.toContain("fill@");
    await expect(page.getByText("+996555000222")).toHaveCount(0);
    await expect(page.getByText("Fill Contact")).toHaveCount(0);

    const link = page.getByRole("link", { name: m.calendar });
    await expect(link).toBeVisible();
    const href = await link.getAttribute("href");
    expect(href).toBe(`/${lang}/bookings/${reference}/calendar.ics`);
    const res = await (await request.newContext({ baseURL })).get(href!);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toMatch(/^text\/calendar/);
    const body = await res.text();
    expect(body).toContain("BEGIN:VEVENT");
    expect(body).toContain(`UID:${reference}@nomadtrip`);
    expect(body).toContain("DTSTART;VALUE=DATE:");
    expect(body).not.toContain(EMAIL);
  });

  test("a wrong email and an unknown reference give the same not-found message", async ({ page }) => {
    const { reference } = insertBooking({ departureId: firstDeparture(slug).id, travelers: 1, name: "Other Guest" });
    const attempt = async (ref: string, email: string) => {
      await page.goto(`/${lang}/manage-booking`);
      await page.getByLabel(m.form.reference).fill(ref);
      await page.getByLabel(m.form.email).fill(email);
      await page.getByRole("button", { name: m.form.submit }).click();
      await expect(page.getByText(m.errors.notFound, { exact: true })).toBeVisible();
    };
    await attempt(reference, "someone.else@example.com");
    await attempt("NT-AAAAAAAA", EMAIL);
    await expect(page.getByRole("heading", { name: m.result.title })).toHaveCount(0);
  });

  test("the confirmation page links to the calendar file", async ({ page }) => {
    const { reference } = insertBooking({ departureId: firstDeparture(slug).id, travelers: 1, name: "Cal Guest" });
    await page.goto(`/${lang}/bookings/${reference}`);
    await expect(page.getByRole("link", { name: m.calendar })).toHaveAttribute("href", `/${lang}/bookings/${reference}/calendar.ics`);
  });
});

test.describe("manage my booking without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("a pre-hydration submit never puts the reference or email in the URL", async ({ page }) => {
    const { reference } = insertBooking({ departureId: firstDeparture(slug).id, travelers: 1, name: "NoJs Guest" });
    await page.goto(`/${lang}/manage-booking`);
    await page.getByLabel(m.form.reference).fill(reference);
    await page.getByLabel(m.form.email).fill(EMAIL);
    const [response] = await Promise.all([page.waitForNavigation().catch(() => null), page.getByRole("button", { name: m.form.submit }).click()]);
    const url = page.url();
    expect(url).not.toMatch(/email=|reference=/i);
    expect(url).not.toContain("fill%40");
    expect(url).not.toContain("fill@");
    expect(url).not.toContain(reference);
    if (response) expect(response.status()).toBeLessThan(500);
  });
});
