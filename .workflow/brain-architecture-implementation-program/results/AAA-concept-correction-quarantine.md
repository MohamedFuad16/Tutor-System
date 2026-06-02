# Packet AAA: Concept Correction Quarantine

## Outcome

Completed.

## Implementation

- Added `concepts` as a correction propagation target.
- Added `correctionState` to durable `PersistentConcept` rows.
- `applyCorrectionPropagation()` now adds concept targets from direct concept
  correction requests and concept-linked correction requests.
- Mark-wrong, deletion-review, and supersede corrections clear durable concept
  confidence, cap mastery and BKT `p_learn` at 20%, and preserve before/after
  values in `correctionState`.
- Review-only concept corrections record review state without lowering learner
  scores.
- Admin, README, Tutor System Architecture, User Brain Architecture, Tutor
  System Architecture Library JSON, and App Design Language copy now describe
  concept correction quarantine.
- `package.json` format scripts now include the changed correction and long-term
  memory files.

## Verification

- `npm run format`: passed.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 107 tests.
- `npm run build`: passed.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because the current `package.json` has no `brain:postchange` script.
- Headless Chrome CDP QA:
  - Desktop Admin Corrections rendered concept quarantine copy with
    `scrollWidth` 1440.
  - Mobile Admin Corrections rendered concept quarantine copy with
    `scrollWidth` 390.
  - Desktop User Brain Architecture rendered concept correction quarantine copy
    with `scrollWidth` 1440.
  - Desktop Tutor System Architecture rendered concept correction quarantine
    copy with `scrollWidth` 1440.
  - Desktop App Design Language rendered corrected-concept quarantine copy with
    `scrollWidth` 1440.
  - Screenshots saved as `AAA-cdp-admin-corrections-desktop.png`,
    `AAA-cdp-admin-corrections-mobile.png`,
    `AAA-cdp-user-brain-correction.png`, `AAA-cdp-tutor-book-correction.png`,
    and `AAA-cdp-app-design-correction.png`.
- `graphify update . --force`: regenerated code architecture artifacts with 900
  nodes, 1557 edges, and 59 communities.
- `npm run graphify:tree`: passed.
- Graphify smoke query found `buildConceptCorrectionPatch()`,
  `applyCorrectionPropagation()`, `PersistentConcept`, `correctionState`,
  `confidence`, `mastery`, and `p_learn`.
- Graph artifact grep found no `server.mjs` or `.tmp-test` scratch nodes.

## Notes

- AWS/cloud synchronization remains out of scope until beta testing.
