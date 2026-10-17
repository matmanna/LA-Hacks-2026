import { expect, test } from "@playwright/test";

import { expectNoA11yViolations } from "./a11y";

test("check screen offers camera and sample, sample reaches confirm", async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => localStorage.setItem("bb_onboarded", "1"));
  await page.goto("/check");
  await expect(
    page.getByRole("button", { name: "Take a photo" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Try a sample bill" }),
  ).toBeVisible();
  await expect(page.locator("input[capture=environment]")).toHaveCount(1);
  await expectNoA11yViolations(page);
  await page.screenshot({
    path: `design/screens/check-${testInfo.project.name}.png`,
  });
  await page.getByRole("button", { name: "Try a sample bill" }).click();
  await expect(page).toHaveURL(/\/case\/.+\/confirm/);
});

test("first visit goes to welcome and Skip lands on check", async ({
  page,
}, testInfo) => {
  await page.goto("/check");
  await expect(page).toHaveURL(/\/welcome/);
  await expect(
    page.getByRole("heading", { name: "Snap your bill" }),
  ).toBeVisible();
  await expectNoA11yViolations(page);
  await page.screenshot({
    path: `design/screens/welcome-${testInfo.project.name}.png`,
  });
  await page.getByRole("button", { name: "Skip" }).click();
  await expect(page).toHaveURL(/\/check/);
});
