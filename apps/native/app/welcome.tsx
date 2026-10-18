import { router } from "expo-router";
import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Disclaimer, Icon, type IconName, T } from "@/components/bb";
import { errorMessage } from "@/lib/errors";
import { markIntroSeen } from "@/lib/intro";
import { startSampleBill } from "@/lib/sample";

// W0 Welcome: three swipeable cards shown once, before the Bills tab (section
// 14.2). Each card is a phone illustration, a serif headline and one line.
// Skip, Check my bill and Try a sample bill all mark the intro as seen.

const INK = "#0B1B2B";
const MUTED = "#5B6B7C";
const MINT = "#0F9D76";
const ACCENT = "#1E4ED8";

const CARDS = [
  {
    key: "scan",
    title: "Check your hospital\nbill before you pay",
    body: "Free to check. Nothing is sent without your OK.",
    privacy: "We only use your bill to check it. We never sell your data.",
  },
  {
    key: "proof",
    title: "See what's wrong,\nwith proof",
    body: "We check every line against the hospital's own prices and billing rules.",
  },
  {
    key: "contact",
    title: "We contact\nbilling for you",
    body: "We call and email them about what looks wrong, using your bill's details.",
  },
] as const;

export default function Welcome() {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const scroller = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // The phone illustration is 216 x 420 in the mockups; shrink it so the
  // headline, the privacy line and the buttons always fit.
  const phoneHeight = Math.min(420, Math.max(240, height - 500));
  const k = phoneHeight / 420;

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  }
  function goTo(i: number) {
    scroller.current?.scrollTo({ x: i * width, animated: true });
    setPage(i);
  }

  async function finish(then: () => void) {
    await markIntroSeen();
    // Bills first, so the next screen can come back to it.
    router.replace("/");
    then();
  }
  async function sample() {
    setError(null);
    setBusy(true);
    try {
      const id = await startSampleBill();
      await finish(() =>
        router.push({ pathname: "/case/[id]/reading", params: { id } }),
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View
      className="flex-1 bg-background"
      style={{
        paddingTop: insets.top + 8,
        paddingBottom: Math.max(insets.bottom, 16) + 8,
      }}
    >
      <View className="h-11 flex-row items-center justify-end px-5">
        <Pressable
          accessibilityRole="button"
          onPress={() => void finish(() => undefined)}
          className="h-11 justify-center px-2.5"
        >
          <T className="text-[15px] text-muted">Skip</T>
        </Pressable>
      </View>

      <ScrollView
        ref={scroller}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        className="flex-1"
      >
        {CARDS.map((card, i) => (
          <View
            key={card.key}
            style={{ width }}
            className="items-center px-5 pt-2"
            accessibilityLabel={`Page ${i + 1} of ${CARDS.length}`}
          >
            <View style={{ width: 216 * k, height: phoneHeight }}>
              {i === 0 ? (
                <ScanPhone k={k} />
              ) : i === 1 ? (
                <ProofPhone k={k} />
              ) : (
                <CallPhone k={k} />
              )}
            </View>
            <T
              weight="serif"
              accessibilityRole="header"
              className="mt-7 text-center text-[40px] leading-[42px]"
            >
              {card.title}
            </T>
            <T className="mt-2.5 max-w-[320px] text-center text-[15px] text-muted leading-[22px]">
              {card.body}
            </T>
            {"privacy" in card ? (
              <View className="mt-3 max-w-[310px] flex-row items-start gap-1.5">
                <Icon name="lock" size={14} color={MUTED} />
                <T className="flex-1 text-[13px] text-muted leading-[18px]">
                  {card.privacy}
                </T>
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>

      <View className="items-center gap-3.5 px-5">
        <View
          className="mb-1 flex-row items-center gap-1.5"
          accessibilityRole="tablist"
        >
          {CARDS.map((card, i) => (
            <Pressable
              key={card.key}
              accessibilityRole="tab"
              accessibilityLabel={`Page ${i + 1}`}
              accessibilityState={{ selected: page === i }}
              hitSlop={14}
              onPress={() => goTo(i)}
              className={
                page === i
                  ? "h-1.5 w-5 rounded-full bg-ink"
                  : "h-1.5 w-1.5 rounded-full bg-[#C8D1DC]"
              }
            />
          ))}
        </View>
        {error ? (
          <T className="text-center text-[13px] text-coral-ink">{error}</T>
        ) : null}
        <Button
          label="Check my bill"
          onPress={() => void finish(() => router.push("/scan"))}
          className="h-14 w-full rounded-full bg-ink"
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Try a sample bill"
          disabled={busy}
          onPress={() => void sample()}
          className="h-11 flex-row items-center justify-center gap-1"
        >
          {busy ? (
            <ActivityIndicator color={INK} />
          ) : (
            <>
              <T className="text-[15px] text-muted">Just looking?</T>
              <T weight="semibold" className="text-[15px] text-ink">
                Try a sample bill
              </T>
            </>
          )}
        </Pressable>
        <Disclaimer />
      </View>
    </View>
  );
}

// A looping value that goes from 0 to 1 and back. Still when the system
// asks for reduced motion.
function useLoop(duration: number, delay = 0, bounce = true) {
  const still = useReducedMotion();
  const v = useSharedValue(0);
  useEffect(() => {
    if (still) {
      v.value = 0.5;
      return;
    }
    v.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration, easing: Easing.inOut(Easing.quad) }),
        -1,
        bounce,
      ),
    );
  }, [v, still, duration, delay, bounce]);
  return v;
}

// A one-shot fade and scale in, after a delay.
function usePop(delay: number) {
  const still = useReducedMotion();
  const v = useSharedValue(still ? 1 : 0);
  useEffect(() => {
    if (still) return;
    v.value = withDelay(
      delay,
      withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) }),
    );
  }, [v, still, delay]);
  return v;
}

