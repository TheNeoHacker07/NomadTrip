import { expect, request, test } from "@playwright/test";
import { dict } from "./helpers";

const lang = "en";
const q = dict(lang, "inquiry");
const a = dict(lang, "admin");
const slug = "song-kul-weekend";

test.describe("custom trip inquiry", () => {
  test("submitted from a trip page, listed in admin and marked handled", async ({ page, browser }) => {
    const message = `Custom plan request ${Date.now()}`;
    await page.goto(`/${lang}/trips/${slug}`);
    await page.getByRole("link", { name: q.tripLink }).first().click();
    await expect(page).toHaveURL(new RegExp(`/${lang}/inquiry\\?trip=${slug}$`));

    // Empty submit shows field errors and stores nothing.
    await page.getByRole("button", { name: q.submit }).click();
    await expect(page.locator("#err-name")).toHaveText(q.errors.required);
    await expect(page.locator("#err-consent")).toHaveText(q.errors.consent_required);

    await page.getByLabel(q.fields.name).fill("Inquiry Person");
    await page.getByLabel(q.fields.email, { exact: true }).fill("inquiry.person@example.com");
    await page.getByLabel(q.fields.groupSize).fill("4");
    await page.getByLabel(q.fields.message).fill(message);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: q.submit }).click();
    await expect(page.getByRole("heading", { name: q.success.title })).toBeVisible();

    const admin = await browser.newContext({ httpCredentials: { username: "admin", password: "e2e", send: "always" } });
    const ap = await admin.newPage();
    await ap.goto(`/${lang}/admin/inquiries`);
    const card = ap.getByRole("article").filter({ hasText: message });
    await expect(card).toBeVisible();
    await expect(card).toContainText("inquiry.person@example.com");
    await card.getByRole("button", { name: a.inquiries.markHandled }).click();
    await expect(card.getByRole("button", { name: a.inquiries.markHandled })).toHaveCount(0);

    await ap.goto(`/${lang}/admin/inquiries?status=new`);
    await expect(ap.getByRole("article").filter({ hasText: message })).toHaveCount(0);
    await ap.goto(`/${lang}/admin/inquiries?status=handled`);
    await expect(ap.getByRole("article").filter({ hasText: message })).toBeVisible();
    await admin.close();
  });

  test("the honeypot pretends success but stores nothing", async ({ page, browser }) => {
    const message = `Bot message ${Date.now()}`;
    await page.goto(`/${lang}/inquiry`);
    await page.getByLabel(q.fields.name).fill("Totally Human");
    await page.getByLabel(q.fields.email, { exact: true }).fill("bot@example.com");
    await page.getByLabel(q.fields.message).fill(message);
    await page.getByRole("checkbox").check();
    await page.locator('[name="website"]').fill("http://spam.example", { force: true });
    await page.getByRole("button", { name: q.submit }).click();
    await expect(page.getByRole("heading", { name: q.success.title })).toBeVisible();

    const admin = await browser.newContext({ httpCredentials: { username: "admin", password: "e2e", send: "always" } });
    const ap = await admin.newPage();
    await ap.goto(`/${lang}/admin/inquiries`);
    await expect(ap.getByRole("article").filter({ hasText: message })).toHaveCount(0);
    await admin.close();
  });

  test("admin inquiries require auth", async ({ baseURL }) => {
    const res = await request.newContext({ baseURL });
    expect((await res.get(`/${lang}/admin/inquiries`)).status()).toBe(401);
  });
});
