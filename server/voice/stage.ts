/**
 * The voice stage: what is on the learner's screen during a voice session.
 *
 * The background specialist describes boards (magic-pen working), 3D scenes
 * and web pages as JSON; everything here validates that JSON into the wire
 * types (shared/voice.ts) so the client never receives anything it can't
 * draw safely. A scene is data, never code; a web page only ever runs inside
 * a sandboxed frame with an opaque origin.
 *
 * Also: the short description of the current screen the voice model reads
 * ("On screen: diagram … nodes A = …"), resolving "highlight the database
 * step" to a node id, and ranking photo results so one good picture shows.
 */
import { compileExpression } from "../../shared/expr.js";
import type { DiagramStep, WebImage } from "../../shared/types.js";
import type { Board, BoardItem, BoardPlot, Scene, SceneObject, Vec3, VoiceVisual } from "../../shared/voice.js";
import { mermaidNodes } from "../services/learning.js";

const str = (value: unknown, max: number) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);
const num = (value: unknown, min: number, max: number): number | undefined => {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : undefined;
};
const vec = (value: unknown, limit = 1000): Vec3 | undefined => {
  const items = list(value);
  if (items.length !== 3) return undefined;
  const out = items.map((item) => num(item, -limit, limit));
  return out.every((item) => item !== undefined) ? (out as Vec3) : undefined;
};

// ---------------------------------------------------------------- board

export type Narrated<T> = { value: T; steps: DiagramStep[]; speech: string };

function plotOf(raw: unknown): BoardPlot | undefined {
  const plot = raw as Partial<Record<keyof BoardPlot, unknown>> | null;
  if (!plot || typeof plot !== "object") return undefined;
  const fns = list(plot.fns)
    .map((fn) => str(fn, 120))
    .filter((fn) => fn && compileExpression(fn))
    .slice(0, 3);
  let xMin = num(plot.xMin, -10_000, 10_000) ?? -10;
  let xMax = num(plot.xMax, -10_000, 10_000) ?? 10;
  if (xMin >= xMax) [xMin, xMax] = [Math.min(xMin, xMax) - 5, Math.max(xMin, xMax) + 5];
  const yMin = num(plot.yMin, -1e6, 1e6);
  const yMax = num(plot.yMax, -1e6, 1e6);
  const points = list(plot.points)
    .map((point) => {
      const p = point as { x?: unknown; y?: unknown; label?: unknown };
      const x = num(p?.x, -1e6, 1e6);
      const y = num(p?.y, -1e6, 1e6);
      return x === undefined || y === undefined ? null : { x, y, label: str(p.label, 24) || undefined };
    })
    .filter((point): point is NonNullable<typeof point> => Boolean(point))
    .slice(0, 8);
  if (!fns.length && !points.length) return undefined;
  return {
    fns,
    xMin,
    xMax,
    ...(yMin !== undefined && yMax !== undefined && yMin < yMax ? { yMin, yMax } : {}),
    ...(points.length ? { points } : {}),
  };
}

/** Validates the specialist's board: at most 14 lines, each written while its `say` is spoken. */
export function sanitizeBoard(raw: unknown): Narrated<Board> | null {
  const data = raw as { title?: unknown; speech?: unknown; items?: unknown; lines?: unknown } | null;
  if (!data || typeof data !== "object") return null;
  const items: BoardItem[] = [];
  const steps: DiagramStep[] = [];
  for (const entry of list(data.items ?? data.lines)) {
    if (items.length >= 14) break;
    const item = entry as Record<string, unknown>;
    const latex = str(item.latex ?? item.math, 400);
    const text = str(item.text, 220);
    const plot = plotOf(item.plot);
    const kind: BoardItem["kind"] | null = plot ? "plot" : latex ? "math" : text ? "text" : null;
    if (!kind) continue;
    const id = `L${items.length + 1}`;
    items.push({
      id,
      kind,
      ...(kind === "math" ? { latex } : {}),
      ...(kind === "text" ? { text } : {}),
      ...(kind === "plot" ? { plot, ...(text ? { text } : {}) } : {}),
      ...(str(item.note, 40) ? { note: str(item.note, 40) } : {}),
      ...(item.box === true ? { box: true } : {}),
    });
    const say = str(item.say, 400);
    if (say) steps.push({ node: id, say });
  }
  if (!items.length) return null;
  return {
    value: { title: str(data.title, 120) || "Working", items },
    steps,
    speech: str(data.speech, 600),
  };
}

// ---------------------------------------------------------------- scene

