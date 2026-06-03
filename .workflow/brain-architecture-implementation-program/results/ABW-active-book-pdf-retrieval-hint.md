# Packet ABW Result: Active-Book PDF Retrieval Hint

## Accepted

- Added `buildBrainDocumentRetrievalHint()` and `buildBrainRetrievalQuery()` in
  `src/memory/brain.context.ts`.
- `buildBrainContextPacket()` now sends semantic retrieval the original query
  plus a compact active-book PDF hint. The hint names the active PDF on screen,
  companion PDFs, document ids, processing status, classification, and
  extraction mode.
- Typed chat and live voice both use this path because both already build their
  context through `buildBrainContextPacket()`.
- Simplified the Admin Center preface to one plain sentence.
- Kept stored audio overview fallback behavior hidden inside the same custom
  player. Browser QA confirmed there is one visible Play button, no visible
  fallback/retry/native controls, and one hidden `audio.sr-only` element.
- Updated the User Brain Architecture, Tutor System Architecture, and App
  Design Language book copy to describe the retrieval-hint contract.

## Rejected

- Adding or rearranging built-in chapters in this packet. The stored audio
  manifest is chapter-index coupled and already has 3-4 minute checked-in assets;
  changing chapter order without regenerating matching audio would weaken the
  reader.
- Running provider-key chat/voice traffic. This remains an explicit live beta
  validation step, not a source/test slice.

## Verification

- `npm run format`: passed.
- `npm run test`: passed, 151 tests.
- `npm run brain:postchange -- --reason debug-skill-change`: unavailable
  because `package.json` has no `brain:postchange` script.
- `npm run brain:ui-regression`: unavailable because `package.json` has no
  `brain:ui-regression` script.
- `npm run format:check`: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- `node .workflow/brain-architecture-implementation-program/packets/phase59-browser-qa.mjs`:
  passed with local Chrome CDP approval. Desktop and mobile Admin rendered the
  simplified preface with no horizontal overflow and zero console logs. Desktop
  and mobile Revision rendered App Design Language audio with exactly one
  visible Play button, no fallback/retry/native controls, one hidden audio
  element, the retrieval-hint copy, no horizontal overflow, and zero console
  logs.
- `graphify update . --force`: passed, regenerating code architecture artifacts
  with 1071 nodes, 1893 edges, and 63 communities.
- `npm run graphify:tree`: passed, writing `graphify-out/GRAPH_TREE.html`
  (`79.3 KB`).
- Graphify smoke query found `buildBrainDocumentRetrievalHint()`,
  `buildBrainRetrievalQuery()`, `buildBrainContextPacket()`, `ChatPanel()`,
  `brain.context.ts`, and connected Study/Admin/Revision nodes.
- Graphify path `buildBrainRetrievalQuery()` to `ChatPanel()` found a
  three-hop route through `brain.context.ts` and `ChatPanel.tsx`.
- Graphify path `buildBrainDocumentRetrievalHint()` to
  `buildBrainContextPacket()` found the expected helper route through
  `buildBrainRetrievalQuery()`.
- Graph artifact grep found no `server.mjs`, `.tmp-test`, or `/private/tmp`
  scratch nodes.

## Remaining Risk

- This packet proves the local retrieval query and visible UI contracts. It does
  not replace the required deliberate provider-key typed-chat and live-voice
  beta run that must populate real ledgers for the coherent live proof bundle.
