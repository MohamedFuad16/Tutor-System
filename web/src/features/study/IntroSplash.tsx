/**
 * First-run hero: three headlines reveal word by word while the three
 * signature cards deal themselves into a fan. The ember card is the upload
 * target (click or drop a PDF). Everything is spring-driven and collapses to
 * the final state instantly when motion is off.
 *
 * With room (≥ 880 px) the final fan spreads so every card reads in full.
 * Narrower, the cards stack and the two behind show only pattern and icon, so
 * no title is ever cut off by the card in front of it.
 */
import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { Layers, MessageSquare, UploadCloud } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MetalText } from "@/components/fx/Metal";
import { PatternCard, type CardTheme } from "@/components/PatternCard";
import { Spinner, cx } from "@/components/ui";
import { useT } from "@/lib/i18n";
import { useMotion } from "@/store/app";

type Target = { opacity: number; x: string; y: number; scale: number; rotate: number; filter: string };

/** Width at which the final fan spreads out instead of stacking. */
const SPREAD_MIN_WIDTH = 880;

/** Card poses per choreography step (0 hidden → 4 final fan). */
function pose(step: number, index: number, compact: boolean, spread: boolean): Target {
  const hidden = (x: string, rotate: number): Target => ({
    opacity: 0,
    x,
    y: 40,
    scale: 0.82,
    rotate,
    filter: "blur(14px)",
  });
  const at = (x: string, y: number, scale: number, rotate: number, opacity = 1): Target => ({
    opacity,
    x,
    y,
    scale,
    rotate,
    filter: "blur(0px)",
  });
  if (step >= 4 && spread) {
    // Overlap only at the pattern edges, never over another card's text.
    return [at("-142%", 16, 0.94, -5), at("-50%", 4, 0.97, -1.2), at("42%", 0, 1, 3)][index];
  }
  if (step >= 4) {
    return [
      at(compact ? "-62%" : "-74%", compact ? 12 : 18, compact ? 0.88 : 0.9, compact ? -4 : -5),
      at("-50%", 9, 0.94, -1.6),
      at(compact ? "-38%" : "-26%", 0, 1, compact ? 1.4 : 2),
    ][index];
  }
  if (step === 0) return hidden(["-50%", "-18%", "8%"][index], [0, 8, 14][index]);
  if (step === 1) return index === 0 ? at("-50%", 0, 1, 0) : hidden(index === 1 ? "-18%" : "8%", index === 1 ? 8 : 14);
  if (step === 2) {
    return [
      at(compact ? "-68%" : "-82%", 10, 0.84, compact ? -5.5 : -7, 0.9),
      at("-50%", 0, 1, 0),
      hidden(compact ? "-22%" : "-10%", 12),
    ][index];
  }
  return [
    at(compact ? "-76%" : "-98%", 10, 0.78, compact ? -6 : -8, 0.86),
    at(compact ? "-58%" : "-63%", 2, 0.89, -3, 0.94),
    at(compact ? "-40%" : "-35%", 6, 0.95, compact ? 4 : 5.5),
  ][index];
}

const HEADLINE_FONT = '400 clamp(1.25rem, 2.3vw, 2.05rem)/1.2 "Lora", ui-serif, Georgia, serif';

function Headline({ text, onDone, animate }: { text: string; onDone: () => void; animate: boolean }) {
  const words = text.split(" ");
  useEffect(() => {
    if (!animate) {
      onDone();
      return;
    }
    const timer = window.setTimeout(onDone, 700 + words.length * 90);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, animate]);
  return (
    <h1 className="flex max-w-[40rem] flex-wrap justify-center gap-x-[0.28em] gap-y-1 px-2 text-center font-serif text-[clamp(1.25rem,2.3vw,2.05rem)] leading-[1.2] font-normal tracking-normal text-white/92">
      {words.map((word, index) => (
        <motion.span
          key={`${text}-${index}`}
          initial={animate ? { opacity: 0, y: 16, filter: "blur(16px)" } : false}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 1.1, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="inline-block"
        >
          {/* libraries.dev liquid metal on the one headline of the screen. */}
          <MetalText font={HEADLINE_FONT} color="#f4f4f1">
            {word}
          </MetalText>
        </motion.span>
      ))}
    </h1>
  );
}

/** Dot field that leans toward the cursor — the dot-matrix motif as ambience. */
function DotField() {
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const sx = useSpring(mx, { stiffness: 40, damping: 18 });
  const sy = useSpring(my, { stiffness: 40, damping: 18 });
  const bg = useTransform(
    [sx, sy],
    ([x, y]) =>
      `radial-gradient(600px circle at ${(x as number) * 100}% ${(y as number) * 100}%, rgba(255,110,0,0.10), transparent 60%)`,
  );
  return (
    <motion.div
      aria-hidden
      className="absolute inset-0"
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        mx.set((event.clientX - rect.left) / rect.width);
        my.set((event.clientY - rect.top) / rect.height);
      }}
    >
      <div className="absolute inset-0 opacity-[0.22] [background-image:radial-gradient(rgba(255,255,255,0.35)_1px,transparent_1.2px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]" />
      <motion.div className="absolute inset-0" style={{ background: bg }} />
    </motion.div>
  );
}

