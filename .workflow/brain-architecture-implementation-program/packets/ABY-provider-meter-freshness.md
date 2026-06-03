Packet ID: ABY

Objective: Keep Admin Beta Diagnostics connected to live local provider/system
meters so the provider-key proof checklist does not depend on stale Activity-tab
state.

Context:

- Packet ABT added the provider-key live proof checklist.
- Packet ABV added coherent chat + voice live proof requirements.
- Packet ABX added the ordered manual beta runbook.
- The remaining observability gap was freshness: `activityPayload` supplies
  provider-meter fallback evidence, but the system-activity poller previously
  shut down after leaving the Activity tab.

Ownership:

- `src/views/AdminView.tsx`
- Workflow QA script/results for this packet.
- Regenerated `graphify-out/*`.

Do:

- Keep the local system-activity payload polling while either Activity or Beta
  Diagnostics is active.
- Surface provider-meter freshness in the Provider-Key Live Proof chip row.
- Verify that `/api/debug/system-activity` keeps polling after entering Beta
  Diagnostics.
- Verify desktop and mobile Admin Beta Diagnostics with no console errors or
  horizontal overflow.

Do not:

- Change provider-key proof semantics.
- Call OpenRouter, Deepgram, or any other provider automatically.
- Treat provider-meter presence as completed live chat/voice proof.
- Add AWS/cloud synchronization.
- Manually edit Graphify artifacts outside the explicit regeneration step.

Expected output:

- Source patch, browser QA evidence, Graphify refresh, commit, and push.

Verification:

- `npm run format`
- `npm run test`
- `npm run format:check`
- `npm run lint`
- `npm run build`
- In-app Browser QA for Admin Beta Diagnostics.
- `node .workflow/brain-architecture-implementation-program/packets/phase61-browser-qa.mjs`
- `graphify update . --force`
- `npm run graphify:tree`
- Graphify smoke query/path checks.
