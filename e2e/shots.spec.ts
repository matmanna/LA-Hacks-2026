import { test } from "@playwright/test";

test("component shots", async ({ page }, testInfo) => {
  test.skip(process.env.SHOTS !== "1", "manual");
  await page.goto("/design");
  const name = testInfo.project.name;
  await page
    .getByRole("heading", { name: "Balance card" })
    .locator("..")
    .screenshot({ path: `design/screens/core-cards-balance-${name}.png` });
  await page
    .getByRole("heading", { name: "Flag rows" })
    .locator("..")
    .screenshot({ path: `design/screens/core-cards-flags-${name}.png` });
});
