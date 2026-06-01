# Graph Report - LearningAI  (2026-06-01)

## Corpus Check
- 74 files · ~131,039 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 659 nodes · 1096 edges · 40 communities (27 shown, 13 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `631b5e7c`
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
- [[_COMMUNITY_Community 37|Community 37]]

## God Nodes (most connected - your core abstractions)
1. `useMotionPreference()` - 24 edges
2. `useStore` - 24 edges
3. `db` - 21 edges
4. `MemoryOrchestrator` - 15 edges
5. `useTranslation()` - 15 edges
6. `createRetrievalEventRecord()` - 10 edges
7. `UsageAnalyticsStrip()` - 10 edges
8. `createCorrectionEventRecord()` - 9 edges
9. `PersistentConcept` - 9 edges
10. `Tutor System Architecture` - 9 edges

## Surprising Connections (you probably didn't know these)
- `searchSerper()` --calls--> `stableId()`  [INFERRED]
  server.mjs → server/web-search.ts
- `searchSerper()` --calls--> `abortError()`  [INFERRED]
  server.mjs → server/web-search.ts
- `searchSerper()` --calls--> `normalizeRows()`  [INFERRED]
  server.mjs → server/web-search.ts
- `searchSerper()` --calls--> `wait()`  [INFERRED]
  server.mjs → server/web-search.ts
- `normalizeBrainRuntimeSettings()` --calls--> `clampInteger()`  [INFERRED]
  server.mjs → src/lib/brainRuntimeSettings.ts

## Communities (40 total, 13 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (50): ChatPanel(), FloatingSkillsMenu(), SKILLS, Navigation(), PdfViewer(), formatCount(), formatCurrency(), planCardMeta (+42 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (52): debugAdminToken, debugTokenFromRequest(), DEEPGRAM_PRICING, deepgramKeyFromRequest(), fetchOpenRouterPricing(), firstHeader(), getOpenRouterServerFallbackKey(), hostNameFromHeader() (+44 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (33): BKTAttemptOptions, BKTEngine, DEFAULT_BKT, CognitiveLoadMonitor, CognitiveLoadState, masteryFromEvidenceAttempt(), IllusionDetector, LearnerModel (+25 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (38): compactSummary(), createLedgerId(), createMasteryDeltaRecords(), createModelSummaryEvidenceRecord(), MasteryDeltaInput, ModelSummaryEvidenceInput, recordMasteryDelta(), recordModelSummaryEvidence() (+30 more)

### Community 4 - "Community 4"
Cohesion: 0.04
Nodes (27): AnimatedMarkdown, ChatArchive, gsapMotion, InteractiveCodeBlock, languageExtensions, languageLabels, markdownComponents, MermaidApi (+19 more)

### Community 5 - "Community 5"
Cohesion: 0.07
Nodes (35): cleanList(), compact(), CorrectionEventActionInput, correctionEventIdFor(), CorrectionEventInput, CorrectionEventStatusInput, CorrectionEventTargetInput, createCorrectionEventRecord() (+27 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (24): PatternCard(), pressDots, themes, SvgBeige(), SvgDark(), SvgOrange(), userBrainArchitectureBook, BuiltInBook (+16 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (31): assistantMessage, codeBlockMatch, createTutorServerApp(), domain, end, explicitSearch, headerToken, hostname (+23 more)

### Community 8 - "Community 8"
Cohesion: 0.14
Nodes (18): RetrievalEvent, cosineSimilarity(), generateEmbedding(), normalize(), TOKEN_STOPWORDS, tokenize(), boundedScore(), cleanList() (+10 more)

### Community 9 - "Community 9"
Cohesion: 0.1
Nodes (20): 1. Prerequisites, 2. Install, 3. Configure Environment, 4. Run, Book-Scoped Study Workflow, code:text (Upload), code:mermaid (graph TD), code:bash (npm run graphify:query -- "how does chat streaming work?") (+12 more)

### Community 10 - "Community 10"
Cohesion: 0.11
Nodes (17): 1. Product Purpose, 2. Runtime Stack, 3. Model Inventory, 4. Zustand Store, 5. Dexie Database, 6. Core Views, 7. Graphify Architecture Layer, 8. Maintenance Boundaries (+9 more)

### Community 11 - "Community 11"
Cohesion: 0.12
Nodes (15): Architecture Boundaries, Change Workflow, code:text (graphify-out/), code:bash (graphify query "your question" --budget 2000 --graph graphif), code:bash (npm run lint), Core Product Boundaries, Design Philosophy, Graph Location (+7 more)

### Community 12 - "Community 12"
Cohesion: 0.23
Nodes (14): chooseFlashcardConcept(), compact(), containsConceptPhrase(), createFlashcardForStorage(), ensurePersistentConceptForLearningBookConcept(), FlashcardConceptResolution, FlashcardStorageContext, GeneratedFlashcardInput (+6 more)

### Community 13 - "Community 13"
Cohesion: 0.33
Nodes (10): MemoryEvent, clamp01(), cleanSourceIds(), compact(), createMemoryEventRecord(), memoryEventIdFor(), MemoryEventInput, MemoryEventStatusInput (+2 more)

### Community 14 - "Community 14"
Cohesion: 0.2
Nodes (9): 1. Mobile-First Design, 2. Component Layout, 3. Typography Scaling, 4. Testing & Validation, Best Practices, Breakpoints Overview, Responsive Design Guidelines, Tailwind Breakpoint Mapping (+1 more)

### Community 15 - "Community 15"
Cohesion: 0.2
Nodes (8): ExpiredIcon(), PendingIcon(), ProgressIcon(), ReviewIcon(), Status, StatusBadge(), SubmittedIcon(), SuccessIcon()

### Community 16 - "Community 16"
Cohesion: 0.22
Nodes (9): archiveChatSnapshot(), chatThreadIdForBook(), chatTitleFromMessages(), defaultChatMessages(), meaningfulChatMessages(), normalizeChatMessages(), persistBookChatThread(), readChatArchives() (+1 more)

### Community 17 - "Community 17"
Cohesion: 0.31
Nodes (8): buildTutorInteractionContext(), countWords(), createTutorInteractionSnapshot(), elapsedFrom(), responsePolicyForMode(), SnapshotInput, TutorInteractionMode, TutorInteractionSnapshot

### Community 18 - "Community 18"
Cohesion: 0.36
Nodes (8): ToolJob, compact(), createToolJobRecord(), normalizeToolJobStatus(), recordToolJobEvent(), ToolJobEventInput, toolJobIdFor(), ToolJobStatusInput

### Community 20 - "Community 20"
Cohesion: 0.38
Nodes (7): compactModel(), formatCount(), formatCurrency(), formatSeconds(), MessageUsageFooter(), UsageAnalyticsStrip(), useAnimatedNumber()

### Community 21 - "Community 21"
Cohesion: 0.4
Nodes (3): calls, card, engine

### Community 23 - "Community 23"
Cohesion: 0.5
Nodes (3): concept, persistent, resolution

### Community 25 - "Community 25"
Cohesion: 0.5
Nodes (3): controller, prompt, seenKeys

### Community 27 - "Community 27"
Cohesion: 0.67
Nodes (3): codeFileName(), codeLanguageLabel(), PremiumCodeShell()

## Knowledge Gaps
- **212 isolated node(s):** `parsed`, `rows`, `seen`, `results`, `title` (+207 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `db` connect `Community 2` to `Community 0`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 8`, `Community 12`, `Community 13`, `Community 18`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Why does `BrainRuntimeSettings` connect `Community 1` to `Community 0`, `Community 5`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Why does `DEFAULT_BRAIN_RUNTIME_SETTINGS` connect `Community 1` to `Community 0`, `Community 5`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **What connects `parsed`, `rows`, `seen` to the rest of the system?**
  _212 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._