import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupText } from "./cleanup";
import { readText } from "./parseText";
import { STEPFUN_MODEL, stepfunChat } from "./stepfun";

const CLEAN = `HOSPITAL: Westside General Hospital (synthetic) | Los Angeles | CA
2026-09-12  85025  CPT  CBC W/ DIFFERENTIAL  1  84.00
2026-09-12  85025  CPT  CBC W/ DIFFERENTIAL  1  84.00
TOTAL CHARGES: 168.00`;
const MESSY = "Lab work 09/12  $84.00\nLab work again 84.00";
const modelJson = {
  lines: [
    {
      serviceDate: "2026-09-12",
      description: "LAB",
      code: "85025",
      codeType: "CPT",
      units: 1,
      charge: "84.00",
      confidence: 0.7,
    },
  ],
};

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("readText", () => {
  it("reads a clean bill without calling the model", async () => {
    const cleanup = vi.fn();
    const r = await readText("c1", CLEAN, cleanup);
    expect(cleanup).not.toHaveBeenCalled();
    expect(r.reader).toMatchObject({
      mode: "deterministic",
      model: null,
      cachedAt: null,
    });
    expect(r.bill.lines).toHaveLength(2);
    expect(r.reconciliation.ok).toBe(true);
    expect(r.lowConfidenceLineIds).toEqual([]);
  });

  it("falls back to model cleanup for messy text", async () => {
    vi.stubEnv("BB_READER_MODE", "live");
    const r = await readText("c2", MESSY, async () => modelJson);
    expect(r.reader).toMatchObject({
      mode: "model_cleanup",
      model: STEPFUN_MODEL,
    });
    expect(r.bill.lines[0]).toMatchObject({ id: "c2-l01", chargeCents: 8400 });
    expect(r.lowConfidenceLineIds).toEqual(["c2-l01"]);
  });

  it("keeps the deterministic result when cleanup fails or is off", async () => {
    vi.stubEnv("BB_READER_MODE", "live");
    const failed = await readText("c3", MESSY, async () => null);
    expect(failed.reader.mode).toBe("deterministic");
    expect(failed.warnings.at(-1)).toContain("could read");
    vi.stubEnv("BB_READER_MODE", "cache_only");
    const cleanup = vi.fn();
    await readText("c4", MESSY, cleanup);
    expect(cleanup).not.toHaveBeenCalled();
  });
});

describe("cleanupText", () => {
  it("returns parsed ReaderOutput", async () => {
    const chat = vi.fn(async (_messages: { role: string }[]) =>
      JSON.stringify(modelJson),
    );
    expect(await cleanupText("x", chat)).toEqual(modelJson);
    expect(chat.mock.calls[0]?.[0]?.[0]?.role).toBe("system");
  });

  it("returns null on bad JSON, bad shape, or errors", async () => {
    expect(await cleanupText("x", async () => "not json")).toBeNull();
    expect(await cleanupText("x", async () => '{"lines":"no"}')).toBeNull();
    expect(
      await cleanupText("x", async () => {
        throw new Error("down");
      }),
    ).toBeNull();
  });
});

describe("stepfunChat", () => {
  const ok = (content: string | null) =>
    vi.fn(async () =>
      Response.json({ choices: [{ message: { content } }] }),
    ) as unknown as typeof fetch;

  it("needs a key", async () => {
    vi.stubEnv("STEPFUN_API_KEY", "");
    await expect(stepfunChat([])).rejects.toThrow("STEPFUN_API_KEY");
  });

  it("posts JSON mode with the model id and returns content", async () => {
    vi.stubEnv("STEPFUN_API_KEY", "test-key");
    vi.stubEnv("STEPFUN_BASE_URL", "https://example.test/v1");
    const f = ok('{"a":1}');
    expect(
      await stepfunChat([{ role: "user", content: "hi" }], { fetch: f }),
    ).toBe('{"a":1}');
    const [url, init] =
      (f as unknown as { mock: { calls: [string, RequestInit][] } }).mock
        .calls[0] ?? [];
    expect(url).toBe("https://example.test/v1/chat/completions");
    const body = JSON.parse(String(init?.body));
    expect(body).toMatchObject({
      model: "step-5-preview",
      response_format: { type: "json_object" },
      temperature: 0,
    });
    expect(
      (init?.headers as Record<string, string> | undefined)?.authorization,
    ).toBe("Bearer test-key");
  });

  it("throws on HTTP errors and empty content", async () => {
    vi.stubEnv("STEPFUN_API_KEY", "test-key");
    const bad = vi.fn(
      async () => new Response("no", { status: 500 }),
    ) as unknown as typeof fetch;
    await expect(stepfunChat([], { fetch: bad })).rejects.toThrow("500");
    await expect(stepfunChat([], { fetch: ok(null) })).rejects.toThrow(
      "no content",
    );
  });
});
