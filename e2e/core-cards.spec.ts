import { expect, test } from "@playwright/test";

import { expectNoA11yViolations } from "./a11y";

test("core cards render with spoken labels", async ({ page }) => {
  await page.goto("/design");
  await expect(
    page.getByRole("region", { name: /Your fair balance/ }).first(),
  ).toBeVisible();
  const rows = page.getByRole("button", { name: /Show evidence$/ });
  await expect(rows).toHaveCount(3);
  await expect(rows.first()).toHaveAttribute(
    "aria-label",
    "Same lab test billed twice. Confirmed from your bill. 84 dollars. Show evidence",
  );
  await expect(
    page.getByRole("region", { name: "Savings summary" }),
  ).toBeVisible();
  await expectNoA11yViolations(page);
});
