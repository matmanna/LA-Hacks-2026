import { expect, test } from "@playwright/test";

import { expectNoA11yViolations } from "./a11y";

test("consumer landing hero, CTAs, footer, no overflow", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Your hospital bill, checked line by line.",
    }),
  ).toBeVisible();
  const main = page.getByRole("main");
  await expect(
    main.getByRole("button", { name: "Check my bill" }).first(),
  ).toBeVisible();
  await expect(
    main.getByRole("button", { name: "Try a sample bill" }).first(),
  ).toBeVisible();
  await expect(
    page.getByText("BetterBill is informational, not legal or medical advice."),
  ).toBeVisible();
  const noOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  expect(noOverflow).toBe(true);
  await expectNoA11yViolations(page);
  await page.screenshot({
    path: `design/screens/landing-${testInfo.project.name}.png`,
    fullPage: true,
  });
});

test("hero CTAs sit above the fold on the mobile viewport", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "mobile only");
  await page.goto("/");
  const main = page.getByRole("main");
  const viewportHeight = page.viewportSize()?.height ?? 0;
  for (const name of ["Check my bill", "Try a sample bill"]) {
    const box = await main.getByRole("button", { name }).first().boundingBox();
    expect((box?.y ?? 9999) + (box?.height ?? 0)).toBeLessThanOrEqual(
      viewportHeight,
    );
  }
});

test("plans landing: H1, honest results card, labelled form, axe", async ({
  page,
}, testInfo) => {
  await page.goto("/for-plans");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Bill review your members can see.",
    }),
  ).toBeVisible();
  // B's eval.results stub has no measurements, so the honest placeholder shows.
  await expect(page.getByText("Measured results coming.")).toBeVisible();
  await expect(page.getByLabel("Work email")).toBeVisible();
  await expect(page.getByLabel("Organization")).toBeVisible();
  const noOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth <= window.innerWidth,
  );
  expect(noOverflow).toBe(true);
  await expectNoA11yViolations(page);
  await page.screenshot({
    path: `design/screens/plans-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
