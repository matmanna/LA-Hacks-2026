import { TokenVerifier } from "livekit-server-sdk";
import { afterEach, expect, it, vi } from "vitest";
import { browserPatientSession } from "./livekit";

afterEach(() => vi.unstubAllEnvs());

it("grants a short-lived microphone-only patient token for exactly one room", async () => {
  vi.stubEnv("LIVEKIT_URL", "wss://test.livekit.cloud");
  vi.stubEnv("LIVEKIT_API_KEY", "test-key");
  vi.stubEnv("LIVEKIT_API_SECRET", "test-secret-long-enough-for-signing");
  const session = await browserPatientSession("bb-approved-action");
  const claims = await new TokenVerifier(
    "test-key",
    "test-secret-long-enough-for-signing",
  ).verify(session.token);
  expect(claims.sub).toBe("patient");
  expect(claims.video).toEqual({
    roomJoin: true,
    room: "bb-approved-action",
    canSubscribe: true,
    canPublish: true,
    canPublishSources: ["microphone"],
    canPublishData: false,
    canUpdateOwnMetadata: false,
  });
  expect((claims.exp ?? 0) - Math.floor(Date.now() / 1000)).toBeLessThanOrEqual(
    120,
  );
  expect(session.serverUrl).toBe("wss://test.livekit.cloud");
});
