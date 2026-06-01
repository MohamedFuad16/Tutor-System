# Graph Report - Tutor-System-Architecture-  (2026-06-01)

## Corpus Check
- 103 files · ~165,887 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1002 nodes · 1836 edges · 81 communities (50 shown, 31 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c3ea441d`
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
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
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

## God Nodes (most connected - your core abstractions)
1. `useMotionPreference()` - 35 edges
2. `useStore` - 35 edges
3. `db` - 32 edges
4. `useTranslation()` - 22 edges
5. `PersistentConcept` - 19 edges
6. `MemoryOrchestrator` - 16 edges
7. `scripts` - 14 edges
8. `compilerOptions` - 13 edges
9. `UsageAnalyticsStrip()` - 11 edges
10. `brain architecture implementation program` - 11 edges

## Surprising Connections (you probably didn't know these)
- `vercelHandler()` --calls--> `App()`  [INFERRED]
  server/vercel-handler.ts → src/App.tsx
- `startApp()` --calls--> `createTutorServerApp()`  [INFERRED]
  tests/document-ingest.test.mjs → server.ts
- `startApp()` --calls--> `createTutorServerApp()`  [INFERRED]
  tests/system-activity.test.mjs → server.ts
- `startApp()` --calls--> `createTutorServerApp()`  [INFERRED]
  tests/document-ingest.test.mjs → server.ts
- `startApp()` --calls--> `createTutorServerApp()`  [INFERRED]
  tests/system-activity.test.mjs → server.ts

## Import Cycles
- None detected.

## Communities (81 total, 31 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.09
Nodes (43): compactSummary(), createLedgerId(), createMasteryDeltaRecords(), createModelSummaryEvidenceRecord(), MasteryDeltaInput, ModelSummaryEvidenceInput, recordMasteryDelta(), recordModelSummaryEvidence() (+35 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (42): debugAdminToken, debugTokenFromRequest(), DEEPGRAM_PRICING, deepgramKeyFromRequest(), fetchOpenRouterPricing(), firstHeader(), getOpenRouterServerFallbackKey(), hostNameFromHeader() (+34 more)

### Community 2 - "Community 2"
Cohesion: 0.10
Nodes (38): ChatPanel(), FloatingSkillsMenu(), SKILLS, Navigation(), PatternCard(), PdfViewer(), SettingsButton(), SiriLiquidGlass() (+30 more)

### Community 3 - "Community 3"
Cohesion: 0.06
Nodes (32): BKTAttemptOptions, BKTEngine, DEFAULT_BKT, CognitiveLoadMonitor, CognitiveLoadState, IllusionDetector, LearnerModel, BookChatThread (+24 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (32): pressDots, themes, SvgBeige(), SvgDark(), SvgOrange(), userBrainArchitectureBook, AppDesignLanguagePage(), BuiltInBook (+24 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (49): AnimatedMarkdown, AnimatedNumberText(), AnimatePresence(), buildDocumentContext(), ChatArchive, codeFileName(), codeLanguageLabel(), createMotionElement() (+41 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (38): formatCount(), formatCurrency(), planCardMeta, UsageGraphBar(), UsageInsightsPanel(), UserUsagePanel(), AccessMode, estimateServiceMinutes() (+30 more)

### Community 7 - "Community 7"
Cohesion: 0.16
Nodes (23): EvidenceEvent, MasteryDelta, ToolJob, compact(), createToolJobRecord(), normalizeToolJobStatus(), recordToolJobEvent(), ToolJobEventInput (+15 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (20): 1. Prerequisites, 2. Install, 3. Configure Environment, 4. Run, Book-Scoped Study Workflow, code:text (Upload), code:mermaid (graph TD), code:bash (npm run graphify:query -- "how does chat streaming work?") (+12 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (17): 1. Product Purpose, 2. Runtime Stack, 3. Model Inventory, 4. Zustand Store, 5. Dexie Database, 6. Core Views, 7. Graphify Architecture Layer, 8. Maintenance Boundaries (+9 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (15): Architecture Boundaries, Change Workflow, code:text (graphify-out/), code:bash (graphify query "your question" --budget 2000 --graph graphif), code:bash (npm run lint), Core Product Boundaries, Design Philosophy, Graph Location (+7 more)

### Community 11 - "Community 11"
Cohesion: 0.06
Nodes (39): createTutorServerApp(), startServer(), createTutorServerApp(), debugAdminToken, debugTokenFromRequest(), DEEPGRAM_PRICING, deepgramKeyFromRequest(), fetchOpenRouterPricing() (+31 more)

### Community 12 - "Community 12"
Cohesion: 0.20
Nodes (9): 1. Mobile-First Design, 2. Component Layout, 3. Typography Scaling, 4. Testing & Validation, Best Practices, Breakpoints Overview, Responsive Design Guidelines, Tailwind Breakpoint Mapping (+1 more)

### Community 13 - "Community 13"
Cohesion: 0.33
Nodes (9): ExpiredIcon(), FailedIcon(), PendingIcon(), ProgressIcon(), ReviewIcon(), Status, StatusBadge(), SubmittedIcon() (+1 more)

### Community 14 - "Community 14"
Cohesion: 0.22
Nodes (9): archiveChatSnapshot(), chatThreadIdForBook(), chatTitleFromMessages(), defaultChatMessages(), meaningfulChatMessages(), normalizeChatMessages(), persistBookChatThread(), readChatArchives() (+1 more)

### Community 15 - "Community 15"
Cohesion: 0.42
Nodes (8): buildTutorInteractionContext(), countWords(), createTutorInteractionSnapshot(), elapsedFrom(), responsePolicyForMode(), SnapshotInput, TutorInteractionMode, TutorInteractionSnapshot

### Community 16 - "Community 16"
Cohesion: 0.38
Nodes (7): compactModel(), formatCount(), formatCurrency(), formatSeconds(), MessageUsageFooter(), UsageAnalyticsStrip(), useAnimatedNumber()

### Community 18 - "Community 18"
Cohesion: 0.33
Nodes (4): calls, card, engine, updateConceptAttempt()

### Community 19 - "Community 19"
Cohesion: 0.60
Nodes (3): createTutorHighlighter(), ShikiHighlighter(), TutorHighlighter

### Community 20 - "Community 20"
Cohesion: 0.50
Nodes (3): controller, prompt, seenKeys

### Community 24 - "Community 24"
Cohesion: 0.05
Nodes (39): Accepted Results, brain architecture implementation program: phase 1 report, brain architecture implementation program: phase 2 report, brain architecture implementation program: phase 3 report, brain architecture implementation program: phase 4 report, brain architecture implementation program: phase 5 report, Conflicts Resolved, Final Report: brain architecture implementation program (+31 more)

### Community 28 - "Community 28"
Cohesion: 0.07
Nodes (29): dependencies, compression, d3, dexie, dexie-react-hooks, dotenv, express, @fontsource/geist-sans (+21 more)

### Community 29 - "Community 29"
Cohesion: 0.11
Nodes (18): activeBookId, activeDocumentId, activeProject, bodyText, books, consoleEvents, docs, overflow (+10 more)

### Community 31 - "Community 31"
Cohesion: 0.12
Nodes (15): 1. Product Purpose, 2. Runtime Stack, 3. Model Inventory, 4. Zustand Store, 5. Dexie Database, 6. Core Views, 7. Graphify Architecture Layer, 8. Maintenance Boundaries (+7 more)

### Community 32 - "Community 32"
Cohesion: 0.13
Nodes (14): 1. Prerequisites, 2. Install, 3. Configure Environment, 4. Run, Book-Scoped Study Workflow, Contributing, Core Surfaces, Design System (+6 more)

### Community 33 - "Community 33"
Cohesion: 0.13
Nodes (14): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+6 more)

### Community 34 - "Community 34"
Cohesion: 0.14
Nodes (14): scripts, build, clean, dev, format, format:check, graphify:path, graphify:query (+6 more)

### Community 35 - "Community 35"
Cohesion: 0.14
Nodes (13): approval, granted, notes, required, created_at, packets, slug, status (+5 more)

### Community 36 - "Community 36"
Cohesion: 0.15
Nodes (12): Architecture Boundaries, Change Workflow, Core Product Boundaries, Design Philosophy, Graph Location, Graphify-First Development, Local Commands, Objective (+4 more)

### Community 37 - "Community 37"
Cohesion: 0.15
Nodes (12): approval, granted, notes, required, created_at, packets, slug, status (+4 more)

### Community 38 - "Community 38"
Cohesion: 0.17
Nodes (11): Approval Required, brain architecture implementation program, Constraints, Current Context, Goal, Integration Policy, Reusable Artifacts, Risks (+3 more)

### Community 39 - "Community 39"
Cohesion: 0.17
Nodes (12): devDependencies, autoprefixer, esbuild, prettier, tailwindcss, @types/d3, @types/express, @types/multer (+4 more)

### Community 40 - "Community 40"
Cohesion: 0.17
Nodes (11): Approval Required, Constraints, Current Context, Goal, Integration Policy, Reusable Artifacts, Risks, study view fixes (+3 more)

### Community 41 - "Community 41"
Cohesion: 0.18
Nodes (10): Branching Rules, Branching Rules, Completion Audit, Execution Rules, Integration Checklist, Orchestration: study view fixes, Packet Prompts, Packet Prompts (+2 more)

### Community 42 - "Community 42"
Cohesion: 0.20
Nodes (9): env, browser, es2021, extends, parser, plugins, version, settings (+1 more)

### Community 43 - "Community 43"
Cohesion: 0.20
Nodes (9): 1. Mobile-First Design, 2. Component Layout, 3. Typography Scaling, 4. Testing & Validation, Best Practices, Breakpoints Overview, Responsive Design Guidelines, Tailwind Breakpoint Mapping (+1 more)

### Community 44 - "Community 44"
Cohesion: 0.22
Nodes (8): Context, Do, Do Not, Expected Output, Objective, Ownership, Packet A: Data Model and Persistence, Verification

### Community 45 - "Community 45"
Cohesion: 0.22
Nodes (8): Context, Do, Do Not, Expected Output, Objective, Ownership, Packet B: Chat Runtime, Verification

### Community 46 - "Community 46"
Cohesion: 0.22
Nodes (8): Context, Do, Do Not, Expected Output, Objective, Ownership, Packet C: Study and PDF, Verification

### Community 47 - "Community 47"
Cohesion: 0.22
Nodes (8): Context, Do, Do Not, Expected Output, Objective, Ownership, Packet D: Revision and Library, Verification

### Community 48 - "Community 48"
Cohesion: 0.22
Nodes (8): Context, Do, Do Not, Expected Output, Objective, Ownership, Packet E: QA, Docs, and Git, Verification

### Community 49 - "Community 49"
Cohesion: 0.22
Nodes (8): Accepted Results, Conflicts Resolved, Final Report: study view fixes, Git Evidence, Outcome, Remaining Risks, Screenshots, Verification Evidence

### Community 50 - "Community 50"
Cohesion: 0.29
Nodes (6): name, overrides, protobufjs, private, type, version

### Community 51 - "Community 51"
Cohesion: 0.33
Nodes (5): Branching Rules, Completion Audit, Execution Rules, Orchestration: brain architecture implementation program, Packet Prompts

### Community 52 - "Community 52"
Cohesion: 0.40
Nodes (4): description, majorCapabilities, name, requestFramePermissions

## Knowledge Gaps
- **363 isolated node(s):** `parser`, `plugins`, `extends`, `version`, `browser` (+358 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **31 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useStore` connect `Community 2` to `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 16`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Why does `App()` connect `Community 2` to `Community 11`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **Why does `vercelHandler()` connect `Community 11` to `Community 2`?**
  _High betweenness centrality (0.069) - this node is a cross-community bridge._
- **What connects `parser`, `plugins`, `extends` to the rest of the system?**
  _363 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08878968253968254 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06638714185883997 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.09921355111917725 - nodes in this community are weakly interconnected._