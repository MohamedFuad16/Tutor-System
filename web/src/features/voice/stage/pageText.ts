/**
 * Where a quote sits on a rendered PDF page. Quotes are matched on letters
 * and digits only, so line breaks, hyphenation and punctuation in the PDF's
 * text layer don't stop a highlight from landing on the right words. Pure
 * (no pdf.js), so it is unit-tested.
 */

/** A run of text on the rendered page, in canvas CSS pixels. */
export type TextRun = { str: string; x: number; y: number; width: number; height: number };
export type Rect = { x: number; y: number; width: number; height: number };

const isWordChar = (ch: string) => /[\p{L}\p{N}]/u.test(ch);

/**
 * Where a quote sits on the page: one rectangle per line it covers, or [] when
 * the page's text layer doesn't contain it (scanned pages, heavy paraphrase).
 */
export function locate(runs: TextRun[], quote: string): Rect[] {
  const chars: string[] = [];
  const at: Array<{ run: number; offset: number }> = [];
  runs.forEach((run, index) => {
    let offset = 0;
    for (const ch of run.str) {
      if (isWordChar(ch)) {
        chars.push(ch.toLowerCase());
        at.push({ run: index, offset });
      }
      offset += ch.length;
    }
  });
  const page = chars.join("");
  const wanted = [...quote]
    .filter(isWordChar)
    .map((ch) => ch.toLowerCase())
    .join("");
  if (wanted.length < 3) return [];
  let start = page.indexOf(wanted);
  let length = wanted.length;
  if (start < 0) {
    // Fall back to the opening words: enough to light the right line.
    const head = wanted.slice(0, 32);
    start = head.length >= 12 ? page.indexOf(head) : -1;
    if (start < 0) return [];
    length = Math.min(wanted.length, page.length - start);
  }
  const first = at[start];
  const last = at[start + length - 1];

  // One rectangle per run, then merge runs that share a line.
  const pieces: Rect[] = [];
  for (let index = first.run; index <= last.run; index += 1) {
    const run = runs[index];
    const size = run.str.length || 1;
    const from = index === first.run ? first.offset : 0;
    const to = index === last.run ? last.offset + 1 : size;
    if (to <= from) continue;
    pieces.push({
      x: run.x + (run.width * from) / size,
      y: run.y,
      width: (run.width * (to - from)) / size,
      height: run.height,
    });
  }
  const lines: Rect[] = [];
  for (const piece of pieces) {
    const line = lines.find((rect) => Math.abs(rect.y - piece.y) < Math.max(rect.height, piece.height) * 0.5);
    if (!line) {
      lines.push({ ...piece });
      continue;
    }
    const right = Math.max(line.x + line.width, piece.x + piece.width);
    line.x = Math.min(line.x, piece.x);
    line.width = right - line.x;
    line.y = Math.min(line.y, piece.y);
    line.height = Math.max(line.height, piece.height);
  }
  return lines.sort((a, b) => a.y - b.y || a.x - b.x);
}

/** The box around a set of rectangles. */
export function bounds(rects: Rect[]): Rect | null {
  if (!rects.length) return null;
  const left = Math.min(...rects.map((rect) => rect.x));
  const top = Math.min(...rects.map((rect) => rect.y));
  const right = Math.max(...rects.map((rect) => rect.x + rect.width));
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}
