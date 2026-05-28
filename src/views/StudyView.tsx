import React, { useState, useRef, useEffect } from "react";
import { PdfViewer } from "../components/PdfViewer";
import { ChatPanel } from "../components/ChatPanel";
import { useStore } from "../store";
import { UploadCloud, MessageSquare, X, RefreshCw } from "lucide-react";
import { PatternCard, themes } from "../components/PatternCard";
import { AnimatedScrollText } from "../components/AnimatedScrollText";
import { motion, AnimatePresence, useScroll, useTransform } from "motion/react";

const CurvedArrow = ({ color }: { color: string }) => (
  <svg
    width="60"
    height="220"
    viewBox="0 0 60 220"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    style={{ filter: `drop-shadow(0px 0px 12px ${color}80)` }}
  >
    {/* Background faint path */}
    <path
      d="M 30 10 C 30 50, 50 70, 30 120 S 10 170, 30 205 L 30 215"
      stroke={color}
      strokeOpacity="0.2"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M 30 215 L 20 205 M 30 215 L 40 205"
      stroke={color}
      strokeOpacity="0.2"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* Animated glowing path */}
    <motion.path
      d="M 30 10 C 30 50, 50 70, 30 120 S 10 170, 30 205 L 30 215"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ pathLength: 0, pathOffset: 0 }}
      animate={{ pathLength: [0, 0.4, 0], pathOffset: [0, 0.6, 1] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.path
      d="M 30 215 L 20 205 M 30 215 L 40 205"
      stroke={color}
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 0] }}
      transition={{
        duration: 2.5,
        repeat: Infinity,
        ease: "easeInOut",
        times: [0, 0.8, 1],
      }}
    />
  </svg>
);

