# Packet XX: Model Summary Confidence Gate

## Outcome

Completed.

Model-summary background memory paths can still write durable, inspectable
evidence rows, but they can no longer raise durable learner confidence. Proposed
confidence is stored as observational metadata beside the accepted confidence
and gate label.

## Implementation

- `confidenceFromModelSummary()` now returns the existing confidence only.
- `MemoryOrchestrator.updateLearningBookFromConversation()` stores
  `proposedConfidence`, `acceptedConfidence`, and
  `confidenceGate: "model_summary_no_confidence_increase"` for
  learning-book concept updates.
- `MemoryOrchestrator.addOrUpdateConcept()` applies the same gate to chat graph
  concept updates and new model-summary concepts.
- Evidence/memory metadata now distinguishes proposed model-summary confidence
  from accepted durable learner confidence.
- README, Tutor System Architecture, User Brain Architecture, and the built-in
  Tutor System Architecture Library JSON now document the confidence boundary.

## Verification

- `npm run format`: passed.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run test`: passed, 102 tests.
- `npm run build`: passed.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because the current `package.json` has no `brain:postchange` script.
- Headless Chrome CDP QA:
  - Desktop `1440x1000`: User Brain Architecture rendered the
    model-summary confidence gate with `scrollWidth` 1440.
  - Mobile `390x844`: User Brain Architecture rendered the same gate with
    `scrollWidth` 390.
  - Screenshots saved as `XX-cdp-user-brain-confidence-desktop.png` and
    `XX-cdp-user-brain-confidence-mobile.png`.
- `graphify update . --force`: regenerated code architecture artifacts with
  888 nodes, 1530 edges, and 62 communities.
- `npm run graphify:tree`: passed.
- `graphify query "confidenceFromModelSummary model summary confidence gate MemoryOrchestrator evidence mastery"` found the confidence gate, memory
  orchestrator, model-summary mastery gate, and evidence ledger paths.
- `graphify path "confidenceFromModelSummary()" ".updateLearningBookFromConversation()"` found a direct call edge.
- `graphify path "confidenceFromModelSummary()" ".addOrUpdateConcept()"` found a direct call edge.
- Graph artifact grep found no `server.mjs` or `.tmp-test` scratch nodes.

## Notes

- Sidecar Boole was closed after timeout and did not contribute changes.
- AWS/cloud synchronization remains out of scope until beta testing.
