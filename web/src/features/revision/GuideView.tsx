/**
 * The study guide as one continuous paper document, written like a good
 * teacher's revision notes.
 *
 * A sticky toolbar with a reading-progress rule, a hero (title, lead summary,
 * "By the end you can" goals), the concept map, then numbered sections that
 * flow one after another in a serif reading column, with a contents rail
 * (scrollspy) beside them on wide screens. A section shows only what it has,
 * in study order: goal, "In short", explanation, key terms (hide them to test
 * yourself), formulas, timeline, diagram, a worked example revealed step by
 * step, an example, what to remember, tips, what to watch out for, and
 * questions you answer and rate (ratings stay in this browser). The guide
 * ends with common mistakes, a glossary and what to study next.
 *
 * Every string goes through plainText at render time, so guides stored before
 * the plain-language rules (and the built-in books) show no em dashes.
 */
import { AnimatePresence, motion, useScroll, useSpring, type HTMLMotionProps } from "motion/react";
import { ArrowLeft, Brain, Check, RefreshCw, RotateCcw, Volume2, X } from "lucide-react";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import {
  normalizeKey,
  plainText,
  type GuideFormula,
  type GuideSection,
  type GuideTerm,
  type GuideWorked,
  type StudyGuide,
} from "@shared/guide";
import { Diagram } from "@/components/Diagram";
import { Markdown } from "@/components/Markdown";
import { Button, MasteryRing, Spinner, cx, relativeTime, softSpring, spring } from "@/components/ui";
import { speak, stopSpeaking } from "@/lib/speaker";
import { useApp, useMotion } from "@/store/app";
import { ConceptMap, MASTERY_LEGEND } from "./ConceptMap";

type Rating = "got" | "again";
type Checks = Record<string, Rating>;

/** Text for the page: no em or en dashes, even in guides stored before the rule. */
const clean = (text: string | undefined) => plainText(text ?? "");
const cleanTitle = (text: string | undefined) => plainText(text ?? "", "title");
const number = (index: number) => String(index + 1).padStart(2, "0");
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

/** "By the end you can explain X" reads as "Explain X" under the "By the end you can:" heading. */
const goalText = (goal: string) => {
  const text = clean(goal).replace(/^by the end,?\s+you (?:can|will be able to)\s*:?\s*/i, "");
  return text.charAt(0).toUpperCase() + text.slice(1);
};

// ---------------------------------------------------------------------------
// Self-check ratings: `tutor.guide.checks.<bookId>` maps "<sectionId>:<question key>" to a rating.
// ---------------------------------------------------------------------------

const checksKey = (bookId: string) => `tutor.guide.checks.${bookId}`;
export const checkId = (sectionId: string, question: string) => `${sectionId}:${normalizeKey(question)}`;

function readChecks(bookId: string): Checks {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(checksKey(bookId)) ?? "{}");
    return parsed && typeof parsed === "object" ? (parsed as Checks) : {};
  } catch {
    return {};
  }
}

function useChecks(bookId: string) {
  const [checks, setChecks] = useState<Checks>(() => readChecks(bookId));
  useEffect(() => setChecks(readChecks(bookId)), [bookId]);
  const rate = useCallback(
    (id: string, rating: Rating) =>
      setChecks((previous) => {
        const next = { ...previous, [id]: rating };
        try {
          window.localStorage.setItem(checksKey(bookId), JSON.stringify(next));
        } catch {
          // No storage (private mode, quota): the rating still shows for this visit.
        }
        return next;
      }),
    [bookId],
  );
  return { checks, rate };
}

const allGot = (section: GuideSection, checks: Checks) =>
  section.selfCheck.length > 0 && section.selfCheck.every((item) => checks[checkId(section.id, item.q)] === "got");

/** The section being read: the one crossing a band about a quarter of the way down the page. */
function useActiveSection(root: RefObject<HTMLDivElement | null>, layoutKey: string) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const container = root.current;
    if (!container || typeof IntersectionObserver === "undefined") return;
    const elements = [...container.querySelectorAll<HTMLElement>("[data-section]")];
    const order = elements.map((element) => element.dataset.section ?? "");
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = (entry.target as HTMLElement).dataset.section ?? "";
          if (entry.isIntersecting) visible.add(id);
          else visible.delete(id);
        }
        const first = order.find((id) => visible.has(id));
        if (first) setActive(first);
      },
      { root: container, rootMargin: "-22% 0px -70% 0px" },
    );
    elements.forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [root, layoutKey]);
  return active;
}

