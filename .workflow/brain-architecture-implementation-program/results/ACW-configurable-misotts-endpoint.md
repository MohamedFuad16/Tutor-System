# Packet ACW Result: Configurable MisoTTS Endpoint

## Accepted

- Added `miso_tts_api_url` store state with a default
  `http://127.0.0.1:8080` tunnel endpoint and blank-to-server-env fallback.
- Settings now exposes a `MisoTTS API URL` field near the TTS voice picker so
  the user can point Read Aloud at the Vast tunnel or any compatible endpoint.
- ChatPanel forwards `x-miso-tts-api-url` only for the `miso-tts-8b` read-aloud
  voice, keeping Deepgram key forwarding unchanged.
- Admin System Activity forwards the selected MisoTTS endpoint to the provider
  health probe, so the provider meter reflects the user's active endpoint.
- `server.ts` now validates MisoTTS endpoint overrides as HTTP/HTTPS URLs,
  applies them to `/api/debug/system-activity`, and applies them to
  `/api/tts?voice=miso-tts-8b`.
- Vast host proof improved: SSH works, the remote wrapper imports passed, the
  wrapper was copied to `/root/MisoTTS/misotts_api_server.py`, remote health
  passed on `127.0.0.1:18080`, and a local tunnel to `127.0.0.1:8080` returned
  healthy provider JSON with `loaded:false`.

## Rejected

- No AWS/cloud provider was implemented.
- No browser-visible audio success was claimed because the 8B model remains
  unloaded on the current 32 GB Vast container disk.
- No persistent provider process manager or Graphify watch/hook was added.

## Verification Evidence

- Remote Vast disk check still shows a 32 GB container filesystem with about 26
  GB available, too small for the previously measured roughly 32.75 GB MisoTTS
  8B checkpoint blob.
- Remote Vast imports passed for Torch/CUDA, torchaudio, and `generator.load_miso_8b`;
  remote GPU is an NVIDIA GeForce RTX 3090.
- Remote `/health` via SSH passed with `service: misotts-tutor-api`,
  `model: MisoTTS 8B`, `device: cuda`, and `loaded: false`.
- Local tunnel `http://127.0.0.1:8080/health` passed with the same MisoTTS
  provider JSON.
- `npm run test -- tests/tts-provider-routing.test.mjs
tests/system-activity.test.mjs tests/beta-diagnostics.test.mjs`: passed via the
  project runner, 179 tests.
- `npm run format:check`: passed.
- Direct touched-file Prettier check: passed.
- `npm run lint`: passed.
- `npm run build`: passed.
- In-app Browser QA confirmed Settings has the `MisoTTS API URL` field and
  `http://127.0.0.1:8080` value in the DOM, Admin System Activity rendered
  `Providers Ready` as `4`, and zero warning/error console logs were captured.
- Browser screenshot saved as
  `ACW-misotts-admin-provider-ready-desktop.png`.
- `graphify update . --force`: passed, regenerating code architecture artifacts
  with 1182 nodes, 2042 edges, and 76 communities.
- `npm run graphify:tree`: passed, writing `graphify-out/GRAPH_TREE.html`
  (`85.7 KB`).
- Graph artifact grep found no `server.mjs`, `.tmp-test`, `/private/tmp`, or
  `codex-runtimes` scratch references.

## Remaining Work

- Re-provision Vast with a larger executable disk, preload the MisoTTS 8B
  weights, and capture real read-aloud audio proof.
- Run the deliberate real OpenRouter plus Deepgram provider-key beta drill.
- AWS/cloud synchronization remains deferred until after beta testing.
