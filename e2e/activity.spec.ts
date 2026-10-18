import { expect, test } from "@playwright/test";

import { expectNoA11yViolations } from "./a11y";

test("activity timeline lists done events with spoken state", async ({
  page,
}, testInfo) => {
  await page.goto("/case/case-demo/activity");
  await expect(
    page.getByRole("heading", { name: "Your case activity" }),
  ).toBeVisible();
  const list = page.getByRole("list", { name: "Case activity" });
  await expect(list.getByText("Done:").first()).toBeAttached();
  await expect(list.getByRole("listitem")).toHaveCount(2);
  await expectNoA11yViolations(page);
  await page.screenshot({
    path: `design/screens/activity-${testInfo.project.name}.png`,
  });
});

test("call transcript card shows the outcome", async ({ page }) => {
  await page.goto("/design", { waitUntil: "networkidle" });
  await expect(page.getByText("Reference number")).toBeVisible();
  await expect(page.getByText("Recorded call, labelled")).toBeVisible();
});
