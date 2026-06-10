# Vast GPU Setup Result

## Instance
- SSH: `ssh -p 19691 root@175.155.64.137`
- GPU: NVIDIA GeForce RTX 4090 reported by `nvidia-smi` with 49140 MiB VRAM.
- Driver/CUDA: NVIDIA driver 550.144.03, CUDA runtime 12.4, `nvcc` 12.6.
- Persistent local volume: `/workspace`, 107 GB available.

## Cache Layout
The container root is only about 32 GB, so model and package caches must stay on
the attached `/workspace` volume:

```bash
export HF_HOME=/workspace/hf
export HUGGINGFACE_HUB_CACHE=/workspace/hf/hub
export UV_CACHE_DIR=/workspace/uv-cache
export XDG_CACHE_HOME=/workspace/.cache
export MISO_TTS_8B_MODEL=/workspace/hf/hub/models--MisoLabs--MisoTTS/snapshots/ef6b096cc35d3cde6aa0721013648416c14c36b2/model.safetensors
export MISO_TTS_TOKENIZER_MODEL=unsloth/Llama-3.2-1B
```

These exports are stored on the instance at:

```text
/workspace/miso-service/env.sh
```

## Miso Install
MisoTTS was cloned to:

```text
/workspace/MisoTTS
```

The repo was synced with:

```bash
cd /workspace/MisoTTS
source /workspace/miso-service/env.sh
uv sync --python 3.10
```

Tutor's HTTP wrapper was copied to:

```text
/workspace/miso-service/misotts_api_server.py
```

## Service Command
Run from the MisoTTS repo so the wrapper can import Miso's `generator` module:

```bash
cd /workspace/MisoTTS
source /workspace/miso-service/env.sh
PYTHONPATH=/workspace/MisoTTS uv run python /workspace/miso-service/misotts_api_server.py --host 127.0.0.1 --port 8090
```

Keep the local tunnel open from the Mac:

```bash
ssh -N -p 19691 root@175.155.64.137 -L 8080:localhost:8090
```

Then configure Tutor with:

```bash
VITE_VOICE_BROKER_MODE=custom
MISO_TTS_API_URL=http://127.0.0.1:8080
```

## Notes
- First Miso startup downloads the model weights, Mimi codec, SilentCipher, and
  tokenizer into `/workspace/hf`.
- Miso's upstream generator defaults to gated `meta-llama/Llama-3.2-1B` for
  the tokenizer. Tutor's wrapper supports `MISO_TTS_TOKENIZER_MODEL`; this
  instance uses public `unsloth/Llama-3.2-1B`, which reports matching BOS/EOS
  ids and vocabulary size.
- The broker is BYOK by default for OpenRouter, Deepgram, and Serper. Shared
  server fallback keys require explicit fallback flags.

## Verification
- Local tunnel health:

```bash
curl http://127.0.0.1:8080/health
```

returned `device: cuda`, `loaded: true`, and tokenizer source
`unsloth/Llama-3.2-1B`.

- Cold speech smoke after model download:
  - status: 200
  - bytes: 7758
  - wall time: 87.77s
  - wrapper timing: generator load 80.62s, generation 4.91s

- Warm speech smoke:
  - status: 200
  - bytes: 23118
  - wall time through tunnel: 6.13s
  - wrapper timing: generation 3.36s
  - output: RIFF WAV, PCM 16-bit mono 24000 Hz

This proves the GPU service works, but the current wrapper is whole-utterance
TTS. It is not yet a 110ms streaming path.
