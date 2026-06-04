import {
  buildChatAgentToolDefinitions,
  chatAgentToolNames,
} from "../lib/chatAgentTools";
import {
  VOICE_AGENT_TOOL_DEFINITIONS,
  voiceAgentToolNames,
} from "../lib/voiceAgentTools";
import {
  assembleBrainContextSections,
  buildBrainDocumentContext,
  createBrainContextMemoryEventInput,
  type BrainAgentLayer,
  type BrainContextMode,
  type BrainContextPacket,
} from "./brain.context";
import {
  buildBrainFlowCoverageFromLedgers,
  type BetaBrainFlowCoverage,
} from "./beta.diagnostics";
import { modelObservationGateMetadata } from "./evidence.mastery";
import type { LearningDocument } from "./longterm.memory";

export type BrainWiringRehearsalCheck = {
  id: string;
  title: string;
  ready: boolean;
  detail: string;
};

export type BrainWiringRehearsalResult = {
  generatedAt: string;
  localOnly: true;
  synthetic: true;
  evidenceSource: "synthetic_local_rehearsal";
  countsTowardBetaReadiness: false;
  persisted: false;
  liveCoverageMutated: false;
  status: "ready" | "failed";
  summary: string;
  chatRequestId: string;
  voiceRequestId: string;
  documentIds: string[];
  chatToolNames: string[];
  voiceToolNames: string[];
  toolContracts: BrainWiringToolContract[];
  voiceOnlyToolContracts: BrainWiringVoiceOnlyToolContract[];
  coverage: BetaBrainFlowCoverage;
  checks: BrainWiringRehearsalCheck[];
};

export type BrainWiringToolContract = {
  toolName: string;
  ready: boolean;
  chatReady: boolean;
  voiceReady: boolean;
  sharedRequiredParameters: string[];
  chatRequiredParameters: string[];
  voiceRequiredParameters: string[];
};

export type BrainWiringVoiceOnlyToolContract = {
  toolName: string;
  ready: boolean;
  voiceReady: boolean;
  chatExcluded: boolean;
  requiredParameters: string[];
  detail: string;
};

export type BrainWiringRehearsalGap = {
  syntheticCoveragePercent: number;
  liveCoveragePercent: number;
  syntheticStatus: BetaBrainFlowCoverage["status"];
  liveStatus: BetaBrainFlowCoverage["status"];
  readyForProviderKeyRun: boolean;
  liveMissingSignals: string[];
  syntheticMissingSignals: string[];
  summary: string;
};

const REQUIRED_DUAL_AGENT_TOOL_NAMES = [
  "update_graph",
  "generate_flashcards",
  "evaluate_answer",
  "look_at_current_page",
  "web_search",
] as const;

const REQUIRED_VOICE_ONLY_TOOL_NAMES = ["look_at_study_context"] as const;

const stringArray = (value: unknown) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

const requiredParametersFromSchema = (schema: unknown) => {
  if (!schema || typeof schema !== "object") return [];
  return stringArray((schema as { required?: unknown }).required).sort();
};

const buildToolContracts = (): BrainWiringToolContract[] => {
  const chatDefinitions = new Map(
    buildChatAgentToolDefinitions({ includeCurrentPage: true }).map((tool) => [
      tool.function.name,
      tool.function,
    ]),
  );
  const voiceDefinitions = new Map(
    VOICE_AGENT_TOOL_DEFINITIONS.map((tool) => [tool.name, tool]),
  );

  return REQUIRED_DUAL_AGENT_TOOL_NAMES.map((toolName) => {
    const chatDefinition = chatDefinitions.get(toolName);
    const voiceDefinition = voiceDefinitions.get(toolName);
    const chatRequiredParameters = requiredParametersFromSchema(
      chatDefinition?.parameters,
    );
    const voiceRequiredParameters = requiredParametersFromSchema(
      voiceDefinition?.parameters,
    );
    const sharedRequiredParameters = chatRequiredParameters.filter(
      (parameter) => voiceRequiredParameters.includes(parameter),
    );
    const ready =
      Boolean(chatDefinition) &&
      Boolean(voiceDefinition) &&
      chatRequiredParameters.length === voiceRequiredParameters.length &&
      chatRequiredParameters.every(
        (parameter, index) => parameter === voiceRequiredParameters[index],
      );

    return {
      toolName,
      ready,
      chatReady: Boolean(chatDefinition),
      voiceReady: Boolean(voiceDefinition),
      sharedRequiredParameters,
      chatRequiredParameters,
      voiceRequiredParameters,
    };
  });
};

