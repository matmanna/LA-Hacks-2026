// Full letter flow through the real app and API (ticket A-10). Run it against a
// server started with BB_FAKE_PROVIDERS=1 and EMAIL_TEST_INBOX listed in
// EMAIL_ALLOWLIST, so nothing real is sent.
import { expect, test } from "@playwright/test";

test("a letter goes out only after approval, and cancel sends nothing", async ({
  page,
}) => {
  await page.goto("/check");
  await page.getByRole("button", { name: "Try a sample bill" }).click();
  await page.getByRole("button", { name: "Looks right" }).click();
  await expect(page).toHaveURL(/\/case\/[^/]+$/);

  const send = page
    .getByRole("button", { name: "Send the letter" })
    .locator("visible=true")
    .first();
  const dialog = page.getByRole("dialog");

  await send.click();
  await expect(dialog.getByText("Review before we send")).toBeVisible({
    timeout: 20_000,
  });
  await expect(
    dialog.getByRole("textbox", { name: "Letter text" }),
  ).toHaveValue(/Prepared with BetterBill/);
  for (const name of ["Approve and send", "Not now"]) {
    const box = await dialog.getByRole("button", { name }).boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }

  await dialog.getByRole("button", { name: "Not now" }).click();
  await expect(page.getByText("Cancelled. Nothing was sent.")).toBeVisible();

  await send.click();
  await expect(dialog.getByText("Review before we send")).toBeVisible({
    timeout: 20_000,
  });
  await dialog.getByRole("button", { name: "Approve and send" }).click();
  await expect(page.getByText("Sent to the test inbox.")).toBeVisible();

  await page.goto(`${page.url()}/activity`);
  await expect(page.getByText("You cancelled it").first()).toBeVisible();
  await expect(page.getByText("You approved the letter").first()).toBeVisible();
  await expect(
    page.getByText(/Letter sent to the test inbox/).first(),
  ).toBeVisible();
});
