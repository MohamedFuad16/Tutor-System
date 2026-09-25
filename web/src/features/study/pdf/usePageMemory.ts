/** Mirrors the current page to the server as `lastPage` (debounced, flushed on leave) so the learner resumes in place. */
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef } from "react";
import type { StudyDocument } from "@shared/types";
import { api } from "@/lib/api";
import { keys } from "@/lib/queries";

const SAVE_DELAY_MS = 800;

export function usePageMemory(doc: StudyDocument, page: number, numPages: number) {
  const client = useQueryClient();
  const savedRef = useRef<number>(doc.lastPage);
  const pendingSaveRef = useRef<number | null>(null);

  const flushSave = useCallback(() => {
    const target = pendingSaveRef.current;
    pendingSaveRef.current = null;
    if (target === null || target === savedRef.current) return;
    savedRef.current = target;
    api<StudyDocument>(`/documents/${doc.id}`, { method: "PATCH", json: { lastPage: target } })
      .then((updated) => {
        client.setQueryData<StudyDocument[]>(keys.documents(doc.bookId), (list) =>
          list?.map((item) => (item.id === doc.id ? { ...item, lastPage: updated?.lastPage ?? target } : item)),
        );
      })
      .catch(() => {
        if (savedRef.current === target) savedRef.current = -1; // let the next turn retry
      });
  }, [client, doc.id, doc.bookId]);

  useEffect(() => {
    if (!numPages || page === savedRef.current) return;
    pendingSaveRef.current = page;
    const timer = window.setTimeout(flushSave, SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [page, numPages, flushSave]);

  // Leaving the document mid-debounce still records where the learner was.
  useEffect(() => () => flushSave(), [flushSave]);
}
