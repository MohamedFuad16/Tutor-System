# Packet ADP: Dev-Server Alternate-Port Startup

## Objective

Fix the local dev-server startup path so `npm run dev -- --host 127.0.0.1
--port 3100` honors the requested host and port instead of always binding the
default `3000` listener.

## Context

During Study PDF rail QA, the default `3000` listener was already occupied. A
second dev server was attempted with `--host 127.0.0.1 --port 3100`, but
`server.ts` only read `process.env.PORT`, so the process still tried to bind
`0.0.0.0:3000` and failed with `EADDRINUSE`.

## Ownership

- `server.ts`
- `tests/runtime-settings.test.mjs`
- `README.md`
- Workflow evidence only

## Do

- Add a small testable parser for server startup host/port options.
- Preserve default `npm run dev` behavior.
- Verify the original alternate-port command starts and serves the app.
- Do not touch provider traffic, microphone, Deepgram, OpenRouter, or AWS/cloud
  systems.

## Expected Output

- CLI `--host` and `--port` override `HOST`/`PORT` defaults for direct server
  startup.
- README documents the alternate-port command.
- Focused tests and live startup probe pass.

## Verification

- Bundle `server.ts` into `.tmp-test/server.mjs`.
- Run `node --test tests/runtime-settings.test.mjs`.
- Run `npm run dev -- --host 127.0.0.1 --port 3100`, verify HTTP 200, then stop
  the temporary process.
- Run lint/build and diff hygiene.
