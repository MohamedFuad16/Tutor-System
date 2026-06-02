# Packet AAG: Multi-PDF Brain Context Parity

## Status

Integrated locally in Phase 54.

## Objective

Make the shared local brain-context packet represent multiple PDFs in the active
learning book for both typed chat and live voice. Keep the active PDF visible in
the packet, but prevent the on-screen PDF from starving other ready document
extracts.

## Scope

- `src/memory/brain.context.ts`
- `src/components/ChatPanel.tsx`
- `server.ts`
- `src/views/RevisionView.tsx`
- `tests/brain-context.test.mjs`
- `tests/system-activity.test.mjs`
- `tests/audio-overview-plan.test.mjs`
- Architecture books and workflow evidence

## Integration Notes

- `buildBrainDocumentContext()` now builds a ready-document index, marks the
  active document, and balances excerpts across up to six ready PDFs.
- Voice packets assemble active-book and document context before long memory, so
  voice compaction keeps multi-PDF context in the live prompt.
- Voice auth and system activity metadata now carry attached document ids.
- Brain-context memory events now include `documentIds` in metadata as well as
  `sourceIds`.
- Stored audio overview fallback copy was replaced with single-player bounded
  retry language, and the same hidden audio element handles retries without a
  second visible play button.

## Out Of Scope

- AWS/cloud sync.
- Spending live provider calls for real chat/voice beta traffic.
- Reworking document ingestion or Dexie schema.
