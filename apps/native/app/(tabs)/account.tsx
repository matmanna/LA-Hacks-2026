import { useEffect, useState } from "react";
import { Pressable, Switch, TextInput, View } from "react-native";

import { Choice, Icon, Screen, T } from "@/components/bb";
import { PhoneSignIn } from "@/components/phone-sign-in";
import { insuranceOptions } from "@/lib/assist";
import { authClient } from "@/lib/auth-client";
import { useMyInfo } from "@/lib/my-info";
import { queryClient } from "@/utils/orpc";

// P1 Account: "Your info" (saved only on this phone), updates, and sign in.
export default function Account() {
  const { info, update, clear } = useMyInfo();
  const { data: session } = authClient.useSession();
  const [income, setIncome] = useState("");

  useEffect(() => {
    setIncome(
      info?.incomeCents === undefined
        ? ""
        : Math.round(info.incomeCents / 100).toLocaleString("en-US"),
    );
  }, [info?.incomeCents]);

  function saveIncome() {
    const digits = income.replace(/[^0-9]/g, "");
    void update({
      incomeCents: digits === "" ? undefined : Number(digits) * 100,
    });
  }

  const size = info?.householdSize ?? 1;

  return (
    <Screen nav={null} tone="wash">
      <T
        weight="semibold"
        className="pt-4 text-[28px] leading-[34px] tracking-[-0.01em]"
      >
        Account
      </T>
      <Label>Your info</Label>
      <View className="rounded-[20px] bg-white px-[18px]">
        <View className="min-h-14 flex-row items-center justify-between border-hairline border-b py-2">
          <T className="text-base">People in household</T>
          <View className="flex-row items-center gap-3">
            <Round
              icon="minus"
              label="Fewer people"
              onPress={() => update({ householdSize: Math.max(1, size - 1) })}
            />
            <T weight="semibold" className="w-5 text-center text-lg">
              {size}
            </T>
            <Round
              icon="plus"
              label="More people"
              onPress={() => update({ householdSize: Math.min(20, size + 1) })}
            />
          </View>
        </View>
        <View className="gap-2.5 border-hairline border-b py-3.5">
          <T className="text-base">Insurance</T>
          <View className="flex-row flex-wrap gap-2">
            {insuranceOptions(null).map((o) => (
              <Choice
                key={o.value}
                label={o.value === "medicaid" ? "Medicaid" : o.label}
                selected={info?.insurance === o.value}
                onPress={() => update({ insurance: o.value })}
                className="min-w-[47%] flex-1"
              />
            ))}
          </View>
        </View>
        <View className="min-h-14 flex-row items-center justify-between gap-3 py-2">
          <T className="flex-1 text-base">Yearly income before taxes</T>
          <View className="h-11 w-36 flex-row items-center rounded-xl border border-[#D5DAE1] px-3">
            <T className="text-base text-muted">$</T>
            <TextInput
              accessibilityLabel="Yearly income before taxes, in dollars"
              value={income}
              onChangeText={setIncome}
              onEndEditing={saveIncome}
              onBlur={saveIncome}
              keyboardType="number-pad"
              placeholder="52,000"
              placeholderTextColor="#9AA6B2"
              className="flex-1 pl-1 text-base text-foreground"
              style={{
                fontFamily: "Geist_400Regular",
                fontVariant: ["tabular-nums"],
              }}
            />
          </View>
        </View>
      </View>
      <View className="mt-2.5 flex-row items-start gap-2 px-1">
        <Icon name="lock" size={16} color="#5B6B7C" />
        <T className="flex-1 text-[13px] text-muted leading-[18px]">
          Saved only on this phone. When we check a bill, we send an income
          range, never this number. We use it to find free or discounted care.
        </T>
      </View>
      <Pressable
        accessibilityRole="button"
        onPress={() => void clear()}
        className="h-11 justify-center self-start px-1"
      >
        <T weight="semibold" className="text-[15px] text-coral-ink">
          Clear my info
        </T>
      </Pressable>

      <Label>Updates</Label>
      <View className="min-h-14 flex-row items-center justify-between gap-3 rounded-[20px] bg-white px-[18px] py-3">
        <View className="flex-1 gap-0.5">
          <T className="text-base">Tell me when a lookup is done</T>
          <T className="text-[13px] text-muted">A reminder on this phone</T>
        </View>
        <Switch
          accessibilityLabel="Tell me when a lookup is done"
          value={info?.notifyLookups ?? true}
          onValueChange={(v) => void update({ notifyLookups: v })}
          trackColor={{ true: "#0F9D76", false: "#D5DAE1" }}
        />
      </View>

      <Label>Profile</Label>
      {session?.user ? (
        <SignedIn name={session.user.name} email={session.user.email} />
      ) : (
        <PhoneSignIn />
      )}
    </Screen>
  );
}

function Label({ children }: { children: string }) {
  return (
    <T weight="semibold" className="px-1 pt-4 pb-2 text-[13px] text-muted">
      {children}
    </T>
  );
}

function Round({
  icon,
  label,
  onPress,
}: {
  icon: "minus" | "plus";
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="size-11 items-center justify-center rounded-full border border-[#D5DAE1]"
    >
      <Icon name={icon} size={18} stroke={2} />
    </Pressable>
  );
}

// Signed in: name, email, and sign out. Upgrade and portal live on Billing.
function SignedIn({ name, email }: { name: string; email: string }) {
  return (
    <View className="rounded-[20px] bg-white px-[18px] py-1">
      <View className="border-hairline border-b py-3.5">
        <T weight="semibold" className="text-base">
          {name}
        </T>
        <T className="text-[13px] text-muted">{email}</T>
      </View>
      <Row
        label="Sign out"
        danger
        last
        onPress={() => {
          void authClient.signOut();
          void queryClient.invalidateQueries();
        }}
      />
    </View>
  );
}

function Row({
  label,
  onPress,
  danger = false,
  last = false,
}: {
  label: string;
  onPress: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      className={
        last
          ? "min-h-14 flex-row items-center justify-between py-2"
          : "min-h-14 flex-row items-center justify-between border-hairline border-b py-2"
      }
    >
      <T className={danger ? "text-base text-coral-ink" : "text-base"}>
        {label}
      </T>
      {danger ? null : <Icon name="chevron" size={16} color="#5B6B7C" />}
    </Pressable>
  );
}
