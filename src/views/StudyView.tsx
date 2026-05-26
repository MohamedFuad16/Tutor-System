import React, { useState, useRef } from 'react';
import { PdfViewer } from '../components/PdfViewer';
import { ChatPanel, UsageAnalyticsStrip } from '../components/ChatPanel';
import { useStore } from '../store';
import { UploadCloud, MessageSquare, X, RefreshCw } from 'lucide-react';
import { PatternCard, themes } from '../components/PatternCard';
import { AnimatedScrollText } from '../components/AnimatedScrollText';
import { motion, AnimatePresence } from 'motion/react';

export function StudyView() {
  const pdfUrl = useStore(state => state.pdfUrl);
  const setPdfUrl = useStore(state => state.setPdfUrl);
  const setPdfPage = useStore(state => state.setPdfPage);
  const setPdfTotalPages = useStore(state => state.setPdfTotalPages);
  const setSelectedTextContext = useStore(state => state.setSelectedTextContext);
  const setActiveView = useStore(state => state.setActiveView);
  const [isDragging, setIsDragging] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
      const url = URL.createObjectURL(file);
      setPdfUrl(url);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === 'application/pdf') {
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
    setSelectedTextContext('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-[#030303] overflow-hidden pt-16 md:pt-24 pb-4 md:pb-8 px-3 md:px-6 lg:px-8 gap-3 md:gap-6 lg:gap-8">
      <div className="w-full flex-1 md:h-full min-h-[30vh] border border-[#1a1a1a] rounded-2xl flex flex-col shrink relative bg-[#0A0A0B] overflow-hidden shadow-2xl">
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
            <div ref={scrollContainerRef} className="flex-1 w-full h-full flex flex-col overflow-auto relative custom-scroll">
              <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, rgba(255,255,255,0.03) 1px, transparent 1px)', backgroundSize: '24px 24px', backgroundAttachment: 'local' }} />
              
              <div className="w-full flex-1 flex flex-col items-center justify-start z-10 p-6 md:p-12 lg:p-20 pt-[8vh] pb-[20vh] max-w-4xl mx-auto">
                
                <div className="w-full mb-8 text-center">
                  <AnimatedScrollText 
                    text="Learning, redefined. Extract profound insights from any document."
                    className="text-3xl md:text-4xl font-serif text-white/90 leading-[1.4] tracking-tight justify-center"
                    scrollContainerRef={scrollContainerRef}
                    fullRevealDistance={200}
                  />
                </div>

                <div className="w-full mb-16 text-center">
                  <AnimatedScrollText 
                    text="Map complex concepts into your personalized brain graph."
                    className="text-3xl md:text-4xl font-serif text-white/90 leading-[1.4] tracking-tight justify-center"
                    scrollContainerRef={scrollContainerRef}
                    fullRevealDistance={200}
                  />
                </div>

                <div className="flex items-center gap-8 flex-col md:flex-row w-full justify-center mb-32">
                  <input 
                    type="file" 
                    accept="application/pdf" 
                    ref={fileInputRef}
                    className="hidden" 
                    onChange={handleFileChange}
                  />
                  
                  <PatternCard
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={handleDrop}
                    isDragging={isDragging}
                    bgClass={themes[1].bg} // Orange theme
                    SvgComponent={themes[1].SvgComponent}
                    bloomColor={themes[1].bloom}
                    bloomOpacity={themes[1].bloomOpacity}
                  >
                    <div className="absolute flex flex-col bottom-[38px] left-[38px] right-[38px] gap-[7px] z-20 pointer-events-none">
                      <div className="p-3 rounded-full w-fit mb-2 transition-colors bg-[#ff6e00]/20 text-white border border-white/20 shadow-lg">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div className="text-[25px] font-medium tracking-tight leading-[1.05] text-[#fefefe]">
                        Upload<br/>Document
                      </div>
                      <div className="text-[16px] font-light tracking-tight leading-[1.25] opacity-70 text-[#fefefe]">
                        Drag & drop your PDF here to begin learning.
                      </div>
                    </div>
                  </PatternCard>
                </div>

                <div className="w-full text-center pb-32">
                  <AnimatedScrollText 
                    text="Upload your first document to retain knowledge forever."
                    className="text-3xl md:text-4xl font-serif text-white/90 leading-[1.4] tracking-tight justify-center"
                    scrollContainerRef={scrollContainerRef}
                    fullRevealDistance={300}
                  />
                </div>
              </div>
            </div>
        )}
      </div>

      <motion.aside
        layout
        transition={{ type: "spring", stiffness: 360, damping: 30 }}
        className="flex w-full min-h-0 origin-bottom-right flex-col gap-2 md:gap-3 md:w-[44%] md:max-w-[560px] md:self-center lg:w-[40%] xl:w-[36%] flex-1 md:flex-none md:h-[calc(100%-0.5rem)]"
      >
        <div className="shrink-0">
          <UsageAnalyticsStrip />
        </div>

        <AnimatePresence mode="wait">
          {isChatOpen ? (
            <motion.div
              key="chat-panel"
              initial={{ opacity: 0, y: 30, scale: 0.95, filter: "blur(10px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: 20, scale: 0.98, filter: "blur(8px)", transition: { duration: 0.15 } }}
              transition={{ type: "spring", stiffness: 350, damping: 30, mass: 0.9 }}
              className="min-h-0 flex-1 overflow-hidden rounded-3xl border border-black/5 bg-[#fdfdfd] text-[#050505] shadow-[0_20px_60px_rgba(0,0,0,0.15)] origin-bottom"
            >
              <ChatPanel onClose={() => setIsChatOpen(false)} />
            </motion.div>
          ) : (
            <motion.button
              key="chat-minimized"
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsChatOpen(true)}
              className="group flex min-h-[92px] items-center justify-between rounded-[28px] border border-white/10 bg-[#0a0a0a] px-5 py-4 text-left text-white shadow-[0_18px_54px_rgba(0,0,0,0.34)] transition-colors hover:bg-[#111]"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-white shadow-[0_12px_30px_rgba(255,255,255,0.08)]">
                  <MessageSquare size={18} />
                </div>
                <div>
                  <div className="text-sm font-semibold">Tutor minimized</div>
                  <div className="text-xs text-white/45">Open without resizing the document.</div>
                </div>
              </div>
              <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-white/65 transition-colors group-hover:text-white">
                Open
              </div>
            </motion.button>
          )}
        </AnimatePresence>
      </motion.aside>
    </div>
  );
}
