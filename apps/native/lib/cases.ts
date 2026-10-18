import AsyncStorage from "@react-native-async-storage/async-storage";

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
