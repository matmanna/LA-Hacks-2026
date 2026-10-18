import { router } from "expo-router";
import { useState } from "react";
import { TextInput } from "react-native";

import { Button, Screen, T } from "@/components/bb";
import { saveCase } from "@/lib/cases";
import { errorMessage } from "@/lib/errors";
import { client } from "@/utils/orpc";

// Paste the bill's text instead of a photo (bill.parseText).
export default function Paste() {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function check() {
    setError(null);
    setBusy(true);
    try {
      const { id } = await client.case.create({});
      await saveCase({
        id,
        createdAt: new Date().toISOString(),
        label: "Pasted bill",
      });
      await client.bill.parseText({ caseId: id, text });
      router.replace({ pathname: "/case/[id]/reading", params: { id } });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      nav="close"
      footer={
        <Button
          label="Check my bill"
          variant={text.trim() ? "primary" : "disabled"}
          busy={busy}
          onPress={check}
        />
      }
    >
      <T
        weight="semibold"
        className="text-[28px] leading-[34px] tracking-tight"
      >
        Paste your bill
      </T>
      <T className="mt-1.5 text-base text-muted leading-6">
        Copy the itemized lines from your patient portal or email.
      </T>
      <TextInput
        accessibilityLabel="Bill text"
        multiline
        value={text}
        onChangeText={setText}
        placeholder="09/14 99284 ED VISIT LEVEL 4  2,950.00"
        placeholderTextColor="#5B6B7C"
        textAlignVertical="top"
        className="mt-5 min-h-[260px] rounded-2xl border border-hairline p-4 text-[15px] text-foreground"
        style={{ fontFamily: "Geist_400Regular" }}
      />
      {error ? <T className="mt-3 text-coral-ink text-sm">{error}</T> : null}
    </Screen>
  );
}
