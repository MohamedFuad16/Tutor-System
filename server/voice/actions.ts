/**
 * Silent action tags for the fast voice model: its "tool calls".
 *
 * Declaring tools on the realtime request costs seconds of time-to-first-token
 * on GLM (measured ~3 s on the Coding Plan endpoint), so the voice model asks
 * for side work with inline tags instead:
 *
 *   [[images: red panda]]              show one real photo now
 *   [[close]]                          clear the screen
 *   [[focus: B]]                       point at a diagram node, board line or 3D part
 *   [[view: zoom in]]                  zoom in/out, reset, rotate, stop, next, previous,
 *                                      sideways, upright, ar
 *   [[board: solve x^2 - 5x + 6 = 0]]  magic pen: working written step by step
 *   [[build: a 3D solar system]]       a 3D model or a web page, built live (or edited)
 *   [[page: D1 p.12 | exact line]]     a page of the learner's document, that line highlighted
 *   [[read: page 12 with me]]          guided close reading: key lines lit one by one
 *   [[deep diagram: <task>]]           hand a task to the background specialist
 *   (kinds: diagram | explain | research | compare)
 *
 * ActionTagFilter strips the tags from the streamed text (nothing inside
 * them is ever spoken) and reports the actions as they complete, even when a
 * tag arrives split across stream deltas.
 */
import type { StageView } from "../../shared/voice.js";
import { parsePageRef, type PageRef } from "./pages.js";

export type DeepMode = "diagram" | "explain" | "research" | "compare" | "board" | "build" | "read";
export type VoiceAction =
  | { kind: "images"; query: string }
  | { kind: "deep"; mode: DeepMode; task: string }
  | { kind: "close" }
  | { kind: "focus"; target: string }
  | { kind: "view"; view: StageView }
  | { kind: "page"; ref: PageRef };

const MODES = new Set<string>(["diagram", "explain", "research", "compare", "board", "build", "read"]);
/** A tag longer than this is not a tag: release it as text rather than hold speech forever. */
const MAX_TAG = 600;

/** "zoom in", "spin it", "LR" → a stage view, or null. */
export function parseView(phrase: string): StageView | null {
  const text = phrase.toLowerCase().replace(/[_-]/g, " ").trim();
  if (/\bzoom(?:ed)? ?in\b|\bcloser\b|\bbigger\b|\benlarge\b/.test(text)) return "zoom_in";
  if (/\bzoom(?:ed)? ?out\b|\bfurther\b|\bsmaller\b|\bwhole thing\b/.test(text)) return "zoom_out";
  if (/\breset\b|\brecent(?:er|re)\b|\boriginal\b|\bdefault\b/.test(text)) return "reset";
  if (/\bstop\b|\bpause\b|\bfreeze\b|\bhold still\b/.test(text)) return "stop";
  if (/\brotat|\bspin|\bturn (?:it )?around\b|\borbit\b/.test(text)) return "rotate";
  if (/\bnext\b|\banother\b|\bdifferent\b/.test(text)) return "next";
  if (/\bprevious\b|\bback\b|\blast one\b/.test(text)) return "previous";
  if (/\bsideways\b|\bhorizontal|\bleft to right\b|^lr$/.test(text)) return "sideways";
  if (/\bupright\b|\bvertical|\btop to bottom\b|^(?:td|tb)$/.test(text)) return "upright";
  if (/\bar\b|\baugmented\b|\bcamera\b|\bin my room\b/.test(text)) return "ar";
  return null;
}

