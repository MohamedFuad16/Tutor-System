/**
 * The visual study guide: a paper notebook that writes itself. Hero summary,
 * concept map, a table of contents, and section "pages" with key points,
 * diagrams (with narrated walk-through), worked examples, callouts and
 * self-check flip cards; then glossary, common traps and next steps.
 */
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  ArrowLeft,
  BookMarked,
  BookOpen,
  Brain,
  ChartLine,
  Clock,
  Code2,
  Cpu,
  FlaskConical,
  Globe,
  Layers,
  Lightbulb,
  Pin,
  Puzzle,
  RefreshCw,
  Sigma,
  Sparkles,
  Target,
  Volume2,
  Workflow,
  X,
  Check,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import type { GuideSection, StudyGuide } from "@shared/guide";
import { Diagram } from "@/components/Diagram";
import { Markdown } from "@/components/Markdown";
import { Button, MasteryRing, Spinner, cx, relativeTime, softSpring, spring } from "@/components/ui";
import { speak, stopSpeaking } from "@/lib/speaker";
import { useApp } from "@/store/app";
import { ConceptMap, MASTERY_LEGEND } from "./ConceptMap";

const ICONS: Record<string, typeof Lightbulb> = {
  idea: Lightbulb,
  flow: Workflow,
  code: Code2,
  math: Sigma,
  book: BookOpen,
  cpu: Cpu,
  globe: Globe,
  beaker: FlaskConical,
  layers: Layers,
  chart: ChartLine,
  clock: Clock,
  puzzle: Puzzle,
};

const CALLOUTS = {
  tip: { icon: Lightbulb, label: "Tip", className: "bg-[#eef6ee] text-[#244226] ring-[#cfe3cf]" },
  warning: { icon: AlertTriangle, label: "Watch out", className: "bg-[#fbeee6] text-[#5a2a12] ring-[#f0d2bd]" },
  remember: { icon: Pin, label: "Remember", className: "bg-[#efeaf9] text-[#35285a] ring-[#dcd3f1]" },
};

function SelfCheck({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <button
      onClick={() => setOpen((value) => !value)}
      className="group relative h-full min-h-28 w-full text-left [perspective:900px]"
      aria-expanded={open}
    >
      <motion.div
        className="relative h-full min-h-28 w-full [transform-style:preserve-3d]"
        animate={{ rotateY: open ? 180 : 0 }}
        transition={softSpring}
      >
        <div className="paper-card absolute inset-0 flex flex-col p-4 [backface-visibility:hidden]">
          <span className="mb-2 text-[0.65rem] tracking-widest text-paper-muted uppercase">Question</span>
          <span className="font-serif text-[0.95rem] leading-snug">{q}</span>
          <span className="mt-auto pt-2 text-[0.7rem] text-paper-muted opacity-0 transition-opacity group-hover:opacity-100">
            Tap to reveal
          </span>
        </div>
        <div className="absolute inset-0 flex flex-col rounded-[1.25rem] bg-[#2b251d] p-4 text-[#f7f3ec] [backface-visibility:hidden] [transform:rotateY(180deg)]">
          <span className="mb-2 text-[0.65rem] tracking-widest text-[#c9b99f] uppercase">Answer</span>
          <span className="font-serif text-[0.92rem] leading-snug">{a}</span>
        </div>
      </motion.div>
    </button>
  );
}

