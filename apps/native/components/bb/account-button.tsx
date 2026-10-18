import { router } from "expo-router";
import { Pressable, View } from "react-native";

import { Icon } from "./icon";

// The avatar top right of the Bills and Prices headers: a 40 px circle in a
// 44 px target that opens Account.
export function AccountButton() {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Your account"
      onPress={() => router.push("/account")}
      className="size-11 items-center justify-center"
    >
      <View className="size-10 items-center justify-center rounded-full border-2 border-white bg-secondary">
        <Icon name="user" color="#1E3A8A" stroke={1.9} />
      </View>
    </Pressable>
  );
}
