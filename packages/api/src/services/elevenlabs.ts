// ElevenLabs Agents over REST (no SDK, so no lockfile change). The agent dials
// out through the Photon SIP trunk imported into ElevenLabs, so Photon needs no
// API call at runtime. Server-only.
// Docs (UNVERIFIED against a live call): https://elevenlabs.io/docs/api-reference
import { type CallVars, DISCLOSURE } from "@betterbill/core";

const BASE_URL = "https://api.elevenlabs.io/v1/convai";

export type Conversation = {
  status: string;
  transcript?: {
    role: string;
    message: string | null;
    time_in_call_secs?: number;
  }[];
  analysis?: {
    transcript_summary?: string | null;
    data_collection_results?: Record<string, { value?: unknown }>;
  } | null;
  metadata?: { call_duration_secs?: number | null };
};

// ponytail: test-only provider. Its conversation says it is fake, so it can
// never pass for a real call.
const FAKE_PREFIX = "fake_";
const FAKE_CONVERSATION: Conversation = {
  status: "done",
  transcript: [
    {
      role: "agent",
      message: `${DISCLOSURE} This call may be recorded and transcribed. Is it okay to continue?`,
      time_in_call_secs: 0,
    },
    {
      role: "user",
      message: "Fake test reply. This call never reached a real phone.",
      time_in_call_secs: 4,
    },
  ],
  analysis: { transcript_summary: "Fake test call. No phone call was placed." },
  metadata: { call_duration_secs: 5 },
};

function settings() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) throw new Error("ELEVENLABS_API_KEY is not set");
  return key;
}

export async function startOutboundCall(
  req: { to: string; vars: CallVars },
  opts: { fetch?: typeof fetch } = {},
): Promise<{ conversationId: string }> {
  if (process.env.BB_FAKE_PROVIDERS === "1") {
    return { conversationId: `${FAKE_PREFIX}${crypto.randomUUID()}` };
  }
  const key = settings();
  const agentId = process.env.ELEVENLABS_AGENT_ID;
  const phoneNumberId = process.env.ELEVENLABS_PHONE_NUMBER_ID;
  if (!agentId || !phoneNumberId) {
    throw new Error(
      "ELEVENLABS_AGENT_ID or ELEVENLABS_PHONE_NUMBER_ID is not set",
    );
  }
  const res = await (opts.fetch ?? fetch)(
    `${BASE_URL}/sip-trunk/outbound-call`,
    {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        agent_id: agentId,
        agent_phone_number_id: phoneNumberId,
        to_number: req.to,
        conversation_initiation_client_data: {
          dynamic_variables: req.vars,
          branch_id: process.env.ELEVENLABS_BRANCH_ID || undefined,
        },
      }),
      signal: AbortSignal.timeout(20_000),
    },
  );
  if (!res.ok) throw new Error(`ElevenLabs call failed: ${res.status}`);
  const body = (await res.json()) as {
    success?: boolean;
    message?: string;
    conversation_id?: string | null;
  };
  if (body.success === false || !body.conversation_id) {
    throw new Error(body.message || "ElevenLabs did not start the call");
  }
  return { conversationId: body.conversation_id };
}

export async function getConversation(
  conversationId: string,
  opts: { fetch?: typeof fetch } = {},
): Promise<Conversation> {
  if (conversationId.startsWith(FAKE_PREFIX)) return FAKE_CONVERSATION;
  const res = await (opts.fetch ?? fetch)(
    `${BASE_URL}/conversations/${encodeURIComponent(conversationId)}`,
    {
      headers: { "xi-api-key": settings() },
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!res.ok) throw new Error(`ElevenLabs conversation failed: ${res.status}`);
  return (await res.json()) as Conversation;
}
