/**
 * Chat turn orchestration on the client: optimistic user message, a live
 * streaming draft (text, reasoning, status, parts), stop/abort, and cache
 * updates so the thread stays in sync with the server.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage, MessagePart } from "@shared/types";
import { streamChat, ApiError } from "@/lib/api";
import { keys, queryClient } from "@/lib/queries";
import { useApp } from "@/store/app";

export type Draft = {
  id: string;
  text: string;
  reasoning: string;
  status: string | null;
  parts: MessagePart[];
  model?: string;
  startedAt: number;
};

export type ChatError = { message: string; retryable: boolean; lastInput: string };

const append = (bookId: string, ...messages: ChatMessage[]) =>
  queryClient.setQueryData<ChatMessage[]>(keys.messages(bookId), (current) => {
    const list = current ? [...current] : [];
    for (const message of messages) {
      const index = list.findIndex((item) => item.id === message.id);
      if (index >= 0) list[index] = message;
      else list.push(message);
    }
    return list;
  });

const remove = (bookId: string, id: string) =>
  queryClient.setQueryData<ChatMessage[]>(keys.messages(bookId), (current) =>
    current?.filter((item) => item.id !== id),
  );

export function useChat(bookId: string | null) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<ChatError | null>(null);
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const frame = useRef<number | null>(null);
  const pending = useRef<Draft | null>(null);

  // Batch streaming updates to one render per animation frame.
  const schedule = useCallback((next: Draft) => {
    pending.current = next;
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      setDraft(pending.current ? { ...pending.current } : null);
    });
  }, []);

  const stop = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
  }, []);

  // Switching notebooks cancels an in-flight answer.
  useEffect(() => () => stop(), [bookId, stop]);

  const send = useCallback(
    async (text: string, options: { selection?: { documentId: string; page: number; text: string } | null } = {}) => {
      if (!bookId || !text.trim() || controller.current) return;
      const state = useApp.getState();
      const documentId = state.activeDocumentByBook[bookId];
      setError(null);
      const abort = new AbortController();
      controller.current = abort;
      setBusy(true);
      const optimisticId = `local_${Date.now()}`;
      const selection = options.selection ?? null;
      append(bookId, {
        id: optimisticId,
        bookId,
        role: "user",
        channel: "chat",
        content: text,
        parts: selection
          ? [
              {
                type: "sources",
                sources: [{ documentId: selection.documentId, page: selection.page, snippet: selection.text }],
              },
            ]
          : [],
        createdAt: Date.now(),
      });
      const current: Draft = { id: "pending", text: "", reasoning: "", status: null, parts: [], startedAt: Date.now() };
      schedule(current);
      try {
        await streamChat(
          {
            bookId,
            message: text,
            focus: {
              documentId: selection?.documentId ?? documentId,
              page: selection?.page ?? (documentId ? state.page : undefined),
              selection: selection?.text,
            },
            deep: state.deepMode,
            web: state.webMode,
            language: state.language,
          },
          (event) => {
            switch (event.event) {
              case "start":
                remove(bookId, optimisticId);
                append(bookId, event.data.userMessage);
                current.id = event.data.assistantId;
                current.model = event.data.model;
                break;
              case "reasoning":
                current.reasoning += event.data.text;
                break;
              case "delta":
                current.text += event.data.text;
                current.status = null;
                break;
              case "status":
                current.status = event.data.label;
                break;
              case "part":
                current.parts = [...current.parts, event.data];
                break;
              case "done":
                append(bookId, event.data.message);
                queryClient.invalidateQueries({ queryKey: keys.books });
                queryClient.invalidateQueries({ queryKey: keys.analytics });
                pending.current = null;
                setDraft(null);
                return;
              case "error":
                setError({ message: event.data.message, retryable: event.data.retryable, lastInput: text });
                break;
            }
            schedule(current);
          },
          abort.signal,
        );
      } catch (caught) {
        if (abort.signal.aborted) {
          // Keep what streamed so far visible; the server saved it as interrupted.
          if (current.text.trim()) {
            append(bookId, {
              id: current.id === "pending" ? `local_a_${Date.now()}` : current.id,
              bookId,
              role: "assistant",
              channel: "chat",
              content: current.text,
              parts: current.parts,
              createdAt: Date.now(),
              interrupted: true,
            });
          }
        } else {
          remove(bookId, optimisticId);
          const message =
            caught instanceof ApiError ? caught.message : "Couldn't reach the tutor. Check your connection.";
          setError({ message, retryable: true, lastInput: text });
        }
      } finally {
        if (frame.current !== null) cancelAnimationFrame(frame.current);
        frame.current = null;
        pending.current = null;
        setDraft(null);
        controller.current = null;
        setBusy(false);
      }
    },
    [bookId, schedule],
  );

  return { draft, error, send, stop, busy, clearError: () => setError(null) };
}
