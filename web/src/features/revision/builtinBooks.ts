/**
 * Built-in books shown in the Revision library. They explain Tutor itself:
 * how the v2 system works end to end, and the design language it is built
 * with. Both are plain StudyGuide data, so they render through exactly the
 * same study-guide renderer (concept map, section cards, self-check flip
 * cards) as the learner's own living notebooks.
 *
 * Keep the facts in sync with docs/ARCHITECTURE.md and web/src/styles.css.
 * Writing rules for the content:
 *  - Mermaid: flowchart or sequenceDiagram only, quoted labels, short ids,
 *    no "→" (the client rewrites it to an arrow), no semicolons.
 *  - Markdown: never write a bracketed page citation (it becomes a chip),
 *    never use "$" (it starts KaTeX math) or "~" (it strikes text through).
 */
import type { GuideSection, StudyGuide } from "@shared/guide";

export type BuiltinBook = {
  id: string;
  title: string;
  subtitle: string;
  theme: "ink" | "ember" | "paper";
  pattern: number;
  guide: StudyGuide;
};

type SectionIcon =
  | "idea"
  | "flow"
  | "code"
  | "math"
  | "book"
  | "cpu"
  | "globe"
  | "beaker"
  | "layers"
  | "chart"
  | "clock"
  | "puzzle";

type SectionInput = Omit<GuideSection, "icon" | "sourcePages" | "updatedAt"> & { icon: SectionIcon };

/** Built-in sections cite no uploaded pages and never change at runtime. */
const section = (input: SectionInput): GuideSection => ({ ...input, sourcePages: [], updatedAt: 0 });

// ---------------------------------------------------------------------------
// Book 1: How Tutor Works
// ---------------------------------------------------------------------------

