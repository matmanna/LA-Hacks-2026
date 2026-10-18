import AsyncStorage from "@react-native-async-storage/async-storage";

// First-run welcome cards. The flag lives only on this phone: unset means the
// root layout opens /welcome instead of the Bills tab.
export const INTRO_KEY = "bb.introSeen";

export async function hasSeenIntro(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(INTRO_KEY)) === "1";
  } catch {
    // If storage is unavailable, do not trap the user on the intro.
    return true;
  }
}

export async function markIntroSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(INTRO_KEY, "1");
  } catch {
    // Best effort: the cards show again next launch.
  }
}

// Account tab "Show the intro again": clears the flag so the next launch
// starts on the cards too.
export async function resetIntro(): Promise<void> {
  try {
    await AsyncStorage.removeItem(INTRO_KEY);
  } catch {
    // Best effort.
  }
}
