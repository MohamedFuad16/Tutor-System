# P4 Implementation Readiness

## Objective
Prepare the first implementation slices and GPU recommendation.

## Minimal GPU
Recommended starting Vast.ai machine:
- GPU: RTX 4090 24GB or RTX 3090 24GB.
- CPU: 8 vCPU minimum, 12-16 preferred.
- RAM: 32GB minimum, 64GB preferred.
- Disk: 100GB NVMe minimum. Miso weights are about 32.8GB F32 on Hugging Face, plus repo/env/cache/logs.
- Network: choose the lowest-latency region to the user and provider edges; test Tokyo/US-West depending where the app is used.
- CUDA: modern NVIDIA driver with CUDA 12.x compatible PyTorch.

## Safer GPU
If rental cost is still acceptable, L40S 48GB or A100 40GB gives more room for FP16, KV cache, concurrency, and avoiding offload. This is not required for the first single-user test.

## First Code Slices
1. Add a new broker path behind a feature flag, leaving existing Deepgram Voice Agent path intact.
2. Replace ScriptProcessor capture with AudioWorklet 20ms frames for the new broker path.
3. Implement broker STT-only Deepgram stream and normalize transcript events.
4. Add foreground GPT-4o-mini streaming turn manager with short acknowledgement policy.
5. Upgrade Miso service to stream chunks and support cancellation. If streaming requires deeper Miso generator changes, start with phrase-chunked HTTP plus immediate cancellation while measuring.
6. Move voice web/tool calls from client-only callback shape into server-side/background job queue where possible, preserving UI visual-focus events.
7. Add GPT-5.5 background job adapter with provider/model config and strict result insertion protocol.
8. Add diagnostics: p50/p95/p99 per stage, audio underruns, cancellation latency, provider errors.

## Required Inputs From User
- Vast.ai instance URL/SSH details once rented.
- Deepgram API key.
- OpenRouter API key for GPT-4o-mini.
- GPT-5.5 API key/provider choice.
- Whether Miso should run on the same Node app host or a separate GPU FastAPI host.

## Verification
- Unit tests for broker message normalization and tool-job routing.
- Local mock-provider test for the full socket protocol.
- Live single-user latency drill with timestamped stage metrics.
- Browser desktop/mobile smoke test of voice UI states and barge-in.
- `npm run lint` and `npm run build` after source changes.
