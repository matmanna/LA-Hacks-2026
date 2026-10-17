import { expect, test } from "@playwright/test";

import { expectNoA11yViolations } from "./a11y";

test("approval sheet shows the exact text and does not focus Approve", async ({
  page,
}, testInfo) => {
  await page.goto("/design");
  await page.getByRole("button", { name: "Open approval sheet" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Review before we send")).toBeVisible();
  await expect(
    dialog.getByText(/appears twice on the same date/),
  ).toBeVisible();
  await expect(
    dialog.getByText(/Nothing is sent until you tap Approve\./),
  ).toBeVisible();
  const approveFocused = await page.evaluate(
    () =>
      document.activeElement?.textContent?.includes("Approve and send") ??
      false,
  );
  expect(approveFocused).toBe(false);
  await expectNoA11yViolations(page);
  await page.screenshot({
    path: `design/screens/approval-${testInfo.project.name}.png`,
  });
  await dialog.getByRole("button", { name: "Not now" }).click();
  await expect(dialog).toBeHidden();
});

test("account prompt copy", async ({ page }) => {
  await page.goto("/design");
  await page.getByRole("button", { name: "Open account prompt" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByText("Save your case to continue")).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Create account" }),
  ).toBeVisible();
  await expectNoA11yViolations(page);
});
