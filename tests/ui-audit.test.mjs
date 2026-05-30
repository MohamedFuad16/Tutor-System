import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");

test("StudyView upload affordances accept PDFs only", () => {
  const source = read("src/views/StudyView.tsx");

  assert.match(source, /accept="application\/pdf,\.pdf"/);
  assert.doesNotMatch(source, /accept="application\/pdf,image\/\*"/);
  assert.doesNotMatch(source, /file\.type\.startsWith\("image\/"\)/);
});

test("PatternCard exposes keyboard semantics only when actionable", () => {
  const source = read("src/components/PatternCard.tsx");

  assert.match(source, /role=\{hasAction \? "button" : undefined\}/);
  assert.match(source, /tabIndex=\{hasAction \? 0 : undefined\}/);
  assert.match(source, /e\.key !== "Enter" && e\.key !== " "/);
});

test("ChatPanel renders untrusted Mermaid diagrams with strict security", () => {
  const source = read("src/components/ChatPanel.tsx");

  assert.match(source, /securityLevel: "strict"/);
  assert.doesNotMatch(source, /securityLevel: "loose"/);
});
