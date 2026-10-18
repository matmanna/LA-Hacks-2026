import { useState } from "react";
import { TextInput, View } from "react-native";

import { Button, T } from "@/components/bb";
import { sendCode, verifyCode } from "@/lib/phone-sign-in";

const INPUT =
  "h-12 rounded-xl border border-hairline px-3.5 text-base text-foreground";
const FONT = { fontFamily: "Geist_400Regular" };

// Sign in with a phone number and a texted code. The same number signs in on
// the web, so both show the same bills.
export function PhoneSignIn() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setBusy(true);
    setError(null);
    if (code === null) {
      const problem = await sendCode(phone);
      if (problem) setError(problem);
      else setCode("");
    } else {
      const problem = await verifyCode(phone, code);
      if (problem) setError(problem);
    }
    setBusy(false);
  }

  return (
    <View className="gap-3 rounded-[20px] bg-white p-[18px]">
      <T weight="semibold" className="text-base">
        Sign in with your phone
      </T>
      <T className="text-[13px] text-muted leading-[18px]">
        We text you a code. Use the same number on the web to see the same
        bills.
      </T>
      <TextInput
        accessibilityLabel="Phone number"
        className={INPUT}
        style={FONT}
        keyboardType="phone-pad"
        textContentType="telephoneNumber"
        placeholder="(415) 555-0123"
        value={phone}
        onChangeText={setPhone}
      />
      {code !== null ? (
        <TextInput
          accessibilityLabel="Code from the text"
          className={INPUT}
          style={FONT}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          maxLength={6}
          placeholder="123456"
          value={code}
          onChangeText={(v) => setCode(v.replace(/\D/g, ""))}
        />
      ) : null}
      {error ? (
        <T accessibilityRole="alert" className="text-coral-ink text-sm">
          {error}
        </T>
      ) : null}
      <Button
        label={code === null ? "Text me a code" : "Verify and sign in"}
        variant={busy || !phone.trim() ? "disabled" : "primary"}
        onPress={submit}
      />
    </View>
  );
}
