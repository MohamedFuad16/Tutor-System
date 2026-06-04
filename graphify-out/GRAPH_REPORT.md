# Graph Report - LearningAI  (2026-06-04)

## Corpus Check
- 98 files · ~178,560 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1157 nodes · 2012 edges · 64 communities (53 shown, 11 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0490ef78`
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
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]

## God Nodes (most connected - your core abstractions)
1. `db` - 24 edges
2. `useMotionPreference()` - 24 edges
3. `useStore` - 24 edges
4. `compact()` - 17 edges
5. `MemoryOrchestrator` - 17 edges
6. `useTranslation()` - 15 edges
7. `createArtifactRecord()` - 14 edges
8. `verifyLocalCitationIntegrity()` - 14 edges
9. `recordMemoryEvent()` - 13 edges
10. `buildBrainContextPacket()` - 11 edges

## Surprising Connections (you probably didn't know these)
- `startApp()` --calls--> `createTutorServerApp()`  [INFERRED]
  tests/runtime-settings.test.mjs → server.ts
- `startApp()` --calls--> `createTutorServerApp()`  [INFERRED]
  tests/document-ingest.test.mjs → server.ts
- `startApp()` --calls--> `createTutorServerApp()`  [INFERRED]
  tests/system-activity.test.mjs → server.ts
- `startVoiceApp()` --calls--> `createTutorServerApp()`  [INFERRED]
  tests/system-activity.test.mjs → server.ts
- `vercelHandler()` --calls--> `App()`  [INFERRED]
  server/vercel-handler.ts → src/App.tsx

## Communities (64 total, 11 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (50): BackgroundJobEventInput, backgroundJobIdFor(), BackgroundJobRunResult, BackgroundJobStatusInput, compact(), createBackgroundJobRecord(), errorSummary(), jobAnchorFor() (+42 more)

### Community 1 - "Community 1"
Cohesion: 0.05
Nodes (65): BASE_CHAT_AGENT_TOOL_DEFINITIONS, buildChatAgentToolDefinitions(), ChatAgentToolDefinition, chatAgentToolNames(), CURRENT_PAGE_CHAT_AGENT_TOOL_DEFINITION, buildTutorInteractionContext(), countWords(), createTutorInteractionSnapshot() (+57 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (39): CognitiveLoadMonitor, CognitiveLoadState, IllusionDetector, LearnerModel, BackgroundJob, BookChatThread, BrainDatabase, CorrectionEvent (+31 more)

### Community 3 - "Community 3"
Cohesion: 0.03
Nodes (31): AnimatedMarkdown, ChatArchive, END_INTENT_PATTERNS, gsapMotion, InteractiveCodeBlock, languageExtensions, languageLabels, markdownComponents (+23 more)

### Community 4 - "Community 4"
Cohesion: 0.05
Nodes (45): compactBrainContextMetadata(), compactStringList(), debugAdminToken, debugTokenFromRequest(), DEEPGRAM_PRICING, deepgramKeyFromRequest(), fetchOpenRouterPricing(), firstHeader() (+37 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (56): applyArtifactCitationState(), applyCitationIntegrityResult(), artifactRecordIdFor(), ArtifactStatusInput, ArtifactVerificationInput, artifactVerificationStateForCitationStates(), CitationIntegrityResult, CitationIntegrityState (+48 more)

### Community 6 - "Community 6"
Cohesion: 0.04
Nodes (52): aggregateFlow, blockedFlow, blockedPreflight, chatBundle, chatMultiPdfSignal, chatOnlyMemoryFlow, chatPrompt, checklist (+44 more)

### Community 7 - "Community 7"
Cohesion: 0.05
Nodes (32): audioOverviewEntries, builtInBookAudioOverviews, ChapterAudioOverview, ChapterAudioOverviewManifestEntry, userBrainArchitectureBook, Flashcard, compact(), flashcardEvidenceConceptId() (+24 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (31): BRAIN_RUNTIME_SETTING_LIMITS, BrainRuntimeSettings, BrainWebSearchPolicy, clampInteger(), DEFAULT_BRAIN_RUNTIME_SETTINGS, normalizeBrainRuntimeSettings(), normalizeWebSearchPolicy(), WEB_SEARCH_POLICIES (+23 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (39): AnswerEvidenceEngine, AnswerEvidenceType, asRecord(), boundedText(), clamp01(), compact(), ConceptPromotionStatus, defaultAnswerEvidenceEngine (+31 more)

### Community 10 - "Community 10"
Cohesion: 0.05
Nodes (39): BetaBrainFlowLedgerInput, BetaBrainFlowSignal, BetaBrainFlowSignalEvidence, BetaDiagnosticItem, BetaDiagnosticOverallStatus, BetaDiagnosticsExportInput, BetaDiagnosticsInput, BetaDiagnosticsSnapshot (+31 more)

### Community 11 - "Community 11"
Cohesion: 0.07
Nodes (27): args, bookArg, chapterArg, concatMp3Files(), dryRun, execFileAsync, existingFiles, modelArg (+19 more)

### Community 12 - "Community 12"
Cohesion: 0.1
Nodes (30): BKTAttemptOptions, BKTEngine, buildBKTConfidenceUpdate(), DEFAULT_BKT, compactSummary(), createLedgerId(), createMasteryDeltaRecords(), createModelSummaryEvidenceRecord() (+22 more)

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (35): addRows(), addTarget(), applyCorrectionPropagation(), buildConceptCorrectionPatch(), buildCorrectionPropagationMetadata(), buildCorrectionPropagationPatch(), cleanList(), collectCorrectionPropagationTargets() (+27 more)

### Community 14 - "Community 14"
Cohesion: 0.11
Nodes (17): createTutorServerApp(), startServer(), config, getTutorApp(), normalizeVercelCatchAllUrl(), vercelHandler(), form, startApp() (+9 more)

### Community 15 - "Community 15"
Cohesion: 0.09
Nodes (22): 1. Prerequisites, 2. Install, 3. Configure Environment, 4. Run, 5. Generate Stored Chapter Audio, Book-Scoped Study Workflow, code:text (Upload), code:mermaid (graph TD) (+14 more)

### Community 16 - "Community 16"
Cohesion: 0.09
Nodes (16): AppState, ChatUsage, Concept, emptyChatUsage, emptyPricing, emptyVoiceUsage, emptyWebUsage, NormalizedWebSource (+8 more)

### Community 17 - "Community 17"
Cohesion: 0.16
Nodes (14): ChatPanel(), Navigation(), PdfViewer(), SettingsButton(), Language, translations, useTranslation(), Annotation (+6 more)

### Community 18 - "Community 18"
Cohesion: 0.17
Nodes (18): archiveChatSnapshot(), chatTitleFromMessages(), readChatArchives(), shouldRecordBookChatThreadSave(), writeChatArchives(), ChatThreadPersistenceMode, ChatThreadPersistenceSummary, chatTitleFromMessageSet() (+10 more)

### Community 19 - "Community 19"
Cohesion: 0.11
Nodes (17): checkedInFiles, existingFiles, expectedBooks, expectedTotal, measuredSeconds, missingRows, outputFiles, overviewIds (+9 more)

### Community 20 - "Community 20"
Cohesion: 0.11
Nodes (17): 1. Product Purpose, 2. Runtime Stack, 3. Model Inventory, 4. Zustand Store, 5. Dexie Database, 6. Core Views, 7. Graphify Architecture Layer, 8. Maintenance Boundaries (+9 more)

### Community 21 - "Community 21"
Cohesion: 0.11
Nodes (17): artifact, { artifact, citation }, { artifact, citation, result }, artifactA, artifactB, citation, citationA, citationB (+9 more)

### Community 22 - "Community 22"
Cohesion: 0.17
Nodes (8): FloatingSkillsMenu(), SKILLS, SiriLiquidGlass(), useMotionPreference(), ViewState, AnalyticsView(), COLORS, ConceptAnalyticsRecord

### Community 23 - "Community 23"
Cohesion: 0.12
Nodes (15): Architecture Boundaries, Change Workflow, code:text (graphify-out/), code:bash (graphify query "your question" --budget 2000 --graph graphif), code:bash (npm run lint), Core Product Boundaries, Design Philosophy, Graph Location (+7 more)

### Community 24 - "Community 24"
Cohesion: 0.27
Nodes (13): formatCount(), formatCurrency(), planCardMeta, UsageGraphBar(), UsageInsightsPanel(), UserUsagePanel(), AccessMode, estimateServiceMinutes() (+5 more)

### Community 25 - "Community 25"
Cohesion: 0.23
Nodes (14): buildProviderCapture(), hasModelObservationGate(), isChatLayer(), isChatThreadPersistence(), isSeededEvidenceSource(), isSyntheticEvidenceSource(), isVoiceLayer(), memoryEventBookId() (+6 more)

### Community 26 - "Community 26"
Cohesion: 0.21
Nodes (13): buildBetaDiagnosticsSnapshot(), buildBrainFlowCoverageFromLedgers(), buildCoherentLiveProofFromLedgers(), buildCoherentRequestBundle(), buildSignalEvidence(), emptySignalEvidence(), item(), latestTimestampFromAnchors() (+5 more)

### Community 27 - "Community 27"
Cohesion: 0.2
Nodes (9): 1. Mobile-First Design, 2. Component Layout, 3. Typography Scaling, 4. Testing & Validation, Best Practices, Breakpoints Overview, Responsive Design Guidelines, Tailwind Breakpoint Mapping (+1 more)

### Community 28 - "Community 28"
Cohesion: 0.2
Nodes (8): ExpiredIcon(), PendingIcon(), ProgressIcon(), ReviewIcon(), Status, StatusBadge(), SubmittedIcon(), SuccessIcon()

### Community 29 - "Community 29"
Cohesion: 0.2
Nodes (9): chatQuery, compacted, context, documentContext, documents, event, rawContext, report (+1 more)

### Community 30 - "Community 30"
Cohesion: 0.22
Nodes (5): AdminView, AnalyticsView, App(), RevisionView, VALID_VIEWS

### Community 31 - "Community 31"
Cohesion: 0.28
Nodes (9): buildLiveBetaProofDrillPacket(), buildLiveBetaProofPreflight(), buildLiveBetaProofReceipt(), buildLiveBetaProofRunbook(), buildProviderKeyProofChecklist(), compactUnique(), mergeCheckEvidence(), mergeSignalEvidence() (+1 more)

### Community 32 - "Community 32"
Cohesion: 0.22
Nodes (8): citationPatch, event, evidencePatch, id, masteryPatch, metadata, patch, record

### Community 33 - "Community 33"
Cohesion: 0.36
Nodes (6): PatternCard(), pressDots, themes, SvgBeige(), SvgDark(), SvgOrange()

### Community 34 - "Community 34"
Cohesion: 0.25
Nodes (6): chatPanelSource, hudSource, repoRoot, sendMessageSource, startVoiceSource, voiceToolSource

### Community 35 - "Community 35"
Cohesion: 0.38
Nodes (7): compactModel(), formatCount(), formatCurrency(), formatSeconds(), MessageUsageFooter(), UsageAnalyticsStrip(), useAnimatedNumber()

### Community 37 - "Community 37"
Cohesion: 0.33
Nodes (5): base, completedId, fallbackId, input, record

### Community 38 - "Community 38"
Cohesion: 0.4
Nodes (5): chatThreadIdForBook(), defaultChatMessages(), normalizeChatMessages(), persistBookChatThread(), recordBookChatThreadSaveEvent()

### Community 39 - "Community 39"
Cohesion: 0.4
Nodes (4): ChatPhase, Message, MindMapLink, MindMapNode

### Community 40 - "Community 40"
Cohesion: 0.4
Nodes (5): hasRequestId(), isMultiPdfContextInjection(), isVoiceThreadPersistence(), metadataArrayLength(), metadataNumber()

### Community 41 - "Community 41"
Cohesion: 0.4
Nodes (3): engine, input, order

### Community 42 - "Community 42"
Cohesion: 0.4
Nodes (4): adminSource, chatPanelSource, repoRoot, studySource

### Community 43 - "Community 43"
Cohesion: 0.4
Nodes (3): calls, card, engine

### Community 44 - "Community 44"
Cohesion: 0.4
Nodes (4): currentPageTool, evaluateAnswerTool, response, webSearchTool

### Community 46 - "Community 46"
Cohesion: 0.5
Nodes (3): gap, liveSnapshot, rehearsal

### Community 47 - "Community 47"
Cohesion: 0.5
Nodes (3): event, { event, delta }, metadata

### Community 48 - "Community 48"
Cohesion: 0.5
Nodes (3): concept, persistent, resolution

### Community 49 - "Community 49"
Cohesion: 0.5
Nodes (3): fileInputs, repoRoot, studyViewSource

### Community 50 - "Community 50"
Cohesion: 0.5
Nodes (3): controller, prompt, seenKeys

### Community 53 - "Community 53"
Cohesion: 0.67
Nodes (3): codeFileName(), codeLanguageLabel(), PremiumCodeShell()

### Community 54 - "Community 54"
Cohesion: 0.67
Nodes (3): isProviderBackedChatModelRun(), isRealVoiceProviderReadyEvent(), normalizedText()

## Knowledge Gaps
- **438 isolated node(s):** `deferredPreloadChunks`, `DEEPGRAM_PRICING`, `OpenRouterPricing`, `RequestLike`, `debugAdminToken` (+433 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **11 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `db` connect `Community 2` to `Community 0`, `Community 1`, `Community 3`, `Community 5`, `Community 7`, `Community 8`, `Community 9`, `Community 12`, `Community 13`, `Community 17`, `Community 22`?**
  _High betweenness centrality (0.036) - this node is a cross-community bridge._
- **Why does `MemoryOrchestrator` connect `Community 0` to `Community 12`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `deferredPreloadChunks`, `DEEPGRAM_PRICING`, `OpenRouterPricing` to the rest of the system?**
  _438 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.03 - nodes in this community are weakly interconnected._