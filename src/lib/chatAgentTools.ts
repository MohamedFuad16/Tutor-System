export type ChatAgentToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

const BASE_CHAT_AGENT_TOOL_DEFINITIONS: ChatAgentToolDefinition[] = [
  {
    type: "function",
    function: {
      name: "update_graph",
      description:
        "Updates the learning knowledge graph with a new key concept. Ensure the 'name' contains ONLY the exact, atomic key concept (no unwanted words, no full sentences).",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description:
              "The name of the key concept. Keep it extremely concise (e.g., 'Monkey Patching', 'V8 Engine').",
          },
          description: {
            type: "string",
            description: "A short, accurate description of the concept.",
          },
          understandingDelta: {
            type: "number",
            description:
              "A value from -0.2 to 0.2 representing the change in the user's understanding of this concept based on the conversation.",
          },
        },
        required: ["name", "description", "understandingDelta"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "generate_flashcards",
      description:
        "Generates study flashcards based on the current discussion.",
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
                  description:
                    "Front side of the flashcard (the question or concept)",
                },
                back: {
                  type: "string",
                  description:
                    "Back side of the flashcard (the answer or explanation)",
                },
                conceptId: {
                  type: "string",
                  description:
                    "Optional existing concept id when the card clearly maps to a known concept; otherwise omit.",
                },
              },
              required: ["front", "back"],
            },
          },
        },
        required: ["cards"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "evaluate_answer",
      description:
        "Record a scored active-recall or quiz answer as local mastery evidence only when it maps to a real existing learner concept id.",
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
            description:
              "Optional pass threshold as a score ratio from 0 to 1.",
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
  },
  {
    type: "function",
    function: {
      name: "web_search",
      description:
        "Search the live web only when the user explicitly asks for web/internet/online search or needs fresh external facts. Do not use for current page, screen, document, PDF, selected text, uploaded source material, or active library questions.",
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
  },
];

const CURRENT_PAGE_CHAT_AGENT_TOOL_DEFINITION: ChatAgentToolDefinition = {
  type: "function",
  function: {
    name: "look_at_current_page",
    description:
      "Look at the current PDF page the user is viewing and extract information, explain concepts, or answer questions based on its visual content.",
    parameters: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description:
            "Specific question or analysis request about the page to ask the vision model.",
        },
      },
      required: ["query"],
    },
  },
};

export const buildChatAgentToolDefinitions = ({
  includeCurrentPage = false,
}: {
  includeCurrentPage?: boolean;
} = {}) => [
  ...BASE_CHAT_AGENT_TOOL_DEFINITIONS,
  ...(includeCurrentPage ? [CURRENT_PAGE_CHAT_AGENT_TOOL_DEFINITION] : []),
];

export const chatAgentToolNames = (options?: {
  includeCurrentPage?: boolean;
}) => buildChatAgentToolDefinitions(options).map((tool) => tool.function.name);
