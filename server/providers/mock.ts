/**
 * Offline providers for development and automated tests. They speak the same
 * interfaces (and stream with realistic pacing) so every code path — tool
 * rounds, JSON synthesis, voice turns, barge-in — is exercised without keys.
 * Selected with LLM_PROVIDER=mock / SPEECH_PROVIDER=mock, or automatically
 * when no API key is configured.
 */
import { PriorityLimiter, Priority } from "../lib/limiter.js";
import { metrics } from "../lib/metrics.js";
import type { SpeechProvider, SttEvent } from "./deepgram.js";
import { LlmError, collect, type LlmProvider, type LlmRequest, type ModelRole, type StreamEvent } from "./llm.js";

const delay = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    if (signal?.aborted) return reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(Object.assign(new Error("Aborted"), { name: "AbortError" }));
      },
      { once: true },
    );
  });

const lastUser = (request: LlmRequest) => {
  for (let i = request.messages.length - 1; i >= 0; i -= 1) {
    const message = request.messages[i];
    if (message.role === "user") {
      return typeof message.content === "string"
        ? message.content
        : message.content.map((part) => (part.type === "text" ? part.text : "")).join(" ");
    }
  }
  return "";
};

const system = (request: LlmRequest) =>
  request.messages[0]?.role === "system" ? String(request.messages[0].content) : "";
const hasToolResult = (request: LlmRequest) => request.messages.some((message) => message.role === "tool");

function firstPassage(request: LlmRequest) {
  const match = system(request).match(/<(?:page|passage) ref="(D\d+ p\.\d+)">\n([\s\S]*?)\n<\/(?:page|passage)>/);
  return match ? { ref: match[1], text: match[2].replace(/\s+/g, " ").slice(0, 220) } : null;
}

type Script = { text?: string; reasoning?: string; tools?: Array<{ name: string; args: Record<string, unknown> }> };

