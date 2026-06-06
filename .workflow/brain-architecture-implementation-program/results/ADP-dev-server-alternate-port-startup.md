# Packet ADP Result: Dev-Server Alternate-Port Startup

## Status

Completed locally without provider traffic.

## Accepted Results

- `server.ts` now exports `parseServerStartOptions()`, which accepts
  `--port`, `--port=`, `--host`, and `--host=` direct startup arguments.
- Direct server startup now binds the parsed host/port while preserving the
  default `0.0.0.0:3000` behavior.
- `tests/runtime-settings.test.mjs` covers CLI overrides, environment defaults,
  and invalid-port fallback.
- `README.md` documents the alternate-port command for local runs when `3000`
  is occupied.

## Verification Evidence

- `./node_modules/.bin/esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=.tmp-test/server.mjs && node --test tests/runtime-settings.test.mjs`:
  passed 4 tests.
- `npm run dev -- --host 127.0.0.1 --port 3100`: started successfully and
  logged `http://127.0.0.1:3100`.
- `curl -sS -I http://127.0.0.1:3100/`: returned `HTTP/1.1 200 OK`.
- The temporary `3100` server was stopped after the probe.
- First full postchange run found one transient DOM assertion miss in
  `rendered-chatpanel-expanded`. The isolated HTTP-error test, the complete
  ChatPanel expanded file, and `npm run test:dom` all passed on rerun without
  source changes.
- `npm run brain:postchange -- --reason dev-server-alternate-port-startup-rerun --full`:
  passed format check, lint/typecheck, production build, diff whitespace check,
  258 node tests, 585 rendered DOM tests, and graphify-out scratch scan.

## Remaining Risk

- This does not change the final provider-proof gate. Real OpenRouter typed chat
  plus real Deepgram live voice/microphone proof still requires explicit
  operator approval.
