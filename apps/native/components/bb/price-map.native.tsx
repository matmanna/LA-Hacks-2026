import { useEffect, useRef } from "react";
import { View } from "react-native";
import MapView, { Callout, Marker } from "react-native-maps";

import { Money } from "./money";
import type { PriceMapProps } from "./price-map";
import { T } from "./t";

// Phone only: one price tag per hospital, the lowest published cash price in
// mint. Rows arrive ranked from the server; nothing is computed here.
export function PriceMap({ rows, origin, here }: PriceMapProps) {
  const map = useRef<MapView>(null);
  const points = [
    ...rows.map((r) => ({ latitude: r.lat, longitude: r.lng })),
    { latitude: origin.lat, longitude: origin.lng },
  ];
  const fit = () =>
    map.current?.fitToCoordinates(points, {
      edgePadding: { top: 56, right: 48, bottom: 32, left: 48 },
      animated: false,
    });
  const key = rows.map((r) => r.hospitalKey).join();
  // biome-ignore lint/correctness/useExhaustiveDependencies: refit when the hospitals change
  useEffect(() => {
    fit();
  }, [key]);

  return (
    <View className="h-[300px] overflow-hidden rounded-[20px] bg-wash">
      <MapView
        ref={map}
        style={{ flex: 1 }}
        onMapReady={fit}
        showsUserLocation={here}
        showsPointsOfInterests={false}
        toolbarEnabled={false}
        accessibilityLabel="Map of nearby hospitals and their published cash prices"
      >
        {here ? null : (
          <Marker
            coordinate={{ latitude: origin.lat, longitude: origin.lng }}
            title="Downtown Los Angeles"
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <View className="size-4 rounded-full border-[3px] border-white bg-accent" />
          </Marker>
        )}
        {rows.map((r, i) => {
          const lowest = i === 0 && r.discountedCashCents !== null;
          return (
            <Marker
              key={r.hospitalKey}
              coordinate={{ latitude: r.lat, longitude: r.lng }}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View className="items-center">
                <View
                  className={
                    lowest
                      ? "h-[30px] justify-center rounded-full bg-mint px-2.5"
                      : "h-[30px] justify-center rounded-full bg-white px-2.5"
                  }
                  style={{
                    shadowColor: "#0B1B2B",
                    shadowOpacity: 0.14,
                    shadowRadius: 8,
                    shadowOffset: { width: 0, height: 2 },
                  }}
                >
                  {r.discountedCashCents === null ? (
                    <T className="text-muted text-xs">No cash price</T>
                  ) : (
                    <Money
                      cents={r.discountedCashCents}
                      size={14}
                      weight="semibold"
                      className={lowest ? "text-white" : "text-foreground"}
                      label={r.hospitalName}
                    />
                  )}
                </View>
                <View
                  className={
                    lowest
                      ? "-mt-1.5 size-2.5 rotate-45 rounded-[2px] bg-mint"
                      : "-mt-1.5 size-2.5 rotate-45 rounded-[2px] bg-white"
                  }
                />
              </View>
              <Callout tooltip={false}>
                <View className="max-w-[220px] gap-0.5 p-1">
                  <T weight="semibold" className="text-sm">
                    {r.hospitalName}
                  </T>
                  <T className="text-muted text-xs">
                    {`${r.distanceMiles.toFixed(1)} mi · hospital's published cash price`}
                  </T>
                </View>
              </Callout>
            </Marker>
          );
        })}
      </MapView>
    </View>
  );
}
