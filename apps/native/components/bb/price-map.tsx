import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
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

import { HospitalPin } from "./hospital-pin";
import { Money } from "./money";
import {
  LEVEL_COLORS,
  LEVEL_WORDS,
  PIN_STEP_MS,
  type PriceMapProps,
} from "./price-map-shared";
import { shortHospitalName } from "./short-name";
import { T } from "./t";

const PAD_X = 64;
const PIN_W = 140;
const PIN_H = 84;

// Web (phones use price-map.native.tsx): no map tiles, so each hospital sits
// on a plain background at its real position relative to the others (a flat
// projection of its latitude and longitude). No streets or place names.
// Same motion as the phone: the spot pulses while we check, then the price
// tags pop in one by one.
export function PriceMap({
  rows,
  origin,
  here,
  onSelect,
  insets = { top: 56, bottom: 32 },
  kind = "price",
}: PriceMapProps) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const key = rows.map((r) => r.hospitalKey).join();

  // Fit every hospital and the origin into the area the controls leave free.
  const points = [...rows, origin];
  const cos = Math.cos((origin.lat * Math.PI) / 180);
  const xs = points.map((p) => p.lng * cos);
  const ys = points.map((p) => -p.lat);
  const [minX, maxX] = [Math.min(...xs), Math.max(...xs)];
  const [minY, maxY] = [Math.min(...ys), Math.max(...ys)];
  const top = insets.top + 40;
  const boxW = Math.max(size.w - PAD_X * 2, 1);
  const boxH = Math.max(size.h - top - insets.bottom - 24, 1);
  const scale =
    rows.length === 0
      ? 0
      : Math.min(boxW / (maxX - minX || 1), boxH / (maxY - minY || 1));
  const place = (p: { lat: number; lng: number }) => ({
    x: size.w / 2 + (p.lng * cos - (minX + maxX) / 2) * scale,
    y: top + boxH / 2 + (-p.lat - (minY + maxY) / 2) * scale,
  });
  const center =
    rows.length === 0 ? { x: size.w / 2, y: top + boxH / 2 } : place(origin);

  return (
    <View
      className="flex-1 overflow-hidden bg-[#EEF1F5]"
      onLayout={(e) =>
        setSize({
          w: e.nativeEvent.layout.width,
          h: e.nativeEvent.layout.height,
        })
      }
      accessibilityLabel="Hospitals near you and their published cash prices, placed by location"
    >
      {size.w > 0 ? (
        <>
          <View
            className="absolute"
            style={{ left: center.x - 60, top: center.y - 60 }}
            accessibilityLabel={here ? "You are here" : "Downtown Los Angeles"}
          >
            <Here checking={rows.length === 0} />
          </View>
          {rows.map((r, i) => (
            <Pin
              key={`${key}-${r.hospitalKey}`}
              row={r}
              at={place(r)}
              delay={i * PIN_STEP_MS}
              kind={kind}
              z={rows.length - i}
              onPress={() => onSelect?.(r.hospitalKey)}
            />
          ))}
        </>
      ) : null}
    </View>
  );
}

function Pin({
  row,
  at,
  delay,
  z,
  kind,
  onPress,
}: {
  row: PriceMapProps["rows"][number];
  at: { x: number; y: number };
  delay: number;
  kind: "price" | "hospital";
  // Lower prices sit on top where tags overlap.
  z: number;
  onPress: () => void;
}) {
  const reduced = useReducedMotion();
  const shown = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    shown.value = withDelay(
      delay,
      withTiming(1, { duration: 450, easing: Easing.out(Easing.back(1.6)) }),
    );
  }, [delay, reduced, shown]);
  const style = useAnimatedStyle(() => ({
    opacity: Math.min(1, shown.value * 1.5),
    transform: [
      { translateY: (1 - shown.value) * -16 },
      { scale: 0.5 + shown.value * 0.5 },
    ],
  }));
  if (kind === "hospital") {
    return (
      <Animated.View
        className="absolute items-center"
        style={[
          { left: at.x - PIN_W / 2, top: at.y - 15, width: PIN_W, zIndex: z },
          style,
        ]}
        pointerEvents="box-none"
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${row.hospitalName}, ${row.distanceMiles.toFixed(1)} miles${row.level ? `, prices mostly ${LEVEL_WORDS[row.level]}` : ""}`}
          onPress={onPress}
        >
          <HospitalPin
            name={shortHospitalName(row.hospitalName)}
            level={row.level ?? null}
          />
        </Pressable>
      </Animated.View>
    );
  }
  const lowest = row.rank === 1;
  const level = row.level ?? null;
  const bg = lowest ? "bg-mint" : level ? LEVEL_COLORS[level].bg : "bg-white";
  const ink = lowest
    ? "text-white"
    : level
      ? LEVEL_COLORS[level].text
      : "text-foreground";
  return (
    <Animated.View
      className="absolute items-center justify-end"
      style={[
        {
          left: at.x - PIN_W / 2,
          top: at.y - PIN_H,
          width: PIN_W,
          height: PIN_H,
          zIndex: z,
        },
        style,
      ]}
      pointerEvents="box-none"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${row.hospitalName}, ${row.distanceMiles.toFixed(1)} miles${row.level ? `, ${LEVEL_WORDS[row.level]}` : ""}`}
        onPress={onPress}
        className="items-center"
      >
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
          {row.discountedCashCents == null ? (
            <T className="text-muted text-xs">No cash price</T>
          ) : (
            <Money
              cents={row.discountedCashCents}
              size={14}
              weight="semibold"
              whole
              className={ink}
              label={row.hospitalName}
            />
          )}
        </View>
        <View className={`-mt-1.5 size-2.5 rotate-45 rounded-[2px] ${bg}`} />
      </Pressable>
    </Animated.View>
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
