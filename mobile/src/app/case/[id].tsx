import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Card, Note, styles as ui } from "@/components";
import { api, type CaseDetail, type CaseEvent, errorMessage } from "@/lib/api";
import { money, STATUS_LABEL, when } from "@/lib/format";
import { color } from "@/lib/theme";

const POLL_MS = 5000;

const TIER_LABEL: Record<string, string> = {
  confirmed: "Confirmed from your bill",
  rule: "Billing rule",
  published: "Hospital's published price",
  estimate: "Estimate",
};

const ACTOR: Record<string, string> = {
  user: "by you",
  agent: "by BetterBill",
  system: "automatic",
};

export default function CaseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [events, setEvents] = useState<CaseEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [checking, setChecking] = useState(false);
  const mounted = useRef(true);

  const load = useCallback(async () => {
    try {
      const [d, e] = await Promise.all([
        api.case.get({ caseId: id }),
        api.event.list({ caseId: id }),
      ]);
      if (!mounted.current) return;
      setDetail(d);
      setEvents(e);
      setError(null);
    } catch (e) {
      if (mounted.current) setError(errorMessage(e));
    }
  }, [id]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Poll while the screen is open so status changes show up over time.
  useFocusEffect(
    useCallback(() => {
      void load();
      const timer = setInterval(load, POLL_MS);
      return () => clearInterval(timer);
    }, [load]),
  );

  async function looksRight() {
    if (!detail?.bill) return;
    setChecking(true);
    try {
      await api.bill.confirmLines({
        caseId: id,
        lines: detail.bill.lines,
        eob: detail.eob,
      });
      await api.audit.run({ caseId: id });
      await load();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setChecking(false);
    }
  }

  const bill = detail?.bill;
  const audit = detail?.audit;
  const status = detail?.case.status;

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={local.page}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        {error ? <Note tone="error">{error}</Note> : null}
        {!detail && !error ? <Note>Loading your bill</Note> : null}

        {detail ? (
          <>
            <Text style={ui.h1}>
              {bill?.hospital.name ?? detail.case.hospitalName ?? "Your bill"}
            </Text>
            <Text style={[ui.body, { color: color.mutedForeground }]}>
              {STATUS_LABEL[status ?? ""] ?? status}
            </Text>
          </>
        ) : null}

        {audit ? (
          <View style={local.balance}>
            <Text style={local.balanceTitle}>Your fair balance</Text>
            <Text style={local.balanceNumber}>
              {money(audit.balance.fairBalanceCents)}
            </Text>
            {audit.balance.lessThanBilledCents > 0 ? (
              <Text style={local.balanceChip}>
                {money(-audit.balance.lessThanBilledCents)} less than billed
              </Text>
            ) : null}
            <Text style={local.balanceCaption}>
              Billed {money(audit.balance.billedCents)}.
              {audit.balance.isEstimate ? " Includes estimates." : ""}
            </Text>
          </View>
        ) : null}

        {bill && !audit ? (
          <Card>
            <Text style={ui.h2}>Check what we read</Text>
            <Note>
              {bill.lines.length} lines. Editing lines comes in the next
              version; tap Looks right if they match your bill.
            </Note>
            {bill.lines.map((line) => (
              <View key={line.id} style={local.line}>
                <View style={{ flex: 1 }}>
                  <Text style={ui.body}>{line.description}</Text>
                  <Note>
                    {[
                      line.code,
                      line.serviceDate,
                      `${line.units} unit${line.units === 1 ? "" : "s"}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    {line.confidence < 0.7 ? "  Please check this line." : ""}
                  </Note>
                </View>
                <Text style={[ui.body, { fontWeight: "600" }]}>
                  {money(line.chargeCents)}
                </Text>
              </View>
            ))}
            <Button label="Looks right" busy={checking} onPress={looksRight} />
          </Card>
        ) : null}

        {detail && !bill ? (
          <Note>
            No lines yet. If you just took a photo, pull to refresh in a moment.
          </Note>
        ) : null}

        {audit ? (
          <View style={{ gap: 8 }}>
            <Text style={ui.h2}>What looks wrong ({audit.flags.length})</Text>
            {audit.flags.length === 0 ? (
              <Note>
                We checked {bill?.lines.length ?? 0} lines and found nothing to
                flag.
              </Note>
            ) : (
              audit.flags.map((flag) => (
                <Card key={flag.id}>
                  <View style={local.row}>
                    <Text style={[ui.body, { flex: 1, fontWeight: "600" }]}>
                      {flag.title}
                    </Text>
                    <Text style={{ color: color.coralInk, fontWeight: "600" }}>
                      {money(flag.amountCents)}
                    </Text>
                  </View>
                  <Text style={ui.body}>{flag.explanation}</Text>
                  <Note>{TIER_LABEL[flag.tier] ?? flag.tier}</Note>
                </Card>
              ))
            )}
            <Card>
              <Text style={{ color: color.mintInk, fontWeight: "600" }}>
                {money(audit.savings.confirmedCents)} confirmed
              </Text>
              {audit.savings.potentialHighCents > 0 ? (
                <Note>
                  Plus {money(audit.savings.potentialLowCents)} to{" "}
                  {money(audit.savings.potentialHighCents)} possible (estimate)
                </Note>
              ) : null}
            </Card>
          </View>
        ) : null}

        {events.length > 0 ? (
          <View style={{ gap: 4 }}>
            <Text style={ui.h2}>Activity</Text>
            {events.map((event, index) => (
              <View key={event.id} style={local.event}>
                <View style={local.dotColumn}>
                  <View style={local.dot} />
                  {index < events.length - 1 ? (
                    <View style={local.connector} />
                  ) : null}
                </View>
                <View style={{ flex: 1, paddingBottom: 16 }}>
                  <Text style={ui.body}>{event.summary}</Text>
                  <Note>
                    {when(event.at)} · {ACTOR[event.actor] ?? event.actor}
                  </Note>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <Note>BetterBill is informational, not legal or medical advice.</Note>
      </ScrollView>
    </SafeAreaView>
  );
}

const local = StyleSheet.create({
  page: { padding: 20, gap: 16 },
  balance: {
    backgroundColor: color.ink,
    borderRadius: 16,
    padding: 20,
    gap: 8,
  },
  balanceTitle: { color: "rgba(255,255,255,0.9)", fontSize: 20 },
  balanceNumber: { color: color.mint, fontSize: 44, fontWeight: "300" },
  balanceChip: {
    alignSelf: "flex-start",
    backgroundColor: "#D1FAE5",
    color: color.mintInk,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: "600",
    overflow: "hidden",
  },
  balanceCaption: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  line: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  row: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  event: { flexDirection: "row", gap: 12 },
  dotColumn: { width: 16, alignItems: "center" },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: color.mint,
    marginTop: 6,
  },
  connector: { flex: 1, width: 1, backgroundColor: color.mint },
});
