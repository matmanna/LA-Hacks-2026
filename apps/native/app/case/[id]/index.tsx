import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { Button, Card, Spinner } from "heroui-native";
import { RefreshControl, Text, View } from "react-native";

import { Container } from "@/components/container";
import { errorMessage } from "@/lib/errors";
import { money, STATUS_LABEL, when } from "@/lib/format";
import { client, orpc, queryClient } from "@/utils/orpc";

// Poll while open so the status and activity update over time.
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
  const detailQuery = useQuery({
    ...orpc.case.get.queryOptions({ input: { caseId: id } }),
    refetchInterval: POLL_MS,
  });
  const eventsQuery = useQuery({
    ...orpc.event.list.queryOptions({ input: { caseId: id } }),
    refetchInterval: POLL_MS,
  });

  const confirm = useMutation({
    mutationFn: async () => {
      const bill = detailQuery.data?.bill;
      if (!bill) return;
      await client.bill.confirmLines({
        caseId: id,
        lines: bill.lines,
        eob: detailQuery.data?.eob ?? null,
      });
      await client.audit.run({ caseId: id });
    },
    onSettled: () => queryClient.invalidateQueries(),
  });

  const detail = detailQuery.data;
  const bill = detail?.bill;
  const audit = detail?.audit;
  const events = eventsQuery.data ?? [];

  return (
    <Container
      className="p-5"
      scrollViewProps={{
        refreshControl: (
          <RefreshControl
            refreshing={detailQuery.isRefetching && !detailQuery.isLoading}
            onRefresh={() => {
              void detailQuery.refetch();
              void eventsQuery.refetch();
            }}
          />
        ),
      }}
    >
      <View className="gap-4">
        {detailQuery.isError ? (
          <Text className="text-danger">{errorMessage(detailQuery.error)}</Text>
        ) : null}
        {detailQuery.isLoading ? <Spinner /> : null}

        {detail ? (
          <View>
            <Text className="font-semibold text-3xl text-foreground">
              {bill?.hospital.name ?? detail.case.hospitalName ?? "Your bill"}
            </Text>
            <Text className="text-muted">
              {STATUS_LABEL[detail.case.status] ?? detail.case.status}
            </Text>
          </View>
        ) : null}

        {audit ? (
          <Card className="gap-2 p-5">
            <Card.Title>Your fair balance</Card.Title>
            <Text className="text-4xl text-foreground">
              {money(audit.balance.fairBalanceCents)}
            </Text>
            {audit.balance.lessThanBilledCents > 0 ? (
              <Text className="font-semibold text-success">
                {money(-audit.balance.lessThanBilledCents)} less than billed
              </Text>
            ) : null}
            <Card.Description>
              Billed {money(audit.balance.billedCents)}.
              {audit.balance.isEstimate ? " Includes estimates." : ""}
            </Card.Description>
          </Card>
        ) : null}

        {bill && !audit ? (
          <Card variant="secondary" className="gap-2 p-4">
            <Card.Title>Check what we read</Card.Title>
            <Card.Description>
              {bill.lines.length} lines. Line editing comes later; tap Looks
              right if they match your bill.
            </Card.Description>
            {bill.lines.map((line) => (
              <View
                key={line.id}
                className="flex-row gap-3 border-border border-b py-2"
              >
                <View className="flex-1">
                  <Text className="text-foreground">{line.description}</Text>
                  <Text className="text-muted text-xs">
                    {[
                      line.code,
                      line.serviceDate,
                      `${line.units} unit${line.units === 1 ? "" : "s"}`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                    {line.confidence < 0.7 ? "  Please check this line." : ""}
                  </Text>
                </View>
                <Text className="font-semibold text-foreground">
                  {money(line.chargeCents)}
                </Text>
              </View>
            ))}
            <Button
              onPress={() => confirm.mutate()}
              isDisabled={confirm.isPending}
            >
              {confirm.isPending ? (
                <Spinner size="sm" color="default" />
              ) : (
                <Button.Label>Looks right</Button.Label>
              )}
            </Button>
            {confirm.isError ? (
              <Text className="text-danger text-sm">
                {errorMessage(confirm.error)}
              </Text>
            ) : null}
          </Card>
        ) : null}

        {detail && !bill ? (
          <Text className="text-muted">
            No lines yet. Pull to refresh in a moment.
          </Text>
        ) : null}

        {audit ? (
          <View className="gap-3">
            <Text className="font-semibold text-foreground text-xl">
              What looks wrong ({audit.flags.length})
            </Text>
            {audit.flags.map((flag) => (
              <Card key={flag.id} variant="secondary" className="gap-1 p-4">
                <View className="flex-row gap-3">
                  <Text className="flex-1 font-semibold text-foreground">
                    {flag.title}
                  </Text>
                  <Text className="font-semibold text-danger">
                    {money(flag.amountCents)}
                  </Text>
                </View>
                <Text className="text-foreground">{flag.explanation}</Text>
                <Card.Description>
                  {TIER_LABEL[flag.tier] ?? flag.tier}
                </Card.Description>
              </Card>
            ))}
            <Text className="font-semibold text-success">
              {money(audit.savings.confirmedCents)} confirmed
            </Text>
            {audit.savings.potentialHighCents > 0 ? (
              <Text className="text-muted">
                Plus {money(audit.savings.potentialLowCents)} to{" "}
                {money(audit.savings.potentialHighCents)} possible (estimate)
              </Text>
            ) : null}
          </View>
        ) : null}

        {events.length > 0 ? (
          <View className="gap-2">
            <Text className="font-semibold text-foreground text-xl">
              Activity
            </Text>
            {events.map((event) => (
              <View key={event.id} className="flex-row gap-3">
                <View className="mt-1.5 size-3 rounded-full border-2 border-success" />
                <View className="flex-1 pb-3">
                  <Text className="text-foreground">{event.summary}</Text>
                  <Text className="text-muted text-xs">
                    {when(event.at)} · {ACTOR[event.actor] ?? event.actor}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        <Text className="text-muted text-xs">
          BetterBill is informational, not legal or medical advice.
        </Text>
      </View>
    </Container>
  );
}
