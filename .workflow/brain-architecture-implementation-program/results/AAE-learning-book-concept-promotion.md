# Packet AAE Result: Learning-Book Concept Promotion For Evaluated Answers

## Accepted

- Added `ensurePersistentConceptForLearningBookConceptId()` so a raw concept id
  can resolve an existing persistent concept or a stored `LearningBookConcept`
  before BKT writes.
- Wired the default evaluated-answer evidence engine to run that promotion
  before `BKTEngine.updateConceptAttempt()`.
- Added evidence metadata fields for `conceptPromotionStatus` and
  `conceptPromotionError` so Admin/debug ledgers can explain whether promotion
  was ready, unresolved, not requested, or errored.
- Preserved the no-fabrication guardrail: unresolved promotion still records a
  `missing_concept` result instead of inventing mastery.
- Updated README, Tutor System Architecture, User Brain Architecture, Tutor
  System Architecture Library JSON, and App Design Language copy to document
  the learning-book concept promotion boundary.

## Guardrails

- Placeholder concept ids such as `general` still skip concept promotion and BKT.
- Learning-book concept ids are promoted only when a matching row already exists
  in local `learningBookConcepts`.
- Missing persistent concepts continue to return `missing_concept`.
- AWS/cloud synchronization remains deferred.

## Verification

- `npm run format`: passed.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 120 tests.
- `npm run build`: passed.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because the current `package.json` has no `brain:postchange` script.
- In-app Browser QA on `http://localhost:3100`: User Brain Architecture rendered
  the promotion and `missing_concept` copy, with no horizontal overflow at
  `563px` client width.
- In-app Browser QA on App Design Language / Local Beta Control Patterns:
  desktop and mobile checks rendered `learning-book concept promotion status`
  with `scrollWidth === clientWidth` at `563px` and `390px`.
- Browser screenshots were captured/displayed in-session. Saving screenshot
  bytes into the workflow folder from the browser runtime failed with filesystem
  `EPERM`, so no AAE screenshot files were written.
- `graphify update . --force`: regenerated code architecture artifacts with
  935 nodes, 1624 edges, and 63 communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `ensurePersistentConceptForLearningBookConceptId()`,
  `recordEvaluatedAnswerEvidence()`, `ConceptPromotionStatus`,
  `LearningBookConcept`, and related evidence helpers.
- `graphify path "recordEvaluatedAnswerEvidence()"
  "ensurePersistentConceptForLearningBookConceptId()"` found a two-hop
  import/contains path through `answer.evidence.ts`.
- Graph artifact grep found no `server.mjs` or `.tmp-test` scratch nodes.
- Temporary dev server on port `3100` was stopped after QA.

## Remaining Risk

- The promotion contract is unit-tested and browser-visible documentation is
  verified, but a live provider-key chat or voice turn has not been spent in
  this phase.
