export type VoiceAgentFunctionCall = {
  id?: string;
  name?: string;
  arguments?: string;
  input?: string;
  client_side?: boolean;
  thought_signature?: string;
};

export const VOICE_AGENT_TOOL_DEFINITIONS = [
  {
    name: "look_at_study_context",
    description:
      "Inspect the local active learning book, learner memory, selected text, and document context before answering questions about the current study material.",
    parameters: {
      type: "object",
      properties: {
        question: {
          type: "string",
          description:
            "The student's question or the specific study-context detail to inspect.",
        },
      },
      required: ["question"],
    },
  },
  {
    name: "update_graph",
    description:
      "Update the local learner knowledge graph with one exact atomic concept from the voice conversation.",
    parameters: {
      type: "object",
      properties: {
        name: {
          type: "string",
          description:
            "The exact atomic concept name, such as 'V8 Engine' or 'Bayes Rule'.",
        },
        description: {
          type: "string",
          description: "A short accurate description of the concept.",
        },
        understandingDelta: {
          type: "number",
          description:
            "A value from -0.2 to 0.2 representing the model's confidence change from this voice turn.",
        },
      },
      required: ["name", "description", "understandingDelta"],
    },
  },
  {
    name: "generate_flashcards",
    description:
      "Create local active-recall flashcards when the student asks for revision cards, quiz questions, or flashcards during voice mode.",
    parameters: {
      type: "object",
      properties: {
        cards: {
          type: "array",
          items: {
            type: "object",
            properties: {
              front: {
                type: "string",
                description: "Front side of the flashcard.",
              },
              back: {
                type: "string",
                description: "Back side of the flashcard.",
              },
              conceptId: {
                type: "string",
                description:
                  "Optional existing concept id when the card clearly maps to a known concept.",
              },
            },
            required: ["front", "back"],
          },
        },
      },
      required: ["cards"],
    },
  },
  {
    name: "evaluate_answer",
    description:
      "Evaluate a learner's active-recall or quiz answer and store local mastery evidence only when it maps to a real existing concept id.",
    parameters: {
      type: "object",
      properties: {
        conceptId: {
          type: "string",
          description:
            "Existing learner concept id from local memory/book context. Do not invent this value.",
        },
        question: {
          type: "string",
          description: "The recall, quiz, or self-check question.",
        },
        learnerAnswer: {
          type: "string",
          description: "The learner's answer being evaluated.",
        },
        correct: {
          type: "boolean",
          description:
            "Explicit correctness when the answer has a clear pass/fail evaluation.",
        },
        score: {
          type: "number",
          description: "Numeric score awarded by the rubric.",
        },
        maxScore: {
          type: "number",
          description: "Maximum possible numeric score.",
        },
        threshold: {
          type: "number",
          description: "Optional pass threshold as a score ratio from 0 to 1.",
        },
        evidenceType: {
          type: "string",
          enum: ["recognition", "generation", "transfer"],
          description:
            "Use recognition for selecting/identifying, generation for explaining from memory, and transfer for applying in a new situation.",
        },
        rubric: {
          type: "array",
          items: { type: "string" },
          description: "Brief rubric checks used for the evaluation.",
        },
      },
      required: ["conceptId", "question", "learnerAnswer"],
    },
  },
  {
    name: "look_at_current_page",
    description:
      "Inspect the currently rendered PDF page image when the student asks about the current page, screen, visible diagram, flowchart, chart, or what they are reading. The UI will focus the current page/diagram surface while the voice explanation references it. Do not use for live web facts.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "The specific question or analysis request about the visible page.",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "render_diagram",
    description:
      "Render a local Mermaid diagram in the chat window when a spoken explanation would be clearer as a flowchart, process diagram, or step-by-step visual. The UI will animate a focus tour through the rendered diagram boxes while the voice explanation continues.",
    parameters: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "Short title for the rendered diagram.",
        },
        mermaid: {
          type: "string",
          description:
            "A valid Mermaid diagram, usually starting with flowchart TD, graph TD, sequenceDiagram, or stateDiagram-v2.",
        },
        explanation: {
          type: "string",
          description:
            "One concise sentence explaining how the diagram should be read.",
        },
      },
      required: ["title", "mermaid"],
    },
  },
  {
    name: "web_search",
    description:
      "Search live web sources only when the student explicitly asks for web, internet, online, latest, current, recent, news information, or an external image/diagram/flowchart example. Do not use for current page, selected text, uploaded document, active library, or local study-context questions.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The concise web search query.",
        },
        mode: {
          type: "string",
          enum: ["search", "news"],
          description:
            "Use news for current events/headlines; use search for general web retrieval.",
        },
        maxResults: {
          type: "number",
          description: "Number of sources to retrieve, from 1 to 10.",
        },
      },
      required: ["query"],
    },
  },
] as const;

export const voiceAgentToolNames = VOICE_AGENT_TOOL_DEFINITIONS.map(
  (tool) => tool.name,
);

export const parseVoiceFunctionArguments = (
  call: Pick<VoiceAgentFunctionCall, "arguments" | "input">,
) => {
  const raw = call.arguments ?? call.input ?? "{}";
  if (!raw || !raw.trim()) return {};
  return JSON.parse(raw);
};

export const buildVoiceFunctionCallResponse = (
  call: VoiceAgentFunctionCall,
  content: unknown,
) => {
  const response: Record<string, unknown> = {
    type: "FunctionCallResponse",
    id: call.id,
    name: call.name || "unknown_tool",
    content: typeof content === "string" ? content : JSON.stringify(content),
  };
  if (call.thought_signature) {
    response.thought_signature = call.thought_signature;
  }
  return response;
};