const SHAPES = new Set([
  "sphere",
  "box",
  "cylinder",
  "cone",
  "torus",
  "ring",
  "plane",
  "capsule",
  "arrow",
  "line",
  "label",
]);
const COLOR = /^(?:#[0-9a-f]{3,8}|[a-z]{3,24})$/i;

function objectId(value: unknown, fallback: string, taken: Set<string>) {
  let id =
    str(value, 40)
      .toLowerCase()
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "") || fallback;
  while (taken.has(id)) id = `${id}-2`;
  taken.add(id);
  return id;
}

/** Validates a declarative 3D scene: known shapes, bounded numbers, at most 160 objects. */
export function sanitizeScene(raw: unknown): Narrated<Scene> | null {
  const data = raw as {
    title?: unknown;
    speech?: unknown;
    scene?: unknown;
    objects?: unknown;
    steps?: unknown;
    mood?: unknown;
    camera?: unknown;
  } | null;
  if (!data || typeof data !== "object") return null;
  const body = (data.scene && typeof data.scene === "object" ? data.scene : data) as Record<string, unknown>;
  const taken = new Set<string>();
  const renames = new Map<string, string>();
  const objects: SceneObject[] = [];
  for (const entry of list(body.objects)) {
    if (objects.length >= 160) break;
    const item = entry as Record<string, unknown>;
    const shape = str(item.shape, 12).toLowerCase();
    if (!SHAPES.has(shape)) continue;
    const id = objectId(item.id ?? item.label, `${shape}-${objects.length + 1}`, taken);
    if (typeof item.id === "string") renames.set(item.id.trim().toLowerCase(), id);
    const size =
      typeof item.size === "number" || typeof item.size === "string" ? num(item.size, 0.005, 500) : vec(item.size, 500);
    const color = str(item.color, 24);
    const orbitRaw = item.orbit as Record<string, unknown> | undefined;
    const orbitRadius = orbitRaw ? num(orbitRaw.radius, 0.01, 1000) : undefined;
    const object: SceneObject = {
      id,
      shape: shape as SceneObject["shape"],
      ...(str(item.label, 40) ? { label: str(item.label, 40) } : {}),
      ...(str(item.info, 200) ? { info: str(item.info, 200) } : {}),
      ...(vec(item.position) ? { position: vec(item.position) } : {}),
      ...(vec(item.rotation, 720) ? { rotation: vec(item.rotation, 720) } : {}),
      ...(size !== undefined ? { size } : {}),
      ...(COLOR.test(color) ? { color } : {}),
      ...(num(item.opacity, 0.05, 1) !== undefined ? { opacity: num(item.opacity, 0.05, 1) } : {}),
      ...(item.glow === true ? { glow: true } : {}),
      ...(item.wireframe === true ? { wireframe: true } : {}),
      ...(vec(item.from) ? { from: vec(item.from) } : {}),
      ...(vec(item.to) ? { to: vec(item.to) } : {}),
      ...(list(item.points).length
        ? {
            points: list(item.points)
              .map((point) => vec(point))
              .filter((point): point is Vec3 => Boolean(point))
              .slice(0, 64),
          }
        : {}),
      ...(orbitRaw && orbitRadius !== undefined
        ? {
            orbit: {
              radius: orbitRadius,
              center: typeof orbitRaw.center === "string" ? orbitRaw.center.trim().toLowerCase() : vec(orbitRaw.center),
              speed: num(orbitRaw.speed, -60, 60) ?? 4,
              tilt: num(orbitRaw.tilt, -90, 90) ?? 0,
              phase: num(orbitRaw.phase, 0, 360) ?? (objects.length * 47) % 360,
            },
          }
        : {}),
      ...(num(item.spin, -120, 120) ? { spin: num(item.spin, -120, 120) } : {}),
    };
    if (
      (shape === "line" && !(object.points?.length ?? 0) && !(object.from && object.to)) ||
      (shape === "label" && !object.label)
    )
      continue;
    objects.push(object);
  }
  if (!objects.length) return null;
  // Orbit centres refer to other objects by id; drop references that don't resolve.
  for (const object of objects) {
    if (typeof object.orbit?.center === "string") {
      const resolved =
        renames.get(object.orbit.center) ?? (taken.has(object.orbit.center) ? object.orbit.center : undefined);
      object.orbit.center = resolved && resolved !== object.id ? resolved : undefined;
    }
  }
  const resolve = (id: unknown) => {
    const key = str(id, 40).toLowerCase();
    return renames.get(key) ?? (taken.has(key) ? key : null);
  };
  const steps: DiagramStep[] = list(data.steps ?? body.steps)
    .map((entry) => {
      const step = entry as { focus?: unknown; node?: unknown; say?: unknown };
      const node = resolve(step.focus ?? step.node);
      const say = str(step.say, 400);
      return node && say ? { node, say } : null;
    })
    .filter((step): step is DiagramStep => Boolean(step))
    .slice(0, 10);
  const mood = str(body.mood ?? data.mood, 12);
  const camera = (body.camera ?? data.camera) as { position?: unknown; target?: unknown } | undefined;
  return {
    value: {
      title: str(body.title ?? data.title, 120) || "3D model",
      ...(["space", "studio", "blueprint"].includes(mood) ? { mood: mood as Scene["mood"] } : {}),
      ...(camera && (vec(camera.position) || vec(camera.target))
        ? { camera: { position: vec(camera.position), target: vec(camera.target) } }
        : {}),
      objects,
    },
    steps,
    speech: str(data.speech, 600),
  };
}

