# Packet B: Runtime Telemetry And Tool Calls

Objective: Implement the first local event-capture contracts for system activity, model behavior, tool calls, retrieval, memory updates, and errors.

Ownership: Main agent.

Do:

- Use Graphify-routed source files.
- Keep contracts local and append-only where possible.
- Prefer narrow server/client contracts over schema churn.
- Make events clear enough for Admin to explain behind-the-scenes behavior.

Do not:

- Implement AWS/cloud persistence.
- Change chat behavior beyond observability hooks.
- Touch unrelated StudyView edits.

Expected output:

- Local event type contract.
- Capture points.
- Admin-readable endpoint/state.
- Focused tests where API behavior changes.
