/**
 * The learner's own documents on the voice stage.
 *
 * The voice model points at a page with a tag like
 * `[[page: D1 p.12 | Water molecules are split in a process called photolysis]]`.
 * These pure helpers read that reference and snap the quoted words to the
 * exact text on the page (models paraphrase and drop punctuation), or to the
 * sentence that best matches a description ("the line about photolysis"),
 * so the client can find and highlight it in the PDF's text layer.
 */

export type PageRef = {
  /** 1-based document number from a "D2" label. */
  doc?: number;
  page?: number;
  /** Exact words to highlight, or a short description of the line. */
  quote?: string;
  /** The quote describes a line ("the line about osmosis"): light the whole sentence it is in. */
  describe?: boolean;
  /** Turn from the page on screen. */
  relative?: 1 | -1;
  /** The page the learner has open in the reader. */
  current?: boolean;
};

const WORD_NUMBERS: Record<string, number> = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  first: 1,
  second: 2,
  third: 3,
};

/** "12", "twelve", "third" → 12, 12, 3. */
export function readNumber(word: string | undefined): number | undefined {
  if (!word) return undefined;
  const text = word.trim().toLowerCase();
  if (/^\d{1,5}$/.test(text)) return Number(text);
  return WORD_NUMBERS[text];
}

/** Parses the body of a `[[page: …]]` tag. */
export function parsePageRef(payload: string): PageRef {
  const text = payload.trim();
  const ref: PageRef = {};
  let head = text;
  const pipe = text.indexOf("|");
  if (pipe >= 0) {
    head = text.slice(0, pipe);
    const quote = text
      .slice(pipe + 1)
      .trim()
      .replace(/^["“”']+|["“”']+$/g, "");
    if (quote) ref.quote = quote.slice(0, 400);
  } else {
    const quoted = /["“]([^"”]{4,400})["”]/.exec(text);
    if (quoted) {
      ref.quote = quoted[1].trim();
      head = text.replace(quoted[0], " ");
    }
  }
  const doc = /\bD\s?(\d{1,3})\b/i.exec(head);
  if (doc) ref.doc = Number(doc[1]);
  const page = /\b(?:p|pg|pp|page)\.?\s*(\d{1,5})\b/i.exec(head) ?? /^\s*(\d{1,5})\s*$/.exec(head);
  if (page) ref.page = Number(page[1]);
  if (/\bnext\b/i.test(head)) ref.relative = 1;
  else if (/\b(?:previous|prev|back|before)\b/i.test(head)) ref.relative = -1;
  if (/\b(?:this|current|open|same)\b/i.test(head) && !ref.page) ref.current = true;
  // No pipe and no page number: a free description of the line ("the definition of osmosis").
  if (!ref.quote && ref.page === undefined && !ref.relative && !ref.current) {
    const rest = head.replace(/\bD\s?\d{1,3}\b/i, "").trim();
    if (rest.split(/\s+/).length >= 2) ref.quote = rest.slice(0, 400);
  }
  return ref;
}

/** Letters and digits only, lowercased, with a map back to the original positions. */
function normalizeWithMap(text: string) {
  const chars: string[] = [];
  const map: number[] = [];
  let index = 0;
  for (const ch of text) {
    if (/[\p{L}\p{N}]/u.test(ch)) {
      chars.push(ch.toLowerCase());
      map.push(index);
    }
    index += ch.length;
  }
  return { norm: chars.join(""), map };
}

const CJK = /[぀-ヿ㐀-鿿가-힯]/;
const STOP = new Set([
  "the",
  "and",
  "for",
  "that",
  "this",
  "with",
  "from",
  "are",
  "was",
  "were",
  "its",
  "into",
  "which",
  "about",
  "line",
  "sentence",
  "part",
  "bit",
  "where",
  "says",
  "say",
  "talks",
  "one",
]);

function tokens(text: string) {
  if (CJK.test(text)) {
    // CJK has no spaces: compare character pairs instead of words.
    const letters = [...text.replace(/[^\p{L}\p{N}]/gu, "")];
    return letters.slice(0, -1).map((ch, i) => ch + letters[i + 1]);
  }
  return (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((word) => word.length > 2 && !STOP.has(word));
}

/** Sentences (or lines, for text without sentence punctuation) with their text. */
/** Marks a paragraph break inside collapsed page text. */
const PARAGRAPH = "\u2029";

export function sentencesOf(text: string): string[] {
  return (text.match(/[^.!?。！？\n\u2029]+(?:[.!?。！？]+["”’)]?|$)/gmu) ?? [])
    .map((sentence) => sentence.replace(/\s+/g, " ").trim())
    .filter((sentence) => sentence.length >= 12);
}

/**
 * The exact words on the page for a quote (whitespace, case, punctuation and
 * hyphenation may differ), or else the sentence that best matches it as a
 * description. Null when nothing on the page is a reasonable match.
 */
export function snapQuote(pageText: string, wanted: string, options: { sentence?: boolean } = {}): string | null {
  // Paragraph breaks (headings, blocks) stay as a boundary mark; other whitespace collapses.
  const page = pageText
    .replace(/\r/g, "")
    .replace(/\n[ \t]*\n\s*/g, PARAGRAPH)
    .replace(/[ \t\n]+/g, " ")
    .trim();
  const target = wanted.trim();
  if (!page || !target) return null;

  const { norm, map } = normalizeWithMap(page);
  const want = normalizeWithMap(target).norm;
  if (want.length >= 8) {
    const at = norm.indexOf(want);
    if (at >= 0) {
      let start = map[at];
      let end = map[at + want.length - 1] + 1;
      // Grow to whole words and keep closing punctuation.
      while (start > 0 && /[\p{L}\p{N}]/u.test(page[start - 1])) start -= 1;
      while (end < page.length && /[\p{L}\p{N}]/u.test(page[end])) end += 1;
      if (end < page.length && /[.!?。！？]/.test(page[end])) end += 1;
      // A few words, or a description of a line: light the whole sentence they are in.
      if (options.sentence || page.slice(start, end).split(/\s+/).length < 5) {
        while (start > 0 && !/[.!?。！？\u2029]\s*$/.test(page.slice(Math.max(0, start - 2), start))) start -= 1;
        while (start < page.length && /[\s\u2029]/.test(page[start])) start += 1;
        while (end < page.length && page[end] !== PARAGRAPH && !/[.!?。！？]/.test(page[end - 1])) end += 1;
      }
      return clipQuote(page.slice(start, end).replaceAll(PARAGRAPH, " ").trim());
    }
  }

  const wantedTokens = tokens(target);
  if (!wantedTokens.length) return null;
  const sentences = sentencesOf(page);
  const candidates = [
    ...sentences,
    // A long quote may span two sentences.
    ...(wantedTokens.length > 18 ? sentences.slice(0, -1).map((s, i) => `${s} ${sentences[i + 1]}`) : []),
  ];
  let best: { text: string; score: number; shared: number } | null = null;
  for (const candidate of candidates) {
    const words = new Set(tokens(candidate));
    if (!words.size) continue;
    const shared = wantedTokens.filter((word) => words.has(word)).length;
    // Mostly about covering what was asked for; a little about not grabbing a huge block.
    const score = shared / wantedTokens.length - Math.max(0, words.size - wantedTokens.length * 3) * 0.004;
    if (!best || score > best.score) best = { text: candidate, score, shared };
  }
  const enough = wantedTokens.length <= 2 ? 1 : 2;
  return best && best.shared >= enough && best.score >= 0.34 ? clipQuote(best.text) : null;
}

/** Highlights stay readable: at most about 320 characters, cut at a word boundary. */
function clipQuote(text: string) {
  if (text.length <= 320) return text;
  const cut = text.slice(0, 320);
  return cut.slice(0, Math.max(200, cut.lastIndexOf(" "))).trimEnd();
}

/** Whether two quotes are the same highlight. */
export function sameQuote(a: string, b: string) {
  return normalizeWithMap(a).norm === normalizeWithMap(b).norm;
}
