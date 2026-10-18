import { afterEach, describe, expect, it, vi } from "vitest";

import { getConversation, startOutboundCall } from "./elevenlabs";

const vars = {
  hospital_name: "Example Hospital",
  account_last4: "4321",
  disputed_items: "Duplicate lab charge, $84.00",
  ask: "Please review these items.",
};

function reply(status: number, body: object) {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json(body, { status }));
}

function configure() {
  vi.stubEnv("BB_FAKE_PROVIDERS", "");
  vi.stubEnv("ELEVENLABS_API_KEY", "xi_test");
  vi.stubEnv("ELEVENLABS_AGENT_ID", "agent_1");
  vi.stubEnv("ELEVENLABS_BRANCH_ID", "");
  vi.stubEnv("ELEVENLABS_PHONE_NUMBER_ID", "phone_1");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("startOutboundCall", () => {
  it("uses the labelled fake only when BB_FAKE_PROVIDERS=1", async () => {
    vi.stubEnv("BB_FAKE_PROVIDERS", "1");
    const fetch = reply(200, {});
    const { conversationId } = await startOutboundCall(
      { to: "+1", vars },
      { fetch },
    );
    expect(conversationId.startsWith("fake_")).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
    const conv = await getConversation(conversationId, { fetch });
    expect(conv.analysis?.transcript_summary).toContain(
      "No phone call was placed",
    );
  });

  it("refuses to call without the ElevenLabs settings", async () => {
    vi.stubEnv("BB_FAKE_PROVIDERS", "");
    vi.stubEnv("ELEVENLABS_API_KEY", "");
    await expect(
      startOutboundCall({ to: "+1", vars }, { fetch: reply(200, {}) }),
    ).rejects.toThrow("ELEVENLABS_API_KEY is not set");
    vi.stubEnv("ELEVENLABS_API_KEY", "xi_test");
    vi.stubEnv("ELEVENLABS_AGENT_ID", "");
    await expect(
      startOutboundCall({ to: "+1", vars }, { fetch: reply(200, {}) }),
    ).rejects.toThrow("ELEVENLABS_AGENT_ID");
  });

  it("asks the agent to dial the number with the approved variables", async () => {
    configure();
    const fetch = reply(200, { success: true, conversation_id: "conv_1" });
    expect(
      await startOutboundCall({ to: "+13105550100", vars }, { fetch }),
    ).toEqual({
      conversationId: "conv_1",
    });
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(String(url)).toBe(
      "https://api.elevenlabs.io/v1/convai/sip-trunk/outbound-call",
    );
    expect(new Headers(init?.headers).get("xi-api-key")).toBe("xi_test");
    expect(JSON.parse(String(init?.body))).toEqual({
      agent_id: "agent_1",
      agent_phone_number_id: "phone_1",
      to_number: "+13105550100",
      conversation_initiation_client_data: { dynamic_variables: vars },
    });
  });

  it("uses the selected agent branch with the approved variables", async () => {
    configure();
    vi.stubEnv("ELEVENLABS_BRANCH_ID", "agtbrch_test");
    const fetch = reply(200, { success: true, conversation_id: "conv_1" });
    await startOutboundCall({ to: "+13105550100", vars }, { fetch });
    const [, init] = fetch.mock.calls[0] ?? [];
    expect(
      JSON.parse(String(init?.body)).conversation_initiation_client_data,
    ).toEqual({ branch_id: "agtbrch_test", dynamic_variables: vars });
  });

  it("throws when ElevenLabs refuses or errors", async () => {
    configure();
    await expect(
      startOutboundCall(
        { to: "+1", vars },
        { fetch: reply(200, { success: false, message: "busy" }) },
      ),
    ).rejects.toThrow("busy");
    await expect(
      startOutboundCall({ to: "+1", vars }, { fetch: reply(500, {}) }),
    ).rejects.toThrow("500");
  });
});

describe("getConversation", () => {
  it("reads the conversation with the API key", async () => {
    configure();
    const fetch = reply(200, { status: "done" });
    expect(await getConversation("conv_1", { fetch })).toEqual({
      status: "done",
    });
    const [url, init] = fetch.mock.calls[0] ?? [];
    expect(String(url)).toBe(
      "https://api.elevenlabs.io/v1/convai/conversations/conv_1",
    );
    expect(new Headers(init?.headers).get("xi-api-key")).toBe("xi_test");
    await expect(
      getConversation("conv_1", { fetch: reply(404, {}) }),
    ).rejects.toThrow("404");
  });
});
