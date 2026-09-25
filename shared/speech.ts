/**
 * Turns model output (markdown, code, math, citations) into text that sounds
 * natural when spoken, and splits a token stream into TTS-sized phrases.
 *
 * Pure functions only: used by the server voice pipeline and the read-aloud
 * route, and unit-tested without any provider.
 */

const CODE_PLACEHOLDER = "I've put the code on screen.";
const DIAGRAM_PLACEHOLDER = "I've drawn it on screen.";
const TABLE_PLACEHOLDER = "There's a table on screen.";

const ABBREVIATIONS: Array<[RegExp, string]> = [
  [/\be\.g\.,?/gi, "for example,"],
  [/\bi\.e\.,?/gi, "that is,"],
  [/\betc\./gi, "et cetera"],
  [/\bvs\.?(?=\s)/gi, "versus"],
  [/\bapprox\./gi, "approximately"],
  [/\bw\/o\b/gi, "without"],
  [/\bw\/(?=\s)/gi, "with"],
];

const SYMBOLS: Array<[RegExp, string]> = [
  [/\s*(?:->|→|⟶|=>)\s*/g, " to "],
  [/\s*(?:<-|←)\s*/g, " from "],
  [/\s*(?:<=>|⇔|↔)\s*/g, " if and only if "],
  [/\s*≈\s*/g, " approximately "],
  [/\s*≠\s*/g, " is not equal to "],
  [/\s*≤\s*/g, " is at most "],
  [/\s*≥\s*/g, " is at least "],
  [/\s*×\s*/g, " times "],
  [/\s*÷\s*/g, " divided by "],
  [/\s&\s/g, " and "],
  [/\s\/\s/g, " or "],
  [/∞/g, "infinity"],
  [/π/g, "pi"],
  [/Δ/g, "delta"],
  [/λ/g, "lambda"],
  [/θ/g, "theta"],
  [/α/g, "alpha"],
  [/β/g, "beta"],
  [/σ/g, "sigma"],
  [/μ/g, "mu"],
];

const LATEX: Array<[RegExp, string]> = [
  [/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "$1 over $2"],
  [/\\sqrt\{([^{}]+)\}/g, "the square root of $1"],
  [/\^\{?2\}?(?![\d])/g, " squared"],
  [/\^\{?3\}?(?![\d])/g, " cubed"],
  [/\^\{([^{}]+)\}/g, " to the power of $1"],
  [/\^(\w)/g, " to the power of $1"],
  [/_\{([^{}]+)\}/g, " sub $1"],
  [/\\(?:cdot|times)/g, " times "],
  [/\\(?:leq|le)\b/g, " is at most "],
  [/\\(?:geq|ge)\b/g, " is at least "],
  [/\\neq\b/g, " is not equal to "],
  [/\\approx\b/g, " approximately "],
  [/\\(?:rightarrow|to)\b/g, " to "],
  [/\\sum\b/g, " the sum of "],
  [/\\int\b/g, " the integral of "],
  [/\\infty\b/g, " infinity "],
  [/\\log\b/g, " log "],
  [/\\(alpha|beta|gamma|delta|theta|lambda|mu|sigma|pi|omega|epsilon)\b/g, " $1 "],
  [/\\(?:left|right|,|;|!|quad)/g, " "],
  [/\\[a-zA-Z]+/g, " "],
  [/[{}]/g, ""],
];

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F000}-\u{1F2FF}\u{FE0F}]/gu;

function speakMath(expression: string): string {
  let out = expression;
  for (const [pattern, replacement] of LATEX) out = out.replace(pattern, replacement);
  return out.replace(/\s+/g, " ").trim();
}

/** Short spoken version of a URL: its host, without protocol or "www.". */
function speakUrl(url: string): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host;
  } catch {
    return "the link on screen";
  }
}

/**
 * Normalises a complete piece of text for speech. Idempotent: running it twice
 * gives the same result, so callers can safely apply it at several layers.
 */
