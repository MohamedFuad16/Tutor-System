import assert from "node:assert/strict";
import test from "node:test";

import {
  VOICE_AGENT_TOOL_DEFINITIONS,
  buildVoiceFunctionCallResponse,
  parseVoiceFunctionArguments,
  voiceAgentToolNames,
} from "../.tmp-test/voiceAgentTools.mjs";

test("voice agent tool definitions expose local study tools", () => {
  assert.deepEqual(voiceAgentToolNames, [
    "look_at_study_context",
    "update_graph",
    "generate_flashcards",
    "evaluate_answer",
    "look_at_current_page",
    "render_diagram",
    "web_search",
  ]);
  assert.equal(VOICE_AGENT_TOOL_DEFINITIONS.length, 7);
  assert.equal(
    VOICE_AGENT_TOOL_DEFINITIONS.every((tool) => !("endpoint" in tool)),
    true,
  );
  const webSearchTool = VOICE_AGENT_TOOL_DEFINITIONS.find(
    (tool) => tool.name === "web_search",
  );
  assert.deepEqual(webSearchTool.parameters.required, ["query"]);
  assert.deepEqual(webSearchTool.parameters.properties.mode.enum, [
    "search",
    "news",
  ]);
  const currentPageTool = VOICE_AGENT_TOOL_DEFINITIONS.find(
    (tool) => tool.name === "look_at_current_page",
  );
  assert.deepEqual(currentPageTool.parameters.required, ["query"]);
  assert.match(currentPageTool.description, /flowchart/);
  assert.match(currentPageTool.description, /focus/);
  const renderDiagramTool = VOICE_AGENT_TOOL_DEFINITIONS.find(
    (tool) => tool.name === "render_diagram",
  );
  assert.deepEqual(renderDiagramTool.parameters.required, ["title", "mermaid"]);
  assert.match(renderDiagramTool.description, /Mermaid/);
  assert.match(renderDiagramTool.description, /focus tour/);
  assert.match(webSearchTool.description, /external image/);
  const evaluateAnswerTool = VOICE_AGENT_TOOL_DEFINITIONS.find(
    (tool) => tool.name === "evaluate_answer",
  );
  assert.deepEqual(evaluateAnswerTool.parameters.required, [
    "conceptId",
    "question",
    "learnerAnswer",
  ]);
  assert.deepEqual(evaluateAnswerTool.parameters.properties.evidenceType.enum, [
    "recognition",
    "generation",
    "transfer",
  ]);
});

test("voice function arguments parse Deepgram arguments and input fields", () => {
  assert.deepEqual(
    parseVoiceFunctionArguments({
      arguments: '{"name":"Closures","understandingDelta":0.1}',
    }),
    { name: "Closures", understandingDelta: 0.1 },
  );
  assert.deepEqual(parseVoiceFunctionArguments({ input: '{"cards":[]}' }), {
    cards: [],
  });
});

test("voice function call response preserves id, name, and thought signature", () => {
  const response = buildVoiceFunctionCallResponse(
    {
      id: "fc_123",
      name: "look_at_study_context",
      thought_signature: "sig_abc",
    },
    { status: "ready" },
  );

  assert.deepEqual(response, {
    type: "FunctionCallResponse",
    id: "fc_123",
    name: "look_at_study_context",
    content: '{"status":"ready"}',
    thought_signature: "sig_abc",
  });
});
