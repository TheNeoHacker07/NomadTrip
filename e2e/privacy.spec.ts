import { expect, test } from "@playwright/test";
import { fillWholeWizard, firstDeparture, dict } from "./helpers";

const lang = "en";
const booking = dict(lang, "booking");

test("public confirmation page never exposes contact, emergency or health details", async ({ page }) => {
  const secret = {
    email: "private.person.e2e@example.org",
    phone: "+49 170 5550 1234",
    emergencyName: "Zebediah Emergencyname",
    emergencyPhone: "+49 171 5559 8765",
    medicalNotes: "e2e-secret-asthma-note",
    specialRequests: "e2e-secret-special-request",
  };
  const dep = firstDeparture("issyk-kul-circle");
  await page.goto(`/${lang}/trips/issyk-kul-circle/book?departure=${dep.id}`);
  await fillWholeWizard(page, lang, {
    contact: "Petra Privacy",
    email: secret.email,
    phone: secret.phone,
    emergencyName: secret.emergencyName,
    emergencyPhone: secret.emergencyPhone,
    medicalNotes: secret.medicalNotes,
    specialRequests: secret.specialRequests,
    travelers: [{ name: "Petra Privacy", dob: "1988-08-08" }],
  });
  await page.getByRole("button", { name: booking.summary.submit }).click();
  await expect(page).toHaveURL(/\/en\/bookings\/NT-[A-Z2-9]{8}$/);
  await expect(page.getByText(page.url().split("/").pop()!, { exact: true })).toBeVisible();

  // Rendered text AND the raw HTML (which includes the RSC payload) must be free of private data.
  const text = await page.locator("body").innerText();
  const html = await (await page.request.get(page.url())).text();
  for (const [key, value] of Object.entries(secret)) {
    expect(text, `${key} in visible text`).not.toContain(value);
    expect(html, `${key} in HTML/RSC payload`).not.toContain(value);
  }
  // Digits of the phone numbers in any formatting.
  for (const digits of ["1701555", "1715559", "5550 1234"]) expect(html).not.toContain(digits);
});
