import { expect, test } from "@playwright/test";

import { expectNoA11yViolations } from "./a11y";

test("case page shows balance, flags, savings bar", async ({
  page,
}, testInfo) => {
  await page.goto("/case/case-demo");
  await expect(
    page.getByText("Your fair balance").locator("visible=true").first(),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /Show evidence$/ }).first(),
  ).toBeVisible();
  await expect(
    page
      .getByText("BetterBill is informational, not legal or medical advice.")
      .locator("visible=true"),
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

test("desktop shows the bill table and a sticky aside; mobile hides the table", async ({
  page,
}, testInfo) => {
  await page.goto("/case/case-demo");
  if (testInfo.project.name === "mobile") {
    await expect(page.getByRole("table")).toBeHidden();
    return;
  }
  const rows = page.getByRole("row");
  // header + 2 lines + footer in B's stub bill
  await expect(rows).toHaveCount(4);
  const aside = page.getByRole("complementary", {
    name: "Savings and actions",
  });
  await expect(aside).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 1200));
  await expect(aside).toBeInViewport();
  await page
    .getByRole("button", { name: /Show evidence$/ })
    .first()
    .click();
  const box = await page.getByRole("dialog").boundingBox();
  expect(box?.x ?? 0).toBeGreaterThan(800);
});
