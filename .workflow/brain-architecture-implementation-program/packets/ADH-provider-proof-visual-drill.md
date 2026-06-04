# Packet ADH: Real provider proof drill and visual voice intelligence

## Objective

Run the approved real provider-key drill under one coherent local proof attempt:
one OpenRouter typed-chat proof and one Deepgram live-voice proof, with visual
voice-chat intelligence included in the acceptance bar.

## Context

- Packet ADG exposed every remaining readiness gap group.
- The user has explicitly approved necessary OpenRouter and Deepgram provider
  traffic for this packet.
- AWS/cloud work remains out of scope.
- Prior stale browser-state provider/TTS/Deepgram activity is not accepted as
  proof and must be distinguished from the intentional ADH drill.

## Ownership

- Main agent owns implementation, live drill execution, browser QA, evidence,
  verification, commit, and push.
- Sidecar-style packet notes may be simulated in `results/` when useful, but
  write scope remains local and bounded to directly connected proof surfaces.

## Sources

Graphify-first routing identified the connected source surfaces:

- `src/components/ChatPanel.tsx`
- `src/views/AdminView.tsx`
- `src/memory/beta.diagnostics.ts`
- `src/memory/longterm.memory.ts`
- `src/memory/memory.orchestrator.ts`
- `src/lib/voiceAgentTools.ts`
- `src/lib/chatAgentTools.ts`
- `server.ts`
- `server/web-search.ts`
- focused proof/search/voice tests in `tests/*.test.mjs`

## Acceptance Bar

- One coherent proof attempt ID links the typed-chat proof and live-voice proof.
- The typed-chat leg records intentional OpenRouter provider traffic.
- The live-voice leg records intentional Deepgram provider readiness and voice
  proof activity.
- Admin/Beta Diagnostics shows the provider drill as complete/ready rather than
  a remaining readiness gap.
- Evidence distinguishes intentional ADH provider traffic from stale browser
  side effects or seeded QA fixtures.
- Browser-visible Admin, ChatPanel, and voice proof evidence is captured.
- During the Deepgram live voice portion, voice chat can bring up or reference
  relevant flowcharts/diagram surfaces when the spoken answer calls for them.
- The UI highlights, focuses, or otherwise marks the component/diagram/section
  currently being spoken about so the user can visually follow the voice
  explanation.
- Image retrieval/display through the app's web-search API path is verified
  when a voice/chat response needs external images. Evidence records whether
  images render in the chat/tool surface and whether source/tool metadata is
  visible.
- If any visual voice-chat behavior is missing, document it as a hard gap, add
  the smallest safe local fix if in scope, rerun focused tests/browser QA, and
  do not mark the provider drill complete until the gap is proved or explicitly
  reported blocked.

## Do

- Use Graphify before source reads and inspect only connected files.
- Create a fresh intentional proof attempt for ADH and record its ID in results.
- Run the typed-chat and live-voice proof using the existing app proof workflow.
- Preserve provider credentials; never print keys or store raw secrets.
- Capture screenshots/DOM evidence for Admin diagnostics, ChatPanel proof HUD,
  voice visual focus, diagram/flowchart behavior, and web-search image display.
- Run focused provider/proof tests, `npm run brain:postchange -- --reason
provider-drill --full`, `npm run build`, browser QA, and Graphify
  regeneration/tree update if code architecture artifacts change.
- Update workflow `state.json`, `final-report.md`, and `results/`.
- Commit and push to `main` only after verification passes.

## Do Not

- Do not start AWS/cloud work.
- Do not treat stale shared browser state, fallback rows, mock rows, synthetic
  rows, or QA-seeded rows as final provider proof.
- Do not claim completion if the visual voice-chat behaviors are skipped.
- Do not edit `graphify-out` by hand.
- Do not stage unrelated untracked workflow folders.

## Expected Output

- A workflow result with the proof attempt ID, typed-chat request ID,
  live-voice request/session ID, provider capture rows, visual behavior
  evidence, screenshots, and verification results.
- Local source changes only if needed to close safe, in-scope visual/proof
  gaps.
- A pushed commit on `main` when the packet passes.
