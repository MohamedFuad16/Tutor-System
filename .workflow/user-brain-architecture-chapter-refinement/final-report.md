# Final Report: User Brain Architecture Chapter Refinement

## Outcome

Completed the chapter-cleanup and chart-integration pass for the in-app **User Brain Architecture** book.

The book now uses the supplied Gemini-style interaction-model UI as a custom reader diagram, tightens the plain-language chapter flow, labels research/watchlist sources more carefully, and reinforces the key architecture boundary: background workers can propose, retrieve, generate, and evaluate, but durable learner-state changes require validated evidence and typed KT contracts.

## Accepted Results

- Integrated the Chapter 2 "one tutor supported by two hidden layers" mental model.
- Replaced the generic Chapter 2 Mermaid diagram with a custom `interaction-runtime` SVG renderer inspired by the supplied Gemini HTML.
- Added a User Brain Architecture chart variant for Mermaid diagrams in `RevisionView.tsx`.
- Added `useId()` namespacing for SVG filters, markers, paths, titles, and motion references to avoid duplicate-ID collisions.
- Tightened Mermaid rendering security from loose to strict in the Revision reader path.
- Added learning-receipt-book framing to the learner brain ledger.
- Split the knowledge-tracing chapter into beta core, LLM analyst role, retrieval caveat, and evaluation track.
- Added worker authority boundaries so background jobs do not appear to own learner truth.
- Converted beta gates into a readable gate/pass-condition/evidence table.
- Grouped glossary terms and labeled research watchlist sources as preprints, vendor docs, or industry patterns where relevant.

## Rejected Results

- Did not claim LearningAI is training a native Thinking Machines interaction model.
- Did not make RAG-KT, DKT, AKT, LPKT, LLM-KT, or CIKT production sources of truth for beta.
- Did not use LoRA/QLoRA/PEFT as per-learner memory.
- Did not replace chat-streaming Mermaid rendering; the chart changes stay scoped to the Revision reader.

## Conflicts Resolved

- Chart styling: used the Gemini visual direction for the User Brain Architecture reader without copying the external HTML wholesale.
- Mermaid singleton risk: moved the special Gemini look into the chart variant/directive path and kept the global Revision Mermaid initialization minimal.
- Source hygiene: changed "validated" wording to "source list assembled and locally reviewed" because the final QA pass did not live-browse every URL.
- Background authority: changed worker language from broad "update mastery" wording toward validated EvidenceEvent plus KT contract language.

## Verification Evidence

- `npm run lint` passed.
- `npm run build` passed.
- Browser smoke at `http://127.0.0.1:3100/`:
  - opened Revision -> User Brain Architecture;
  - verified Chapter 2 renders the custom interaction-runtime SVG and caption;
  - verified the Thinking Machines citation link has `target="_blank"` and `rel="noopener noreferrer"`;
  - verified Chapter 7 Mermaid state diagram renders without Mermaid error text;
  - verified Chapter 15 renders the beta-gates table;
  - verified mobile viewport width 390px keeps the page width stable while the wide diagram scrolls inside its chart frame;
  - verified browser console warnings/errors list was empty.

## Remaining Risks

- The source appendix is locally reviewed, not a fresh live URL audit. Run a dedicated citation audit before release decisions.
- Mermaid remains a singleton dependency across the app. The Revision reader is safer now, but future user-generated Mermaid content should stay gated or sanitized.
- The book documents architecture requirements that are not all implemented yet: durable worker queues, typed EvidenceEvent/ToolJob/ArtifactRecord/MasteryDelta contracts, tenant-scoped cloud writes, and full deletion/correction propagation.

## Reusable Follow-up

- Use this workflow shape for future architecture-book edits:
  - one chapter-cleanup packet;
  - one chart/rendering packet;
  - one citation/overclaim QA packet;
  - lint, build, browser smoke, mobile viewport, and workflow completeness verification.
