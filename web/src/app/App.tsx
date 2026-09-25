/**
 * Application shell: navigation, routed views with spring transitions,
 * notebook bootstrap, live server events, study-time tracking, voice mode.
 */
import { AnimatePresence, motion } from "motion/react";
import { lazy, Suspense, useEffect, useRef } from "react";
import { Spinner, Toaster } from "@/components/ui";
import { StudyView } from "@/features/study/StudyView";
import { api } from "@/lib/api";
import { useServerEvents } from "@/lib/events";
import { keys, queryClient, useBooks } from "@/lib/queries";
import { useApp, useMotion } from "@/store/app";
import { Navigation } from "./Navigation";
import { SettingsModal } from "./SettingsModal";

const RevisionView = lazy(() => import("@/features/revision/RevisionView").then((m) => ({ default: m.RevisionView })));
const AnalyticsView = lazy(() =>
  import("@/features/analytics/AnalyticsView").then((m) => ({ default: m.AnalyticsView })),
);

// Voice mode (and its WebGPU orb shader) loads on first use, prefetched when the app goes idle.
const loadVoice = () => import("@/features/voice/VoiceOverlay");
const VoiceOverlay = lazy(() => loadVoice().then((m) => ({ default: m.VoiceOverlay })));

function useVoiceChunk() {
  const open = useApp((state) => state.voiceOpen);
  const mounted = useRef(false);
  if (open) mounted.current = true;
  useEffect(() => {
    const idle = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 2500));
    idle(() => void loadVoice());
  }, []);
  return mounted.current;
}

/** Makes sure there is always an active notebook. */
function useEnsureNotebook() {
  const books = useBooks();
  const activeBookId = useApp((state) => state.activeBookId);
  const openBook = useApp((state) => state.openBook);
  const creating = useRef(false);
  useEffect(() => {
    if (!books.data) return;
    if (activeBookId && books.data.some((book) => book.id === activeBookId)) return;
    if (books.data.length) {
      openBook(books.data[0].id);
      return;
    }
    if (creating.current) return;
    creating.current = true;
    void api<{ id: string }>("/books", { method: "POST", json: { title: "My first notebook" } })
      .then((book) => {
        queryClient.invalidateQueries({ queryKey: keys.books });
        openBook(book.id);
      })
      .finally(() => {
        creating.current = false;
      });
  }, [books.data, activeBookId, openBook]);
}

/** Counts visible, recently-active time as study time (sent every minute). */
function useStudyHeartbeat() {
  useEffect(() => {
    let lastInput = Date.now();
    let seconds = 0;
    const bump = () => {
      lastInput = Date.now();
    };
    const events = ["pointerdown", "keydown", "wheel", "touchstart"];
    events.forEach((type) => window.addEventListener(type, bump, { passive: true }));
    const tick = window.setInterval(() => {
      const active =
        document.visibilityState === "visible" && (Date.now() - lastInput < 120_000 || useApp.getState().voiceOpen);
      if (active) seconds += 15;
      if (seconds >= 60) {
        const bookId = useApp.getState().activeBookId;
        void api("/activity", { method: "POST", json: { seconds, bookId } }).catch(() => undefined);
        seconds = 0;
      }
    }, 15_000);
    return () => {
      window.clearInterval(tick);
      events.forEach((type) => window.removeEventListener(type, bump));
    };
  }, []);
}

export function App() {
  const view = useApp((state) => state.view);
  const motionOn = useMotion();
  useServerEvents();
  useEnsureNotebook();
  const voiceMounted = useVoiceChunk();
  useStudyHeartbeat();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (
        target.closest("input, textarea, [contenteditable=true], select") ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      )
        return;
      const map: Record<string, "study" | "revision" | "analytics"> = {
        "1": "study",
        "2": "revision",
        "3": "analytics",
      };
      if (map[event.key]) useApp.getState().setView(map[event.key]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-ink-950 text-fog-50">
      <Navigation />
      <main className="relative h-full w-full">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={view}
            className="absolute inset-0"
            initial={motionOn ? { opacity: 0, y: 10, filter: "blur(6px)" } : false}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={motionOn ? { opacity: 0, y: -6, filter: "blur(4px)" } : undefined}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          >
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center text-fog-500">
                  <Spinner className="size-5" />
                </div>
              }
            >
              {view === "study" && <StudyView />}
              {view === "revision" && <RevisionView />}
              {view === "analytics" && <AnalyticsView />}
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>
      {voiceMounted && (
        <Suspense fallback={null}>
          <VoiceOverlay />
        </Suspense>
      )}
      <SettingsModal />
      <Toaster />
    </div>
  );
}
