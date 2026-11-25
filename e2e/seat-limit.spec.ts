import { expect, test } from "@playwright/test";
import { addDeparture, allTrips, dict, fillWholeWizard, futureDate, insertBooking, plural, seatsLeft } from "./helpers";

const lang = "en";
const booking = dict(lang, "booking");
const common = dict(lang, "common");
const tripRow = allTrips().find((t) => t.slug === "chon-kemin-valley")!;

test.describe("seat limit", () => {
  test("traveler-count select never exceeds the seats left; sold-out departure cannot be booked", async ({ page }) => {
    const dep = addDeparture(tripRow.id, futureDate(400), 5);
    insertBooking({ departureId: dep, travelers: 3, status: "confirmed" });
    insertBooking({ departureId: dep, travelers: 1, status: "pending" });
    insertBooking({ departureId: dep, travelers: 4, status: "cancelled" }); // cancelled seats do not count
    expect(seatsLeft(dep)).toBe(1);

    await page.goto(`/${lang}/trips/${tripRow.slug}`);
    const link = page.locator(`a[href="/${lang}/trips/${tripRow.slug}/book?departure=${dep}"]`);
    await expect(link).toBeVisible();
    await expect(link.locator("xpath=ancestor::li")).toContainText(plural(common.ui.seatsLeft, 1, lang));

    await link.click();
    await expect(page.locator('[name="travelerCount"] option')).toHaveCount(1);

    // Take the last seat: the departure is now sold out.
    insertBooking({ departureId: dep, travelers: 1, status: "pending" });
    expect(seatsLeft(dep)).toBe(0);

    // Sold out: no Book link on the trip page, and the booking URL shows the unavailable page.
    await page.goto(`/${lang}/trips/${tripRow.slug}`);
    await expect(page.locator(`a[href$="departure=${dep}"]`)).toHaveCount(0);
    await expect(page.getByText(common.ui.fullyBooked).first()).toBeVisible();
    await page.goto(`/${lang}/trips/${tripRow.slug}/book?departure=${dep}`);
    await expect(page.getByRole("heading", { name: booking.unavailableTitle })).toBeVisible();
    await expect(page.locator("form")).toHaveCount(0);
    await expect(page.getByRole("link", { name: booking.seeOtherDates })).toBeVisible();
  });

  test("select offers exactly the free seats (3 left -> 1..3)", async ({ page }) => {
    const dep = addDeparture(tripRow.id, futureDate(401), 6);
    insertBooking({ departureId: dep, travelers: 3, status: "confirmed" });
    await page.goto(`/${lang}/trips/${tripRow.slug}/book?departure=${dep}`);
    const values = await page.locator('[name="travelerCount"] option').evaluateAll((o) => o.map((x) => (x as HTMLOptionElement).value));
    expect(values).toEqual(["1", "2", "3"]);
  });

  test("seats taken after the page loaded: submit is refused, nothing is oversold, input is kept", async ({ page }) => {
    const dep = addDeparture(tripRow.id, futureDate(402), 3);
    await page.goto(`/${lang}/trips/${tripRow.slug}/book?departure=${dep}`);
    await fillWholeWizard(page, lang, {
      travelers: [
        { name: "Late Booker", dob: "1991-01-01" },
        { name: "Late Friend", dob: "1992-02-02" },
      ],
    });
    // Someone else takes 2 of the 3 seats while this form is open.
    insertBooking({ departureId: dep, travelers: 2, status: "confirmed" });
    await page.getByRole("button", { name: booking.summary.submit }).click();

    await expect(page.locator("p[role=alert]")).toContainText(plural(booking.messages.not_enough_seats, 1, lang));
    await expect(page).toHaveURL(/\/book\?departure=/);
    expect(seatsLeft(dep)).toBe(1);
    // The wizard returns to step 1 with what was typed still there.
    await expect(page.locator('[name="contactName"]')).toHaveValue("Late Booker");
    await expect(page.locator('[name="travelers.1.fullName"]')).toHaveValue("Late Friend");

    // Reducing to one traveler now succeeds and fills the departure.
    await page.locator('[name="travelerCount"]').selectOption("1");
    // Consent stays ticked from the first attempt; un-tick it so the premature submit caused by the known
    // Next-button bug (see booking.spec.ts) cannot create the booking before the final step.
    await page.locator('[name="consent"]').evaluate((el: HTMLInputElement) => (el.checked = false));
    await page.getByRole("button", { name: booking.wizard.next }).click();
    await page.getByRole("button", { name: booking.wizard.next }).click();
    await page.locator('[name="consent"]').check();
    await page.getByRole("button", { name: booking.summary.submit }).click({ noWaitAfter: true });
    await expect(page).toHaveURL(new RegExp(`/${lang}/bookings/NT-[A-Z2-9]{8}$`));
    expect(seatsLeft(dep)).toBe(0);
  });
});