const buildVoiceOnlyToolContracts = (): BrainWiringVoiceOnlyToolContract[] => {
  const chatDefinitionNames = new Set(
    buildChatAgentToolDefinitions({ includeCurrentPage: true }).map(
      (tool) => tool.function.name,
    ),
  );
  const voiceDefinitions = new Map(
    VOICE_AGENT_TOOL_DEFINITIONS.map((tool) => [tool.name, tool]),
  );

  return REQUIRED_VOICE_ONLY_TOOL_NAMES.map((toolName) => {
    const voiceDefinition = voiceDefinitions.get(toolName);
    const requiredParameters = requiredParametersFromSchema(
      voiceDefinition?.parameters,
    );
    const voiceReady = Boolean(voiceDefinition);
    const chatExcluded = !chatDefinitionNames.has(toolName);
    const ready =
      voiceReady &&
      chatExcluded &&
      requiredParameters.length === 1 &&
      requiredParameters[0] === "question";

    return {
      toolName,
      ready,
      voiceReady,
      chatExcluded,
      requiredParameters,
      detail:
        "Live voice keeps a voice-only study-context tool with a required question field; typed chat receives the same study context through pre-stream packet injection instead of this tool.",
    };
  });
};

const rehearsalDocuments: LearningDocument[] = [
  {
    id: "rehearsal-doc-active",
    bookId: "rehearsal-book",
    title: "Active Rehearsal Paper",
    mimeType: "application/pdf",
    size: 1024,
    processingStatus: "ready",
    extractedText:
      "The active PDF describes retrieval practice and evidence-gated mastery updates.",
    classification: "native_text_pdf",
    extractionMode: "pymupdf4llm",
    createdAt: 1,
    updatedAt: 2,
  },
  {
    id: "rehearsal-doc-companion",
    bookId: "rehearsal-book",
    title: "Companion Rehearsal Paper",
    mimeType: "application/pdf",
    size: 1024,
    processingStatus: "ready",
    extractedText:
      "The companion PDF describes request-correlated tool jobs and learner-memory events.",
    classification: "native_text_pdf",
    extractionMode: "pymupdf4llm",
    createdAt: 1,
    updatedAt: 3,
  },
];

const buildRehearsalPacket = ({
  mode,
  agentLayer,
  requestId,
  relatedMemoryContext,
  activeBookContext,
  documentContext,
}: {
  mode: BrainContextMode;
  agentLayer: BrainAgentLayer;
  requestId: string;
  relatedMemoryContext: string;
  activeBookContext: string;
  documentContext: string;
}): BrainContextPacket => {
  const interactionContext = `### Interaction Context\nMode: ${mode}`;
  const rawContext = assembleBrainContextSections({
    mode,
    relatedMemoryContext,
    activeBookContext,
    documentContext,
    interactionContext,
  });

  return {
    requestId,
    mode,
    agentLayer,
    querySummary: "Explain retrieval practice",
    activeBookId: "rehearsal-book",
    activeBookTitle: "Local Brain Wiring Rehearsal",
    activeDocumentId: "rehearsal-doc-active",
    documentIds: rehearsalDocuments.map((document) => document.id),
    readyDocumentIds: rehearsalDocuments.map((document) => document.id),
    contextDocumentIds: rehearsalDocuments.map((document) => document.id),
    documentCount: rehearsalDocuments.length,
    readyDocumentCount: rehearsalDocuments.length,
    unreadyDocumentCount: 0,
    omittedReadyDocumentCount: 0,
    context: rawContext,
    rawContext,
    contextChars: rawContext.length,
    rawContextChars: rawContext.length,
    memoryContextChars: relatedMemoryContext.length,
    activeBookContextChars: activeBookContext.length,
    documentContextChars: documentContext.length,
    interactionContextChars: interactionContext.length,
    compacted: false,
  };
};

const contextEventFor = (packet: BrainContextPacket, timestamp: number) => {
  const event = createBrainContextMemoryEventInput(packet);
  return {
    eventType: "brain_context_injected" as const,
    status: "completed" as const,
    timestamp,
    metadata: {
      ...event.metadata,
      synthetic: true,
      rehearsal: "dual_agent_local_wiring",
    },
  };
};

