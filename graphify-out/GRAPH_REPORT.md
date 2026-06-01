# Graph Report - LearningAI  (2026-06-02)

## Corpus Check
- 78 files · ~127,150 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 738 nodes · 1301 edges · 59 communities (46 shown, 13 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `022e2dd8`
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

## God Nodes (most connected - your core abstractions)
1. `useMotionPreference()` - 24 edges
2. `useStore` - 24 edges
3. `db` - 22 edges
4. `MemoryOrchestrator` - 15 edges
5. `useTranslation()` - 15 edges
6. `compact()` - 13 edges
7. `createArtifactRecord()` - 13 edges
8. `createCitationStateRecord()` - 10 edges
9. `applyCorrectionPropagation()` - 10 edges
10. `createRetrievalEventRecord()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `startApp()` --calls--> `createTutorServerApp()`  [INFERRED]
  tests/runtime-settings.test.mjs → server.ts
- `verifyLocalCitationIntegrity()` --calls--> `result`  [INFERRED]
  src/memory/artifact.records.ts → tests/artifact-records.test.mjs
- `startApp()` --calls--> `createTutorServerApp()`  [INFERRED]
  tests/document-ingest.test.mjs → server.ts
- `startApp()` --calls--> `createTutorServerApp()`  [INFERRED]
  tests/system-activity.test.mjs → server.ts
- `vercelHandler()` --calls--> `App()`  [INFERRED]
  server/vercel-handler.ts → src/App.tsx

## Communities (59 total, 13 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.08
Nodes (35): recordGeneratedNotesArtifact(), compactSummary(), createLedgerId(), createMasteryDeltaRecords(), createModelSummaryEvidenceRecord(), MasteryDeltaInput, ModelSummaryEvidenceInput, recordMasteryDelta() (+27 more)

### Community 1 - "Community 1"
Cohesion: 0.04
Nodes (29): AnimatedMarkdown, ChatArchive, codeFileName(), codeLanguageLabel(), gsapMotion, InteractiveCodeBlock, languageExtensions, languageLabels (+21 more)

### Community 2 - "Community 2"
Cohesion: 0.13
Nodes (41): applyArtifactCitationState(), applyCitationIntegrityResult(), artifactRecordIdFor(), ArtifactStatusInput, ArtifactVerificationInput, artifactVerificationStateForCitationStates(), CitationIntegrityResult, CitationIntegrityState (+33 more)

### Community 3 - "Community 3"
Cohesion: 0.11
Nodes (34): addRows(), addTarget(), applyCorrectionPropagation(), buildCorrectionPropagationMetadata(), buildCorrectionPropagationPatch(), cleanList(), collectCorrectionPropagationTargets(), compact() (+26 more)

### Community 4 - "Community 4"
Cohesion: 0.07
Nodes (20): ChapterAudioOverview, userBrainChapterAudioOverviews, userBrainArchitectureBook, BuiltInBook, builtInBookIds, builtInBooks, designTokens, FlashcardUI (+12 more)

### Community 5 - "Community 5"
Cohesion: 0.08
Nodes (18): debugAdminToken, DEEPGRAM_PRICING, fetchOpenRouterPricing(), normalizeModelPricing(), openRouterCost(), OpenRouterPricing, RequestLike, roundCost() (+10 more)

### Community 6 - "Community 6"
Cohesion: 0.09
Nodes (16): Annotation, AppState, ChatUsage, Concept, emptyChatUsage, emptyPricing, emptyVoiceUsage, emptyWebUsage (+8 more)

### Community 7 - "Community 7"
Cohesion: 0.14
Nodes (18): RetrievalEvent, cosineSimilarity(), generateEmbedding(), normalize(), TOKEN_STOPWORDS, tokenize(), boundedScore(), cleanList() (+10 more)

### Community 8 - "Community 8"
Cohesion: 0.1
Nodes (20): 1. Prerequisites, 2. Install, 3. Configure Environment, 4. Run, Book-Scoped Study Workflow, code:text (Upload), code:mermaid (graph TD), code:bash (npm run graphify:query -- "how does chat streaming work?") (+12 more)

### Community 9 - "Community 9"
Cohesion: 0.18
Nodes (14): ChatPanel(), Navigation(), PdfViewer(), SettingsButton(), Language, translations, useTranslation(), AdminView (+6 more)

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (15): ActivityStatus, AdminRequestTimeline, AdminTab, AdminView(), correctionImpactedRows(), correctionPropagationFor(), formatTime(), objectRecord() (+7 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (17): 1. Product Purpose, 2. Runtime Stack, 3. Model Inventory, 4. Zustand Store, 5. Dexie Database, 6. Core Views, 7. Graphify Architecture Layer, 8. Maintenance Boundaries (+9 more)

### Community 12 - "Community 12"
Cohesion: 0.12
Nodes (15): Architecture Boundaries, Change Workflow, code:text (graphify-out/), code:bash (graphify query "your question" --budget 2000 --graph graphif), code:bash (npm run lint), Core Product Boundaries, Design Philosophy, Graph Location (+7 more)

### Community 13 - "Community 13"
Cohesion: 0.19
Nodes (6): CognitiveLoadMonitor, CognitiveLoadState, IllusionDetector, db, PrerequisiteDAG, ZPDCalculator

### Community 14 - "Community 14"
Cohesion: 0.2
Nodes (9): createTutorServerApp(), startServer(), config, getTutorApp(), normalizeVercelCatchAllUrl(), vercelHandler(), form, startApp() (+1 more)

### Community 15 - "Community 15"
Cohesion: 0.17
Nodes (11): abortError(), cache, formatSourcesForPrompt(), NormalizedWebSource, normalizeRows(), SearchOptions, searchSerper(), SERPER_ENDPOINTS (+3 more)

### Community 16 - "Community 16"
Cohesion: 0.27
Nodes (13): formatCount(), formatCurrency(), planCardMeta, UsageGraphBar(), UsageInsightsPanel(), UserUsagePanel(), AccessMode, estimateServiceMinutes() (+5 more)

### Community 17 - "Community 17"
Cohesion: 0.18
Nodes (14): BetaDiagnosticItem, BetaDiagnosticOverallStatus, BetaDiagnosticsExportInput, BetaDiagnosticsInput, BetaDiagnosticsSnapshot, BetaDiagnosticStatus, buildBetaDiagnosticsExport(), buildBetaDiagnosticsSnapshot() (+6 more)

### Community 18 - "Community 18"
Cohesion: 0.23
Nodes (14): chooseFlashcardConcept(), compact(), containsConceptPhrase(), createFlashcardForStorage(), ensurePersistentConceptForLearningBookConcept(), FlashcardConceptResolution, FlashcardStorageContext, GeneratedFlashcardInput (+6 more)

### Community 19 - "Community 19"
Cohesion: 0.18
Nodes (9): BookChatThread, BrainDatabase, CitationState, ConversationInteraction, LearningChapter, LearningEntry, Misconception, SessionMemoryRecord (+1 more)

### Community 20 - "Community 20"
Cohesion: 0.23
Nodes (12): debugTokenFromRequest(), deepgramKeyFromRequest(), firstHeader(), getOpenRouterServerFallbackKey(), hostNameFromHeader(), isAuthorizedDebugRequest(), isLoopbackAddress(), isLoopbackHost() (+4 more)

### Community 21 - "Community 21"
Cohesion: 0.17
Nodes (6): LearningBook, LearningDocument, brainOrchestrator, CardTarget, documentObjectUrlCache, StudyIntroSplashProps

### Community 22 - "Community 22"
Cohesion: 0.18
Nodes (4): PersistentConcept, ProductiveFailureEngine, StruggleState, ScaffoldingEngine

### Community 23 - "Community 23"
Cohesion: 0.33
Nodes (10): MemoryEvent, clamp01(), cleanSourceIds(), compact(), createMemoryEventRecord(), memoryEventIdFor(), MemoryEventInput, MemoryEventStatusInput (+2 more)

### Community 24 - "Community 24"
Cohesion: 0.2
Nodes (9): 1. Mobile-First Design, 2. Component Layout, 3. Typography Scaling, 4. Testing & Validation, Best Practices, Breakpoints Overview, Responsive Design Guidelines, Tailwind Breakpoint Mapping (+1 more)

### Community 25 - "Community 25"
Cohesion: 0.33
Nodes (9): ModelRun, compact(), createModelRunRecord(), ModelRunEventInput, modelRunIdFor(), ModelRunStatusInput, nonNegativeNumber(), normalizeModelRunStatus() (+1 more)

### Community 26 - "Community 26"
Cohesion: 0.2
Nodes (8): ExpiredIcon(), PendingIcon(), ProgressIcon(), ReviewIcon(), Status, StatusBadge(), SubmittedIcon(), SuccessIcon()

### Community 27 - "Community 27"
Cohesion: 0.29
Nodes (7): FloatingSkillsMenu(), SKILLS, SiriLiquidGlass(), useMotionPreference(), InteractionRuntimeDiagram(), LiveComponentPreview(), RevisionView()

### Community 28 - "Community 28"
Cohesion: 0.2
Nodes (9): artifact, { artifact, citation }, artifactA, artifactB, citation, citationA, citationB, record (+1 more)

### Community 29 - "Community 29"
Cohesion: 0.24
Nodes (9): BRAIN_RUNTIME_SETTING_LIMITS, BrainRuntimeSettings, BrainWebSearchPolicy, clampInteger(), DEFAULT_BRAIN_RUNTIME_SETTINGS, normalizeBrainRuntimeSettings(), normalizeWebSearchPolicy(), WEB_SEARCH_POLICIES (+1 more)

### Community 30 - "Community 30"
Cohesion: 0.36
Nodes (8): ToolJob, compact(), createToolJobRecord(), normalizeToolJobStatus(), recordToolJobEvent(), ToolJobEventInput, toolJobIdFor(), ToolJobStatusInput

### Community 31 - "Community 31"
Cohesion: 0.22
Nodes (9): archiveChatSnapshot(), chatThreadIdForBook(), chatTitleFromMessages(), defaultChatMessages(), meaningfulChatMessages(), normalizeChatMessages(), persistBookChatThread(), readChatArchives() (+1 more)

### Community 32 - "Community 32"
Cohesion: 0.31
Nodes (8): buildTutorInteractionContext(), countWords(), createTutorInteractionSnapshot(), elapsedFrom(), responsePolicyForMode(), SnapshotInput, TutorInteractionMode, TutorInteractionSnapshot

### Community 33 - "Community 33"
Cohesion: 0.43
Nodes (7): compact(), flashcardEvidenceConceptId(), FlashcardReviewEvidenceResult, flashcardReviewOutcome(), flashcardReviewSummary(), recordFlashcardReviewEvidence(), RevisionEvidenceEngine

### Community 35 - "Community 35"
Cohesion: 0.36
Nodes (6): PatternCard(), pressDots, themes, SvgBeige(), SvgDark(), SvgOrange()

### Community 36 - "Community 36"
Cohesion: 0.25
Nodes (3): AnalyticsView(), COLORS, ConceptAnalyticsRecord

### Community 37 - "Community 37"
Cohesion: 0.25
Nodes (7): citationPatch, event, evidencePatch, id, masteryPatch, metadata, record

### Community 38 - "Community 38"
Cohesion: 0.38
Nodes (7): compactModel(), formatCount(), formatCurrency(), formatSeconds(), MessageUsageFooter(), UsageAnalyticsStrip(), useAnimatedNumber()

### Community 39 - "Community 39"
Cohesion: 0.4
Nodes (3): BKTAttemptOptions, BKTEngine, DEFAULT_BKT

### Community 41 - "Community 41"
Cohesion: 0.4
Nodes (4): ChatPhase, Message, MindMapLink, MindMapNode

### Community 42 - "Community 42"
Cohesion: 0.4
Nodes (3): calls, card, engine

### Community 45 - "Community 45"
Cohesion: 0.5
Nodes (3): notCheckedSnapshot, payload, snapshot

### Community 46 - "Community 46"
Cohesion: 0.5
Nodes (3): concept, persistent, resolution

### Community 47 - "Community 47"
Cohesion: 0.5
Nodes (3): controller, prompt, seenKeys

## Knowledge Gaps
- **226 isolated node(s):** `deferredPreloadChunks`, `DEEPGRAM_PRICING`, `OpenRouterPricing`, `RequestLike`, `debugAdminToken` (+221 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `db` connect `Community 13` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 36`, `Community 7`, `Community 39`, `Community 9`, `Community 10`, `Community 18`, `Community 19`, `Community 21`, `Community 22`, `Community 23`, `Community 25`, `Community 30`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Why does `BrainRuntimeSettings` connect `Community 29` to `Community 10`, `Community 5`, `Community 6`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **Why does `DEFAULT_BRAIN_RUNTIME_SETTINGS` connect `Community 29` to `Community 10`, `Community 5`, `Community 6`?**
  _High betweenness centrality (0.035) - this node is a cross-community bridge._
- **What connects `deferredPreloadChunks`, `DEEPGRAM_PRICING`, `OpenRouterPricing` to the rest of the system?**
  _226 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.04 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._