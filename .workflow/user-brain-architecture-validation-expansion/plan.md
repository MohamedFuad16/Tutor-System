# User Brain Architecture Validation Expansion

## Goal
Validate and expand the in-app **User Brain Architecture** book so it has clickable source citations, clearer chapters, deeper implementation strategy, AWS/cloud migration detail, and a current learning-model recommendation for persistent adaptive tutoring.

## Success Criteria
- Multiple subagents complete independent validation lanes and produce result files.
- The book uses clickable Markdown citations that open the source URLs.
- The interaction-model chapter describes a practical continuous tutor loop with a foreground interaction agent and background tool/reasoning agents, without claiming native model training.
- AWS migration details cover EC2/compute, Neptune, Postgres/pgvector, S3, eventing/queues, identity/tenant scoping, and observability.
- Learning-strategy chapters compare BKT, DKT, LKT/LLM-KT, and recent LLM/KG/RAG KT models, then recommend a pragmatic hybrid for LearningAI.
- Explanations are simpler and more structured for non-expert readers.
- Lint, build, workflow verification, and browser smoke testing pass or failures are documented.

## Current Context
- Existing book source: `src/lib/userBrainArchitectureBook.ts`.
- Built-in book registration: `src/views/RevisionView.tsx`.
- Interaction helper: `src/lib/interactionModel.ts`.
- Chat integration: `src/components/ChatPanel.tsx`.
- Previous validation workflow: `.workflow/user-brain-architecture-book-and-interaction-model/`.
- Prior architecture reports: `.workflow/adaptive-learning-brain-architecture/` and `.workflow/openai-support-guidance-architecture-update/`.
- Graphify identified the same connected source files as relevant; avoid broad repository reads.

## Constraints
- Follow `AGENTS.md`: Graphify before broad reads, minimal connected file inspection, do not edit `graphify-out`.
- Use authoritative/current primary sources for OpenAI, AWS, and research claims.
- Do not add risky Dexie schema changes in this pass.
- Preserve the app's existing Revision reader behavior unless improving the citation/book experience.

## Risks
- “Latest” model and OpenAI/AWS docs can drift quickly; cite access date for volatile docs.
- LKT/LLM-KT research is emerging; avoid overstating production readiness.
- Continuous interaction can become privacy-invasive if raw drafts/audio are over-collected; use aggregate state and explicit user actions.
- Browser-local Dexie and cloud multi-tenant architecture require different isolation guarantees.

## Approval Required
No destructive, external-write, deployment, billing, credential, or production-data actions are planned. Local research, local source edits, dev server, lint/build, and browser smoke testing are approved by scope.

## Work Packets
- P1 Citation and source-link audit.
- P2 Interaction/background-agent architecture.
- P3 AWS cloud brain architecture.
- P4 Learning-model and KT research.
- P5 Reader simplification and chapter structure review.

## Integration Policy
Accept claims only when supported by local source, previous workflow evidence, or current cited sources. Use plain-language chapters first, implementation details second, and citation appendices last.

## Verification
- `npm run lint`
- `npm run build`
- workflow verification script
- browser smoke test of Revision book and clickable citation links

## Reusable Artifacts
This workflow becomes the repeatable pattern for source-backed in-app architecture books.
