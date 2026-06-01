# Graph Report - Tutor-System-Architecture-  (2026-06-01)

## Corpus Check
- 112 files · ~172,343 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1095 nodes · 2030 edges · 100 communities (66 shown, 34 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9fe1fb66`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]

## God Nodes (most connected - your core abstractions)
1. `db` - 36 edges
2. `useMotionPreference()` - 35 edges
3. `useStore` - 35 edges
4. `useTranslation()` - 22 edges
5. `PersistentConcept` - 21 edges
6. `MemoryOrchestrator` - 16 edges
7. `scripts` - 14 edges
8. `compilerOptions` - 13 edges
9. `UsageAnalyticsStrip()` - 11 edges
10. `brain architecture implementation program` - 11 edges

## Surprising Connections (you probably didn't know these)
- `startApp()` --calls--> `createTutorServerApp()`  [INFERRED]
  tests/system-activity.test.mjs → server.ts
- `vercelHandler()` --calls--> `App()`  [INFERRED]
  server/vercel-handler.ts → src/App.tsx
- `searchDetectionForExplicitRequest()` --calls--> `detectFreshnessSearch()`  [EXTRACTED]
  server.ts → server/web-search.ts
- `getTutorApp()` --calls--> `createTutorServerApp()`  [EXTRACTED]
  server/vercel-handler.ts → server.ts
- `startApp()` --calls--> `createTutorServerApp()`  [INFERRED]
  tests/document-ingest.test.mjs → server.ts

## Import Cycles
- None detected.

## Communities (100 total, 34 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (46): BKTAttemptOptions, BKTEngine, DEFAULT_BKT, compactSummary(), createLedgerId(), createMasteryDeltaRecords(), createModelSummaryEvidenceRecord(), MasteryDeltaInput (+38 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (46): createTutorServerApp(), debugAdminToken, debugTokenFromRequest(), DEEPGRAM_PRICING, deepgramKeyFromRequest(), fetchOpenRouterPricing(), firstHeader(), getOpenRouterServerFallbackKey() (+38 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (34): CognitiveLoadMonitor, CognitiveLoadState, IllusionDetector, LearnerModel, BookChatThread, BrainDatabase, ConversationInteraction, db (+26 more)

### Community 3 - "Community 3"
Cohesion: 0.10
Nodes (37): ChatPanel(), FloatingSkillsMenu(), SKILLS, Navigation(), PdfViewer(), SettingsButton(), SiriLiquidGlass(), useMotionPreference() (+29 more)

### Community 4 - "Community 4"
Cohesion: 0.08
Nodes (49): AnimatedMarkdown, AnimatedNumberText(), AnimatePresence(), buildDocumentContext(), ChatArchive, codeFileName(), codeLanguageLabel(), createMotionElement() (+41 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (42): PatternCard(), pressDots, themes, SvgBeige(), SvgDark(), SvgOrange(), userBrainArchitectureBook, Flashcard (+34 more)

### Community 6 - "Community 6"
Cohesion: 0.10
Nodes (43): formatCount(), formatCurrency(), planCardMeta, UsageGraphBar(), UsageInsightsPanel(), UserUsagePanel(), AccessMode, estimateServiceMinutes() (+35 more)

### Community 7 - "Community 7"
Cohesion: 0.49
Nodes (4): config, getTutorApp(), normalizeVercelCatchAllUrl(), vercelHandler()

### Community 8 - "Community 8"
Cohesion: 0.16
Nodes (23): ModelRun, compact(), createModelRunRecord(), ModelRunEventInput, modelRunIdFor(), ModelRunStatusInput, nonNegativeNumber(), normalizeModelRunStatus() (+15 more)

### Community 9 - "Community 9"
Cohesion: 0.10
Nodes (20): 1. Prerequisites, 2. Install, 3. Configure Environment, 4. Run, Book-Scoped Study Workflow, code:text (Upload), code:mermaid (graph TD), code:bash (npm run graphify:query -- "how does chat streaming work?") (+12 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (17): 1. Product Purpose, 2. Runtime Stack, 3. Model Inventory, 4. Zustand Store, 5. Dexie Database, 6. Core Views, 7. Graphify Architecture Layer, 8. Maintenance Boundaries (+9 more)

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (15): Architecture Boundaries, Change Workflow, code:text (graphify-out/), code:bash (graphify query "your question" --budget 2000 --graph graphif), code:bash (npm run lint), Core Product Boundaries, Design Philosophy, Graph Location (+7 more)

### Community 12 - "Community 12"
Cohesion: 0.34
Nodes (13): chooseFlashcardConcept(), compact(), containsConceptPhrase(), createFlashcardForStorage(), ensurePersistentConceptForLearningBookConcept(), FlashcardConceptResolution, FlashcardStorageContext, GeneratedFlashcardInput (+5 more)

### Community 13 - "Community 13"
Cohesion: 0.20
Nodes (9): 1. Mobile-First Design, 2. Component Layout, 3. Typography Scaling, 4. Testing & Validation, Best Practices, Breakpoints Overview, Responsive Design Guidelines, Tailwind Breakpoint Mapping (+1 more)

### Community 14 - "Community 14"
Cohesion: 0.07
Nodes (29): dependencies, compression, d3, dexie, dexie-react-hooks, dotenv, express, @fontsource/geist-sans (+21 more)

### Community 15 - "Community 15"
Cohesion: 0.33
Nodes (9): ExpiredIcon(), FailedIcon(), PendingIcon(), ProgressIcon(), ReviewIcon(), Status, StatusBadge(), SubmittedIcon() (+1 more)

### Community 16 - "Community 16"
Cohesion: 0.22
Nodes (9): archiveChatSnapshot(), chatThreadIdForBook(), chatTitleFromMessages(), defaultChatMessages(), meaningfulChatMessages(), normalizeChatMessages(), persistBookChatThread(), readChatArchives() (+1 more)

### Community 17 - "Community 17"
Cohesion: 0.42
Nodes (8): buildTutorInteractionContext(), countWords(), createTutorInteractionSnapshot(), elapsedFrom(), responsePolicyForMode(), SnapshotInput, TutorInteractionMode, TutorInteractionSnapshot

### Community 18 - "Community 18"
Cohesion: 0.38
Nodes (7): compactModel(), formatCount(), formatCurrency(), formatSeconds(), MessageUsageFooter(), UsageAnalyticsStrip(), useAnimatedNumber()

### Community 20 - "Community 20"
Cohesion: 0.33
Nodes (4): calls, card, engine, updateConceptAttempt()

### Community 21 - "Community 21"
Cohesion: 0.60
Nodes (3): createTutorHighlighter(), ShikiHighlighter(), TutorHighlighter

### Community 22 - "Community 22"
Cohesion: 0.40
Nodes (3): concept, persistent, resolution

### Community 23 - "Community 23"
Cohesion: 0.20
Nodes (7): createTutorServerApp(), startServer(), form, startApp(), blockedEvent, readActivity(), startApp()

### Community 24 - "Community 24"
Cohesion: 0.50
Nodes (3): controller, prompt, seenKeys

### Community 28 - "Community 28"
Cohesion: 0.08
Nodes (17): debugAdminToken, DEEPGRAM_PRICING, fetchOpenRouterPricing(), normalizeModelPricing(), openRouterCost(), OpenRouterPricing, RequestLike, roundCost() (+9 more)

### Community 29 - "Community 29"
Cohesion: 0.11
Nodes (18): activeBookId, activeDocumentId, activeProject, bodyText, books, consoleEvents, docs, overflow (+10 more)

### Community 35 - "Community 35"
Cohesion: 0.12
Nodes (15): 1. Product Purpose, 2. Runtime Stack, 3. Model Inventory, 4. Zustand Store, 5. Dexie Database, 6. Core Views, 7. Graphify Architecture Layer, 8. Maintenance Boundaries (+7 more)

### Community 36 - "Community 36"
Cohesion: 0.13
Nodes (14): 1. Prerequisites, 2. Install, 3. Configure Environment, 4. Run, Book-Scoped Study Workflow, Contributing, Core Surfaces, Design System (+6 more)

### Community 38 - "Community 38"
Cohesion: 0.13
Nodes (14): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+6 more)

### Community 39 - "Community 39"
Cohesion: 0.14
Nodes (14): scripts, build, clean, dev, format, format:check, graphify:path, graphify:query (+6 more)

### Community 40 - "Community 40"
Cohesion: 0.14
Nodes (13): approval, granted, notes, required, created_at, packets, slug, status (+5 more)

### Community 41 - "Community 41"
Cohesion: 0.15
Nodes (12): Architecture Boundaries, Change Workflow, Core Product Boundaries, Design Philosophy, Graph Location, Graphify-First Development, Local Commands, Objective (+4 more)

### Community 42 - "Community 42"
Cohesion: 0.15
Nodes (12): approval, granted, notes, required, created_at, packets, slug, status (+4 more)

### Community 43 - "Community 43"
Cohesion: 0.17
Nodes (11): Approval Required, brain architecture implementation program, Constraints, Current Context, Goal, Integration Policy, Reusable Artifacts, Risks (+3 more)

### Community 44 - "Community 44"
Cohesion: 0.17
Nodes (12): devDependencies, autoprefixer, esbuild, prettier, tailwindcss, @types/d3, @types/express, @types/multer (+4 more)

### Community 45 - "Community 45"
Cohesion: 0.23
Nodes (12): debugTokenFromRequest(), deepgramKeyFromRequest(), firstHeader(), getOpenRouterServerFallbackKey(), hostNameFromHeader(), isAuthorizedDebugRequest(), isLoopbackAddress(), isLoopbackHost() (+4 more)

### Community 46 - "Community 46"
Cohesion: 0.17
Nodes (11): Approval Required, Constraints, Current Context, Goal, Integration Policy, Reusable Artifacts, Risks, study view fixes (+3 more)

### Community 47 - "Community 47"
Cohesion: 0.18
Nodes (10): Branching Rules, Branching Rules, Completion Audit, Execution Rules, Integration Checklist, Orchestration: study view fixes, Packet Prompts, Packet Prompts (+2 more)

### Community 48 - "Community 48"
Cohesion: 0.20
Nodes (9): env, browser, es2021, extends, parser, plugins, version, settings (+1 more)

### Community 49 - "Community 49"
Cohesion: 0.20
Nodes (9): 1. Mobile-First Design, 2. Component Layout, 3. Typography Scaling, 4. Testing & Validation, Best Practices, Breakpoints Overview, Responsive Design Guidelines, Tailwind Breakpoint Mapping (+1 more)

### Community 50 - "Community 50"
Cohesion: 0.22
Nodes (8): Context, Do, Do Not, Expected Output, Objective, Ownership, Packet A: Data Model and Persistence, Verification

### Community 51 - "Community 51"
Cohesion: 0.22
Nodes (8): Context, Do, Do Not, Expected Output, Objective, Ownership, Packet B: Chat Runtime, Verification

### Community 52 - "Community 52"
Cohesion: 0.22
Nodes (8): Context, Do, Do Not, Expected Output, Objective, Ownership, Packet C: Study and PDF, Verification

### Community 53 - "Community 53"
Cohesion: 0.22
Nodes (8): Context, Do, Do Not, Expected Output, Objective, Ownership, Packet D: Revision and Library, Verification

### Community 54 - "Community 54"
Cohesion: 0.22
Nodes (8): Context, Do, Do Not, Expected Output, Objective, Ownership, Packet E: QA, Docs, and Git, Verification

### Community 55 - "Community 55"
Cohesion: 0.22
Nodes (8): Accepted Results, Conflicts Resolved, Final Report: study view fixes, Git Evidence, Outcome, Remaining Risks, Screenshots, Verification Evidence

### Community 56 - "Community 56"
Cohesion: 0.25
Nodes (8): Accepted Results, Conflicts Resolved, Final Report: brain architecture implementation program, Outcome, Rejected Results, Remaining Risks, Reusable Follow-up, Verification Evidence

### Community 57 - "Community 57"
Cohesion: 0.25
Nodes (7): Graphify Context, Integration Decisions, Packet L: Local runtime tuning, Remaining Risks, Scope, Sidecar Audit, Verification

### Community 58 - "Community 58"
Cohesion: 0.29
Nodes (6): brain architecture implementation program: phase 3 report, Graphify Context, Integration Decisions, Remaining Work, Scope, Verification Evidence

### Community 59 - "Community 59"
Cohesion: 0.29
Nodes (7): brain architecture implementation program: phase 1 report, Graphify Context, Integration Decisions, Remaining Work, Scope, Sidecar Results, Verification Evidence

### Community 60 - "Community 60"
Cohesion: 0.29
Nodes (6): name, overrides, protobufjs, private, type, version

### Community 61 - "Community 61"
Cohesion: 0.29
Nodes (6): Graphify Context, Implementation, Packet M - Durable model runs, Remaining Work, Scope, Verification Evidence

### Community 62 - "Community 62"
Cohesion: 0.33
Nodes (6): brain architecture implementation program: phase 2 report, Graphify Context, Integration Decisions, Remaining Work, Scope, Verification Evidence

### Community 63 - "Community 63"
Cohesion: 0.33
Nodes (6): brain architecture implementation program: phase 4 report, Graphify Context, Integration Decisions, Remaining Work, Scope, Verification Evidence

### Community 64 - "Community 64"
Cohesion: 0.33
Nodes (6): brain architecture implementation program: phase 5 report, Graphify Context, Integration Decisions, Remaining Work, Scope, Verification Evidence

### Community 65 - "Community 65"
Cohesion: 0.33
Nodes (6): brain architecture implementation program: phase 6 report, Graphify Context, Integration Decisions, Remaining Work, Scope, Verification Evidence

### Community 66 - "Community 66"
Cohesion: 0.33
Nodes (6): brain architecture implementation program: phase 7 report, Graphify Context, Integration Decisions, Remaining Work, Scope, Verification Evidence

### Community 67 - "Community 67"
Cohesion: 0.33
Nodes (6): brain architecture implementation program: phase 8 report, Graphify Context, Integration Decisions, Remaining Work, Scope, Verification Evidence

### Community 68 - "Community 68"
Cohesion: 0.33
Nodes (5): Branching Rules, Completion Audit, Execution Rules, Orchestration: brain architecture implementation program, Packet Prompts

### Community 69 - "Community 69"
Cohesion: 0.40
Nodes (4): description, majorCapabilities, name, requestFramePermissions

## Knowledge Gaps
- **395 isolated node(s):** `parser`, `plugins`, `extends`, `version`, `browser` (+390 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **34 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `db` connect `Community 2` to `Community 0`, `Community 3`, `Community 4`, `Community 5`, `Community 8`, `Community 12`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Why does `BrainRuntimeSettings` connect `Community 6` to `Community 8`, `Community 1`, `Community 28`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `DEFAULT_BRAIN_RUNTIME_SETTINGS` connect `Community 6` to `Community 8`, `Community 1`, `Community 28`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **What connects `parser`, `plugins`, `extends` to the rest of the system?**
  _395 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07967806841046278 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05961426066627703 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.061458718992965566 - nodes in this community are weakly interconnected._