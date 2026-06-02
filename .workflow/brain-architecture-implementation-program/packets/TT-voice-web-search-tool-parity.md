# Packet TT: voice web-search tool parity

## Objective

Close the local voice-vs-typed-chat parity gap for explicit live-web and
freshness questions without adding AWS/cloud behavior.

## Scope

- Keep Graphify-first navigation and read only connected source files.
- Add a local voice `web_search` tool definition for Deepgram voice-agent calls.
- Route voice web-search requests through a local server endpoint that records
  Admin/system activity.
- Store returned web sources as local source-card artifacts and citation-state
  provenance from the voice path.
- Keep source-material questions local first: current page, selected text,
  active document, and active book must not be treated as web-search requests
  unless the user clearly asks for external/fresh information.
- Update architecture books/workflow evidence and regenerate Graphify code
  architecture artifacts.

## Out Of Scope

- AWS/cloud synchronization, production key policy, or hosted search workers.
- Live Deepgram provider success-path QA.
- Voice current-page vision parity.
