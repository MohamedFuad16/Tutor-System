/**
 * Silent action tags for the fast voice model.
 *
 * Declaring tools on the realtime request costs seconds of time-to-first-token
 * on GLM (measured ~3 s on the Coding Plan endpoint), so the voice model asks
 * for side work with inline tags instead:
 *
 *   [[images: red panda]]              show real photos now
 *   [[deep diagram: <task>]]           hand a task to the background specialist
 *   (kinds: diagram | explain | research | compare)
 *
 * ActionTagFilter strips the tags from the streamed text (nothing inside
 * them is ever spoken) and reports the actions as they complete, even when a
 * tag arrives split across stream deltas.
 */

export type DeepMode = "diagram" | "explain" | "research" | "compare";
export type VoiceAction = { kind: "images"; query: string } | { kind: "deep"; mode: DeepMode; task: string };

const MODES = new Set<string>(["diagram", "explain", "research", "compare"]);
/** A tag longer than this is not a tag: release it as text rather than hold speech forever. */
const MAX_TAG = 600;

export function parseActionTag(body: string): VoiceAction | null {
  const match = /^\s*(images?|deep)(?:\s+([a-z]+))?\s*:\s*([\s\S]+?)\s*$/i.exec(body);
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
