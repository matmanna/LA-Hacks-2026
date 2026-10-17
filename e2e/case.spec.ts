import { expect, test } from "@playwright/test";

import { expectNoA11yViolations } from "./a11y";

test("case page shows balance, flags, savings bar", async ({
  page,
}, testInfo) => {
  await page.goto("/case/case-demo");
  await expect(page.getByText("Your fair balance").first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Show evidence$/ }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("BetterBill is informational, not legal or medical advice."),
  ).toBeVisible();
  if (testInfo.project.name === "mobile") {
    await expect(
      page.getByRole("region", { name: "Savings summary" }),
    ).toBeVisible();
  }
  await expectNoA11yViolations(page);
  await page.screenshot({
    path: `design/screens/case-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("evidence sheet opens with source and closes on Escape", async ({
  page,
}, testInfo) => {
  await page.goto("/case/case-demo");
  await page
    .getByRole("button", { name: /Show evidence$/ })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("What we found")).toBeVisible();
  await expect(dialog.getByText("What to say to billing")).toBeVisible();
  await expect(dialog.getByText(/Source: your bill/)).toBeVisible();
  await expectNoA11yViolations(page);
  if (testInfo.project.name === "desktop") {
    const box = await dialog.boundingBox();
    expect(box?.x ?? 0).toBeGreaterThan(800);
  }
  await page.screenshot({
    path: `design/screens/evidence-${testInfo.project.name}.png`,
  });
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});
