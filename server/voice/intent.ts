/**
 * Deterministic safety net for "show me a picture" requests in live voice.
 *
 * The fast voice model asks for photos with a silent [[images: …]] tag
 * (./actions.ts), but models sometimes answer "Sure, here's Tokyo!" without
 * the tag, or offer a picture and then forget to act when the learner says
 * yes. The session runs this detector on every final transcript. A hit starts
 * the image search immediately (before the model's first token), so photos
 * appear fast and whether or not the model remembers the tag.
 *
 * Deliberately conservative: it fires on explicit requests ("show me a photo
 * of…", "pull up Tokyo", "what does a neuron look like?") and on a short yes
 * to the tutor's own offer ("I can pull up Tokyo if you want" → "yes please").
 * Explanations ("show me how mitosis works") are left to the model.
 */
import type { VoiceVisual } from "../../shared/voice.js";
import { imageKeywords } from "../providers/search.js";
import { parseView, type VoiceAction } from "./actions.js";
import { matchStageTarget } from "./stage.js";

const IMAGE_NOUN = String.raw`(?:pictures?|photos?|photographs?|images?|pics?|snapshots?)`;
/** Filler the learner may say before the request: "Okay, so, can you…". */
const LEAD = String.raw`^(?:(?:ok(?:ay)?|so|and|now|then|um+|uh+|hey|yes|yeah|yep|sure|alright|also|great|cool|nice|thanks|thank you|tutor|oh)[,.!]?\s+)*`;
const POLITE = String.raw`(?:(?:can|could|would|will) you\s+(?:please\s+)?|please\s+|i(?:'d| would) like (?:you )?to\s+|i want (?:you )?to\s+)?`;
const VERB = String.raw`(?:pull up|bring up|put up|display|show(?: me| us)?|(?:let me|let's|can i|could i|may i|can we|i want to|i'd like to) (?:see|look at))`;
const PRONOUN = /^(?:it|that|this|them|those|these|one|some|a few|more|another one|one of (?:it|them|those))$/i;
const NEGATION = /\b(?:don'?t|do not|no more|stop|not now|never ?mind|without|no thanks|no thank you)\b/i;
/** Objects that ask for an explanation or app content, not a photo. */
const NOT_VISUAL =
  /\b(?:how|why|what|when|which|who|whether|diagram|flow ?chart|chart|graph|steps?|process|examples?|answer|quiz|questions?|notes?|pages?|summary|explanation|formula|equation|proof|code|difference|again|slides?|document|book|chapter|section|paragraph|sentence|line|figure|table|progress|score|results?|way|works?|something|anything|everything|you)\b/i;
const AFFIRMATIVE =
  /^(?:yes|yeah|yep|yup|sure|ok(?:ay)?|please|go ahead|do it|do that|let's see|let's do it|show me|show it|show them|pull it up|bring it up|of course|absolutely|why not|definitely|i'd love that|that would be great|sounds good|go for it)\b/i;
const OFFER =
  /\b(?:i can(?!'t|not)|i could(?!n't)|want me to|would you like(?: me)? to|shall i|should i|want to see|like to see|happy to|i'll)\b/i;

const stripTags = (text: string) => text.replace(/\[\[[\s\S]*?\]\]/g, " ");

/** A short, clean subject for the image search, or "" if nothing usable is left. */
function subjectOf(phrase: string) {
  const cleaned = imageKeywords(
    phrase.replace(
      /\b(?:for (?:me|us|you)|on (?:the )?screen|right now|now|please|real quick|quickly|too|as well|again|up)\b/gi,
      " ",
    ),
  );
  if (!cleaned || cleaned.split(" ").length > 6 || PRONOUN.test(cleaned) || NOT_VISUAL.test(cleaned)) return "";
  return cleaned;
}

/** What the tutor offered to show in its last turn: "I can pull up Tokyo if you want." → "Tokyo". */
export function offeredSubject(lastAssistant: string | undefined) {
  if (!lastAssistant) return "";
  // Clauses, so "I can't show that, but I can pull up Tokyo" yields the offer, not the refusal.
  const clauses = stripTags(lastAssistant)
    .split(/(?<=[.?!])\s+|[,;:]\s*|\s+but\s+/i)
    .filter((clause) => OFFER.test(clause));
  const pattern = new RegExp(
    String.raw`\b(?:pull up|bring up|show you|show|find you|grab|see)\s+(?:you\s+)?(?:some\s+|a few\s+|a\s+|an\s+)?(?:${IMAGE_NOUN}\s+(?:of|from)\s+)?(.+?)(?:\s+(?:if you(?:'d)? (?:want|like)|for you|next|instead|too|as well|on (?:the )?screen))?\s*[.?!,;]?$`,
    "i",
  );
  for (const clause of clauses.reverse()) {
    const match = pattern.exec(clause.trim());
    const subject = match ? subjectOf(match[1]) : "";
    if (subject) return subject;
  }
  return "";
}

/**
 * Returns the image search query the learner is asking for, or null.
 * `lastAssistant` is the tutor's previous turn, used to resolve "yes please"
 * and "pull it up" against something the tutor offered to show.
 */
export function detectImageIntent(utterance: string, lastAssistant?: string): string | null {
  const text = utterance
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[?!.]+$/, "");
  if (!text || NEGATION.test(text)) return null;

  // Japanese: 東京の写真を見せて / 東京の画像を出して
  const ja = /(.+?)の(?:写真|画像|絵)(?:を)?(?:見せて|みせて|出して|表示)/.exec(text);
  if (ja) return ja[1].trim().slice(0, 60) || null;

  // "What does a neuron look like?"
  const looks = /\bwhat (?:does|do|did) (.+?) look like\b/i.exec(text);
  if (looks) return subjectOf(looks[1]) || offeredSubject(lastAssistant) || null;

  // "Show me an image of Nikola Tesla", "any photos of Tokyo?", "can I see a picture?"
  const noun = new RegExp(String.raw`\b${IMAGE_NOUN}\b(?:\s+(?:of|from|showing)\s+(.+))?`, "i").exec(text);
  if (noun) {
    const object = noun[1]?.trim() ?? "";
    if (!object || PRONOUN.test(object)) return offeredSubject(lastAssistant) || null;
    return subjectOf(object) || null;
  }

  // "Pull up Tokyo", "can you show me the Eiffel Tower", "let me see Mount Fuji", "pull it up"
  const verb = new RegExp(String.raw`${LEAD}${POLITE}${VERB}(?:\s+(.+))?$`, "i").exec(text);
  if (verb) {
    const object = (verb[1] ?? "").replace(/\s+(?:up|please|again|for me)$/i, "").trim();
    if (!object || PRONOUN.test(object)) return offeredSubject(lastAssistant) || null;
    return subjectOf(object) || null;
  }

  // "Yes please" right after the tutor offered to show something.
  if (text.split(" ").length <= 6 && AFFIRMATIVE.test(text)) return offeredSubject(lastAssistant) || null;
  return null;
}

// ---------------------------------------------------------------- stage commands

/**
 * "Close it", "zoom in", "next one", "highlight the database step": direct
 * commands about what is on screen. They run the moment the turn ends, so
 * the screen reacts instantly and whether or not the model remembers its
 * tag. `pure` means the utterance is only the command: the tutor answers
 * with a short acknowledgement and skips the model entirely.
 */
export type StageIntent = { actions: VoiceAction[]; pure: boolean };

const TRAIL =
  /(?:\s+(?:please|now|for me|a bit|a little|again|then|right now|off (?:the )?screen|from (?:the )?screen))+$/i;
const CLOSE =
  /^(?:close|hide|remove|clear|dismiss|minimi[sz]e|get rid of|take (?:it|that|this|them) (?:away|down|off)|put (?:it|that|this) away)(?:\s+(?:it|that|this|them|everything|all|(?:the|this|that) (?:\w+\s?){1,2}))?$/i;
const CLOSE_PHRASE =
  /^(?:that'?s enough|i'?m done with (?:it|that|this)|go away|close|all done|we'?re done with (?:it|that|this))$/i;
const VIEW_COMMAND =
  /^(?:zoom (?:in|out)|rotate(?: it| that)?|spin(?: it| that)?|turn it around|stop(?: rotating| spinning| it| moving)?|reset(?: the view| it| the camera)?|(?:show (?:me )?)?(?:the )?(?:next|another|a different) (?:one|image|picture|photo|pic)|(?:go )?back|(?:show (?:me )?)?(?:the )?previous(?: one| image| picture| photo)?|turn it sideways|make it (?:horizontal|vertical|sideways|upright)|(?:show (?:it|that) |put (?:it|that) )?in (?:ar|augmented reality|my room)|(?:open|turn on|use) (?:the |my )?camera)$/i;
const FOCUS_COMMAND =
  /^(?:highlight|point (?:to|at|out)|focus on|zoom (?:in )?on|go to|circle|underline|show me where(?: is)?|where(?:'s| is))\s+(.+)$/i;

function commandText(utterance: string) {
  return utterance
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[?!.,]+$/g, "")
    .replace(new RegExp(`${LEAD}${POLITE}`, "i"), "")
    .replace(/,/g, "")
    .replace(TRAIL, "")
    .trim();
}

export function detectStageIntent(utterance: string, stage: VoiceVisual | null): StageIntent | null {
  if (!stage) return null;
  const whole = utterance.trim().replace(/[?!.]+$/, "");
  if (!whole || NEGATION.test(whole)) return null;
  // "Close it and show me Tokyo": act on the first clause, let the model handle the rest.
  const [first, ...rest] = whole.split(/\s*(?:,\s*)?\b(?:and then|and|then)\b\s*/i);
  const text = commandText(first);
  const alone = rest.join(" ").trim() === "";

  if (CLOSE.test(text) || CLOSE_PHRASE.test(text)) return { actions: [{ kind: "close" }], pure: alone };

  if (VIEW_COMMAND.test(text)) {
    const view = parseView(text);
    if (view) return { actions: [{ kind: "view", view }], pure: alone };
  }

  const focus = FOCUS_COMMAND.exec(text);
  if (focus) {
    const target = matchStageTarget(stage, focus[1]);
    if (target) return { actions: [{ kind: "focus", target }], pure: false };
  }
  return null;
}
