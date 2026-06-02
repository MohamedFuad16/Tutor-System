# Graph Report - LearningAI  (2026-06-02)

## Corpus Check
- 82 files · ~146,682 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 848 nodes · 1434 edges · 62 communities (45 shown, 17 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 7 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0d348411`
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
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]

## God Nodes (most connected - your core abstractions)
1. `useMotionPreference()` - 24 edges
2. `useStore` - 24 edges
3. `db` - 22 edges
4. `compact()` - 16 edges
5. `MemoryOrchestrator` - 15 edges
6. `useTranslation()` - 15 edges
7. `createArtifactRecord()` - 14 edges
8. `verifyLocalCitationIntegrity()` - 12 edges
9. `createCitationStateRecord()` - 11 edges
10. `applyCorrectionPropagation()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `vercelHandler()` --calls--> `App()`  [INFERRED]
  server/vercel-handler.ts → src/App.tsx
- `searchSerper()` --calls--> `stableId()`  [INFERRED]
  server.mjs → server/web-search.ts
- `searchSerper()` --calls--> `abortError()`  [INFERRED]
  server.mjs → server/web-search.ts
- `searchSerper()` --calls--> `normalizeRows()`  [INFERRED]
  server.mjs → server/web-search.ts
- `searchSerper()` --calls--> `wait()`  [INFERRED]
  server.mjs → server/web-search.ts

## Communities (62 total, 17 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.13
Nodes (13): ArtifactRecord, BookChatThread, BrainDatabase, ConversationInteraction, LearningChapter, LearningEntry, Misconception, SessionMemoryRecord (+5 more)

### Community 1 - "Community 1"
Cohesion: 0.09
Nodes (34): compactSummary(), createLedgerId(), createMasteryDeltaRecords(), createModelSummaryEvidenceRecord(), MasteryDeltaInput, ModelSummaryEvidenceInput, recordMasteryDelta(), recordModelSummaryEvidence() (+26 more)

### Community 2 - "Community 2"
Cohesion: 0.06
Nodes (30): PatternCard(), pressDots, themes, SvgBeige(), SvgDark(), SvgOrange(), audioOverviewEntries, builtInBookAudioOverviews (+22 more)

### Community 3 - "Community 3"
Cohesion: 0.04
Nodes (23): AnimatedMarkdown, ChatArchive, END_INTENT_PATTERNS, gsapMotion, InteractiveCodeBlock, languageExtensions, languageLabels, markdownComponents (+15 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (49): normalizeBrainRuntimeSettings(), BRAIN_RUNTIME_SETTING_LIMITS, BrainRuntimeSettings, BrainWebSearchPolicy, clampInteger(), DEFAULT_BRAIN_RUNTIME_SETTINGS, normalizeBrainRuntimeSettings(), normalizeWebSearchPolicy() (+41 more)

### Community 5 - "Community 5"
Cohesion: 0.12
Nodes (46): applyArtifactCitationState(), applyCitationIntegrityResult(), artifactRecordIdFor(), ArtifactStatusInput, ArtifactVerificationInput, artifactVerificationStateForCitationStates(), CitationIntegrityResult, CitationIntegrityState (+38 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (34): addRows(), addTarget(), applyCorrectionPropagation(), buildCorrectionPropagationMetadata(), buildCorrectionPropagationPatch(), cleanList(), collectCorrectionPropagationTargets(), compact() (+26 more)

### Community 7 - "Community 7"
Cohesion: 0.07
Nodes (24): args, bookArg, chapterArg, dryRun, execFileAsync, existingFiles, modelArg, outputDir (+16 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (26): assistantMessage, codeBlockMatch, createTutorServerApp(), domain, end, explicitSearch, headerToken, hostname (+18 more)

### Community 9 - "Community 9"
Cohesion: 0.08
Nodes (17): debugAdminToken, DEEPGRAM_PRICING, fetchOpenRouterPricing(), normalizeModelPricing(), openRouterCost(), OpenRouterPricing, RequestLike, roundCost() (+9 more)

### Community 10 - "Community 10"
Cohesion: 0.09
Nodes (22): 1. Prerequisites, 2. Install, 3. Configure Environment, 4. Run, 5. Generate Stored Chapter Audio, Book-Scoped Study Workflow, code:text (Upload), code:mermaid (graph TD) (+14 more)

### Community 11 - "Community 11"
Cohesion: 0.14
Nodes (18): RetrievalEvent, cosineSimilarity(), generateEmbedding(), normalize(), TOKEN_STOPWORDS, tokenize(), boundedScore(), cleanList() (+10 more)

### Community 12 - "Community 12"
Cohesion: 0.08
Nodes (17): AppState, ChatUsage, Concept, emptyChatUsage, emptyPricing, emptyVoiceUsage, emptyWebUsage, NormalizedWebSource (+9 more)

### Community 13 - "Community 13"
Cohesion: 0.13
Nodes (9): Language, translations, LearningBook, LearningDocument, brainOrchestrator, Annotation, CardTarget, documentObjectUrlCache (+1 more)

### Community 14 - "Community 14"
Cohesion: 0.16
Nodes (14): now, searchSerper(), abortError(), cache, detectFreshnessSearch(), formatSourcesForPrompt(), NormalizedWebSource, normalizeRows() (+6 more)

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (17): 1. Product Purpose, 2. Runtime Stack, 3. Model Inventory, 4. Zustand Store, 5. Dexie Database, 6. Core Views, 7. Graphify Architecture Layer, 8. Maintenance Boundaries (+9 more)

### Community 16 - "Community 16"
Cohesion: 0.12
Nodes (15): Architecture Boundaries, Change Workflow, code:text (graphify-out/), code:bash (graphify query "your question" --budget 2000 --graph graphif), code:bash (npm run lint), Core Product Boundaries, Design Philosophy, Graph Location (+7 more)

### Community 17 - "Community 17"
Cohesion: 0.12
Nodes (15): checkedInFiles, existingFiles, expectedBooks, expectedTotal, missingRows, outputFiles, overviewIds, presentRows (+7 more)

### Community 18 - "Community 18"
Cohesion: 0.27
Nodes (13): formatCount(), formatCurrency(), planCardMeta, UsageGraphBar(), UsageInsightsPanel(), UserUsagePanel(), AccessMode, estimateServiceMinutes() (+5 more)

### Community 19 - "Community 19"
Cohesion: 0.23
Nodes (14): chooseFlashcardConcept(), compact(), containsConceptPhrase(), createFlashcardForStorage(), ensurePersistentConceptForLearningBookConcept(), FlashcardConceptResolution, FlashcardStorageContext, GeneratedFlashcardInput (+6 more)

### Community 20 - "Community 20"
Cohesion: 0.13
Nodes (14): artifact, { artifact, citation }, { artifact, citation, result }, artifactA, artifactB, citation, citationA, citationB (+6 more)

### Community 21 - "Community 21"
Cohesion: 0.23
Nodes (12): debugTokenFromRequest(), deepgramKeyFromRequest(), firstHeader(), getOpenRouterServerFallbackKey(), hostNameFromHeader(), isAuthorizedDebugRequest(), isLoopbackAddress(), isLoopbackHost() (+4 more)

### Community 22 - "Community 22"
Cohesion: 0.33
Nodes (10): MemoryEvent, clamp01(), cleanSourceIds(), compact(), createMemoryEventRecord(), memoryEventIdFor(), MemoryEventInput, MemoryEventStatusInput (+2 more)

### Community 23 - "Community 23"
Cohesion: 0.21
Nodes (12): ChatPanel(), Navigation(), PdfViewer(), SettingsButton(), useTranslation(), AdminView, AnalyticsView, App() (+4 more)

### Community 24 - "Community 24"
Cohesion: 0.2
Nodes (9): 1. Mobile-First Design, 2. Component Layout, 3. Typography Scaling, 4. Testing & Validation, Best Practices, Breakpoints Overview, Responsive Design Guidelines, Tailwind Breakpoint Mapping (+1 more)

### Community 25 - "Community 25"
Cohesion: 0.33
Nodes (9): ModelRun, compact(), createModelRunRecord(), ModelRunEventInput, modelRunIdFor(), ModelRunStatusInput, nonNegativeNumber(), normalizeModelRunStatus() (+1 more)

### Community 26 - "Community 26"
Cohesion: 0.43
Nodes (7): compact(), flashcardEvidenceConceptId(), FlashcardReviewEvidenceResult, flashcardReviewOutcome(), flashcardReviewSummary(), recordFlashcardReviewEvidence(), RevisionEvidenceEngine

### Community 27 - "Community 27"
Cohesion: 0.2
Nodes (8): ExpiredIcon(), PendingIcon(), ProgressIcon(), ReviewIcon(), Status, StatusBadge(), SubmittedIcon(), SuccessIcon()

### Community 28 - "Community 28"
Cohesion: 0.22
Nodes (9): archiveChatSnapshot(), chatThreadIdForBook(), chatTitleFromMessages(), defaultChatMessages(), meaningfulChatMessages(), normalizeChatMessages(), persistBookChatThread(), readChatArchives() (+1 more)

### Community 29 - "Community 29"
Cohesion: 0.31
Nodes (8): buildTutorInteractionContext(), countWords(), createTutorInteractionSnapshot(), elapsedFrom(), responsePolicyForMode(), SnapshotInput, TutorInteractionMode, TutorInteractionSnapshot

### Community 30 - "Community 30"
Cohesion: 0.17
Nodes (8): FloatingSkillsMenu(), SKILLS, SiriLiquidGlass(), useMotionPreference(), AnalyticsView(), COLORS, ConceptAnalyticsRecord, RevisionView()

### Community 31 - "Community 31"
Cohesion: 0.25
Nodes (7): citationPatch, event, evidencePatch, id, masteryPatch, metadata, record

### Community 32 - "Community 32"
Cohesion: 0.57
Nodes (4): config, getTutorApp(), normalizeVercelCatchAllUrl(), vercelHandler()

### Community 33 - "Community 33"
Cohesion: 0.38
Nodes (7): compactModel(), formatCount(), formatCurrency(), formatSeconds(), MessageUsageFooter(), UsageAnalyticsStrip(), useAnimatedNumber()

### Community 35 - "Community 35"
Cohesion: 0.4
Nodes (3): calls, card, engine

### Community 37 - "Community 37"
Cohesion: 0.5
Nodes (3): notCheckedSnapshot, payload, snapshot

### Community 38 - "Community 38"
Cohesion: 0.5
Nodes (3): concept, persistent, resolution

### Community 40 - "Community 40"
Cohesion: 0.5
Nodes (3): controller, prompt, seenKeys

### Community 43 - "Community 43"
Cohesion: 0.67
Nodes (3): codeFileName(), codeLanguageLabel(), PremiumCodeShell()

### Community 56 - "Community 56"
Cohesion: 0.4
Nodes (3): BKTAttemptOptions, BKTEngine, DEFAULT_BKT

### Community 58 - "Community 58"
Cohesion: 0.19
Nodes (6): CognitiveLoadMonitor, CognitiveLoadState, IllusionDetector, db, PrerequisiteDAG, ZPDCalculator

### Community 63 - "Community 63"
Cohesion: 0.18
Nodes (4): PersistentConcept, ProductiveFailureEngine, StruggleState, ScaffoldingEngine

## Knowledge Gaps
- **298 isolated node(s):** `parsed`, `rows`, `seen`, `results`, `title` (+293 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **17 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `db` connect `Community 58` to `Community 0`, `Community 1`, `Community 2`, `Community 3`, `Community 4`, `Community 5`, `Community 6`, `Community 11`, `Community 13`, `Community 19`, `Community 22`, `Community 56`, `Community 25`, `Community 30`, `Community 63`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **Why does `BrainRuntimeSettings` connect `Community 4` to `Community 9`, `Community 12`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **Why does `DEFAULT_BRAIN_RUNTIME_SETTINGS` connect `Community 4` to `Community 9`, `Community 12`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `parsed`, `rows`, `seen` to the rest of the system?**
  _298 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.09 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._