function scriptFor(request: LlmRequest): Script {
  const purpose = request.purpose ?? "";
  const question = lastUser(request);
  const q = question.toLowerCase();

  if (purpose === "title") return { text: JSON.stringify({ title: "Mock Study Topic" }) };
  if (purpose === "ocr") return { text: "Mock OCR transcription of a scanned page." };
  if (purpose === "quiz.grade") {
    const parsed = safeJson(question);
    const good =
      parsed &&
      String(parsed.learner ?? "")
        .toLowerCase()
        .includes(
          String(parsed.reference ?? "")
            .toLowerCase()
            .split(" ")[0] ?? "",
        );
    return { text: JSON.stringify({ score: good ? 1 : 0.3, feedback: good ? "Nicely put." : "Partly there." }) };
  }
  if (purpose === "diagram.tour") {
    const ids = [...question.matchAll(/\b([A-Z])\[/g)].map((m) => m[1]);
    return { text: JSON.stringify({ steps: ids.map((id) => ({ node: id, say: `This is step ${id}.` })) }) };
  }
  if (purpose === "guide.consolidate") return { text: question };
  if (purpose === "guide.sync") {
    const topic = (question.match(/Learner(?: \(voice\))?: ([^\n]{3,80})/)?.[1] ?? "Core idea").replace(/[?.!]+$/, "");
    return {
      text: JSON.stringify({
        ops: [
          {
            op: "set_overview",
            title: "Mock Study Guide",
            summary: `Notes on ${topic}.`,
            goals: ["Understand the core idea"],
          },
          {
            op: "upsert_section",
            title: topic.slice(0, 60),
            icon: "idea",
            format: "science",
            objective: `Explain ${topic} and work out a rate from two numbers`,
            tldr: `A plain summary of ${topic}.`,
            keyPoints: [`Key point about ${topic}`, "A second key point"],
            explanation: `**${topic}** explained briefly.\n\nA rate tells you how much changes in each unit of time.`,
            terms: [
              { term: "Rate", definition: "How much something changes in one unit of time." },
              { term: "Core idea", definition: "The main concept of this section." },
            ],
            formulas: [
              {
                name: "Rate",
                latex: "r = \\frac{\\Delta x}{\\Delta t}",
                symbols: [
                  { symbol: "r", meaning: "the rate" },
                  { symbol: "\\Delta x", meaning: "how much the amount changed" },
                  { symbol: "\\Delta t", meaning: "how long the change took, in seconds" },
                ],
              },
            ],
            worked: {
              problem: "A tank fills from 20 L to 80 L in 30 seconds. What is the rate?",
              steps: [
                { label: "Find the change in amount", work: "$\\Delta x = 80 - 20 = 60$ L" },
                { label: "Find the time taken", work: "$\\Delta t = 30$ s" },
                { label: "Divide the change by the time", work: "$r = \\frac{60}{30} = 2$ L/s" },
              ],
              answer: "2 litres per second",
            },
            diagram: { mermaid: "flowchart LR\n  A[Question] --> B[Answer]", caption: "From question to answer" },
            callouts: [{ kind: "tip", text: "Review this tomorrow." }],
            mistakes: [
              { wrong: "Divide the time by the change", right: "Divide the change by the time: litres per second." },
            ],
            selfCheck: [
              { q: `What is ${topic}?`, a: "The core idea." },
              { q: "A tank gains 10 L in 5 s. What is the rate?", a: "10 divided by 5 is 2 litres per second." },
            ],
            concepts: ["Core idea"],
            pages: [{ doc: "D1", page: 1 }],
          },
          {
            op: "add_concepts",
            concepts: [
              { name: "Core idea", kind: "core", blurb: "The main concept." },
              { name: "Detail", kind: "supporting", blurb: "A supporting detail." },
            ],
            links: [{ from: "Detail", to: "Core idea", label: "supports" }],
          },
          { op: "add_glossary", items: [{ term: "Core idea", definition: "The main concept." }] },
          { op: "set_next_steps", items: ["Try the self-check questions."] },
        ],
      }),
    };
  }
  if (purpose === "voice.bg") {
    return {
      text: JSON.stringify({
        speech: "Okay, here it is. I've drawn the process on screen.",
        display: "",
        diagram: {
          title: "Mock process",
          mermaid: "flowchart LR\n  A[Start] --> B[Middle] --> C[End]",
          steps: [
            { node: "A", say: "We begin at the start." },
            { node: "B", say: "Then the middle step does the work." },
            { node: "C", say: "And we finish at the end." },
          ],
        },
        image_query: null,
      }),
    };
  }
  if (purpose === "voice.board") {
    return {
      text: JSON.stringify({
        title: "Solving a quadratic",
        speech: "Let's solve it together on the board.",
        items: [
          { latex: "x^2 - 5x + 6 = 0", say: "Here's our equation.", note: "start" },
          {
            text: "Two numbers: product 6, sum -5",
            say: "We need two numbers that multiply to six and add to minus five.",
          },
          { latex: "(x - 2)(x - 3) = 0", say: "Minus two and minus three work, so it factors like this." },
          {
            plot: {
              fns: ["x^2 - 5*x + 6"],
              xMin: -1,
              xMax: 6,
              points: [
                { x: 2, y: 0, label: "x = 2" },
                { x: 3, y: 0, label: "x = 3" },
              ],
            },
            say: "On the graph, the curve crosses zero at two and three.",
          },
          { latex: "x = 2 \\text{ or } x = 3", say: "So x is two or three.", box: true },
        ],
      }),
    };
  }
  if (purpose === "voice.read") {
    // Quotes lightly paraphrased (case, punctuation) the way real models do; the server snaps them to the page.
    return {
      text: JSON.stringify({
        doc: "D1",
        page: 2,
        speech: "Let's read this page together.",
        highlights: [
          {
            quote: "the light dependent reactions happen in the thylakoid membranes",
            say: "First, where it happens: the thylakoid membranes.",
            note: "where",
          },
          {
            quote: "Water molecules are split in a process called photolysis",
            say: "Then water is split. That's photolysis.",
          },
          { quote: "a sentence that is not on this page at all", say: "This one should be dropped." },
        ],
      }),
    };
  }
  if (purpose === "voice.build") {
    if (/impossible/i.test(question)) return { text: "{}" };
    if (/website|web page|landing|app\b/i.test(question)) {
      return {
        text: JSON.stringify({
          type: "web",
          title: "Mock landing page",
          speech: "Here's your page. It's live, so try the button.",
          html: "<!doctype html><html><head><title>Mock landing page</title><style>body{font-family:system-ui;margin:0;display:grid;place-items:center;min-height:100vh;background:#0b0b0d;color:#f4f4f1}button{background:#ff6e00;color:#fff;border:0;border-radius:999px;padding:12px 20px}</style></head><body><main><h1>Hello from Tutor</h1><button onclick=\"this.textContent='Clicked'\">Try me</button></main></body></html>",
        }),
      };
    }
    return {
      text: JSON.stringify({
        type: "scene",
        title: "Mock solar system",
        speech: "Here's a little solar system. Spin it around and tap a planet.",
        scene: {
          mood: "space",
          camera: { position: [0, 8, 18], target: [0, 0, 0] },
          objects: [
            { id: "sun", shape: "sphere", label: "Sun", info: "A star.", size: 2, color: "#ffb347", glow: true },
            {
              id: "earth",
              shape: "sphere",
              label: "Earth",
              info: "Our home.",
              size: 0.6,
              color: "#3b82f6",
              orbit: { center: "sun", radius: 7, speed: 6 },
            },
            { id: "orbit", shape: "ring", size: 7, color: "#ffffff", opacity: 0.2, rotation: [90, 0, 0] },
          ],
        },
        steps: [
          { focus: "sun", say: "In the middle is the Sun." },
          { focus: "earth", say: "And this is Earth, going around it." },
        ],
      }),
    };
  }
  if (purpose === "voice.fg") {
    // The voice model requests side work with silent inline tags (server/voice/actions.ts).
    if (/\b(?:close it|clear the screen)\b/.test(q)) return { text: "Okay, cleared. [[close]]" };
    if (/\bin my notes\b/.test(q)) {
      return {
        text: "Look at this line. [[page: D1 p.2 | water molecules are split in a process called photolysis]] That's where oxygen comes from. [[page: D1 p.2 | The energy of the excited electrons is used to make ATP and NADPH]] And this is where the energy goes.",
      };
    }
    if (/\b(?:solve|equation|formula|whiteboard)\b/.test(q)) {
      // Real models sometimes keep talking after the tag; the session must cut that off.
      return { text: `Let me grab my pen. [[board: ${question}]] So the answer is two or three.` };
    }
    if (/\b(?:build|3d|website|model of)\b/.test(q)) {
      return { text: `Let me build that for you. [[build: ${question}]]` };
    }
    if (/diagram|flowchart|draw|sketch|research|in depth/.test(q)) {
      return { text: `Let me sketch that out for you. [[deep diagram: ${question}]]` };
    }
    if (/\b(image|picture|photo)s?\b/.test(q)) {
      return { text: `Here's what it looks like. [[images: ${question.slice(0, 60)}]]` };
    }
    if (/background result|result is ready/i.test(question))
      return { text: "Okay, it's ready. Take a look at the screen." };
    const passage = firstPassage(request);
    return {
      text: passage
        ? `From your document, ${passage.text.split(". ")[0]}. Want me to go deeper?`
        : `Here's a quick answer about ${question.slice(0, 60)}. It works step by step. Does that make sense?`,
    };
  }

  // Default: typed chat.
  if (!hasToolResult(request)) {
    if (/\b(image|picture|photo|show me)\b/.test(q))
      return {
        reasoning: "Pictures would help.",
        tools: [{ name: "show_images", args: { query: question.slice(0, 60) } }],
      };
    if (/\bquiz|test me\b/.test(q)) {
      return {
        tools: [
          {
            name: "create_quiz",
            args: {
              concept: "Core idea",
              question: "Which option is correct?",
              options: ["Right", "Wrong", "Also wrong"],
              answer_index: 0,
              answer: "Right",
              explanation: "Because it is the right one.",
            },
          },
        ],
      };
    }
    if (/\bflashcards?\b/.test(q))
      return {
        tools: [
          {
            name: "make_flashcards",
            args: { cards: [{ front: "What is X?", back: "X is Y.", concept: "Core idea" }] },
          },
        ],
      };
    if (/\b(search the web|latest|news)\b/.test(q))
      return { tools: [{ name: "web_search", args: { query: question.slice(0, 80) } }] };
  }
  const passage = firstPassage(request);
  const diagram = /diagram|flow|process|how does/.test(q)
    ? "\n\n```mermaid\nflowchart TD\n  A[Input] --> B[Process]\n  B --> C[Output]\n```\n\nFirst the **input** arrives, then it is **processed**, and finally we get the **output**."
    : "";
  return {
    reasoning: "Let me look at the relevant passage and explain it simply.",
    text: passage
      ? `Here's the key idea: ${passage.text} [${passage.ref}]${diagram}\n\nDoes that make sense?`
      : `Great question. In short, **${question.slice(0, 80)}** comes down to a few ideas.${diagram}\n\nWant an example?`,
  };
}

function safeJson(text: string): Record<string, unknown> | null {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function createMockLlm(options: { tokenDelayMs?: number } = {}): LlmProvider {
  const tokenDelay = options.tokenDelayMs ?? Number(process.env.MOCK_LLM_DELAY_MS ?? 8);
  const models: Record<ModelRole, string> = { fast: "mock-fast", smart: "mock-smart", vision: "mock-vision" };
  const limiter = new PriorityLimiter("mock", 8);
  return {
    name: "mock",
    modelFor: (role) => models[role],
    stats: () => ({ provider: "mock", limiters: [limiter.stats()] }),
    complete(request) {
      return collect(this.stream(request));
    },
    async *stream(request): AsyncGenerator<StreamEvent> {
      const release = await limiter.acquire(request.priority ?? Priority.interactive, request.signal);
      const started = Date.now();
      let firstToken = 0;
      try {
        const script = scriptFor(request);
        await delay(tokenDelay * 4, request.signal);
        if (script.reasoning && request.reasoning !== "off") {
          for (const word of script.reasoning.split(/(?<= )/)) {
            await delay(tokenDelay, request.signal);
            yield { type: "reasoning", delta: word };
          }
        }
        for (const piece of (script.text ?? "").match(/[\s\S]{1,6}/g) ?? []) {
          await delay(tokenDelay, request.signal);
          if (!firstToken) firstToken = Date.now();
          yield { type: "text", delta: piece };
        }
        for (const [index, tool] of (script.tools ?? []).entries()) {
          if (!request.tools?.some((definition) => definition.name === tool.name)) continue;
          yield {
            type: "tool_call",
            call: { id: `mock_call_${index}`, name: tool.name, arguments: JSON.stringify(tool.args) },
          };
        }
        const outputTokens = Math.ceil(((script.text ?? "").length + (script.reasoning ?? "").length) / 4);
        yield {
          type: "done",
          finishReason: script.tools?.length ? "tool_calls" : "stop",
          usage: { inputTokens: 100, outputTokens },
          model: models[request.role],
        };
      } catch (error) {
        if ((error as Error)?.name === "AbortError" || request.signal?.aborted)
          throw new LlmError("Request aborted", "aborted");
        throw error;
      } finally {
        release();
        metrics.recordLlmCall({
          model: models[request.role],
          role: request.role,
          purpose: request.purpose ?? "unspecified",
          userId: request.userId,
          ms: Date.now() - started,
          ttftMs: firstToken ? firstToken - started : null,
          inputTokens: 100,
          outputTokens: 50,
          ok: true,
        });
      }
    },
  };
}

/**
 * Mock speech: STT is driven by `injectTranscript` (tests) and TTS returns
 * silent PCM whose length tracks the text, paced like real synthesis.
 */
export function createMockSpeech(): SpeechProvider & { lastSession?: { emit: (event: SttEvent) => void } } {
  const provider: SpeechProvider & { lastSession?: { emit: (event: SttEvent) => void } } = {
    name: "mock",
    available: true,
    openStt({ onEvent }) {
      provider.lastSession = { emit: onEvent };
      return { sendAudio() {}, close() {} };
    },
    async *synthesize(text, { sampleRate, signal }) {
      const seconds = Math.min(8, 0.06 * text.split(/\s+/).length + 0.1);
      const total = Math.floor(seconds * sampleRate) * 2;
      const chunk = Math.floor(sampleRate * 0.1) * 2;
      for (let offset = 0; offset < total; offset += chunk) {
        await delay(5, signal);
        yield Buffer.alloc(Math.min(chunk, total - offset));
      }
    },
  };
  return provider;
}
