# Packet ZZ: Validated Recall Confidence Movement

## Outcome

Completed.

## Implementation

- Added conservative confidence deltas for validated recognition, generation,
  and transfer attempts.
- Added `buildBKTConfidenceUpdate()` and wired
  `BKTEngine.updateConceptAttempt()` so BKT-backed recall evidence now updates
  durable `PersistentConcept.confidence` alongside `p_learn` and `mastery`.
- Evidence-event metadata now carries `previousConfidence`, `nextConfidence`,
  `confidenceDelta`, `confidenceSignal`, and
  `confidenceSource: "validated_recall_attempt"` for recall-backed BKT writes.
- Model-summary confidence remains gated and observational.
- README, Tutor System Architecture, User Brain Architecture, Tutor System
  Architecture Library JSON, and App Design Language copy now explain the
  validated recall confidence path.

## Verification

- `npm run format`: passed.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 105 tests.
- `npm run build`: passed.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because the current `package.json` has no `brain:postchange` script.
- Headless Chrome CDP QA:
  - Desktop User Brain Architecture rendered the validated confidence copy with
    `scrollWidth` 1440.
  - Mobile User Brain Architecture rendered the same copy with `scrollWidth` 390.
  - Desktop Tutor System Architecture rendered the validated flashcard
    confidence copy with `scrollWidth` 1440.
  - Desktop App Design Language rendered the Validated Confidence Meters pattern
    with `scrollWidth` 1440.
  - Screenshots saved as `ZZ-cdp-user-brain-confidence-desktop.png`,
    `ZZ-cdp-user-brain-confidence-mobile.png`,
    `ZZ-cdp-tutor-book-confidence.png`, and
    `ZZ-cdp-app-design-confidence.png`.
- `graphify update . --force`: regenerated code architecture artifacts with 898
  nodes, 1550 edges, and 54 communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `confidenceFromEvidenceAttempt()`,
  `buildBKTConfidenceUpdate()`, `confidenceDeltaFromEvidenceAttempt()`,
  `BKTEngine`, `recordMasteryDelta()`, and `revision.evidence.ts`.
- `graphify path "recordFlashcardReviewEvidence()" "buildBKTConfidenceUpdate()"`
  found a three-hop path through `revision.evidence.ts` and `bkt.engine.ts`.
- Graph artifact grep found no `server.mjs` or `.tmp-test` scratch nodes.

## Notes

- AWS/cloud synchronization remains out of scope until beta testing.
