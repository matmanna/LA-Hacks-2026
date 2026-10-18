// Run from the repository root; see configure-demo-advocate.md. Dry-run is the default.
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { RoomServiceClient } from "livekit-server-sdk";
import { z } from "zod";
import {
  AgentSnapshot,
  assertConferenceBranch,
  buildDemoAdvocatePatch,
  type DemoToolIds,
  demoTools,
  matchesDemoTool,
  verifyDemoAdvocate,
} from "./demo-advocate-config";

let step = "validate local settings";
let httpStatus: number | undefined;
let mutationStarted = false;

async function main() {
  const args = process.argv.slice(2);
  assert(
    args.length === 0 || (args.length === 1 && args[0] === "--apply"),
    "Only --apply is supported",
  );
  const apply = args[0] === "--apply";
  const settings = z
    .object({
      ELEVENLABS_API_KEY: z.string().min(1),
      ELEVENLABS_AGENT_ID: z.string().min(1),
      ELEVENLABS_BRANCH_ID: z.string().min(1),
      ELEVENLABS_CONFERENCE_BRANCH_ID: z.string().min(1),
      LIVEKIT_URL: z.url(),
      LIVEKIT_API_KEY: z.string().min(1),
      LIVEKIT_API_SECRET: z.string().min(1),
    })
    .parse(process.env);
  assert.notEqual(
    settings.ELEVENLABS_CONFERENCE_BRANCH_ID,
    settings.ELEVENLABS_BRANCH_ID,
    "Conference and original branches must differ",
  );
  const output = fileURLToPath(new URL("../../../tmp/", import.meta.url));
  await mkdir(output, { recursive: true });
  async function save(name: string, value: unknown) {
    await writeFile(
      resolve(output, name),
      `${JSON.stringify(value, null, 2)}\n`,
      { mode: 0o600 },
    );
  }
  async function api(
    path: string,
    method = "GET",
    body?: unknown,
  ): Promise<unknown> {
    const response = await fetch(`https://api.elevenlabs.io/v1/convai${path}`, {
      method,
      headers: {
        "xi-api-key": settings.ELEVENLABS_API_KEY,
        "content-type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(30_000),
    });
    httpStatus = response.status;
    if (!response.ok) {
      const failure = await response.json().catch(() => ({}));
      const redact = (value: unknown) => {
        let text = String(value ?? "");
        for (const secret of [
          settings.ELEVENLABS_API_KEY,
          settings.LIVEKIT_API_KEY,
          settings.LIVEKIT_API_SECRET,
        ]) {
          text = text.replaceAll(secret, "[redacted]");
        }
        return text.slice(0, 1000);
      };
      const detail = failure?.detail;
      const validation = Array.isArray(detail)
        ? detail.map((item) => ({
            location: Array.isArray(item.loc) ? item.loc.map(redact) : [],
            type: redact(item.type),
            message: redact(item.msg),
          }))
        : [
            {
              type: redact(detail?.status),
              message: redact(
                typeof detail === "string" ? detail : detail?.message,
              ),
            },
          ];
      await save("demo-advocate-validation.json", {
        at: new Date().toISOString(),
        httpStatus,
        validation,
      });
    }
    assert(response.ok, "Provider request failed");
    return response.json();
  }
  const rooms = new RoomServiceClient(
    settings.LIVEKIT_URL.replace(/^ws/, "http"),
    settings.LIVEKIT_API_KEY,
    settings.LIVEKIT_API_SECRET,
  );
  async function ensureIdle() {
    step = "list active LiveKit rooms";
    httpStatus = undefined;
    const active = await rooms.listRooms();
    step = "refuse configuration while a LiveKit room is active";
    assert.equal(active.length, 0, "A LiveKit room is active");
  }
  await ensureIdle();
  const agent = `/agents/${encodeURIComponent(settings.ELEVENLABS_AGENT_ID)}`;
  const originalPath = `${agent}?branch_id=${encodeURIComponent(settings.ELEVENLABS_BRANCH_ID)}`;
  const targetPath = `${agent}?branch_id=${encodeURIComponent(settings.ELEVENLABS_CONFERENCE_BRANCH_ID)}`;
  step = "read and validate agent branches";
  const original = AgentSnapshot.parse(await api(originalPath));
  const current = AgentSnapshot.parse(await api(targetPath));
  assert.equal(
    original.branch_id,
    settings.ELEVENLABS_BRANCH_ID,
    "Unexpected original branch",
  );
  assertConferenceBranch(
    current,
    settings.ELEVENLABS_BRANCH_ID,
    settings.ELEVENLABS_CONFERENCE_BRANCH_ID,
  );
  const definitions = demoTools(current.branch_id);
  const catalog: unknown[] = [];
  let cursor: string | undefined;
  const cursors = new Set<string>();
  step = "read existing tools";
  do {
    const query = new URLSearchParams({ page_size: "100" });
    if (cursor) query.set("cursor", cursor);
    const page = z
      .object({
        tools: z.array(z.unknown()),
        has_more: z.boolean(),
        next_cursor: z.string().nullish(),
      })
      .parse(await api(`/tools?${query}`));
    catalog.push(...page.tools);
    cursor = page.has_more ? (page.next_cursor ?? undefined) : undefined;
    assert(
      !page.has_more || (cursor && !cursors.has(cursor)),
      "Invalid tool pagination",
    );
    if (cursor) cursors.add(cursor);
  } while (cursor);

  const ids = {} as DemoToolIds;
  const missing = [];
  for (const definition of definitions) {
    const existing = catalog.find((tool) => matchesDemoTool(tool, definition));
    ids[definition.name] = existing
      ? z.object({ id: z.string() }).parse(existing).id
      : `CREATE_${definition.name}`;
    if (!existing) missing.push(definition);
  }
  // This preview contains only our patch and tool definitions, never credentials or provider headers.
  await save("demo-advocate-proposed.json", {
    mode: apply ? "apply" : "dry-run",
    patch: buildDemoAdvocatePatch(current, ids),
    createTools: missing,
    retained: {
      model: current.conversation_config.agent.prompt.llm,
      voice: current.conversation_config.tts.voice_id,
      maxDurationSeconds:
        current.conversation_config.conversation.max_duration_seconds,
      backgroundVoiceDetection:
        current.conversation_config.vad.background_voice_detection,
    },
  });
  if (!apply) {
    console.log(
      JSON.stringify({
        dryRun: true,
        proposed: "tmp/demo-advocate-proposed.json",
        toolsToCreate: missing.map((tool) => tool.name),
        callsPlaced: 0,
      }),
    );
    return;
  }
  await ensureIdle();
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  step = "save branch backup";
  const backupFile = `demo-advocate-backup-${stamp}.json`;
  await save(backupFile, current);
  for (const definition of missing) {
    step = `create dedicated ${definition.name} tool`;
    mutationStarted = true;
    const created = await api("/tools", "POST", { tool_config: definition });
    assert(
      matchesDemoTool(created, definition),
      "Tool creation verification failed",
    );
    ids[definition.name] = z.object({ id: z.string() }).parse(created).id;
  }
  await ensureIdle();
  step = "confirm branch has not changed during preparation";
  assert.equal(
    AgentSnapshot.parse(await api(targetPath)).version_id,
    current.version_id,
    "Conference branch changed concurrently",
  );
  const patch = buildDemoAdvocatePatch(current, ids);
  step = "update the conference branch";
  mutationStarted = true;
  await api(targetPath, "PATCH", patch);
  step = "verify the updated conference branch";
  const verified = AgentSnapshot.parse(await api(targetPath));
  verifyDemoAdvocate(current, verified, ids);
  step = "verify the original branch is unchanged";
  assert.equal(
    AgentSnapshot.parse(await api(originalPath)).version_id,
    original.version_id,
    "Original branch changed unexpectedly",
  );
  await save("demo-advocate-verified.json", {
    branchId: verified.branch_id,
    versionId: verified.version_id,
    patch,
    originalBranchUnchanged: true,
  });
  console.log(
    JSON.stringify({
      configured: true,
      conversationStages: 0,
      tools: Object.keys(ids),
      backup: `tmp/${backupFile}`,
      originalBranchUnchanged: true,
      callsPlaced: 0,
    }),
  );
}

main().catch((error: unknown) => {
  // Provider errors may echo credentials or personal data; report only the operation and status.
  console.error(
    JSON.stringify({
      configured: false,
      failedAt: step,
      httpStatus,
      errorType: error instanceof Error ? error.name : "UnknownError",
      callsPlaced: 0,
      note: mutationStarted
        ? "Check the ignored tmp backup/proposal before retrying; partial configuration may have been applied."
        : "No hosted settings were changed.",
    }),
  );
  process.exitCode = 1;
});