export function toSpeakableText(input: string): string {
  if (!input) return "";
  let text = input.replace(/\r\n?/g, "\n");

  // Fenced blocks first: never read code or diagram source aloud.
  let sawCode = false;
  let sawDiagram = false;
  text = text.replace(/```([\w-]*)[^\n]*\n[\s\S]*?(?:```|$)/g, (_match, lang: string) => {
    if (/^mermaid$/i.test(lang)) {
      if (sawDiagram) return " ";
      sawDiagram = true;
      return `\n${DIAGRAM_PLACEHOLDER}\n`;
    }
    if (sawCode) return " ";
    sawCode = true;
    return `\n${CODE_PLACEHOLDER}\n`;
  });

  // Tables: keep nothing but a pointer.
  text = text.replace(/(?:^\|.*\|[ \t]*\n?){2,}/gm, `\n${TABLE_PLACEHOLDER}\n`);

  // Display and inline math.
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_m, expr: string) => ` ${speakMath(expr)} `);
  text = text.replace(/\\\[([\s\S]+?)\\\]/g, (_m, expr: string) => ` ${speakMath(expr)} `);
  text = text.replace(/\\\(([\s\S]+?)\\\)/g, (_m, expr: string) => ` ${speakMath(expr)} `);
  text = text.replace(/(^|[^\\$])\$([^$\n]+?)\$/g, (_m, pre: string, expr: string) => `${pre}${speakMath(expr)}`);

  // Images disappear; links keep their label.
  text = text.replace(/!\[[^\]]*\]\([^)]*\)/g, "");
  text = text.replace(/\[([^\]]+)\]\((?:[^)]*)\)/g, "$1");
  text = text.replace(/<https?:\/\/[^>\s]+>/g, (m) => speakUrl(m.slice(1, -1)));
  text = text.replace(/https?:\/\/[^\s)]+/g, (m) => speakUrl(m));

  // Citations like [1], [1, 2], [W3], [D1 p.12] and footnote markers.
  text = text.replace(/\s?\[(?:\d+(?:\s*[,-]\s*\d+)*)\]/g, "");
  text = text.replace(/\s?\[(?:W\d+|D\d+\s*p\.?\s*\d+(?:\s*[-–]\s*\d+)?|p\.?\s*\d+)\]/gi, "");
  text = text.replace(/\[\^[^\]]+\]/g, "");

  // Inline code keeps its content; identifiers read better with spaces.
  text = text.replace(/`([^`\n]+)`/g, (_m, code: string) =>
    code.length > 40 ? "the snippet on screen" : code.replace(/[_]+/g, " "),
  );

  // Block-level markdown.
  text = text.replace(/^\s{0,3}#{1,6}\s+(.*)$/gm, "$1.");
  text = text.replace(/^\s{0,3}>\s?/gm, "");
  text = text.replace(/^\s*(?:[-*+]|\d+[.)])\s+/gm, "");
  text = text.replace(/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/gm, "");
  text = text.replace(/<\/?[a-z][^>]*>/gi, "");

  // Emphasis markers (keep snake_case intact: only strip _ at word edges).
  text = text.replace(/(\*\*|__)(.+?)\1/g, "$2");
  text = text.replace(/(^|[\s(])[*_]([^*_\n]+)[*_](?=[\s).,!?:;]|$)/g, "$1$2");
  text = text.replace(/~~(.+?)~~/g, "$1");
  text = text.replace(/\*/g, "");

  for (const [pattern, replacement] of ABBREVIATIONS) text = text.replace(pattern, replacement);
  for (const [pattern, replacement] of SYMBOLS) text = text.replace(pattern, replacement);

  text = text.replace(EMOJI, "");

  // Headings ending in "." followed by another "." etc.
  text = text.replace(/([.!?])\s*\.(?=\s|$)/g, "$1");
  text = text.replace(/:\.(?=\s|$)/g, ":");

  // Collapse whitespace: newlines become sentence breaks for natural prosody.
  text = text
    .split(/\n+/)
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean)
    .map((line) => (/[.!?:;,。！？]$/.test(line) ? line : `${line}.`))
    .join(" ");

  return text
    .replace(/\s+([.,!?;:])/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const SENTENCE_END = /([.!?。！？]+)(["')\]]*)(\s+|$)/g;
const CLAUSE_END = /([,;:—])(\s+)/g;
const NON_TERMINAL = /(?:\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|e\.g|i\.e|Fig|No|approx)\.|\b[A-Z]\.|\d\.)$/;

export type PhraseChunkerOptions = {
  /** Minimum characters before the very first phrase may be emitted. */
  firstMinChars?: number;
  /** Minimum characters for later phrases. */
  minChars?: number;
  /** Force a clause-level split beyond this many characters. */
  maxChars?: number;
};

/**
 * Accumulates streamed model text and emits speakable phrases as soon as a
 * natural boundary appears. The first phrase is kept short so audio starts
 * quickly; later phrases are longer for smoother prosody. Code fences are
 * swallowed whole and replaced by a single spoken pointer.
 */
export class PhraseChunker {
  private raw = "";
  private emittedFirst = false;
  private readonly firstMin: number;
  private readonly min: number;
  private readonly max: number;

  constructor(options: PhraseChunkerOptions = {}) {
    this.firstMin = options.firstMinChars ?? 12;
    this.min = options.minChars ?? 40;
    this.max = options.maxChars ?? 220;
  }

  /** Feed a token delta; returns zero or more complete speakable phrases. */
  push(delta: string): string[] {
    this.raw += delta;
    const out: string[] = [];
    for (;;) {
      const phrase = this.takePhrase(false);
      if (phrase === null) break;
      if (phrase) out.push(phrase);
    }
    return out;
  }

  /** Flush whatever is left at the end of the stream. */
  flush(): string[] {
    const out: string[] = [];
    for (;;) {
      const phrase = this.takePhrase(true);
      if (phrase === null) break;
      if (phrase) out.push(phrase);
    }
    const rest = toSpeakableText(this.raw);
    this.raw = "";
    if (rest) out.push(rest);
    return out;
  }

  private takePhrase(final: boolean): string | null {
    if (!this.raw) return null;
    const fence = this.raw.indexOf("```");
    if (fence >= 0) {
      // Speak whatever precedes the fence first.
      if (fence > 0 && this.raw.slice(0, fence).trim()) {
        const before = this.raw.slice(0, fence);
        this.raw = this.raw.slice(fence);
        return this.finishPhrase(before);
      }
      const close = this.raw.indexOf("```", 3);
      if (close < 0) {
        if (!final) return null;
        const block = this.raw;
        this.raw = "";
        return this.finishPhrase(`${block}\n\`\`\``);
      }
      const block = this.raw.slice(0, close + 3);
      this.raw = this.raw.slice(close + 3);
      return this.finishPhrase(block);
    }

    const minimum = this.emittedFirst ? this.min : this.firstMin;
    const cut = this.findBoundary(minimum) ?? (this.raw.length > this.max ? this.findClause() : null);
    if (cut === null) return null;
    const head = this.raw.slice(0, cut);
    this.raw = this.raw.slice(cut);
    return this.finishPhrase(head);
  }

  private finishPhrase(rawPhrase: string): string {
    const spoken = toSpeakableText(rawPhrase);
    if (spoken) this.emittedFirst = true;
    return spoken;
  }

  private findBoundary(minimum: number): number | null {
    // Paragraph breaks are always boundaries.
    const paragraph = this.raw.indexOf("\n\n");
    SENTENCE_END.lastIndex = 0;
    let match: RegExpExecArray | null;
    let best: number | null = null;
    while ((match = SENTENCE_END.exec(this.raw))) {
      const end = match.index + match[0].length;
      if (match[3] === "") break; // boundary at buffer end: wait for more text
      const before = this.raw.slice(0, match.index + match[1].length);
      if (NON_TERMINAL.test(before)) continue;
      if (before.trim().length >= minimum) {
        best = end;
        break;
      }
    }
    if (paragraph >= 0 && (best === null || paragraph + 2 < best)) {
      if (this.raw.slice(0, paragraph).trim().length > 0) return paragraph + 2;
    }
    return best;
  }

  private findClause(): number | null {
    CLAUSE_END.lastIndex = 0;
    let match: RegExpExecArray | null;
    let last: number | null = null;
    while ((match = CLAUSE_END.exec(this.raw))) {
      const end = match.index + match[0].length;
      if (end > this.max) break;
      if (end >= this.min) last = end;
    }
    if (last !== null) return last;
    // No clause mark: split at the last space before the limit.
    const space = this.raw.lastIndexOf(" ", this.max);
    return space > this.min ? space + 1 : null;
  }
}

/** Rough speaking duration for pacing captions (≈ 165 words per minute). */
export function estimateSpeechMs(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const cjk = (text.match(/[぀-ヿ㐀-鿿]/g) || []).length;
  return Math.round(words * 360 + cjk * 140);
}