// ---------------------------------------------------------------- web page

/** A generated page: size-capped and self-contained. It runs sandboxed on the client (no same-origin). */
export function sanitizeHtml(raw: unknown): string | null {
  let html = typeof raw === "string" ? raw.trim() : "";
  html = html
    .replace(/^```(?:html)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
  if (html.length < 40 || !/<[a-z][\s\S]*>/i.test(html) || html.length > 160_000) return null;
  // A page that navigates itself away would leave the frame showing someone else's site.
  html = html.replace(/<meta[^>]+http-equiv=["']?refresh[^>]*>/gi, "").replace(/<base\b[^>]*>/gi, "");
  if (!/<html[\s>]/i.test(html)) {
    html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${html}</body></html>`;
  }
  return html;
}

// ---------------------------------------------------------------- the screen, in words

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/** One short paragraph telling the voice model what the learner sees, with the ids it can point at. */
export function stageNote(visual: VoiceVisual | null, extra: { pageText?: string } = {}): string {
  if (!visual) return "Nothing is on the screen; only you (the orb) are visible.";
  switch (visual.kind) {
    case "images": {
      const image = visual.images[0];
      return `A photo: "${visual.query}"${image?.title ? ` (${clip(image.title, 80)})` : ""}. ${visual.images.length > 1 ? `${visual.images.length - 1} more can be shown with [[view: next]].` : ""}`;
    }
    case "diagram": {
      const nodes = mermaidNodes(visual.diagram.mermaid)
        .slice(0, 16)
        .map((node) => `${node.id} = ${clip(node.label.replace(/<br\s*\/?>/gi, " "), 40)}`);
      return `A diagram, "${visual.diagram.title}". Nodes: ${nodes.join("; ")}.`;
    }
    case "board": {
      const lines = visual.board.items.map(
        (item) =>
          `${item.id} = ${clip(item.kind === "math" ? `$${item.latex}$` : item.kind === "plot" ? `graph of ${item.plot?.fns.join(", ") || "points"}` : (item.text ?? ""), 70)}`,
      );
      return `Your whiteboard, "${visual.board.title}". Lines: ${lines.join("; ")}.`;
    }
    case "scene": {
      const objects = visual.scene.objects
        .filter((object) => object.label)
        .slice(0, 20)
        .map((object) => `${object.id} = ${object.label}`);
      return `A 3D model you built, "${visual.scene.title}" (${visual.scene.objects.length} parts). Named parts: ${objects.join("; ") || "none"}. The learner can rotate it and tap parts.`;
    }
    case "web":
      return `A web page you built, "${visual.title}", running live in a preview window.`;
    case "markdown":
      return `Notes: "${visual.title}".`;
    case "page": {
      const lit = visual.highlights.map((item) => `${item.id} = "${clip(item.quote, 90)}"`);
      return (
        `Page ${visual.page} of ${visual.pageCount} of the learner's document ${visual.label} "${visual.title}"` +
        `${lit.length ? `, highlighted: ${lit.join("; ")}` : ""}.` +
        (extra.pageText
          ? `\n<page ref="${visual.label} p.${visual.page}">\n${clip(extra.pageText, 1600)}\n</page>`
          : "")
      );
    }
  }
}

/** What the specialist needs to edit the current screen ("make the sun bigger"). */
export function stageSource(visual: VoiceVisual | null): string {
  if (!visual) return "";
  switch (visual.kind) {
    case "diagram":
      return `Current diagram (Mermaid):\n${visual.diagram.mermaid}`;
    case "board":
      return `Current board JSON:\n${JSON.stringify(visual.board).slice(0, 6000)}`;
    case "scene":
      return `Current 3D scene JSON:\n${JSON.stringify(visual.scene).slice(0, 14_000)}`;
    case "web":
      return `Current web page HTML:\n${visual.html.slice(0, 40_000)}`;
    default:
      return "";
  }
}

// ---------------------------------------------------------------- pointing at things

