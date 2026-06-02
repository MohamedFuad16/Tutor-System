# Graph Report - LearningAI  (2026-06-03)

## Corpus Check
- 93 files · ~156,370 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 988 nodes · 1727 edges · 61 communities (48 shown, 13 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 5 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `48bbdc49`
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
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]

## God Nodes (most connected - your core abstractions)
1. `useMotionPreference()` - 24 edges
2. `useStore` - 24 edges
3. `db` - 23 edges
4. `compact()` - 17 edges
5. `MemoryOrchestrator` - 15 edges
6. `useTranslation()` - 15 edges
7. `createArtifactRecord()` - 14 edges
8. `verifyLocalCitationIntegrity()` - 14 edges
9. `buildBrainContextPacket()` - 11 edges
10. `createCitationStateRecord()` - 11 edges

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

## Communities (61 total, 13 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (37): CognitiveLoadMonitor, CognitiveLoadState, IllusionDetector, LearnerModel, BookChatThread, BrainDatabase, CitationState, db (+29 more)

### Community 1 - "Community 1"
Cohesion: 0.03
Nodes (30): AnimatedMarkdown, ChatArchive, END_INTENT_PATTERNS, gsapMotion, InteractiveCodeBlock, languageExtensions, languageLabels, markdownComponents (+22 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (47): recordStoredAudioOverviewArtifacts(), BetaBrainFlowCoverage, BetaBrainFlowLedgerInput, BetaBrainFlowSignal, BetaDiagnosticItem, BetaDiagnosticOverallStatus, BetaDiagnosticsExportInput, BetaDiagnosticsInput (+39 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (19): compactBrainContextMetadata(), compactStringList(), debugAdminToken, DEEPGRAM_PRICING, fetchOpenRouterPricing(), nonNegativeInteger(), normalizeModelPricing(), objectMetadata() (+11 more)

### Community 4 - "Community 4"
Cohesion: 0.06
Nodes (47): confidenceFromModelSummary(), ConversationInteraction, RetrievalEvent, cosineSimilarity(), generateEmbedding(), normalize(), TOKEN_STOPWORDS, tokenize() (+39 more)

### Community 5 - "Community 5"
Cohesion: 0.09
Nodes (56): applyArtifactCitationState(), applyCitationIntegrityResult(), artifactRecordIdFor(), ArtifactStatusInput, ArtifactVerificationInput, artifactVerificationStateForCitationStates(), CitationIntegrityResult, CitationIntegrityState (+48 more)

### Community 6 - "Community 6"
Cohesion: 0.06
Nodes (30): PatternCard(), pressDots, themes, SvgBeige(), SvgDark(), SvgOrange(), audioOverviewEntries, builtInBookAudioOverviews (+22 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (36): BKTAttemptOptions, BKTEngine, buildBKTConfidenceUpdate(), DEFAULT_BKT, compactSummary(), createLedgerId(), createMasteryDeltaRecords(), createModelSummaryEvidenceRecord() (+28 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (27): args, bookArg, chapterArg, concatMp3Files(), dryRun, execFileAsync, existingFiles, modelArg (+19 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (35): addRows(), addTarget(), applyCorrectionPropagation(), buildConceptCorrectionPatch(), buildCorrectionPropagationMetadata(), buildCorrectionPropagationPatch(), cleanList(), collectCorrectionPropagationTargets() (+27 more)

### Community 10 - "Community 10"
Cohesion: 0.09
Nodes (37): BASE_CHAT_AGENT_TOOL_DEFINITIONS, buildChatAgentToolDefinitions(), ChatAgentToolDefinition, chatAgentToolNames(), CURRENT_PAGE_CHAT_AGENT_TOOL_DEFINITION, buildTutorInteractionContext(), countWords(), createTutorInteractionSnapshot() (+29 more)

### Community 11 - "Community 11"
Cohesion: 0.14
Nodes (26): AnswerEvidenceEngine, AnswerEvidenceType, asRecord(), boundedText(), clamp01(), compact(), ConceptPromotionStatus, defaultAnswerEvidenceEngine (+18 more)

### Community 12 - "Community 12"
Cohesion: 0.08
Nodes (17): AppState, ChatUsage, Concept, emptyChatUsage, emptyPricing, emptyVoiceUsage, emptyWebUsage, NormalizedWebSource (+9 more)

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (18): createTutorServerApp(), startServer(), config, getTutorApp(), normalizeVercelCatchAllUrl(), vercelHandler(), App(), form (+10 more)

### Community 14 - "Community 14"
Cohesion: 0.09
Nodes (22): 1. Prerequisites, 2. Install, 3. Configure Environment, 4. Run, 5. Generate Stored Chapter Audio, Book-Scoped Study Workflow, code:text (Upload), code:mermaid (graph TD) (+14 more)

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (17): 1. Product Purpose, 2. Runtime Stack, 3. Model Inventory, 4. Zustand Store, 5. Dexie Database, 6. Core Views, 7. Graphify Architecture Layer, 8. Maintenance Boundaries (+9 more)

### Community 16 - "Community 16"
Cohesion: 0.27
Nodes (11): ChatPanel(), Navigation(), PdfViewer(), SettingsButton(), Language, translations, useTranslation(), brainOrchestrator (+3 more)

### Community 17 - "Community 17"
Cohesion: 0.11
Nodes (17): artifact, { artifact, citation }, { artifact, citation, result }, artifactA, artifactB, citation, citationA, citationB (+9 more)

### Community 18 - "Community 18"
Cohesion: 0.12
Nodes (16): checkedInFiles, existingFiles, expectedBooks, expectedTotal, missingRows, outputFiles, overviewIds, presentRows (+8 more)

### Community 19 - "Community 19"
Cohesion: 0.12
Nodes (15): Architecture Boundaries, Change Workflow, code:text (graphify-out/), code:bash (graphify query "your question" --budget 2000 --graph graphif), code:bash (npm run lint), Core Product Boundaries, Design Philosophy, Graph Location (+7 more)

### Community 20 - "Community 20"
Cohesion: 0.17
Nodes (8): FloatingSkillsMenu(), SKILLS, SiriLiquidGlass(), useMotionPreference(), AnalyticsView(), COLORS, ConceptAnalyticsRecord, RevisionView()

### Community 21 - "Community 21"
Cohesion: 0.23
Nodes (15): chooseFlashcardConcept(), compact(), containsConceptPhrase(), createFlashcardForStorage(), ensurePersistentConceptForLearningBookConcept(), ensurePersistentConceptForLearningBookConceptId(), FlashcardConceptResolution, FlashcardStorageContext (+7 more)

### Community 22 - "Community 22"
Cohesion: 0.27
Nodes (13): formatCount(), formatCurrency(), planCardMeta, UsageGraphBar(), UsageInsightsPanel(), UserUsagePanel(), AccessMode, estimateServiceMinutes() (+5 more)

### Community 24 - "Community 24"
Cohesion: 0.25
Nodes (13): archiveChatSnapshot(), readChatArchives(), writeChatArchives(), chatTitleFromMessageSet(), flattenChatMessagesForPrompt(), hasLearnerChatTurn(), hasText(), isMeaningfulChatMessage() (+5 more)

### Community 25 - "Community 25"
Cohesion: 0.2
Nodes (9): 1. Mobile-First Design, 2. Component Layout, 3. Typography Scaling, 4. Testing & Validation, Best Practices, Breakpoints Overview, Responsive Design Guidelines, Tailwind Breakpoint Mapping (+1 more)

### Community 26 - "Community 26"
Cohesion: 0.2
Nodes (8): ExpiredIcon(), PendingIcon(), ProgressIcon(), ReviewIcon(), Status, StatusBadge(), SubmittedIcon(), SuccessIcon()

### Community 27 - "Community 27"
Cohesion: 0.2
Nodes (9): chatOnlyMemoryFlow, completeBrainFlow, coverage, flowItem, notCheckedSnapshot, payload, snapshot, ungatedFlow (+1 more)

### Community 28 - "Community 28"
Cohesion: 0.22
Nodes (8): citationPatch, event, evidencePatch, id, masteryPatch, metadata, patch, record

### Community 29 - "Community 29"
Cohesion: 0.38
Nodes (7): compactModel(), formatCount(), formatCurrency(), formatSeconds(), MessageUsageFooter(), UsageAnalyticsStrip(), useAnimatedNumber()

### Community 31 - "Community 31"
Cohesion: 0.33
Nodes (5): buildVoiceFunctionCallResponse(), parseVoiceFunctionArguments(), VOICE_AGENT_TOOL_DEFINITIONS, VoiceAgentFunctionCall, voiceAgentToolNames

### Community 32 - "Community 32"
Cohesion: 0.4
Nodes (5): chatThreadIdForBook(), chatTitleFromMessages(), defaultChatMessages(), normalizeChatMessages(), persistBookChatThread()

### Community 33 - "Community 33"
Cohesion: 0.2
Nodes (4): LearningBook, CardTarget, documentObjectUrlCache, StudyIntroSplashProps

### Community 34 - "Community 34"
Cohesion: 0.4
Nodes (3): engine, input, order

### Community 35 - "Community 35"
Cohesion: 0.4
Nodes (3): calls, card, engine

### Community 36 - "Community 36"
Cohesion: 0.4
Nodes (4): currentPageTool, evaluateAnswerTool, response, webSearchTool

### Community 38 - "Community 38"
Cohesion: 0.25
Nodes (7): compacted, context, documentContext, documents, event, rawContext, report

### Community 39 - "Community 39"
Cohesion: 0.5
Nodes (3): concept, persistent, resolution

### Community 40 - "Community 40"
Cohesion: 0.5
Nodes (3): controller, prompt, seenKeys

### Community 43 - "Community 43"
Cohesion: 0.67
Nodes (3): codeFileName(), codeLanguageLabel(), PremiumCodeShell()

### Community 45 - "Community 45"
Cohesion: 0.5
Nodes (3): event, { event, delta }, metadata

### Community 52 - "Community 52"
Cohesion: 0.17
Nodes (11): abortError(), cache, formatSourcesForPrompt(), NormalizedWebSource, normalizeRows(), SearchOptions, searchSerper(), SERPER_ENDPOINTS (+3 more)

### Community 55 - "Community 55"
Cohesion: 0.25
Nodes (4): AdminView, AnalyticsView, RevisionView, VALID_VIEWS

### Community 57 - "Community 57"
Cohesion: 0.23
Nodes (12): debugTokenFromRequest(), deepgramKeyFromRequest(), firstHeader(), getOpenRouterServerFallbackKey(), hostNameFromHeader(), isAuthorizedDebugRequest(), isLoopbackAddress(), isLoopbackHost() (+4 more)

### Community 58 - "Community 58"
Cohesion: 0.24
Nodes (9): BRAIN_RUNTIME_SETTING_LIMITS, BrainRuntimeSettings, BrainWebSearchPolicy, clampInteger(), DEFAULT_BRAIN_RUNTIME_SETTINGS, normalizeBrainRuntimeSettings(), normalizeWebSearchPolicy(), WEB_SEARCH_POLICIES (+1 more)

### Community 60 - "Community 60"
Cohesion: 0.4
Nodes (4): ChatPhase, Message, MindMapLink, MindMapNode

### Community 61 - "Community 61"
Cohesion: 0.67
Nodes (3): searchDetectionForExplicitRequest(), stripWebSearchSystemPrefix(), detectFreshnessSearch()

## Knowledge Gaps
- **339 isolated node(s):** `deferredPreloadChunks`, `DEEPGRAM_PRICING`, `OpenRouterPricing`, `RequestLike`, `debugAdminToken` (+334 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **13 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `db` connect `Community 0` to `Community 1`, `Community 33`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 7`, `Community 9`, `Community 10`, `Community 16`, `Community 20`, `Community 21`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `createTutorServerApp()` connect `Community 13` to `Community 3`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `useStore` connect `Community 16` to `Community 1`, `Community 33`, `Community 2`, `Community 6`, `Community 12`, `Community 13`, `Community 20`, `Community 22`, `Community 55`, `Community 29`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **What connects `deferredPreloadChunks`, `DEEPGRAM_PRICING`, `OpenRouterPricing` to the rest of the system?**
  _339 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.03 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.05 - nodes in this community are weakly interconnected._