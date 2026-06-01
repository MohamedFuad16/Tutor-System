import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

const {
  USER_BRAIN_AUDIO_OVERVIEW_SPEECH_MODEL,
  USER_BRAIN_AUDIO_OVERVIEW_VOICE,
  audioOverviewIdFor,
  audioOverviewPublicSrcFor,
  buildAudioOverviewDryRunReport,
  buildAudioOverviewSpeechInput,
  userBrainAudioOverviewPlan,
} = await import("../scripts/user-brain-audio-overview-plan.mjs");

test("audio overview plan covers every user-brain architecture chapter", () => {
  assert.equal(userBrainAudioOverviewPlan.length, 8);
  assert.equal(USER_BRAIN_AUDIO_OVERVIEW_SPEECH_MODEL, "gpt-4o-mini-tts");
  assert.equal(USER_BRAIN_AUDIO_OVERVIEW_VOICE, "alloy");

  const bookSource = readFileSync(
    `${repoRoot}/src/lib/userBrainArchitectureBook.ts`,
    "utf8",
  );
  const bookChapterTitles = [...bookSource.matchAll(/title: "([^"]+)"/g)].map(
    (match) => match[1],
  );

  assert.deepEqual(
    userBrainAudioOverviewPlan.map((entry) => entry.chapterTitle),
    bookChapterTitles,
  );

  const chapterIndexes = new Set();
  const outputFiles = new Set();
  const overviewIds = new Set();

  for (const entry of userBrainAudioOverviewPlan) {
    assert.equal(entry.chapterIndex, chapterIndexes.size);
    assert.match(entry.chapterTitle, /^Chapter \d+:/);
    assert.match(entry.outputFile, /^user-brain-.+\.mp3$/);
    assert.equal(entry.transcript.includes("```"), false);
    assert.ok(buildAudioOverviewSpeechInput(entry).length > 220);
    assert.match(
      audioOverviewPublicSrcFor(entry),
      /^\/audio-overviews\/.+\.mp3$/,
    );

    chapterIndexes.add(entry.chapterIndex);
    outputFiles.add(entry.outputFile);
    overviewIds.add(audioOverviewIdFor(entry));
  }

  assert.equal(chapterIndexes.size, 8);
  assert.equal(outputFiles.size, 8);
  assert.equal(overviewIds.size, 8);
});

test("audio overview dry run report distinguishes stored and missing assets", () => {
  const existingFiles = new Set(["user-brain-runtime-overview.mp3"]);
  const report = buildAudioOverviewDryRunReport({ existingFiles });

  assert.equal(report.total, 8);
  assert.equal(report.present, 1);
  assert.equal(report.missing, 7);

  const firstRow = report.rows[0];
  assert.equal(firstRow.fileStatus, "present");
  assert.equal(firstRow.assetStatus, "stored");

  const pendingRows = report.rows.slice(1);
  assert.ok(pendingRows.every((row) => row.fileStatus === "missing"));
  assert.ok(pendingRows.every((row) => row.assetStatus === "planned"));
});

test("stored opening audio asset is checked into the local public directory", () => {
  assert.equal(
    existsSync(
      `${repoRoot}/public/audio-overviews/user-brain-runtime-overview.mp3`,
    ),
    true,
  );
});

test("audio overview generator dry-run does not require an OpenAI key", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/generate-user-brain-audio-overviews.mjs", "--dry-run"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: { ...process.env, OPENAI_API_KEY: "" },
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /User Brain Architecture audio overview plan/);
  assert.match(result.stdout, /gpt-4o-mini-tts/);
  assert.match(result.stdout, /1 present, 7 missing, 8 planned/);
});
