Packet ID: ABJ
Objective: Make the shared chat/voice brain-context packet prove that the active
book's wider PDF set is considered, not only the PDF currently on screen.
Context: The user explicitly asked that multiple PDFs added to a book go into
chatbot and voice context. Earlier slices added shared packet wiring; this slice
tightens the packet contract and Admin evidence.
Files / sources:
- src/memory/brain.context.ts
- src/components/ChatPanel.tsx
- server.ts
- src/views/AdminView.tsx
- tests/brain-context.test.mjs
- tests/system-activity.test.mjs
- README.md
- TUTOR_ARCHITECTURE.md
- src/lib/tutorBook.json
- src/lib/userBrainArchitectureBook.ts
- src/views/RevisionView.tsx
Ownership: Main agent. No sidecar writes.
Do:
- Add an active-book PDF manifest to the local brain-context packet.
- Preserve balanced ready-PDF excerpts for both typed chat and live voice.
- Record added, ready, excerpted, pending/failed, and omitted PDF counts in
  packet memory events, chat server activity metadata, and voice auth metadata.
- Show those counts in Admin request timelines.
- Keep the stored audio overview UI to one visible player with hidden retry.
Do not:
- Implement AWS/cloud sync.
- Claim provider-key chat or real Deepgram turns are proven unless actually run.
- Change Dexie schema for this metadata-only slice.
Expected output:
- Source-backed context packet metadata.
- Admin timeline chips for PDF count evidence.
- Focused tests for ready, pending, and omitted PDF context behavior.
Verification:
- Focused brain-context and system-activity tests.
- npm run format, format:check, lint, test, build.
- Browser QA for Admin request timeline and Revision/App Design visible copy.
- Explicit Graphify regeneration and query smoke if source graph changes.
