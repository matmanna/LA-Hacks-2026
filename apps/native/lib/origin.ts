import * as Location from "expo-location";
import { useEffect, useSyncExternalStore } from "react";
import { Platform } from "react-native";

// Where distances are measured from, shared by the Prices screens. The
// phone's location is rounded to about 100 m before it leaves the phone.
export type Origin = {
  lat: number;
  lng: number;
  here: boolean;
  // "90048", "you" or "downtown Los Angeles", after "Near".
  label: string;
};

const DOWNTOWN: Origin = {
  lat: 34.0522,
  lng: -118.2437,
  here: false,
  label: "downtown Los Angeles",
};

const web = Platform.OS === "web";
let state: Origin | null = web ? DOWNTOWN : null;
let started = false;
const subs = new Set<() => void>();

function set(next: Origin | null) {
  state = next;
  for (const f of subs) f();
}

// Resolves to null if the promise takes longer than ms (GPS and reverse
// geocoding can hang on a phone; the screen must never wait forever).
function within<T>(ms: number, p: Promise<T>): Promise<T | null> {
  return Promise.race([
    p,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

// The last place the phone reported, kept so switching back is instant.
let lastHere: Origin | null = null;

async function locate() {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return set(DOWNTOWN);
    const pos =
      (await within(3000, Location.getLastKnownPositionAsync())) ??
      (await within(
        8000,
        Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }),
      ));
    if (!pos) return set(lastHere ?? DOWNTOWN);
    const round = (n: number) => Math.round(n * 1000) / 1000;
    const lat = round(pos.coords.latitude);
    const lng = round(pos.coords.longitude);
    let zip: string | null = null;
    try {
      const [place] =
        (await within(
          4000,
          Location.reverseGeocodeAsync({ latitude: lat, longitude: lng }),
        )) ?? [];
      zip = place?.postalCode ?? null;
    } catch {
      zip = null;
    }
    lastHere = { lat, lng, here: true, label: zip ?? "you" };
    set(lastHere);
  } catch {
    set(lastHere ?? DOWNTOWN);
  }
}

const subscribe = (f: () => void) => {
  subs.add(f);
  return () => {
    subs.delete(f);
  };
};

export function useOrigin(): Origin | null {
  const origin = useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  );
  useEffect(() => {
    if (web || started) return;
    started = true;
    void locate();
  }, []);
  return origin;
}

// "Change": from the phone's location to downtown Los Angeles and back.
export const canChangeOrigin = !web;
export function changeOrigin() {
  if (web) return;
  if (state?.here) return set(DOWNTOWN);
  // Back to the phone's location: show the last one at once (the map keeps
  // its hospitals), then refresh it in the background.
  if (lastHere) set(lastHere);
  void locate();
}
