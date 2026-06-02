#!/usr/bin/env node

import "dotenv/config";

import { execFile } from "node:child_process";
import {
  access,
  copyFile,
  mkdir,
  mkdtemp,
  rm,
  writeFile,
} from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { promisify } from "node:util";

import {
  AUDIO_OVERVIEW_DEEPGRAM_MODEL,
  AUDIO_OVERVIEW_DEEPGRAM_SPEED,
  AUDIO_OVERVIEW_MACOS_RATE,
  AUDIO_OVERVIEW_MACOS_TEMPO,
  AUDIO_OVERVIEW_MACOS_VOICE,
  AUDIO_OVERVIEW_OPENAI_SPEECH_MODEL,
  AUDIO_OVERVIEW_OPENAI_VOICE,
  AUDIO_OVERVIEW_OUTPUT_DIR,
  buildAudioOverviewDryRunReport,
  buildAudioOverviewSpeechInput,
  builtInBookAudioOverviewPlan,
} from "./user-brain-audio-overview-plan.mjs";

const execFileAsync = promisify(execFile);
const args = process.argv.slice(2);

const hasArg = (name) => args.includes(name);

const valueForArg = (name) => {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
};

const usage = `Usage:
  npm run audio:overview:dry-run
  npm run audio:overview:generate -- --provider deepgram --overwrite
  npm run audio:overview:generate -- --book user-brain-architecture
  npm run audio:overview:generate -- --chapter 14

Options:
  --dry-run       Validate the generation plan and list missing MP3 assets.
  --chapter N    Generate one human row number, from 1 through ${builtInBookAudioOverviewPlan.length}.
  --book ID      Generate one built-in book id, such as tutor-book, user-brain-architecture, or app-design-language.
  --provider P   "deepgram" (default), "openai", or "macos-say".
  --model M      Deepgram or OpenAI speech model override.
  --speed N      Deepgram speed. Defaults to ${AUDIO_OVERVIEW_DEEPGRAM_SPEED}.
  --voice V      OpenAI voice or macOS say voice. Defaults depend on provider.
  --rate N       macOS say speech rate. Defaults to ${AUDIO_OVERVIEW_MACOS_RATE}.
  --tempo N      macOS MP3 tempo multiplier. Defaults to ${AUDIO_OVERVIEW_MACOS_TEMPO}.
  --overwrite    Replace an existing MP3 asset.
  --help         Print this message.

Deepgram synthesis uses ${AUDIO_OVERVIEW_DEEPGRAM_MODEL} by default.
Set DEEPGRAM_API_KEY before running with --provider deepgram and without --dry-run.`;

if (hasArg("--help")) {
  console.log(usage);
  process.exit(0);
}

const dryRun = hasArg("--dry-run");
const overwrite = hasArg("--overwrite");
const chapterArg = valueForArg("--chapter");
const bookArg = valueForArg("--book");
const chapterNumber = chapterArg === undefined ? undefined : Number(chapterArg);
const provider = valueForArg("--provider") || "deepgram";
const modelArg = valueForArg("--model");
const speedArg = valueForArg("--speed");
const voiceArg = valueForArg("--voice");
const rateArg = valueForArg("--rate");
const tempoArg = valueForArg("--tempo");
const deepgramSpeed =
  speedArg === undefined ? AUDIO_OVERVIEW_DEEPGRAM_SPEED : Number(speedArg);
const macosRate =
  rateArg === undefined ? AUDIO_OVERVIEW_MACOS_RATE : Number(rateArg);
const macosTempo =
  tempoArg === undefined ? AUDIO_OVERVIEW_MACOS_TEMPO : Number(tempoArg);

if (!["deepgram", "openai", "macos-say"].includes(provider)) {
  console.error(
    `Invalid --provider value "${provider}". Use deepgram, openai, or macos-say.`,
  );
  process.exit(1);
}

if (
  speedArg !== undefined &&
  (!Number.isFinite(deepgramSpeed) || deepgramSpeed < 0.5 || deepgramSpeed > 2)
) {
  console.error(
    `Invalid --speed value "${speedArg}". Use a number from 0.5 to 2.`,
  );
  process.exit(1);
}

if (
  rateArg !== undefined &&
  (!Number.isFinite(macosRate) || macosRate < 90 || macosRate > 260)
) {
  console.error(
    `Invalid --rate value "${rateArg}". Use a number from 90 to 260.`,
  );
  process.exit(1);
}

