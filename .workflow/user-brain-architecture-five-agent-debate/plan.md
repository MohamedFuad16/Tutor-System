# User Brain Architecture Five Agent Debate

## Goal
Run a five-agent adversarial evaluation of the **User Brain Architecture** book and tighten the in-app document so it explains a practical Thinking Machines-style continuous tutor architecture without requiring custom model training.

## Success Criteria
- Four subagents argue distinct architecture ideologies with current online sources.
- The four agents receive each other's first-pass arguments and produce rebuttals or convergence notes.
- A fifth leader agent evaluates the debate and issues the final strategy.
- The book is tightened with the accepted strategy, clearer language, flowcharts, and useful explanatory imagery where warranted.
- Flowcharts match the current reader UI and render inside the app.
- Any generated image used by the project is copied into the workspace and referenced locally.
- `npm run lint`, `npm run build`, workflow verification, and browser smoke test pass.

## Current Context
- In-app book source: `src/lib/userBrainArchitectureBook.ts`.
- Built-in book/reader: `src/views/RevisionView.tsx`.
- Interaction context helper: `src/lib/interactionModel.ts`.
- Chat integration: `src/components/ChatPanel.tsx`.
- Prior workflow: `.workflow/user-brain-architecture-validation-expansion/`.
- Graphify traversal identified `RevisionView`, `ChatPanel`, memory, and store modules as connected context. Avoid broad repository reads.

## Constraints
- Follow Graphify-first development.
- Use official OpenAI docs for OpenAI implementation claims.
- Use primary docs/research where possible for AWS, Thinking Machines, and KT claims.
- Do not claim native full-duplex model training. The target is app-native orchestration using existing models, tools, retrieval, and asynchronous workers.
- Keep edits scoped to the in-app book, reader rendering if needed, and project-local assets.

## Risks
- Debate agents can overfit to their ideology; leader and integration must resolve conflicts.
- OpenAI/AWS docs and KT papers can drift; cite sources and date volatile docs.
- Generated images can make the book heavier or less useful if overused.
- Mermaid syntax inside Markdown can break rendering if the reader does not support code-fence diagrams.

## Approval Required
No destructive, external-write, production-data, deployment, billing, or credential actions are planned. Local source edits, local dev server verification, web research, and built-in image generation are in scope.

## Work Packets
- P1 Interaction Purist: defend the closest practical implementation of Thinking Machines' foreground/background interaction model.
- P2 Learning Scientist: defend evidence-based pedagogy, KT, evals, and guardrails against over-agentic drift.
- P3 Systems Architect: defend cloud/runtime architecture for low-latency tool use, queues, retrieval, and generated artifacts.
- P4 Product Tutor Designer: defend the user-facing natural tutor experience, voice behavior, visuals, and in-chat artifacts.
- P5 Leader Evaluator: read P1-P4 first pass and rebuttals, decide the final tightened strategy.

## Integration Policy
Accept only claims backed by sources, local code, or clear implementation logic. Convert debate into concrete chapters, diagrams, source-backed recommendations, and beta gates. Reject hype, vague "latest model" claims, or anything that requires training a new foundation model.

## Verification
- `npm run lint`
- `npm run build`
- workflow verification script
- browser smoke test: open User Brain Architecture, verify diagrams/assets render and citations remain clickable

## Reusable Artifacts
This workflow becomes the reusable debate/evaluation pattern for future architecture-book revisions.
