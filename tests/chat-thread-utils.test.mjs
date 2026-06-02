import assert from "node:assert/strict";
import test from "node:test";

import {
  chatTitleFromMessageSet,
  flattenChatMessagesForPrompt,
  hasLearnerChatTurn,
  meaningfulChatMessages,
} from "../.tmp-test/chatThreadUtils.mjs";

test("voice session messages are meaningful chat history", () => {
  const voiceMessage = {
    id: "voice-1",
    role: "assistant",
    content: "",
    voiceSession: {
      title: "Voice conversation",
      startedAt: 1,
      durationSeconds: 42,
      turns: [
        { id: "turn-1", role: "user", content: "Explain event loops." },
        {
          id: "turn-2",
          role: "assistant",
          content: "An event loop schedules async work.",
        },
      ],
    },
  };

  assert.equal(hasLearnerChatTurn(voiceMessage), true);
  assert.deepEqual(meaningfulChatMessages([voiceMessage]), [voiceMessage]);
  assert.equal(
    chatTitleFromMessageSet([voiceMessage], "Fallback"),
    "Explain event loops.",
  );
});

test("voice session turns flatten into prompt messages", () => {
  assert.deepEqual(
    flattenChatMessagesForPrompt([
      { id: "1", role: "assistant", content: "Hello." },
      {
        id: "voice-1",
        role: "assistant",
        content: "",
        voiceSession: {
          startedAt: 1,
          durationSeconds: 5,
          turns: [
            { id: "u", role: "user", content: "What did I ask?" },
            { id: "a", role: "assistant", content: "You asked about loops." },
          ],
        },
      },
      { id: "typed-1", role: "user", content: "Continue." },
    ]),
    [
      { role: "assistant", content: "Hello." },
      { role: "user", content: "What did I ask?" },
      { role: "assistant", content: "You asked about loops." },
      { role: "user", content: "Continue." },
    ],
  );
});

test("explicit generated voice titles are preferred when available", () => {
  assert.equal(
    chatTitleFromMessageSet(
      [
        {
          id: "voice-1",
          role: "assistant",
          content: "",
          voiceSession: {
            title: "Understanding closures",
            startedAt: 1,
            durationSeconds: 5,
            turns: [{ id: "u", role: "user", content: "Can you explain?" }],
          },
        },
      ],
      "Fallback",
    ),
    "Understanding closures",
  );
});
