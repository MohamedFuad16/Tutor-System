import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const adminSource = readFileSync(`${repoRoot}/src/views/AdminView.tsx`, "utf8");
const studySource = readFileSync(`${repoRoot}/src/views/StudyView.tsx`, "utf8");
const chatPanelSource = readFileSync(
  `${repoRoot}/src/components/ChatPanel.tsx`,
  "utf8",
);

test("Admin can load provider proof prompts into ChatPanel", () => {
  assert.match(adminSource, /setAskTutorQuery,/);
  assert.match(
    adminSource,
    /const loadLiveProofPrompt = \(prompt: string\) => \{/,
  );
  assert.match(adminSource, /setAskTutorQuery\(prompt\);/);
  assert.match(adminSource, /setActiveView\("study"\);/);
  assert.match(adminSource, /Load in chat/);
  assert.match(adminSource, /Load voice script/);
  assert.match(adminSource, /disabled=\{!activeBetaProofAttemptId\}/);
});

test("StudyView opens ChatPanel when Admin queues a tutor prompt", () => {
  assert.match(
    studySource,
    /const askTutorQuery = useStore\(\(state\) => state\.askTutorQuery\);/,
  );
  assert.match(
    studySource,
    /if \(askTutorQuery\.trim\(\)\) \{\s+setIsChatOpen\(true\);/s,
  );
});

test("ChatPanel consumes and focuses queued live proof prompts", () => {
  assert.match(chatPanelSource, /Provider-key proof turn/i);
  assert.match(chatPanelSource, /Provider-key voice proof turn/i);
  assert.match(chatPanelSource, /textareaRef\.current\?\.focus\(\);/);
  assert.match(chatPanelSource, /Proof prompt loaded/);
  assert.match(chatPanelSource, /Voice script loaded/);
  assert.match(chatPanelSource, /Start voice first/);
  assert.match(
    chatPanelSource,
    /if \(hasLoadedVoiceProofScript && voiceState === "idle"\) \{/,
  );
});
