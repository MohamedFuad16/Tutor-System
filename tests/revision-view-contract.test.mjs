import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const revisionViewSource = readFileSync(
  `${repoRoot}/src/views/RevisionView.tsx`,
  "utf8",
);

test("RevisionView keeps the active-recall review scale stable", () => {
  for (const quality of [0, 2, 4, 5]) {
    assert.match(revisionViewSource, new RegExp(`onReview\\(${quality}\\)`));
  }

  assert.doesNotMatch(revisionViewSource, /onReview\(1\)/);
  assert.doesNotMatch(revisionViewSource, /onReview\(3\)/);
  assert.match(revisionViewSource, /Active Recall/);
});

test("RevisionView schedules reviews before recording BKT evidence", () => {
  assert.match(
    revisionViewSource,
    /const nextDays = quality >= 4 \? 3 \* \(quality - 2\) : 1;/,
  );
  assert.match(
    revisionViewSource,
    /await db\.flashcards\.update\(card\.id,\s*{\s*nextReviewAt: Date\.now\(\) \+ nextDays \* 24 \* 60 \* 60 \* 1000,\s*}\);/s,
  );
  assert.match(
    revisionViewSource,
    /await recordFlashcardReviewEvidence\(card, quality,\s*{\s*runtimeSettings: brainRuntimeSettings,\s*}\);/s,
  );
});