// The dark phone shell every card uses. Children draw its screen.
function Phone({
  k,
  screen,
  children,
}: {
  k: number;
  screen: string;
  children: ReactNode;
}) {
  return (
    <View
      style={{
        width: 216 * k,
        height: 420 * k,
        borderRadius: 36 * k,
        padding: 7 * k,
        backgroundColor: INK,
        shadowColor: INK,
        shadowOpacity: 0.18,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 12 },
      }}
    >
      <View
        style={{
          flex: 1,
          borderRadius: 29 * k,
          backgroundColor: screen,
          overflow: "hidden",
        }}
      >
        {children}
        <View
          style={{
            position: "absolute",
            top: 8 * k,
            alignSelf: "center",
            width: 64 * k,
            height: 18 * k,
            borderRadius: 999,
            backgroundColor: INK,
          }}
        />
      </View>
    </View>
  );
}

// Card 1: the camera framing a paper bill, a mint sweep line moving over it.
const BILL_LINES = [
  ["a", "72148 MRI LUMBAR W/O", "6,900.00"],
  ["b", "85025 CBC W/ AUTO DIFF", "84.00"],
  ["c", "85025 CBC W/ AUTO DIFF", "84.00"],
  ["d", "36415 VENIPUNCTURE x4", "152.00"],
  ["e", "99284 ED VISIT LEVEL 4", "2,950.00"],
  ["f", "80053 COMP METABOLIC", "212.00"],
  ["g", "96374 IV PUSH SINGLE", "486.00"],
] as const;

