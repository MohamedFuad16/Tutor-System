export const INTERACTION_MICRO_TURN_MS = 200;
export const INTERACTION_THINKING_PAUSE_MS = 1600;

export type TutorInteractionMode =
  | "idle"
  | "composing"
  | "thinking_pause"
  | "submitted"
  | "awaiting_response"
  | "listening"
  | "speaking";

export type TutorInteractionSnapshot = {
  mode: TutorInteractionMode;
  microTurnMs: number;
  microTurnIndex: number;
  elapsedSinceInputMs: number;
  elapsedSinceSubmitMs: number | null;
  textLength: number;
  wordCount: number;
  selectedTextAttached: boolean;
  webSearchSelected: boolean;
  voiceState: "idle" | "listening" | "speaking";
  sendState: "idle" | "sending" | "success";
  activeBookId?: string | null;
  activeBookTitle?: string;
};

type SnapshotInput = {
  mode: TutorInteractionMode;
  text: string;
  selectedTextAttached: boolean;
  webSearchSelected: boolean;
  voiceState: "idle" | "listening" | "speaking";
  sendState: "idle" | "sending" | "success";
  activeBookId?: string | null;
  activeBookTitle?: string;
  lastInputAt: number | null;
  lastSubmitAt: number | null;
  now?: number;
};

const elapsedFrom = (now: number, timestamp: number | null) =>
  timestamp ? Math.max(0, now - timestamp) : 0;

const countWords = (text: string) =>
  text.trim() ? text.trim().split(/\s+/).length : 0;

export const createTutorInteractionSnapshot = ({
  mode,
  text,
  selectedTextAttached,
  webSearchSelected,
  voiceState,
  sendState,
  activeBookId,
  activeBookTitle,
  lastInputAt,
  lastSubmitAt,
  now = Date.now(),
}: SnapshotInput): TutorInteractionSnapshot => {
  const elapsedSinceInputMs = elapsedFrom(now, lastInputAt);
  const elapsedSinceSubmitMs = lastSubmitAt
    ? elapsedFrom(now, lastSubmitAt)
    : null;

  return {
    mode,
    microTurnMs: INTERACTION_MICRO_TURN_MS,
    microTurnIndex: Math.floor(elapsedSinceInputMs / INTERACTION_MICRO_TURN_MS),
    elapsedSinceInputMs,
    elapsedSinceSubmitMs,
    textLength: text.length,
    wordCount: countWords(text),
    selectedTextAttached,
    webSearchSelected,
    voiceState,
    sendState,
    activeBookId,
    activeBookTitle,
  };
};

const responsePolicyForMode = (mode: TutorInteractionMode) => {
  switch (mode) {
    case "thinking_pause":
      return "The learner paused before submitting. Prefer a concise response that preserves their agency, names the likely next step, and asks at most one clarifying question when necessary.";
    case "submitted":
    case "awaiting_response":
      return "The learner has yielded the turn. Answer directly, ground the response in available context, and keep the result easy to interrupt or refine.";
    case "listening":
      return "The learner is in voice input. Prefer short confirmations and avoid long text-only planning unless asked.";
    case "speaking":
      return "The tutor is speaking. Avoid abrupt topic switches; integrate any new background result at a natural boundary.";
    case "composing":
      return "The learner was actively composing. Treat the message as an in-progress thought and avoid overconfident assumptions.";
    default:
      return "No special interaction pressure is active. Use the normal tutoring contract.";
  }
};

export const buildTutorInteractionContext = (
  snapshot: TutorInteractionSnapshot,
) =>
  [
    "### Interaction Model Context",
    "This is an app-level approximation of a time-aware interaction model. It captures learner timing and UI state; it is not native full-duplex model training.",
    `Mode: ${snapshot.mode}`,
    `Micro-turn window: ${snapshot.microTurnMs}ms; elapsed micro-turns since last input: ${snapshot.microTurnIndex}`,
    `Elapsed since last input: ${snapshot.elapsedSinceInputMs}ms`,
    `Elapsed since submit: ${
      snapshot.elapsedSinceSubmitMs === null
        ? "not submitted"
        : `${snapshot.elapsedSinceSubmitMs}ms`
    }`,
    `Text shape: ${snapshot.wordCount} words, ${snapshot.textLength} characters`,
    `Context flags: selectedText=${snapshot.selectedTextAttached ? "yes" : "no"}, webSearchSkill=${snapshot.webSearchSelected ? "yes" : "no"}, voice=${snapshot.voiceState}, send=${snapshot.sendState}`,
    snapshot.activeBookTitle
      ? `Active learning book: ${snapshot.activeBookTitle}${snapshot.activeBookId ? ` (${snapshot.activeBookId})` : ""}`
      : "Active learning book: none",
    `Tutor response policy: ${responsePolicyForMode(snapshot.mode)}`,
    "Background policy: deep learner-state updates, summaries, and flashcards should remain asynchronous after the visible response unless the user explicitly asks for them.",
  ].join("\n");
