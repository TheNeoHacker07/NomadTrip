import { expect, request, test } from "@playwright/test";
import { firstDeparture, insertBooking } from "./helpers";

const lang = "en";
const slug = "song-kul-weekend";

test.describe("bookings CSV export", () => {
  test("requires admin auth", async ({ baseURL }) => {
    const anon = await request.newContext({ baseURL });
    const res = await anon.get(`/${lang}/admin/bookings.csv`);
    expect(res.status()).toBe(401);
    expect(res.headers()["www-authenticate"]).toMatch(/^Basic/i);
    const wrong = await request.newContext({ baseURL, httpCredentials: { username: "admin", password: "nope", send: "always" } });
    expect((await wrong.get(`/${lang}/admin/bookings.csv`)).status()).toBe(401);
    await Promise.all([anon.dispose(), wrong.dispose()]);
  });

  test("downloads a BOM-prefixed CSV with the booking, honours filters and neutralises formulas", async ({ baseURL }) => {
    const { reference } = insertBooking({ departureId: firstDeparture(slug).id, travelers: 2, name: "=HYPERLINK(1)" });
    const other = insertBooking({ departureId: firstDeparture(slug).id, travelers: 1, name: "Plain Person" });
    const admin = await request.newContext({ baseURL, httpCredentials: { username: "admin", password: "e2e", send: "always" } });

    const res = await admin.get(`/${lang}/admin/bookings.csv?q=${reference}`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toMatch(/^text\/csv/);
    expect(res.headers()["cache-control"]).toContain("no-store");
    expect(res.headers()["content-disposition"]).toMatch(/attachment/);
    const bytes = await res.body();
    expect([...bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const text = bytes.toString("utf8");
    expect(text).toContain(reference);
    expect(text).not.toContain(other.reference); // the q filter applies
    expect(text).toContain("'=HYPERLINK(1)");
    expect(text).not.toMatch(/(^|,|\n)=HYPERLINK/);

    const all = (await (await admin.get(`/${lang}/admin/bookings.csv`)).text());
    expect(all).toContain(other.reference);
    await admin.dispose();
  });
});
