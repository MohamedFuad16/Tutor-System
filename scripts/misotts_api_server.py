#!/usr/bin/env python3
"""HTTP wrapper for serving MisoTTS 8B behind Tutor's local /api/tts route.

Run this from the cloned MisoTTS repository after installing its dependencies:

    python -m pip install fastapi uvicorn
    python /path/to/misotts_api_server.py --host 127.0.0.1 --port 8080

Tutor reaches it through MISO_TTS_API_URL, defaulting to http://127.0.0.1:8080.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import os
from pathlib import Path
import threading
import time
from typing import Any

import torch
import torchaudio  # type: ignore
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
from tokenizers.processors import TemplateProcessing
from transformers import AutoTokenizer

import generator as miso_generator
from generator import DEFAULT_MISO_TTS_REPO_ID, load_miso_8b


class SpeechRequest(BaseModel):
  text: str = Field(min_length=1, max_length=4000)
  speaker: int = Field(default=0, ge=0, le=3)
  max_audio_length_ms: int = Field(default=10_000, ge=80, le=90_000)
  temperature: float = Field(default=0.9, ge=0.1, le=2.0)
  topk: int = Field(default=50, ge=1, le=200)


class PrewarmRequest(BaseModel):
  texts: list[str] = Field(default_factory=list, max_length=32)
  speaker: int = Field(default=0, ge=0, le=3)
  max_audio_length_ms: int = Field(default=500, ge=80, le=5000)
  temperature: float = Field(default=0.9, ge=0.1, le=2.0)
  topk: int = Field(default=50, ge=1, le=200)


app = FastAPI(title="MisoTTS Tutor API", version="0.1.0")
_generator: Any | None = None
_generator_lock = threading.Lock()
_model_source = os.environ.get("MISO_TTS_8B_MODEL", DEFAULT_MISO_TTS_REPO_ID)
_tokenizer_source = os.environ.get("MISO_TTS_TOKENIZER_MODEL", "").strip()
_cache_dir = Path(os.environ.get("MISO_TTS_CACHE_DIR", "/workspace/miso-service/cache"))
_device = "cuda" if torch.cuda.is_available() else "cpu"


def log_stage(message: str, started_at: float | None = None) -> None:
  if started_at is None:
    print(f"[MisoTTS API] {message}", flush=True)
    return
  print(
    f"[MisoTTS API] {message} in {time.perf_counter() - started_at:.2f}s",
    flush=True,
  )


def cache_key(request: SpeechRequest) -> str:
  payload = "|".join(
    [
      request.text.strip(),
      str(request.speaker),
      str(request.max_audio_length_ms),
      f"{request.temperature:.4f}",
      str(request.topk),
      _model_source,
      _tokenizer_source,
    ],
  )
  return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def cached_response(path: Path, started_at: float) -> Response | None:
  if not path.exists():
    return None
  payload = path.read_bytes()
  log_stage(f"served cached wav {path.name}", started_at)
  return Response(
    content=payload,
    media_type="audio/wav",
    headers={
      "X-MisoTTS-Model": "miso-tts-8b",
      "X-MisoTTS-Cache": "hit",
      "X-MisoTTS-Sample-Rate": "24000",
    },
  )


def load_configured_llama_tokenizer() -> Any:
  started_at = time.perf_counter()
  tokenizer = AutoTokenizer.from_pretrained(_tokenizer_source)
  bos = tokenizer.bos_token
  eos = tokenizer.eos_token
  tokenizer._tokenizer.post_processor = TemplateProcessing(
    single=f"{bos}:0 $A:0 {eos}:0",
    pair=f"{bos}:0 $A:0 {eos}:0 {bos}:1 $B:1 {eos}:1",
    special_tokens=[
      (f"{bos}", tokenizer.bos_token_id),
      (f"{eos}", tokenizer.eos_token_id),
    ],
  )
  log_stage(f"loaded tokenizer {_tokenizer_source}", started_at)
  return tokenizer


if _tokenizer_source:
  miso_generator.load_llama3_tokenizer = load_configured_llama_tokenizer


def generator() -> Any:
  global _generator
  if _generator is None:
    with _generator_lock:
      if _generator is None:
        started_at = time.perf_counter()
        log_stage(
          f"loading generator source={_model_source} tokenizer={_tokenizer_source or 'meta-llama/Llama-3.2-1B'} device={_device}",
        )
        _generator = load_miso_8b(
          device=_device,
          model_path_or_repo_id=_model_source,
        )
        log_stage("loaded generator", started_at)
  return _generator


@app.get("/health")
def health() -> dict[str, Any]:
  return {
    "ok": True,
    "service": "misotts-tutor-api",
    "model": "MisoTTS 8B",
    "modelSource": _model_source,
    "tokenizerSource": _tokenizer_source or "meta-llama/Llama-3.2-1B",
    "device": _device,
    "loaded": _generator is not None,
  }


@app.post("/v1/audio/speech")
def speech(request: SpeechRequest) -> Response:
  try:
    request_started_at = time.perf_counter()
    normalized = request.model_copy(update={"text": request.text.strip()})
    if not normalized.text:
      raise HTTPException(status_code=400, detail="Text is required.")
    _cache_dir.mkdir(parents=True, exist_ok=True)
    cache_path = _cache_dir / f"{cache_key(normalized)}.wav"
    hit = cached_response(cache_path, request_started_at)
    if hit is not None:
      return hit

    gen = generator()
    with _generator_lock:
      generate_started_at = time.perf_counter()
      audio = gen.generate(
        text=normalized.text,
        speaker=normalized.speaker,
        context=[],
        max_audio_length_ms=normalized.max_audio_length_ms,
        temperature=normalized.temperature,
        topk=normalized.topk,
      )
      log_stage("generated audio tensor", generate_started_at)
    buffer = io.BytesIO()
    save_started_at = time.perf_counter()
    torchaudio.save(
      buffer,
      audio.unsqueeze(0).detach().cpu(),
      gen.sample_rate,
      format="wav",
    )
    log_stage("encoded wav response", save_started_at)
    cache_path.write_bytes(buffer.getvalue())
    log_stage("completed speech request", request_started_at)
    return Response(
      content=buffer.getvalue(),
      media_type="audio/wav",
      headers={
        "X-MisoTTS-Model": "miso-tts-8b",
        "X-MisoTTS-Cache": "miss",
        "X-MisoTTS-Sample-Rate": str(gen.sample_rate),
      },
    )
  except Exception as exc:
    raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/v1/audio/prewarm")
def prewarm(request: PrewarmRequest) -> dict[str, Any]:
  results = []
  for text in request.texts:
    clean = text.strip()
    if not clean:
      continue
    speech_request = SpeechRequest(
      text=clean,
      speaker=request.speaker,
      max_audio_length_ms=request.max_audio_length_ms,
      temperature=request.temperature,
      topk=request.topk,
    )
    path = _cache_dir / f"{cache_key(speech_request)}.wav"
    started_at = time.perf_counter()
    if not path.exists():
      response = speech(speech_request)
      status = "generated"
      bytes_written = len(response.body or b"")
    else:
      status = "cached"
      bytes_written = path.stat().st_size
    results.append(
      {
        "text": clean,
        "status": status,
        "bytes": bytes_written,
        "seconds": round(time.perf_counter() - started_at, 4),
      },
    )
  return {"ok": True, "results": results}


def main() -> None:
  parser = argparse.ArgumentParser()
  parser.add_argument("--host", default="127.0.0.1")
  parser.add_argument("--port", type=int, default=8080)
  args = parser.parse_args()
  uvicorn.run(app, host=args.host, port=args.port)


if __name__ == "__main__":
  main()
