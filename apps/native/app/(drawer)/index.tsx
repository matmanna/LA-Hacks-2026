import { useQueries } from "@tanstack/react-query";
import { router, useFocusEffect } from "expo-router";
import { Button, Card, Chip, Spinner } from "heroui-native";
import { useCallback, useState } from "react";
import { Pressable, RefreshControl, Text, View } from "react-native";

import { Container } from "@/components/container";
import { loadCases, type SavedCase, saveCase } from "@/lib/cases";
import { errorMessage } from "@/lib/errors";
import { money, STATUS_LABEL, when } from "@/lib/format";
import { choosePhotos, type Page, takePhoto } from "@/lib/photos";
import { client, orpc } from "@/utils/orpc";

const SAMPLE_ID = "SB-01";

export default function Bills() {
  const [saved, setSaved] = useState<SavedCase[]>([]);
  const [busy, setBusy] = useState<null | "photo" | "sample">(null);
  const [error, setError] = useState<string | null>(null);

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

  async function upload(getPages: () => Promise<Page[] | null>) {
    setError(null);
    let caseId: string | null = null;
    try {
      const pages = await getPages();
      if (!pages) return;
      setBusy("photo");
      const created = await client.case.create({});
      caseId = created.id;
      await saveCase({
        id: caseId,
        createdAt: new Date().toISOString(),
        label: `Photo, ${pages.length} page${pages.length === 1 ? "" : "s"}`,
      });
      await client.bill.parsePhoto({ caseId, pages });
      router.push({ pathname: "/case/[id]", params: { id: caseId } });
    } catch (e) {
      setError(
        caseId
          ? `We couldn't read this photo. ${errorMessage(e)}`
          : errorMessage(e),
      );
    } finally {
      setBusy(null);
      void reload();
    }
  }

  async function startSample() {
    setError(null);
    setBusy("sample");
    try {
      const created = await client.case.create({ sample: SAMPLE_ID });
      await saveCase({
        id: created.id,
        createdAt: new Date().toISOString(),
        label: `Sample bill ${SAMPLE_ID} (synthetic)`,
      });
      router.push({ pathname: "/case/[id]", params: { id: created.id } });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
      void reload();
    }
  }

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

        <Button onPress={() => upload(takePhoto)} isDisabled={busy !== null}>
          {busy === "photo" ? (
            <Spinner size="sm" color="default" />
          ) : (
            <Button.Label>Take a photo</Button.Label>
          )}
        </Button>
        <Text className="text-muted text-sm">
          {busy === "photo"
            ? "Reading your bill. We'll show you every line before checking anything."
            : "Lay the bill flat in good light."}
        </Text>
        <Button
          variant="secondary"
          onPress={() => upload(choosePhotos)}
          isDisabled={busy !== null}
        >
          <Button.Label>Choose from photos</Button.Label>
        </Button>
        <Button
          variant="ghost"
          onPress={startSample}
          isDisabled={busy !== null}
        >
          {busy === "sample" ? (
            <Spinner size="sm" color="default" />
          ) : (
            <Button.Label>Try a sample bill</Button.Label>
          )}
        </Button>
        {error ? <Text className="text-danger text-sm">{error}</Text> : null}
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
