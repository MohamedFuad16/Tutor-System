import React, {
  useCallback,
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
} from "react";
import { PdfViewer } from "../components/PdfViewer";
import { ChatPanel } from "../components/ChatPanel";
import { useStore } from "../store";
import { UploadCloud, MessageSquare, X, RefreshCw, Network } from "lucide-react";
import { PatternCard, themes } from "../components/PatternCard";
import { gsap } from "gsap";
import { useTranslation } from "../lib/translations";
import { brainOrchestrator } from "../memory/memory.orchestrator";
import { useMotionPreference } from "../hooks/useMotionPreference";

const splitCardTitle = (title: string) => {
  const words = title.split(" ");
  if (words.length < 2) return title;
  return (
    <>
      {words[0]}
      <br />
      {words.slice(1).join(" ")}
    </>
  );
};

const AnimatedHeadlineWords = ({
  text,
  headlineIndex,
  motionEnabled,
  onFirstWord,
  onComplete,
}: {
  text: string;
  headlineIndex: number;
  motionEnabled: boolean;
  onFirstWord?: (index: number) => void;
  onComplete?: (index: number) => void;
}) => {
  const wordRefs = useRef<HTMLSpanElement[]>([]);
  const onFirstWordRef = useRef(onFirstWord);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onFirstWordRef.current = onFirstWord;
    onCompleteRef.current = onComplete;
  }, [onComplete, onFirstWord]);

  useLayoutEffect(() => {
    const words = wordRefs.current.filter(Boolean);
    if (!words.length) return;
    gsap.killTweensOf(words);
    if (!motionEnabled) {
      gsap.set(words, { autoAlpha: 1, y: 0, filter: "blur(0px)" });
      onFirstWordRef.current?.(headlineIndex);
      onCompleteRef.current?.(headlineIndex);
      return;
    }
    const timeline = gsap.timeline({
      onComplete: () => onCompleteRef.current?.(headlineIndex),
    });
    timeline.call(() => onFirstWordRef.current?.(headlineIndex), [], 0.08);
    timeline.fromTo(
      words,
      { autoAlpha: 0, y: 16, filter: "blur(16px)" },
      {
        autoAlpha: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 1.28,
        stagger: 0.105,
        ease: "power4.out",
      },
      0,
    );
    return () => {
      timeline.kill();
    };
  }, [headlineIndex, motionEnabled, text]);

  wordRefs.current = [];

  return (
    <h2
      data-testid="intro-heading"
      className="flex max-w-[30rem] flex-wrap justify-center gap-x-[0.28em] gap-y-1.5 overflow-visible text-center font-serif text-[clamp(1.18rem,2.15vw,2rem)] leading-[1.18] tracking-normal text-white/92 sm:max-w-[42rem]"
    >
      {text.split(" ").map((word, index) => (
        <span
          key={`${word}-${index}`}
          ref={(node) => {
            if (node) wordRefs.current[index] = node;
          }}
          className="inline-block will-change-transform"
        >
          {word}
        </span>
      ))}
    </h2>
  );
};

type StudyIntroSplashProps = {
  cardStep: number;
  headlineIndex: number;
  motionEnabled: boolean;
  isDragging: boolean;
  isIngesting: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  setIsDragging: (dragging: boolean) => void;
  handleDrop: (event: React.DragEvent) => void;
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onHeadlineStart: (index: number) => void;
  onHeadlineComplete: (index: number) => void;
  t: (key: string) => string;
};

type CardTarget = {
  opacity: number;
  xPercent: number;
  y: number;
  scale: number;
  rotate: number;
  filter: string;
};

