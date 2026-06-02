import type { Message } from "../types";

export type PromptTurn = Pick<Message, "role" | "content">;

const normalizeTitleText = (value: string, maxLength: number) =>
  value
    .replace(/\s+/g, " ")
    .replace(/^\[SYSTEM:[\s\S]*?\]\s*/i, "")
    .trim()
    .slice(0, maxLength);

const hasText = (value?: string | null) => Boolean(value?.trim());

const voiceTurns = (message: Message) =>
  (message.voiceSession?.turns || []).filter((turn) => hasText(turn.content));

export const flattenChatMessagesForPrompt = (
  messages: Message[],
): PromptTurn[] =>
  messages.flatMap((message) => {
    const turns = voiceTurns(message);
    if (turns.length) {
      return turns.map((turn) => ({
        role: turn.role,
        content: turn.content,
      }));
    }
    return [{ role: message.role, content: message.content }];
  });

export const hasLearnerChatTurn = (message: Message) =>
  (message.role === "user" && hasText(message.content)) ||
  voiceTurns(message).some((turn) => turn.role === "user");

export const isMeaningfulChatMessage = (message: Message) =>
  message.id !== "1" &&
  (hasText(message.content) || voiceTurns(message).length > 0);

export const meaningfulChatMessages = (messages: Message[]) =>
  messages.filter(isMeaningfulChatMessage);

export type ChatThreadPersistenceMode = "empty" | "chat" | "voice" | "mixed";

export type ChatThreadPersistenceSummary = {
  mode: ChatThreadPersistenceMode;
  messageCount: number;
  meaningfulMessageCount: number;
  typedTurnCount: number;
  voiceSessionCount: number;
  voiceTurnCount: number;
  requestIds: string[];
  lastRequestId: string;
  requestCorrelated: boolean;
  hasTypedChat: boolean;
  hasVoiceSession: boolean;
  lastMessageId: string;
  signature: string;
};

export const summarizeChatThreadPersistence = (
  messages: Message[],
): ChatThreadPersistenceSummary => {
  const meaningful = meaningfulChatMessages(messages);
  const typedTurnCount = meaningful.filter(
    (message) =>
      !message.isVoice && !message.voiceSession && hasText(message.content),
  ).length;
  const voiceSessionCount = meaningful.filter(
    (message) => message.isVoice || message.voiceSession,
  ).length;
  const voiceTurnCount = meaningful.reduce(
    (sum, message) => sum + voiceTurns(message).length,
    0,
  );
  const hasTypedChat = typedTurnCount > 0;
  const hasVoiceSession = voiceSessionCount > 0 || voiceTurnCount > 0;
  const requestIds = Array.from(
    new Set(
      meaningful
        .map(
          (message) =>
            message.requestId ||
            (message.isVoice || message.voiceSession ? message.id : ""),
        )
        .filter((requestId) => requestId.trim().length > 0),
    ),
  ).slice(0, 24);
  const mode: ChatThreadPersistenceMode =
    hasTypedChat && hasVoiceSession
      ? "mixed"
      : hasVoiceSession
        ? "voice"
        : hasTypedChat
          ? "chat"
          : "empty";
  const lastMessage = meaningful[meaningful.length - 1];
  const signature = [
    mode,
    messages.length,
    meaningful.length,
    typedTurnCount,
    voiceSessionCount,
    voiceTurnCount,
    lastMessage?.id || "none",
    lastMessage?.role || "none",
    lastMessage?.content?.length || 0,
    lastMessage?.voiceSession?.durationSeconds || 0,
    requestIds.join(",") || "no-request",
  ].join(":");

  return {
    mode,
    messageCount: messages.length,
    meaningfulMessageCount: meaningful.length,
    typedTurnCount,
    voiceSessionCount,
    voiceTurnCount,
    requestIds,
    lastRequestId: requestIds[requestIds.length - 1] || "",
    requestCorrelated: requestIds.length > 0,
    hasTypedChat,
    hasVoiceSession,
    lastMessageId: lastMessage?.id || "",
    signature,
  };
};

const titleTextForMessage = (message: Message) => {
  const explicitVoiceTitle = message.voiceSession?.title?.trim();
  if (explicitVoiceTitle && !/^voice conversation$/i.test(explicitVoiceTitle)) {
    return explicitVoiceTitle;
  }

  if (hasText(message.content)) return message.content;

  const turns = voiceTurns(message);
  const firstLearnerTurn = turns.find((turn) => turn.role === "user");
  return (
    firstLearnerTurn?.content || turns[0]?.content || explicitVoiceTitle || ""
  );
};

export const chatTitleFromMessageSet = (
  messages: Message[],
  fallback: string,
  maxLength = 72,
) => {
  const meaningful = meaningfulChatMessages(messages);
  const candidate =
    meaningful.find(hasLearnerChatTurn) || meaningful[0] || messages[0];
  return (
    normalizeTitleText(titleTextForMessage(candidate), maxLength) ||
    fallback ||
    "General Study"
  );
};
