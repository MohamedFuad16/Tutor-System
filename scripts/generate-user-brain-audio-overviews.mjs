#!/usr/bin/env node

import "dotenv/config";

import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import {
  USER_BRAIN_AUDIO_OVERVIEW_OUTPUT_DIR,
  USER_BRAIN_AUDIO_OVERVIEW_SPEECH_MODEL,
  USER_BRAIN_AUDIO_OVERVIEW_VOICE,
  buildAudioOverviewDryRunReport,
  buildAudioOverviewSpeechInput,
  userBrainAudioOverviewPlan,
} from "./user-brain-audio-overview-plan.mjs";

const args = process.argv.slice(2);

const hasArg = (name) => args.includes(name);

const valueForArg = (name) => {
  const index = args.indexOf(name);
  if (index === -1) return undefined;
  return args[index + 1];
};

const usage = `Usage:
  npm run audio:overview:dry-run
  npm run audio:overview:generate -- --chapter 2
  npm run audio:overview:generate -- --overwrite

Options:
  --dry-run       Validate the generation plan and list missing MP3 assets.
  --chapter N    Generate one human chapter number, from 1 through 8.
  --overwrite    Replace an existing MP3 asset.
  --help         Print this message.

Audio synthesis uses OpenAI speech model ${USER_BRAIN_AUDIO_OVERVIEW_SPEECH_MODEL}.
Set OPENAI_API_KEY before running without --dry-run.`;

if (hasArg("--help")) {
  console.log(usage);
  process.exit(0);
}

const dryRun = hasArg("--dry-run");
const overwrite = hasArg("--overwrite");
const chapterArg = valueForArg("--chapter");
const chapterNumber = chapterArg === undefined ? undefined : Number(chapterArg);

if (
  chapterArg !== undefined &&
  (!Number.isInteger(chapterNumber) ||
    chapterNumber < 1 ||
    chapterNumber > userBrainAudioOverviewPlan.length)
) {
  console.error(
    `Invalid --chapter value "${chapterArg}". Use a number from 1 through ${userBrainAudioOverviewPlan.length}.`,
  );
  process.exit(1);
}

const selectedEntries =
  chapterNumber === undefined
    ? userBrainAudioOverviewPlan
    : userBrainAudioOverviewPlan.filter(
        (entry) => entry.chapterIndex === chapterNumber - 1,
      );

const outputDir = path.resolve(
  process.cwd(),
  USER_BRAIN_AUDIO_OVERVIEW_OUTPUT_DIR,
);

const outputPathFor = (entry) => path.join(outputDir, entry.outputFile);

const fileExists = async (filePath) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const existingFiles = new Set();

for (const entry of userBrainAudioOverviewPlan) {
  if (await fileExists(outputPathFor(entry))) {
    existingFiles.add(entry.outputFile);
  }
}

const report = buildAudioOverviewDryRunReport({
  entries: selectedEntries,
  existingFiles,
});

const printReport = () => {
  console.log("User Brain Architecture audio overview plan");
  console.log(`Model: ${report.model}`);
  console.log(`Voice: ${report.voice}`);
  console.log(`Output: ${report.outputDir}`);
  console.log(
    `Assets: ${report.present} present, ${report.missing} missing, ${report.total} planned`,
  );
  for (const row of report.rows) {
    console.log(
      `- chapter ${row.chapterIndex + 1}: ${row.fileStatus} ${row.outputFile} (${row.transcriptLength} chars)`,
    );
  }
};

printReport();

if (dryRun) {
  process.exit(0);
}

if (!process.env.OPENAI_API_KEY) {
  console.error(
    "OPENAI_API_KEY is required to synthesize stored audio overviews. Re-run with --dry-run to validate the plan without network access.",
  );
  process.exit(1);
}

await mkdir(outputDir, { recursive: true });

const { default: OpenAI } = await import("openai");
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

for (const entry of selectedEntries) {
  const targetPath = outputPathFor(entry);
  const exists = await fileExists(targetPath);

  if (exists && !overwrite) {
    console.log(
      `Skipping ${entry.outputFile}; pass --overwrite to replace it.`,
    );
    continue;
  }

  const input = buildAudioOverviewSpeechInput(entry);
  console.log(`Synthesizing chapter ${entry.chapterIndex + 1}: ${entry.title}`);

  const speech = await client.audio.speech.create({
    model: USER_BRAIN_AUDIO_OVERVIEW_SPEECH_MODEL,
    voice: USER_BRAIN_AUDIO_OVERVIEW_VOICE,
    input,
  });

  const buffer = Buffer.from(await speech.arrayBuffer());
  await writeFile(targetPath, buffer);
  console.log(`Wrote ${path.relative(process.cwd(), targetPath)}`);
}
