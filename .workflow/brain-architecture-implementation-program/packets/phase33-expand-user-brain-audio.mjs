import { readFileSync, writeFileSync } from "node:fs";

const manifestPath = "src/lib/chapterAudioOverviews.json";
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

const additions = {
  0: {
    durationLabel: "about 3 min 25 sec",
    text: "One useful way to picture this is to imagine a classroom with a teacher, a notebook, and a lab assistant. The teacher is the foreground tutor. It is the part the learner talks to. The notebook is the learner brain. It keeps the record of what was studied, what was generated, what was reviewed, and what evidence exists. The lab assistant is the background worker layer. It can fetch context, run a tool, prepare a study artifact, or check a local record, but it should not quietly rewrite the notebook without a trace. That picture makes the product easier to reason about. Voice mode and chat mode are both ways to talk to the teacher. Revision is where the notebook becomes useful later. Admin is where the builder looks behind the curtain. Graphify is the map of the code that helps agents avoid wandering through the repository. These pieces should cooperate, not compete. If a learner asks a question in voice, that turn should still be stored and routed like a real tutor turn. If a tool runs in the background, Admin should show it. If memory changes, the ledger should explain why.",
  },
  1: {
    durationLabel: "about 3 min 15 sec",
    text: "In practice, this ledger-first design keeps the app from turning into a black box. Suppose the tutor creates a flashcard. The flashcard can be stored, reviewed, and shown in Revision, but it should also keep enough provenance for Admin to inspect the batch, the card ids, and the local anchors that produced it. Suppose the learner marks something wrong. The correction should not vanish into a vague preference. It should become a correction event with a target, an action, a reason, and downstream effects. Suppose an audio guide is stored. The app can verify that the guide points to a checked-in MP3, has a transcript, belongs to the right book and chapter, and did not fetch external content during the check. Each row has a narrow meaning. That narrowness is a strength. It lets the system say yes, this part is traceable, while also saying no, this does not prove the entire generated explanation is factually perfect. The learner brain becomes trustworthy because it can speak in these smaller, precise claims.",
  },
  2: {
    durationLabel: "about 3 min 35 sec",
    text: "A concrete flow makes the distinction easier. The learner asks, explain this section. The tutor looks at the active document, the selected text, the current book, and recent memory. It answers in a way that fits the moment. Maybe it asks a follow-up question. Maybe it suggests a flashcard. Maybe in voice mode it keeps the answer short enough to follow. Those are fast choices. After the turn, the background path can decide what should be saved. A learning entry may be written. A generated note artifact may be recorded. Source-span preview anchors may be attached if document text was available. A retrieval event or memory event may be logged. If the learner later reviews a flashcard and answers correctly, that explicit review can become evidence for mastery. The key is that every durable movement has a trace. The tutor can be conversational without becoming careless, and the memory system can be careful without making the live lesson feel slow.",
  },
  3: {
    durationLabel: "about 3 min 35 sec",
    text: "This also explains why tool calling needs clarity. A tool call is not just a hidden implementation detail. If the tutor used a document page, searched the web, generated flashcards, or asked a model to summarize a learning book, the system should be able to show that path. The learner may not need to see every low-level event during the lesson, but Admin should be able to inspect it later. That matters when a result is surprising. Did the answer come from the uploaded source, from web search, from a memory summary, or from the model's own reasoning? Did the artifact get verified locally, or is it still not checked? Did a citation conflict with a saved source field? These questions are not about slowing the learner down. They are about making the background layer legible. A good interface can keep the foreground calm while still preserving the evidence trail underneath.",
  },
  4: {
    durationLabel: "about 3 min 30 sec",
    text: "The tuning side should feel practical, not mystical. If the user changes a setting, the system should make clear what that setting can affect. A source-first setting can influence whether local document context is preferred. A tool budget can constrain how much background work happens in one turn. Voice settings can affect live agent behavior, but they do not change the stored audio guide assets that are already checked in. Diagnostics can export local beta state, but they do not create production cloud safety by themselves. Admin is strongest when it ties every control to observable evidence. Change a setting, run a lesson, then inspect model runs, tool jobs, retrieval rows, memory rows, artifact states, and voice events. That loop is how the product becomes tunable. Without Admin, the team would be guessing. With Admin, the system can show what it recorded, what it skipped, and where the next implementation slice should focus.",
  },
  5: {
    durationLabel: "about 3 min 35 sec",
    text: "The important product move is to connect voice to the same architecture as chat. Voice should not be a shiny side feature that bypasses memory. When a learner speaks, the system should capture the user's turn, the assistant's spoken response, the session timing, and the relevant voice-agent events. If the conversation produces useful learning material, it should enter the same learning-book and artifact pathways as typed chat. If the live voice backend is unavailable, the UI should say so plainly and fall back to text or stored audio where appropriate. Stored chapter audio has a different reliability profile. It is not waiting on a live voice websocket. The MP3 is in the public audio folder, the manifest points to it, and the reader can show both custom controls and native browser controls. That makes review dependable. Live voice is for dialogue. Stored audio is for guided study. Both are useful, but they should never be confused.",
  },
  6: {
    durationLabel: "about 3 min 30 sec",
    text: "A local-first roadmap also gives the team better tests. Before cloud work, the app can prove concrete flows. Upload a document, ask through chat, ask through voice, generate a learning entry, inspect Admin, review the saved book, play the stored audio guide, answer a flashcard, and confirm the evidence ledger changed for the right reason. That is a real beta story. It is much stronger than saying the architecture is ready because the diagrams look good. The current priority is to make these loops work together in the product. Chat mode, voice mode, tool calls, retrieval, memory writes, Admin observability, Revision review, and stored audio should form one coherent system. Cloud sync can come later. First the local app needs to prove it can teach, remember, explain itself, and recover from mistakes.",
  },
  7: {
    durationLabel: "about 3 min 30 sec",
    text: "This vocabulary also helps with future implementation decisions. If someone says the learner brain is complete, ask which evidence proves that. Does chat mode store the right records? Does voice mode feed the same memory pathway? Are tool calls visible? Are model runs and retrieval events inspectable? Are generated artifacts labeled with the right trust state? Are corrections non-destructive? Do stored audio guides play from local assets rather than live read-aloud calls? These questions turn abstract confidence into concrete checks. The glossary keeps the team from drifting into impressive but vague language. It says: use ordinary words, make the boundaries visible, and do not claim more than the system can prove today. That is how LearningAI can keep becoming more capable without losing the user's trust.",
  },
};

