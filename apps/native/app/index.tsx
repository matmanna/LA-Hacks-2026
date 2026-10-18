import { useQueries } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { Card, Chip } from "heroui-native";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, Text, View } from "react-native";

import { Button } from "@/components/bb";
import { Container } from "@/components/container";
import { loadCases, type SavedCase } from "@/lib/cases";
import { money, STATUS_LABEL, when } from "@/lib/format";
import { orpc } from "@/utils/orpc";

// Placeholder home until W2 Home lands (PR 7). Scanning starts at /scan.
export default function Bills() {
  const [saved, setSaved] = useState<SavedCase[]>([]);

  const reload = useCallback(async () => setSaved(await loadCases()), []);
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  // One case.get per bill on this phone, refreshed while the screen is open.
  const cases = useQueries({
    queries: saved.map((c) => ({
      ...orpc.case.get.queryOptions({ input: { caseId: c.id } }),
      refetchInterval: 10_000,
    })),
  });

  return (
    <Container
      className="p-5"
      scrollViewProps={{
        refreshControl: (
          <RefreshControl
            refreshing={false}
            onRefresh={() => {
              void reload();
              for (const q of cases) void q.refetch();
            }}
          />
        ),
      }}
    >
      <View className="gap-3">
        <Text className="font-semibold text-3xl text-foreground">
          Check your bill
        </Text>
        <Text className="text-muted">
          Itemized bills work best. Up to 3 pages, one photo per page.
        </Text>
        <Button label="Check my bill" onPress={() => router.push("/scan")} />
      </View>

      <Text className="mt-8 mb-3 font-semibold text-foreground text-xl">
        Your bills
      </Text>
      {saved.length === 0 ? (
        <Text className="text-muted">
          Bills you check on this phone show up here.
        </Text>
      ) : (
        <View className="gap-3">
          {saved.map((c, index) => {
            const q = cases[index];
            const detail = q?.data;
            return (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                onPress={() =>
                  router.push({ pathname: "/case/[id]", params: { id: c.id } })
                }
              >
                <Card variant="secondary" className="gap-1 p-4">
                  <View className="flex-row items-center justify-between gap-2">
                    <Card.Title className="flex-1">
                      {detail?.bill?.hospital.name ?? c.label}
                    </Card.Title>
                    <Chip size="sm" variant="secondary">
                      <Chip.Label>
                        {q?.isError
                          ? "Offline"
                          : (STATUS_LABEL[detail?.case.status ?? ""] ??
                            "Loading")}
                      </Chip.Label>
                    </Chip>
                  </View>
                  {detail?.audit ? (
                    <Text className="text-foreground">
                      {detail.audit.flags.length} flags,{" "}
                      {money(detail.audit.savings.confirmedCents)} confirmed
                    </Text>
                  ) : null}
                  <Card.Description>
                    Started {when(c.createdAt)}
                  </Card.Description>
                </Card>
              </Pressable>
            );
          })}
        </View>
      )}

      <Text className="mt-8 text-muted text-xs">
        Demo uses synthetic bills only. BetterBill is informational, not legal
        or medical advice.
      </Text>
    </Container>
  );
}
