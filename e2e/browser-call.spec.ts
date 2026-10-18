import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { AccessToken, RoomServiceClient } from "livekit-server-sdk";
import { bill, line } from "../packages/core/src/__fixtures__/golden";
import { balanceSummary } from "../packages/core/src/balance";
import { buildCallVars } from "../packages/core/src/call";
import { renderConferenceScript } from "../packages/core/src/conference";
import { computeSavings } from "../packages/core/src/savings";

test("browser microphone, both remote voices, mute and hangup work without dialing phones", async ({
  page,
}, info) => {
  test.skip(
    process.env.BROWSER_RTC_TEST !== "1" || info.project.name !== "desktop",
    "Optional LiveKit room-only test; no phone calls or agent dispatch",
  );
  const url = process.env.LIVEKIT_URL;
  const key = process.env.LIVEKIT_API_KEY;
  const secret = process.env.LIVEKIT_API_SECRET;
  if (!url || !key || !secret)
    throw new Error("Missing test LiveKit configuration");
  const rooms = new RoomServiceClient(url.replace(/^ws/, "http"), key, secret);
  const roomName = `browser-ui-test-${crypto.randomUUID()}`;
  const caseId = "browser-call-test";
  const testBill = bill([line({ id: "l1" })]);
  const savings = computeSavings([], testBill, []);
  const action = {
    id: "browser-test-action",
    caseId,
    kind: "call",
    recipient: "+15555550100",
    draft: renderConferenceScript(
      {
        ...buildCallVars(testBill, [], true),
        hospital_name: "Example",
        account_last4: "0000",
        disputed_items: "Test",
        ask: "Review",
      },
      "+15555550100",
      "",
      "browser",
    ),
    approvedAt: null,
    sentAt: null,
    outcome: null,
  };
  const tokenFor = async (identity: string) => {
    const token = new AccessToken(key, secret, { identity, ttl: "2m" });
    token.addGrant({
      roomJoin: true,
      room: roomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: false,
    });
    return token.toJwt();
  };
  let starts = 0;
  await rooms.createRoom({
    name: roomName,
    emptyTimeout: 30,
    maxParticipants: 3,
  });
  try {
    await page.route("**/api/rpc/**", async (route) => {
      const path = new URL(route.request().url()).pathname;
      let data: unknown;
      if (path.endsWith("/case/get"))
        data = {
          case: { id: caseId, status: "audited" },
          bill: testBill,
          eob: null,
          audit: {
            flags: [],
            savings,
            balance: balanceSummary(testBill.totals.dueCents, savings),
          },
          actions: [],
        };
      else if (path.endsWith("/action/draftLetter"))
        data = {
          action,
          draftHash: "test-hash",
          claims: [],
          usedFallback: false,
        };
      else if (path.endsWith("/action/approve")) data = action;
      else if (path.endsWith("/call/start")) {
        starts++;
        data = {
          callId: "call-browser-test-action",
          status: "ringing",
          browserSession: { serverUrl: url, token: await tokenFor("patient") },
        };
      } else return route.abort();
      await route.fulfill({ json: { json: data } });
    });
    await page.goto(`/case/${caseId}`);
    await page
      .getByRole("button", { name: "Call for me" })
      .locator("visible=true")
      .click();
    await page
      .getByRole("button", { name: "Join in this browser", exact: true })
      .click();
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Approve and call" }).click();
    await expect(
      page.getByRole("heading", { name: "Your browser call" }),
    ).toBeVisible();
    await expect
      .poll(
        async () =>
          (await rooms.listParticipants(roomName)).find(
            (p) => p.identity === "patient",
          )?.tracks.length,
      )
      .toBe(1);
    const peerCode = await readFile("tmp/browser-peer.js", "utf8");
    await page.addScriptTag({ content: peerCode });
    for (const identity of ["hospital", "advocate"]) {
      await page.evaluate(
        async ({ url, token }) => {
          await (
            window as unknown as {
              connectTestPeer: (url: string, token: string) => Promise<void>;
            }
          ).connectTestPeer(url, token);
        },
        { url, token: await tokenFor(identity) },
      );
    }
    await expect(page.locator("audio")).toHaveCount(2);
    await expect
      .poll(() =>
        page
          .locator("audio")
          .evaluateAll((elements) =>
            elements.every(
              (element) => (element as HTMLAudioElement).currentTime > 0,
            ),
          ),
      )
      .toBe(true);
    await page
      .getByRole("button", { name: "Mute microphone", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (await rooms.listParticipants(roomName)).find(
            (p) => p.identity === "patient",
          )?.tracks[0]?.muted,
      )
      .toBe(true);
    await page
      .getByRole("button", { name: "Unmute microphone", exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (await rooms.listParticipants(roomName)).find(
            (p) => p.identity === "patient",
          )?.tracks[0]?.muted,
      )
      .toBe(false);
    await page.screenshot({
      path: "test-results/browser-connected-desktop.png",
    });
    await page.getByRole("button", { name: "End call", exact: true }).click();
    await expect
      .poll(async () =>
        (await rooms.listParticipants(roomName)).some(
          (p) => p.identity === "patient",
        ),
      )
      .toBe(false);
    expect(starts).toBe(1);
  } finally {
    await rooms.deleteRoom(roomName);
  }
});
