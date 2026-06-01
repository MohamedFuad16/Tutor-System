# Packet C Result: Admin Observability UI

Status: completed.

Implemented in `src/views/AdminView.tsx`:

- New default `System Activity` tab.
- Live local event stream with status pills, kind icons, request IDs, metadata details, and redacted payload display.
- Meters for tokens, estimated cost, web events, voice sessions, books, mapped concepts, active book, project, pricing freshness, and provider readiness.
- Event-mix summaries by kind and status.
- Tuning snapshot from backend debug meters.
- Mobile tab controls for Activity, Traces, and Console.
- Loading, empty, offline/error, and auto-refresh states.

Browser QA evidence:

- Admin Activity rendered live at `http://localhost:3001`.
- Auto-refresh surfaced a local blocked chat event after a no-key `/api/chat` request.
- The UI showed `Activity Events: 2`, `Chat request blocked`, `model`, `blocked`, request ID, and event mix counts.
- Traces and Console tabs were smoke-tested during the run; the final successful evidence focused on the Activity tab after the dev-port fix.
