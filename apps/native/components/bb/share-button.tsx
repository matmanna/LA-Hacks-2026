import { router } from "expo-router";
import { cn } from "heroui-native";
import { Pressable } from "react-native";

import { Icon } from "./icon";
import { T } from "./t";

// Opens the share sheet (S1) for a case. Round on results, a pill on W3.
export function ShareButton({
  id,
  pill = false,
  tone = "white",
}: {
  id: string;
  pill?: boolean;
  tone?: "white" | "wash";
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Share this bill's progress"
      onPress={() =>
        router.push({ pathname: "/case/[id]/share", params: { id } })
      }
      className={cn(
        "h-11 flex-row items-center justify-center gap-2 rounded-full",
        pill ? "px-4" : "w-11",
        tone === "wash" ? "bg-white" : "bg-wash",
      )}
    >
      <Icon name="share" size={18} />
      {pill ? (
        <T weight="semibold" className="text-[15px]">
          Share
        </T>
      ) : null}
    </Pressable>
  );
}
