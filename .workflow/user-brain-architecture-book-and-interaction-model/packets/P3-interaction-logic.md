Packet ID: P3-interaction-logic

Objective:
Deeply research Thinking Machines' interaction-model architecture and translate it into a LearningAI implementation strategy.

Context:
The user wants the app to use the same strategy where feasible, not just describe it.

Files / sources:
- `https://thinkingmachines.ai/blog/interaction-models/`
- `src/components/ChatPanel.tsx`
- `src/store/index.ts`
- `src/memory/memory.orchestrator.ts`
- `src/memory/longterm.memory.ts`

Ownership:
Research and design only. Do not edit source files.

Do:
- Extract the architecture principles: continuous streams, micro-turns, time awareness, interruption/backchannel handling, async background model, rich context package, and safe long-horizon behavior.
- Map those principles to LearningAI primitives without claiming the app has a native interaction model.
- Recommend concrete code-level changes with the smallest blast radius.
- Identify what should stay deterministic or background-driven.

Do not:
- Do not spawn additional subagents.
- Do not modify code.
- Do not propose server/API rewrites unless required.

Expected output:
An implementable strategy with app-specific state machine, context package, and limitations.

Verification:
Tie each design recommendation to the article and the connected LearningAI files.
