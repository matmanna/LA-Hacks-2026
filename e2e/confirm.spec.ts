import { expect, test } from "@playwright/test";

import { expectNoA11yViolations } from "./a11y";

test("edit a line, then Looks right runs the audit and opens the case", async ({
  page,
}, testInfo) => {
  await page.goto("/case/case-demo/confirm");
  await expect(
    page.getByRole("heading", { name: "Check what we read" }),
  ).toBeVisible();
  await expect(page.getByText(/Lines add up to the bill total/)).toBeVisible();
  await expectNoA11yViolations(page);
  await page.screenshot({
    path: `design/screens/confirm-${testInfo.project.name}.png`,
  });

  await page
    .getByRole("button", { name: /^Edit line/ })
    .first()
    .click();
  await page.getByLabel("Description").fill("CBC with differential");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("CBC with differential").first()).toBeVisible();

  await page.getByRole("button", { name: "Looks right" }).click();
  await expect(page).toHaveURL(/\/case\/case-demo$/);
});
