import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));

const readSource = (path) => readFileSync(`${repoRoot}/${path}`, "utf8");

const tutorBook = JSON.parse(readSource("src/lib/tutorBook.json"));
const audioOverviewManifest = JSON.parse(
  readSource("src/lib/chapterAudioOverviews.json"),
);
const userBrainBookSource = readSource("src/lib/userBrainArchitectureBook.ts");
const adminViewSource = readSource("src/views/AdminView.tsx");
const revisionViewSource = readSource("src/views/RevisionView.tsx");
const architectureDoc = readSource("TUTOR_ARCHITECTURE.md");

const userBrainChapterTitles = [
  ...userBrainBookSource.matchAll(/title: "([^"]+)"/g),
].map((match) => match[1]);

test("built-in architecture books stay arranged as reader-first guides", () => {
  assert.deepEqual(
    tutorBook.map((chapter) => chapter.title),
    [
      "Chapter 0: How To Read This Book",
      "Chapter 1: Product Map",
      "Chapter 2: Tools In Plain English",
      "Chapter 3: Frontend Flow",
      "Chapter 4: Study And Document Ingestion",
      "Chapter 5: Chat And Tutor Tools",
      "Chapter 6: Memory, Dexie, And The Library",
      "Chapter 7: Revision And Active Recall",
      "Chapter 8: Analytics And Admin",
      "Chapter 9: A Background Workflow Example",
      "Chapter 10: Model And Provider Map",
      "Chapter 11: Graphify, Debugging, And Safety",
      "Chapter 12: Maintenance Boundaries",
    ],
  );

  assert.deepEqual(userBrainChapterTitles, [
    "Chapter 1: The Whole Shape",
    "Chapter 2: The Learner Brain Ledger",
    "Chapter 3: Teaching Loop And State",
    "Chapter 4: Retrieval, Artifacts, And Citations",
    "Chapter 5: Admin And Runtime Tuning",
    "Chapter 6: Voice, Audio, And Timing",
    "Chapter 7: Local Beta Roadmap",
    "Chapter 8: Sources And Glossary",
  ]);

  assert.match(revisionViewSource, /Wireframe Connections/);
  assert.match(revisionViewSource, /Theme System/);
  assert.match(revisionViewSource, /UI Component Snapshots/);
  assert.match(revisionViewSource, /Local Beta Control Patterns/);
});

test("Admin center introduction stays short and plain", () => {
  const adminPrefaceMatch = adminViewSource.match(
    /<p className="text-zinc-600[^"]*">\s*([^<]+?)\s*<\/p>/,
  );
  assert.ok(adminPrefaceMatch, "Admin preface paragraph should exist");

  const copy = adminPrefaceMatch[1].replace(/\s+/g, " ").trim();
  assert.equal(
    copy,
    "Track models, tools, memory, retrieval, voice, and beta readiness.",
  );
  assert.ok(copy.length <= 80, "Admin preface should stay concise");
  assert.equal(copy.split(".").filter(Boolean).length, 1);
});

test("MisoTTS read-aloud boundary is documented across architecture books", () => {
  const chapterTools = tutorBook[2].content;
  const chapterProviders = tutorBook[10].content;

  assert.match(chapterTools, /MisoTTS 8B/);
  assert.match(chapterTools, /\/api\/tts/);
  assert.match(chapterTools, /live voice remains Deepgram-based/);
  assert.match(chapterProviders, /Assistant Read Aloud/);
  assert.match(chapterProviders, /MISO_TTS_API_URL/);
  assert.match(
    chapterProviders,
    /does not replace the live Deepgram websocket/,
  );

  assert.match(userBrainBookSource, /Read Aloud is a separate audio path/);
  assert.match(userBrainBookSource, /miso-tts-8b/);
  assert.match(userBrainBookSource, /MisoTTS API URL/);
  assert.match(userBrainBookSource, /realtime voice still uses the Deepgram/);

  assert.match(architectureDoc, /MisoTTS read-aloud/);
  assert.match(
    architectureDoc,
    /local\s+Vast tunnel at `http:\/\/127\.0\.0\.1:8080`/,
  );
});

test("audio overview contract keeps one visible player and 3-4 minute guides", () => {
  assert.match(revisionViewSource, /const StoredAudioOverview/);
  assert.match(revisionViewSource, /const resolveAudioOverviewSrc/);
  assert.match(revisionViewSource, /className="sr-only"/);
  assert.match(revisionViewSource, /Preparing audio guide/);
  assert.match(revisionViewSource, /Open the local MP3 guide/);
  assert.doesNotMatch(revisionViewSource, /native fallback controls/i);
  assert.doesNotMatch(revisionViewSource, /fallback play/i);
  assert.doesNotMatch(revisionViewSource, /controls=\{showNativeControls\}/);

  for (const overview of audioOverviewManifest) {
    const words = overview.transcript.trim().split(/\s+/).filter(Boolean);
    assert.ok(
      overview.durationSeconds >= 180 && overview.durationSeconds <= 245,
      `${overview.outputFile} must stay in the 3-4 minute guide window`,
    );
    assert.ok(
      words.length >= 450,
      `${overview.outputFile} should remain a plain-language long-form guide`,
    );
    assert.match(overview.durationLabel, /about (3|4) min/);
    assert.equal(
      overview.audioSrc,
      `/audio-overviews/${overview.outputFile}`,
      `${overview.outputFile} must resolve to the checked-in public MP3 path`,
    );
  }
});
