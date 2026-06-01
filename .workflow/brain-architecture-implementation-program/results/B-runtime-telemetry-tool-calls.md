# Packet B Result: Runtime Telemetry And Tool Calls

Status: completed.

Implemented in `server.ts`:

- `SystemActivityEvent` contract with `kind`, `status`, `requestId`, `model`, `toolName`, `phase`, `durationMs`, and redacted metadata.
- Local in-memory 250-event retention ledger.
- `/api/debug/system-activity` endpoint with debug authorization and localhost/null-origin development CORS.
- Summary meters for event counts, provider readiness, Graphify vs learner-brain distinction, and tuning values.
- Chat SSE `requestId` attached to emitted events.

Capture points:

- Chat request start, blocked no-key path, model stream attempts, model fallback, completion, and errors.
- Web search start/completion/failure.
- Tool execution request, `look_at_current_page`, `web_search`, `update_graph`, `generate_flashcards`, parse failures, blocked source-local web search, and unsupported tools.
- Trace explanation, learning-book update, and standalone flashcard endpoints.

Privacy controls:

- Metadata redacts fields containing key/token/authorization/secret/password.
- Long string metadata is truncated.
- Raw base64 page images, API keys, and authorization headers are not stored in the activity ledger.
