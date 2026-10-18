import AsyncStorage from "@react-native-async-storage/async-storage";
import { useCallback, useEffect, useState } from "react";

// "Your info" from the Account tab. Saved only on this phone: the app sends
// an income range for a bill, never this number.
const KEY = "bb.myinfo.v1";

export type Insurance = "none" | "medicare" | "medicaid" | "private";

export type MyInfo = {
  householdSize?: number;
  insurance?: Insurance;
  incomeCents?: number;
  notifyLookups?: boolean;
};

export async function loadMyInfo(): Promise<MyInfo> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as MyInfo) : {};
  } catch {
    return {};
  }
}

export async function saveMyInfo(patch: Partial<MyInfo>): Promise<MyInfo> {
  const next = { ...(await loadMyInfo()), ...patch };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

// Clears the answers, keeps the notification choice.
export async function clearMyInfo(): Promise<MyInfo> {
  const { notifyLookups } = await loadMyInfo();
  const next = notifyLookups === undefined ? {} : { notifyLookups };
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function useMyInfo() {
  const [info, setInfo] = useState<MyInfo | null>(null);
  useEffect(() => {
    void loadMyInfo().then(setInfo);
  }, []);
  const update = useCallback(async (patch: Partial<MyInfo>) => {
    setInfo(await saveMyInfo(patch));
  }, []);
  const clear = useCallback(async () => {
    setInfo(await clearMyInfo());
  }, []);
  return { info, update, clear };
}
