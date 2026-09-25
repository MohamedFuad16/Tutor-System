/**
 * Study workspace. Desktop: reader on the left, tutor rail on the right
 * (resizable). Mobile: chat-first, with the document one tap away.
 * A notebook without documents shows the intro hero next to the tutor.
 */
import { AnimatePresence, motion } from "motion/react";
import { FileText, Loader2, MessageCircle, Plus, TriangleAlert, X } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { StudyDocument } from "@shared/types";
import { Spinner, cx, spring, toast } from "@/components/ui";
import { ChatPanel } from "@/features/chat/ChatPanel";
import { useDeleteDocument, useDocuments, useUploadDocument } from "@/lib/queries";
import { useApp } from "@/store/app";
import { IntroSplash } from "./IntroSplash";

const PdfViewer = lazy(() => import("./PdfViewer").then((module) => ({ default: module.PdfViewer })));

const RAIL_KEY = "tutor-rail-width";

function useIsDesktop() {
  const [desktop, setDesktop] = useState(
    () => typeof window === "undefined" || window.matchMedia("(min-width: 1024px)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return desktop;
}

function DocumentTabs({
  documents,
  activeId,
  onSelect,
  onAdd,
  onRemove,
}: {
  documents: StudyDocument[];
  activeId?: string;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRemove: (doc: StudyDocument) => void;
}) {
  return (
    <div className="scroll-quiet flex items-center gap-1.5 overflow-x-auto px-3 py-2">
      {documents.map((doc) => (
        <motion.div
          key={doc.id}
          layout
          transition={spring}
          className={cx(
            "group flex shrink-0 items-center gap-2 rounded-full py-1.5 pr-1.5 pl-3 text-xs transition-colors",
            doc.id === activeId ? "bg-white text-ink-900" : "bg-white/6 text-fog-200 hover:bg-white/10",
          )}
        >
          <button onClick={() => onSelect(doc.id)} className="flex max-w-[14rem] items-center gap-2" title={doc.title}>
            {doc.status === "processing" ? (
              <Loader2 className="size-3.5 animate-spin text-signal" />
            ) : doc.status === "failed" ? (
              <TriangleAlert className="size-3.5 text-red-400" />
            ) : (
              <FileText className={cx("size-3.5", doc.id === activeId ? "text-signal" : "text-fog-500")} />
            )}
            <span className="truncate">{doc.title}</span>
            {doc.status === "ready" && <span className="opacity-50">{doc.pageCount}p</span>}
          </button>
          <button
            onClick={() => onRemove(doc)}
            aria-label={`Remove ${doc.title}`}
            className="rounded-full p-1 opacity-0 transition-opacity group-hover:opacity-60 hover:!opacity-100"
          >
            <X className="size-3" />
          </button>
        </motion.div>
      ))}
      <button
        onClick={onAdd}
        aria-label="Add a document"
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/6 text-fog-400 hover:bg-white/12 hover:text-white"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

export function StudyView() {
  const bookId = useApp((state) => state.activeBookId);
  const activeDocumentByBook = useApp((state) => state.activeDocumentByBook);
  const setActiveDocument = useApp((state) => state.setActiveDocument);
  const mobilePane = useApp((state) => state.mobilePane);
  const set = useApp((state) => state.set);
  const documents = useDocuments(bookId);
  const upload = useUploadDocument(bookId);
  const removeDoc = useDeleteDocument(bookId);
  const desktop = useIsDesktop();
  const fileInput = useRef<HTMLInputElement>(null);
  const [railWidth, setRailWidth] = useState(() => Number(localStorage.getItem(RAIL_KEY)) || 440);
  const [uploading, setUploading] = useState(false);

  const docs = documents.data ?? [];
  const activeId = bookId ? activeDocumentByBook[bookId] : undefined;
  const active = docs.find((doc) => doc.id === activeId) ?? docs[docs.length - 1];

  useEffect(() => {
    if (bookId && active && active.id !== activeId) setActiveDocument(bookId, active.id);
  }, [bookId, active, activeId, setActiveDocument]);

  // Phones open on the hero for an empty notebook (once per notebook), otherwise chat-first.
  const heroShownFor = useRef<string | null>(null);
  useEffect(() => {
    if (desktop || !bookId || !documents.data || heroShownFor.current === bookId) return;
    heroShownFor.current = bookId;
    if (documents.data.length === 0) set({ mobilePane: "document" });
  }, [desktop, bookId, documents.data, set]);

  const onFiles = useCallback(
    async (files: File[]) => {
      if (!bookId) return;
      setUploading(true);
      try {
        for (const file of files.slice(0, 5)) {
          const doc = await upload.mutateAsync(file);
          setActiveDocument(bookId, doc.id);
        }
        set({ mobilePane: "document" });
      } catch (error) {
        toast(error instanceof Error ? error.message : "Upload failed", "error");
      } finally {
        setUploading(false);
      }
    },
    [bookId, upload, setActiveDocument, set],
  );

  const onRemove = async (doc: StudyDocument) => {
    if (!window.confirm(`Remove "${doc.title}" from this notebook?`)) return;
    await removeDoc.mutateAsync(doc.id);
    toast(`Removed "${doc.title}"`);
  };

  const onAsk = useCallback(() => set({ mobilePane: "chat" }), [set]);

  const startResize = (event: React.PointerEvent) => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = railWidth;
    const move = (e: PointerEvent) => {
      const width = Math.min(760, Math.max(360, startWidth - (e.clientX - startX)));
      setRailWidth(width);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      setRailWidth((width) => {
        localStorage.setItem(RAIL_KEY, String(width));
        return width;
      });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  if (!bookId || documents.isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-fog-500">
        <Spinner className="size-5" />
      </div>
    );
  }

  const hasDocs = docs.length > 0;
  const hiddenInput = (
    <input
      ref={fileInput}
      type="file"
      accept="application/pdf,.pdf"
      multiple
      hidden
      onChange={(event) => {
        const files = [...(event.target.files ?? [])];
        if (files.length) void onFiles(files);
        event.target.value = "";
      }}
    />
  );

  const reader = hasDocs ? (
    <div className="flex h-full min-h-0 flex-col">
      <DocumentTabs
        documents={docs}
        activeId={active?.id}
        onSelect={(id) => setActiveDocument(bookId, id)}
        onAdd={() => fileInput.current?.click()}
        onRemove={onRemove}
      />
      <div className="relative min-h-0 flex-1">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center">
              <Spinner className="size-5 text-fog-500" />
            </div>
          }
        >
          {active && <PdfViewer key={active.id} document={active} onAsk={onAsk} />}
        </Suspense>
      </div>
    </div>
  ) : (
    <IntroSplash
      onFiles={onFiles}
      uploading={uploading}
      compactHint={
        !desktop && (
          <button
            onClick={() => set({ mobilePane: "chat" })}
            className="flex items-center gap-2 rounded-full bg-white/8 px-4 py-2 text-sm text-fog-200"
          >
            <MessageCircle className="size-4" /> Or just start asking
          </button>
        )
      }
    />
  );

  if (desktop) {
    return (
      <div className="flex h-full min-h-0 pt-16">
        {hiddenInput}
        <div className="min-w-0 flex-1">{reader}</div>
        <div
          onPointerDown={startResize}
          className="group relative w-2 shrink-0 cursor-col-resize"
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize tutor panel"
        >
          <div className="absolute inset-y-8 left-1/2 w-px -translate-x-1/2 bg-white/6 transition-colors group-hover:bg-signal/60" />
        </div>
        <div style={{ width: railWidth }} className="shrink-0 pr-3 pb-3">
          <ChatPanel className="rounded-[1.75rem] shadow-[var(--shadow-float)]" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col pt-16">
      {hiddenInput}
      <div className="flex justify-center gap-1 px-3 pb-2" role="tablist" aria-label="Study panes">
        {(["chat", "document"] as const).map((pane) => (
          <button
            key={pane}
            role="tab"
            aria-selected={mobilePane === pane}
            onClick={() => set({ mobilePane: pane })}
            className={cx(
              "rounded-full px-4 py-1.5 text-xs transition-colors",
              mobilePane === pane ? "bg-white text-ink-900" : "text-fog-400",
            )}
          >
            {pane === "chat" ? "Tutor" : hasDocs ? "Document" : "Start"}
          </button>
        ))}
      </div>
      <div className="relative min-h-0 flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mobilePane}
            className="absolute inset-0"
            initial={{ opacity: 0, x: mobilePane === "chat" ? 24 : -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {mobilePane === "chat" ? (
              <ChatPanel className="mx-2 mb-2 h-[calc(100%-0.5rem)] rounded-[1.5rem]" />
            ) : (
              reader
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