if (
  tempoArg !== undefined &&
  (!Number.isFinite(macosTempo) || macosTempo < 0.5 || macosTempo > 1.5)
) {
  console.error(
    `Invalid --tempo value "${tempoArg}". Use a number from 0.5 to 1.5.`,
  );
  process.exit(1);
}

if (
  chapterArg !== undefined &&
  (!Number.isInteger(chapterNumber) ||
    chapterNumber < 1 ||
    chapterNumber > builtInBookAudioOverviewPlan.length)
) {
  console.error(
    `Invalid --chapter value "${chapterArg}". Use a number from 1 through ${builtInBookAudioOverviewPlan.length}.`,
  );
  process.exit(1);
}

const selectedEntries = builtInBookAudioOverviewPlan.filter((entry, index) => {
  if (chapterNumber !== undefined && index !== chapterNumber - 1) return false;
  if (bookArg && entry.bookId !== bookArg) return false;
  return true;
});

if (selectedEntries.length === 0) {
  console.error(`No audio overview entries matched the requested filters.`);
  process.exit(1);
}

const outputDir = path.resolve(process.cwd(), AUDIO_OVERVIEW_OUTPUT_DIR);

const outputPathFor = (entry) => path.join(outputDir, entry.outputFile);
const DEEPGRAM_INPUT_LIMIT = 1900;

const fileExists = async (filePath) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const splitLongSpeechInput = (text, limit = DEEPGRAM_INPUT_LIMIT) => {
  const input = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!input) return [];
  if (input.length <= limit) return [input];

  const sentences = input.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [input];
  const chunks = [];
  let current = "";

  const pushCurrent = () => {
    if (current.trim()) chunks.push(current.trim());
    current = "";
  };

  const pushLongSentence = (sentence) => {
    const words = sentence.trim().split(/\s+/).filter(Boolean);
    let part = "";
    for (const word of words) {
      const next = part ? `${part} ${word}` : word;
      if (next.length > limit) {
        if (part) chunks.push(part.trim());
        part = word;
      } else {
        part = next;
      }
    }
    if (part.trim()) chunks.push(part.trim());
  };

  for (const rawSentence of sentences) {
    const sentence = rawSentence.trim();
    if (!sentence) continue;
    if (sentence.length > limit) {
      pushCurrent();
      pushLongSentence(sentence);
      continue;
    }
    const next = current ? `${current} ${sentence}` : sentence;
    if (next.length > limit) {
      pushCurrent();
      current = sentence;
    } else {
      current = next;
    }
  }
  pushCurrent();

  return chunks;
};

const ffmpegConcatFileLine = (filePath) =>
  `file '${filePath.replace(/'/g, "'\\''")}'`;

const concatMp3Files = async (partPaths, targetPath, tempDir) => {
  if (partPaths.length === 1) {
    await copyFile(partPaths[0], targetPath);
    return;
  }

  const listPath = path.join(tempDir, "concat.txt");
  await writeFile(
    listPath,
    `${partPaths.map(ffmpegConcatFileLine).join("\n")}\n`,
  );
  await execFileAsync("ffmpeg", [
    "-y",
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "concat",
    "-safe",
    "0",
    "-i",
    listPath,
    "-codec",
    "copy",
    targetPath,
  ]);
};

