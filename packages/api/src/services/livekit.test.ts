import { afterEach, beforeEach, expect, it, vi } from "vitest";

const sdk = vi.hoisted(() => ({
  createRoom: vi.fn(),
  deleteRoom: vi.fn(),
  createDispatch: vi.fn(),
  listParticipants: vi.fn(),
}));
vi.mock("livekit-server-sdk", () => ({
  JobRestartPolicy: { JRP_NEVER: 1 },
  RoomServiceClient: class {
    createRoom = sdk.createRoom;
    deleteRoom = sdk.deleteRoom;
    listParticipants = sdk.listParticipants;
  },
  AgentDispatchClient: class {
    createDispatch = sdk.createDispatch;
  },
}));

import {
  closeConference,
  dispatchConference,
  patientIsPresent,
} from "./livekit";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("LIVEKIT_URL", "wss://test.livekit.cloud");
  vi.stubEnv("LIVEKIT_API_KEY", "test-key");
  vi.stubEnv("LIVEKIT_API_SECRET", "test-secret");
  sdk.createRoom.mockResolvedValue({});
  sdk.deleteRoom.mockResolvedValue(undefined);
  sdk.createDispatch.mockResolvedValue({ id: "AD_test" });
});

it("dispatches a private room using only opaque action/session metadata", async () => {
  await expect(
    dispatchConference({ actionId: "a1", roomName: "bb-a1" }),
  ).resolves.toEqual({ dispatchId: "AD_test" });
  expect(sdk.createRoom).toHaveBeenCalledWith(
    expect.objectContaining({ name: "bb-a1", maxParticipants: 3 }),
  );
  expect(sdk.createDispatch).toHaveBeenCalledWith(
    "bb-a1",
    "betterbill-patient-first",
    expect.objectContaining({
      metadata: JSON.stringify({
        actionId: "a1",
        roomName: "bb-a1",
        flowVersion: "patient-first-v1",
      }),
    }),
  );
});

it("cleans up an uncertain dispatch without retrying it", async () => {
  sdk.createDispatch.mockRejectedValue(new Error("timeout"));
  await expect(
    dispatchConference({ actionId: "a1", roomName: "bb-a1" }),
  ).rejects.toThrow("Conference dispatch failed");
  expect(sdk.deleteRoom).toHaveBeenCalledWith("bb-a1");
  expect(sdk.createDispatch).toHaveBeenCalledTimes(1);
});

it("reports incomplete cleanup without logging provider messages or credentials", async () => {
  const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  sdk.deleteRoom
    .mockRejectedValueOnce(new Error("provider secret"))
    .mockRejectedValueOnce({ code: "not_found" });
  await closeConference("bb-a1");
  expect(warn).toHaveBeenCalledWith("LiveKit room cleanup incomplete", {
    roomName: "bb-a1",
    failedRooms: 1,
  });
  expect(JSON.stringify(warn.mock.calls)).not.toContain("secret");
});

it("checks the exact patient identity and propagates an unavailable presence lookup", async () => {
  sdk.listParticipants
    .mockResolvedValueOnce([{ identity: "billing" }])
    .mockResolvedValueOnce([{ identity: "patient" }]);
  expect(await patientIsPresent("bb-a1")).toBe(false);
  expect(await patientIsPresent("bb-a1")).toBe(true);
  sdk.listParticipants.mockRejectedValue(new Error("timeout"));
  await expect(patientIsPresent("bb-a1")).rejects.toThrow("timeout");
});
