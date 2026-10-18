import { expect, test } from "@playwright/test";

import { expectNoA11yViolations } from "./a11y";

test("phone page saves hospital details and moves on to confirm", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => localStorage.setItem("bb_onboarded", "1"));
  await page.goto("/check");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Try a sample bill" }).click();
  await expect(page).toHaveURL(/\/case\/.+\/confirm/);
  await page.goto(page.url().replace("/confirm", "/phone"));
  await page.waitForLoadState("networkidle");

  await expect(
    page.getByRole("heading", { name: "Your phone number" }),
  ).toBeVisible();
  await expectNoA11yViolations(page);
  await page.screenshot({
    path: `design/screens/phone-${testInfo.project.name}.png`,
  });

  await page.getByLabel("Hospital website").fill("www.example-hospital.org");
  await page.getByLabel("Billing phone").fill("310-555-0100");
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page).toHaveURL(/\/case\/.+\/confirm/);

  // What was saved comes back, formatted.
  await page.goto(page.url().replace("/confirm", "/phone"));
  await page.waitForLoadState("networkidle");
  await expect(page.getByLabel("Billing phone")).toHaveValue("(310) 555-0100");
});

test("a phone number that isn't a number is explained, not saved", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("bb_onboarded", "1"));
  await page.goto("/check");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Try a sample bill" }).click();
  await expect(page).toHaveURL(/\/case\/.+\/confirm/);
  await page.goto(page.url().replace("/confirm", "/phone"));
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Your phone").fill("call me");
  await page.getByRole("button", { name: "Text me a code" }).click();
  await expect(page.getByRole("alert")).toContainText("doesn't look right");
  await expect(page).toHaveURL(/\/phone/);
});

test("a typed phone number offers a texted code, or continuing without one", async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.setItem("bb_onboarded", "1"));
  await page.goto("/check");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Try a sample bill" }).click();
  await expect(page).toHaveURL(/\/case\/.+\/confirm/);
  await page.goto(page.url().replace("/confirm", "/phone"));
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Your phone").fill("(310) 555-0101");
  await expect(
    page.getByRole("button", { name: "Text me a code" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Continue without signing in" })
    .click();
  await expect(page).toHaveURL(/\/case\/.+\/confirm/);
});