const synthesizeDeepgramInput = async (input, entry, targetPath) => {
  const url = new URL("https://api.deepgram.com/v1/speak");
  url.searchParams.set("model", modelArg || AUDIO_OVERVIEW_DEEPGRAM_MODEL);
  url.searchParams.set("speed", String(deepgramSpeed));

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Token ${process.env.DEEPGRAM_API_KEY}`,
      "Content-Type": "text/plain",
    },
    body: input,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "");
    throw new Error(
      `Deepgram synthesis failed for ${entry.outputFile}: HTTP ${response.status} ${errorText.slice(0, 180)}`,
    );
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(targetPath, buffer);
};

const existingFiles = new Set();

for (const entry of builtInBookAudioOverviewPlan) {
  if (await fileExists(outputPathFor(entry))) {
    existingFiles.add(entry.outputFile);
  }
}

const report = buildAudioOverviewDryRunReport({
  entries: selectedEntries,
  existingFiles,
  provider,
});

const printReport = () => {
  console.log("Built-in book audio guide plan");
  console.log(`Provider: ${report.provider}`);
  if (provider === "deepgram") {
    console.log(`Model: ${modelArg || report.deepgramModel}`);
    console.log(`Speed: ${deepgramSpeed}`);
  } else if (provider === "openai") {
    console.log(`Model: ${modelArg || report.openaiModel}`);
    console.log(`Voice: ${voiceArg || report.openaiVoice}`);
  } else {
    console.log(`Voice: ${voiceArg || report.macosVoice}`);
    console.log(`Rate: ${macosRate}`);
    console.log(`Tempo: ${macosTempo}`);
  }
  console.log(`Output: ${report.outputDir}`);
  console.log(
    `Assets: ${report.present} present, ${report.missing} missing, ${report.total} planned`,
  );
  for (const row of report.rows) {
    console.log(
      `- ${row.bookId} chapter ${row.chapterIndex + 1}: ${row.fileStatus} ${row.outputFile} (${row.transcriptLength} chars)`,
    );
  }
};

printReport();

if (dryRun) {
  process.exit(0);
}

if (provider === "deepgram" && !process.env.DEEPGRAM_API_KEY) {
  console.error(
    "DEEPGRAM_API_KEY is required to synthesize chapter audio guides. Re-run with --dry-run to validate the plan without network access.",
  );
  process.exit(1);
}

if (provider === "openai" && !process.env.OPENAI_API_KEY) {
  console.error(
    "OPENAI_API_KEY is required to synthesize chapter audio guides. Re-run with --dry-run to validate the plan without network access.",
  );
  process.exit(1);
}

await mkdir(outputDir, { recursive: true });

const synthesizeWithDeepgram = async (entry, targetPath) => {
  const input = buildAudioOverviewSpeechInput(entry);
  const chunks = splitLongSpeechInput(input);
  if (chunks.length <= 1) {
    await synthesizeDeepgramInput(input, entry, targetPath);
    return;
  }

  const tempDir = await mkdtemp(
    path.join(os.tmpdir(), "learningai-deepgram-overview-"),
  );
  try {
    const partPaths = [];
    for (const [index, chunk] of chunks.entries()) {
      const partPath = path.join(tempDir, `part-${index}.mp3`);
      console.log(
        `  Deepgram chunk ${index + 1}/${chunks.length} (${chunk.length} chars)`,
      );
      await synthesizeDeepgramInput(chunk, entry, partPath);
      partPaths.push(partPath);
    }
    await concatMp3Files(partPaths, targetPath, tempDir);
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
};

const synthesizeWithOpenAI = async (entry, targetPath) => {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const input = buildAudioOverviewSpeechInput(entry);

  const speech = await client.audio.speech.create({
    model: modelArg || AUDIO_OVERVIEW_OPENAI_SPEECH_MODEL,
    voice: voiceArg || AUDIO_OVERVIEW_OPENAI_VOICE,
    input,
  });

  const buffer = Buffer.from(await speech.arrayBuffer());
  await writeFile(targetPath, buffer);
};

const synthesizeWithMacSay = async (entry, targetPath) => {
  const tempDir = await mkdtemp(
    path.join(os.tmpdir(), "learningai-audio-overview-"),
  );
  const aiffPath = path.join(tempDir, `${entry.outputFile}.aiff`);
  const input = buildAudioOverviewSpeechInput(entry);

  try {
    await execFileAsync("say", [
      "-v",
      voiceArg || AUDIO_OVERVIEW_MACOS_VOICE,
      "-r",
      String(macosRate),
      "-o",
      aiffPath,
      input,
    ]);
    await execFileAsync("ffmpeg", [
      "-y",
      "-hide_banner",
      "-loglevel",
      "error",
      "-i",
      aiffPath,
      "-filter:a",
      `atempo=${macosTempo}`,
      "-codec:a",
      "libmp3lame",
      "-b:a",
      "96k",
      targetPath,
    ]);
  } finally {
    await rm(tempDir, { force: true, recursive: true });
  }
};

for (const entry of selectedEntries) {
  const targetPath = outputPathFor(entry);
  const exists = await fileExists(targetPath);

  if (exists && !overwrite) {
    console.log(
      `Skipping ${entry.outputFile}; pass --overwrite to replace it.`,
    );
    continue;
  }

  console.log(
    `Synthesizing ${entry.bookId} chapter ${entry.chapterIndex + 1}: ${entry.title} (${provider})`,
  );

  if (provider === "deepgram") {
    await synthesizeWithDeepgram(entry, targetPath);
  } else if (provider === "openai") {
    await synthesizeWithOpenAI(entry, targetPath);
  } else {
    await synthesizeWithMacSay(entry, targetPath);
  }
  console.log(`Wrote ${path.relative(process.cwd(), targetPath)}`);
}
