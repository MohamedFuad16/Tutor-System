# User Brain Architecture Cleanup Debate Verification

## Goal
Clean and tighten the in-app **User Brain Architecture** book, including charts,
citations, interaction-model strategy, AWS/cloud architecture, knowledge-tracing
concepts, and source-backed claims.

## Success Criteria
- Five-agent workflow is executed:
  - P1: document and chart polish.
  - P2: source and concept verification.
  - P3/P4: active debate from opposing architectural perspectives.
  - P5: evaluator who weighs the debate and produces final recommendations.
- The debate is run in an explicit communication loop, with arguments shared
  between the two opinionated agents before the evaluator judges them.
- Accepted improvements are integrated into the app book and charts.
- Sources are clickable, current, and relevant.
- Final report records accepted/rejected findings, conflicts, and verification.
- Workflow artifacts, lint, build, and browser reading flow are verified.

## Current Context
- Repo: `/Users/mfuad16/Documents/LearningAI`.
- App is running in the in-app browser at `http://127.0.0.1:3100/`.
- `src/lib/userBrainArchitectureBook.ts` defines the book content.
- `src/views/RevisionView.tsx` renders the learning-book reader and markdown.
- Existing implementation already includes Mermaid diagrams, citations, and an
  interaction runtime chapter.

## Constraints
- Follow `AGENTS.md`: use Graphify before large repository reads.
- Do not edit `graphify-out` artifacts.
- Keep edits scoped to the book/reader/charts unless a verified issue requires
  more.
- Do not overclaim that native interaction-model training is implemented; the
  app can implement an analogous runtime orchestration pattern with existing
  models, learner state, retrieval, and asynchronous tool workers.

## Risks
- Source drift: external documentation may change.
- Research overreach: BKT/DKT/LKT claims must distinguish mature production
  choices from newer research directions.
- Mermaid readability: charts can become too dense inside a reading surface.
- Citation UX: links must remain clickable in the app book.

## Approval Required
No destructive, external-write, deployment, credential, billing, or production
data actions are planned. Safe local edits and read-only web research are within
the user request.

## Work Packets
- `P1-document-chart-polish`: Review the book as a reading artifact, identify
  copy/chapter/chart improvements, and recommend concise chart changes.
- `P2-source-concept-verification`: Check sources, citations, KT concepts,
  interaction-model claims, OpenAI guidance, and AWS components.
- `P3-debate-interaction-maximalist`: Argue for a richer two-layer continuous
  tutor runtime with tool workers and multimodal teaching artifacts.
- `P4-debate-reliability-minimalist`: Challenge complexity, overclaims, latency,
  model drift, and pedagogical risk; argue for robust simple contracts.
- `P5-evaluator`: Evaluate P3/P4 debate plus P1/P2 findings and decide what
  should be integrated.

## Integration Policy
Integrate only findings that are source-backed, improve clarity, and fit the app
reader. Rejected claims must be recorded with a reason. If subagents disagree,
check the authoritative source before choosing.

## Verification
- Workflow completeness check with `verify_workflow.py`.
- `npm run lint`.
- `npm run build`.
- Browser smoke of the User Brain Architecture book, citations, image, and
  charts at `http://127.0.0.1:3100/`.

## Reusable Artifacts
- This workflow run can serve as a reusable pattern for future in-app book
  verification passes with debate/evaluator lanes.
