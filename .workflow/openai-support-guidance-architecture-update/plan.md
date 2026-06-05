# OpenAI Support Guidance Architecture Update

## Goal
Use the three OpenAI Support emails as new source material and run a
12-agent, 4-team workflow to refine the LearningAI architecture around GPT
model usage, fine-tuning vs retrieval, learner-state personalization, adaptive
learning, voice architecture, guardrails, evals, and beta readiness.

## Success Criteria
- Twelve agents are launched: four teams, each with a leader, lead researcher,
  and citation/link verifier.
- Every team returns source-backed recommendations with valid URLs.
- OpenAI-specific claims prioritize official OpenAI docs and clearly separate
  support-email guidance from public documentation.
- Final report integrates the teams into an actionable architecture addendum,
  not separate dumps.
- Decisions are explicit: what to do now, what to defer, what to measure.

## Current Context
- Repo: `/Users/mfuad16/Documents/LearningAI`.
- Graphify-first rule is mandatory before broad repo reads.
- Graphify query surfaced `TUTOR_ARCHITECTURE.md`, package dependencies
  including `openai`, `ws`, `dexie`, and core product surfaces: Chat Panel,
  Study View, Revision View, and Admin View.
- Existing prior architecture workflow:
  `.workflow/adaptive-learning-brain-architecture/final-report.md`.
- OpenAI Support email guidance:
  - Fine-tuning is most useful for consistent tutoring behavior/style; evolving
    learner-state adaptation should usually use structured summaries,
    retrieval, conversation summarization, and system instructions first.
  - GPT beyond chatbot layer is useful for extraction, learner-state summaries,
    content generation, recommendation support, and quality evaluation.
  - Weakness detection and learning scores should generally rely on traditional
    algorithms, with GPT supporting interpretation and personalization.
  - Separate API calls for response generation, learner-state updates,
    summarization, and evaluation are acceptable; requests are independent, so
    different customers do not share context.
  - Learner feedback should update learner-state data and be injected into
    prompts rather than continuously fine-tuning on beta interactions.
  - GPT-4o mini is a reasonable cost/performance baseline, while higher
    voice-capability models may improve naturalness at higher cost.

## Constraints
- Documentation/research only unless the user later asks for implementation.
- No secrets, billing changes, deploys, migrations, or destructive actions.
- For OpenAI API/product claims, use official OpenAI docs first.
- For non-OpenAI claims, use primary/vendor docs or peer-reviewed sources when
  possible.
- Preserve LearningAI product boundaries: ChatPanel, PdfViewer, BrainView, and
  RevisionView.
- Do not confuse the user-facing Brain graph with Graphify.

## Risks
- Model availability/pricing changes quickly; time-stamp assumptions.
- Support emails are useful but not public API documentation; verify public
  claims against docs.
- Subagents may produce inconsistent recommendations; parent integration must
  resolve conflicts.
- Too many agents can duplicate work; roles are split by team and function.

## Approval Required
- User explicitly requested launching 12 agents, satisfying the large-agent
  approval gate.
- No further approval needed for local workflow artifacts or read-only
  research.
- Approval required before implementation, external writes, deploys, secrets,
  billing, or destructive changes.

## Work Packets
- Team 1: OpenAI model strategy, fine-tuning, instructions, retrieval, and
  Evals.
- Team 2: learner-state modeling, adaptive learning, knowledge tracking, and
  GPT placement beyond chat.
- Team 3: voice/STT/TTS/realtime architecture for English and Japanese.
- Team 4: beta readiness, guardrails, eval harness, cost/latency integration,
  and final architecture addendum shape.

## Integration Policy
- Treat the support emails as input evidence, not as complete architecture.
- Prefer context/retrieval/state over continuous fine-tuning for beta unless
  evidence strongly supports fine-tuning.
- Keep traditional learning algorithms as mastery source of truth, with GPT as
  extractor/grader/interpreter.
- Fold voice model choices into latency, cost, multilingual quality, and
  deployment constraints.
- Resolve conflicts by official docs, primary sources, and product constraints.

## Verification
- Verify workflow artifact completeness with `verify_workflow.py`.
- Require each verifier to provide valid URLs and note unavailable/stale links.
- Check final report for uncited claims, unsupported pricing, TODOs, and broken
  section structure.
- Do not run `npm run lint`/`npm run build` unless source code changes.

## Reusable Artifacts
- Final addendum: `.workflow/openai-support-guidance-architecture-update/final-report.md`.
- Packet outputs: `.workflow/openai-support-guidance-architecture-update/results/`.
