# Graph Report - LearningAI  (2026-06-01)

## Corpus Check
- 59 files · ~110,874 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 516 nodes · 847 edges · 30 communities (21 shown, 9 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3e88cd5e`
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
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]

## God Nodes (most connected - your core abstractions)
1. `useMotionPreference()` - 24 edges
2. `useStore` - 24 edges
3. `db` - 16 edges
4. `MemoryOrchestrator` - 15 edges
5. `useTranslation()` - 15 edges
6. `UsageAnalyticsStrip()` - 10 edges
7. `Tutor System Architecture` - 9 edges
8. `Graphify-First Development` - 8 edges
9. `MisconceptionGraph` - 7 edges
10. `PersistentConcept` - 7 edges

## Surprising Connections (you probably didn't know these)
- `startApp()` --calls--> `createTutorServerApp()`  [INFERRED]
  tests/document-ingest.test.mjs → server.ts
- `startApp()` --calls--> `createTutorServerApp()`  [INFERRED]
  tests/system-activity.test.mjs → server.ts
- `vercelHandler()` --calls--> `App()`  [INFERRED]
  server/vercel-handler.ts → src/App.tsx
- `getTutorApp()` --calls--> `createTutorServerApp()`  [EXTRACTED]
  server/vercel-handler.ts → server.ts
- `InteractionRuntimeDiagram()` --calls--> `useMotionPreference()`  [EXTRACTED]
  src/views/RevisionView.tsx → src/hooks/useMotionPreference.ts

## Communities (30 total, 9 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (37): compactSummary(), createLedgerId(), createMasteryDeltaRecords(), createModelSummaryEvidenceRecord(), MasteryDeltaInput, ModelSummaryEvidenceInput, recordMasteryDelta(), recordModelSummaryEvidence() (+29 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (23): BKTEngine, DEFAULT_BKT, CognitiveLoadMonitor, CognitiveLoadState, masteryFromEvidenceAttempt(), IllusionDetector, LearnerModel, BookChatThread (+15 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (39): debugAdminToken, debugTokenFromRequest(), DEEPGRAM_PRICING, deepgramKeyFromRequest(), fetchOpenRouterPricing(), firstHeader(), getOpenRouterServerFallbackKey(), hostNameFromHeader() (+31 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (28): ChatPanel(), FloatingSkillsMenu(), SKILLS, Navigation(), PdfViewer(), SettingsButton(), SiriLiquidGlass(), useMotionPreference() (+20 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (24): AnimatedMarkdown, ChatArchive, gsapMotion, InteractiveCodeBlock, languageExtensions, languageLabels, markdownComponents, MermaidApi (+16 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (33): formatCount(), formatCurrency(), planCardMeta, UsageGraphBar(), UsageInsightsPanel(), UserUsagePanel(), AccessMode, estimateServiceMinutes() (+25 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (24): PatternCard(), pressDots, themes, SvgBeige(), SvgDark(), SvgOrange(), userBrainArchitectureBook, BuiltInBook (+16 more)

### Community 7 - "Community 7"
Cohesion: 0.1
Nodes (19): EvidenceEvent, MasteryDelta, ToolJob, compact(), createToolJobRecord(), normalizeToolJobStatus(), recordToolJobEvent(), ToolJobEventInput (+11 more)

### Community 8 - "Community 8"
Cohesion: 0.1
Nodes (20): 1. Prerequisites, 2. Install, 3. Configure Environment, 4. Run, Book-Scoped Study Workflow, code:text (Upload), code:mermaid (graph TD), code:bash (npm run graphify:query -- "how does chat streaming work?") (+12 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (17): 1. Product Purpose, 2. Runtime Stack, 3. Model Inventory, 4. Zustand Store, 5. Dexie Database, 6. Core Views, 7. Graphify Architecture Layer, 8. Maintenance Boundaries (+9 more)

### Community 10 - "Community 10"
Cohesion: 0.12
Nodes (15): Architecture Boundaries, Change Workflow, code:text (graphify-out/), code:bash (graphify query "your question" --budget 2000 --graph graphif), code:bash (npm run lint), Core Product Boundaries, Design Philosophy, Graph Location (+7 more)

### Community 11 - "Community 11"
Cohesion: 0.2
Nodes (9): createTutorServerApp(), startServer(), config, getTutorApp(), normalizeVercelCatchAllUrl(), vercelHandler(), form, startApp() (+1 more)

### Community 12 - "Community 12"
Cohesion: 0.2
Nodes (9): 1. Mobile-First Design, 2. Component Layout, 3. Typography Scaling, 4. Testing & Validation, Best Practices, Breakpoints Overview, Responsive Design Guidelines, Tailwind Breakpoint Mapping (+1 more)

### Community 13 - "Community 13"
Cohesion: 0.2
Nodes (8): ExpiredIcon(), PendingIcon(), ProgressIcon(), ReviewIcon(), Status, StatusBadge(), SubmittedIcon(), SuccessIcon()

### Community 14 - "Community 14"
Cohesion: 0.22
Nodes (9): archiveChatSnapshot(), chatThreadIdForBook(), chatTitleFromMessages(), defaultChatMessages(), meaningfulChatMessages(), normalizeChatMessages(), persistBookChatThread(), readChatArchives() (+1 more)

### Community 15 - "Community 15"
Cohesion: 0.31
Nodes (8): buildTutorInteractionContext(), countWords(), createTutorInteractionSnapshot(), elapsedFrom(), responsePolicyForMode(), SnapshotInput, TutorInteractionMode, TutorInteractionSnapshot

### Community 16 - "Community 16"
Cohesion: 0.38
Nodes (7): compactModel(), formatCount(), formatCurrency(), formatSeconds(), MessageUsageFooter(), UsageAnalyticsStrip(), useAnimatedNumber()

### Community 19 - "Community 19"
Cohesion: 0.5
Nodes (3): controller, prompt, seenKeys

### Community 22 - "Community 22"
Cohesion: 0.67
Nodes (3): codeFileName(), codeLanguageLabel(), PremiumCodeShell()

## Knowledge Gaps
- **155 isolated node(s):** `deferredPreloadChunks`, `DEEPGRAM_PRICING`, `OpenRouterPricing`, `RequestLike`, `debugAdminToken` (+150 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **9 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `useStore` connect `Community 3` to `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 16`?**
  _High betweenness centrality (0.186) - this node is a cross-community bridge._
- **Why does `App()` connect `Community 3` to `Community 11`?**
  _High betweenness centrality (0.185) - this node is a cross-community bridge._
- **Why does `vercelHandler()` connect `Community 11` to `Community 3`?**
  _High betweenness centrality (0.183) - this node is a cross-community bridge._
- **What connects `deferredPreloadChunks`, `DEEPGRAM_PRICING`, `OpenRouterPricing` to the rest of the system?**
  _155 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.07 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._