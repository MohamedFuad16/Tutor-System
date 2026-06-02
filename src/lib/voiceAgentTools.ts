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
    name: "web_search",
    description:
      "Search live web sources only when the student explicitly asks for web, internet, online, latest, current, recent, or news information. Do not use for current page, selected text, uploaded document, active library, or local study-context questions.",
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
