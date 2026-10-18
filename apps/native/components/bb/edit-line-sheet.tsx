import type { Line } from "@betterbill/core";
import { formatMoney, parseMoneyToCents } from "@betterbill/core/money";
import { useEffect, useState } from "react";
import { Modal, Pressable, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { lineName } from "@/lib/format";
import { printedLine } from "./bill-mock";
import { Button } from "./button";
import { T } from "./t";

const INPUT =
  "h-12 rounded-xl border border-hairline px-3.5 text-base text-foreground";
const FONT = { fontFamily: "Geist_400Regular" };

type Props = {
  line: Line | null;
  onSave: (line: Line) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
};

// E1 Edit a line: a bottom sheet over the confirm screen.
export function EditLineSheet({ line, onSave, onRemove, onClose }: Props) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [units, setUnits] = useState(1);
  const [amount, setAmount] = useState("");

  useEffect(() => {
    if (!line) return;
    setName(lineName(line));
    setCode(line.code ?? "");
    setUnits(line.units);
    setAmount(formatMoney(line.chargeCents));
  }, [line]);

  const cents = parseMoneyToCents(amount);
  const valid = name.trim() !== "" && cents !== null && cents >= 0;

  function save() {
    if (!line || cents === null) return;
    // Keep the printed description unless the user renamed the line.
    const renamed = name.trim() !== lineName(line);
    const next = {
      ...line,
      description: renamed ? name.trim() : line.description,
      code: code.trim() || null,
      units,
      chargeCents: cents,
    };
    const changed =
      renamed ||
      next.code !== line.code ||
      next.units !== line.units ||
      next.chargeCents !== line.chargeCents;
    onSave({ ...next, userEdited: line.userEdited || changed });
  }

  return (
    <Modal
      visible={line !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityLabel="Close"
        className="flex-1 bg-ink/45"
        onPress={onClose}
      />
      {line ? (
        <View
          className="gap-[18px] rounded-t-3xl bg-white px-5 pt-2.5"
          style={{ paddingBottom: insets.bottom + 24 }}
        >
          <View className="h-[5px] w-10 self-center rounded-full bg-hairline" />
          <View className="gap-1">
            <T weight="semibold" className="text-[22px] leading-7">
              Fix this line
            </T>
            <T className="text-muted text-sm">Change anything we read wrong.</T>
          </View>

          <View className="gap-1.5">
            <View className="flex-row justify-between rounded-[10px] bg-paper px-3 py-2.5">
              <T
                className="text-[#2A3440] text-xs"
                style={{ fontFamily: "Courier New" }}
              >
                {printedLine(line).text}
              </T>
              <T
                className="text-[#2A3440] text-xs"
                style={{ fontFamily: "Courier New" }}
              >
                {printedLine(line).amount}
              </T>
            </View>
            <T className="text-muted text-xs">
              From your photo, page {line.source.page}
            </T>
          </View>

          <Field label="What it was">
            <TextInput
              accessibilityLabel="What it was"
              value={name}
              onChangeText={setName}
              className={INPUT}
              style={FONT}
            />
          </Field>

          <View className="flex-row gap-3">
            <Field label="Code" grow>
              <TextInput
                accessibilityLabel="Code"
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
                className={INPUT}
                style={FONT}
              />
            </Field>
            <Field label="Units" grow>
              <View className="h-12 flex-row items-center justify-between rounded-xl border border-hairline px-1">
                <Step
                  label="Fewer units"
                  sign="−"
                  onPress={() => setUnits((u) => Math.max(1, u - 1))}
                />
                <T weight="semibold" className="text-base">
                  {units}
                </T>
                <Step
                  label="More units"
                  sign="+"
                  onPress={() => setUnits((u) => u + 1)}
                />
              </View>
            </Field>
          </View>

          <Field label="Amount">
            <TextInput
              accessibilityLabel="Amount"
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              className={INPUT}
              style={FONT}
            />
          </Field>

          <View className="gap-1 pt-1">
            <Button
              label="Save"
              variant={valid ? "primary" : "disabled"}
              onPress={save}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => onRemove(line.id)}
              className="h-11 items-center justify-center"
            >
              <T weight="medium" className="text-[15px] text-coral-ink">
                Remove this line
              </T>
            </Pressable>
          </View>
        </View>
      ) : null}
    </Modal>
  );
}

function Field({
  label,
  grow = false,
  children,
}: {
  label: string;
  grow?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View className={grow ? "flex-1 gap-1.5" : "gap-1.5"}>
      <T weight="semibold" className="text-[13px] text-muted">
        {label}
      </T>
      {children}
    </View>
  );
}

function Step({
  label,
  sign,
  onPress,
}: {
  label: string;
  sign: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className="size-10 items-center justify-center rounded-[10px] bg-wash"
    >
      <T className="text-xl">{sign}</T>
    </Pressable>
  );
}
