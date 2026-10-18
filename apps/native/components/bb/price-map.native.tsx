import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { Money } from "./money";
import { PIN_STEP_MS, type PriceMapProps } from "./price-map-shared";
import { T } from "./t";

// Phone only (Price A): the patient's spot pulses while we check, then a
// price tag per hospital pops in one by one, the lowest published cash price
// in mint and the highest in coral. Rows arrive ranked from the server.
export function PriceMap({
  rows,
  origin,
  here,
  onSelect,
  insets = { top: 56, bottom: 32 },
}: PriceMapProps) {
  const map = useRef<MapView>(null);
  const reduced = useReducedMotion();
  const [shown, setShown] = useState(0);
  const key = rows.map((r) => r.hospitalKey).join();

  // biome-ignore lint/correctness/useExhaustiveDependencies: refit when the hospitals or the free area change
  useEffect(() => {
    if (rows.length === 0) return;
    map.current?.fitToCoordinates(
      [
        ...rows.map((r) => ({ latitude: r.lat, longitude: r.lng })),
        { latitude: origin.lat, longitude: origin.lng },
      ],
      {
        edgePadding: {
          top: insets.top,
          right: 48,
          bottom: insets.bottom,
          left: 48,
        },
        animated: !reduced,
      },
    );
  }, [key, insets.top, insets.bottom, reduced]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: replay when the hospitals change
  useEffect(() => {
    if (rows.length === 0) return;
    if (reduced) {
      setShown(rows.length);
      return;
    }
    setShown(0);
    const timer = setInterval(
      () =>
        setShown((n) => {
          if (n + 1 >= rows.length) clearInterval(timer);
          return n + 1;
        }),
      PIN_STEP_MS,
    );
    return () => clearInterval(timer);
  }, [key, reduced]);

  return (
    <MapView
      ref={map}
      style={{ flex: 1 }}
      initialRegion={{
        latitude: origin.lat,
        longitude: origin.lng,
        latitudeDelta: 0.35,
        longitudeDelta: 0.35,
      }}
      showsPointsOfInterests={false}
      toolbarEnabled={false}
      accessibilityLabel="Map of nearby hospitals and their published cash prices"
    >
      <Marker
        coordinate={{ latitude: origin.lat, longitude: origin.lng }}
        title={here ? "You are here" : "Downtown Los Angeles"}
        anchor={{ x: 0.5, y: 0.5 }}
      >
        <Here checking={rows.length === 0} />
      </Marker>
      {rows.slice(0, shown).map((r) => {
        const lowest = r.rank === 1;
        const highest = !lowest && r.shareOfHighest === 1;
        const bg = lowest ? "bg-mint" : highest ? "bg-coral-soft" : "bg-white";
        return (
          <Marker
            key={r.hospitalKey}
            coordinate={{ latitude: r.lat, longitude: r.lng }}
            anchor={{ x: 0.5, y: 1 }}
            onPress={() => onSelect?.(r.hospitalKey)}
            accessibilityLabel={r.hospitalName}
          >
            <View className="items-center">
              {lowest ? (
                <View className="mb-1 rounded-full bg-ink px-2 py-1">
                  <T weight="semibold" className="text-[11px] text-white">
                    Lowest near you
                  </T>
                </View>
              ) : null}
              <View
                className={`h-[30px] justify-center rounded-full px-2.5 ${bg}`}
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
                    className={
                      lowest
                        ? "text-white"
                        : highest
                          ? "text-coral-ink"
                          : "text-foreground"
                    }
                    label={r.hospitalName}
                  />
                )}
              </View>
              <View
                className={`-mt-1.5 size-2.5 rotate-45 rounded-[2px] ${bg}`}
              />
            </View>
          </Marker>
        );
      })}
    </MapView>
  );
}

// The blue dot for where distances are measured from, with rings that pulse
// while hospitals are being checked (none under reduce motion).
function Here({ checking }: { checking: boolean }) {
  const reduced = useReducedMotion();
  const a = useSharedValue(0);
  const b = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    const loops = checking ? -1 : 2;
    const ring = (delay: number) =>
      withDelay(
        delay,
        withRepeat(
          withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }),
          loops,
          false,
        ),
      );
    a.value = 0;
    b.value = 0;
    a.value = ring(0);
    b.value = ring(500);
    return () => {
      cancelAnimation(a);
      cancelAnimation(b);
    };
  }, [checking, reduced, a, b]);
  const ringA = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - a.value),
    transform: [{ scale: 1 + a.value * 5 }],
  }));
  const ringB = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - b.value),
    transform: [{ scale: 1 + b.value * 5 }],
  }));
  return (
    <View className="size-[120px] items-center justify-center">
      {reduced ? null : (
        <>
          <Animated.View
            className="absolute size-[22px] rounded-full border-[1.5px] border-accent"
            style={ringA}
          />
          <Animated.View
            className="absolute size-[22px] rounded-full border-[1.5px] border-accent"
            style={ringB}
          />
        </>
      )}
      <View
        className="size-4 rounded-full border-[3px] border-white bg-accent"
        style={{
          shadowColor: "#1E4ED8",
          shadowOpacity: 0.3,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 0 },
        }}
      />
    </View>
  );
}
