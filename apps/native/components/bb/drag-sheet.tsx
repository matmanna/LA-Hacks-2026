import { type ReactNode, useEffect, useState } from "react";
import { ScrollView, useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

type Props = {
  // Rises from below once true (after riseDelay ms).
  ready: boolean;
  riseDelay?: number;
  // How much shows when peeking: the handle and the `handle` content.
  peek: number;
  // Height of the area the sheet sits in (the screen above the tab bar).
  areaHeight?: number;
  label: string;
  // Drag area under the bar: always visible, even when peeking.
  handle: ReactNode;
  // The rest; it scrolls once the sheet is full height.
  children: (expanded: boolean, expand: () => void) => ReactNode;
  // How much of the sheet shows once it settles, for fitting a map above it.
  onVisible?: (visible: number) => void;
};

// A bottom sheet that drags (or taps on its handle) between peek, middle and
// full height. Motion follows reduce motion.
export function DragSheet({
  ready,
  riseDelay = 0,
  peek,
  areaHeight,
  label,
  handle,
  children,
  onVisible,
}: Props) {
  const window = useWindowDimensions();
  const area = areaHeight ?? window.height;
  const reduced = useReducedMotion();
  const fullH = Math.round(area * 0.86);
  const mid = Math.min(Math.round(area * 0.5), fullH);
  const stops = { full: 0, mid: fullH - mid, peek: fullH - peek };
  const y = useSharedValue(fullH);
  const from = useSharedValue(0);
  const [visible, setVisible] = useState(mid);
  const expanded = visible >= fullH - 1;

  useEffect(() => {
    onVisible?.(visible);
  }, [visible, onVisible]);

  useEffect(() => {
    if (!ready) return;
    y.value = reduced
      ? stops.mid
      : withDelay(
          riseDelay,
          withTiming(stops.mid, {
            duration: 550,
            easing: Easing.bezier(0.2, 0.8, 0.2, 1),
          }),
        );
    setVisible(mid);
  }, [ready, reduced, riseDelay, y, stops.mid, mid]);

  const settle = (to: number) => {
    "worklet";
    y.value = withTiming(to, {
      duration: reduced ? 0 : 280,
      easing: Easing.out(Easing.cubic),
    });
    runOnJS(setVisible)(fullH - to);
  };
  const goTo = (to: number) => {
    y.value = withTiming(to, {
      duration: reduced ? 0 : 280,
      easing: Easing.out(Easing.cubic),
    });
    setVisible(fullH - to);
  };
  const pan = Gesture.Pan()
    .onStart(() => {
      from.value = y.value;
    })
    .onUpdate((e) => {
      y.value = Math.min(stops.peek, Math.max(0, from.value + e.translationY));
    })
    .onEnd((e) => {
      const aim = y.value + e.velocityY * 0.15;
      let best = stops.mid;
      for (const o of [stops.full, stops.mid, stops.peek]) {
        if (Math.abs(o - aim) < Math.abs(best - aim)) best = o;
      }
      settle(best);
    });
  // Tap the handle: peek and full go to the middle, the middle peeks.
  const tap = Gesture.Tap().onEnd(() => {
    settle(Math.abs(y.value - stops.mid) < 4 ? stops.peek : stops.mid);
  });
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
  }));

  return (
    <Animated.View
      className="absolute inset-x-0 bottom-0 rounded-t-[28px] bg-white"
      style={[
        style,
        {
          height: fullH,
          shadowColor: "#0B1B2B",
          shadowOpacity: 0.12,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: -6 },
        },
      ]}
    >
      <GestureDetector gesture={Gesture.Race(pan, tap)}>
        <View
          className="px-5 pt-2.5 pb-1"
          accessibilityRole="adjustable"
          accessibilityLabel={label}
          accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
          onAccessibilityAction={(e) =>
            goTo(
              e.nativeEvent.actionName === "increment"
                ? stops.full
                : stops.peek,
            )
          }
        >
          <View className="h-[5px] w-10 self-center rounded-full bg-[#D5DAE1]" />
          {handle}
        </View>
      </GestureDetector>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pb-8"
        scrollEnabled={expanded}
        showsVerticalScrollIndicator={false}
      >
        {children(expanded, () => goTo(stops.full))}
      </ScrollView>
    </Animated.View>
  );
}