export function StudyView() {
  const pdfUrl = useStore((state) => state.pdfUrl);
  const setPdfUrl = useStore((state) => state.setPdfUrl);
  const setPdfPage = useStore((state) => state.setPdfPage);
  const setPdfTotalPages = useStore((state) => state.setPdfTotalPages);
  const setSelectedTextContext = useStore(
    (state) => state.setSelectedTextContext,
  );
  const setActiveView = useStore((state) => state.setActiveView);
  const [isDragging, setIsDragging] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [card1DotsReady, setCard1DotsReady] = useState(false);
  const [card2DotsReady, setCard2DotsReady] = useState(false);
  const [card3DotsReady, setCard3DotsReady] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    container: scrollContainerRef,
  });

  const arrow1Opacity = useTransform(scrollYProgress, [0.3, 0.45], [0.9, 0]);
  const arrow2Opacity = useTransform(
    scrollYProgress,
    [0.3, 0.45, 0.75, 0.9],
    [0, 0.7, 0.7, 0],
  );

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

  const handleScrollToNext = (pageIndex: number) => {
    if (!scrollContainerRef.current) return;
    const scroller = scrollContainerRef.current;
    scroller.scrollTo({
      top: pageIndex * scroller.clientHeight * 0.72,
      behavior: "smooth",
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === "application/pdf") {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
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

  return (
    <div className="flex h-[100dvh] w-full flex-col gap-3 overflow-hidden bg-[#030303] px-3 pb-4 pt-16 md:gap-5 md:px-5 md:pb-6 md:pt-20 xl:flex-row xl:gap-8 xl:px-8 xl:pb-8 xl:pt-24">
      <div className="relative flex min-h-[38vh] w-full flex-1 shrink flex-col overflow-hidden rounded-2xl border border-[#1a1a1a] bg-[#0A0A0B] shadow-2xl xl:h-full xl:min-h-0">
        {pdfUrl ? (
          <>
            <div className="absolute top-4 right-4 z-40 flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/55 px-3 py-2 text-xs font-semibold text-zinc-200 backdrop-blur-xl shadow-[0_12px_34px_rgba(0,0,0,0.45)] transition-colors hover:bg-white/10 hover:text-white"
              >
                <RefreshCw size={13} /> Replace
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
              accept="application/pdf"
              ref={fileInputRef}
              className="hidden"
              onChange={handleFileChange}
            />
            <PdfViewer />
          </>
        ) : (
          <div
            ref={scrollContainerRef}
            className="flex-1 w-full h-full flex flex-col overflow-auto relative custom-scroll"
          >
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  "radial-gradient(circle at center, rgba(255,255,255,0.03) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
                backgroundAttachment: "local",
              }}
            />

            <div className="z-10 mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-start overflow-visible p-5 pb-[12vh] pt-[6vh] sm:p-6 md:p-10 lg:p-12 xl:p-10">
              {/* Text 1: Automatic Reveal */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mb-6 w-full overflow-visible py-3 text-center md:mb-8"
              >
                <h2 className="flex flex-wrap justify-center gap-x-[0.25em] gap-y-2 overflow-visible font-serif text-2xl leading-[1.35] tracking-tight text-white/90 sm:text-3xl lg:text-4xl">
                  {"Learning, redefined. Extract profound insights from any document."
                    .split(" ")
                    .map((word, i, arr) => (
                      <motion.span
                        key={i}
                        className="inline-block"
                        initial={{ opacity: 0, filter: "blur(12px)", y: 10 }}
                        animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                        transition={{
                          duration: 0.8,
                          delay: i * 0.15,
                          ease: "easeOut",
                        }}
                        onAnimationComplete={() => {
                          if (i === arr.length - 1) setCard1DotsReady(true);
                        }}
                      >
                        {word}
                      </motion.span>
                    ))}
                </h2>
              </motion.div>

              {/* Card 1: Interactive Tutor Container */}
              <div className="flex flex-col items-center w-full justify-center relative mb-8">
                <div className="flex items-center gap-8 flex-col md:flex-row w-full justify-center">
                  <PatternCard
                    bgClass={themes[2].bg}
                    SvgComponent={themes[2].SvgComponent}
                    bloomColor={themes[2].bloom}
                    bloomOpacity={themes[2].bloomOpacity}
                    animateDots={card1DotsReady}
                  >
                    <div className="absolute flex flex-col bottom-[38px] left-[38px] right-[38px] gap-[7px] z-20 pointer-events-none">
                      <div className="p-3 rounded-full w-fit mb-2 transition-colors bg-black/10 text-black border border-black/10 shadow-lg">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <div className="text-[25px] font-medium tracking-tight leading-[1.05] text-black">
                        Interactive
                        <br />
                        Tutor
                      </div>
                      <div className="text-[16px] font-light tracking-tight leading-[1.25] opacity-70 text-black">
                        Chat with your document and test your knowledge.
                      </div>
                    </div>
                  </PatternCard>
                </div>

                {/* Scroll Indicator 1 (Beige card -> Orange accent) in normal flow */}
                <motion.button
                  type="button"
                  onClick={() => handleScrollToNext(1)}
                  className="mt-12 flex flex-col items-center group focus:outline-none cursor-pointer z-30"
                  style={{ opacity: arrow1Opacity }}
                >
                  <span
                    className="text-[10px] uppercase tracking-[0.25em] font-semibold mb-1 transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-300 group-hover:scale-110 group-hover:text-orange-400"
                    style={{
                      color: "#ff6e00",
                      textShadow: "0 0 12px rgba(255,110,0,0.4)",
                    }}
                  >
                    Scroll
                  </span>
                  <CurvedArrow color="#ff6e00" />
                </motion.button>
              </div>

              <div className="h-[8vh] w-full shrink-0" />

              {/* Text 2: Brain Graph */}
              <div className="w-full mb-16 text-center">
                <AnimatedScrollText
                  text="Map complex concepts into your personalized brain graph."
                  className="justify-center font-serif text-2xl leading-[1.4] tracking-tight text-white/90 sm:text-3xl lg:text-4xl"
                  scrollContainerRef={scrollContainerRef}
                  fullRevealDistance={300}
                  onRevealComplete={setCard2DotsReady}
                />
              </div>

              {/* Card 2: Knowledge Graph Container */}
              <div className="flex flex-col items-center w-full justify-center relative mb-8">
                <div className="flex items-center gap-8 flex-col md:flex-row w-full justify-center">
                  <PatternCard
                    bgClass={`${themes[0].bg} border border-white/10`}
                    SvgComponent={themes[0].SvgComponent}
                    bloomColor={themes[0].bloom}
                    bloomOpacity={themes[0].bloomOpacity}
                    animateDots={card2DotsReady}
                  >
                    <div className="absolute flex flex-col bottom-[38px] left-[38px] right-[38px] gap-[7px] z-20 pointer-events-none">
                      <div className="p-3 rounded-full w-fit mb-2 transition-colors bg-white/10 text-white border border-white/20 shadow-lg">
                        <RefreshCw className="w-5 h-5" />
                      </div>
                      <div className="text-[25px] font-medium tracking-tight leading-[1.05] text-[#fefefe]">
                        Knowledge
                        <br />
                        Graph
                      </div>
                      <div className="text-[16px] font-light tracking-tight leading-[1.25] opacity-70 text-[#fefefe]">
                        Visualize how concepts connect across all your
                        documents.
                      </div>
                    </div>
                  </PatternCard>
                </div>

                {/* Scroll Indicator 2 (Dark card -> White accent) in normal flow */}
                <motion.button
                  type="button"
                  onClick={() => handleScrollToNext(2)}
                  className="mt-12 flex flex-col items-center group focus:outline-none cursor-pointer z-30"
                  style={{ opacity: arrow2Opacity }}
                >
                  <span
                    className="text-[10px] uppercase tracking-[0.25em] font-semibold mb-1 transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-300 group-hover:scale-110 group-hover:text-zinc-200"
                    style={{
                      color: "#ffffff",
                      textShadow: "0 0 12px rgba(255,255,255,0.4)",
                    }}
                  >
                    Scroll
                  </span>
                  <CurvedArrow color="#ffffff" />
                </motion.button>
              </div>

              <div className="h-[8vh] w-full shrink-0" />

              {/* Text 3: Upload Document */}
              <div className="w-full text-center pb-16">
                <AnimatedScrollText
                  text="Upload your first document to retain knowledge forever."
                  className="justify-center font-serif text-2xl leading-[1.4] tracking-tight text-white/90 sm:text-3xl lg:text-4xl"
                  scrollContainerRef={scrollContainerRef}
                  fullRevealDistance={300}
                  onRevealComplete={setCard3DotsReady}
                />
              </div>

              {/* Card 3: Final Upload Button */}
              <div className="flex items-center gap-8 flex-col md:flex-row w-full justify-center">
                <input
                  type="file"
                  accept="application/pdf"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={handleFileChange}
                />

                <PatternCard
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  isDragging={isDragging}
                  bgClass={themes[1].bg} // Orange theme
                  SvgComponent={themes[1].SvgComponent}
                  bloomColor={themes[1].bloom}
                  bloomOpacity={themes[1].bloomOpacity}
                  animateDots={card3DotsReady}
                >
                  <div className="absolute flex flex-col bottom-[38px] left-[38px] right-[38px] gap-[7px] z-20 pointer-events-none">
                    <div className="p-3 rounded-full w-fit mb-2 transition-colors bg-[#ff6e00]/20 text-white border border-white/20 shadow-lg">
                      <UploadCloud className="w-5 h-5" />
                    </div>
                    <div className="text-[25px] font-medium tracking-tight leading-[1.05] text-[#fefefe]">
                      Upload
                      <br />
                      Document
                    </div>
                    <div className="text-[16px] font-light tracking-tight leading-[1.25] opacity-70 text-[#fefefe]">
                      Drag & drop your PDF here to begin learning.
                    </div>
                  </div>
                </PatternCard>
              </div>
            </div>
          </div>
        )}
      </div>

      <motion.aside
        layout="position"
        transition={{ type: "spring", stiffness: 260, damping: 34, mass: 0.8 }}
        className="flex min-h-0 w-full flex-1 origin-bottom-right flex-col gap-2 md:gap-3 xl:h-[calc(100%-0.5rem)] xl:w-[36%] xl:max-w-[560px] xl:flex-none xl:self-center"
      >
        <AnimatePresence initial={false} mode="popLayout">
          {isChatOpen ? (
            <motion.div
              key="chat-panel"
              layout="position"
              initial={{ opacity: 0, y: 18, scale: 0.98, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{
                opacity: 0,
                y: 10,
                scale: 0.985,
                filter: "blur(5px)",
                transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
              }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 32,
                mass: 0.8,
              }}
              className="min-h-0 flex-1 overflow-hidden rounded-3xl border border-black/5 bg-[#fdfdfd] text-[#050505] shadow-[0_20px_60px_rgba(0,0,0,0.15)] origin-bottom"
            >
              <ChatPanel onClose={() => setIsChatOpen(false)} />
            </motion.div>
          ) : (
            <motion.button
              key="chat-minimized"
              layout="position"
              initial={{ opacity: 0, y: 10, scale: 0.98, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: 8, scale: 0.98, filter: "blur(4px)" }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsChatOpen(true)}
              className="group relative flex min-h-[92px] items-center justify-between overflow-hidden rounded-[28px] border border-white/10 bg-[#0a0a0a] px-5 py-4 text-left text-white shadow-[0_18px_54px_rgba(0,0,0,0.34)] transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-300 hover:border-white/20 hover:shadow-[0_22px_60px_rgba(255,110,0,0.1)]"
            >
              {/* Radial Gradients matching Usage UI */}
              <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_16%_0%,rgba(255,110,0,0.24),transparent_36%),radial-gradient(circle_at_90%_110%,rgba(255,255,255,0.08),transparent_38%)] transition-opacity duration-300 group-hover:opacity-100 opacity-80" />
              {/* Dot Grid matching Usage UI */}
              <div
                className="absolute inset-0 pointer-events-none opacity-[0.1]"
                style={{
                  backgroundImage:
                    "radial-gradient(circle at center, rgba(255,255,255,0.2) 1px, transparent 1px)",
                  backgroundSize: "22px 22px",
                }}
              />

              <div className="relative z-10 flex items-center justify-between w-full">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#ff6e00]/20 bg-[#ff6e00]/10 text-[#ff6e00] shadow-[0_0_15px_rgba(255,110,0,0.15)] transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-300 group-hover:scale-105 group-hover:border-[#ff6e00]/40 group-hover:bg-[#ff6e00]/20 group-hover:shadow-[0_0_22px_rgba(255,110,0,0.3)]">
                    <MessageSquare size={18} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold tracking-tight text-white group-hover:text-[#ff6e00] transition-colors duration-300">
                      Tutor minimized
                    </div>
                    <div className="text-xs text-white/45">
                      Open without resizing the document.
                    </div>
                  </div>
                </div>
                <div className="rounded-full border border-[#ff6e00]/30 bg-[#ff6e00]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#ff6e00] transition-[color,background-color,border-color,box-shadow,transform,opacity] duration-300 group-hover:scale-105 group-hover:border-[#ff6e00]/50 group-hover:bg-[#ff6e00]/20 group-hover:text-white group-hover:shadow-[0_0_15px_rgba(255,110,0,0.4)]">
                  Open
                </div>
              </div>
            </motion.button>
          )}
        </AnimatePresence>
      </motion.aside>
    </div>
  );
}