function ScanPhone({ k }: { k: number }) {
  const sweep = useLoop(2400);
  const inner = 406 * k;
  const sweepStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: inner * (0.22 + sweep.value * 0.54) }],
  }));
  const tiny = { fontSize: 4.5 * k, lineHeight: 6 * k, color: "#2A3440" };
  const bracket = (side: "tl" | "tr" | "bl" | "br") => ({
    position: "absolute" as const,
    width: 20 * k,
    height: 20 * k,
    borderColor: MINT,
    ...(side.startsWith("t") ? { top: 40 * k } : { top: 238 * k }),
    ...(side.endsWith("l") ? { left: 20 * k } : { right: 20 * k }),
    ...(side.startsWith("t")
      ? { borderTopWidth: 3 * k }
      : { borderBottomWidth: 3 * k }),
    ...(side.endsWith("l")
      ? { borderLeftWidth: 3 * k }
      : { borderRightWidth: 3 * k }),
    ...(side === "tl" ? { borderTopLeftRadius: 8 * k } : {}),
    ...(side === "tr" ? { borderTopRightRadius: 8 * k } : {}),
    ...(side === "bl" ? { borderBottomLeftRadius: 8 * k } : {}),
    ...(side === "br" ? { borderBottomRightRadius: 8 * k } : {}),
  });
  return (
    <Phone k={k} screen="#13283D">
      <View style={{ alignItems: "center" }}>
        <View
          style={{
            marginTop: 50 * k,
            width: 142 * k,
            height: 196 * k,
            backgroundColor: "#F7F5EF",
            borderRadius: 3,
            transform: [{ rotate: "-3deg" }],
            paddingVertical: 10 * k,
            paddingHorizontal: 9 * k,
            gap: 4 * k,
          }}
        >
          <T
            weight="semibold"
            style={{ fontSize: 6 * k, lineHeight: 8 * k, color: "#2A3440" }}
          >
            CEDARS-SINAI MEDICAL CENTER
          </T>
          <View style={{ height: 1, backgroundColor: "#B8BFC8" }} />
          {BILL_LINES.map(([id, name, amount]) => (
            <View
              key={id}
              style={{ flexDirection: "row", justifyContent: "space-between" }}
            >
              <T style={tiny}>{name}</T>
              <T style={[tiny, { fontVariant: ["tabular-nums"] }]}>{amount}</T>
            </View>
          ))}
          <View style={{ flex: 1 }} />
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <T weight="semibold" style={tiny}>
              AMOUNT DUE
            </T>
            <T weight="semibold" style={tiny}>
              12,000.00
            </T>
          </View>
        </View>
      </View>
      <Animated.View
        style={[
          {
            position: "absolute",
            left: 22 * k,
            right: 22 * k,
            top: 0,
            height: 2,
            backgroundColor: MINT,
          },
          sweepStyle,
        ]}
      />
      <View style={bracket("tl")} />
      <View style={bracket("tr")} />
      <View style={bracket("bl")} />
      <View style={bracket("br")} />
      <View
        style={{
          position: "absolute",
          bottom: 66 * k,
          alignSelf: "center",
          flexDirection: "row",
          gap: 4 * k,
          padding: 3 * k,
          borderRadius: 999,
          backgroundColor: "rgba(255,255,255,0.14)",
        }}
      >
        {(["Bill", "Insurance", "Upload"] as const).map((label, i) => (
          <View
            key={label}
            style={{
              borderRadius: 999,
              paddingVertical: 4 * k,
              paddingHorizontal: (i === 0 ? 9 : 7) * k,
              backgroundColor: i === 0 ? "#FFFFFF" : "transparent",
            }}
          >
            <T
              weight={i === 0 ? "semibold" : "regular"}
              style={{
                fontSize: 8 * k,
                lineHeight: 10 * k,
                color: i === 0 ? INK : "#FFFFFF",
              }}
            >
              {label}
            </T>
          </View>
        ))}
      </View>
      <View
        style={{
          position: "absolute",
          bottom: 16 * k,
          alignSelf: "center",
          width: 38 * k,
          height: 38 * k,
          borderRadius: 999,
          borderWidth: 3 * k,
          borderColor: "#FFFFFF",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <View
          style={{
            width: 28 * k,
            height: 28 * k,
            borderRadius: 999,
            backgroundColor: "#FFFFFF",
          }}
        />
      </View>
    </Phone>
  );
}

// Card 2: the results screen, with two floating chips about the evidence.
const PROOF_ROWS = [
  {
    title: "MRI above their cash price",
    tier: "Hospital's published price",
    tierColor: "#1E3A8A",
    amount: "$1,756.85",
    active: true,
  },
  {
    title: "Blood test listed twice",
    tier: "Confirmed from your bill",
    tierColor: "#065F46",
    amount: "$84.00",
    active: false,
  },
  {
    title: "Blood draw billed 4 times",
    tier: "Billing rule",
    tierColor: "#334155",
    amount: "$76.00",
    active: false,
  },
] as const;

function ProofPhone({ k }: { k: number }) {
  return (
    <View style={{ width: 216 * k, height: 420 * k }}>
      <Phone k={k} screen="#FFFFFF">
        <View
          style={{
            paddingTop: 34 * k,
            paddingHorizontal: 12 * k,
            gap: 9 * k,
          }}
        >
          <T style={{ fontSize: 7 * k, lineHeight: 9 * k, color: MUTED }}>
            Cedars-Sinai · Sep 14
          </T>
          <View
            style={{
              backgroundColor: INK,
              borderRadius: 12 * k,
              paddingVertical: 10 * k,
              paddingHorizontal: 11 * k,
              gap: 2 * k,
            }}
          >
            <T
              weight="serif"
              style={{ fontSize: 11 * k, lineHeight: 13 * k, color: "#FFF" }}
            >
              Your fair balance
            </T>
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <T
                weight="semibold"
                style={{
                  fontSize: 20 * k,
                  lineHeight: 24 * k,
                  color: "#FFF",
                  letterSpacing: -0.4 * k,
                  fontVariant: ["tabular-nums"],
                }}
              >
                $10,083
              </T>
              <T
                weight="semibold"
                style={{
                  fontSize: 10 * k,
                  lineHeight: 14 * k,
                  color: "#FFF",
                  marginLeft: 1,
                }}
              >
                .15
              </T>
            </View>
            <View
              style={{
                alignSelf: "flex-start",
                backgroundColor: "#D1FAE5",
                borderRadius: 999,
                paddingVertical: 2 * k,
                paddingHorizontal: 6 * k,
              }}
            >
              <T
                weight="semibold"
                style={{
                  fontSize: 6.5 * k,
                  lineHeight: 9 * k,
                  color: "#065F46",
                  fontVariant: ["tabular-nums"],
                }}
              >
                −$1,916.85
              </T>
            </View>
          </View>
          <T
            weight="semibold"
            style={{ fontSize: 9.5 * k, lineHeight: 12 * k, marginTop: 2 * k }}
          >
            3 things to ask about
          </T>
          <View>
            {PROOF_ROWS.map((row, i) => (
              <View
                key={row.title}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6 * k,
                  paddingVertical: 7 * k,
                  paddingHorizontal: row.active ? 8 * k : 0,
                  marginHorizontal: row.active ? -8 * k : 0,
                  borderRadius: row.active ? 9 * k : 0,
                  backgroundColor: row.active ? "#EEF2FF" : "transparent",
                  borderWidth: row.active ? 1 : 0,
                  borderColor: ACCENT,
                  borderBottomWidth: i === 1 ? 1 : row.active ? 1 : 0,
                  borderBottomColor: i === 1 ? "#E3E8EF" : ACCENT,
                  opacity: row.active ? 1 : 0.55,
                }}
              >
                <View style={{ flex: 1, gap: 2 * k }}>
                  <T
                    weight="semibold"
                    style={{ fontSize: 8 * k, lineHeight: 10 * k }}
                  >
                    {row.title}
                  </T>
                  <T
                    style={{
                      fontSize: 6 * k,
                      lineHeight: 8 * k,
                      color: row.tierColor,
                    }}
                  >
                    {row.tier}
                  </T>
                </View>
                <T
                  weight="semibold"
                  style={{
                    fontSize: 8 * k,
                    lineHeight: 10 * k,
                    color: "#B4232A",
                    fontVariant: ["tabular-nums"],
                  }}
                >
                  {row.amount}
                </T>
              </View>
            ))}
          </View>
        </View>
      </Phone>
      <Chip
        k={k}
        style={{ right: -58 * k, top: 224 * k }}
        rotate="3deg"
        delay={0}
        icon="landmark"
        iconBg="#EEF2FF"
        iconColor={ACCENT}
        title="Their own price list"
        sub="Cash: $5,143.15"
      />
      <Chip
        k={k}
        style={{ left: -54 * k, top: 316 * k }}
        rotate="-3deg"
        delay={250}
        icon="check"
        iconBg="#D1FAE5"
        iconColor="#065F46"
        title="Source and date included"
        small
      />
    </View>
  );
}