const STOP = new Set([
  "the",
  "a",
  "an",
  "on",
  "of",
  "to",
  "in",
  "and",
  "for",
  "with",
  "that",
  "this",
  "part",
  "section",
  "step",
  "node",
  "box",
  "bit",
  "one",
  "thing",
  "uh",
  "um",
  "please",
  "me",
  "it",
]);
const tokens = (text: string) =>
  (text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((token) => token.length > 1 && !STOP.has(token));

/** Parts of a visual the tutor can point at: [id, words]. */
function targets(visual: VoiceVisual): Array<{ id: string; label: string }> {
  switch (visual.kind) {
    case "diagram":
      return mermaidNodes(visual.diagram.mermaid).map((node) => ({
        id: node.id,
        label: node.label.replace(/<br\s*\/?>/gi, " "),
      }));
    case "board":
      return visual.board.items.map((item) => ({
        id: item.id,
        label: `${item.text ?? ""} ${item.latex ?? ""} ${item.note ?? ""}`,
      }));
    case "scene":
      return visual.scene.objects.map((object) => ({ id: object.id, label: `${object.label ?? ""} ${object.id}` }));
    case "page":
      return visual.highlights.map((item) => ({ id: item.id, label: item.quote }));
    default:
      return [];
  }
}

/**
 * Resolves "the database step", "line 2", "the answer", "Earth" or a raw id
 * to the part of the visual it names, or null when nothing matches well.
 */
export function matchStageTarget(visual: VoiceVisual | null, phrase: string): string | null {
  if (!visual) return null;
  const parts = targets(visual);
  if (!parts.length) return null;
  const text = phrase.trim();
  const exact = parts.find((part) => part.id.toLowerCase() === text.toLowerCase());
  if (exact) return exact.id;
  if (visual.kind === "board") {
    const numbered = /\b(?:line|step|row)\s*(\d+)\b/i.exec(text);
    if (numbered) return parts[Number(numbered[1]) - 1]?.id ?? null;
    if (/\b(?:answer|result|last|final|end)\b/i.test(text)) return parts[parts.length - 1].id;
    if (/\b(?:first|start|beginning|equation|problem)\b/i.test(text)) return parts[0].id;
  }
  const wanted = tokens(text);
  if (!wanted.length) return null;
  let best: { id: string; score: number } | null = null;
  for (const part of parts) {
    const words = new Set(tokens(part.label));
    if (!words.size) continue;
    const shared = wanted.filter(
      (word) => words.has(word) || [...words].some((w) => w.length > 4 && (w.startsWith(word) || word.startsWith(w))),
    ).length;
    const score = shared / Math.min(words.size, Math.max(1, wanted.length));
    if (shared && (!best || score > best.score)) best = { id: part.id, score };
  }
  return best && best.score >= 0.5 ? best.id : null;
}

// ---------------------------------------------------------------- one good photo

/** Watermarked stock and pin boards make poor teaching pictures. */
const WEAK_SOURCES =
  /(?:shutterstock|alamy|dreamstime|istockphoto|gettyimages|123rf|depositphotos|vecteezy|freepik|canstockphoto|bigstockphoto|pinterest|pinimg|stock\.adobe|adobestock|pond5|agefotostock|storyblocks)\./i;
const STRONG_SOURCES =
  /(?:wikipedia\.org|wikimedia\.org|britannica\.com|nasa\.gov|nationalgeographic\.com|nih\.gov|smithsonianmag\.com|si\.edu|bbc\.co\.uk|nature\.com|\.edu$|\.gov$|museum)/i;

/** Orders photo results best-first: the one shown should be large, clean and on topic. */
export function rankImages(images: WebImage[], query: string): WebImage[] {
  const wanted = tokens(query);
  const scored = images.map((image, rank) => {
    let score = 3 - rank * 0.45; // the search engine's own order counts
    const { width = 0, height = 0 } = image;
    if (width && height) {
      const short = Math.min(width, height);
      score += short >= 700 ? 1.2 : short >= 450 ? 0.7 : short < 260 ? -1.6 : 0;
      const ratio = width / height;
      if (ratio < 0.55 || ratio > 2.3) score -= 1;
    }
    const domain = `${image.domain} ${image.imageUrl}`;
    if (WEAK_SOURCES.test(domain)) score -= 2.2;
    if (STRONG_SOURCES.test(image.domain)) score += 0.9;
    if (/\.svg(?:$|\?)/i.test(image.imageUrl)) score -= 0.4;
    const title = new Set(tokens(image.title));
    if (wanted.length) score += (wanted.filter((word) => title.has(word)).length / wanted.length) * 1.2;
    if (/\b(?:logo|icon|clipart|clip art|vector|cartoon|meme|template)\b/i.test(image.title)) score -= 0.8;
    return { image, score };
  });
  return scored.sort((a, b) => b.score - a.score).map((item) => item.image);
}