function StudyIntroSplash({
  cardStep,
  headlineIndex,
  motionEnabled,
  isDragging,
  isIngesting,
  fileInputRef,
  setIsDragging,
  handleDrop,
  handleFileChange,
  onHeadlineStart,
  onHeadlineComplete,
  t,
}: StudyIntroSplashProps) {
  const activeIndex = headlineIndex;
  const finalStack = cardStep >= 4;
  const cardRefs = useRef<HTMLDivElement[]>([]);
  const lastCardTargetsRef = useRef<Array<CardTarget | null>>([]);
  const [isDocumentHidden, setIsDocumentHidden] = useState(() =>
    typeof document === "undefined" ? false : document.hidden,
  );
  const introCards = [
    {
      key: "tutor",
      headline: t("study_hero_1"),
      theme: themes[2],
      icon: <MessageSquare className="h-5 w-5" />,
      iconClass: "bg-black/10 text-black border-black/10",
      title: t("study_card_tutor_title"),
      subtitle: t("study_card_tutor_subtitle"),
      textClass: "text-black",
      subtextClass: "text-black",
    },
    {
      key: "graph",
      headline: t("study_scroll_text_2"),
      theme: themes[0],
      icon: <Network className="h-5 w-5" />,
      iconClass: "bg-white/10 text-white border-white/20",
      title: t("study_card_graph_title"),
      subtitle: t("study_card_graph_subtitle"),
      textClass: "text-[#fefefe]",
      subtextClass: "text-[#fefefe]",
      bgClass: `${themes[0].bg} border border-white/10`,
    },
    {
      key: "upload",
      headline: t("study_scroll_text_3"),
      theme: themes[1],
      icon: <UploadCloud className="h-5 w-5" />,
      iconClass: "bg-[#ff6e00]/20 text-white border-white/20",
      title: isIngesting
        ? t("study_card_ingest_title")
        : t("study_card_upload_title"),
      subtitle: isIngesting
        ? t("study_card_ingest_subtitle")
        : t("study_card_upload_subtitle"),
      textClass: "text-[#fefefe]",
      subtextClass: "text-[#fefefe]",
    },
  ];

  const getCardTarget = (index: number): CardTarget => {
    if (finalStack) {
      if (index === 0) {
        return {
          opacity: 1,
          xPercent: -72,
          y: 18,
          scale: 0.9,
          rotate: -4.5,
          filter: "blur(0px)",
        };
      }
      if (index === 1) {
        return {
          opacity: 1,
          xPercent: -50,
          y: 9,
          scale: 0.94,
          rotate: -1.6,
          filter: "blur(0px)",
        };
      }
      return {
        opacity: 1,
        xPercent: -28,
        y: 0,
        scale: 1,
        rotate: 1.8,
        filter: "blur(0px)",
      };
    }

    if (cardStep === 0) {
      return {
        opacity: 0,
        xPercent: index === 0 ? -50 : index === 1 ? -18 : 8,
        y: 42,
        scale: 0.82,
        rotate: index === 0 ? 0 : index === 1 ? 8 : 14,
        filter: "blur(16px)",
      };
    }

    if (cardStep === 1) {
      if (index === 0) {
        return {
          opacity: 1,
          xPercent: -50,
          y: 0,
          scale: 1,
          rotate: 0,
          filter: "blur(0px)",
        };
      }
      return {
        opacity: 0,
        xPercent: index === 1 ? -18 : 8,
        y: 32,
        scale: 0.78,
        rotate: index === 1 ? 8 : 14,
        filter: "blur(14px)",
      };
    }

    if (cardStep === 2) {
      if (index === 0) {
        return {
          opacity: 0.9,
          xPercent: -82,
          y: 10,
          scale: 0.84,
          rotate: -7,
          filter: "blur(0px)",
        };
      }
      if (index === 1) {
        return {
          opacity: 1,
          xPercent: -50,
          y: 0,
          scale: 1,
          rotate: 0,
          filter: "blur(0px)",
        };
      }
      return {
        opacity: 0,
        xPercent: -10,
        y: 34,
        scale: 0.82,
        rotate: 12,
        filter: "blur(14px)",
      };
    }

    if (cardStep === 3) {
      if (index === 0) {
        return {
          opacity: 0.86,
          xPercent: -98,
          y: 10,
          scale: 0.78,
          rotate: -8,
          filter: "blur(0px)",
        };
      }
      if (index === 1) {
        return {
          opacity: 0.94,
          xPercent: -63,
          y: 2,
          scale: 0.89,
          rotate: -3,
          filter: "blur(0px)",
        };
      }
      return {
        opacity: 1,
        xPercent: -35,
        y: 6,
        scale: 0.95,
        rotate: 5.5,
        filter: "blur(0px)",
      };
    }

    return {
      opacity: 0,
      xPercent: -50,
      y: 74,
      scale: 0.9,
      rotate: 0,
      filter: "blur(14px)",
    };
  };

  const toGsapTarget = (target: CardTarget) => ({
    autoAlpha: target.opacity,
    xPercent: target.xPercent,
    y: target.y,
    scale: target.scale,
    rotate: target.rotate,
    filter: target.filter,
  });

  useEffect(() => {
    const updateVisibility = () => setIsDocumentHidden(document.hidden);
    updateVisibility();
    document.addEventListener("visibilitychange", updateVisibility);
    return () =>
      document.removeEventListener("visibilitychange", updateVisibility);
  }, []);

  useLayoutEffect(() => {
    cardRefs.current.forEach((card, index) => {
      if (!card) return;
      const target = getCardTarget(index);
      const previous = lastCardTargetsRef.current[index] || {
        opacity: 0,
        xPercent: -50,
        y: 80,
        scale: 0.9,
        rotate: 0,
        filter: "blur(14px)",
      };
      gsap.killTweensOf(card);
      if (!motionEnabled || isDocumentHidden) {
        gsap.set(card, toGsapTarget(target));
        lastCardTargetsRef.current[index] = target;
        return;
      }
      gsap.fromTo(card, toGsapTarget(previous), {
        ...toGsapTarget(target),
        duration: cardStep <= 1 ? 1.18 : 1.28,
        ease: cardStep >= 4 ? "expo.inOut" : "power4.out",
        immediateRender: false,
      });
      lastCardTargetsRef.current[index] = target;
    });
  }, [cardStep, finalStack, isDocumentHidden, motionEnabled]);

  return (
    <div className="relative flex h-full w-full flex-1 overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at center, rgba(255,255,255,0.035) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,110,0,0.1),transparent_38%),radial-gradient(circle_at_50%_100%,rgba(139,92,246,0.12),transparent_42%)]" />

      <input
        type="file"
        accept="application/pdf,image/*"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="relative z-10 mx-auto flex h-full w-full max-w-5xl flex-col items-center justify-start px-4 pb-5 pt-4 sm:px-6 sm:pt-5 md:px-10 md:pt-5">
        <div key={introCards[activeIndex].key} className="flex justify-center">
          <AnimatedHeadlineWords
            text={introCards[activeIndex].headline}
            headlineIndex={activeIndex}
            motionEnabled={motionEnabled}
            onFirstWord={onHeadlineStart}
            onComplete={onHeadlineComplete}
          />
        </div>

        <div className="relative mt-1 h-[clamp(238px,46dvh,404px)] w-full sm:mt-2">
          {introCards.map((card, index) => {
            const isUpload = index === 2;
            return (
              <div
                key={card.key}
                data-intro-card={card.key}
                ref={(node) => {
                  if (node) cardRefs.current[index] = node;
                }}
                className={`absolute left-1/2 top-0 origin-top ${
                  isUpload ? "pointer-events-auto" : "pointer-events-none"
                }`}
                style={{
                  opacity: 0,
                  transform: "translate(-50%, 80px) scale(0.9)",
                  filter: "blur(14px)",
                  zIndex: finalStack
                    ? index === 2
                      ? 30
                      : 10 + index * 10
                    : index === activeIndex
                      ? 30
                      : 10 + index,
                }}
              >
                <div className="origin-top scale-[0.56] sm:scale-[0.64] md:scale-[0.73] lg:scale-[0.82] xl:scale-[0.89]">
                  <PatternCard
                    onClick={
                      isUpload
                        ? () => fileInputRef.current?.click()
                        : undefined
                    }
                    onDragOver={
                      isUpload
                        ? (event) => {
                            event.preventDefault();
                            setIsDragging(true);
                          }
                        : undefined
                    }
                    onDragLeave={
                      isUpload ? () => setIsDragging(false) : undefined
                    }
                    onDrop={isUpload ? handleDrop : undefined}
                    isDragging={isUpload && isDragging}
                    bgClass={card.bgClass || card.theme.bg}
                    SvgComponent={card.theme.SvgComponent}
                    bloomColor={card.theme.bloom}
                    bloomOpacity={card.theme.bloomOpacity}
                    animateDots={cardStep > index}
                  >
                    <div
                      className="absolute bottom-[38px] left-[38px] right-[38px] z-20 flex flex-col gap-[7px] pointer-events-none"
                    >
                      <div
                        className={`mb-2 w-fit rounded-full border p-3 shadow-lg transition-colors ${card.iconClass}`}
                      >
                        {card.icon}
                      </div>
                      <div
                        className={`text-[27px] font-medium leading-[1.04] tracking-tight ${card.textClass}`}
                      >
                        {splitCardTitle(card.title)}
                      </div>
                      <div
                        className={`text-[17px] font-light leading-[1.25] tracking-tight opacity-70 ${card.subtextClass}`}
                      >
                        {card.subtitle}
                      </div>
                    </div>
                  </PatternCard>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-1 flex items-center gap-2">
          {introCards.map((card, index) => (
            <span
              key={`${card.key}-dot`}
              className={`h-1.5 rounded-full transition-[width,opacity,transform,background-color] duration-300 ${
                index === activeIndex ? "w-8 bg-[#ff6e00]" : "w-1.5 bg-white/25"
              } ${index <= activeIndex ? "opacity-100" : "opacity-30"} ${
                index === activeIndex ? "scale-110" : "scale-100"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function StudyView() {
  const { t } = useTranslation();
  const motionEnabled = useMotionPreference();
  const pdfUrl = useStore((state) => state.pdfUrl);
  const setPdfUrl = useStore((state) => state.setPdfUrl);
  const setPdfPage = useStore((state) => state.setPdfPage);
  const setPdfTotalPages = useStore((state) => state.setPdfTotalPages);
  const setSelectedTextContext = useStore(
    (state) => state.setSelectedTextContext,
  );
  const [isDragging, setIsDragging] = useState(false);
  const [isIngesting, setIsIngesting] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(Boolean(pdfUrl));
  const [introCardStep, setIntroCardStep] = useState(0);
  const [introHeadlineIndex, setIntroHeadlineIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const startedHeadlineRefs = useRef<Set<number>>(new Set());
  const completedHeadlineRefs = useRef<Set<number>>(new Set());
  const introTimersRef = useRef<number[]>([]);
  const chatSurfaceRef = useRef<HTMLElement | null>(null);
  const chatPanelFrameRef = useRef<HTMLDivElement | null>(null);
  const minimizedChatButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    // Clear the chat automatically as requested
    if (localStorage.getItem("chat_cleared_by_bot") !== "true") {
      useStore.getState().setMessages([
        {
          id: "1",
          role: "assistant",
          content: `**Hello. I'm your AI Tutor.**\n\nI'm ready to help you explore concepts, discuss code, and break down complex subjects. Here are a few things we can do:\n- **Analyze Documents:** Upload a PDF and ask me questions about specific pages.\n- **Discuss Code:** Paste code snippets and we can debug or refactor them.\n- **Learn Concepts:** Ask me general programming and computer science questions.\n\nWhat would you like to learn today?`,
        },
      ]);
      localStorage.setItem("chat_cleared_by_bot", "true");
    }
  }, []);

  const clearIntroTimers = useCallback(() => {
    introTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    introTimersRef.current = [];
  }, []);

  const scheduleIntro = useCallback((callback: () => void, delay: number) => {
    const timer = window.setTimeout(callback, delay);
    introTimersRef.current.push(timer);
  }, []);

  useEffect(() => {
    if (pdfUrl) {
      clearIntroTimers();
      setIsChatOpen(true);
      return;
    }
    startedHeadlineRefs.current = new Set();
    completedHeadlineRefs.current = new Set();
    clearIntroTimers();
    if (!motionEnabled) {
      setIntroHeadlineIndex(2);
      setIntroCardStep(4);
      return;
    }
    setIntroHeadlineIndex(0);
    setIntroCardStep(0);
    return clearIntroTimers;
  }, [clearIntroTimers, motionEnabled, pdfUrl]);

  const handleIntroHeadlineStart = useCallback((index: number) => {
    if (pdfUrl || startedHeadlineRefs.current.has(index)) return;
    startedHeadlineRefs.current.add(index);
    setIntroCardStep(Math.max(1, Math.min(3, index + 1)));
  }, [pdfUrl]);

  const handleIntroHeadlineComplete = useCallback((index: number) => {
    if (pdfUrl || completedHeadlineRefs.current.has(index)) return;
    completedHeadlineRefs.current.add(index);

    if (index === 0) {
      scheduleIntro(() => setIntroHeadlineIndex(1), 220);
      return;
    }

    if (index === 1) {
      scheduleIntro(() => setIntroHeadlineIndex(2), 240);
      return;
    }

    scheduleIntro(() => setIntroCardStep(4), 520);
  }, [pdfUrl, scheduleIntro]);

  const revealChatNode = (
    node: HTMLElement,
    from: { y: number; scale: number; filter: string },
    duration: number,
  ) => {
    gsap.killTweensOf(node);
    if (!motionEnabled || document.hidden) {
      gsap.set(node, {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
      });
      return;
    }
    gsap.fromTo(
      node,
      { autoAlpha: 0, ...from },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
        duration,
        ease: "power4.out",
      },
    );
  };

  const ingestDocument = async (file: File) => {
    setIsIngesting(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const apiKey = useStore.getState().apiKey;
      const res = await fetch("/api/documents/ingest", {
        method: "POST",
        body: formData,
        headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      console.info("Document classification:", data.classification);

      if (data.content && data.content.trim()) {
        const title = useStore.getState().activeProject || "Uploaded Document";
        await brainOrchestrator.updateSessionBookTitle(title);
        // Dispatch to memory orchestrator
        fetch("/api/learning-book-update", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
          },
          body: JSON.stringify({
            activeProject: title,
            userMessage: `I uploaded a document classified as ${data.classification} using ${data.extractionMode || "document extraction"}.`,
            assistantMessage: `I have ingested the document. Here is the extracted text context:\n\n${data.content.slice(0, 10000)}`,
          }),
        }).catch(console.error);
      }
    } catch (e) {
      console.error("Ingestion failed:", e);
    } finally {
      setIsIngesting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (
      file &&
      (file.type === "application/pdf" || file.type.startsWith("image/"))
    ) {
      if (file.type === "application/pdf") {
        if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        const url = URL.createObjectURL(file);
        setPdfUrl(url);
      }
      ingestDocument(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (
      file &&
      (file.type === "application/pdf" || file.type.startsWith("image/"))
    ) {
      if (file.type === "application/pdf") {
        if (pdfUrl) URL.revokeObjectURL(pdfUrl);
        const url = URL.createObjectURL(file);
        setPdfUrl(url);
      }
      ingestDocument(file);
    }
  };

  const clearPdf = () => {
    if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    setPdfUrl(null);
    setPdfPage(1);
    setPdfTotalPages(0);
    setSelectedTextContext("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };
  const shouldRenderChatSurface = isChatOpen;

  useLayoutEffect(() => {
    if (!shouldRenderChatSurface || !chatSurfaceRef.current) return;
    revealChatNode(
      chatSurfaceRef.current,
      { y: 28, scale: 0.985, filter: "blur(12px)" },
      0.86,
    );
  }, [motionEnabled, shouldRenderChatSurface]);

  useLayoutEffect(() => {
    if (!isChatOpen || !chatPanelFrameRef.current) return;
    revealChatNode(
      chatPanelFrameRef.current,
      {
        y: 16,
        scale: 0.985,
        filter: "blur(8px)",
      },
      0.42,
    );
  }, [isChatOpen, motionEnabled]);

  useLayoutEffect(() => {
    if (isChatOpen || !minimizedChatButtonRef.current) return;
    revealChatNode(
      minimizedChatButtonRef.current,
      { y: 8, scale: 0.9, filter: "blur(8px)" },
      0.42,
    );
  }, [isChatOpen, motionEnabled, pdfUrl]);

  return (
    <div className="relative flex min-h-[100dvh] w-full flex-col gap-3 overflow-y-auto bg-[#030303] px-3 pb-4 pt-16 md:gap-5 md:px-5 md:pb-6 md:pt-20 xl:h-[100dvh] xl:flex-row xl:gap-8 xl:overflow-hidden xl:px-8 xl:pb-8 xl:pt-24">
      <div
        className={`relative flex w-full flex-1 shrink flex-col overflow-hidden rounded-2xl border border-[#1a1a1a] bg-[#0A0A0B] shadow-2xl transition-[flex-basis,width,transform] duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] xl:h-full xl:min-h-0 ${
          pdfUrl
            ? "min-h-[42dvh]"
            : isChatOpen
              ? "min-h-[46dvh]"
              : "min-h-[calc(100dvh-5rem)]"
        }`}
      >
        {pdfUrl ? (
          <>
            <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/55 px-3 py-2 text-xs font-semibold text-zinc-200 backdrop-blur-xl shadow-[0_12px_34px_rgba(0,0,0,0.45)] transition-colors hover:bg-white/10 hover:text-white"
              >
                <RefreshCw size={13} /> {t("replace")}
              </button>
              <button
                type="button"
                onClick={clearPdf}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/55 text-zinc-300 backdrop-blur-xl shadow-[0_12px_34px_rgba(0,0,0,0.45)] transition-colors hover:bg-red-500/15 hover:text-red-100"
                aria-label="Remove current PDF"
              >
                <X size={15} />
              </button>
            </div>
            <input
              type="file"
              accept="application/pdf,image/*"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
            />
            <PdfViewer />
          </>
        ) : (
          <StudyIntroSplash
            cardStep={introCardStep}
            headlineIndex={introHeadlineIndex}
            motionEnabled={motionEnabled}
            isDragging={isDragging}
            isIngesting={isIngesting}
            fileInputRef={fileInputRef}
            setIsDragging={setIsDragging}
            handleDrop={handleDrop}
            handleFileChange={handleFileChange}
            onHeadlineStart={handleIntroHeadlineStart}
            onHeadlineComplete={handleIntroHeadlineComplete}
            t={t}
          />
        )}

        {!isChatOpen && (
          <button
            ref={minimizedChatButtonRef}
            type="button"
            onClick={() => setIsChatOpen(true)}
            aria-label="Open tutor chat"
            className="group absolute bottom-5 right-5 z-[70] flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-[#0a0a0a] text-white opacity-0 shadow-[0_18px_48px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.04)] outline-none transition-[border-color,box-shadow,transform] duration-300 hover:-translate-y-1 hover:border-[#ff6e00]/45 hover:shadow-[0_22px_54px_rgba(255,110,0,0.2)] active:scale-95 md:bottom-6 md:right-6"
          >
            <span className="absolute inset-[2px] rounded-full bg-[linear-gradient(180deg,#242427_0%,#111113_52%,#050505_100%)]" />
            <span
              className="absolute inset-[5px] rounded-full opacity-35 mix-blend-overlay"
              style={{
                backgroundImage:
                  "radial-gradient(circle at center, rgba(255,255,255,0.9) 1px, transparent 1px)",
                backgroundSize: "4px 4px",
              }}
            />
            <span className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_30%_15%,rgba(255,110,0,0.3),transparent_45%)] opacity-70 transition-opacity duration-300 group-hover:opacity-100" />
            <MessageSquare className="relative z-10 h-5 w-5 text-zinc-100" />
          </button>
        )}
      </div>

      {shouldRenderChatSurface && (
        <aside
          ref={chatSurfaceRef}
          className="flex min-h-[320px] max-h-[54dvh] w-full flex-none origin-bottom-right flex-col gap-2 md:min-h-[360px] md:gap-3 xl:h-[calc(100%-0.5rem)] xl:max-h-none xl:min-h-0 xl:w-[36%] xl:max-w-[560px] xl:flex-none xl:self-center"
        >
          <div
            key="chat-panel"
            ref={chatPanelFrameRef}
            className="min-h-0 flex-1 overflow-hidden rounded-3xl border border-black/5 bg-[#fdfdfd] text-[#050505] shadow-[0_20px_60px_rgba(0,0,0,0.15)] origin-bottom"
          >
            <ChatPanel onClose={() => setIsChatOpen(false)} />
          </div>
        </aside>
      )}
    </div>
  );
}