export const runLocalBrainWiringRehearsal = (
  now = new Date(),
): BrainWiringRehearsalResult => {
  const activeBookContext =
    "### Active Library Book Context\nBook: Local Brain Wiring Rehearsal";
  const relatedMemoryContext =
    "### Persistent Memory Context\nRetrieval practice is already mapped.";
  const documentContext = buildBrainDocumentContext(rehearsalDocuments, {
    activeDocumentId: "rehearsal-doc-active",
  });
  const chatPacket = buildRehearsalPacket({
    mode: "chat",
    agentLayer: "chat_stream",
    requestId: "rehearsal-chat-request",
    relatedMemoryContext,
    activeBookContext,
    documentContext,
  });
  const voicePacket = buildRehearsalPacket({
    mode: "voice",
    agentLayer: "voice_realtime",
    requestId: "rehearsal-voice-request",
    relatedMemoryContext,
    activeBookContext,
    documentContext,
  });
  const chatTools = chatAgentToolNames({ includeCurrentPage: true });
  const voiceTools = [...voiceAgentToolNames];
  const voiceToolNameSet = new Set<string>(voiceTools);
  const toolContracts = buildToolContracts();
  const voiceOnlyToolContracts = buildVoiceOnlyToolContracts();
  const sharedToolsReady = REQUIRED_DUAL_AGENT_TOOL_NAMES.every(
    (toolName) => chatTools.includes(toolName) && voiceTools.includes(toolName),
  );
  const toolContractsReady = toolContracts.every((contract) => contract.ready);
  const voiceOnlyToolsReady = voiceOnlyToolContracts.every(
    (contract) => contract.ready && voiceToolNameSet.has(contract.toolName),
  );
  const coverage = buildBrainFlowCoverageFromLedgers({
    memoryEvents: [
      contextEventFor(chatPacket, 1),
      contextEventFor(voicePacket, 2),
      {
        eventType: "learning_book_updated",
        status: "completed",
        timestamp: 3,
        metadata: modelObservationGateMetadata({
          requestId: chatPacket.requestId,
          mode: "chat",
          agentLayer: "chat_stream",
          synthetic: true,
        }),
      },
      {
        eventType: "learning_book_updated",
        status: "completed",
        timestamp: 4,
        metadata: modelObservationGateMetadata({
          requestId: voicePacket.requestId,
          mode: "voice",
          agentLayer: "voice_realtime",
          synthetic: true,
        }),
      },
      {
        eventType: "book_chat_thread_saved",
        status: "completed",
        timestamp: 5,
        bookId: chatPacket.activeBookId,
        conversationId: `thread:${chatPacket.activeBookId}:chat`,
        metadata: {
          mode: "chat",
          requestId: chatPacket.requestId,
          requestIds: [chatPacket.requestId],
          requestCorrelated: true,
          hasTypedChat: true,
          hasVoiceSession: false,
          synthetic: true,
        },
      },
      {
        eventType: "book_chat_thread_saved",
        status: "completed",
        timestamp: 6,
        bookId: voicePacket.activeBookId,
        conversationId: `thread:${voicePacket.activeBookId}:voice`,
        metadata: {
          mode: "voice",
          requestId: voicePacket.requestId,
          requestIds: [voicePacket.requestId],
          requestCorrelated: true,
          hasTypedChat: false,
          hasVoiceSession: true,
          voiceSessionCount: 1,
          voiceTurnCount: 2,
          synthetic: true,
        },
      },
    ],
    retrievalEvents: [
      {
        status: "completed",
        requestId: chatPacket.requestId,
        timestamp: 7,
      },
      {
        status: "completed",
        requestId: voicePacket.requestId,
        timestamp: 8,
      },
    ],
    modelRuns: [
      {
        status: "completed",
        requestId: chatPacket.requestId,
        source: "chat_stream",
        timestamp: 9,
      },
      {
        status: "completed",
        requestId: voicePacket.requestId,
        source: "voice_agent",
        timestamp: 10,
      },
    ],
    toolJobs: [
      {
        status: "completed",
        requestId: chatPacket.requestId,
        source: "chat_stream",
        timestamp: 11,
      },
      {
        status: "completed",
        requestId: voicePacket.requestId,
        source: "voice_agent",
        timestamp: 12,
      },
    ],
    evidenceEvents: [
      {
        evidenceType: "generation",
        verified: true,
        timestamp: 13,
        metadata: {
          requestId: chatPacket.requestId,
          mode: "chat",
          agentLayer: "chat_stream",
          synthetic: true,
        },
      },
      {
        evidenceType: "generation",
        verified: true,
        timestamp: 14,
        metadata: {
          requestId: voicePacket.requestId,
          mode: "voice",
          agentLayer: "voice_realtime",
          synthetic: true,
        },
      },
    ],
  });
  const checks: BrainWiringRehearsalCheck[] = [
    {
      id: "multi_pdf_context",
      title: "Balanced multi-PDF context",
      ready:
        documentContext.includes("Document ID: rehearsal-doc-active") &&
        documentContext.includes("Document ID: rehearsal-doc-companion") &&
        documentContext.includes("Role: Active document"),
      detail:
        "The shared document-context builder includes the active PDF and a companion ready PDF while marking the active document.",
    },
    {
      id: "chat_packet",
      title: "Typed-chat packet",
      ready:
        chatPacket.agentLayer === "chat_stream" &&
        chatPacket.documentIds.length === 2 &&
        Boolean(chatPacket.requestId),
      detail:
        "The rehearsal creates a request-correlated typed-chat packet through the shared packet-event boundary.",
    },
    {
      id: "voice_packet",
      title: "Live-voice packet",
      ready:
        voicePacket.agentLayer === "voice_realtime" &&
        voicePacket.documentIds.length === 2 &&
        voicePacket.rawContext.indexOf(activeBookContext) <
          voicePacket.rawContext.indexOf(relatedMemoryContext),
      detail:
        "The rehearsal creates a request-correlated voice packet and confirms active-book context survives ahead of long memory.",
    },
    {
      id: "dual_agent_tools",
      title: "Dual-agent tool parity",
      ready: sharedToolsReady && toolContractsReady,
      detail:
        "Typed chat and live voice both expose graph update, flashcard, evaluated-answer, current-page vision, and web-search contracts with matching required parameter schemas.",
    },
    {
      id: "tool_schema_contracts",
      title: "Shared tool schemas",
      ready: toolContractsReady,
      detail:
        "The rehearsal compares chat and voice tool definitions before provider traffic so missing or drifted required fields are caught locally.",
    },
    {
      id: "voice_context_tool",
      title: "Voice-only study context tool",
      ready: voiceOnlyToolsReady,
      detail:
        "Live voice exposes look_at_study_context with a required question field, while typed chat stays on pre-injected brain-context packets instead of adding that voice-only tool to parity checks.",
    },
    {
      id: "synthetic_isolation",
      title: "Synthetic isolation",
      ready: true,
      detail:
        "The rehearsal uses in-memory synthetic rows only. It does not write IndexedDB, alter live coverage, call providers, or count as beta traffic.",
    },
    {
      id: "coverage_contract",
      title: "Coverage contract",
      ready: coverage.status === "ready" && coverage.coveragePercent === 100,
      detail:
        "Synthetic rows satisfy the same thirteen-signal verifier used for live local ledgers without being persisted into those ledgers.",
    },
  ];
  const ready = checks.every((check) => check.ready);

  return {
    generatedAt: now.toISOString(),
    localOnly: true,
    synthetic: true,
    evidenceSource: "synthetic_local_rehearsal",
    countsTowardBetaReadiness: false,
    persisted: false,
    liveCoverageMutated: false,
    status: ready ? "ready" : "failed",
    summary: ready
      ? "Shared packet assembly, balanced multi-PDF context, dual-agent tools, the voice-only study-context tool, and the thirteen-signal verifier passed in memory."
      : "One or more local wiring contracts failed rehearsal. Review the failed synthetic checks before live beta traffic.",
    chatRequestId: chatPacket.requestId,
    voiceRequestId: voicePacket.requestId,
    documentIds: rehearsalDocuments.map((document) => document.id),
    chatToolNames: chatTools,
    voiceToolNames: voiceTools,
    toolContracts,
    voiceOnlyToolContracts,
    coverage,
    checks,
  };
};