const HOW_TUTOR_WORKS: StudyGuide = {
  bookId: "builtin:how-tutor-works",
  version: 1,
  updatedAt: 0,
  title: "How Tutor Works",
  summary:
    "Tutor is a study workspace that teaches from your own documents, by text or by voice, checks understanding with graded evidence, and keeps a living study guide up to date in the background. It runs as one lean Node server with a single SQLite source of truth, a fast model for anything a human is waiting on and a smart model for deep work. This book walks through every layer, from PDF ingestion to deployment on AWS.",
  goals: [
    "Trace one lap of the study loop, from uploading a PDF to a living study guide.",
    "Explain how voice feels instant: speculative replies, phrase streaming and two-stage barge-in.",
    "Understand how mastery, scheduling and teaching style adapt to graded evidence.",
    "Know how model queues, data ownership and deployment keep Tutor fast, private and scalable.",
  ],
  concepts: [
    {
      id: "study-loop",
      label: "Study loop",
      kind: "core",
      blurb: "Upload, ask, grounded answer, check understanding, living guide, repeat.",
    },
    {
      id: "single-source-of-truth",
      label: "Single source of truth",
      kind: "core",
      blurb: "One server-owned SQLite database holds every piece of learner data.",
    },
    {
      id: "grounded-answers",
      label: "Grounded answers",
      kind: "core",
      blurb: "Replies that cite real pages from the learner's own documents.",
    },
    {
      id: "page-bounded-chunks",
      label: "Page-bounded chunks",
      kind: "supporting",
      blurb: "Passages of about 900 characters that never cross a page boundary.",
    },
    {
      id: "bm25-retrieval",
      label: "BM25 retrieval",
      kind: "supporting",
      blurb: "SQLite FTS5 ranking over a porter index and a trigram index for CJK.",
    },
    {
      id: "vision-ocr",
      label: "Vision OCR",
      kind: "supporting",
      blurb: "GLM-5.3-Flash reads scanned pages that have no text layer.",
    },
    {
      id: "context-packet",
      label: "Context packet",
      kind: "core",
      blurb: "Open page, highlight, top passages and learner model, packed for one turn.",
    },
    {
      id: "fast-talker-slow-thinker",
      label: "Fast talker, slow thinker",
      kind: "core",
      blurb: "A fast model for live replies, a smart model for deep background work.",
    },
    {
      id: "speculative-reply",
      label: "Speculative reply",
      kind: "supporting",
      blurb: "A reply started on EagerEndOfTurn and held until the turn is confirmed.",
    },
    {
      id: "barge-in",
      label: "Two-stage barge-in",
      kind: "supporting",
      blurb: "Duck playback on a hint of speech, clear it on real words.",
    },
    {
      id: "speech-queue",
      label: "Speech queue",
      kind: "supporting",
      blurb: "Ordered text-to-speech with two phrases in flight and playback tracking.",
    },
    {
      id: "narrated-tour",
      label: "Narrated diagram tour",
      kind: "example",
      blurb: "A spoken walk-through that highlights each diagram node in sync.",
    },
    {
      id: "living-study-guide",
      label: "Living study guide",
      kind: "core",
      blurb: "A versioned visual notebook that grows from the conversation.",
    },
    {
      id: "patch-ops",
      label: "Patch operations",
      kind: "supporting",
      blurb: "Small typed edits that a deterministic merge folds into the guide.",
    },
    {
      id: "bkt-mastery",
      label: "BKT mastery",
      kind: "core",
      blurb: "Bayesian Knowledge Tracing, moved only by graded evidence.",
    },
    {
      id: "sm2-scheduling",
      label: "SM-2 scheduling",
      kind: "supporting",
      blurb: "Spaced repetition that decides when each flashcard comes back.",
    },
    {
      id: "priority-limiter",
      label: "Priority limiter",
      kind: "core",
      blurb: "A per-model queue: realtime, then interactive, background and batch.",
    },
    {
      id: "aimd",
      label: "AIMD back-off",
      kind: "supporting",
      blurb: "Halve concurrency when throttled, add one slot back per success.",
    },
  ],
  edges: [
    { from: "study-loop", to: "grounded-answers", label: "produces" },
    { from: "study-loop", to: "living-study-guide", label: "feeds" },
    { from: "context-packet", to: "grounded-answers", label: "grounds" },
    { from: "context-packet", to: "bm25-retrieval", label: "pulls passages via" },
    { from: "bm25-retrieval", to: "page-bounded-chunks", label: "ranks" },
    { from: "vision-ocr", to: "page-bounded-chunks", label: "supplies text for" },
    { from: "fast-talker-slow-thinker", to: "speculative-reply", label: "starts early with" },
    { from: "fast-talker-slow-thinker", to: "narrated-tour", label: "delivers deep work as" },
    { from: "speculative-reply", to: "speech-queue", label: "releases audio into" },
    { from: "barge-in", to: "speech-queue", label: "clears" },
    { from: "narrated-tour", to: "speech-queue", label: "plays through" },
    { from: "living-study-guide", to: "patch-ops", label: "grows by" },
    { from: "living-study-guide", to: "bkt-mastery", label: "mirrors concepts into" },
    { from: "sm2-scheduling", to: "bkt-mastery", label: "adds review evidence to" },
    { from: "bkt-mastery", to: "context-packet", label: "sets the learner level in" },
    { from: "priority-limiter", to: "aimd", label: "adapts with" },
    { from: "priority-limiter", to: "fast-talker-slow-thinker", label: "puts voice first for" },
    { from: "single-source-of-truth", to: "living-study-guide", label: "stores" },
    { from: "single-source-of-truth", to: "bkt-mastery", label: "stores" },
  ],
  sections: [
    section({
      id: "big-picture",
      title: "The Big Picture",
      icon: "idea",
      tldr: "Tutor is one lean Node server that reads your documents, teaches from them by text or voice, and keeps a living study guide.",
      keyPoints: [
        "One Node process serves the web app, the REST and SSE API, and the voice WebSocket.",
        "GLM-5.3-Flash answers anything a human waits on; GLM-5.3 handles deep background work.",
        "Deepgram Flux listens, Aura-2 speaks, and Serper or Wikipedia supplies web and image search.",
        "SQLite in WAL mode, with FTS5 search, is the single source of truth.",
        "Every provider sits behind an interface, so switching vendor means changing one adapter.",
      ],
      explanation:
        "Tutor is a study workspace. You bring your own PDFs, ask questions by typing or talking, and the system teaches **from those pages**, checks what you understood, and quietly keeps a visual study guide up to date.\n\nUnder the hood it is deliberately small: a single Node process serves the app, the REST and server-sent events API, and the duplex voice WebSocket. There is no Python, no separate voice server and no required cache or queue. Five principles shape everything: **one source of truth**, **fast talker, slow thinker**, **every model call through a priority queue**, **grounded, then adaptive**, and **lightweight to run**. Offline mock providers make the whole system runnable and testable without a single API key.",
      diagram: {
        mermaid: `flowchart LR
  A["Learner browser"] -->|"REST and SSE"| B["Tutor server"]
  A -->|"WSS voice audio"| B
  B -->|"chat completions"| C["Z.AI GLM-5.3 and Flash"]
  B -->|"speech in and out"| D["Deepgram Flux and Aura-2"]
  B -->|"web and image search"| E["Serper or Wikipedia"]
  B --- F[("SQLite WAL and FTS5")]
  B --- G[("PDF files")]`,
        caption: "System context: one server between the learner and three kinds of provider.",
      },
      callouts: [
        {
          kind: "remember",
          text: "The browser keeps only preferences. Notebooks, messages, guides and mastery all live on the server.",
        },
      ],
      selfCheck: [
        {
          q: "Which model answers while a learner is waiting, and which one handles deep work?",
          a: "GLM-5.3-Flash is the fast model for anything interactive. GLM-5.3 is the smart model for background delegation, study-guide synthesis and deep chat mode.",
        },
        {
          q: "How can Tutor run with no API keys at all?",
          a: "Offline mock providers stand in for the model, and the browser's own speech recognition and synthesis stand in for Deepgram, so every screen and flow still works.",
        },
      ],
      conceptIds: ["single-source-of-truth", "fast-talker-slow-thinker", "priority-limiter", "grounded-answers"],
    }),
    section({
      id: "study-loop",
      title: "The Study Loop",
      icon: "flow",
      tldr: "Upload, ask, get a grounded answer, check your understanding, and watch the study guide grow, then go round again.",
      keyPoints: [
        "Upload a PDF and it becomes searchable, page by page, in the background.",
        "Ask by typing or talking; the tutor already sees your open page and highlight.",
        "Answers cite real pages, and each citation chip jumps the reader there.",
        "Quiz cards and flashcards produce the graded evidence that moves mastery.",
        "Every turn nudges the living study guide, which shapes the next answer.",
      ],
      explanation:
        "Everything in Tutor serves one loop. You **upload** a document into a notebook. You **ask**, typed or spoken, while you read, and the tutor already knows which page is open and what you highlighted. It replies with a **grounded answer** that cites pages from your own material. Then it **checks understanding** with a quick quiz card or a few flashcards, graded on the server so your mastery reflects real evidence.\n\nFinally, the turn triggers a background sync of the **living study guide**, which turns the conversation into a tidy visual notebook in the Revision view. Its concepts and self-check questions flow back into the learner model, so the next answer is pitched at exactly your level.",
      diagram: {
        mermaid: `flowchart LR
  A["Upload a PDF"] --> B["Ask by text or voice"]
  B --> C["Grounded answer with page chips"]
  C --> D["Check understanding"]
  D --> E["Living study guide"]
  E -->|"shapes the next answer"| B`,
        caption: "The study loop: every step feeds the next one.",
      },
      example: {
        title: "One lap of the loop",
        body: 'You open chapter 3 of a biology textbook, highlight a paragraph on osmosis and ask *"why does the cell swell?"*. The answer cites page 41, draws a small diagram and ends with a two-option quiz card. You answer correctly, your mastery of **osmosis** rises, and shortly afterwards an "Osmosis" section appears in the notebook with a self-check question to flip later.',
      },
      callouts: [
        {
          kind: "tip",
          text: "Highlight a passage before you ask. The selection goes straight into the context packet, so the answer gets sharper.",
        },
      ],
      selfCheck: [
        {
          q: "What two things does the tutor already know about your reading when you ask?",
          a: "The page you have open and any passage you have highlighted. Both go into the context packet for the turn.",
        },
        {
          q: "Which step of the loop actually moves your mastery?",
          a: "Checking understanding. Graded quiz answers and flashcard reviews are the only evidence that moves mastery.",
        },
      ],
      conceptIds: ["study-loop", "grounded-answers", "living-study-guide", "bkt-mastery"],
    }),
    section({
      id: "document-ingestion",
      title: "Document Ingestion",
      icon: "beaker",
      tldr: "Each PDF is read page by page, scanned pages are read by a vision model, and the text is cut into page-bounded chunks for search.",
      keyPoints: [
        "Uploads return 202 at once; a background worker ingests up to two documents at a time.",
        "pdf.js extracts text per page; pages without a text layer go to GLM-5.3-Flash vision.",
        "Up to 30 scanned pages per document are OCR'd, two at a time.",
        "Chunks of about 900 characters overlap by 150 and never cross a page.",
        "FTS5 indexes every chunk twice: porter stemming for Latin text, trigrams for Japanese and CJK.",
        "SSE events tell open tabs when a document is ready, and a notebook title is suggested.",
      ],
      explanation:
        "Uploading feels instant because the heavy lifting happens afterwards. The API checks that the file really is a PDF, stores it under an opaque id and returns **202** with the document marked *processing*. A background worker then extracts text **per page** with pdf.js. Scanned pages have no text layer, so they are rendered and sent to **GLM-5.3-Flash**, which is natively multimodal and doubles as the OCR engine.\n\nThe text is split into chunks of about 900 characters that **never cross a page boundary**, so every search hit maps to exactly one citable page. SQLite **FTS5** indexes the chunks twice: a porter index for Latin scripts and a **trigram** index for Japanese, Chinese and Korean, which have no spaces to split words on.",
      diagram: {
        mermaid: `sequenceDiagram
  participant B as Browser
  participant A as API
  participant W as Ingest worker
  participant M as GLM-5.3-Flash
  B->>A: Upload PDF
  A-->>B: 202 processing
  A->>W: Queue the document
  W->>W: pdf.js text per page
  W->>M: OCR pages with no text layer
  W->>W: Page-bounded chunks and FTS5 index
  W->>M: Suggest a notebook title
  W-->>B: SSE document updated`,
        caption: "Ingestion runs after the upload returns, and the browser hears about progress over SSE.",
      },
      callouts: [
        {
          kind: "remember",
          text: "Page-bounded chunks are what make citations trustworthy: a passage can only ever come from one page.",
        },
      ],
      selfCheck: [
        {
          q: "Why do chunks never cross a page boundary?",
          a: "So every retrieved passage maps to exactly one page, which lets the tutor cite it precisely and the reader jump straight to it.",
        },
        {
          q: "Why is there a second, trigram index?",
          a: "Japanese and Chinese text has no spaces, so the word tokenizer cannot segment it. Trigram matching still finds partial matches.",
        },
        {
          q: "What happens to a scanned page with no text layer?",
          a: "It is rendered as an image and read by GLM-5.3-Flash's vision ability, for up to 30 pages per document.",
        },
      ],
      conceptIds: ["page-bounded-chunks", "bm25-retrieval", "vision-ocr"],
    }),
    section({
      id: "tutor-turn",
      title: "Anatomy of a Tutor Turn",
      icon: "puzzle",
      tldr: "A typed question becomes a compact context packet, a streamed answer, up to three parallel tool rounds and clickable page chips.",
      keyPoints: [
        "The context packet holds the open page, highlight, top BM25 passages and learner model.",
        "Replies stream over SSE as start, reasoning, delta, part and done events.",
        "Tools: search_document, show_images, web_search, create_quiz and make_flashcards.",
        "Tool calls in a round run in parallel, with at most three rounds.",
        "Diagrams arrive as Mermaid, draw themselves in, and can be narrated node by node.",
      ],
      explanation:
        "Every turn starts with `buildContext`, which assembles a **context packet** within a character budget: the notebook and its documents, the page you have open, your highlighted passage, the best BM25 passages from anywhere in the notebook, and the learner model, meaning which concepts are shaky and which are solid.\n\nThe fast model streams its answer over server-sent events. When it needs more, it calls tools, and every call in a round runs **in parallel**, for up to three rounds. Citations name a document and a page inside square brackets, and the client resolves them into clickable chips. If you close the tab mid-answer, the model stream is aborted and the partial reply is saved as *interrupted*, so nothing is lost.",
      diagram: {
        mermaid: `flowchart TD
  A["Learner question"] --> B["Context packet"]
  B --> C["Fast model streams over SSE"]
  C -->|"needs more"| D["Parallel tool round, max 3"]
  D --> C
  C --> E["Answer with page chips and diagrams"]
  E --> F["Saved to the notebook thread"]
  F --> G["Debounced study-guide sync"]`,
        caption: "One typed turn, from question to saved message and guide sync.",
      },
      example: {
        title: "What a citation looks like",
        body: "The model writes a short tag such as `D1 p.12` inside square brackets. `D1` is the first document in the notebook and `p.12` is the page. The chat panel turns the tag into a small orange chip, and clicking it scrolls the reader to page 12 of that document.",
      },
      callouts: [
        {
          kind: "tip",
          text: "Ask for a diagram, then press Walk me through: the tutor narrates it one node at a time.",
        },
      ],
      selfCheck: [
        {
          q: "Name three things inside the context packet.",
          a: "Any three of: the notebook and document list, the open page, the highlighted passage, the top BM25 passages, the learner model and the study-guide summary.",
        },
        {
          q: "What happens to an answer if the learner disconnects mid-stream?",
          a: "The model stream is aborted and the partial answer is saved with the interrupted flag.",
        },
      ],
      conceptIds: ["context-packet", "grounded-answers", "bm25-retrieval"],
    }),
    section({
      id: "voice-duplex",
      title: "Voice: Fast Talker, Slow Thinker",
      icon: "clock",
      tldr: "A fast model starts speaking within moments while a smart model works on anything deep in the background.",
      keyPoints: [
        "Microphone audio streams at 16 kHz to Deepgram Flux, which detects turns natively.",
        "EagerEndOfTurn starts a speculative reply; its audio is held until EndOfTurn confirms.",
        "A phrase chunker releases the first clause after about 12 characters.",
        "The speech queue synthesises two phrases at once but plays them strictly in order.",
        "Hard requests are delegated to GLM-5.3 and woven back in when the conversation is idle.",
      ],
      explanation:
        "Voice is a cascade of speech-to-text, a language model and text-to-speech, tuned so that it *feels* immediate. Flux detects the end of your turn in roughly 260 ms. Even earlier, an **EagerEndOfTurn** event lets the fast model begin a **speculative reply**. Its audio is held back until EndOfTurn confirms the same transcript, and a TurnResumed event simply cancels it.\n\nAs text streams in, a phrase chunker cuts it into speakable pieces, and Aura-2 synthesises each one as its own segment. The **speech queue** keeps two phrases in flight, so the next one is ready before the current one ends. When a question needs real thought, such as a diagram, a careful derivation or a web lookup, the fast model says a short bridge line and **delegates** the task to GLM-5.3.",
      diagram: {
        mermaid: `flowchart LR
  A["Mic audio"] --> B["Flux STT"]
  B -->|"EagerEndOfTurn"| C["Fast model: speculative reply"]
  B -->|"EndOfTurn confirms"| D["Release held audio"]
  C -->|"phrases"| D
  D --> E["Speech queue: 2 in flight"]
  E --> F["Speaker"]
  C -->|"delegate"| G["Smart model in background"]
  G -->|"woven in when idle"| E`,
        caption: "The duplex loop: speak early and fast, think deeply in parallel.",
      },
      example: {
        title: "Where the milliseconds go",
        body: "End of turn from Flux takes about **260 ms** at the median, and eager speculation claws back another **150 to 250 ms**. After that come the fast model's first token and Aura-2's first audio, about **200 ms** more. Because the first clause is released after only about 12 characters, you hear the tutor begin while the rest of the sentence is still being written.",
      },
      callouts: [
        {
          kind: "remember",
          text: "Side effects of a speculative reply, like starting background work or showing images, wait until the turn is confirmed.",
        },
      ],
      selfCheck: [
        {
          q: "What happens to a speculative reply if the learner keeps talking?",
          a: "Flux sends TurnResumed and the speculative reply is cancelled. Its held-back audio is never played.",
        },
        {
          q: "Why does the speech queue keep two phrases in flight?",
          a: "So the next phrase is already synthesised before the current one finishes, which avoids gaps, while playback still happens strictly in order.",
        },
      ],
      conceptIds: ["fast-talker-slow-thinker", "speculative-reply", "speech-queue"],
    }),
    section({
      id: "voice-interruptions",
      title: "Voice: Interruptions, Tours and Fallbacks",
      icon: "code",
      tldr: "You can cut in at any moment, background results arrive as narrated visuals, and every phrase is normalised to sound natural.",
      keyPoints: [
        "Barge-in is two-stage: StartOfTurn only ducks playback, because it may be echo.",
        "Two real words, an end of turn or the stop button clears playback.",
        "The tutor's message is truncated to the segments you actually heard.",
        "Each narrated tour step is a segment with a focus node, so highlights match the audio.",
        "A deterministic normaliser makes code, LaTeX, URLs and citations speakable.",
        "Without Deepgram, browser speech recognition and synthesis drive the same server brain.",
      ],
      explanation:
        "A microphone also hears the speaker, so barge-in has **two stages**. A StartOfTurn while the tutor talks only **ducks** the volume. Two real words, an end of turn or the stop button **clears** playback. The client reports which segments actually played, and the reply is **truncated to what you heard**, so the transcript never claims something you missed.\n\nBackground results arrive as `visual` messages, such as a diagram, images or a markdown panel, introduced only when nobody is talking. Each step of a narrated diagram tour is its own segment carrying a `focus` node, so the highlight moves exactly as the words are spoken. Finally, `shared/speech.ts` makes every phrase speakable: code becomes one spoken pointer, LaTeX is read in words, URLs become domains and citations are dropped.",
      diagram: {
        mermaid: `sequenceDiagram
  participant L as Learner
  participant C as Browser
  participant S as Voice server
  S->>C: Segments 1, 2 and 3
  C->>S: Playback started for segment 1
  L->>S: StartOfTurn detected
  S->>C: Duck the volume
  L->>S: Two real words
  S->>C: Clear playback
  S->>S: Keep only segment 1 as heard`,
        caption: "Two-stage barge-in: duck on a hint of speech, clear on real words, keep only what was heard.",
      },
      callouts: [
        {
          kind: "warning",
          text: "Echo from laptop speakers can sound like the learner talking. Ducking first stops the tutor from interrupting itself.",
        },
      ],
      selfCheck: [
        {
          q: "Why does StartOfTurn only duck the audio instead of stopping it?",
          a: "It may just be echo of the tutor's own voice. Only two real words or a confirmed end of turn prove a genuine interruption.",
        },
        {
          q: "How does a narrated tour keep the highlighted node in sync with speech?",
          a: "Each tour step is a separate speech segment carrying a focus node, and the client highlights that node when the segment starts playing.",
        },
        {
          q: "What does the tutor say when its answer contains a code block?",
          a: 'The normaliser replaces the whole block with one spoken pointer, such as "I\'ve put the code on screen."',
        },
      ],
      conceptIds: ["barge-in", "speech-queue", "narrated-tour", "fast-talker-slow-thinker"],
    }),
    section({
      id: "living-study-guide",
      title: "The Living Study Guide",
      icon: "book",
      tldr: "The smart model turns new conversation into small patch operations that a deterministic merge folds into a versioned guide.",
      keyPoints: [
        "Syncs are debounced by 12 seconds, or start at once after 8 pending messages.",
        "One sync per book at a time; the model sees a compact guide plus unseen messages.",
        "Ops: set_overview, upsert_section, add_concepts, add_glossary, add_misconceptions, set_next_steps.",
        "The pure merge matches similar titles, removes duplicates and enforces caps.",
        "Every sixth sync may consolidate; a rewrite that loses over 60% of sections is rejected.",
        "Concepts become learner-model rows, and self-check questions become flashcards.",
      ],
      explanation:
        "Regenerating a whole notebook after every message would be slow, costly and unstable. Instead, the guide **grows by patches**. After a turn, a debounced, single-flight sync hands the smart model a **compact copy of the guide plus only the messages it has not seen**, so the prompt stays flat as the guide grows. The model replies with operations such as `upsert_section` or `add_concepts`.\n\nA **pure, unit-tested merge** applies them: stable ids, title-similarity matching so near-duplicate sections combine, and de-duplicated, capped key points, callouts and self-checks. Every sixth sync, a **consolidation pass** rewrites the guide into a clean learning path, unless it would lose most of the sections. The result is saved as a new version, and a `guide.updated` event refreshes the Revision view.",
      diagram: {
        mermaid: `flowchart TD
  A["Conversation turns"] -->|"debounce 12s or 8 pending"| B["Guide sync, one per book"]
  B --> C["Smart model returns patch ops"]
  C --> D["Deterministic merge"]
  D --> E[("Versioned guide JSON")]
  D --> F["Concepts to learner model"]
  D --> G["Self-checks to flashcards"]
  E -->|"every 6 syncs"| H["Consolidation pass"]
  E --> I["SSE guide.updated to Revision"]`,
        caption: "The study guide grows by small, merged patches rather than full rewrites.",
      },
      callouts: [
        {
          kind: "remember",
          text: "The model proposes; deterministic code decides. That is why the guide stays coherent across hundreds of messages.",
        },
      ],
      selfCheck: [
        {
          q: "Why does the guide-sync prompt stay about the same size as the guide grows?",
          a: "The model sees only a compact summary of the guide plus the messages it has not covered yet, never the full guide or the whole history.",
        },
        {
          q: "When is a consolidation rewrite rejected?",
          a: "When it would keep fewer than 40% of the existing sections. Losing more than 60% means something went wrong, so the original guide is kept.",
        },
      ],
      conceptIds: ["living-study-guide", "patch-ops", "bkt-mastery"],
    }),
    section({
      id: "adaptive-learning",
      title: "Adaptive Learning",
      icon: "math",
      tldr: "Mastery moves only on graded evidence through Bayesian Knowledge Tracing, while SM-2 decides when each card comes back.",
      keyPoints: [
        "BKT uses slip 0.1 and transit 0.12; the guess rate depends on the question format.",
        "Multiple choice guesses at one over the option count, free text at 0.05, flashcards at 0.2.",
        "Quiz answers are graded on the server and never reach the client before submission.",
        "SM-2 scheduling, with a ten-minute relearning step after a lapse.",
        "Every context packet carries a level: new, developing or confident.",
      ],
      explanation:
        "Tutor never takes a model's word that you *understand* something. Mastery per concept moves only on **graded evidence**: quiz cards in chat, graded on the server, and flashcard reviews. Each result updates a **Bayesian Knowledge Tracing** estimate. With slip 0.1 and a guess rate matched to the format, a correct answer raises the estimate, a wrong one lowers it, partial credit lands in between, and a transit of 0.12 credits the learning that the attempt itself causes.\n\nFlashcards follow **SM-2**: *again* returns in ten minutes and lowers the ease, *good* waits one day, then three, then multiplies by the ease, capped at a year. Your average mastery sets the level in every context packet, and the prompt shifts between **intuition-first**, **scaffolded** and **concise-and-deeper** teaching.",
      diagram: {
        mermaid: `flowchart LR
  A["Quiz answer"] --> C["Graded score"]
  B["Flashcard review"] --> C
  B --> E["SM-2 next due date"]
  C --> D["BKT mastery update"]
  D --> F["Learner level"]
  F --> G["Teaching style for the next turn"]`,
        caption: "Evidence in, mastery and schedule out, and the next answer adapts.",
      },
      example: {
        title: "Three levels, three teaching styles",
        body: "- **New** (nothing assessed yet): build intuition first, define terms plainly, give one concrete example before any formalism.\n- **Developing** (average mastery below 55%): revisit shaky concepts, scaffold the steps and check understanding after key ideas.\n- **Confident**: be concise, go deeper, connect ideas and pose a harder transfer question now and then.",
      },
      callouts: [
        {
          kind: "remember",
          text: "Concepts below 50% mastery come due again in a day, below 80% in three days, and the rest in ten.",
        },
      ],
      selfCheck: [
        {
          q: "Why can't the tutor raise your mastery just by deciding you understood?",
          a: "Mastery only moves on graded evidence, meaning quiz answers and flashcard reviews. A model's opinion is never used.",
        },
        {
          q: "What happens when you press again on a flashcard?",
          a: "It counts as a lapse: repetitions reset, the ease drops by 0.2 (never below 1.3) and the card returns in ten minutes.",
        },
      ],
      conceptIds: ["bkt-mastery", "sm2-scheduling", "context-packet"],
    }),
    section({
      id: "model-access",
      title: "Model Access: Queues and Back-pressure",
      icon: "cpu",
      tldr: "Every model call waits in a priority queue, so live voice always beats typed chat, background work and housekeeping.",
      keyPoints: [
        "One PriorityLimiter per model role: fast, smart and vision.",
        "Lanes run in order: realtime, interactive, background, batch; first come, first served within each.",
        "A 429 or Z.AI code 1302 halves concurrency; each success adds one slot back.",
        "Interactive calls retry at most twice within 2.5 s; background work backs off up to 45 s.",
        "Quota errors such as 1113, 1308 and 1310 are never retried.",
        "GLM-5.3 always reasons, so latency-sensitive calls send reasoning_effort low.",
      ],
      explanation:
        "Model providers throttle, and a study app has very different kinds of waiting. So every call goes through a **PriorityLimiter** for its model role. Waiters are ordered by lane, **realtime** voice turns first, then **interactive** chat, **background** delegated work and **batch** housekeeping such as guide sync. Within a lane it is first come, first served, and queued work can be cancelled.\n\nConcurrency adapts with **AIMD**, the same shape TCP uses: a rate-limit response halves the effective ceiling, and each success adds one slot back. Retries depend on who is waiting, and quota errors are shown to the learner with the reset time when Z.AI provides it. Because GLM-5.3 rejects `thinking: disabled` with error 1210, the client asks for `reasoning_effort: low` instead, and learns at runtime which models behave this way.",
      diagram: {
        mermaid: `flowchart TD
  A["Voice turn: realtime"] --> Q["Priority queue per model role"]
  B["Typed chat: interactive"] --> Q
  C["Delegated work: background"] --> Q
  D["Guide sync: batch"] --> Q
  Q --> M["Z.AI GLM models"]
  M -->|"429 or 1302"| H["Halve concurrency"]
  M -->|"success"| I["Add one slot back"]`,
        caption: "Priority lanes and AIMD keep the voice turn fast even when the account is throttled.",
      },
      example: {
        title: "Defaults and tuning",
        body: "Out of the box the fast model runs **3** concurrent requests, the smart model **2** and vision **1**. Set `ZAI_FAST_CONCURRENCY`, `ZAI_SMART_CONCURRENCY` and `ZAI_VISION_CONCURRENCY` to match your Z.AI account tier, and watch `GET /api/system` for queue depth and throttling per model.",
      },
      callouts: [
        {
          kind: "warning",
          text: "Production should use a pay-as-you-go Z.AI key on the standard endpoint. Coding Plan keys are restricted to supported coding tools.",
        },
      ],
      selfCheck: [
        {
          q: "A delegated voice task and a guide sync both wait for the smart model. Which runs first?",
          a: "The delegated task. It sits in the background lane, which outranks the batch lane used by guide sync.",
        },
        {
          q: "What does AIMD do after a 429?",
          a: "It halves the limiter's effective concurrency, then adds one slot back for each successful call until it reaches the configured maximum.",
        },
        {
          q: "Why are quota errors never retried?",
          a: "Retrying cannot help when the account is out of quota, so the error goes straight to the learner, with the reset time when Z.AI provides one.",
        },
      ],
      conceptIds: ["priority-limiter", "aimd", "fast-talker-slow-thinker"],
    }),
    section({
      id: "data-and-privacy",
      title: "Data, Identity and Privacy",
      icon: "layers",
      tldr: "One SQLite database holds every learner's data, every row carries a user id, and every route is scoped by it.",
      keyPoints: [
        "SQLite in WAL mode is the single source of truth; the browser keeps only preferences.",
        "Every row carries user_id, so the schema maps directly onto Postgres ownership.",
        "Voice WebSockets need a single-use, 60-second ticket and pass an origin check.",
        "An optional ACCESS_CODE protects a deployment; OIDC can sit in front in production.",
        "Model-backed routes have a per-learner token bucket, 30 requests a minute by default.",
        "Uploads are PDF only, magic-byte checked, size-limited and stored under opaque ids.",
      ],
      explanation:
        "v1 kept learner data in three overlapping stores plus a migration layer. v2 has **one**: a SQLite database in WAL mode, owned by the server. Notebooks, documents and pages, the search index, conversations, study guides and the learner model all live side by side, and two FTS5 tables are kept in sync with the chunks by triggers.\n\nEach browser gets a local learner profile id, sent as `X-User-Id`, and **every query is scoped by it**. Browsers cannot set headers on a WebSocket, so voice first fetches a **single-use ticket** over authenticated HTTP, and the upgrade checks the origin too. Provider keys live only on the server, and the logger redacts anything that looks like a credential.",
      example: {
        title: "The tables at a glance",
        body: "| Table | Holds |\n| --- | --- |\n| `users`, `books` | learner profiles and notebooks |\n| `documents`, `pages` | PDFs and per-page text |\n| `chunks`, `chunks_fts`, `chunks_tri` | the retrieval index |\n| `messages` | one thread per book, for chat and voice |\n| `guides` | versioned study-guide JSON |\n| `concepts`, `attempts`, `quizzes`, `cards` | mastery, evidence and spaced repetition |\n| `annotations` | PDF highlights and notes |\n| `activity`, `llm_usage` | analytics and per-learner token accounting |",
      },
      callouts: [
        {
          kind: "tip",
          text: "Model, speech and search keys never reach the browser, so nothing in the client can leak them.",
        },
      ],
      selfCheck: [
        {
          q: "Why does the voice connection need a ticket?",
          a: "Browsers can't set custom headers on a WebSocket, so the client first gets a short-lived, single-use ticket over authenticated HTTP and presents it when connecting.",
        },
        {
          q: "What makes a later move to Postgres straightforward?",
          a: "Every row already carries user_id and storage sits behind a repository layer, so the schema maps directly onto Postgres with row-level ownership.",
        },
      ],
      conceptIds: ["single-source-of-truth"],
    }),
    section({
      id: "deployment-on-aws",
      title: "Deployment on AWS",
      icon: "globe",
      tldr: "Start with one container on one disk, then scale out by swapping adapters rather than rewriting the app.",
      keyPoints: [
        "Phase 1: one ECS Fargate task or EC2 t4g.medium behind an ALB with WebSockets.",
        "SQLite and PDFs live on an EBS gp3 volume; provider keys live in Secrets Manager.",
        "On SIGTERM the server drains voice sessions, so deploys never cut a learner off.",
        "Phase 2 swaps in RDS Postgres, S3, ElastiCache Redis and SQS workers.",
        "Serverless hosts lack long-lived WebSockets, which duplex voice needs.",
      ],
      explanation:
        "Phase one serves roughly one to two thousand concurrent learners from a single container: CloudFront in front, an **ALB** with WebSocket support and a 300-second idle timeout, one **ECS Fargate** task or EC2 t4g.medium, and an **EBS gp3** volume for SQLite and PDFs. The multi-stage Dockerfile runs as non-root with a health check at `/api/health`. Infrastructure costs roughly 40 to 70 US dollars a month; model and speech usage dominate spend.\n\nPhase two, for ten thousand learners and more, swaps one piece at a time: SQLite for **RDS Postgres**, local files for **S3**, the in-process event hub for **Redis** pub/sub, and in-process queues for **SQS** plus workers. A voice session never outlives its WebSocket, so the ALB needs no stickiness.",
      diagram: {
        mermaid: `flowchart LR
  A["Learners"] --> B["CloudFront"]
  B --> C["ALB with WebSockets"]
  C --> D["Tutor container on ECS or EC2"]
  D --> E[("EBS gp3: SQLite and PDFs")]
  D --> F["Secrets Manager"]
  D --> G["CloudWatch logs and metrics"]`,
        caption: "Phase 1: one container, one volume and a load balancer that speaks WebSocket.",
      },
      example: {
        title: "Trade-offs we chose",
        body: "- **Speech-to-speech APIs** such as OpenAI Realtime are simpler and truly duplex, but lock the brain to one vendor and cost about 0.05 to 0.30 US dollars a minute. The cascade keeps GLM as the brain at about 0.03 to 0.05 US dollars a minute for speech, plus tokens.\n- **A vector database** is unnecessary at notebook scale. BM25 over page-bounded chunks grounds answers well, and `pgvector` is the natural next step.\n- **Serverless hosting** can serve the web app from a CDN, but not the long-lived voice WebSocket.",
      },
      callouts: [
        {
          kind: "tip",
          text: "In phase 2, autoscale on active voice sessions and event-loop lag rather than CPU alone.",
        },
      ],
      selfCheck: [
        {
          q: "Why doesn't the load balancer need sticky sessions for voice?",
          a: "A voice session never outlives its WebSocket connection, so all of its state lives on the one instance that holds the socket.",
        },
        {
          q: "Name two swaps that take Tutor from phase 1 to phase 2.",
          a: "Any two of: SQLite to RDS Postgres, local PDFs to S3, the in-process event hub to ElastiCache Redis, and in-process queues to SQS with workers.",
        },
      ],
      conceptIds: ["single-source-of-truth", "priority-limiter"],
    }),
  ],
  glossary: [
    {
      term: "Context packet",
      definition:
        "The grounding bundle for one turn: notebook, documents, open page, highlight, top passages, learner model and guide summary.",
    },
    {
      term: "BM25",
      definition: "A classic relevance-ranking formula. SQLite FTS5 uses it to rank chunks against a question.",
    },
    {
      term: "FTS5",
      definition:
        "SQLite's full-text search engine. Tutor keeps a porter index and a trigram index over the same chunks.",
    },
    {
      term: "Trigram index",
      definition: "An index over three-character windows, used for Japanese and other CJK text that has no spaces.",
    },
    {
      term: "EagerEndOfTurn",
      definition:
        "A Deepgram Flux event saying the learner has probably finished, early enough to start a speculative reply.",
    },
    {
      term: "Barge-in",
      definition: "Interrupting the tutor while it speaks. Tutor ducks playback first, then clears it on real words.",
    },
    {
      term: "Speech queue",
      definition:
        "The ordered text-to-speech pipeline that synthesises two phrases at once and tracks exactly what was played.",
    },
    {
      term: "Delegation",
      definition:
        "The fast voice model handing a deep task, such as a diagram or research, to GLM-5.3 in the background.",
    },
    {
      term: "Patch operation",
      definition: "A small typed change to the study guide, such as upsert_section, applied by a deterministic merge.",
    },
    {
      term: "Bayesian Knowledge Tracing",
      definition: "A probabilistic estimate of whether a learner knows a concept, updated after each graded attempt.",
    },
    {
      term: "SM-2",
      definition:
        "A spaced-repetition algorithm that sets each flashcard's next due date from its ease and review history.",
    },
    {
      term: "AIMD",
      definition:
        "Additive increase, multiplicative decrease: halve concurrency when throttled, add one back per success.",
    },
    {
      term: "Priority lane",
      definition: "One of realtime, interactive, background or batch. It decides who gets the next model slot.",
    },
    {
      term: "Voice ticket",
      definition: "A single-use, 60-second credential that lets the browser open the voice WebSocket.",
    },
    {
      term: "SSE",
      definition: "Server-sent events: the one-way stream that carries chat deltas and live updates to the browser.",
    },
  ],
  misconceptions: [
    {
      wrong: "The AI decides when you have mastered a concept.",
      right:
        "Mastery moves only on graded evidence, meaning quiz answers and flashcard reviews, through Bayesian Knowledge Tracing.",
    },
    {
      wrong: "The study guide is regenerated from scratch after every message.",
      right:
        "It grows through small patch operations merged deterministically, plus an occasional consolidation that is rejected if it loses too much.",
    },
    {
      wrong: "Voice mode is a separate assistant with its own memory.",
      right:
        "Voice and chat share one thread per notebook, the same context builder and the same server. Voice even starts from the recent chat.",
    },
    {
      wrong: "Tutor needs a vector database to find the right passages.",
      right:
        "SQLite FTS5 BM25 over page-bounded chunks grounds answers well at notebook scale; pgvector is the natural next step if needed.",
    },
    {
      wrong: "Interrupting the tutor loses track of what it said.",
      right: "The browser reports which segments played, and the message is truncated to exactly what you heard.",
    },
    {
      wrong: "Your notebooks and progress are stored in the browser.",
      right: "Everything except preferences lives on the server in one SQLite database, scoped to your learner id.",
    },
  ],
  nextSteps: [
    "Open a notebook, upload a PDF and ask about the page you are reading.",
    "Start a voice session and interrupt the tutor mid-sentence to feel the two-stage barge-in.",
    "Come back to Revision after a few turns and watch your own living study guide take shape.",
  ],
  messagesCovered: 0,
};

