import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const chatPanelSource = readFileSync(
  `${repoRoot}/src/components/ChatPanel.tsx`,
  "utf8",
);

const sourceSlice = (startMarker, endMarker) => {
  const start = chatPanelSource.indexOf(startMarker);
  assert.notEqual(start, -1, `Missing source marker: ${startMarker}`);
  const end = chatPanelSource.indexOf(endMarker, start);
  assert.notEqual(end, -1, `Missing source marker: ${endMarker}`);
  return chatPanelSource.slice(start, end);
};

test("ChatPanel latches active beta proof attempt for each live voice session", () => {
  assert.match(
    chatPanelSource,
    /const voiceProofAttemptIdRef = useRef<string \| null>\(null\);/,
  );
  assert.match(
    chatPanelSource,
    /const getVoiceProofAttemptId = useCallback\(\(\) => \{/,
  );

  const startVoiceSource = sourceSlice(
    "const startVoice = async () => {",
    "  const toggleVoice = () => {",
  );

  assert.match(
    startVoiceSource,
    /voiceProofAttemptIdRef\.current = activeBetaProofAttemptId \|\| null;/,
  );
  assert.equal(
    [...startVoiceSource.matchAll(/activeBetaProofAttemptId/g)].length,
    1,
  );
  assert.match(
    startVoiceSource,
    /const proofAttemptId = getVoiceProofAttemptId\(\);\s+ws\.send/s,
  );
  assert.match(startVoiceSource, /proofAttemptId,\s+openRouterKey/s);
  assert.match(
    startVoiceSource,
    /studyContextMetadata: \{[\s\S]*?proofAttemptId,/,
  );
  assert.doesNotMatch(
    startVoiceSource,
    /voiceContextPayload\?\.proofAttemptId\s*\|\|\s*activeBetaProofAttemptId/,
  );
});

test("ChatPanel voice tool calls use the latched proof attempt identity", () => {
  const voiceToolSource = sourceSlice(
    "const handleVoiceFunctionCallRequest = useCallback(",
    "  const startVoice = async () => {",
  );

  assert.match(
    voiceToolSource,
    /const proofAttemptId = getVoiceProofAttemptId\(\);/,
  );
  assert.doesNotMatch(
    voiceToolSource,
    /activeBetaProofAttemptId \|\| undefined/,
  );
  assert.match(
    voiceToolSource,
    /recordToolJobEvent\(\{[\s\S]*?source: "voice_agent"[\s\S]*?proofAttemptId,/,
  );
});

test("ChatPanel keeps typed chat proof attempts scoped to chat requests", () => {
  const sendMessageSource = sourceSlice(
    "const sendMessage = async (text: string) => {",
    "  const handleSend = () => {",
  );

  assert.match(
    sendMessageSource,
    /proofAttemptId: activeBetaProofAttemptId \|\| undefined,\s+mode: "chat"/,
  );
  assert.doesNotMatch(sendMessageSource, /getVoiceProofAttemptId\(\)/);
});