function TiltCard({ children, className, style }: { children: ReactNode; className?: string; style?: Target }) {
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 200, damping: 18 });
  const sry = useSpring(ry, { stiffness: 200, damping: 18 });
  return (
    <motion.div
      className={className}
      initial={false}
      animate={style}
      transition={{ type: "spring", stiffness: 90, damping: 18, mass: 0.9 }}
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 900 }}
      onPointerMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        ry.set(((event.clientX - rect.left) / rect.width - 0.5) * 10);
        rx.set(-((event.clientY - rect.top) / rect.height - 0.5) * 10);
      }}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
    >
      {children}
    </motion.div>
  );
}

export function IntroSplash({
  onFiles,
  uploading,
  compactHint,
}: {
  onFiles: (files: File[]) => void;
  uploading: boolean;
  compactHint?: ReactNode;
}) {
  const t = useT();
  const animate = useMotion();
  const headlines = [t("hero1"), t("hero2"), t("hero3")];
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState(animate ? 1 : 4);
  const [dragging, setDragging] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const [spread, setSpread] = useState(false);
  const [compact, setCompact] = useState(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 640px)").matches,
  );

  useEffect(() => {
    const query = window.matchMedia("(max-width: 640px)");
    const update = () => setCompact(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const measure = () => setSpread(element.clientWidth >= SPREAD_MIN_WIDTH);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const finalStep = (animate ? step : 4) >= 4;

  const advance = () => {
    if (!animate) return;
    window.setTimeout(() => {
      setIndex((current) => {
        if (current < 2) {
          setStep(current + 2);
          return current + 1;
        }
        setStep(4);
        return current;
      });
    }, 650);
  };

  const cards: Array<{ theme: CardTheme; pattern: number; title: string; body: string; icon: ReactNode }> = [
    {
      theme: "paper",
      pattern: 2,
      title: t("tutorTitle"),
      body: t("tutorBody"),
      icon: <MessageSquare className="size-5" />,
    },
    { theme: "ink", pattern: 0, title: t("guideTitle"), body: t("guideBody"), icon: <Layers className="size-5" /> },
    {
      theme: "ember",
      pattern: 1,
      title: uploading ? t("uploading") : t("uploadTitle"),
      body: uploading ? "" : t("uploadBody"),
      icon: uploading ? <Spinner className="size-5" /> : <UploadCloud className="size-5" />,
    },
  ];

  return (
    <div
      ref={root}
      className="relative flex h-full w-full flex-col items-center justify-center overflow-hidden px-4 pt-20 pb-10"
    >
      <DotField />
      <div className="relative z-10 flex min-h-[6.5rem] items-end justify-center">
        <AnimatePresence mode="wait">
          <motion.div key={index} exit={{ opacity: 0, filter: "blur(10px)", y: -8 }} transition={{ duration: 0.35 }}>
            <Headline text={headlines[index]} onDone={advance} animate={animate} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative z-10 mt-8 h-[25.5rem] w-full max-w-3xl sm:h-[26rem]">
        {cards.map((card, i) => (
          <TiltCard
            key={card.theme}
            className="absolute top-0 left-1/2 w-[15.5rem] sm:w-[18rem]"
            style={pose(animate ? step : 4, i, compact, spread)}
          >
            {i === 2 ? (
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  const files = [...event.dataTransfer.files].filter(
                    (file) => /\.pdf$/i.test(file.name) || file.type === "application/pdf",
                  );
                  if (files.length) onFiles(files);
                }}
                className={cx(
                  "rounded-[2rem] transition-shadow",
                  dragging && "shadow-[0_0_0_3px_#fff,0_0_60px_rgba(255,110,0,0.8)]",
                )}
              >
                <PatternCard
                  theme={card.theme}
                  pattern={card.pattern}
                  title={card.title}
                  subtitle={card.body}
                  icon={card.icon}
                  onClick={() => !uploading && input.current?.click()}
                  className="min-h-[21rem] w-full sm:min-h-[23rem]"
                />
              </div>
            ) : (
              <PatternCard
                theme={card.theme}
                pattern={card.pattern}
                title={card.title}
                subtitle={card.body}
                icon={card.icon}
                quiet={finalStep && !spread}
                className="min-h-[21rem] w-full sm:min-h-[23rem]"
              />
            )}
          </TiltCard>
        ))}
      </div>

      <input
        ref={input}
        type="file"
        accept="application/pdf,.pdf"
        multiple
        hidden
        onChange={(event) => {
          const files = [...(event.target.files ?? [])];
          if (files.length) onFiles(files);
          event.target.value = "";
        }}
      />

      <div className="relative z-10 mt-4 flex items-center gap-2">
        {[0, 1, 2].map((dot) => (
          <motion.span
            key={dot}
            animate={{ width: dot === index ? 36 : 6, opacity: dot === index ? 1 : 0.35 }}
            className={cx("h-1.5 rounded-full", dot === index ? "bg-signal" : "bg-white")}
          />
        ))}
      </div>
      {compactHint && <div className="relative z-10 mt-5">{compactHint}</div>}
    </div>
  );
}