// ---------------------------------------------------------------------------
// Book 2: Design Language
// ---------------------------------------------------------------------------

const DESIGN_LANGUAGE: StudyGuide = {
  bookId: "builtin:design-language",
  version: 1,
  updatedAt: 0,
  title: "Design Language",
  summary:
    "Tutor's design language is Obsidian & Paper: a calm dark workspace for focus, warm paper for review, one orange for action and violet-blue light wherever the AI is at work. Motion explains cause and effect, and every flourish respects accessibility. This book is the field guide to the colours, type, surfaces and patterns that make Tutor feel like Tutor.",
  goals: [
    "Recognise what each colour family and typeface is for.",
    "Know when a surface should be obsidian, liquid glass or paper.",
    "Understand the motion, voice and notebook patterns that make the product feel alive.",
    "Apply the accessibility rules that every screen must follow.",
  ],
  concepts: [
    {
      id: "obsidian-and-paper",
      label: "Obsidian & Paper",
      kind: "core",
      blurb: "The core idea: a dark workspace for focus, warm paper for review.",
    },
    {
      id: "signal-orange",
      label: "Signal orange",
      kind: "core",
      blurb: "#ff6e00, the only colour that asks you to act.",
    },
    {
      id: "aura-light",
      label: "Aura light",
      kind: "core",
      blurb: "Violet, blue and cyan light that marks AI activity.",
    },
    {
      id: "paper-tones",
      label: "Paper tones",
      kind: "supporting",
      blurb: "#f7f3ec and its companions, the warm surfaces of notebooks.",
    },
    {
      id: "type-roles",
      label: "Type roles",
      kind: "core",
      blurb: "Geist Sans, Space Grotesk, Lora and Geist Mono, one job each.",
    },
    {
      id: "dot-matrix",
      label: "Dot matrix",
      kind: "core",
      blurb: "The 5 by 7 glyph of dots and rings that signs Tutor.",
    },
    {
      id: "pattern-cards",
      label: "Pattern cards",
      kind: "supporting",
      blurb: "Tall ink, ember or paper cards that carry the dot glyph.",
    },
    {
      id: "liquid-glass",
      label: "Liquid glass",
      kind: "core",
      blurb: "A tinted, translucent surface reserved for AI elements.",
    },
    {
      id: "voice-orb",
      label: "Voice orb",
      kind: "supporting",
      blurb: "The glass orb whose light shows who has the floor.",
    },
    {
      id: "spring-motion",
      label: "Spring motion",
      kind: "core",
      blurb: "Physics springs for presses, cards, sheets and dots.",
    },
    {
      id: "draw-in",
      label: "Draw-in diagrams",
      kind: "supporting",
      blurb: "Edges trace themselves and nodes pop in, in reading order.",
    },
    {
      id: "narrated-tour",
      label: "Narrated tour",
      kind: "example",
      blurb: "Spotlights each diagram node while its sentence is spoken.",
    },
    {
      id: "reduced-motion",
      label: "Reduced motion",
      kind: "supporting",
      blurb: "OS and in-app settings that make animation instant.",
    },
    {
      id: "study-split-view",
      label: "Study split view",
      kind: "core",
      blurb: "Reader and tutor rail side by side, linked by page and highlight.",
    },
    {
      id: "concept-orbs",
      label: "Glass concept orbs",
      kind: "supporting",
      blurb: "Concept-map nodes sized by importance and coloured by mastery.",
    },
    {
      id: "mastery-colours",
      label: "Mastery colours",
      kind: "supporting",
      blurb: "Green from 80%, amber from 40%, orange below, grey when untested.",
    },
    {
      id: "self-check-cards",
      label: "Self-check flip cards",
      kind: "example",
      blurb: "Answer in your head first, then flip to reveal.",
    },
  ],
  edges: [
    { from: "obsidian-and-paper", to: "signal-orange", label: "reserves action for" },
    { from: "obsidian-and-paper", to: "aura-light", label: "reserves the AI for" },
    { from: "obsidian-and-paper", to: "paper-tones", label: "switches to for review" },
    { from: "obsidian-and-paper", to: "study-split-view", label: "frames" },
    { from: "aura-light", to: "liquid-glass", label: "tints" },
    { from: "liquid-glass", to: "voice-orb", label: "shapes" },
    { from: "liquid-glass", to: "concept-orbs", label: "gives its sheen to" },
    { from: "dot-matrix", to: "pattern-cards", label: "signs" },
    { from: "spring-motion", to: "dot-matrix", label: "ripples in" },
    { from: "spring-motion", to: "pattern-cards", label: "lifts and presses" },
    { from: "draw-in", to: "narrated-tour", label: "sets the stage for" },
    { from: "signal-orange", to: "narrated-tour", label: "lights the active node in" },
    { from: "reduced-motion", to: "spring-motion", label: "tames" },
    { from: "reduced-motion", to: "draw-in", label: "makes instant" },
    { from: "mastery-colours", to: "concept-orbs", label: "colour" },
    { from: "type-roles", to: "paper-tones", label: "sets Lora on" },
    { from: "self-check-cards", to: "paper-tones", label: "printed on" },
  ],
  sections: [
    section({
      id: "obsidian-and-paper",
      title: "Obsidian & Paper",
      icon: "globe",
      tldr: "A dark obsidian workspace for focus, warm paper for notebooks, one orange for action and violet-blue light for the AI.",
      keyPoints: [
        "Obsidian inks from #050505 to #3a3a43 build the workspace in quiet layers.",
        "Fog greys carry text, from #f4f4f1 for primary copy to #5b5b62 for whispers.",
        "Signal orange #ff6e00 means action: primary buttons, focus rings, the active diagram node.",
        "Aura violet #8b5cf6, blue #3b82f6 and cyan #22d3ee mean the AI is present.",
        "Paper #f7f3ec and its companions turn notebooks into something you want to reread.",
      ],
      explanation:
        "Tutor's palette tells you *what kind of thing* you are looking at before you read a word. The workspace is **obsidian**: near-black surfaces stacked in small steps, so panels separate by depth rather than by heavy borders. Text is **fog**, never pure white, which keeps long sessions easy on the eyes.\n\nColour is rationed. **Signal orange** is the only colour that asks you to act. **Aura light**, in violet, blue and cyan, belongs to the AI alone, so a glow always means the tutor is listening, thinking or speaking. And when it is time to review, the interface changes material entirely: warm **paper**, serif type and a whisper of grain, like a well-kept notebook. Every surface is one of three flavours: dark, glass or paper.",
      diagram: {
        mermaid: `flowchart LR
  A["Obsidian workspace"] --> B["Signal orange: act here"]
  A --> C["Aura light: the AI is here"]
  A --> D["Paper: review and reflect"]
  C --> E["Liquid glass surfaces"]
  D --> F["Serif notebooks"]`,
        caption: "Every colour family has exactly one job.",
      },
      example: {
        title: "The token sheet",
        body: "| Token | Hex | Role |\n| --- | --- | --- |\n| `ink-950` | #050505 | page canvas |\n| `ink-900`, `ink-850` | #0a0a0b, #0f0f11 | panels and the glass base |\n| `ink-700`, `ink-600` | #1c1c21, #26262d | dark buttons and their hover |\n| `ink-500` | #3a3a43 | hairlines and dividers |\n| `fog-50`, `fog-400` | #f4f4f1, #a1a1a6 | primary and secondary text |\n| `signal` | #ff6e00 | action, focus, the active node |\n| `aura-violet`, `aura-blue`, `aura-cyan` | #8b5cf6, #3b82f6, #22d3ee | AI surfaces |\n| `paper`, `paper-ink` | #f7f3ec, #1f1b16 | notebook page and its text |\n| `ok`, `warn`, `bad` | #34d399, #fbbf24, #f87171 | status |",
      },
      callouts: [
        {
          kind: "remember",
          text: "If it glows violet or blue, the AI is involved. If it is orange, you can press it.",
        },
      ],
      selfCheck: [
        {
          q: "What does signal orange mean anywhere in the interface?",
          a: "Action: primary buttons, the keyboard focus ring and the diagram node currently being narrated.",
        },
        {
          q: "Why is body text fog #f4f4f1 rather than pure white?",
          a: "A slightly warm off-white on near-black cuts glare, which keeps long study sessions comfortable.",
        },
      ],
      conceptIds: ["obsidian-and-paper", "signal-orange", "aura-light", "paper-tones"],
    }),
    section({
      id: "typography",
      title: "Typography Roles",
      icon: "code",
      tldr: "Four typefaces, four jobs: Geist Sans for the interface, Space Grotesk for display, Lora for reading and Geist Mono for anything literal.",
      keyPoints: [
        "Geist Sans runs the interface, from weight 300 to 600, tracked a hair tight.",
        "Space Grotesk sets headings at weight 500 with -0.02em tracking.",
        "Lora, the serif, sets notebooks, study guides and diagrams drawn on paper.",
        "Geist Mono handles code, keyboard hints and citation chips.",
        "Chat answers use a generous 1.7 line height for comfortable reading.",
      ],
      explanation:
        "Type does as much work as colour in separating modes. **Geist Sans** is the interface voice: neutral, crisp and set with a touch of negative tracking so labels feel tight and modern. **Space Grotesk** is the display face for headings, with a slightly quirky geometry that gives titles personality without shouting.\n\nOpen Revision and the voice changes. **Lora**, a warm serif made for long reading, takes over: the paper markdown style, study-guide sections and even Mermaid diagrams on paper render in Lora, so a notebook reads like a book rather than a dashboard. **Geist Mono** is reserved for anything literal, such as code, keyboard hints and the small page chips that cite your documents.",
      example: {
        title: "One page, four voices",
        body: '- A notebook title in **Space Grotesk**, weight 500.\n- A button label in **Geist Sans**: "Walk me through".\n- A study-guide paragraph in **Lora**, with *italics* for emphasis.\n- A citation chip in **Geist Mono**: `p.12`.',
      },
      callouts: [
        {
          kind: "tip",
          text: "Reach for Lora whenever the learner should slow down and read, and Geist Sans whenever they should act.",
        },
      ],
      selfCheck: [
        {
          q: "Which typeface sets the study guide, and why?",
          a: "Lora, a serif designed for long reading, so notebooks feel like a book rather than an app screen.",
        },
        {
          q: "Where does Geist Mono appear?",
          a: "In code, keyboard hints and citation chips: anything literal or reference-like.",
        },
      ],
      conceptIds: ["type-roles", "paper-tones"],
    }),
    section({
      id: "dot-matrix-signature",
      title: "The Dot-Matrix Signature",
      icon: "puzzle",
      tldr: "Tall pattern cards with a 5 by 7 dot glyph and a soft bloom are Tutor's signature, in ink, ember and paper themes.",
      keyPoints: [
        "Each glyph sits on a 5 by 7 grid of filled dots and hairline rings.",
        "The bottom two rows fade to 22%, like a reflection.",
        "Dots spring in with a diagonal ripple, 40 ms per step.",
        "Ink is #0a0a0a with white dots; ember is #ff6e00 with white dots.",
        "Paper is #ecebe9 with orange dots, the cover of this very book.",
        "Cards lift 4 px on hover, press to 98% and catch a sweep of light.",
      ],
      explanation:
        "The dot matrix is Tutor's signature mark: a small, precise glyph on a **5 by 7 grid** where each cell is empty, a filled dot scaled between zero and one, or a hairline **ring**. The last two rows fade to 22%, like a reflection on glass. When a card appears, every dot grows from nothing on a soft spring, delayed by its diagonal position, so the glyph **ripples in** from the top-left corner.\n\nPattern cards frame the glyph: tall, generously rounded, with a radial **bloom** in one corner and a band of light that sweeps across on hover. They appear in the intro fan, on notebook covers and on built-in books like this one. Three themes cover every mood: **ink** for depth, **ember** for energy and **paper** for calm.",
      example: {
        title: "Reading a pattern",
        body: "A row written as `0, 0.9, 1, 0.8, -1` reads: empty, a slightly smaller dot, a full dot, a smaller dot again, and a full-size ring. Each dot's radius is at most 43% of its cell, so neighbours never touch and the glyph always has room to breathe.",
      },
      callouts: [
        {
          kind: "remember",
          text: "The glyph is decorative, so it is hidden from screen readers; the card's title carries the meaning.",
        },
      ],
      selfCheck: [
        {
          q: "What does a negative value in a dot pattern mean?",
          a: "A ring, an outlined circle, instead of a filled dot, scaled by the absolute value.",
        },
        {
          q: "Which theme pairs orange dots with a warm grey card?",
          a: "The paper theme: a #ecebe9 background with signal-orange dots.",
        },
      ],
      conceptIds: ["dot-matrix", "pattern-cards", "spring-motion"],
    }),
    section({
      id: "liquid-glass-and-voice-orb",
      title: "Liquid Glass & the Voice Orb",
      icon: "beaker",
      tldr: "Anything the AI is doing sits on liquid glass tinted with violet and blue light, and the voice orb shows its state at a glance.",
      keyPoints: [
        "Liquid glass: violet light top-left, blue bottom-right, over 70% obsidian, 22 px blur.",
        "Plain frosted glass, with no aura tint, is for chrome that isn't AI, like toasts.",
        "Listening: cyan light that swells with your microphone level.",
        "Thinking: violet light that turns slowly while the model works.",
        "Speaking: warm ember light, the one moment signal orange joins the aura, pulsing with the tutor's voice.",
        "When playback ducks for a possible interruption, the orb dims with it.",
      ],
      explanation:
        "**Liquid glass** is how the interface says *the AI is here*. It layers two soft radial lights, violet at 18% from the top-left and blue at 14% from the bottom-right, over obsidian at 70%, then blurs and saturates whatever sits behind. A hairline white border and a faint inner highlight give it an edge, and a deep floating shadow lifts it off the page. Assistant chrome, the voice overlay and AI panels use it; ordinary floating chrome uses plain frosted glass.\n\nThe **voice orb** is liquid glass with a pulse. Its light tells you who has the floor: **cyan** while it listens, **violet** while it thinks, **ember orange** while it speaks. Whenever sound is involved, the orb moves with the real audio level rather than a canned loop.",
      diagram: {
        mermaid: `flowchart LR
  A["Connecting"] --> B["Listening: cyan"]
  B -->|"end of turn"| C["Thinking: violet"]
  C -->|"first phrase"| D["Speaking: ember"]
  D -->|"turn ends"| B
  D -->|"barge-in"| B`,
        caption: "The orb's light always answers one question: who has the floor?",
      },
      callouts: [
        { kind: "tip", text: "Glass tint is a promise. Never put the aura on anything the AI isn't actually doing." },
      ],
      selfCheck: [
        {
          q: "How does liquid glass differ from plain glass?",
          a: "Liquid glass adds violet and blue radial light, stronger blur and saturation, and an inner highlight. Plain glass is untinted frosted obsidian for non-AI chrome.",
        },
        {
          q: "What colour is the orb while the tutor is thinking?",
          a: "Aura violet, turning slowly until the first phrase is ready to speak.",
        },
      ],
      conceptIds: ["liquid-glass", "aura-light", "voice-orb"],
    }),
    section({
      id: "motion-principles",
      title: "Motion Principles",
      icon: "flow",
      tldr: "Motion explains cause and effect: springy presses, diagrams that draw themselves and tours that spotlight one idea at a time.",
      keyPoints: [
        "Presses use a crisp spring: stiffness 420, damping 30, mass 0.7.",
        "Cards, sheets and dots use a softer spring: stiffness 220, damping 26.",
        "Diagram edges draw in over 0.9 s; nodes pop in with a slight overshoot.",
        "During a tour, other nodes dim to 38% and the active node glows orange.",
        "Reduced motion, from the OS or the in-app setting, makes every animation instant.",
      ],
      explanation:
        "Motion in Tutor is never decoration; it shows **what caused what**. Every button **springs** when pressed, a quick squash to 96% on a crisp spring, so taps feel physical. Larger things like cards, modals and dot glyphs travel on a softer spring and arrive with weight instead of snapping.\n\nDiagrams **draw themselves in**: edges trace their paths while nodes pop into place with a gentle overshoot, staggered so your eye follows the flow the way a teacher draws on a board. Press *Walk me through* and the diagram becomes a **narrated tour**: every other node dims, the current one lights up in signal orange, and the view eases toward it as its sentence is spoken. With motion turned down, all of this becomes instant; the meaning stays, only the movement goes.",
      diagram: {
        mermaid: `flowchart LR
  A["Diagram rendered"] --> B["Edges draw in"]
  B --> C["Nodes pop in"]
  C --> D["Walk me through"]
  D --> E["Spotlight one node"]
  E --> F["Speak its sentence"]
  F -->|"next step"| E`,
        caption: "A diagram's life: draw in, then tour it one node at a time.",
      },
      callouts: [
        {
          kind: "remember",
          text: "Motion respects the learner: the OS reduced-motion preference and Tutor's own motion setting both switch it off.",
        },
      ],
      selfCheck: [
        {
          q: "What happens to the other nodes during a narrated tour?",
          a: "They dim to 38% opacity, so the active node, stroked in signal orange with a soft glow, stands out.",
        },
        {
          q: "Which two settings can turn motion down?",
          a: "The operating system's reduced-motion preference and Tutor's own motion setting.",
        },
      ],
      conceptIds: ["spring-motion", "draw-in", "narrated-tour", "reduced-motion"],
    }),
    section({
      id: "layout",
      title: "Layout: Reader, Rail and Stage",
      icon: "layers",
      tldr: "On desktop the reader and the tutor rail sit side by side, on phones the conversation comes first, and voice mode opens a visual stage.",
      keyPoints: [
        "The study view splits into the PDF reader and a tutor rail.",
        "Citation chips in the rail jump the reader to the cited page.",
        "On phones the chat comes first, and the reader is one tap away.",
        "Dialogs become bottom sheets on small screens, rising on a soft spring.",
        "Voice mode opens a dark visual stage for diagrams, images and notes.",
        "Captions show the tutor's current phrase and your own words as you speak.",
      ],
      explanation:
        "The **study split view** is the heart of the product: your document on one side, the tutor rail on the other. The two are wired together. The rail always knows which page is open and what you highlighted, and every citation chip in an answer scrolls the reader to its page. Long answers render on a light, high-contrast reading surface with a relaxed line height.\n\nOn a phone, the conversation comes **first**; the reader is a tap away, and dialogs rise from the bottom as sheets within reach of a thumb. Voice mode takes the whole screen: a dark **visual stage** shows diagrams, images and notes as background work finishes, with **captions** that follow each spoken phrase and your own words as you say them.",
      example: {
        title: "Three arrangements",
        body: '- **Desktop**: reader and tutor rail side by side, linked by the open page and your highlight.\n- **Phone**: the conversation fills the screen, and the reader opens as its own view.\n- **Voice**: a full-screen dark stage with the orb, live captions and small status chips for background tasks such as "Drawing a diagram".',
      },
      callouts: [
        { kind: "tip", text: "Highlight text in the reader, then ask. The rail picks up the selection automatically." },
      ],
      selfCheck: [
        {
          q: "How does the tutor rail know what you are reading?",
          a: "The reader shares the open page and any highlighted passage, and both go into the context packet for every turn.",
        },
        {
          q: "What appears on the voice stage?",
          a: "Diagrams, images and markdown notes from background work, together with the orb, captions and task status chips.",
        },
      ],
      conceptIds: ["study-split-view", "voice-orb", "narrated-tour"],
    }),
    section({
      id: "study-guide-anatomy",
      title: "Anatomy of a Study Guide",
      icon: "book",
      tldr: "Each notebook's guide is a paper book: hero summary, a concept map of glass orbs, section cards, callouts and self-check flip cards.",
      keyPoints: [
        "The hero opens with the title, a short summary and learning goals.",
        "The concept map shows ideas as glass orbs coloured by your mastery.",
        "Section cards carry an icon, a one-line tldr, key points and a serif explanation.",
        "Diagrams on paper use cream nodes, tan borders and Lora labels.",
        "Callouts come in three kinds: tip, warning and remember.",
        "Self-check questions are flip cards and also become spaced-repetition flashcards.",
      ],
      explanation:
        "A study guide reads top to bottom like a well-made chapter. The **hero** states the big picture and your goals. The **concept map** follows: every concept is a glass orb, sized by importance (core, supporting or example) and coloured by mastery, green from 80%, amber from 40%, orange below that, and soft grey until you have been tested. Labelled links show how ideas depend on each other.\n\nThen come **section cards** on paper: an icon and a one-sentence *tldr*, crisp key points, an explanation in Lora, an optional diagram and worked example, and **callouts**. Each section ends with **self-check flip cards**: answer first, then tap to reveal. A glossary, common misconceptions set against the truth, and next steps close the book.",
      diagram: {
        mermaid: `flowchart TD
  A["Hero: title, summary and goals"] --> B["Concept map of glass orbs"]
  B --> C["Section cards"]
  C --> D["Key points and explanation"]
  C --> E["Diagram and example"]
  C --> F["Callouts"]
  C --> G["Self-check flip cards"]
  G --> H["Glossary, misconceptions, next steps"]`,
        caption: "From big picture to active recall, in reading order.",
      },
      callouts: [
        {
          kind: "remember",
          text: "Self-check answers stay hidden until you flip the card. Retrieval before reveal is what makes it stick.",
        },
      ],
      selfCheck: [
        {
          q: "What does an orb's colour in the concept map tell you?",
          a: "Your mastery of that concept: green from 80%, amber from 40%, orange below that, and grey when it has not been assessed.",
        },
        {
          q: "Where do self-check questions go after the guide updates?",
          a: "They are mirrored into the learner model as flashcards and scheduled with SM-2.",
        },
      ],
      conceptIds: ["concept-orbs", "mastery-colours", "self-check-cards", "paper-tones"],
    }),
    section({
      id: "accessibility",
      title: "Accessibility Rules",
      icon: "idea",
      tldr: "Beauty never costs access: visible focus, labelled controls, captions for every spoken word and motion that follows your settings.",
      keyPoints: [
        "Every focused element shows a 2 px signal-orange ring with a 2 px offset.",
        "Icon-only buttons always carry an accessible label and a matching tooltip.",
        "Dialogs are labelled, marked modal and close with Escape.",
        'Mastery rings announce their value, such as "Mastery 72%", not colour alone.',
        "Decorative glyphs and blooms are hidden from screen readers.",
        "Speech is always captioned, and reduced motion is always honoured.",
      ],
      explanation:
        "Tutor's visual ambition comes with firm rules. **Focus is always visible**: a two-pixel signal-orange outline appears on keyboard focus, so you never lose your place. **Controls are named**: every icon button has an accessible label and a matching tooltip, and toasts announce themselves as status messages.\n\n**Colour is never the only signal.** Mastery rings expose their percentage to screen readers, and states always pair colour with text or an icon. **Dialogs behave**: they are marked modal, labelled by their title and close with Escape. **Voice is captioned**, so everything the tutor says can also be read. **Motion is optional**: the OS reduced-motion preference and the in-app setting both make animation near-instant. Decorative art, like the dot matrix, is hidden from assistive technology.",
      callouts: [
        {
          kind: "warning",
          text: "Never convey mastery, status or AI state by colour alone; pair it with text, an icon or an accessible label.",
        },
      ],
      selfCheck: [
        {
          q: "How does a screen-reader user learn their mastery of a concept?",
          a: 'The mastery ring has an accessible label with the percentage, or "Not assessed yet".',
        },
        {
          q: "What does the focus ring look like?",
          a: "A two-pixel signal-orange outline with a two-pixel offset, shown on keyboard focus.",
        },
      ],
      conceptIds: ["reduced-motion", "mastery-colours", "signal-orange"],
    }),
  ],
  glossary: [
    {
      term: "Obsidian",
      definition: "The family of near-black ink tokens, #050505 to #3a3a43, that build the workspace.",
    },
    { term: "Fog", definition: "The off-white to grey text tokens, from #f4f4f1 down to #5b5b62." },
    {
      term: "Signal orange",
      definition: "#ff6e00, the single action colour for buttons, focus rings and highlighted nodes.",
    },
    { term: "Aura", definition: "Violet, blue and cyan light reserved for surfaces where the AI is active." },
    { term: "Liquid glass", definition: "A blurred, violet-and-blue tinted translucent surface for AI elements." },
    { term: "Paper", definition: "The warm #f7f3ec surface with subtle grain, used for notebooks and study guides." },
    { term: "Dot matrix", definition: "The 5 by 7 glyph of dots and rings that signs every pattern card." },
    {
      term: "Pattern card",
      definition: "A tall, rounded card with a dot-matrix glyph and a soft bloom, in ink, ember or paper.",
    },
    {
      term: "Spring",
      definition: "Physics-based easing defined by stiffness and damping instead of a fixed duration.",
    },
    { term: "Draw-in", definition: "The animation in which diagram edges trace themselves and nodes pop into place." },
    {
      term: "Narrated tour",
      definition: "A diagram walk-through that spotlights each node while its explanation is spoken.",
    },
    { term: "Tutor rail", definition: "The conversation column beside the PDF reader in the study split view." },
    {
      term: "Visual stage",
      definition: "The dark full-screen canvas in voice mode where diagrams, images and notes appear.",
    },
    {
      term: "Self-check card",
      definition: "A question card you answer in your head first, then flip to reveal the answer.",
    },
  ],
  misconceptions: [
    {
      wrong: "More colour makes an interface feel more premium.",
      right:
        "Tutor rations colour: orange only for action and aura light only for the AI, so every colour carries meaning.",
    },
    {
      wrong: "Glass effects are just decoration.",
      right: "Liquid glass signals AI activity, while plain frosted glass marks ordinary floating chrome.",
    },
    {
      wrong: "Animations should play no matter what.",
      right: "The OS reduced-motion preference and the in-app motion setting both make motion near-instant.",
    },
    {
      wrong: "The notebook is just the dark app with lighter colours.",
      right:
        "Notebooks switch material entirely: paper texture, Lora serif type and paper-themed diagrams invite slower reading.",
    },
    {
      wrong: "Mastery colours alone are enough to show progress.",
      right: "Colour is always paired with a percentage or a label, so progress is readable without seeing colour.",
    },
  ],
  nextSteps: [
    "Compare the ink cover of How Tutor Works with the paper cover of this book.",
    "Start a voice session and watch the orb move between listening, thinking and speaking.",
    "Press Walk me through on any diagram to see draw-in and a narrated tour.",
  ],
  messagesCovered: 0,
};

export const BUILTIN_BOOKS: BuiltinBook[] = [
  {
    id: "builtin:how-tutor-works",
    title: "How Tutor Works",
    subtitle: "The architecture behind every answer, from PDF ingestion to duplex voice and AWS.",
    theme: "ink",
    pattern: 0,
    guide: HOW_TUTOR_WORKS,
  },
  {
    id: "builtin:design-language",
    title: "Design Language",
    subtitle: "Obsidian & Paper: the colours, type, glass and motion that make Tutor feel like Tutor.",
    theme: "paper",
    pattern: 2,
    guide: DESIGN_LANGUAGE,
  },
];
