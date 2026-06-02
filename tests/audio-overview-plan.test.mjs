import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

const {
  AUDIO_OVERVIEW_DEEPGRAM_MODEL,
  AUDIO_OVERVIEW_DEEPGRAM_SPEED,
  audioOverviewIdFor,
  audioOverviewPublicSrcFor,
  buildAudioOverviewDryRunReport,
  buildAudioOverviewSpeechInput,
  builtInBookAudioOverviewPlan,
  userBrainAudioOverviewPlan,
} = await import("../scripts/user-brain-audio-overview-plan.mjs");

const userBrainBookSource = readFileSync(
  `${repoRoot}/src/lib/userBrainArchitectureBook.ts`,
  "utf8",
);
const userBrainChapterTitles = [
  ...userBrainBookSource.matchAll(/title: "([^"]+)"/g),
].map((match) => match[1]);

const tutorBook = JSON.parse(
  readFileSync(`${repoRoot}/src/lib/tutorBook.json`, "utf8"),
);

const expectedBooks = [
  {
    bookId: "tutor-book",
    bookTitle: "Tutor System Architecture",
    titles: tutorBook.map((chapter) => chapter.title),
  },
  {
    bookId: "user-brain-architecture",
    bookTitle: "User Brain Architecture",
    titles: userBrainChapterTitles,
  },
  {
    bookId: "app-design-language",
    bookTitle: "App Design Language",
    titles: [
      "Wireframe Connections",
      "Theme System",
      "UI Component Snapshots",
      "Local Beta Control Patterns",
    ],
  },
];

test("audio overview plan covers every built-in book chapter", () => {
  assert.equal(AUDIO_OVERVIEW_DEEPGRAM_MODEL, "aura-2-odysseus-en");
  assert.equal(AUDIO_OVERVIEW_DEEPGRAM_SPEED, 1);
  assert.equal(userBrainAudioOverviewPlan.length, 8);

  const expectedTotal = expectedBooks.reduce(
    (sum, book) => sum + book.titles.length,
    0,
  );
  assert.equal(builtInBookAudioOverviewPlan.length, expectedTotal);

  const outputFiles = new Set();
  const overviewIds = new Set();

  for (const book of expectedBooks) {
    const rows = builtInBookAudioOverviewPlan.filter(
      (entry) => entry.bookId === book.bookId,
    );
    assert.equal(rows.length, book.titles.length);
    assert.deepEqual(
      rows.map((entry) => entry.chapterTitle),
      book.titles,
    );

    rows.forEach((entry, index) => {
      assert.equal(entry.bookTitle, book.bookTitle);
      assert.equal(entry.chapterIndex, index);
      assert.match(entry.outputFile, /^[a-z0-9-]+\.mp3$/);
      assert.equal(entry.assetStatus, "stored");
      assert.equal(entry.transcript.includes("```"), false);
      assert.ok(buildAudioOverviewSpeechInput(entry).length > 620);
      assert.ok((entry.transcript.match(/[.!?]/g) || []).length >= 7);
      assert.match(
        audioOverviewPublicSrcFor(entry),
        /^\/audio-overviews\/.+\.mp3$/,
      );
      outputFiles.add(entry.outputFile);
      overviewIds.add(audioOverviewIdFor(entry));
    });
  }

  assert.equal(outputFiles.size, expectedTotal);
  assert.equal(overviewIds.size, expectedTotal);
});

test("audio overview dry run report distinguishes stored and missing assets", () => {
  const existingFiles = new Set(["user-brain-runtime-overview.mp3"]);
  const report = buildAudioOverviewDryRunReport({ existingFiles });

  assert.equal(report.total, builtInBookAudioOverviewPlan.length);
  assert.equal(report.present, 1);
  assert.equal(report.missing, builtInBookAudioOverviewPlan.length - 1);

  const presentRows = report.rows.filter((row) => row.fileStatus === "present");
  assert.equal(presentRows.length, 1);
  assert.equal(presentRows[0].assetStatus, "stored");

  const missingRows = report.rows.filter((row) => row.fileStatus === "missing");
  assert.ok(missingRows.every((row) => row.assetStatus === "stored"));
});

test("stored audio assets are checked into the local public directory", () => {
  const audioDir = `${repoRoot}/public/audio-overviews`;
  const checkedInFiles = new Set(readdirSync(audioDir));

  for (const entry of builtInBookAudioOverviewPlan) {
    assert.equal(
      existsSync(`${audioDir}/${entry.outputFile}`),
      true,
      `${entry.outputFile} should exist`,
    );
    assert.equal(checkedInFiles.has(entry.outputFile), true);
  }
});

test("audio overview generator dry-run does not require a Deepgram key", () => {
  const result = spawnSync(
    process.execPath,
    ["scripts/generate-user-brain-audio-overviews.mjs", "--dry-run"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: { ...process.env, DEEPGRAM_API_KEY: "" },
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Built-in book audio guide plan/);
  assert.match(result.stdout, /Provider: deepgram/);
  assert.match(result.stdout, /aura-2-odysseus-en/);
  assert.match(
    result.stdout,
    new RegExp(
      `${builtInBookAudioOverviewPlan.length} present, 0 missing, ${builtInBookAudioOverviewPlan.length} planned`,
    ),
  );
});

test("audio overview generator dry-run can filter by book", () => {
  const result = spawnSync(
    process.execPath,
    [
      "scripts/generate-user-brain-audio-overviews.mjs",
      "--dry-run",
      "--book",
      "app-design-language",
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: { ...process.env, DEEPGRAM_API_KEY: "" },
    },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Provider: deepgram/);
  assert.match(result.stdout, /app-design-language chapter 1/);
  assert.match(result.stdout, /4 planned/);
});
