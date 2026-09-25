/** Turns a text-layer selection on the page sheet into selection-toolbar state (text, page, rects, anchor). */
import { useCallback, useEffect, useRef, type RefObject } from "react";
import { mergeLines, textRects, toFractions, type Anchor, type Rect } from "./geometry";

export type SelectionState = { text: string; page: number; rects: Rect[]; anchor: Anchor };

const CJK = "\\u3000-\\u30ff\\u3400-\\u9fff\\uac00-\\ud7af\\uff00-\\uffef";
const CJK_BREAK = new RegExp(`([${CJK}])\\s*\\n\\s*([${CJK}])`, "g");

/** Joins the text layer's line breaks back into prose (hyphenation, CJK without spaces). */
function cleanSelectionText(raw: string) {
  return raw
    .replace(/(\p{L})-\s*\n\s*(\p{Ll})/gu, "$1$2")
    .replace(CJK_BREAK, "$1$2")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Reads the document selection into `setMenu` (debounced on `selectionchange`,
 * right after a mouse drag ends). Returns the ref the toolbar stamps on press.
 */
export function useTextSelection(
  sheetRef: RefObject<HTMLDivElement | null>,
  pageRef: RefObject<number>,
  setMenu: (menu: SelectionState | null) => void,
) {
  const mouseDownRef = useRef(false);
  const toolbarPressRef = useRef(0);

  const readSelection = useCallback(() => {
    if (mouseDownRef.current) return; // still dragging
    const selection = window.getSelection();
    const sheet = sheetRef.current;
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed || !sheet) {
      // Some touch browsers drop the selection as a toolbar button is tapped; let the tap land.
      if (Date.now() - toolbarPressRef.current > 700) setMenu(null);
      return;
    }
    const range = selection.getRangeAt(0);
    if (!sheet.contains(range.startContainer) || !sheet.contains(range.endContainer)) {
      setMenu(null);
      return;
    }
    const text = cleanSelectionText(selection.toString());
    const lines = mergeLines(textRects(range, sheet));
    if (!text || !lines.length) {
      setMenu(null);
      return;
    }
    const box = sheet.getBoundingClientRect();
    const left = Math.max(box.left, Math.min(...lines.map((line) => line.left)));
    const right = Math.min(box.right, Math.max(...lines.map((line) => line.right)));
    setMenu({
      text,
      page: pageRef.current,
      rects: toFractions(lines, box),
      anchor: {
        x: (left + right) / 2,
        top: Math.min(...lines.map((line) => line.top)),
        bottom: Math.max(...lines.map((line) => line.bottom)),
      },
    });
  }, [sheetRef, pageRef, setMenu]);

  useEffect(() => {
    let timer = 0;
    const schedule = (delay: number) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(readSelection, delay);
    };
    const onChange = () => schedule(200);
    const onDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button === 0) mouseDownRef.current = true;
    };
    const onUp = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      mouseDownRef.current = false;
      schedule(10);
    };
    document.addEventListener("selectionchange", onChange);
    document.addEventListener("pointerdown", onDown, true);
    document.addEventListener("pointerup", onUp, true);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("selectionchange", onChange);
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointerup", onUp, true);
    };
  }, [readSelection]);

  return toolbarPressRef;
}
