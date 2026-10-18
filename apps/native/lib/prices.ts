import { useQuery } from "@tanstack/react-query";

import { orpc } from "@/utils/orpc";

import { useOrigin } from "./origin";

// Published cash prices for one service near the patient, ranked and
// summarized by the server (price.nearby).
export function useNearby(code: string | undefined) {
  const origin = useOrigin();
  const query = useQuery(
    orpc.price.nearby.queryOptions({
      input: {
        code: code ?? "",
        lat: origin?.lat ?? 0,
        lng: origin?.lng ?? 0,
      },
      enabled: origin !== null && Boolean(code),
    }),
  );
  return { origin, ...query };
}

// Opens turn-by-turn directions in the phone's maps app.
export function directionsUrl(
  os: string,
  place: { address: string; lat: number; lng: number },
) {
  const q = encodeURIComponent(place.address);
  if (os === "ios") return `https://maps.apple.com/?daddr=${q}`;
  if (os === "android") return `geo:${place.lat},${place.lng}?q=${q}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${q}`;
}
