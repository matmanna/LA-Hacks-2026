import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

import { loadMyInfo } from "./my-info";

type NotificationsModule = typeof import("expo-notifications");

// Loaded on first use, and never in Expo Go: there the module's native part
// is missing, so importing it logs errors on every launch. Development and
// release builds have it.
let loaded: NotificationsModule | null | undefined;
function notifications(): NotificationsModule | null {
  if (loaded !== undefined) return loaded;
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    loaded = null;
    return loaded;
  }
  try {
    loaded = require("expo-notifications") as NotificationsModule;
  } catch {
    loaded = null;
  }
  return loaded;
}

// A local reminder when a policy lookup should be done. The app can't run in
// the background in Expo Go, so it's scheduled when the lookup starts (about
// 2.5 minutes out) and cancelled if the app sees the result first.
const AFTER_SECONDS = 150;
const scheduled = new Map<string, string>();

export async function remindWhenLookupReady(caseId: string, hospital: string) {
  if (Platform.OS === "web" || scheduled.has(caseId)) return;
  const Notifications = notifications();
  if (!Notifications) return;
  const { notifyLookups } = await loadMyInfo();
  if (notifyLookups === false) return;
  try {
    const perm = await Notifications.getPermissionsAsync();
    const granted =
      perm.granted || (await Notifications.requestPermissionsAsync()).granted;
    if (!granted) return;
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: "BetterBill",
        body: `${hospital}'s assistance policy should be ready. Tap to see if you may qualify.`,
        data: { caseId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: AFTER_SECONDS,
      },
    });
    scheduled.set(caseId, id);
  } catch {
    // Notifications are a nice-to-have: the bill page shows progress anyway.
  }
}

export async function cancelLookupReminder(caseId: string) {
  const id = scheduled.get(caseId);
  const Notifications = notifications();
  if (!id || !Notifications || Platform.OS === "web") return;
  scheduled.delete(caseId);
  try {
    await Notifications.cancelScheduledNotificationAsync(id);
  } catch {
    // Already delivered or gone.
  }
}

// Tapping the reminder opens that bill.
export function onReminderTap(open: (caseId: string) => void) {
  const Notifications = notifications();
  if (!Notifications || Platform.OS === "web") return () => {};
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  const sub = Notifications.addNotificationResponseReceivedListener((r) => {
    const caseId = r.notification.request.content.data?.caseId;
    if (typeof caseId === "string") open(caseId);
  });
  return () => sub.remove();
}