export const summarizeBrainWiringRehearsalGap = (
  rehearsal: BrainWiringRehearsalResult,
  liveCoverage: BetaBrainFlowCoverage,
): BrainWiringRehearsalGap => {
  const syntheticReady =
    rehearsal.status === "ready" &&
    rehearsal.coverage.status === "ready" &&
    rehearsal.coverage.missingSignals.length === 0;
  const liveBlocked = liveCoverage.status === "blocked";
  const readyForProviderKeyRun = syntheticReady && !liveBlocked;
  const liveMissingSignals = liveCoverage.missingSignals;
  const syntheticMissingSignals = rehearsal.coverage.missingSignals;
  const summary = !syntheticReady
    ? "Synthetic contracts are failing; fix local wiring before provider-key beta turns."
    : liveCoverage.status === "ready"
      ? "Synthetic contracts and live local ledger evidence are both ready."
      : liveBlocked
        ? "Synthetic contracts pass, but live ledger failures are blocking beta proof."
        : `Synthetic contracts pass; live beta still needs ${liveMissingSignals.length} signal${liveMissingSignals.length === 1 ? "" : "s"}.`;

  return {
    syntheticCoveragePercent: rehearsal.coverage.coveragePercent,
    liveCoveragePercent: liveCoverage.coveragePercent,
    syntheticStatus: rehearsal.coverage.status,
    liveStatus: liveCoverage.status,
    readyForProviderKeyRun,
    liveMissingSignals,
    syntheticMissingSignals,
    summary,
  };
};
