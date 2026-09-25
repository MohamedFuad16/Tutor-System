/**
 * Subscribes to the server's push channel (GET /api/events) and keeps React
 * Query caches fresh when background work finishes.
 */
import { useEffect } from "react";
import type { ServerEvent, StudyDocument } from "@shared/types";
import { useApp } from "@/store/app";
import { API_BASE, authQuery } from "./api";
import { keys, queryClient } from "./queries";

export function useServerEvents() {
  const userId = useApp((state) => state.userId);
  const accessCode = useApp((state) => state.accessCode);

  useEffect(() => {
    let source: EventSource | null = null;
    let retry = 1_000;
    let timer: number | undefined;
    let stopped = false;

    const handle = (event: ServerEvent) => {
      switch (event.type) {
        case "guide.updated":
        case "guide.syncing":
          queryClient.invalidateQueries({ queryKey: keys.guide(event.bookId) });
          if (event.type === "guide.updated") {
            queryClient.invalidateQueries({ queryKey: ["cards"] });
            queryClient.invalidateQueries({ queryKey: keys.books });
          }
          break;
        case "document.updated": {
          const doc: StudyDocument = event.document;
          queryClient.setQueryData<StudyDocument[]>(keys.documents(doc.bookId), (current) =>
            current ? current.map((item) => (item.id === doc.id ? doc : item)) : current,
          );
          queryClient.invalidateQueries({ queryKey: keys.documents(doc.bookId) });
          queryClient.invalidateQueries({ queryKey: keys.books });
          break;
        }
        case "book.updated":
          queryClient.invalidateQueries({ queryKey: keys.books });
          break;
      }
    };

    const connect = () => {
      if (stopped) return;
      source = new EventSource(`${API_BASE}/api/events?${authQuery()}`);
      source.onopen = () => {
        retry = 1_000;
      };
      for (const type of ["guide.updated", "guide.syncing", "document.updated", "book.updated"]) {
        source.addEventListener(type, (message) => {
          try {
            handle(JSON.parse((message as MessageEvent).data));
          } catch {
            // ignore malformed event
          }
        });
      }
      source.onerror = () => {
        source?.close();
        timer = window.setTimeout(connect, retry);
        retry = Math.min(30_000, retry * 2);
      };
    };
    connect();
    return () => {
      stopped = true;
      source?.close();
      window.clearTimeout(timer);
    };
  }, [userId, accessCode]);
}
