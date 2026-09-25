/**
 * Client-only state: preferences and what the learner currently has open.
 * Server data (books, documents, messages, guides) lives in React Query, not
 * here, so there is exactly one source of truth for it: the server.
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BotAvatarType } from "@/components/fx/BotAvatar";

export type View = "study" | "revision" | "analytics";

export type VoiceInputMode = "auto" | "server" | "browser";
export type VoiceOutputMode = "auto" | "server" | "browser";

/** Liquid orb preset for voice mode (see features/voice/VoiceOrb). */
export type OrbStyle = "siri" | "violetEmber" | "voiceWave" | "aurora" | "plasma" | "spectrum";

export type PendingSelection = { documentId: string; page: number; text: string };

type AppState = {
  userId: string;
  learnerName: string;
  language: string;
  accessCode: string;
  motion: boolean;
  voiceInput: VoiceInputMode;
  voiceOutput: VoiceOutputMode;
  deepMode: boolean;
  webMode: boolean;
  orbStyle: OrbStyle;
  /** The tutor's avatar in chat. */
  tutorAvatar: BotAvatarType;

  view: View;
  activeBookId: string | null;
  /** Last opened document per book. */
  activeDocumentByBook: Record<string, string>;
  page: number;
  selection: PendingSelection | null;
  /** Page jump requested from elsewhere (citation chips, guide sources). */
  jumpTo: { documentId: string; page: number; nonce: number } | null;
  /** Open guide (Revision) for a book, or a built-in book id. */
  openGuide: string | null;
  voiceOpen: boolean;
  settingsOpen: boolean;
  mobilePane: "chat" | "document";

  set: (patch: Partial<AppState>) => void;
  setView: (view: View) => void;
  openBook: (bookId: string | null) => void;
  setActiveDocument: (bookId: string, documentId: string) => void;
  jump: (documentId: string, page: number) => void;
};

function makeUserId() {
  const random =
    globalThis.crypto?.randomUUID?.().replace(/-/g, "") ??
    Math.random().toString(36).slice(2) + Date.now().toString(36);
  return `learner_${random.slice(0, 20)}`;
}

const browserLanguage = () => {
  const lang = (typeof navigator !== "undefined" ? navigator.language : "en").slice(0, 2);
  return ["en", "ja", "ko", "es", "fr", "de"].includes(lang) ? lang : "en";
};

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      userId: makeUserId(),
      learnerName: "Learner",
      language: browserLanguage(),
      accessCode: "",
      motion: true,
      voiceInput: "auto",
      voiceOutput: "auto",
      deepMode: false,
      webMode: false,
      orbStyle: "siri",
      tutorAvatar: "clover",

      view: "study",
      activeBookId: null,
      activeDocumentByBook: {},
      page: 1,
      selection: null,
      jumpTo: null,
      openGuide: null,
      voiceOpen: false,
      settingsOpen: false,
      mobilePane: "chat",

      set: (patch) => set(patch),
      setView: (view) => set({ view }),
      openBook: (bookId) => set({ activeBookId: bookId, page: 1, selection: null }),
      setActiveDocument: (bookId, documentId) =>
        set({ activeDocumentByBook: { ...get().activeDocumentByBook, [bookId]: documentId }, page: 1 }),
      jump: (documentId, page) => {
        const bookId = get().activeBookId;
        set({
          view: "study",
          mobilePane: "document",
          jumpTo: { documentId, page, nonce: Date.now() },
          activeDocumentByBook: bookId
            ? { ...get().activeDocumentByBook, [bookId]: documentId }
            : get().activeDocumentByBook,
        });
      },
    }),
    {
      name: "tutor-app-v2",
      partialize: (state) => ({
        userId: state.userId,
        learnerName: state.learnerName,
        language: state.language,
        accessCode: state.accessCode,
        motion: state.motion,
        voiceInput: state.voiceInput,
        voiceOutput: state.voiceOutput,
        deepMode: state.deepMode,
        orbStyle: state.orbStyle,
        tutorAvatar: state.tutorAvatar,
        view: state.view,
        activeBookId: state.activeBookId,
        activeDocumentByBook: state.activeDocumentByBook,
      }),
    },
  ),
);

/** Motion is on unless the learner or the OS asked for less of it. */
export function useMotion() {
  const motion = useApp((state) => state.motion);
  const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  return motion && !reduced;
}
