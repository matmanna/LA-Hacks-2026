import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

// Prices the patient saved from a hospital page. Kept on this phone only.
const KEY = "bb.prices.saved.v1";

export type SavedPrice = {
  hospitalKey: string;
  hospitalName: string;
  code: string;
  serviceName: string;
  cashCents: number | null;
  capturedAt: string;
  savedAt: string;
};

export async function loadSavedPrices(): Promise<SavedPrice[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as SavedPrice[]) : [];
  } catch {
    return [];
  }
}

const same = (a: SavedPrice, key: string, code: string) =>
  a.hospitalKey === key && a.code === code;

// Saves the price, or removes it when it is already saved.
export async function toggleSavedPrice(entry: SavedPrice) {
  const saved = await loadSavedPrices();
  const has = saved.some((s) => same(s, entry.hospitalKey, entry.code));
  const next = has
    ? saved.filter((s) => !same(s, entry.hospitalKey, entry.code))
    : [entry, ...saved];
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function useSavedPrices() {
  const [saved, setSaved] = useState<SavedPrice[]>([]);
  useFocusEffect(
    useCallback(() => {
      void loadSavedPrices().then(setSaved);
    }, []),
  );
  return [saved, setSaved] as const;
}

export function isSaved(saved: SavedPrice[], key: string, code: string) {
  return saved.some((s) => same(s, key, code));
}
