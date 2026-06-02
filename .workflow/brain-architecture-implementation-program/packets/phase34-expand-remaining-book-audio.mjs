import { readFileSync, writeFileSync } from "node:fs";

const manifestPath = "src/lib/chapterAudioOverviews.json";
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));

const TARGET_MIN_CHARS = 3300;

const makeExpansion = ({ intro, points, closing }) =>
  [
    intro,
    ...points.map(
      (point, index) => `Part ${index + 1}: ${point.title}. ${point.detail}`,
    ),
    closing,
  ].join(" ");

const tutorSharedClosing =
  "The practical takeaway is simple: the app is strongest when the reader, tutor, local memory, Admin, and Graphify each do one clear job. The learner should feel one coherent tutor, while the implementation keeps enough records for a developer to inspect what happened later.";

const appDesignSharedClosing =
  "The practical takeaway is that visual design is part of the learning system, not decoration. The interface should help the learner understand where they are, what changed, what can be reviewed, and which controls affect the next local beta run.";

const expansions = {
  "tutor-book": {
    0: {
      label: "about 3 min 45 sec",
      text: makeExpansion({
        intro:
          "This opening chapter is a map for reading the system book without getting buried in implementation details. In simple terms, the Tutor app has a foreground learning experience, a local memory layer, a server layer that talks to models and tools, and a maintenance layer that helps developers understand the code safely.",
        points: [
          {
            title: "Read from the user outward",
            detail:
              "Start with what the learner sees: Study, Chat, Revision, Analytics, and Admin. Then move inward to the data that supports those screens. That order keeps the book practical because every technical part is tied to something visible in the product.",
          },
          {
            title: "Separate live teaching from durable memory",
            detail:
              "A chat answer can adapt quickly, but a stored learning record needs a stronger trail. The book keeps returning to that distinction because it protects the learner from hidden memory changes and protects the builder from guessing what the system did.",
          },
          {
            title: "Use the built-in books as operating manuals",
            detail:
              "Tutor System Architecture explains how the app is assembled. User Brain Architecture explains how learning state should become trustworthy. App Design Language explains how the interface should feel and behave. Together they are not marketing pages; they are local beta manuals.",
          },
          {
            title: "Use audio as a guide, not as proof",
            detail:
              "The stored chapter audio is a friendly explanation of each chapter. It is checked in as a local MP3 so playback is fast, but it does not replace the source text, tests, or Admin evidence. If something matters, verify it in the app or the ledger.",
          },
          {
            title: "Keep cloud work out of the first pass",
            detail:
              "This book is written for local beta. It explains local storage, local verification, local diagnostics, and local playback. AWS, tenant isolation, and production deployment can come later after the local loop is proven with real use.",
          },
          {
            title: "Let Graphify steer code work",
            detail:
              "When changing the repository, agents should use Graphify before large file reads. That keeps architecture navigation focused and helps avoid accidental edits in unrelated areas.",
          },
        ],
        closing: tutorSharedClosing,
      }),
    },
    1: {
      label: "about 3 min 50 sec",
      text: makeExpansion({
        intro:
          "The product map chapter explains the app as a learning workspace instead of a pile of features. The main idea is that the learner can read, ask, save, review, and inspect, all inside one local-first study loop.",
        points: [
          {
            title: "Study is the entry point",
            detail:
              "Study is where a learner brings in a document, sees the reader, selects text, and starts asking grounded questions. It should feel like the desk where the learning session begins, not like a separate upload utility.",
          },
          {
            title: "Chat is the live tutor",
            detail:
              "Chat turns the current document, selection, memory, and user message into a streamed tutoring response. The important product behavior is that the tutor should explain clearly while preserving enough context for later memory writes.",
          },
          {
            title: "Revision is the reusable notebook",
            detail:
              "Revision is where temporary conversation turns become durable study material. It holds built-in architecture books, generated learning books, flashcards, and stored audio guides, so the learner can return later without replaying the whole chat.",
          },
          {
            title: "Analytics summarizes learning progress",
            detail:
              "Analytics is not the tutor itself. It reads local records and turns them into progress signals: mastery, confidence, study activity, and review state. It helps the learner and builder see whether the system is producing useful learning traces.",
          },
          {
            title: "Admin explains the machinery",
            detail:
              "Admin is the behind-the-scenes surface. It shows model runs, tool jobs, retrieval events, memory writes, voice events, artifact checks, corrections, and beta diagnostics. If the system makes a durable claim, Admin should help inspect it.",
          },
          {
            title: "The map stays local first",
            detail:
              "The product can use model providers and voice services, but the current architecture should prove the local learning loop before moving responsibility to cloud infrastructure. That keeps beta testing concrete and debuggable.",
          },
        ],
        closing: tutorSharedClosing,
      }),
    },
    2: {
      label: "about 3 min 55 sec",
      text: makeExpansion({
        intro:
          "This chapter translates the engineering stack into plain English. The goal is not to memorize library names. The goal is to understand which tool owns which part of the learner experience.",
        points: [
          {
            title: "React builds the surfaces",
            detail:
              "React is the screen builder. It lets the app split Study, Chat, Revision, Admin, controls, panels, and cards into reusable pieces. When a learner clicks or changes state, React is what redraws the correct interface.",
          },
          {
            title: "Zustand holds live UI state",
            detail:
              "Zustand is the small shared store for things like the active view, selected document, chat state, and settings. It is useful for live behavior, but it is not the durable learner brain by itself.",
          },
          {
            title: "Dexie stores durable local records",
            detail:
              "Dexie wraps IndexedDB, the browser database. This is where local concepts, learning books, flashcards, evidence rows, model runs, tool jobs, retrieval events, corrections, and artifact records can survive beyond one screen refresh.",
          },
          {
            title: "Express owns server routes",
            detail:
              "The Express server receives browser requests for chat, documents, search, trace explanations, voice, title generation, pricing, and debug activity. It is the bridge between the local app and external providers.",
          },
          {
            title: "Provider SDKs do specific jobs",
            detail:
              "OpenRouter-compatible model calls produce tutor answers and learning-book updates. Deepgram handles voice and stored speech generation. Serper handles explicit live web search. Each provider should be visible through saved records when it matters.",
          },
          {
            title: "Graphify helps maintainers navigate",
            detail:
              "Graphify is not the learner brain. It is the code architecture graph for agents and developers. It helps identify connected files before edits, which reduces broad repository reads and lowers the chance of touching the wrong surface.",
          },
        ],
        closing: tutorSharedClosing,
      }),
    },
    3: {
      label: "about 4 min",
      text: makeExpansion({
        intro:
          "The frontend flow chapter explains how a route becomes an experience. In simple terms, the app decides which main surface is active, renders that surface, and keeps motion and layout consistent around it.",
        points: [
          {
            title: "App chooses the active screen",
            detail:
              "The top-level app reads the active view from the store and chooses Study, Analytics, Revision, or Admin. That means navigation is not just a link; it is a state change that controls which major learning surface is visible.",
          },
          {
            title: "Study carries the reading workspace",
            detail:
              "Study has the document reader, file controls, and the live tutor panel nearby. It needs to keep the reader and chat connected because selected text, pages, and document state can shape the next answer.",
          },
          {
            title: "Revision has a different mood",
            detail:
              "Revision uses a calmer paper-style reader because it is for review and saved knowledge. The same app can be dark and cinematic in Study, then book-like in Revision, as long as the route transition feels intentional.",
          },
          {
            title: "Admin is dense on purpose",
            detail:
              "Admin is not meant to be a playful study surface. It is an operational dashboard, so it needs tabs, meters, filters, rows, and explicit state labels. Its job is to make hidden system activity inspectable.",
          },
          {
            title: "Motion should clarify state",
            detail:
              "Animation is useful when it helps the learner understand a transition, a selected control, or a live AI state. It should not hide latency, cover errors, or make dense information harder to scan.",
          },
          {
            title: "Responsive behavior is part of correctness",
            detail:
              "A book card, audio guide, PDF chip, and Admin table all need to fit on mobile and desktop. Browser QA matters because a build can pass while a real layout still clips or overflows.",
          },
        ],
        closing: tutorSharedClosing,
      }),
    },
    4: {
      label: "about 3 min 55 sec",
      text: makeExpansion({
        intro:
          "Study and document ingestion are where source material enters the learning loop. The simple promise is this: when a learner uploads a paper or textbook, the app should preserve enough local context for useful tutoring and later review.",
        points: [
          {
            title: "The reader creates visible context",
            detail:
              "A PDF or image is not just a file sitting in storage. It becomes pages, selections, highlights, and visible reading state. That visible state helps the tutor answer questions about what the learner is actually studying.",
          },
          {
            title: "Extraction creates machine context",
            detail:
              "Document ingestion can classify a file, extract text, and prepare metadata that the tutor and memory layer can use. The extracted text is not magic; it is a local source that must be handled carefully and checked when used for durable claims.",
          },
          {
            title: "Selection should matter",
            detail:
              "If the learner highlights a sentence or asks about a page, the tutor should prefer that local material before reaching for broad model knowledge or web search. That is the basic source-first behavior for a study app.",
          },
          {
            title: "Multiple documents need clear UI",
            detail:
              "When more than one document is present, the app needs compact controls that show which file is active and let the learner switch or remove documents without losing the shape of the study session.",
          },
          {
            title: "Ingestion failures need honest feedback",
            detail:
              "If extraction fails, the app should say what failed and keep the learner in a recoverable state. A failed extraction should not quietly create confident memory rows or pretend the source text exists.",
          },
          {
            title: "Stored context feeds later memory",
            detail:
              "Good ingestion is important because later learning-book entries, source-span anchors, retrieval events, and citation checks all depend on having coherent local source context to reference.",
          },
        ],
        closing: tutorSharedClosing,
      }),
    },
    5: {
      label: "about 3 min 40 sec",
      text: makeExpansion({
        intro:
          "Chat and tutor tools are the live teaching loop. The learner sends a message, the app gathers context, the server streams an answer, tools may run, and the memory layer can save useful learning traces afterward.",
        points: [
          {
            title: "The message is not alone",
            detail:
              "A good tutor request includes the user message plus the active document, selected text, current book, runtime settings, and relevant local memory. The model should not have to guess the learning situation from one sentence.",
          },
          {
            title: "Streaming keeps the lesson alive",
            detail:
              "Server-sent events let the answer arrive piece by piece. That makes the tutor feel responsive, but the system still needs to record model starts, completions, failures, and fallbacks so Admin can inspect the request later.",
          },
          {
            title: "Tools need visible boundaries",
            detail:
              "A tool call might search the web, generate flashcards, inspect context, or create a learning-book update. The learner may not need every detail in the foreground, but the system should save enough tool-job state for Admin.",
          },
          {
            title: "Source-first behavior matters",
            detail:
              "If the question is about uploaded material, the tutor should use local source context first. Web search is for explicit web needs or current external facts, not a substitute for the document the learner is reading.",
          },
          {
            title: "Memory updates happen after the turn",
            detail:
              "The foreground answer should stay fast. Durable memory can be written after the response, through a bounded path that records learning entries, concepts, artifacts, retrieval rows, and checks when available.",
          },
          {
            title: "Voice should share the same path",
            detail:
              "Voice mode should not bypass chat architecture. Spoken user turns and assistant responses should be recorded and injected through the same learning context wherever possible, with Admin showing voice lifecycle and errors.",
          },
        ],
        closing: tutorSharedClosing,
      }),
    },
    6: {
      label: "about 3 min 55 sec",
      text: makeExpansion({
        intro:
          "Memory, Dexie, and the Library are where the app stops being only a chat box. The simple idea is that useful learning moments can become local records that the learner can inspect, review, correct, and reuse.",
        points: [
          {
            title: "Dexie is local durable storage",
            detail:
              "Dexie saves records in the browser's IndexedDB. It is not AWS, not a remote tenant database, and not a model memory. It is the local notebook that makes beta learning flows testable without cloud infrastructure.",
          },
          {
            title: "Learning books organize study output",
            detail:
              "A generated learning book can hold entries, concepts, risks, and notes from a session. This matters because a learner should not need to search through a chat transcript to find what they learned.",
          },
          {
            title: "Evidence and mastery are stricter",
            detail:
              "The app can store many useful rows, but mastery should move only from validated learning evidence. A model summary can describe what happened; it should not silently increase a learner's score by itself.",
          },
          {
            title: "Artifacts carry provenance",
            detail:
              "Generated notes, flashcards, source cards, and audio guides can all have artifact records and citation states. Those rows explain where the artifact came from and what local verifier, if any, has checked it.",
          },
          {
            title: "Corrections are non-destructive",
            detail:
              "If something is wrong, the app should mark, supersede, or request review instead of erasing the history. That keeps the learner brain auditable and makes beta debugging possible.",
          },
          {
            title: "The Library is the learner-facing result",
            detail:
              "Revision shows the stored books and review material. That is where the learner sees the benefit of local memory: saved explanations, concepts, flashcards, audio guides, and active recall.",
          },
        ],
        closing: tutorSharedClosing,
      }),
    },
    7: {
      label: "about 3 min 50 sec",
      text: makeExpansion({
        intro:
          "Revision and active recall turn saved material into practice. The practical promise is that a learner can leave the live chat, come back later, and still have a useful study path.",
        points: [
          {
            title: "Built-in books teach the product",
            detail:
              "The built-in books explain the app architecture, learner brain, and design system. They are part of local beta because they help the builder and learner understand what the app is supposed to do.",
          },
          {
            title: "Generated books preserve sessions",
            detail:
              "When chat and document context produce useful notes, those notes can become generated learning-book entries. The learner gets a cleaner study artifact than a raw conversation transcript.",
          },
          {
            title: "Flashcards create explicit checks",
            detail:
              "Active recall is different from passive reading. A flashcard answer can become review evidence when it is linked to a real concept and handled through the evidence-gated mastery path.",
          },
          {
            title: "Audio guides support review",
            detail:
              "Stored audio guides let the learner listen to a chapter explanation without making a live TTS request. The audio should help comprehension, while the text and ledgers remain the source for verification.",
          },
          {
            title: "Revision needs a calmer surface",
            detail:
              "The paper-style design is intentional. Review should feel like opening a careful notebook, not like staring at the live cosmic workspace. Different moods help the learner understand the mode they are in.",
          },
          {
            title: "Corrections should flow back",
            detail:
              "If a learner or developer marks a record wrong, Revision and Admin should make that state visible. Review is safer when stale or disputed records are not treated like clean knowledge.",
          },
        ],
        closing: tutorSharedClosing,
      }),
    },
    8: {
      label: "about 3 min 50 sec",
      text: makeExpansion({
        intro:
          "Analytics and Admin are the app's inspection surfaces. They do not teach the lesson directly; they explain what the learning system recorded and how the local beta run is behaving.",
        points: [
          {
            title: "Analytics summarizes learner progress",
            detail:
              "Analytics reads local records and turns them into progress signals: study activity, mastery, confidence, interactions, and review state. It should help the learner understand momentum without pretending every metric is perfect.",
          },
          {
            title: "Admin follows one request at a time",
            detail:
              "Admin groups system events, model runs, and tool jobs by request id. That lets a developer ask what happened during this tutor turn instead of hunting through disconnected logs.",
          },
          {
            title: "Model and tool rows make behavior legible",
            detail:
              "When a model starts, falls back, fails, or completes, Admin should show it. When a tool job runs, Admin should show its lifecycle. This turns hidden background behavior into reviewable state.",
          },
          {
            title: "Memory and retrieval rows explain context",
            detail:
              "A learner-brain update or retrieval choice should leave a row with source, status, and summary. That does not prove every answer is correct, but it proves the system did something inspectable.",
          },
          {
            title: "Source artifacts separate readiness from trust",
            detail:
              "An artifact can be ready to show while its citation state is not checked, unsupported, unavailable, or conflicting. Admin keeps those distinctions visible so local beta does not over-claim.",
          },
          {
            title: "Diagnostics are local and capped",
            detail:
              "The beta export is meant for review, not cloud synchronization. It should be small, local-only, and explicit about what remains deferred until later production work.",
          },
        ],
        closing: tutorSharedClosing,
      }),
    },
    9: {
      label: "about 3 min 55 sec",
      text: makeExpansion({
        intro:
          "The background workflow example follows one learner turn from upload to review. It is useful because architecture can sound abstract until you trace a real path through the app.",
        points: [
          {
            title: "A document enters Study",
            detail:
              "The learner uploads a PDF or image, and Study prepares the visible reader plus any extracted local context. This starts the chain because the tutor now has source material to work with.",
          },
          {
            title: "The learner asks a question",
            detail:
              "Chat gathers the message, selected page or text, active book context, runtime settings, and useful memory. The request should carry enough context for the model to answer the actual study problem.",
          },
          {
            title: "The server streams the answer",
            detail:
              "The server chooses a model path, records provider behavior, streams chunks back, and captures failures or fallbacks. The foreground experience is the answer, but the backend event trail is also part of the product.",
          },
          {
            title: "Tools and retrieval may run",
            detail:
              "The tutor may use document retrieval, web search when explicit, or helper logic for artifacts. Each background action should have a bounded purpose and a row that explains its status.",
          },
          {
            title: "Memory writes after the lesson",
            detail:
              "When the turn completes, Memory can store the interaction, update a learning book, attach concepts, create artifact records, and run local provenance checks where supported.",
          },
          {
            title: "Admin and Revision close the loop",
            detail:
              "Admin lets the builder inspect what happened, while Revision lets the learner review saved material. A complete local flow needs both: one for trust, one for learning.",
          },
        ],
        closing: tutorSharedClosing,
      }),
    },
    10: {
      label: "about 3 min 50 sec",
      text: makeExpansion({
        intro:
          "The model and provider map explains which outside services support which job. The simple rule is that provider calls should have a clear purpose, a visible boundary, and a local record when they shape the learning system.",
        points: [
          {
            title: "Tutor chat uses a model provider",
            detail:
              "The live answer usually comes through OpenRouter-compatible chat models. The exact model can vary, but the app should record model starts, fallbacks, completions, costs, and errors when possible.",
          },
          {
            title: "Learning-book updates are structured",
            detail:
              "A learning-book update is not just another chat answer. It asks a model to produce structured notes, concepts, and risks that can become durable local records. That makes provenance and validation more important.",
          },
          {
            title: "Voice has separate jobs",
            detail:
              "Live voice can include listening, thinking, speaking, transcript turns, and interruptions. Stored chapter audio is different: it is generated ahead of time and played locally from checked-in assets.",
          },
          {
            title: "Web search is explicit",
            detail:
              "Serper is for current external sources or explicit web-search requests. It should not replace local document context when the learner is asking about the uploaded source material.",
          },
          {
            title: "Fallbacks need transparency",
            detail:
              "If one model fails and another model handles the request, Admin should make that visible. A fallback can save the session, but it should not become an invisible change in model behavior.",
          },
          {
            title: "Local beta should not hide production gaps",
            detail:
              "Using providers locally does not mean the cloud architecture is done. The app can prove chat, voice, and stored audio locally while still deferring AWS hosting, tenant isolation, and production key policy.",
          },
        ],
        closing: tutorSharedClosing,
      }),
    },
    11: {
      label: "about 3 min 55 sec",
      text: makeExpansion({
        intro:
          "Graphify, debugging, and safety are about how maintainers change the app without losing the map. The learner brain and the code graph are different things, and this chapter keeps that boundary clear.",
        points: [
          {
            title: "Graphify is the code architecture graph",
            detail:
              "Graphify maps files, symbols, imports, calls, and communities in the repository. It helps agents find connected code before editing. It is not the user-facing learner concept graph.",
          },
          {
            title: "Graph-first reads reduce confusion",
            detail:
              "Large repository scans can waste time and pull unrelated files into the decision. Graphify queries and paths give a smaller starting point, then the agent can read only directly connected files.",
          },
          {
            title: "Debugging should follow evidence",
            detail:
              "A console warning, failed route, or broken UI state is a symptom. The safer workflow is to map the connected files, inspect the live behavior, then patch the narrow cause rather than guessing.",
          },
          {
            title: "Generated graph artifacts are controlled",
            detail:
              "The `graphify-out` files should not be hand-edited. They are regenerated when the task explicitly includes graph maintenance or code architecture changes, not after every ordinary message.",
          },
          {
            title: "Safety means preserving user work",
            detail:
              "The worktree may contain edits from the user or other agents. A good maintainer reads status, stages only the intended files, and never reverts unrelated changes just to make the tree look clean.",
          },
          {
            title: "Verification is part of the change",
            detail:
              "Lint, build, focused tests, browser QA, and Graphify regeneration are not ceremony. They are how the team proves that an implementation slice still matches the architecture book.",
          },
        ],
        closing: tutorSharedClosing,
      }),
    },
    12: {
      label: "about 3 min 45 sec",
      text: makeExpansion({
        intro:
          "Maintenance boundaries explain where to be careful. The simple message is that not every file carries the same risk, and a local beta app becomes safer when changes stay scoped to the right surface.",
        points: [
          {
            title: "Some files are content surfaces",
            detail:
              "Book text, chapter audio scripts, and some UI copy can be changed with relatively low risk, as long as tests and browser checks still pass. These edits should still respect the product truth.",
          },
          {
            title: "Some files are contract surfaces",
            detail:
              "Server routes, SSE event shapes, WebSocket paths, Dexie schemas, and Zustand state fields affect many parts of the app. They need extra graph context and broader verification.",
          },
          {
            title: "Generated assets need regeneration, not manual edits",
            detail:
              "Graphify artifacts and generated audio files should come from their tools. Manual editing can make them inconsistent with the source that future agents rely on.",
          },
          {
            title: "Tests should match the risk",
            detail:
              "A small text change may need formatting and build checks. A memory schema change needs focused tests, migration awareness, and runtime QA. Verification should scale with the blast radius.",
          },
          {
            title: "Dirty worktrees are normal",
            detail:
              "A developer or another agent may have untracked or modified files. The right move is to preserve unrelated work, understand any overlapping file, and stage only the intended implementation slice.",
          },
          {
            title: "The architecture book is a living contract",
            detail:
              "When implementation changes, the book should move with it. If the book says a feature is verified, the source and tests need to prove that claim at the same scope.",
          },
        ],
        closing: tutorSharedClosing,
      }),
    },
  },
  "app-design-language": {
    0: {
      label: "about 3 min 55 sec",
      text: makeExpansion({
        intro:
          "The wireframe connections chapter explains how the product surfaces relate to each other. In simple terms, the learner moves between reading, tutoring, reviewing, analytics, and Admin without those surfaces becoming separate products.",
        points: [
          {
            title: "Study and Chat sit close together",
            detail:
              "The reader and tutor belong near each other because questions usually come from the visible document. The design should make it easy to select, ask, and return to the source without losing context.",
          },
          {
            title: "Revision is a calmer destination",
            detail:
              "Revision is where saved material becomes a book, a card, or an audio guide. It should feel less like a live control room and more like a place to reread and practice.",
          },
          {
            title: "Admin is connected but separate",
            detail:
              "Admin needs to inspect the same events that Study, Chat, voice, and memory create, but it should not crowd the learner's main workspace. It is for tuning and diagnosis.",
          },
          {
            title: "Analytics summarizes rather than controls",
            detail:
              "Analytics should show progress and usage patterns without becoming the place where learning happens. It is a window into accumulated state.",
          },
          {
            title: "The graph is a product map, not decoration",
            detail:
              "Wireframe links should help explain how a turn moves through the system. A connection is useful when it tells the builder what state, artifact, or action crosses a boundary.",
          },
          {
            title: "Mobile flow still matters",
            detail:
              "On small screens, the surfaces need to collapse without hiding the learner's next obvious action. A readable mobile wireframe is part of the design contract.",
          },
        ],
        closing: appDesignSharedClosing,
      }),
    },
    1: {
      label: "about 3 min 55 sec",
      text: makeExpansion({
        intro:
          "The theme system chapter explains why LearningAI has two strong visual moods. The live learning workspace can be cosmic, dark, and energetic, while revision and notes can feel like paper and careful study.",
        points: [
          {
            title: "Cosmic Obsidian is for focus and AI state",
            detail:
              "The dark surface, neon accents, glass, and motion help the Study and Chat areas feel premium and alive. They should highlight meaningful AI state, not cover every inch of the interface.",
          },
          {
            title: "Paper mode is for review",
            detail:
              "Revision uses warmer paper backgrounds, serif type, and quieter spacing because review asks for a different kind of attention. It should feel like opening a notebook, not like staying in the live tutor cockpit.",
          },
          {
            title: "Color should mark meaning",
            detail:
              "Violet, blue, and orange accents should help the learner read state: active AI surfaces, selected controls, warnings, and important actions. Too much accent color makes everything feel equally urgent.",
          },
          {
            title: "Glass should belong to assistant surfaces",
            detail:
              "Liquid glass effects are strongest when they signal AI assistance, overlays, or meaningful control groups. They should not become random decoration on every panel.",
          },
          {
            title: "Motion should have a reason",
            detail:
              "Spring motion and transitions should clarify changes: route switches, active tabs, opening panels, play controls, and assistant status. Motion that hides information or causes layout shifts works against learning.",
          },
          {
            title: "The design system must stay testable",
            detail:
              "A beautiful surface still has to pass browser QA. Text must fit, controls must be reachable, audio cards must not overflow, and Admin tables must remain scannable.",
          },
        ],
        closing: appDesignSharedClosing,
      }),
    },
    2: {
      label: "about 3 min 55 sec",
      text: makeExpansion({
        intro:
          "UI component snapshots are small examples of how the design system behaves. They matter because reusable components carry product decisions: density, motion, trust state, feedback, and reviewability.",
        points: [
          {
            title: "Cards should frame repeated objects",
            detail:
              "A card is useful for a book, source artifact, metric, flashcard, or gallery snapshot. It should not turn every section of the page into a floating object, because that weakens hierarchy.",
          },
          {
            title: "Controls should be familiar",
            detail:
              "Play, pause, speed, seek, tabs, toggles, sliders, and remove buttons should behave like users expect. Familiar controls make advanced AI features feel less mysterious.",
          },
          {
            title: "Status labels need plain words",
            detail:
              "Citation states, tool status, model state, and correction state should use labels that explain what happened. A learner or builder should not need to decode internal implementation names.",
          },
          {
            title: "Empty and error states count",
            detail:
              "If a table has no rows, a route is unavailable, or media playback fails, the UI should show a real state. Silence makes the product feel broken and makes Admin less useful.",
          },
          {
            title: "Snapshots should reflect real behavior",
            detail:
              "A design snapshot is most useful when it matches real components: the same chip rail, audio card, verifier meter, or timeline style the app actually uses.",
          },
          {
            title: "Mobile should not be an afterthought",
            detail:
              "The same component may become a horizontal chip list, a stacked card, or a compact tab row on mobile. The design system needs responsive constraints, not one desktop mockup.",
          },
        ],
        closing: appDesignSharedClosing,
      }),
    },
    3: {
      label: "about 3 min 55 sec",
      text: makeExpansion({
        intro:
          "Local beta control patterns are the design bridge between beautiful learning UI and inspectable system behavior. They show the user or builder what changed, why it changed, and what can be tuned next.",
        points: [
          {
            title: "PDF chips keep document switching compact",
            detail:
              "When multiple documents exist, the selected PDF should be visible and easy to change. A compact chip rail gives the learner control without taking over the reading surface.",
          },
          {
            title: "Request timelines turn logs into stories",
            detail:
              "Admin should group model runs, tool jobs, retrieval events, and server events by request. That lets one tutor turn be reviewed as a story instead of a scattered pile of rows.",
          },
          {
            title: "Voice timelines make live speech debuggable",
            detail:
              "Voice mode needs to show session start, Deepgram settings, speaking and listening transitions, transcript turns, interruptions, and errors. The UI can feel magical only if the diagnostics stay grounded.",
          },
          {
            title: "Correction overlays protect beta trust",
            detail:
              "Mark-wrong, deletion-review, and supersede controls should not erase history. They should add visible correction state so questionable records stop pretending to be clean.",
          },
          {
            title: "Citation checks need separate states",
            detail:
              "A generated artifact can be ready but not verified, verified only for local provenance, unsupported, unavailable, or conflicting. Good controls keep those states separate.",
          },
          {
            title: "Audio generation controls should be boring",
            detail:
              "The audio generator has one practical job: verify the plan, produce stored MP3s, and let the reader play them locally. The playback UI should be reliable, clear, and easy to inspect.",
          },
        ],
        closing: appDesignSharedClosing,
      }),
    },
  },
};

