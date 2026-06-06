# Orchestration: Mobile chat first stability

## Execution Rules

- Keep the original objective intact.
- Ask for approval before risky, expensive, external, or destructive actions.
- Keep immediate blocking work local.
- Delegate only bounded, disjoint, materially useful packets.
- Integrate packet results before final verification.

## Branching Rules

- If provider-key approval is not granted, implement only secret-safe
  server-fallback support and tests; do not read keys or run live traffic.
- If mobile chat-first changes regress desktop split view, preserve desktop and
  narrow the responsive breakpoint behavior.
- If audits find unrelated cleanup opportunities, record them but do not expand
  the edit scope unless they block correctness or verification.
- If official docs conflict with local assumptions, official docs and live
  provider behavior win.

## Packet Prompts

- Packet A owns `src/views/StudyView.tsx` and StudyView-focused tests only.
- Packet B is read-only over `server.ts`, `ChatPanel.tsx`, settings/provider
  tests, and official provider routing assumptions. It may write only its result
  note.
- Packet C is read-only over Graphify-connected source/package metadata and
  writes only its result note.
- Packet D is read-only verification planning and writes only its result note.

## Completion Audit

- Integrate accepted packet results.
- Record rejected findings and conflicts.
- Verify secret scanning and client-bundle safety.
- Run all required code and live UI gates.
- Record remaining provider/billing risks honestly.
