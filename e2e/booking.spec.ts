import { expect, test } from "@playwright/test";
import { ageOn } from "../src/lib/age";
import { dict, firstDeparture, fillExperience, fillWho, fillWholeWizard, interpolate, plural, withDb } from "./helpers";

const lang = "ru";
const booking = dict(lang, "booking");
const slug = "song-kul-weekend";

const next = (page: import("@playwright/test").Page) => page.getByRole("button", { name: booking.wizard.next });
const stepIndicator = (n: number) => interpolate(booking.wizard.stepOf, { n, total: 3 });

test.describe("booking wizard (ru)", () => {
  test("full booking: 2 travelers, ages, validation, review, submit, confirmation and DB", async ({ page }) => {
    const dep = firstDeparture(slug);
    await page.goto(`/${lang}/trips/${slug}`);
    // Pick the departure through the trip page's Book link for that departure.
    await page.locator(`a[href="/${lang}/trips/${slug}/book?departure=${dep.id}"]`).click();
    await expect(page).toHaveURL(new RegExp(`/${lang}/trips/${slug}/book\\?departure=${dep.id}$`));
    await expect(page.getByText(stepIndicator(1), { exact: true })).toBeVisible();

    // Next with everything empty: error shown, still on step 1.
    await next(page).click();
    await expect(page.locator("#err-contactName")).toHaveText(booking.errors.required);
    await expect(page.locator('[name="contactName"]')).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText(stepIndicator(1), { exact: true })).toBeVisible();
    await expect(page.locator("#step-1-title")).toBeVisible();

    const people = [
      { name: "Anna Schmidt", dob: "1990-05-15" },
      { name: "Lukas Schmidt", dob: "2015-03-02" },
    ];
    await fillWho(page, { name: "Anna Schmidt", email: "anna.schmidt@example.com", phone: "+49 151 2345 6789", travelers: people });
    for (const [i, p] of people.entries()) {
      const age = ageOn(p.dob, dep.startDate)!;
      await expect(page.locator("fieldset", { has: page.locator(`[name="travelers.${i}.fullName"]`) })).toContainText(
        plural(booking.fields.ageAtDeparture, age, lang),
      );
    }

    // A single invalid field also blocks Next (bad email).
    await page.locator('[name="email"]').fill("not-an-email");
    await next(page).click();
    await expect(page.locator("#err-email")).toHaveText(booking.errors.invalid_email);
    await expect(page.getByText(stepIndicator(1), { exact: true })).toBeVisible();
    await page.locator('[name="email"]').fill("anna.schmidt@example.com");

    await next(page).click();
    await expect(page.getByText(stepIndicator(2), { exact: true })).toBeVisible();
    await next(page).click(); // nationality empty -> blocked on step 2
    await expect(page.locator('[id="err-travelers.0.nationality"]')).toBeVisible();
    await expect(page.getByText(stepIndicator(2), { exact: true })).toBeVisible();
    await fillExperience(page, 2);
    await next(page).click();

    await expect(page.getByText(stepIndicator(3), { exact: true })).toBeVisible();
    await page.locator('[name="emergencyName"]').fill("Hans Schmidt");
    await page.locator('[name="emergencyPhone"]').fill("+49 160 9876 5432");
    // Review shows both names (it is rebuilt on entering step 3; leave and re-enter to include late edits).
    const review = page.locator("div.card", { hasText: booking.wizard.reviewTitle });
    await expect(review).toContainText("Anna Schmidt");
    await expect(review).toContainText("Lukas Schmidt");

    // Submitting without consent is refused on the same step.
    const submit = page.getByRole("button", { name: booking.summary.submit });
    await submit.click();
    await expect(page.locator("#err-consent")).toHaveText(booking.errors.consent_required);
    await expect(page).toHaveURL(/\/book\?departure=/);

    await page.locator('[name="consent"]').check();
    await submit.click();
    await expect(page).toHaveURL(new RegExp(`/${lang}/bookings/NT-[A-Z2-9]{8}$`));
    const reference = page.url().split("/").pop()!;
    await expect(page.getByText(reference, { exact: true })).toBeVisible();
    await expect(page.locator("dl")).toContainText("Anna Schmidt, Lukas Schmidt");

    const row = withDb((db) => {
      const b = db.prepare("select id, traveler_count as n, departure_id as dep, status from bookings where reference = ?").get(reference) as { id: number; n: number; dep: number; status: string };
      const t = db.prepare("select full_name as name, date_of_birth as dob from travelers where booking_id = ? order by id").all(b.id) as { name: string; dob: string }[];
      return { b, t };
    });
    expect(row.b).toMatchObject({ n: 2, dep: dep.id, status: "pending" });
    expect(row.t).toEqual(people.map((p) => ({ name: p.name, dob: p.dob })));
  });

  test("Back keeps entered values on every step", async ({ page }) => {
    const dep = firstDeparture(slug);
    await page.goto(`/${lang}/trips/${slug}/book?departure=${dep.id}`);
    const people = [
      { name: "Olga Petrova", dob: "1985-11-30" },
      { name: "Ivan Petrov", dob: "2010-01-09" },
    ];
    await fillWho(page, { name: "Olga Petrova", email: "olga@example.com", phone: "+7 912 345 67 89", travelers: people });
    await next(page).click();
    await fillExperience(page, 2);
    await page.locator('[name="medicalNotes"]').fill("remember me");
    await page.locator('[name="yurtArrangement"][value="private"]').check();
    await next(page).click();
    await expect(page.getByText(stepIndicator(3), { exact: true })).toBeVisible();

    const back = page.getByRole("button", { name: booking.wizard.back });
    await back.click();
    await expect(page.getByText(stepIndicator(2), { exact: true })).toBeVisible();
    await expect(page.locator('[name="medicalNotes"]')).toHaveValue("remember me");
    await expect(page.locator('[name="yurtArrangement"][value="private"]')).toBeChecked();
    await expect(page.locator('[name="travelers.1.nationality"]')).toHaveValue("German");
    await back.click();
    await expect(page.getByText(stepIndicator(1), { exact: true })).toBeVisible();
    await expect(page.locator('[name="contactName"]')).toHaveValue("Olga Petrova");
    await expect(page.locator('[name="email"]')).toHaveValue("olga@example.com");
    await expect(page.locator('[name="travelerCount"]')).toHaveValue("2");
    await expect(page.locator('[name="travelers.1.fullName"]')).toHaveValue("Ivan Petrov");
    await expect(page.locator('[name="travelers.1.dateOfBirth"]')).toHaveValue("2010-01-09");
  });

  test("keyboard-only progression through step 1", async ({ page }) => {
    const dep = firstDeparture(slug);
    await page.goto(`/${lang}/trips/${slug}/book?departure=${dep.id}`);
    const kb = page.keyboard;
    await page.waitForLoadState("networkidle"); // hydrated before typing
    await page.locator('[name="contactName"]').focus();
    await kb.type("Keyboard User");
    await kb.press("Tab");
    await kb.type("+49 151 1111 2222"); // phone
    await kb.press("Tab");
    await kb.type("kb.user@example.com"); // email
    await kb.press("Tab"); // messenger select (default kept)
    await expect(page.locator('[name="messenger"]')).toBeFocused();
    await kb.press("Tab");
    await kb.type("Germany"); // country
    await kb.press("Tab"); // traveler count (default 1)
    await expect(page.locator('[name="travelerCount"]')).toBeFocused();
    await kb.press("Tab");
    await kb.type("Keyboard User"); // traveler 1 name
    await kb.press("Tab");
    await expect(page.locator('[name="travelers.0.dateOfBirth"]')).toBeFocused();
    await kb.type("01021990"); // dd/mm/yyyy or mm/dd/yyyy: 1 Feb or 2 Jan 1990, both valid
    await kb.press("Tab"); // date segments: keep tabbing until the Next button has focus
    const nextBtn = next(page);
    for (let i = 0; i < 4 && !(await nextBtn.evaluate((el) => el === document.activeElement)); i++) await kb.press("Tab");
    await expect(nextBtn).toBeFocused();
    await kb.press("Enter");
    await expect(page.getByText(stepIndicator(2), { exact: true })).toBeVisible();
    await expect(page.locator("#step-2-title")).toBeFocused(); // focus moves to the new step's heading
  });

  // Regression: Next and Submit once shared one DOM button, so clicking Next on step 2 submitted the form.
  test("Next on step 2 only advances; it does not submit the booking form", async ({ page }) => {
    const dep = firstDeparture(slug);
    await page.goto(`/${lang}/trips/${slug}/book?departure=${dep.id}`);
    await page.waitForLoadState("networkidle");
    const posts: string[] = [];
    page.on("request", (r) => r.method() === "POST" && posts.push(r.url()));
    await fillWho(page, { name: "No Submit", email: "no.submit@example.com", phone: "+49 151 2345 6789", travelers: [{ name: "No Submit", dob: "1990-05-15" }] });
    await next(page).click();
    await fillExperience(page, 1);
    await next(page).click();
    await expect(page.getByText(stepIndicator(3), { exact: true })).toBeVisible();
    await page.waitForTimeout(1000);
    expect(posts).toHaveLength(0);
    await expect(page.locator("#err-emergencyName")).toHaveCount(0);
  });

  test("the wizard helper walks all three steps (smoke)", async ({ page }) => {
    const dep = firstDeparture(slug);
    await page.goto(`/${lang}/trips/${slug}/book?departure=${dep.id}`);
    await fillWholeWizard(page, lang);
    await page.getByRole("button", { name: booking.summary.submit }).click();
    await expect(page).toHaveURL(new RegExp(`/${lang}/bookings/NT-[A-Z2-9]{8}$`));
  });
});
