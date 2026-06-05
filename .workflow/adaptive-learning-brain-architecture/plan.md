# Adaptive Learning Brain Architecture

## Goal
Produce a complete, production-grade architecture specification for the
LearningAI Adaptive Learning Brain: a persistent, per-user cognitive model that
learns from chat, voice, documents, quizzes, revision, and generated study
artifacts.

## Success Criteria
- Agent 1: knowledge tracing comparison, chosen model, mastery formula,
  knowledge_state schema, and cold-start diagnostic are complete.
- Agent 2: dual-layer interaction architecture, student state machine,
  proactive rules, response format selector, background jobs, WebSocket
  protocol, context package, and pedagogy mapping are complete.
- Agent 3: Brain data schemas, user-first Neptune queries, PostgreSQL DDL,
  pgvector indexes, S3 conventions, Context Builder pseudocode, token budget,
  and consolidation pipeline are complete.
- Agent 4: AWS production architecture, service decisions, security, event
  pipeline, observability, cost model, and Terraform checklist are complete.
- Agent 5 synthesis integrates the four lanes into one cohesive document with
  cross-validated schemas, roadmap, risks, and open questions.

## Current Context
- Repo: `/Users/mfuad16/Documents/LearningAI`.
- Required navigation: Graphify-first before broad repository reads.
- Initial Graphify anchors for current Brain surfaces include
  `src/memory/memory.orchestrator.ts`, `src/memory/longterm.memory.ts`,
  `src/components/ChatPanel.tsx`, `src/views/StudyView.tsx`,
  `src/views/RevisionView.tsx`, `src/memory/bkt.engine.ts`,
  `src/memory/revision.memory.ts`, and `src/store/index.ts`.
- Existing memory notes say the repo already has meaningful `/brain` commands:
  `brain:generate`, `brain:embed`, `brain:runtime-benchmark`, `brain:verify`,
  `brain:drift-check`, and `brain:self-audit`.

## Constraints
- Multi-user isolation is non-negotiable at every layer.
- Brain updates must be non-blocking to the user response stream.
- Context assembly must fit within a 128K token window.
- Books/artifacts are user-owned, first-class outputs.
- Prefer AWS managed services for MVP phases.
- Do not manually edit `graphify-out`.
- Do not run local Graphify refresh unless explicitly requested.

## Risks
- External research and cloud pricing can drift; cite sources and label
  assumptions.
- Architecture-only work can become unbuildable; keep Phase 1 scoped for
  2-4 engineers.
- Multi-tenant data leakage is high impact; require user_id filters and
  prefix/namespace policies.
- DKT/LLM-KT claims can overstate accuracy; separate MVP heuristic from later
  model training.
- WebSocket/full-duplex interaction may be more complex than current app
  runtime; roadmap must stage it.

## Approval Required
- No approval required for local workflow files, read-only research, or local
  doc generation.
- Approval required before deleting files, running migrations, deploying,
  changing external systems, touching secrets, or doing broad codemods.
- Web browsing is required for current research and source citations.

## Work Packets
- A1 Knowledge Tracing and Learning Engine: subagent `019e7e75-dfc6-7fa0-8861-f139bc67f924`.
- A2 Dual-Layer Interaction: subagent `019e7e75-f8d8-77f2-8cb3-a978d8e38314`.
- A3 Brain Data Layer: subagent `019e7e76-10eb-7f60-a3d1-242b65408791`.
- A4 AWS Production Architecture: subagent `019e7e76-2c73-72f2-8b12-ccb6f9515797`.
- A5 Synthesis: parent agent after A1-A4 return.

## Integration Policy
- Integrate recommendations; do not append four isolated reports.
- If agents disagree, inspect authoritative sources and choose one decision
  with rationale.
- Align event names across interaction state, episodic memory, WebSocket
  protocol, and background jobs.
- Merge knowledge_state into the final data model and make foreign-key/user
  ownership relationships explicit.
- Treat "MVP now" and "production later" as separate architecture phases.

## Verification
- Verify workflow artifact completeness with `verify_workflow.py`.
- Run source-citation checks for external claims.
- Cross-check final schema references manually.
- Run `npm run lint` and `npm run build` only if source code changes are made.
- For this documentation architecture run, live browser verification is not
  required unless UI/source edits are introduced.

## Reusable Artifacts
- Keep `.workflow/adaptive-learning-brain-architecture/final-report.md` as the
  final architecture specification.
- Promote a reusable workflow recipe only if the resulting packet structure is
  useful for future LearningAI architecture research.
