import { expect, test } from "@playwright/test";

test("Money renders true minus, superscript cents, and spoken label", async ({
  page,
}) => {
  await page.goto("/design");
  const negative = page.getByTestId("money-negative").getByRole("img");
  await expect(negative).toHaveText("−$1,022.47");
  await expect(negative).toHaveAttribute(
    "aria-label",
    "minus 1,022 dollars and 47 cents",
  );
  await expect(
    page.getByRole("img", { name: "Duplicate charge, 84 dollars" }),
  ).toHaveText("$84");
});

test("TierBadge shows all four labels", async ({ page }) => {
  await page.goto("/design");
  for (const label of [
    "Confirmed from your bill",
    "Billing rule",
    "Hospital's published price",
    "Estimate",
  ]) {
    await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
  }
});
