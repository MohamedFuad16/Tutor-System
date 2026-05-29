# Graph Report - LearningAI  (2026-05-29)

## Corpus Check
- 48 files · ~92,319 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 403 nodes · 609 edges · 25 communities (18 shown, 7 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8095617c`
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

## God Nodes (most connected - your core abstractions)
1. `useStore` - 22 edges
2. `useTranslation()` - 15 edges
3. `MemoryOrchestrator` - 14 edges
4. `db` - 12 edges
5. `Tutor System Architecture` - 9 edges
6. `PersistentConcept` - 8 edges
7. `Graphify-First Development` - 8 edges
8. `MisconceptionGraph` - 7 edges
9. `UsageAnalyticsStrip()` - 7 edges
10. `vercelHandler()` - 6 edges

## Surprising Connections (you probably didn't know these)
- `vercelHandler()` --calls--> `App()`  [INFERRED]
  server/vercel-handler.ts → src/App.tsx
- `searchSerper()` --calls--> `normalizeRows()`  [INFERRED]
  server.mjs → server/web-search.ts
- `searchSerper()` --calls--> `wait()`  [INFERRED]
  server.mjs → server/web-search.ts
- `getTutorApp()` --calls--> `createTutorServerApp()`  [EXTRACTED]
  server/vercel-handler.ts → server.ts
- `AnalyticsView()` --calls--> `useTranslation()`  [EXTRACTED]
  src/views/AnalyticsView.tsx → src/lib/translations.ts

## Communities (25 total, 7 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (25): BKTEngine, DEFAULT_BKT, CognitiveLoadMonitor, CognitiveLoadState, IllusionDetector, LearnerModel, BrainDatabase, ConversationInteraction (+17 more)

### Community 1 - "Community 1"
Cohesion: 0.13
Nodes (20): ChatPanel(), Navigation(), formatCount(), formatCurrency(), SettingsButton(), UsageGraphBar(), UsageInsightsPanel(), SiriLiquidGlass() (+12 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (32): debugAdminToken, debugTokenFromRequest(), DEEPGRAM_PRICING, deepgramKeyFromRequest(), fetchOpenRouterPricing(), firstHeader(), hostNameFromHeader(), isAuthorizedDebugRequest() (+24 more)

### Community 3 - "Community 3"
Cohesion: 0.09
Nodes (22): AnimatedScrollText(), AnimatedScrollTextProps, PdfViewer(), cosineSimilarity(), generateEmbedding(), normalize(), TOKEN_STOPWORDS, tokenize() (+14 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (15): AnimatedMarkdown, ChatArchive, InteractiveCodeBlock, languageExtensions, languageLabels, markdownComponents, MermaidApi, MessageItem (+7 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (18): PatternCard(), themes, SvgBeige(), SvgDark(), SvgOrange(), BuiltInBook, builtInBookIds, builtInBooks (+10 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (18): 1. Prerequisites, 2. Install, 3. Configure Environment, 4. Run, code:text (Upload), code:mermaid (graph TD), code:bash (npm run graphify:query -- "how does chat streaming work?"), code:bash (git clone https://github.com/MohamedFuad16/Tutor-System-Arch) (+10 more)

### Community 7 - "Community 7"
Cohesion: 0.11
Nodes (17): 1. Product Purpose, 2. Runtime Stack, 3. Model Inventory, 4. Zustand Store, 5. Dexie Database, 6. Core Views, 7. Graphify Architecture Layer, 8. Maintenance Boundaries (+9 more)

### Community 8 - "Community 8"
Cohesion: 0.12
Nodes (15): Architecture Boundaries, Change Workflow, code:text (graphify-out/), code:bash (graphify query "your question" --budget 2000 --graph graphif), code:bash (npm run lint), Core Product Boundaries, Design Philosophy, Graph Location (+7 more)

### Community 9 - "Community 9"
Cohesion: 0.2
Nodes (9): 1. Mobile-First Design, 2. Component Layout, 3. Typography Scaling, 4. Testing & Validation, Best Practices, Breakpoints Overview, Responsive Design Guidelines, Tailwind Breakpoint Mapping (+1 more)

### Community 10 - "Community 10"
Cohesion: 0.2
Nodes (8): ExpiredIcon(), PendingIcon(), ProgressIcon(), ReviewIcon(), Status, StatusBadge(), SubmittedIcon(), SuccessIcon()

### Community 11 - "Community 11"
Cohesion: 0.08
Nodes (27): assistantMessage, codeBlockMatch, createTutorServerApp(), domain, end, headerToken, hostname, match (+19 more)

### Community 12 - "Community 12"
Cohesion: 0.38
Nodes (7): compactModel(), formatCount(), formatCurrency(), formatSeconds(), MessageUsageFooter(), UsageAnalyticsStrip(), useAnimatedNumber()

### Community 14 - "Community 14"
Cohesion: 0.08
Nodes (20): ChatPhase, Message, MindMapLink, MindMapNode, Annotation, AppState, ChatUsage, Concept (+12 more)

### Community 15 - "Community 15"
Cohesion: 0.5
Nodes (4): archiveChatSnapshot(), meaningfulChatMessages(), readChatArchives(), writeChatArchives()

### Community 18 - "Community 18"
Cohesion: 0.67
Nodes (3): codeFileName(), codeLanguageLabel(), PremiumCodeShell()

## Knowledge Gaps
- **132 isolated node(s):** `parsed`, `rows`, `seen`, `results`, `title` (+127 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `App()` connect `Community 1` to `Community 11`?**
  _High betweenness centrality (0.244) - this node is a cross-community bridge._
- **Why does `vercelHandler()` connect `Community 11` to `Community 1`?**
  _High betweenness centrality (0.242) - this node is a cross-community bridge._
- **Why does `useStore` connect `Community 1` to `Community 0`, `Community 3`, `Community 4`, `Community 5`, `Community 12`, `Community 14`?**
  _High betweenness centrality (0.241) - this node is a cross-community bridge._
- **What connects `parsed`, `rows`, `seen` to the rest of the system?**
  _132 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._