const buildFloorTexts = (entry) => [
  `This chapter should be understandable when heard without looking at the code. The listener should come away knowing what ${entry.chapterTitle} means, where it appears in the app, what local evidence can prove it, and which future production claims still need more work after beta.`,
  `A useful beta check is to open the actual screen, perform the action described in the chapter, and then inspect the saved local state. If the UI, Admin rows, audio guide, and source text all agree, the architecture is becoming real rather than just documented.`,
  `That is the standard for this book: simple language first, visible behavior second, and traceable local evidence third. The chapter guide should help a new reader understand the system before they need to inspect the implementation.`,
  `For this phase, the voice guide is intentionally paced like a short walkthrough. It should be long enough to explain the idea, but still focused enough that a learner can listen before returning to the chapter text and the working app.`,
];

for (const entry of manifest) {
  const bookExpansion = expansions[entry.bookId];
  if (!bookExpansion) continue;
  const expansion = bookExpansion[entry.chapterIndex];
  if (!expansion) continue;

  const baseTranscript = String(entry.transcript || "").trim();
  const expansionText = expansion.text.trim();
  let nextTranscript = baseTranscript.includes(expansionText)
    ? baseTranscript
    : `${baseTranscript} ${expansionText}`.trim();

  for (const floorText of buildFloorTexts(entry)) {
    if (nextTranscript.length >= TARGET_MIN_CHARS) break;
    if (nextTranscript.includes(floorText)) continue;
    nextTranscript = `${nextTranscript} ${floorText}`.trim();
  }

  entry.transcript = nextTranscript;
  entry.durationLabel = expansion.label;
}

writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
