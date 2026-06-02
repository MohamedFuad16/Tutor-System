# Result SS: Request-Correlated Brain Context

## Accepted

- Typed chat now creates a browser request id before retrieval and passes it to
  `MemoryOrchestrator.getRelevantContext()` and `/api/chat`.
- Live voice retrieval rows use the existing voice session id as the request id.
- Retrieval event records now preserve an optional `requestId`.
- `/api/chat` adopts a validated browser request id so server activity, SSE
  model events, and tool-job events match the browser retrieval row.
- Admin request timelines now include retrieval injections alongside server
  events, model runs, and tool jobs.
- README, Tutor System Architecture, User Brain Architecture, and App Design
  Language copy now describe request-correlated brain context injection.

## Rejected

- A Dexie schema/index bump was not needed; Admin reads recent retrieval rows by
  timestamp and groups them in memory.
- AWS/cloud synchronization remains deferred until beta testing.

## Verification Evidence

- `npm run format`: passed.
- `npm run lint`: passed.
- `npm run format:check`: passed.
- `npm run test`: passed, 92 tests.
- `npm run build`: passed.
- Headless Chrome CDP fallback QA on `http://127.0.0.1:3100`:
  - Study desktop rendered with zero console/page errors.
  - Study mobile `390x844` rendered with zero console/page errors.
  - Admin System Activity rendered Request timelines with zero console/page
    errors.
  - Admin Retrieval Events tab body showed Recent retrievals and memory context
    selection copy with zero console/page errors.
  - Admin Model Runs body showed provider/model/tool language with zero
    console/page errors.

## Remaining Work

- Browser-verify a real successful chat request with a configured OpenRouter key
  so a live retrieval/model/tool timeline can be inspected end to end.
- Browser-verify a live Deepgram voice round trip when provider access is in
  scope.
- Continue closing typed-chat vs voice parity for current-page vision and web
  search tools.
