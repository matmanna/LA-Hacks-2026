import { View } from "react-native";

import {
  Button,
  Disclaimer,
  Icon,
  Money,
  Row,
  Screen,
  T,
  TierBadge,
} from "@/components/bb";

// Design system check page: every shared piece on one screen, to compare with
// the Paper file. Open /kit in Expo web or Expo Go.
export default function Kit() {
  return (
    <Screen
      aside="Design kit"
      footer={
        <>
          <Button label="Looks right" />
          <Button label="Not now" variant="quiet" />
        </>
      }
    >
      <T weight="serif" className="text-[40px] leading-[44px]">
        BetterBill
      </T>
      <T weight="semibold" className="mt-2 text-[28px] leading-[34px]">
        Does this look right?
      </T>
      <T className="mt-1.5 text-base text-muted leading-6">
        Geist for the interface, Instrument Serif for display.
      </T>

      <View className="mt-6 gap-3 rounded-3xl bg-ink p-5">
        <T className="text-ink-muted text-sm">Your fair balance</T>
        <Money
          cents={1008315}
          size={46}
          weight="semibold"
          className="text-white"
        />
        <View className="flex-row">
          <View className="rounded-full bg-mint-soft px-2.5 py-1">
            <Money
              cents={-191685}
              size={13}
              weight="semibold"
              className="text-mint-ink"
            />
          </View>
        </View>
      </View>

      <View className="mt-6">
        <Row label="On your bill" value={<Money cents={690000} />} />
        <Row label="Their cash price" value={<Money cents={514315} />} />
        <Row
          label="Difference"
          strong
          last
          value={
            <Money
              cents={175685}
              weight="semibold"
              className="text-coral-ink"
            />
          }
        />
      </View>

      <View className="mt-6 gap-2">
        <TierBadge tier="confirmed" />
        <TierBadge tier="rule" />
        <TierBadge tier="published" />
        <TierBadge tier="estimate" />
      </View>

      <View className="mt-6 flex-row gap-2.5">
        <Button
          label="Fix it"
          variant="outline"
          className="flex-1"
          icon={<Icon name="pencil" size={16} />}
        />
        <Button
          label="That's right"
          variant="secondary"
          className="flex-1"
          icon={<Icon name="check" size={16} color="#1E3A8A" stroke={2.25} />}
        />
      </View>

      <View className="mt-6">
        <Disclaimer />
      </View>
    </Screen>
  );
}
