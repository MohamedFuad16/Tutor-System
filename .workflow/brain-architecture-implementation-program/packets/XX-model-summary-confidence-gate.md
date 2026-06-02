# Packet XX: Model Summary Confidence Gate

## Objective

Close the remaining learner-brain drift where model-summary background memory
paths could still raise durable learner confidence even though mastery was
already gated.

## Context

The user-brain book says fast teaching signals can adapt the live lesson, but
durable learner-state changes need evidence and an audit trail. Previous slices
made model summaries unable to raise mastery. This packet applies the same
principle to learner confidence while preserving proposed confidence as
observational metadata.

## Ownership

- `src/memory/evidence.mastery.ts`
- `src/memory/memory.orchestrator.ts`
- `tests/evidence-mastery.test.mjs`
- README, architecture docs, and built-in Library book copy
- Workflow evidence files
- `graphify-out/*` after explicit Graphify regeneration

## Do

- Use Graphify before source inspection.
- Keep model-summary evidence durable and inspectable.
- Store proposed and accepted confidence in metadata.
- Prevent model-summary paths from increasing durable learner confidence.
- Keep validated recall/BKT paths available for future confidence/mastery
  movement.

## Do Not

- Add AWS/cloud persistence.
- Treat generated notes, graph updates, voice speech, or model summaries as
  validated learner evidence.
- Edit unrelated untracked workflow folders.

## Expected Output

- Model-summary confidence gate in the pure evidence helper.
- MemoryOrchestrator records confidence gate metadata for learning-book concept
  updates and graph concept updates.
- Tests proving model summaries cannot raise learner confidence.
- Docs/books/workflow evidence, full gates, browser QA, Graphify refresh, commit,
  and push.