// Card 3: the call screen, with three chips about who does what.
function CallPhone({ k }: { k: number }) {
  const pulse = useLoop(1600, 0, false);
  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * 0.7 }],
    opacity: 0.4 * (1 - pulse.value),
  }));
  const steps: IconName[] = ["phone", "mail", "clock", "check"];
  return (
    <View style={{ width: 216 * k, height: 420 * k }}>
      <Phone k={k} screen="#FFFFFF">
        <View
          style={{
            paddingTop: 36 * k,
            paddingHorizontal: 12 * k,
            gap: 12 * k,
          }}
        >
          <View style={{ gap: 3 * k }}>
            <T style={{ fontSize: 7 * k, lineHeight: 9 * k, color: MUTED }}>
              Cedars-Sinai · account 4821
            </T>
            <T weight="serif" style={{ fontSize: 18 * k, lineHeight: 20 * k }}>
              Calling billing now
            </T>
            <T style={{ fontSize: 7 * k, lineHeight: 10 * k, color: MUTED }}>
              You can close the app. We'll text you.
            </T>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {steps.map((icon, i) => (
              <View
                key={icon}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  flex: i === 0 ? 0 : 1,
                }}
              >
                {i > 0 ? (
                  <View
                    style={{ flex: 1, height: 2, backgroundColor: "#E3E8EF" }}
                  />
                ) : null}
                <View
                  style={{
                    width: 20 * k,
                    height: 20 * k,
                    borderRadius: 999,
                    backgroundColor: i === 0 ? ACCENT : "#F4F6FA",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {i === 0 ? (
                    <Animated.View
                      style={[
                        {
                          position: "absolute",
                          width: 20 * k,
                          height: 20 * k,
                          borderRadius: 999,
                          backgroundColor: ACCENT,
                        },
                        pulseStyle,
                      ]}
                    />
                  ) : null}
                  <Icon
                    name={icon}
                    size={10 * k}
                    stroke={2}
                    color={i === 0 ? "#FFFFFF" : MUTED}
                  />
                </View>
              </View>
            ))}
          </View>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8 * k,
              backgroundColor: "#F4F6FA",
              borderRadius: 10 * k,
              padding: 8 * k,
            }}
          >
            <View
              style={{
                width: 22 * k,
                height: 22 * k,
                borderRadius: 999,
                backgroundColor: INK,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Wave
                k={k}
                bars={[
                  ["a", 7],
                  ["b", 10],
                  ["c", 6],
                ]}
                width={2}
              />
            </View>
            <View>
              <T
                weight="semibold"
                style={{ fontSize: 8 * k, lineHeight: 10 * k }}
              >
                Listen in
              </T>
              <T style={{ fontSize: 6 * k, lineHeight: 8 * k, color: MUTED }}>
                See the live transcript
              </T>
            </View>
          </View>
          <View style={{ gap: 6 * k }}>
            <T style={{ fontSize: 7 * k, lineHeight: 10 * k, color: MUTED }}>
              "The MRI was billed at $6,900. Your published cash price is
              $5,143.15. Can you apply it?"
            </T>
            <View
              style={{
                alignSelf: "flex-end",
                maxWidth: 120 * k,
                backgroundColor: "#F4F6FA",
                borderRadius: 8 * k,
                paddingVertical: 5 * k,
                paddingHorizontal: 7 * k,
              }}
            >
              <T style={{ fontSize: 7 * k, lineHeight: 10 * k }}>
                "Let me pull up the account. I can send that for review."
              </T>
            </View>
          </View>
        </View>
      </Phone>
      <Chip
        k={k}
        style={{ left: -62 * k, top: 62 * k }}
        rotate="-4deg"
        delay={0}
        icon="phone"
        iconBg={ACCENT}
        iconColor="#FFFFFF"
        title="Your advocate calls"
        wave
      />
      <Chip
        k={k}
        style={{ right: -64 * k, top: 238 * k }}
        rotate="3deg"
        delay={250}
        icon="mail"
        iconBg="#D1FAE5"
        iconColor="#065F46"
        title="We email the details"
        sub="3 flags + itemized bill"
      />
      <Chip
        k={k}
        style={{ left: -40 * k, top: 352 * k }}
        rotate="-2deg"
        delay={500}
        icon="check"
        iconBg={MINT}
        iconColor="#FFFFFF"
        title="You approved every word"
        small
        dark
      />
    </View>
  );
}

