#!/usr/bin/env python3
"""HTTP wrapper for serving MisoTTS 8B behind Tutor's local /api/tts route.

Run this from the cloned MisoTTS repository after installing its dependencies:

    python -m pip install fastapi uvicorn
    python /path/to/misotts_api_server.py --host 127.0.0.1 --port 8080

Tutor reaches it through MISO_TTS_API_URL, defaulting to http://127.0.0.1:8080.
"""

from __future__ import annotations

import argparse
import io
import os
import threading
from typing import Any

import torch
import torchaudio  # type: ignore
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field

from generator import DEFAULT_MISO_TTS_REPO_ID, load_miso_8b


class SpeechRequest(BaseModel):
  text: str = Field(min_length=1, max_length=4000)
  speaker: int = Field(default=0, ge=0, le=3)
  max_audio_length_ms: int = Field(default=10_000, ge=500, le=90_000)
  temperature: float = Field(default=0.9, ge=0.1, le=2.0)
  topk: int = Field(default=50, ge=1, le=200)


app = FastAPI(title="MisoTTS Tutor API", version="0.1.0")
_generator: Any | None = None
_generator_lock = threading.Lock()
_model_source = os.environ.get("MISO_TTS_8B_MODEL", DEFAULT_MISO_TTS_REPO_ID)
_device = "cuda" if torch.cuda.is_available() else "cpu"


def generator() -> Any:
  global _generator
  if _generator is None:
    with _generator_lock:
      if _generator is None:
        _generator = load_miso_8b(
          device=_device,
          model_path_or_repo_id=_model_source,
        )
  return _generator


@app.get("/health")
def health() -> dict[str, Any]:
  return {
    "ok": True,
    "service": "misotts-tutor-api",
    "model": "MisoTTS 8B",
    "modelSource": _model_source,
    "device": _device,
    "loaded": _generator is not None,
  }


@app.post("/v1/audio/speech")
def speech(request: SpeechRequest) -> Response:
  try:
    gen = generator()
    with _generator_lock:
      audio = gen.generate(
        text=request.text,
        speaker=request.speaker,
        context=[],
        max_audio_length_ms=request.max_audio_length_ms,
        temperature=request.temperature,
        topk=request.topk,
      )
    buffer = io.BytesIO()
    torchaudio.save(
      buffer,
      audio.unsqueeze(0).detach().cpu(),
      gen.sample_rate,
      format="wav",
    )
    return Response(
      content=buffer.getvalue(),
      media_type="audio/wav",
      headers={
        "X-MisoTTS-Model": "miso-tts-8b",
        "X-MisoTTS-Sample-Rate": str(gen.sample_rate),
      },
    )
  except Exception as exc:
    raise HTTPException(status_code=500, detail=str(exc)) from exc


def main() -> None:
  parser = argparse.ArgumentParser()
  parser.add_argument("--host", default="127.0.0.1")
  parser.add_argument("--port", type=int, default=8080)
  args = parser.parse_args()
  uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
  main()