// ---------------------------------------------------------------------------
// Small pieces
// ---------------------------------------------------------------------------

function PaperButton({
  tone = "quiet",
  className,
  ...props
}: HTMLMotionProps<"button"> & { tone?: "solid" | "quiet" | "link" }) {
  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.96 }}
      transition={spring}
      className={cx(
        "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full font-sans text-[0.82rem] font-medium transition-colors",
        tone === "solid" && "bg-paper-ink px-4 text-paper hover:bg-[#3a3128]",
        tone === "quiet" && "border border-paper-line bg-[#fffdf8]/70 px-4 text-paper-ink hover:bg-paper-2",
        tone === "link" &&
          "px-1.5 text-paper-muted underline decoration-paper-line underline-offset-4 hover:text-paper-ink hover:decoration-paper-muted",
        className,
      )}
      {...props}
    />
  );
}

/** Short text that may carry markdown or math; plain strings skip the markdown renderer. */
function Rich({ text, className }: { text: string; className?: string }) {
  const value = clean(text);
  if (!/[*_`$[\\]/.test(value)) return <div className={className}>{value}</div>;
  return <Markdown text={value} tone="paper" className={cx("guide-inline", className)} />;
}

function Label({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span className={cx("font-sans text-[0.68rem] font-semibold tracking-[0.16em] uppercase", className)}>
      {children}
    </span>
  );
}

function Block({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <div className="mt-10">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="font-serif text-[1.2rem] font-semibold tracking-normal text-paper-ink">{title}</h3>
        {aside}
      </div>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section blocks
// ---------------------------------------------------------------------------

function KeyTerms({ terms }: { terms: GuideTerm[] }) {
  const [hidden, setHidden] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());
  const toggle = () => {
    setHidden((value) => !value);
    setRevealed(new Set());
  };
  return (
    <Block
      title="Key terms"
      aside={
        <PaperButton tone="link" onClick={toggle} aria-pressed={hidden}>
          {hidden ? "Show definitions" : "Hide definitions"}
        </PaperButton>
      }
    >
      {hidden && (
        <p className="mb-3 font-sans text-[0.8rem] text-paper-muted">
          Say each definition to yourself, then tap it to check.
        </p>
      )}
      <dl className="border-t border-paper-line/80">
        {terms.map(({ term, definition }) => {
          const blurred = hidden && !revealed.has(term);
          return (
            <div
              key={term}
              className="grid gap-x-6 gap-y-0.5 border-b border-paper-line/80 py-3 font-serif text-[1.02rem] leading-[1.7] sm:grid-cols-[10.5rem_minmax(0,1fr)]"
            >
              <dt className="font-semibold text-paper-ink">{clean(term)}</dt>
              <dd className="relative text-[#3b3226]">
                <span
                  aria-hidden={blurred}
                  className={cx(
                    "block transition-[filter] duration-300 motion-reduce:transition-none",
                    blurred && "blur-[5px] select-none",
                  )}
                >
                  {clean(definition)}
                </span>
                {blurred && (
                  <button
                    type="button"
                    onClick={() => setRevealed((previous) => new Set(previous).add(term))}
                    aria-label={`Show the definition of ${clean(term)}`}
                    className="absolute inset-0 cursor-pointer rounded-md"
                  />
                )}
              </dd>
            </div>
          );
        })}
      </dl>
    </Block>
  );
}

function Formulas({ formulas }: { formulas: GuideFormula[] }) {
  return (
    <Block title={formulas.length > 1 ? "Formulas" : "Formula"}>
      <div className="space-y-7">
        {formulas.map((formula) => (
          <div key={formula.latex}>
            {formula.name && <Label className="text-paper-muted">{clean(formula.name)}</Label>}
            <Markdown text={`$$\n${formula.latex}\n$$`} tone="paper" className="guide-formula" />
            {formula.symbols.length > 0 && (
              <div className="font-serif text-[1rem] leading-[1.7] text-[#3b3226]">
                <span className="text-paper-muted italic">where</span>
                <dl className="mt-1.5 grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-5 gap-y-1.5 pl-4">
                  {formula.symbols.map((symbol) => (
                    <Fragment key={symbol.symbol}>
                      <dt className="max-w-[9rem] overflow-x-auto text-paper-ink">
                        <Markdown text={`$${symbol.symbol}$`} tone="paper" className="guide-inline" />
                      </dt>
                      <dd>{clean(symbol.meaning)}</dd>
                    </Fragment>
                  ))}
                </dl>
              </div>
            )}
          </div>
        ))}
      </div>
    </Block>
  );
}

function Timeline({ events }: { events: Array<{ when: string; what: string }> }) {
  return (
    <Block title="Timeline">
      <ol className="relative ml-1 border-l border-paper-line">
        {events.map((event) => (
          <li key={`${event.when}:${event.what}`} className="relative pb-5 pl-6 last:pb-0">
            <span
              aria-hidden
              className="absolute top-[0.45rem] -left-[5px] size-[9px] rounded-full border-2 border-signal bg-paper"
            />
            <div className="font-mono text-[0.78rem] tracking-wide text-paper-muted">{clean(event.when)}</div>
            <div className="font-serif text-[1.02rem] leading-[1.7] text-[#2b251d]">{clean(event.what)}</div>
          </li>
        ))}
      </ol>
    </Block>
  );
}

function WorkedExample({ worked, code }: { worked: GuideWorked; code: boolean }) {
  const motionOn = useMotion();
  const [shown, setShown] = useState(0);
  const total = worked.steps.length;
  const done = shown >= total;
  const lastLeft = total > 1 && shown === total - 1;
  const enter = motionOn ? { opacity: 0, y: 8 } : false;
  return (
    <Block
      title={code ? "Walkthrough" : "Worked example"}
      aside={
        <span className="font-sans text-[0.78rem] text-paper-muted tabular-nums">
          {Math.min(shown, total)} of {plural(total, "step")}
        </span>
      }
    >
      <Rich text={worked.problem} className="font-serif text-[1.075rem] leading-[1.8] text-paper-ink" />
      {shown > 0 && (
        <ol className="mt-5 space-y-5">
          {worked.steps.slice(0, shown).map((step, index) => (
            <motion.li
              key={index}
              initial={enter}
              animate={{ opacity: 1, y: 0 }}
              transition={softSpring}
              className="grid grid-cols-[2rem_minmax(0,1fr)] gap-x-3"
            >
              <span className="flex size-7 items-center justify-center rounded-full border border-paper-line bg-[#fffdf8] font-mono text-[0.75rem] text-paper-ink">
                {index + 1}
              </span>
              <div className="min-w-0 pt-0.5">
                <div className="font-serif text-[1.02rem] font-semibold text-paper-ink">
                  {clean(step.label) || `Step ${index + 1}`}
                </div>
                {step.work && <Markdown text={clean(step.work)} tone="paper" className="guide-prose mt-1" />}
              </div>
            </motion.li>
          ))}
        </ol>
      )}
      {!done && (
        <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2">
          {lastLeft && (
            <p className="w-full font-serif text-[1rem] text-[#3b3226] italic">
              Your turn: try the last step, then reveal it.
            </p>
          )}
          <PaperButton tone="solid" onClick={() => setShown((value) => value + 1)}>
            {lastLeft ? "Reveal" : "Next step"}
          </PaperButton>
          {total - shown > 1 && (
            <PaperButton tone="link" onClick={() => setShown(total)}>
              Show all
            </PaperButton>
          )}
        </div>
      )}
      {done && (
        <motion.div initial={enter} animate={{ opacity: 1, y: 0 }} transition={softSpring}>
          {worked.answer && (
            <div className="mt-6 rounded-md border-l-2 border-signal bg-signal/[0.07] px-4 py-3">
              <Label className="text-signal-deep">Answer</Label>
              <Rich text={worked.answer} className="mt-0.5 font-serif text-[1.075rem] leading-[1.7] text-paper-ink" />
            </div>
          )}
          <PaperButton tone="link" className="mt-3 -ml-1.5" onClick={() => setShown(0)}>
            <RotateCcw className="size-3.5" /> Start again
          </PaperButton>
        </motion.div>
      )}
    </Block>
  );
}

function Mistakes({ items, warnings = [] }: { items: Array<{ wrong: string; right: string }>; warnings?: string[] }) {
  return (
    <ul className="space-y-4 font-serif text-[1.02rem] leading-[1.7]">
      {items.map((item) => (
        <li key={item.wrong}>
          <div className="text-paper-muted">
            <span className="font-semibold">Not quite: </span>
            <span className="line-through decoration-paper-muted/40">{clean(item.wrong)}</span>
          </div>
          <div className="text-paper-ink">
            <span className="font-semibold text-signal-deep">Actually: </span>
            {clean(item.right)}
          </div>
        </li>
      ))}
      {warnings.map((text) => (
        <li key={text} className="text-paper-ink">
          {clean(text)}
        </li>
      ))}
    </ul>
  );
}

function Question({
  index,
  q,
  a,
  rating,
  onRate,
}: {
  index: number;
  q: string;
  a: string;
  rating?: Rating;
  onRate: (rating: Rating) => void;
}) {
  const [open, setOpen] = useState(false);
  const motionOn = useMotion();
  return (
    <li className="grid grid-cols-[1.75rem_minmax(0,1fr)] gap-x-2">
      <span className="pt-[0.3rem] font-mono text-[0.8rem] text-signal-deep">{index + 1}.</span>
      <div className="min-w-0">
        <Rich text={q} className="font-serif text-[1.075rem] leading-[1.7] text-paper-ink" />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <PaperButton tone="quiet" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
            {open ? "Hide answer" : "Show answer"}
          </PaperButton>
          {rating && !open && (
            <span
              className={cx(
                "flex items-center gap-1 font-sans text-[0.78rem]",
                rating === "got" ? "text-emerald-700" : "text-signal-deep",
              )}
            >
              {rating === "got" ? <Check className="size-3.5" /> : <RotateCcw className="size-3" />}
              {rating === "got" ? "Got it" : "Not yet"}
            </span>
          )}
        </div>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              key="answer"
              initial={motionOn ? { height: 0, opacity: 0 } : false}
              animate={{ height: "auto", opacity: 1 }}
              exit={motionOn ? { height: 0, opacity: 0 } : undefined}
              transition={softSpring}
              className="overflow-hidden"
            >
              <div className="mt-3 border-l-2 border-paper-line pl-4">
                <Rich text={a} className="font-serif text-[1.02rem] leading-[1.7] text-[#3b3226]" />
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="mr-1 font-sans text-[0.78rem] text-paper-muted">How did you do?</span>
                  <PaperButton
                    tone={rating === "got" ? "solid" : "quiet"}
                    aria-pressed={rating === "got"}
                    onClick={() => onRate("got")}
                    className={rating === "got" ? "!bg-emerald-700 hover:!bg-emerald-800" : undefined}
                  >
                    <Check className="size-3.5" /> Got it
                  </PaperButton>
                  <PaperButton
                    tone={rating === "again" ? "solid" : "quiet"}
                    aria-pressed={rating === "again"}
                    onClick={() => onRate("again")}
                    className={rating === "again" ? "!bg-signal-deep hover:!bg-signal" : undefined}
                  >
                    <RotateCcw className="size-3.5" /> Not yet
                  </PaperButton>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </li>
  );
}

function SectionFooter({
  section,
  guide,
  mastery,
  readOnly,
}: {
  section: GuideSection;
  guide: StudyGuide;
  mastery: Record<string, number>;
  readOnly: boolean;
}) {
  const jump = useApp((state) => state.jump);
  const concepts = section.conceptIds.flatMap((id) => guide.concepts.filter((concept) => concept.id === id));
  const pages = readOnly ? [] : section.sourcePages;
  if (!pages.length && !concepts.length) return null;
  return (
    <div className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-1 font-sans text-[0.78rem] text-paper-muted">
      {pages.length > 0 && (
        <span className="flex flex-wrap items-center gap-x-1">
          From your documents:
          {pages.map((ref, index) => (
            <button
              key={`${ref.documentId}:${ref.page}`}
              type="button"
              onClick={() => jump(ref.documentId, ref.page)}
              className="min-h-9 px-0.5 font-mono text-[0.74rem] text-signal-deep underline decoration-signal/30 underline-offset-2 hover:decoration-signal sm:min-h-7"
            >
              p.{ref.page}
              {index < pages.length - 1 ? "," : ""}
            </button>
          ))}
        </span>
      )}
      {concepts.length > 0 && (
        <span className="flex min-h-9 flex-wrap items-center gap-x-2.5 gap-y-1 sm:min-h-7">
          Concepts:
          {concepts.map((concept) => (
            <span key={concept.id} className="inline-flex items-center gap-1 text-[#5a4f42]">
              <MasteryRing value={mastery[concept.id] ?? -1} size={12} stroke={2} />
              {concept.label}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}

function Section({
  section,
  index,
  guide,
  mastery,
  highlighted,
  readOnly,
  checks,
  rate,
}: {
  section: GuideSection;
  index: number;
  guide: StudyGuide;
  mastery: Record<string, number>;
  highlighted: boolean;
  readOnly: boolean;
  checks: Checks;
  rate: (id: string, rating: Rating) => void;
}) {
  const motionOn = useMotion();
  const remember = [
    ...section.keyPoints,
    ...section.callouts.filter((callout) => callout.kind === "remember").map((callout) => callout.text),
  ];
  const tips = section.callouts.filter((callout) => callout.kind === "tip");
  const warnings = section.callouts.filter((callout) => callout.kind === "warning").map((callout) => callout.text);
  const mistakes = section.mistakes ?? [];
  const practice = section.format === "math" || section.format === "science";
  const got = section.selfCheck.filter((item) => checks[checkId(section.id, item.q)] === "got").length;

  return (
    <section
      id={`section-${section.id}`}
      data-section={section.id}
      aria-labelledby={`section-${section.id}-title`}
      className="relative scroll-mt-16 pt-16 first:pt-4"
    >
      <AnimatePresence>
        {highlighted && (
          <motion.span
            aria-hidden
            initial={motionOn ? { scaleY: 0, opacity: 0 } : false}
            animate={{ scaleY: 1, opacity: 1 }}
            exit={motionOn ? { scaleY: 0, opacity: 0 } : undefined}
            transition={softSpring}
            className="absolute top-16 bottom-0 -left-3 w-0.5 origin-top rounded-full bg-signal/70 sm:-left-5"
          />
        )}
      </AnimatePresence>
      <div className="font-mono text-[0.78rem] tracking-[0.18em] text-signal">{number(index)}</div>
      <h2
        id={`section-${section.id}-title`}
        className="mt-1.5 border-b border-paper-line pb-4 font-serif text-[1.7rem] leading-[1.2] font-medium tracking-[-0.01em] text-paper-ink sm:text-[2rem]"
      >
        {cleanTitle(section.title)}
      </h2>

      {section.objective && (
        <div className="mt-5 flex items-baseline gap-3 font-serif text-[1.02rem] leading-[1.6] text-[#3b3226]">
          <Label className="shrink-0 text-signal-deep">Goal</Label>
          <span>{clean(section.objective)}</span>
        </div>
      )}

      {section.tldr && (
        <div className="mt-6 border-l-2 border-signal pl-5">
          <Label className="text-paper-muted">In short</Label>
          <p className="mt-1 font-serif text-[1.22rem] leading-[1.6] text-paper-ink">{clean(section.tldr)}</p>
        </div>
      )}

      {section.explanation && <Markdown text={clean(section.explanation)} tone="paper" className="guide-prose mt-7" />}

      {section.terms && section.terms.length > 0 && <KeyTerms terms={section.terms} />}
      {section.formulas && section.formulas.length > 0 && <Formulas formulas={section.formulas} />}
      {section.timeline && section.timeline.length > 0 && <Timeline events={section.timeline} />}

      {section.diagram?.mermaid && (
        <div className="mt-10">
          <Diagram
            source={section.diagram.mermaid}
            caption={clean(section.diagram.caption)}
            title={cleanTitle(section.title)}
            theme="paper"
            context={section.explanation}
          />
        </div>
      )}

      {section.worked && section.worked.steps.length > 0 && (
        <WorkedExample worked={section.worked} code={section.format === "code"} />
      )}

      {section.example && (
        <Block
          title={
            !section.example.title || /^example$/i.test(section.example.title)
              ? "Example"
              : `Example: ${cleanTitle(section.example.title)}`
          }
        >
          <div className="border-l border-paper-line pl-5">
            <Markdown text={clean(section.example.body)} tone="paper" className="guide-prose" />
          </div>
        </Block>
      )}

      {remember.length > 0 && (
        <Block title="Remember">
          <ul className="space-y-2.5 font-serif text-[1.05rem] leading-[1.7] text-[#2b251d]">
            {remember.map((point) => (
              <li key={point} className="flex gap-3.5">
                <span aria-hidden className="mt-[0.72em] size-1.5 shrink-0 rounded-full bg-signal" />
                <Rich text={point} className="min-w-0" />
              </li>
            ))}
          </ul>
        </Block>
      )}

      {tips.map((tip) => (
        <div
          key={tip.text}
          className="mt-6 rounded-md bg-paper-2/80 px-4 py-3 font-serif text-[0.98rem] leading-[1.7] text-[#3b3226]"
        >
          <b className="font-semibold text-paper-ink">Tip.</b> {clean(tip.text)}
        </div>
      ))}

      {(mistakes.length > 0 || warnings.length > 0) && (
        <Block title="Watch out">
          <Mistakes items={mistakes} warnings={warnings} />
        </Block>
      )}

      {section.selfCheck.length > 0 && (
        <Block
          title={practice ? "Practice" : "Check yourself"}
          aside={
            <span className="font-sans text-[0.78rem] text-paper-muted tabular-nums">
              {got} of {section.selfCheck.length} got it
            </span>
          }
        >
          <ol className="space-y-6">
            {section.selfCheck.map((item, itemIndex) => {
              const id = checkId(section.id, item.q);
              return (
                <Question
                  key={id}
                  index={itemIndex}
                  q={item.q}
                  a={item.a}
                  rating={checks[id]}
                  onRate={(rating) => rate(id, rating)}
                />
              );
            })}
          </ol>
        </Block>
      )}

      <SectionFooter section={section} guide={guide} mastery={mastery} readOnly={readOnly} />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Document chrome
// ---------------------------------------------------------------------------

function ReadingProgress({ container }: { container: RefObject<HTMLDivElement | null> }) {
  const motionOn = useMotion();
  const { scrollYProgress } = useScroll({ container });
  const smooth = useSpring(scrollYProgress, { stiffness: 260, damping: 40, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden
      className="absolute inset-x-0 -bottom-px h-0.5 origin-left bg-signal"
      style={{ scaleX: motionOn ? smooth : scrollYProgress }}
    />
  );
}

type ContentsProps = {
  sections: GuideSection[];
  active: string | null;
  highlighted: Set<string>;
  checks: Checks;
  onGo: (id: string) => void;
};

function ContentsRail({ sections, active, highlighted, checks, onGo }: ContentsProps) {
  const motionOn = useMotion();
  return (
    <nav aria-label="Sections" className="hidden lg:block">
      <div className="scroll-quiet sticky top-32 max-h-[calc(100vh-9rem)] overflow-y-auto pt-12 pb-8">
        <div className="mb-3 pl-3.5 font-mono text-[0.68rem] tracking-[0.2em] text-paper-muted uppercase">Contents</div>
        <ol className="border-l border-paper-line">
          {sections.map((section, index) => {
            const current = section.id === active;
            return (
              <li key={section.id} className="relative">
                {current && (
                  <motion.span
                    layoutId="guide-contents-active"
                    transition={motionOn ? spring : { duration: 0 }}
                    className="absolute top-0 bottom-0 -left-px w-0.5 rounded-full bg-signal"
                  />
                )}
                <a
                  href={`#section-${section.id}`}
                  aria-current={current ? "location" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    onGo(section.id);
                  }}
                  className={cx(
                    "flex items-start gap-2 py-1.5 pr-1 pl-3.5 text-[0.84rem] leading-snug transition-colors",
                    current ? "font-medium text-paper-ink" : "text-paper-muted hover:text-paper-ink",
                  )}
                >
                  <span
                    className={cx(
                      "pt-px font-mono text-[0.68rem]",
                      highlighted.has(section.id) ? "text-signal" : "text-paper-muted",
                    )}
                  >
                    {number(index)}
                  </span>
                  <span className="min-w-0 flex-1">{cleanTitle(section.title)}</span>
                  {allGot(section, checks) && (
                    <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-700" aria-label="All questions got" />
                  )}
                </a>
              </li>
            );
          })}
        </ol>
      </div>
    </nav>
  );
}

