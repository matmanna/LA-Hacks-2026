import { expect, test } from "@playwright/test";

import { expectNoA11yViolations } from "./a11y";

test("landing loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  const fontFamily = await page.evaluate(
    () => getComputedStyle(document.body).fontFamily,
  );
  expect(fontFamily).toContain("Geist");
  await expectNoA11yViolations(page);
});

test("design gallery", async ({ page }, testInfo) => {
  await page.goto("/design");
  await expect(page.getByRole("heading", { name: "Color" })).toBeVisible();
  await expectNoA11yViolations(page);
  await page.screenshot({
    path: `test-results/design-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
