import { describe, expect, it } from "vitest";

import { claimDeviceCases, rememberDeviceCase } from "./device-cases";

function memoryStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe("device case sync", () => {
  it("claims remembered cases once and clears them after success", async () => {
    const storage = memoryStorage();
    rememberDeviceCase("case-1", storage);
    rememberDeviceCase("case-2", storage);
    rememberDeviceCase("case-1", storage);
    const claimed: string[] = [];

    await claimDeviceCases(async (caseId) => claimed.push(caseId), storage);

    expect(claimed).toEqual(["case-1", "case-2"]);
    await claimDeviceCases(async (caseId) => claimed.push(caseId), storage);
    expect(claimed).toEqual(["case-1", "case-2"]);
  });

  it("keeps failed cases so a later sign-in can retry them", async () => {
    const storage = memoryStorage();
    rememberDeviceCase("case-1", storage);
    rememberDeviceCase("case-2", storage);

    await expect(
      claimDeviceCases(async (caseId) => {
        if (caseId === "case-2") throw new Error("offline");
      }, storage),
    ).rejects.toThrow("some bills could not be synced");

    const retried: string[] = [];
    await claimDeviceCases(async (caseId) => retried.push(caseId), storage);
    expect(retried).toEqual(["case-2"]);
  });
});