export function parseActionTag(body: string): VoiceAction | null {
  const text = body.trim();
  if (/^(?:close|clear|hide|dismiss)(?:\s*:.*)?$/i.test(text)) return { kind: "close" };
  const named =
    /^(focus|highlight|point|view|board|pen|whiteboard|build|make|model|page|pages|doc|document|read|reading)\s*:\s*([\s\S]+?)\s*$/i.exec(
      text,
    );
  if (named) {
    const [, name, payload] = named;
    const tool = name.toLowerCase();
    if (tool === "focus" || tool === "highlight" || tool === "point")
      return { kind: "focus", target: payload.slice(0, 120) };
    if (tool === "view") {
      const view = parseView(payload);
      return view ? { kind: "view", view } : null;
    }
    if (tool === "board" || tool === "pen" || tool === "whiteboard")
      return { kind: "deep", mode: "board", task: payload.slice(0, 1200) };
    if (tool === "page" || tool === "pages" || tool === "doc" || tool === "document")
      return { kind: "page", ref: parsePageRef(payload) };
    if (tool === "read" || tool === "reading") return { kind: "deep", mode: "read", task: payload.slice(0, 1200) };
    return { kind: "deep", mode: "build", task: payload.slice(0, 1200) };
  }
  const match = /^\s*(images?|deep)(?:\s+([a-z]+))?\s*:\s*([\s\S]+?)\s*$/i.exec(text);
  if (!match) return null;
  const [, name, mode, payload] = match;
  if (/^image/i.test(name)) return { kind: "images", query: payload.slice(0, 200) };
  const kind = (mode ?? "explain").toLowerCase();
  return { kind: "deep", mode: (MODES.has(kind) ? kind : "explain") as DeepMode, task: payload.slice(0, 1200) };
}

export class ActionTagFilter {
  private buffer = "";

  /** Feed a stream delta; returns the speakable text and any completed actions. */
  push(delta: string): { text: string; actions: VoiceAction[] } {
    this.buffer += delta;
    let text = "";
    const actions: VoiceAction[] = [];
    for (;;) {
      const open = this.buffer.indexOf("[[");
      if (open === -1) {
        // Hold a trailing "[" — it may be the start of a tag.
        const keep = this.buffer.endsWith("[") ? 1 : 0;
        text += this.buffer.slice(0, this.buffer.length - keep);
        this.buffer = this.buffer.slice(this.buffer.length - keep);
        break;
      }
      text += this.buffer.slice(0, open);
      const close = this.buffer.indexOf("]]", open + 2);
      if (close === -1) {
        if (this.buffer.length - open > MAX_TAG) {
          text += this.buffer.slice(open);
          this.buffer = "";
        } else {
          this.buffer = this.buffer.slice(open);
        }
        break;
      }
      const action = parseActionTag(this.buffer.slice(open + 2, close));
      if (action) actions.push(action);
      this.buffer = this.buffer.slice(close + 2);
    }
    return { text, actions };
  }

  /** End of stream: an unterminated tag is dropped (never spoken). */
  flush(): string {
    const rest = this.buffer.startsWith("[[") ? "" : this.buffer;
    this.buffer = "";
    return rest;
  }
}

/** An action in the form the model writes it, kept in history so the model sees its own tag use. */
export function actionTag(action: VoiceAction) {
  switch (action.kind) {
    case "images":
      return `[[images: ${action.query}]]`;
    case "close":
      return "[[close]]";
    case "focus":
      return `[[focus: ${action.target}]]`;
    case "view":
      return `[[view: ${action.view.replace("_", " ")}]]`;
    case "page": {
      const { doc, page, quote, relative, current } = action.ref;
      const where = [
        doc ? `D${doc}` : "",
        page ? `p.${page}` : relative === 1 ? "next" : relative === -1 ? "previous" : current ? "this" : "",
      ]
        .filter(Boolean)
        .join(" ");
      return `[[page: ${where}${quote ? ` | ${quote.slice(0, 160)}` : ""}]]`;
    }
    case "deep":
      return action.mode === "board" || action.mode === "build" || action.mode === "read"
        ? `[[${action.mode}: ${action.task.slice(0, 200)}]]`
        : `[[deep ${action.mode}: ${action.task.slice(0, 200)}]]`;
  }
}

/**
 * Rewrites chat-history notes ("[showed images: X]", "[quiz on …]") for the
 * voice model. Image notes become real tags, so the model sees how it shows
 * photos; everything else goes in double brackets, which are never spoken
 * even if the model imitates them.
 */
export function asVoiceNotes(content: string) {
  return content.replace(/^\[showed images: (.+)\]$/gm, "[[images: $1]]").replace(/^\[(?!\[)(.+)\]$/gm, "[[$1]]");
}
