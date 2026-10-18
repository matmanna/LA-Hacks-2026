import { describe, expect, it } from "vitest";
import {
  assertConferenceBranch,
  buildDemoAdvocatePatch,
  demoTools,
  matchesDemoTool,
  verifyDemoAdvocate,
} from "./demo-advocate-config";

const current = {
  branch_id: "conference",
  main_branch_id: "main",
  version_id: "before",
  conversation_config: {
    agent: {
      first_message: "Old greeting",
      prompt: {
        prompt: "Old prompt",
        llm: "retained-model",
        tool_ids: ["old-tool"],
        built_in_tools: { end_call: { type: "system" }, skip_turn: null },
      },
    },
    tts: { voice_id: "retained-voice", speed: 1.1 },
    conversation: { max_duration_seconds: 7200 },
    turn: {
      turn_timeout: 7,
      turn_eagerness: "normal",
      speculative_turn: true,
      silence_end_call_timeout: -1,
      spelling_patience: "auto",
      soft_timeout_config: { timeout_seconds: -1 },
    },
    vad: { background_voice_detection: true },
  },
  workflow: { nodes: { old: { type: "override_agent" } }, edges: {} },
};
const ids = {
  finish_call: "finish-id",
  pause_advocate: "pause-id",
  resume_advocate: "resume-id",
};

describe("demo advocate configuration", () => {
  it("removes the forced stages and alternative tools without changing audio or model settings", () => {
    const patch = buildDemoAdvocatePatch(current, ids);
    expect(patch.workflow).toEqual({
      nodes: { start_node: { type: "start", edge_order: [] } },
      edges: {},
    });
    expect(patch.procedures).toEqual({});
    expect(patch.conversation_config.agent.prompt.tool_ids).toEqual([
      "finish-id",
      "pause-id",
      "resume-id",
    ]);
    expect(patch.conversation_config.agent.prompt.tools).toEqual([]);
    expect(patch.conversation_config.agent.prompt.built_in_tools).toEqual({
      end_call: null,
      skip_turn: {
        type: "system",
        name: "skip_turn",
        description: expect.any(String),
        params: { system_tool_type: "skip_turn" },
      },
    });
    expect(patch.conversation_config).not.toHaveProperty("tts");
    expect(patch.conversation_config).not.toHaveProperty("conversation");
    expect(patch.conversation_config.turn).toEqual({
      ...current.conversation_config.turn,
      turn_timeout: 20,
      turn_eagerness: "patient",
      speculative_turn: false,
    });
    expect(patch.conversation_config).not.toHaveProperty("vad");
    expect(patch.conversation_config.agent.prompt).not.toHaveProperty("llm");
    expect(current.conversation_config.agent.prompt.tool_ids).toEqual([
      "old-tool",
    ]);
  });

  it("rejects a missing, original, main, or mismatched branch before any write", () => {
    expect(() =>
      assertConferenceBranch(current, "main", "conference"),
    ).not.toThrow();
    for (const target of [undefined, "main", "different"]) {
      expect(() => assertConferenceBranch(current, "main", target)).toThrow();
    }
    expect(() =>
      assertConferenceBranch(current, undefined, "conference"),
    ).toThrow();
    expect(() =>
      assertConferenceBranch(current, "conference", "conference"),
    ).toThrow();
  });

  it("only reuses a tool with matching behavior and no configured response mocks", () => {
    const definition = demoTools("conference")[0];
    expect(definition).toBeDefined();
    if (!definition) return;
    const response = {
      id: "tool-id",
      tool_config: {
        ...definition,
        interruption_mode: "allow",
        parameters: {
          ...definition.parameters,
          description: null,
          additional_properties: false,
        },
      },
      response_mocks: [],
    };
    expect(matchesDemoTool(response, definition)).toBe(true);
    expect(
      matchesDemoTool(
        {
          ...response,
          tool_config: { ...definition, expects_response: false },
        },
        definition,
      ),
    ).toBe(false);
    expect(
      matchesDemoTool(
        { ...response, response_mocks: [{ mock_result: "success" }] },
        definition,
      ),
    ).toBe(false);
    expect(
      matchesDemoTool(
        {
          ...response,
          tool_config: { ...definition, description: "Old shared tool" },
        },
        definition,
      ),
    ).toBe(false);
    for (const tool of demoTools("conference")) {
      expect(tool.type).toBe("client");
      expect(tool.expects_response).toBe(true);
      expect(tool.parameters).toEqual({
        type: "object",
        properties: {},
        required: [],
      });
    }
  });

  it("rejects a provider update that changes protected settings or leaves old workflow nodes", () => {
    const patch = buildDemoAdvocatePatch(current, ids);
    const updated = {
      ...current,
      ...patch,
      conversation_config: {
        ...current.conversation_config,
        ...patch.conversation_config,
        turn: {
          ...current.conversation_config.turn,
          ...patch.conversation_config.turn,
        },
        agent: {
          ...current.conversation_config.agent,
          ...patch.conversation_config.agent,
          prompt: {
            ...current.conversation_config.agent.prompt,
            ...patch.conversation_config.agent.prompt,
          },
        },
      },
    };
    expect(() => verifyDemoAdvocate(current, updated, ids)).not.toThrow();
    expect(() =>
      verifyDemoAdvocate(
        current,
        { ...updated, workflow: current.workflow },
        ids,
      ),
    ).toThrow();
    const changedVoice = structuredClone(updated);
    changedVoice.conversation_config.tts.voice_id = "different-voice";
    expect(() => verifyDemoAdvocate(current, changedVoice, ids)).toThrow();
    const changedLimit = structuredClone(updated);
    changedLimit.conversation_config.conversation.max_duration_seconds = 60;
    expect(() => verifyDemoAdvocate(current, changedLimit, ids)).toThrow();
    const changedSilenceLimit = structuredClone(updated);
    changedSilenceLimit.conversation_config.turn.silence_end_call_timeout = 30;
    expect(() =>
      verifyDemoAdvocate(current, changedSilenceLimit, ids),
    ).toThrow();
    const changedSpellPatience = structuredClone(updated);
    changedSpellPatience.conversation_config.turn.spelling_patience = "off";
    expect(() =>
      verifyDemoAdvocate(current, changedSpellPatience, ids),
    ).toThrow();
    for (const tool of [
      { skip_turn: null },
      { end_call: { type: "system", name: "end_call" } },
      {
        skip_turn: {
          type: "system",
          name: "skip_turn",
          params: { system_tool_type: "end_call" },
        },
      },
    ]) {
      const changedTool = structuredClone(updated);
      Object.assign(
        changedTool.conversation_config.agent.prompt.built_in_tools,
        tool,
      );
      expect(() => verifyDemoAdvocate(current, changedTool, ids)).toThrow();
    }
  });
});
