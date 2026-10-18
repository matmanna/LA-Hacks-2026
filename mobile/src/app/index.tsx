import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button, Card, Note, styles as ui } from "@/components";
import { API_URL, api, errorMessage } from "@/lib/api";
import { loadCases, type SavedCase, saveCase } from "@/lib/cases";
import { money, STATUS_LABEL, when } from "@/lib/format";
import { choosePhotos, type Page, takePhoto } from "@/lib/photos";
import { color } from "@/lib/theme";

const SAMPLE_ID = "SB-01";

type Row = SavedCase & {
  status?: string;
  hospitalName?: string | null;
  confirmedCents?: number;
  error?: boolean;
};

export default function Home() {
  const [rows, setRows] = useState<Row[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState<null | "photo" | "sample">(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const saved = await loadCases();
    setRows(saved);
    const detailed = await Promise.all(
      saved.map(async (row): Promise<Row> => {
        try {
          const detail = await api.case.get({ caseId: row.id });
          return {
            ...row,
            status: detail.case.status,
            hospitalName: detail.case.hospitalName,
            confirmedCents: detail.case.savings?.confirmedCents,
          };
        } catch {
          return { ...row, error: true };
        }
      }),
    );
    setRows(detailed);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  async function upload(getPages: () => Promise<Page[] | null>) {
    setError(null);
    let created: { id: string } | null = null;
    try {
      const pages = await getPages();
      if (!pages) return;
      setBusy("photo");
      created = await api.case.create({});
      await saveCase({
        id: created.id,
        createdAt: new Date().toISOString(),
        label: `Photo, ${pages.length} page${pages.length === 1 ? "" : "s"}`,
      });
      await api.bill.parsePhoto({ caseId: created.id, pages });
      router.push({ pathname: "/case/[id]", params: { id: created.id } });
    } catch (e) {
      setError(
        created
          ? `We couldn't read this photo. ${errorMessage(e)} Try a flatter, brighter photo.`
          : errorMessage(e),
      );
    } finally {
      setBusy(null);
      void refresh();
    }
  }

  async function startSample() {
    setError(null);
    setBusy("sample");
    try {
      const created = await api.case.create({ sample: SAMPLE_ID });
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
    }
  }

  return (
    <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={local.page}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await refresh();
              setRefreshing(false);
            }}
          />
        }
      >
        <Text style={ui.h1}>Check your bill</Text>
        <Text style={[ui.body, { color: color.mutedForeground }]}>
          Itemized bills work best. Up to 3 pages, one photo per page.
        </Text>

        <View style={{ gap: 12 }}>
          <Button
            label={busy === "photo" ? "Reading your bill" : "Take a photo"}
            busy={busy === "photo"}
            disabled={busy !== null}
            onPress={() => upload(takePhoto)}
          />
          <Note>Lay the bill flat in good light.</Note>
          <Button
            label="Choose from photos"
            variant="secondary"
            disabled={busy !== null}
            onPress={() => upload(choosePhotos)}
          />
          <Button
            label="Try a sample bill"
            variant="ghost"
            busy={busy === "sample"}
            disabled={busy !== null}
            onPress={startSample}
          />
          {busy === "photo" ? (
            <Note>We'll show you every line before checking anything.</Note>
          ) : null}
          {error ? <Note tone="error">{error}</Note> : null}
        </View>

        <Text style={[ui.h2, { marginTop: 16 }]}>Your bills</Text>
        {rows.length === 0 ? (
          <Note>Bills you check on this phone show up here.</Note>
        ) : (
          rows.map((row) => (
            <Pressable
              key={row.id}
              accessibilityRole="button"
              onPress={() =>
                router.push({ pathname: "/case/[id]", params: { id: row.id } })
              }
            >
              <Card>
                <Text style={[ui.body, { fontWeight: "600" }]}>
                  {row.hospitalName ?? row.label}
                </Text>
                <Text style={ui.body}>
                  {row.error
                    ? "Couldn't load. Pull to refresh."
                    : (STATUS_LABEL[row.status ?? ""] ?? "Loading")}
                </Text>
                {row.confirmedCents ? (
                  <Text style={{ color: color.mintInk, fontWeight: "600" }}>
                    {money(row.confirmedCents)} confirmed
                  </Text>
                ) : null}
                <Note>Started {when(row.createdAt)}</Note>
              </Card>
            </Pressable>
          ))
        )}

        <Note>
          Server: {API_URL}. Demo uses synthetic bills only. BetterBill is
          informational, not legal or medical advice.
        </Note>
      </ScrollView>
    </SafeAreaView>
  );
}

const local = StyleSheet.create({
  page: { padding: 20, gap: 12 },
});
