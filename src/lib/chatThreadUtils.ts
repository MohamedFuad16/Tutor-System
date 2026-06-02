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