function SectionPage({
  section,
  index,
  guide,
  mastery,
  highlighted,
  readOnly,
}: {
  section: GuideSection;
  index: number;
  guide: StudyGuide;
  mastery: Record<string, number>;
  highlighted: boolean;
  readOnly: boolean;
}) {
  const Icon = ICONS[section.icon] ?? Lightbulb;
  const jump = useApp((state) => state.jump);
  const concepts = section.conceptIds.map((id) => guide.concepts.find((concept) => concept.id === id)).filter(Boolean);
  return (
    <motion.article
      id={`section-${section.id}`}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={softSpring}
      className={cx("paper-card scroll-mt-24 overflow-hidden p-6 sm:p-8", highlighted && "ring-2 ring-signal/60")}
    >
      <header className="flex items-start gap-4">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-[#2b251d] text-[#f7f3ec]">
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-mono text-[0.68rem] tracking-widest text-paper-muted uppercase">Section {index + 1}</div>
          <h3 className="mt-0.5 font-serif text-[1.55rem] leading-tight font-medium text-paper-ink">{section.title}</h3>
          {concepts.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {concepts.map((concept) => (
                <span
                  key={concept!.id}
                  className="flex items-center gap-1.5 rounded-full bg-[#efe7d8] py-0.5 pr-2.5 pl-1 text-[0.72rem] text-[#4a4034]"
                >
                  <MasteryRing value={mastery[concept!.id] ?? -1} size={16} stroke={2.5} />
                  {concept!.label}
                </span>
              ))}
            </div>
          )}
        </div>
      </header>

      {section.tldr && (
        <p className="mt-5 border-l-[3px] border-signal pl-4 font-serif text-[1.15rem] leading-relaxed text-[#3b3226] italic">
          {section.tldr}
        </p>
      )}

      {section.keyPoints.length > 0 && (
        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {section.keyPoints.map((point) => (
            <li
              key={point}
              className="flex items-start gap-2.5 rounded-xl bg-[#f3ecdf]/70 px-3 py-2 text-[0.9rem] leading-snug text-[#2f281f]"
            >
              <Check className="mt-0.5 size-4 shrink-0 text-signal" />
              {point}
            </li>
          ))}
        </ul>
      )}

      {section.explanation && <Markdown text={section.explanation} tone="paper" className="mt-5" />}

      {section.diagram?.mermaid && (
        <div className="mt-5">
          <Diagram
            source={section.diagram.mermaid}
            caption={section.diagram.caption}
            title={section.title}
            theme="paper"
            context={section.explanation}
          />
        </div>
      )}

      {section.example && (
        <div className="mt-5 rounded-2xl border border-dashed border-[#cdbfa8] bg-[#fbf7ef] p-4">
          <div className="mb-1 flex items-center gap-2 text-[0.7rem] tracking-widest text-paper-muted uppercase">
            <Target className="size-3.5" /> Worked example · {section.example.title}
          </div>
          <Markdown text={section.example.body} tone="paper" />
        </div>
      )}

      {section.callouts.length > 0 && (
        <div className="mt-5 grid gap-2">
          {section.callouts.map((callout) => {
            const style = CALLOUTS[callout.kind] ?? CALLOUTS.tip;
            const CalloutIcon = style.icon;
            return (
              <div
                key={callout.text}
                className={cx("flex items-start gap-3 rounded-2xl px-4 py-3 text-[0.9rem] ring-1", style.className)}
              >
                <CalloutIcon className="mt-0.5 size-4 shrink-0" />
                <div>
                  <span className="mr-1.5 font-semibold">{style.label}.</span>
                  {callout.text}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {section.selfCheck.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 flex items-center gap-2 text-[0.7rem] tracking-widest text-paper-muted uppercase">
            <Brain className="size-3.5" /> Check yourself
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {section.selfCheck.map((item) => (
              <SelfCheck key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        </div>
      )}

      {!readOnly && section.sourcePages.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-1.5 text-xs text-paper-muted">
          <BookMarked className="size-3.5" /> From
          {section.sourcePages.map((ref) => (
            <button
              key={`${ref.documentId}:${ref.page}`}
              onClick={() => jump(ref.documentId, ref.page)}
              className="rounded-full bg-[#efe7d8] px-2 py-0.5 font-mono text-[0.7rem] text-[#5a4c3a] hover:bg-[#e4d8c3]"
            >
              p.{ref.page}
            </button>
          ))}
        </div>
      )}
    </motion.article>
  );
}

export function GuideView({
  guide,
  mastery,
  syncing,
  onBack,
  onSync,
  onReview,
  dueCount,
  readOnly = false,
  empty,
}: {
  guide: StudyGuide;
  mastery: Record<string, number>;
  syncing?: boolean;
  onBack: () => void;
  onSync?: () => void;
  onReview?: () => void;
  dueCount?: number;
  readOnly?: boolean;
  empty?: ReactNode;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const language = useApp((state) => state.language);

  const highlightedSections = useMemo(
    () =>
      new Set(
        selected
          ? guide.sections.filter((section) => section.conceptIds.includes(selected)).map((section) => section.id)
          : [],
      ),
    [selected, guide.sections],
  );
  const selectedConcept = guide.concepts.find((concept) => concept.id === selected);
  const assessed = Object.values(mastery).filter((value) => value >= 0);
  const mastered = assessed.filter((value) => value >= 0.8).length;

  const listen = async () => {
    if (listening) {
      stopSpeaking();
      setListening(false);
      return;
    }
    setListening(true);
    const script = [
      guide.title,
      guide.summary,
      ...guide.sections.map((section) => `${section.title}. ${section.tldr} ${section.keyPoints.join(". ")}`),
    ].join("\n\n");
    await speak(script, language);
    setListening(false);
  };

  return (
    <div className="paper scroll-quiet h-full overflow-y-auto">
      {/* Sticky toolbar */}
      <div className="sticky top-0 z-20 border-b border-[#e2d8c6] bg-[#f7f3ec]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 pt-16 pb-2.5 sm:px-8">
          <Button variant="light" size="sm" onClick={onBack} aria-label="Back to library">
            <ArrowLeft className="size-3.5" /> Library
          </Button>
          <div className="hidden min-w-0 flex-1 truncate px-2 text-sm text-paper-muted sm:block">
            {syncing ? (
              <span className="flex items-center gap-2 text-[#5a4c3a]">
                <Spinner className="size-3.5" /> Updating from your latest conversation…
              </span>
            ) : !readOnly && guide.updatedAt ? (
              `Updated ${relativeTime(guide.updatedAt)} · v${guide.version}`
            ) : null}
          </div>
          <div className="flex-1 sm:hidden" />
          <Button
            variant="light"
            size="sm"
            onClick={listen}
            aria-label={listening ? "Stop listening" : "Listen to this guide"}
          >
            {listening ? <X className="size-3.5" /> : <Volume2 className="size-3.5" />} {listening ? "Stop" : "Listen"}
          </Button>
          {onReview && (
            <Button variant="light" size="sm" onClick={onReview}>
              <Brain className="size-3.5" /> Review{dueCount ? ` · ${dueCount}` : ""}
            </Button>
          )}
          {onSync && (
            <Button variant="light" size="sm" onClick={onSync} disabled={syncing} aria-label="Update study guide now">
              <RefreshCw className={cx("size-3.5", syncing && "animate-spin")} />
            </Button>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-8">
        {/* Hero */}
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={softSpring}
          className="pt-10 pb-8"
        >
          <div className="mb-3 flex items-center gap-2 font-mono text-[0.7rem] tracking-[0.2em] text-paper-muted uppercase">
            <Sparkles className="size-3.5 text-signal" /> {readOnly ? "Built-in book" : "Living study guide"}
          </div>
          <h1 className="max-w-4xl font-serif text-[clamp(2rem,4.6vw,3.4rem)] leading-[1.05] font-medium tracking-tight text-paper-ink">
            {guide.title}
          </h1>
          {guide.summary && (
            <p className="mt-5 max-w-3xl font-serif text-[1.18rem] leading-relaxed text-[#3b3226]">{guide.summary}</p>
          )}
          {guide.goals.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {guide.goals.map((goal) => (
                <span
                  key={goal}
                  className="flex items-center gap-1.5 rounded-full border border-[#dccfb9] bg-[#fbf7ef] px-3 py-1 text-xs text-[#4a4034]"
                >
                  <Target className="size-3 text-signal" /> {goal}
                </span>
              ))}
            </div>
          )}
          {!readOnly && (
            <div className="mt-6 flex flex-wrap gap-6 text-sm text-paper-muted">
              <span>
                <b className="font-serif text-2xl text-paper-ink">{guide.sections.length}</b> sections
              </span>
              <span>
                <b className="font-serif text-2xl text-paper-ink">{guide.concepts.length}</b> concepts
              </span>
              <span>
                <b className="font-serif text-2xl text-paper-ink">{mastered}</b> mastered
              </span>
            </div>
          )}
        </motion.header>

        {guide.sections.length === 0 && empty}

        {guide.concepts.length > 0 && (
          <section className="paper-card mb-10 p-4 sm:p-6">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-serif text-xl text-paper-ink">Concept map</h2>
              <div className="flex flex-wrap gap-3 text-[0.7rem] text-paper-muted">
                {MASTERY_LEGEND.map((item) => (
                  <span key={item.label} className="flex items-center gap-1.5">
                    <span className="size-2.5 rounded-full" style={{ background: item.color }} /> {item.label}
                  </span>
                ))}
              </div>
            </div>
            <ConceptMap
              concepts={guide.concepts}
              edges={guide.edges}
              mastery={mastery}
              selected={selected}
              onSelect={setSelected}
            />
            <AnimatePresence>
              {selectedConcept && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={spring}
                  className="mt-2 rounded-2xl bg-[#2b251d] px-4 py-3 text-sm text-[#f7f3ec]"
                >
                  <b className="font-serif text-base">{selectedConcept.label}</b> —{" "}
                  {selectedConcept.blurb || "No definition yet."}
                  {highlightedSections.size > 0 && (
                    <span className="ml-1 text-[#c9b99f]">
                      Highlighted in {highlightedSections.size} section{highlightedSections.size === 1 ? "" : "s"}{" "}
                      below.
                    </span>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </section>
        )}

        <div className="grid gap-8 lg:grid-cols-[14rem_1fr]">
          {guide.sections.length > 1 && (
            <nav className="hidden lg:block" aria-label="Sections">
              <div className="sticky top-32 space-y-1">
                <div className="mb-2 font-mono text-[0.68rem] tracking-widest text-paper-muted uppercase">Contents</div>
                {guide.sections.map((section, index) => (
                  <a
                    key={section.id}
                    href={`#section-${section.id}`}
                    className={cx(
                      "block rounded-lg px-2 py-1.5 text-[0.85rem] leading-snug transition-colors hover:bg-[#efe7d8]",
                      highlightedSections.has(section.id) ? "text-signal-deep" : "text-[#4a4034]",
                    )}
                  >
                    <span className="mr-2 font-mono text-[0.7rem] text-paper-muted">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    {section.title}
                  </a>
                ))}
              </div>
            </nav>
          )}
          <div className={cx("min-w-0 space-y-8", guide.sections.length <= 1 && "lg:col-span-2")}>
            {guide.sections.map((section, index) => (
              <SectionPage
                key={section.id}
                section={section}
                index={index}
                guide={guide}
                mastery={mastery}
                highlighted={highlightedSections.has(section.id)}
                readOnly={readOnly}
              />
            ))}

            {guide.misconceptions.length > 0 && (
              <section className="paper-card p-6 sm:p-8">
                <h2 className="mb-4 font-serif text-xl text-paper-ink">Common traps</h2>
                <div className="grid gap-3">
                  {guide.misconceptions.map((item) => (
                    <div key={item.wrong} className="grid gap-2 rounded-2xl bg-[#fbf7ef] p-4 sm:grid-cols-2">
                      <div className="flex items-start gap-2 text-[0.9rem] text-[#7a2e14]">
                        <X className="mt-0.5 size-4 shrink-0" />{" "}
                        <span className="line-through decoration-[#d9a488]">{item.wrong}</span>
                      </div>
                      <div className="flex items-start gap-2 text-[0.9rem] text-[#1f4a2a]">
                        <Check className="mt-0.5 size-4 shrink-0" /> {item.right}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {guide.glossary.length > 0 && (
              <section className="paper-card p-6 sm:p-8">
                <h2 className="mb-4 font-serif text-xl text-paper-ink">Glossary</h2>
                <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
                  {[...guide.glossary]
                    .sort((a, b) => a.term.localeCompare(b.term))
                    .map((entry) => (
                      <div key={entry.term} className="border-b border-[#e6dccb] pb-3">
                        <dt className="font-serif text-[1.02rem] font-semibold text-paper-ink">{entry.term}</dt>
                        <dd className="mt-1 text-[0.88rem] leading-relaxed text-[#4a4034]">{entry.definition}</dd>
                      </div>
                    ))}
                </dl>
              </section>
            )}

            {guide.nextSteps.length > 0 && (
              <section className="rounded-[1.25rem] bg-[#2b251d] p-6 text-[#f7f3ec] sm:p-8">
                <h2 className="mb-3 font-serif text-xl">Next steps</h2>
                <ol className="space-y-2">
                  {guide.nextSteps.map((step, index) => (
                    <li key={step} className="flex gap-3 text-[0.95rem]">
                      <span className="font-mono text-signal-soft">{index + 1}.</span> {step}
                    </li>
                  ))}
                </ol>
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
