# P04 Admin/API Lead

Objective:
Audit and expand tests around Admin diagnostics, server logs, debug views, SSE/chat streaming, voice websocket mock flow, and web search stubs.

Graphify files:
- `src/views/AdminView.tsx`
- `src/memory/beta.diagnostics.ts`
- `server.ts`
- `server/web-search.ts`
- `src/lib/chatAgentTools.ts`
- `src/lib/voiceAgentTools.ts`

Ownership:
- Proposed or direct test changes under `tests/admin-*.test.mjs`, `tests/system-activity.test.mjs`, `tests/web-search.test.mjs`, and voice/chat tests.

Do:
- Stub external providers and assert blocked/local behavior.
- Cover response shapes and event metadata.

Do not:
- Make live OpenAI, Deepgram, or search-provider calls.
- Change API contracts outside the test's scope.

Expected output:
- Coverage notes and changed test files, or blocked dependency rationale.

Verification:
- Focused new tests, then `npm test`.
