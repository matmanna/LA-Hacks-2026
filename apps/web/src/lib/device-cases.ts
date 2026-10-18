const KEY = "bb.cases.v1";

function read(storage: Storage): string[] {
  try {
    const value: unknown = JSON.parse(storage.getItem(KEY) ?? "[]");
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

export function rememberDeviceCase(
  caseId: string,
  storage: Storage = localStorage,
) {
  storage.setItem(KEY, JSON.stringify([caseId, ...read(storage)]));
}

// Cases are already stored remotely before sign-in. Claiming attaches the
// device's case ids to the verified account so every signed-in device sees them.
export async function claimDeviceCases(
  claim: (caseId: string) => Promise<unknown>,
  storage: Storage = localStorage,
) {
  const ids = [...new Set(read(storage))];
  const failed: string[] = [];
  for (const caseId of ids) {
    try {
      await claim(caseId);
    } catch {
      failed.push(caseId);
    }
  }
  storage.setItem(KEY, JSON.stringify(failed));
  if (failed.length > 0) {
    throw new Error("Signed in, but some bills could not be synced.");
  }
}
