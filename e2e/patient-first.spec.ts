import { expect, test } from "@playwright/test";

import { bill, line } from "../packages/core/src/__fixtures__/golden";
import { balanceSummary } from "../packages/core/src/balance";
import { buildCallVars } from "../packages/core/src/call";
import { renderConferenceScript } from "../packages/core/src/conference";
import { computeSavings } from "../packages/core/src/savings";

const caseId = "patient-first-ui-test";
const actionId = "patient-first-action";
const testBill = bill([line({ id: "line-1" })]);
const savings = computeSavings([], testBill, []);
const action = {
  id: actionId,
  caseId,
  kind: "call",
  recipient: "+13105550100",
  draft: renderConferenceScript(
    {
      ...buildCallVars(testBill, [], true),
      hospital_name: testBill.hospital.name,
      account_last4: "0000",
      disputed_items: "Test review item",
      ask: "Please review this item.",
    },
    "+13105550100",
    "+13105550101",
  ),
  approvedAt: "2026-10-17T20:00:00Z",
  sentAt: null,
  outcome: null,
};
const detail = {
  case: { id: caseId, status: "audited" },
  bill: testBill,
  eob: null,
  audit: {
    flags: [],
    savings,
    balance: balanceSummary(testBill.totals.dueCents, savings),
  },
  actions: [action],
};

test("browser choice shows its own script and denied microphone never starts a call", async ({
  page,
}, testInfo) => {
  let starts = 0;
  let approvals = 0;
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      throw new DOMException("Denied", "NotAllowedError");
    };
  });
  await page.route("**/api/rpc/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/case/get"))
      return route.fulfill({ json: { json: detail } });
    if (path.endsWith("/action/draftLetter")) {
      expect(route.request().postDataJSON().json.patientConnection).toBe(
        "browser",
      );
      return route.fulfill({
        json: {
          json: {
            action: {
              ...action,
              approvedAt: null,
              draft: renderConferenceScript(
                {
                  ...buildCallVars(testBill, [], true),
                  hospital_name: "Example",
                  account_last4: "0000",
                  disputed_items: "Test",
                  ask: "Review",
                },
                action.recipient,
                "",
                "browser",
              ),
            },
            draftHash: "browser-hash",
            claims: [],
            usedFallback: false,
          },
        },
      });
    }
    if (path.endsWith("/call/start")) starts++;
    if (path.endsWith("/action/approve")) approvals++;
    return route.abort();
  });
  await page.goto(`/case/${caseId}`);
  await page
    .getByRole("button", { name: "Call for me" })
    .locator("visible=true")
    .click();
  await page.screenshot({
    path: `test-results/browser-choice-${testInfo.project.name}.png`,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "Join in this browser", exact: true })
    .click();
  await expect(page.getByText(/You in your browser, then/)).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Call script" })).toHaveValue(
    /Join in your browser/,
  );
  await page.getByRole("checkbox").check();
  await page.screenshot({
    path: `test-results/browser-approval-${testInfo.project.name}.png`,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Approve and call" }).click();
  await expect(page.getByText(/Allow microphone access to join/)).toBeVisible();
  expect(starts).toBe(0);
  expect(approvals).toBe(0);
});

test("patient-first review explains automatic connection and cancel never dials", async ({
  page,
}, testInfo) => {
  let dialRequests = 0;
  let cancelled = false;
  await page.route("**/api/rpc/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown;
    if (path.endsWith("/case/get")) data = detail;
    else if (path.endsWith("/action/draftLetter"))
      data = {
        action: { ...action, approvedAt: null },
        draftHash: "test-hash",
        claims: [],
        usedFallback: false,
      };
    else if (path.endsWith("/action/approve")) {
      expect(route.request().postDataJSON().json.cancel).toBe(true);
      cancelled = true;
      data = {};
    } else {
      if (path.endsWith("/call/start")) dialRequests++;
      return route.abort();
    }
    await route.fulfill({ json: { json: data } });
  });
  await page.goto(`/case/${caseId}`);
  await page
    .getByRole("button", { name: "Call for me" })
    .locator("visible=true")
    .click();
  await page
    .getByRole("button", { name: "Call my phone", exact: true })
    .click();
  const dialog = page.getByRole("dialog");
  await expect(
    dialog.getByText(
      "Your phone ending 0101 first, then the billing test phone ending 0100",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(dialog.getByText(/connect billing automatically/)).toBeVisible();
  await expect(
    dialog.getByRole("textbox", { name: "Call script" }),
  ).toHaveValue(action.draft);
  await expect(
    dialog.getByRole("textbox", { name: "Call script" }),
  ).not.toHaveValue(/press 1/i);
  await expect(
    dialog.getByText("What we'll discuss", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByText(/Fictional demo patient name and date of birth/),
  ).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Approve and call" }),
  ).toBeDisabled();
  await dialog.getByRole("checkbox").check();
  await expect(
    dialog.getByRole("button", { name: "Approve and call" }),
  ).toBeEnabled();
  await page.screenshot({
    path: `test-results/patient-first-approval-${testInfo.project.name}.png`,
  });
  await dialog.getByRole("button", { name: "Not now" }).click();
  await expect.poll(() => cancelled).toBe(true);
  expect(dialRequests).toBe(0);
});

for (const connected of [false, true]) {
  test(`failed call is labelled correctly when billing connected=${connected}`, async ({
    page,
  }, testInfo) => {
    await page.route("**/api/rpc/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      const data = path.endsWith("/case/get")
        ? detail
        : path.endsWith("/call/status")
          ? { status: "failed", transcript: null, outcome: null }
          : path.endsWith("/event/list")
            ? connected
              ? [
                  {
                    id: `voice:${actionId}:billing_connected`,
                    at: action.approvedAt,
                    actor: "system",
                    type: "call.billing_connected",
                    summary: "Billing phone connected",
                  },
                ]
              : []
            : undefined;
      if (data === undefined) return route.abort();
      await route.fulfill({ json: { json: data } });
    });
    await page.goto(`/case/${caseId}/activity`);
    await expect(
      page.getByText(connected ? "Call ended early" : "Call didn't connect", {
        exact: true,
      }),
    ).toBeVisible();
    if (connected) {
      await expect(
        page.getByText("Call didn't connect", { exact: true }),
      ).toHaveCount(0);
      await page.screenshot({
        path: `test-results/patient-first-activity-${testInfo.project.name}.png`,
      });
    }
  });
}

test("terminal call refreshes events that were stale during the last poll", async ({
  page,
}) => {
  let eventReads = 0;
  await page.route("**/api/rpc/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    let data: unknown;
    if (path.endsWith("/case/get")) data = detail;
    else if (path.endsWith("/call/status"))
      data = { status: "failed", transcript: null, outcome: null };
    else if (path.endsWith("/event/list")) {
      eventReads++;
      data =
        eventReads === 1
          ? []
          : [
              {
                id: `voice:${actionId}:billing_connected`,
                at: action.approvedAt,
                actor: "system",
                type: "call.billing_connected",
                summary: "Billing phone connected",
              },
            ];
    } else return route.abort();
    await route.fulfill({ json: { json: data } });
  });
  await page.goto(`/case/${caseId}/activity`);
  await expect(
    page.getByText("Call ended early", { exact: true }),
  ).toBeVisible();
  expect(eventReads).toBeGreaterThanOrEqual(2);
  await expect(
    page.getByText("Call didn't connect", { exact: true }),
  ).toHaveCount(0);
});