function ContentsList({ sections, highlighted, checks, onGo }: Omit<ContentsProps, "active">) {
  return (
    <nav aria-label="Contents" className="mb-6 lg:hidden">
      <h2 className="font-serif text-[1.35rem] font-medium tracking-normal text-paper-ink">Contents</h2>
      <ol className="mt-3 border-t border-paper-line/80">
        {sections.map((section, index) => (
          <li key={section.id} className="border-b border-paper-line/80">
            <a
              href={`#section-${section.id}`}
              onClick={(event) => {
                event.preventDefault();
                onGo(section.id);
              }}
              className="flex min-h-11 items-center gap-3 py-2 font-serif text-[1rem] text-paper-ink"
            >
              <span
                className={cx(
                  "font-mono text-[0.74rem]",
                  highlighted.has(section.id) ? "text-signal-deep" : "text-signal",
                )}
              >
                {number(index)}
              </span>
              <span className="min-w-0 flex-1">{cleanTitle(section.title)}</span>
              {allGot(section, checks) && (
                <Check className="size-4 shrink-0 text-emerald-700" aria-label="All questions got" />
              )}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function ClosingSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="pt-16">
      <h2 className="border-b border-paper-line pb-4 font-serif text-[1.6rem] leading-[1.2] font-medium tracking-[-0.01em] text-paper-ink sm:text-[1.8rem]">
        {title}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const language = useApp((state) => state.language);
  const motionOn = useMotion();
  const { checks, rate } = useChecks(guide.bookId);
  const sections = guide.sections;
  const spied = useActiveSection(scrollRef, sections.map((section) => section.id).join("|"));
  const active = spied ?? sections[0]?.id ?? null;
  const withContents = sections.length > 1;

  const highlightedSections = useMemo(
    () =>
      new Set(
        selected
          ? sections.filter((section) => section.conceptIds.includes(selected)).map((section) => section.id)
          : [],
      ),
    [selected, sections],
  );
  const selectedConcept = guide.concepts.find((concept) => concept.id === selected);
  const mastered = Object.values(mastery).filter((value) => value >= 0.8).length;

  const goTo = (id: string) =>
    document
      .getElementById(`section-${id}`)
      ?.scrollIntoView?.({ behavior: motionOn ? "smooth" : "auto", block: "start" });

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
      ...sections.map((section) => `${section.title}. ${section.tldr} ${section.keyPoints.join(". ")}`),
    ]
      .map(clean)
      .join("\n\n");
    await speak(script, language);
    setListening(false);
  };

  return (
    <div ref={scrollRef} className="paper scroll-quiet relative h-full overflow-y-auto">
      {/* Sticky toolbar, with the reading progress along its bottom edge */}
      <div className="sticky top-0 z-20 border-b border-[#e2d8c6] bg-[#f7f3ec]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-[68rem] items-center gap-2 px-4 pt-16 pb-2.5 sm:px-8">
          <Button variant="light" size="sm" onClick={onBack} aria-label="Back to library" className="max-sm:h-9">
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
            className="max-sm:h-9"
          >
            {listening ? <X className="size-3.5" /> : <Volume2 className="size-3.5" />} {listening ? "Stop" : "Listen"}
          </Button>
          {onReview && (
            <Button variant="light" size="sm" onClick={onReview} className="max-sm:h-9">
              <Brain className="size-3.5" /> Review{dueCount ? ` · ${dueCount}` : ""}
            </Button>
          )}
          {onSync && (
            <Button
              variant="light"
              size="sm"
              onClick={onSync}
              disabled={syncing}
              aria-label="Update study guide now"
              className="max-sm:h-9"
            >
              <RefreshCw className={cx("size-3.5", syncing && "animate-spin")} />
            </Button>
          )}
        </div>
        <ReadingProgress container={scrollRef} />
      </div>

      <div
        className={cx(
          "mx-auto grid max-w-[68rem] px-4 pb-28 sm:px-8 lg:justify-center",
          withContents ? "lg:grid-cols-[12.5rem_minmax(0,46rem)] lg:gap-x-14" : "lg:grid-cols-[minmax(0,46rem)]",
        )}
      >
        {withContents && (
          <ContentsRail
            sections={sections}
            active={active}
            highlighted={highlightedSections}
            checks={checks}
            onGo={goTo}
          />
        )}

        <article className="min-w-0">
          {/* Hero */}
          <motion.header
            initial={motionOn ? { opacity: 0, y: 14 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={softSpring}
            className="pt-12 pb-10"
          >
            <div className="font-mono text-[0.7rem] tracking-[0.22em] text-paper-muted uppercase">
              {readOnly ? "Built-in book" : "Study guide"}
            </div>
            <h1 className="mt-3 font-serif text-[clamp(2.1rem,4.6vw,3.25rem)] leading-[1.08] font-medium tracking-[-0.015em] text-paper-ink">
              {cleanTitle(guide.title)}
            </h1>
            {guide.summary && (
              <p className="mt-5 font-serif text-[1.2rem] leading-[1.7] text-[#3b3226]">{clean(guide.summary)}</p>
            )}
            {guide.goals.length > 0 && (
              <div className="mt-6 font-serif text-[1.05rem] leading-[1.7] text-[#2b251d]">
                <p className="font-semibold text-paper-ink">By the end you can:</p>
                <ul className="mt-1.5 list-disc space-y-1 pl-6 marker:text-signal">
                  {guide.goals.map((goal) => (
                    <li key={goal} className="pl-1">
                      {goalText(goal)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {!readOnly && (
              <p className="mt-6 font-sans text-[0.82rem] text-paper-muted">
                {plural(sections.length, "section")} · {plural(guide.concepts.length, "concept")} · {mastered} mastered
              </p>
            )}
          </motion.header>

          {sections.length === 0 && empty}

          {guide.concepts.length > 0 && (
            <section className="paper-card mb-12 p-4 sm:p-6">
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
                    <b className="font-serif text-base">{selectedConcept.label}</b>:{" "}
                    {clean(selectedConcept.blurb) || "No definition yet."}
                    {highlightedSections.size > 0 && (
                      <span className="ml-1 text-[#c9b99f]">
                        Marked in {plural(highlightedSections.size, "section")} below.
                      </span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </section>
          )}

          {withContents && (
            <ContentsList sections={sections} highlighted={highlightedSections} checks={checks} onGo={goTo} />
          )}

          <div>
            {sections.map((section, index) => (
              <Section
                key={section.id}
                section={section}
                index={index}
                guide={guide}
                mastery={mastery}
                highlighted={highlightedSections.has(section.id)}
                readOnly={readOnly}
                checks={checks}
                rate={rate}
              />
            ))}
          </div>

          {guide.misconceptions.length > 0 && (
            <ClosingSection title="Common mistakes">
              <Mistakes items={guide.misconceptions} />
            </ClosingSection>
          )}

          {guide.glossary.length > 0 && (
            <ClosingSection title="Glossary">
              <dl className="-mt-3">
                {[...guide.glossary]
                  .sort((a, b) => a.term.localeCompare(b.term))
                  .map((entry) => (
                    <div
                      key={entry.term}
                      className="grid gap-x-6 gap-y-0.5 border-b border-paper-line/80 py-3 font-serif text-[1.02rem] leading-[1.7] last:border-b-0 sm:grid-cols-[10.5rem_minmax(0,1fr)]"
                    >
                      <dt className="font-semibold text-paper-ink">{clean(entry.term)}</dt>
                      <dd className="text-[#3b3226]">{clean(entry.definition)}</dd>
                    </div>
                  ))}
              </dl>
            </ClosingSection>
          )}

          {guide.nextSteps.length > 0 && (
            <ClosingSection title="What to study next">
              <ol className="list-decimal space-y-2 pl-6 font-serif text-[1.05rem] leading-[1.7] text-[#2b251d] marker:font-mono marker:text-[0.85rem] marker:text-signal">
                {guide.nextSteps.map((step) => (
                  <li key={step} className="pl-1.5">
                    {clean(step)}
                  </li>
                ))}
              </ol>
            </ClosingSection>
          )}
        </article>
      </div>
    </div>
  );
}
