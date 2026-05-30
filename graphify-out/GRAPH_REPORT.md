# Graph Report - Tutor-System-Architecture-  (2026-05-30)

## Corpus Check
- 58 files · ~90,416 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 577 nodes · 827 edges · 37 communities (27 shown, 10 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `95cc0f56`
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
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
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

## God Nodes (most connected - your core abstractions)
1. `useStore` - 24 edges
2. `useTranslation()` - 15 edges
3. `scripts` - 14 edges
4. `useMotionPreference()` - 14 edges
5. `MemoryOrchestrator` - 14 edges
6. `compilerOptions` - 13 edges
7. `db` - 12 edges
8. `PersistentConcept` - 11 edges
9. `Tutor System Architecture` - 9 edges
10. `Tutor System Architecture` - 9 edges

## Surprising Connections (you probably didn't know these)
- `startApp()` --calls--> `createTutorServerApp()`  [INFERRED]
  tests/document-ingest.test.mjs → server.ts
- `vercelHandler()` --calls--> `App()`  [INFERRED]
  server/vercel-handler.ts → src/App.tsx
- `getTutorApp()` --calls--> `createTutorServerApp()`  [EXTRACTED]
  server/vercel-handler.ts → server.ts
- `getTutorApp()` --calls--> `createTutorServerApp()`  [EXTRACTED]
  server/vercel-handler.ts → server.ts
- `AnalyticsView()` --calls--> `useTranslation()`  [EXTRACTED]
  src/views/AnalyticsView.tsx → src/lib/translations.ts

## Communities (37 total, 10 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (22): BKTEngine, DEFAULT_BKT, CognitiveLoadMonitor, CognitiveLoadState, IllusionDetector, LearnerModel, BrainDatabase, ConversationInteraction (+14 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (46): AnimatedScrollText(), AnimatedScrollTextProps, ChatPanel(), Navigation(), PatternCard(), PdfViewer(), formatCount(), formatCurrency() (+38 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (18): debugAdminToken, DEEPGRAM_PRICING, fetchOpenRouterPricing(), normalizeModelPricing(), openRouterCost(), OpenRouterPricing, RequestLike, roundCost() (+10 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (20): LearningBook, LearningBookConcept, cosineSimilarity(), generateEmbedding(), normalize(), TOKEN_STOPWORDS, tokenize(), announceActiveLearningBook() (+12 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (15): AnimatedMarkdown, ChatArchive, InteractiveCodeBlock, languageExtensions, languageLabels, markdownComponents, MermaidApi, MessageItem (+7 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (19): themes, SvgBeige(), SvgDark(), SvgOrange(), Flashcard, BuiltInBook, builtInBookIds, builtInBooks (+11 more)

### Community 6 - "Community 6"
Cohesion: 0.05
Nodes (36): 1. Prerequisites, 2. Install, 3. Configure Environment, 4. Run, code:text (Upload), code:mermaid (graph TD), code:bash (npm run graphify:query -- "how does chat streaming work?"), code:bash (git clone https://github.com/MohamedFuad16/Tutor-System-Arch) (+28 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (34): 1. Product Purpose, 2. Runtime Stack, 3. Model Inventory, 4. Zustand Store, 5. Dexie Database, 6. Core Views, 7. Graphify Architecture Layer, 8. Maintenance Boundaries (+26 more)

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (30): Architecture Boundaries, Change Workflow, code:text (graphify-out/), code:bash (graphify query "your question" --budget 2000 --graph graphif), code:bash (npm run lint), Core Product Boundaries, Design Philosophy, Graph Location (+22 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (18): 1. Mobile-First Design, 2. Component Layout, 3. Typography Scaling, 4. Testing & Validation, Best Practices, Breakpoints Overview, Responsive Design Guidelines, Tailwind Breakpoint Mapping (+10 more)

### Community 10 - "Community 10"
Cohesion: 0.20
Nodes (8): ExpiredIcon(), PendingIcon(), ProgressIcon(), ReviewIcon(), Status, StatusBadge(), SubmittedIcon(), SuccessIcon()

### Community 11 - "Community 11"
Cohesion: 0.26
Nodes (9): createTutorServerApp(), startServer(), config, getTutorApp(), normalizeVercelCatchAllUrl(), vercelHandler(), startApp(), createTutorServerApp() (+1 more)

### Community 12 - "Community 12"
Cohesion: 0.38
Nodes (7): compactModel(), formatCount(), formatCurrency(), formatSeconds(), MessageUsageFooter(), UsageAnalyticsStrip(), useAnimatedNumber()

### Community 14 - "Community 14"
Cohesion: 0.06
Nodes (32): devDependencies, autoprefixer, esbuild, prettier, tailwindcss, @types/d3, @types/express, @types/multer (+24 more)

### Community 15 - "Community 15"
Cohesion: 0.50
Nodes (4): archiveChatSnapshot(), meaningfulChatMessages(), readChatArchives(), writeChatArchives()

### Community 18 - "Community 18"
Cohesion: 0.67
Nodes (3): codeFileName(), codeLanguageLabel(), PremiumCodeShell()

### Community 23 - "Community 23"
Cohesion: 0.07
Nodes (29): dependencies, compression, d3, dexie, dexie-react-hooks, dotenv, express, @fontsource/geist-sans (+21 more)

### Community 24 - "Community 24"
Cohesion: 0.17
Nodes (12): abortError(), cache, detectFreshnessSearch(), formatSourcesForPrompt(), NormalizedWebSource, normalizeRows(), SearchOptions, searchSerper() (+4 more)

### Community 26 - "Community 26"
Cohesion: 0.13
Nodes (14): compilerOptions, allowImportingTsExtensions, allowJs, experimentalDecorators, isolatedModules, jsx, lib, module (+6 more)

### Community 27 - "Community 27"
Cohesion: 0.20
Nodes (9): env, browser, es2021, extends, parser, plugins, version, settings (+1 more)

### Community 28 - "Community 28"
Cohesion: 0.25
Nodes (9): debugTokenFromRequest(), deepgramKeyFromRequest(), firstHeader(), hostNameFromHeader(), isAuthorizedDebugRequest(), isLoopbackAddress(), isLoopbackHost(), sanitizeApiKey() (+1 more)

### Community 29 - "Community 29"
Cohesion: 0.23
Nodes (12): debugTokenFromRequest(), deepgramKeyFromRequest(), firstHeader(), getOpenRouterServerFallbackKey(), hostNameFromHeader(), isAuthorizedDebugRequest(), isLoopbackAddress(), isLoopbackHost() (+4 more)

### Community 30 - "Community 30"
Cohesion: 0.40
Nodes (4): description, majorCapabilities, name, requestFramePermissions

### Community 31 - "Community 31"
Cohesion: 0.50
Nodes (4): openRouterCost(), roundCost(), ttsCostForModel(), voiceAgentCostForSeconds()

## Knowledge Gaps
- **240 isolated node(s):** `name`, `private`, `version`, `type`, `dev` (+235 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `App()` connect `Community 1` to `Community 11`?**
  _High betweenness centrality (0.136) - this node is a cross-community bridge._
- **Why does `vercelHandler()` connect `Community 11` to `Community 1`?**
  _High betweenness centrality (0.135) - this node is a cross-community bridge._
- **Why does `useStore` connect `Community 1` to `Community 0`, `Community 5`, `Community 12`, `Community 4`?**
  _High betweenness centrality (0.133) - this node is a cross-community bridge._
- **What connects `name`, `private`, `version` to the rest of the system?**
  _240 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06386066763425254 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.062003968253968256 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07007575757575757 - nodes in this community are weakly interconnected._