for (const entry of manifest) {
  if (entry.bookId !== "user-brain-architecture") continue;
  const addition = additions[entry.chapterIndex];
  if (!addition) continue;
  if (!entry.transcript.includes(addition.text)) {
    entry.transcript = `${entry.transcript} ${addition.text}`;
  }
  entry.durationLabel = addition.durationLabel;
}

const floorAdditions = {
  2: {
    durationLabel: "about 3 min 15 sec",
    text: "That is why this chapter keeps returning to one question: what should happen immediately, and what should be saved permanently? If the team answers that question carefully, chat and voice can feel fluid without turning memory into guesswork.",
  },
  3: {
    durationLabel: "about 3 min 15 sec",
    text: "The practical test is simple. When a learner asks where an answer came from, the app should have something better than trust me. It should be able to point to the source path, the artifact state, and the local check that was actually performed.",
  },
  4: {
    durationLabel: "about 3 min 15 sec",
    text: "That makes Admin less like a secret developer console and more like a tuning dashboard. It gives the builder enough evidence to improve the system without asking the learner to carry the debugging burden.",
  },
  6: {
    durationLabel: "about 3 min 15 sec",
    text: "This roadmap also protects the learner. It says the app should become trustworthy in small observable steps, not through a giant hidden launch where memory, voice, tools, and cloud sync all change at once.",
  },
  7: {
    durationLabel: "about 3 min 15 sec",
    text: "Use the glossary as a final checklist. If a feature cannot say what evidence it uses, what state it writes, what status it exposes, and how it can be corrected, then it is not ready to be treated as part of the durable learner brain.",
  },
};

for (const entry of manifest) {
  if (entry.bookId !== "user-brain-architecture") continue;
  const addition = floorAdditions[entry.chapterIndex];
  if (!addition) continue;
  if (!entry.transcript.includes(addition.text)) {
    entry.transcript = `${entry.transcript} ${addition.text}`;
  }
  entry.durationLabel = addition.durationLabel;
}

const safetyFloorAdditions = {
  4: {
    durationLabel: "about 3 min 25 sec",
    text: "For a beta tester, that means a very practical routine: try one lesson, open Admin, and check whether the meters match what really happened. If the learner spoke, there should be a voice record. If a tool ran, there should be a tool record. If memory changed, there should be a memory record. The dashboard earns trust by matching the session.",
  },
  5: {
    durationLabel: "about 3 min 15 sec",
    text: "That separation keeps the experience honest. A learner should know when they are listening to a prepared chapter guide, when they are talking to a live voice tutor, and when the app had to fall back to text. Each mode can still feed the same learner brain, but the interface should not blur what happened.",
  },
  6: {
    durationLabel: "about 3 min 35 sec",
    text: "The first beta milestone is therefore not a cloud launch. It is a complete local loop that a real learner can repeat: learn, ask, speak, save, review, inspect, and correct. Once that loop is steady, the next phase can decide which cloud pieces are worth adding.",
  },
  7: {
    durationLabel: "about 3 min 15 sec",
    text: "This is also the simplest way to explain the architecture to a non-technical reader. The app should remember useful learning moments, show why it remembers them, and let the user correct the record. Everything else is an implementation detail that has to serve those three promises.",
  },
};

for (const entry of manifest) {
  if (entry.bookId !== "user-brain-architecture") continue;
  const addition = safetyFloorAdditions[entry.chapterIndex];
  if (!addition) continue;
  if (!entry.transcript.includes(addition.text)) {
    entry.transcript = `${entry.transcript} ${addition.text}`;
  }
  entry.durationLabel = addition.durationLabel;
}

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
