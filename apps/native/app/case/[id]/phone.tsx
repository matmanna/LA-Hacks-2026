import { formatPhone } from "@betterbill/core/phone";
import { useQuery } from "@tanstack/react-query";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { TextInput, View } from "react-native";

import { Button, Screen, T } from "@/components/bb";
import { errorMessage } from "@/lib/errors";
import { client, orpc } from "@/utils/orpc";

const INPUT =
  "h-12 rounded-xl border border-hairline px-3.5 text-base text-foreground";
const FONT = { fontFamily: "Geist_400Regular" };

// After the bill is read: the patient's phone and an optional demo billing
// number override. Browser Use finds the hospital contact from the bill.
export default function Phone() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const contact = useQuery(
    orpc.contact.get.queryOptions({ input: { caseId: id } }),
  );
  const [patientPhone, setPatientPhone] = useState("");
  const [billingPhone, setBillingPhone] = useState("");
  const [filled, setFilled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fill once: this case first, then the number from the patient's last case.
  useEffect(() => {
    const data = contact.data;
    if (!data || filled) return;
    const phone = data.patientPhone ?? data.savedPatientPhone;
    setPatientPhone(phone ? formatPhone(phone) : "");
    setBillingPhone(data.billingPhone ? formatPhone(data.billingPhone) : "");
    setFilled(true);
  }, [contact.data, filled]);

  const toConfirm = () =>
    router.replace({ pathname: "/case/[id]/confirm", params: { id } });

  async function save() {
    setBusy(true);
    setError(null);
    try {
      await client.contact.set({
        caseId: id,
        patientPhone,
        billingPhone,
      });
      // Research the hospital's billing phone from the bill in the background.
      void client.hospital.lookup({ caseId: id }).catch(() => undefined);
      toConfirm();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <Screen
      footer={
        <>
          <Button
            label="Continue"
            variant={busy ? "disabled" : "primary"}
            onPress={save}
          />
          <Button label="Skip for now" variant="quiet" onPress={toConfirm} />
        </>
      }
    >
      <T
        weight="semibold"
        className="pt-1 text-[28px] leading-[34px] tracking-tight"
      >
        Your phone number
      </T>
      <T className="mt-1.5 text-[15px] text-muted leading-[22px]">
        If you ask us to call billing, we ring you first and you stay on the
        line. You approve every call before it starts.
      </T>

      <View className="mt-6 gap-1.5">
        <T weight="semibold" className="text-[15px]">
          Your phone
        </T>
        <TextInput
          accessibilityLabel="Your phone"
          className={INPUT}
          style={FONT}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          placeholder="(415) 555-0123"
          value={patientPhone}
          onChangeText={setPatientPhone}
        />
        <T className="text-[13px] text-muted">Optional.</T>
      </View>

      <View className="mt-6 gap-3 rounded-2xl border border-hairline p-4">
        <T weight="semibold" className="text-[15px]">
          Demo Billing Department Override
        </T>
        <T className="text-[13px] text-muted leading-5">
          Browser Use researches the hospital named on your itemized bill and
          finds its official billing contact. Enter a number only to override
          that demo lookup.
        </T>
        <View className="gap-1.5">
          <T className="text-[15px]">Billing phone</T>
          <TextInput
            accessibilityLabel="Billing phone"
            className={INPUT}
            style={FONT}
            keyboardType="phone-pad"
            placeholder="(415) 555-0199"
            value={billingPhone}
            onChangeText={setBillingPhone}
          />
        </View>
      </View>

      {error ? (
        <T accessibilityRole="alert" className="mt-3 text-coral-ink text-sm">
          {error}
        </T>
      ) : null}
    </Screen>
  );
}
