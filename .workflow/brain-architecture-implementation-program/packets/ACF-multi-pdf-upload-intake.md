Packet ID: ACF
Objective: Make multi-PDF intake match the already shared chat/voice brain context.
Status: completed

## Context

Graphify routed this slice through `StudyView()`, `ChatPanel()`,
`buildBrainContextPacket()`, `brain.context.ts`, `AdminView()`, and
`RevisionView()`. The context builder already injected active and companion PDF
metadata into chat and live voice, but Study only accepted the first selected or
dropped PDF and used a latest-upload ingestion sequence that could cancel older
ingestions.

## Changes

- `StudyView` now accepts multi-file PDF selections and drops.
- Each uploaded PDF is inserted as a `learningDocuments` row for the active book
  before extraction starts.
- The first selected PDF becomes the active visible document, while all selected
  PDFs stay in the active book for chat and voice context.
- Ingestion tracking is per document through an active-ingestion counter and
  cancelled document-id set, so parallel uploads no longer invalidate each
  other.
- Admin Center preface copy was shortened to one plain sentence.
- README, Tutor Architecture, User Brain Architecture, and App Design Language
  copy now document multi-file intake feeding the shared active-book context.

## Verification

- `npm run test -- tests/study-view-upload.test.mjs tests/brain-context.test.mjs tests/audio-overview-plan.test.mjs`: passed through the project runner, 161 tests.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable because `package.json` has no `brain:postchange` script.
- `npm run brain:ui-regression`: unavailable because `package.json` has no `brain:ui-regression` script.
- `node .workflow/brain-architecture-implementation-program/packets/phase68-browser-qa.mjs`: passed with local Chrome CDP approval. Desktop and mobile Study exposed multi-PDF file inputs; Admin rendered the simplified preface; Revision rendered the App Design Language multi-PDF intake copy with one visible audio Play button, one hidden audio element, no native controls, no fallback play/native fallback copy, no horizontal overflow, and zero captured warning/error logs.
- `graphify update . --force`: regenerated code architecture artifacts with 1109 nodes, 1946 edges, and 62 communities.
- `npm run graphify:tree`: passed, writing `graphify-out/GRAPH_TREE.html` at 81.5 KB.
- Graphify smoke query found `StudyView()`, `ChatPanel()`, `buildBrainContextPacket()`, `buildBrainDocumentRetrievalHint()`, and connected Study/Admin/Revision nodes.
- Graphify path `StudyView()` to `buildBrainContextPacket()` found a three-hop route through `StudyView.tsx`, `ChatPanel.tsx`, and `brain.context.ts`.
- Graphify path `StudyView()` to `ChatPanel()` found the expected route through shared store usage.
- Graph artifact grep found no `server.mjs`, `.tmp-test`, or `/private/tmp` scratch nodes.

## Remaining Work

- Real deliberate provider-key typed-chat plus live-voice beta traffic remains
  the largest unproven local gap.
- AWS/cloud synchronization remains deferred until after beta testing.
