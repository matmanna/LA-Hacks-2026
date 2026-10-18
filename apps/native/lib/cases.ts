import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

// Cases created on this phone. The server's case.list needs an account,
// so the app keeps its own list of case ids until sign in exists.
const KEY = "bb.cases.v1";

export type SavedCase = { id: string; createdAt: string; label: string };

export async function loadCases(): Promise<SavedCase[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedCase[]) : [];
  } catch {
    return [];
  }
}

export async function saveCase(entry: SavedCase) {
  const cases = await loadCases();
  const next = [entry, ...cases.filter((c) => c.id !== entry.id)];
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
}

export async function forgetCase(id: string) {
  const cases = await loadCases();
  await AsyncStorage.setItem(
    KEY,
    JSON.stringify(cases.filter((c) => c.id !== id)),
  );
}

// Undefined while the on-device case list is loading; otherwise whether this
// phone started the case from a synthetic sample bill.
export function useSampleCase(id: string) {
  const [sample, setSample] = useState<boolean | undefined>(undefined);
  useEffect(() => {
    setSample(undefined);
    void loadCases().then((cases) =>
      setSample(
        cases.some((c) => c.id === id && c.label.startsWith("Sample bill")),
      ),
    );
  }, [id]);
  return sample;
}

// Most screens only need a display hint, so they can treat a loading value as
// false. Call-start screens use useSampleCase so they never lose the sample
// flow while storage is resolving.
export function useIsSample(id: string) {
  return useSampleCase(id) ?? false;
}
