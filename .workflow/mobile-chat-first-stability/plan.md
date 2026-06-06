# Mobile chat first stability

## Goal

Make Study mobile-first for asking questions, with the chatbot occupying the
primary viewport and PDFs represented as attached book context rather than a
full competing reader. Clean and stabilize the directly connected runtime,
securely support server-side OpenRouter and Deepgram environment keys, audit
deprecated patterns against official documentation, add regression tests, and
fix verified bugs without exposing secrets or reverting unrelated work.

## Success Criteria

- Mobile Study opens into a full-height chatbot-focused workspace.
- Active PDFs remain visible as compact attached context and can be opened or
  switched intentionally without permanently occupying the mobile viewport.
- Desktop PDF plus chat behavior remains intact.
- OpenRouter and Deepgram environment keys are consumed server-side only.
- No provider key is added to tracked files, browser storage, client bundles,
  screenshots, workflow artifacts, or test fixtures.
- Provider traffic is not enabled for shared visitors without explicit billing
  approval.
- Directly connected cleanup findings are fixed and covered by tests.
- Official provider/framework documentation is recorded for deprecated or
  current API decisions.
- Focused tests, full node/DOM suites, lint, build, format, brain post-change,
  and desktop/mobile live UI checks pass.

## Current Context

- Graphify routes the product surface through `StudyView`, `ChatPanel`,
  `PdfViewer`, `src/store/index.ts`, `server.ts`, and provider-routing tests.
- Book-scoped chat and multi-PDF context already exist.
- The current user request prioritizes a chat-first mobile experience and broad
  stability work.
- The worktree started clean except for this workflow directory.

## Constraints

- Follow `AGENTS.md`: Graphify-first, inspect only directly connected files,
  never edit `graphify-out`, and preserve unrelated work.
- Keep API keys server-side and out of Git.
- Avoid broad codemods, dependency upgrades, destructive resets, and provider
  traffic without approval.
- Keep lane write scopes disjoint and integrate centrally.

## Risks

- Shared provider keys can create quota abuse and billing exposure.
- Mobile layout changes can regress desktop split-view behavior.
- Large cleanup requests can drift into unrelated refactors.
- Live voice requires a Node websocket host; serverless deployment cannot prove
  the same realtime path.

## Approval Required

- Pending: allow anyone who can reach the local site to consume the owner's
  OpenRouter and Deepgram quotas through server-side provider keys.
- Pending: any dependency upgrade, provider traffic drill, or GitHub push.
- No approval required for read-only audit, local code changes, tests, and
  server-side secret-safe routing that remains disabled until configured.

## Work Packets

- `mobile-study-chat-first`: StudyView-only mobile layout and focused tests.
- `provider-security-routing`: read-only provider/env routing audit and safe
  implementation proposal; no secret reads or provider traffic.
- `dependency-cleanup-audit`: read-only deprecated-code and performance audit
  over Graphify-connected files.
- `qa-regression`: independent test-gap and live-UI verification plan.

## Integration Policy

- Accept only findings backed by source, tests, or official documentation.
- Keep edits scoped to directly connected files.
- Reject changes that expose provider keys or weaken existing desktop behavior.
- Main agent integrates cross-lane conflicts and owns final verification.

## Verification

- Focused unit/rendered tests for touched behavior.
- `npm run test:node`
- `npm run test:dom`
- `npm run lint`
- `npm run build`
- `npm run format:check`
- `npm run brain:postchange -- --reason mobile-chat-first-stability`
- Desktop and mobile live UI probes for overflow, console errors, interaction,
  chatbot focus, and attached-PDF behavior.

## Reusable Artifacts

- Workflow packet/result notes and final report.
- Regression tests documenting mobile chat-first and secret-safe provider
  routing contracts.
