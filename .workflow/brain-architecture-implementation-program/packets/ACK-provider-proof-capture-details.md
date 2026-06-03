# Packet ACK: Provider Proof Capture Details

## Objective

Make the selected coherent provider-key proof bundle explain which real provider
rows it captured, without relaxing the ACJ proof gate or calling providers
automatically.

## Graphify Route

- `graphify query` routed the remaining provider-key live proof gap through
  `src/memory/beta.diagnostics.ts`, `src/views/AdminView.tsx`,
  `src/components/ChatPanel.tsx`, `src/memory/model.runs.ts`, `server.ts`, and
  `tests/beta-diagnostics.test.mjs`.
- Direct source inspection stayed scoped to those connected diagnostics,
  runtime, Admin, and test files.

## Scope

- Add provider-capture details to selected coherent request bundles.
- Show compact provider capture evidence in Admin Beta Diagnostics.
- Preserve the hard provider proof boundary:
  - typed chat still needs a completed OpenRouter-backed `chat_stream` row;
  - live voice still needs the non-mock Deepgram `Voice provider ready` server
    activity row.
- Keep AWS/cloud deployment and automatic provider traffic out of scope.

## Verification Plan

- `npm run format`
- `npm run test -- tests/beta-diagnostics.test.mjs`
- `npm run test`
- `npm run format:check`
- `npm run lint`
- `npm run build`
- Browser QA for Admin Beta Diagnostics desktop/mobile.
- Regenerate and smoke-test Graphify code architecture artifacts.
