/** Page geometry: selected-text client rects → merged line boxes → page-relative fractions that survive zoom. */
import type { Annotation } from "@shared/types";

export type Rect = Annotation["rects"][number];
export type Anchor = { x: number; top: number; bottom: number };
export type Box = { left: number; top: number; right: number; bottom: number };

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/**
 * Client rects of only the selected *text*: Range.getClientRects() would also
 * return whole element boxes (including the text layer's page-sized helper).
 */
export function textRects(range: Range, root: Element): DOMRect[] {
  const container = range.commonAncestorContainer;
  if (container.nodeType === Node.TEXT_NODE) return Array.from(range.getClientRects());
  const rects: DOMRect[] = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text;
    if (!range.intersectsNode(text) || !root.contains(text) || !text.parentElement?.closest(".textLayer")) continue;
    const part = document.createRange();
    part.setStart(text, text === range.startContainer ? range.startOffset : 0);
    part.setEnd(text, text === range.endContainer ? range.endOffset : text.length);
    if (!part.collapsed) rects.push(...Array.from(part.getClientRects()));
  }
  return rects;
}

/** Merges per-span rects into one box per visual line (same row, touching or near). */
export function mergeLines(rects: DOMRect[]): Box[] {
  const boxes = rects
    .filter((rect) => rect.width >= 1 && rect.height >= 1)
    .map((rect) => ({ left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }))
    .sort((a, b) => a.top - b.top || a.left - b.left);
  const lines: Box[] = [];
  for (const box of boxes) {
    const height = box.bottom - box.top;
    const line = lines.find((candidate) => {
      const lineHeight = candidate.bottom - candidate.top;
      const overlap = Math.min(candidate.bottom, box.bottom) - Math.max(candidate.top, box.top);
      const gap = Math.max(box.left - candidate.right, candidate.left - box.right);
      return overlap >= 0.5 * Math.min(height, lineHeight) && gap <= Math.max(height, lineHeight);
    });
    if (line) {
      line.left = Math.min(line.left, box.left);
      line.top = Math.min(line.top, box.top);
      line.right = Math.max(line.right, box.right);
      line.bottom = Math.max(line.bottom, box.bottom);
    } else {
      lines.push({ ...box });
    }
  }
  return lines;
}

/** Client boxes → fractions (0..1) of the rendered page box, so marks survive zoom. */
export function toFractions(lines: Box[], page: DOMRect): Rect[] {
  const round = (value: number) => Math.round(value * 100000) / 100000;
  return lines
    .map((line) => {
      const x = clamp((line.left - page.left) / page.width, 0, 1);
      const y = clamp((line.top - page.top) / page.height, 0, 1);
      const right = clamp((line.right - page.left) / page.width, 0, 1);
      const bottom = clamp((line.bottom - page.top) / page.height, 0, 1);
      return { x: round(x), y: round(y), width: round(right - x), height: round(bottom - y) };
    })
    .filter((rect) => rect.width > 0.001 && rect.height > 0.001);
}