// Animated sound bars (scale between 35% and 100%, staggered).
function Wave({
  k,
  bars,
  width,
}: {
  k: number;
  bars: readonly (readonly [string, number])[];
  width: number;
}) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 2 * k }}>
      {bars.map(([id, h], i) => (
        <Bar key={id} height={h * k} width={width * k} delay={i * 150} />
      ))}
    </View>
  );
}

function Bar({
  height,
  width,
  delay,
}: {
  height: number;
  width: number;
  delay: number;
}) {
  const v = useLoop(550, delay);
  const style = useAnimatedStyle(() => ({
    transform: [{ scaleY: 0.35 + v.value * 0.65 }],
  }));
  return (
    <Animated.View
      style={[
        { width, height, borderRadius: 999, backgroundColor: MINT },
        style,
      ]}
    />
  );
}

// A floating card beside the phone: pops in, then drifts up and down.
function Chip({
  k,
  style,
  rotate,
  delay,
  icon,
  iconBg,
  iconColor,
  title,
  sub,
  small = false,
  dark = false,
  wave = false,
}: {
  k: number;
  style: { left?: number; right?: number; top: number };
  rotate: string;
  delay: number;
  icon: IconName;
  iconBg: string;
  iconColor: string;
  title: string;
  sub?: string;
  small?: boolean;
  dark?: boolean;
  wave?: boolean;
}) {
  const pop = usePop(delay);
  const float = useLoop(2000, delay);
  const outer = useAnimatedStyle(() => ({
    opacity: pop.value,
    transform: [{ scale: 0.92 + pop.value * 0.08 }],
  }));
  const scale = Math.max(0.7, k * 0.85);
  const inner = useAnimatedStyle(() => ({
    transform: [{ translateY: -5 * float.value }, { rotate }, { scale }],
  }));
  const iconSize = small ? 22 : 32;
  return (
    <Animated.View style={[{ position: "absolute" }, style, outer]}>
      <Animated.View
        style={[
          {
            flexDirection: "row",
            alignItems: "center",
            gap: small ? 8 : 10,
            backgroundColor: dark ? INK : "#FFFFFF",
            borderRadius: small ? 999 : 16,
            paddingVertical: small ? 8 : 12,
            paddingLeft: small ? 8 : 12,
            paddingRight: small ? 12 : 12,
            shadowColor: INK,
            shadowOpacity: dark ? 0.22 : 0.16,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 10 },
          },
          inner,
        ]}
      >
        <View
          style={{
            width: iconSize,
            height: iconSize,
            borderRadius: 999,
            backgroundColor: iconBg,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon
            name={icon}
            size={small ? 13 : 15}
            stroke={small ? 2.25 : 1.75}
            color={iconColor}
          />
        </View>
        <View style={{ gap: 2 }}>
          <T
            weight="semibold"
            numberOfLines={1}
            style={{
              fontSize: 12,
              lineHeight: 15,
              color: dark ? "#FFFFFF" : INK,
            }}
          >
            {title}
          </T>
          {sub ? (
            <T
              style={{
                fontSize: 11,
                lineHeight: 14,
                color: MUTED,
                fontVariant: ["tabular-nums"],
              }}
            >
              {sub}
            </T>
          ) : null}
          {wave ? (
            <Wave
              k={1}
              bars={[
                ["a", 6],
                ["b", 10],
                ["c", 7],
                ["d", 9],
                ["e", 5],
              ]}
              width={3}
            />
          ) : null}
        </View>
      </Animated.View>
    </Animated.View>
  );
}
