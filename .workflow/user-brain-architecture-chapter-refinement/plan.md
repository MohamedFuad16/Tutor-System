# User Brain Architecture Chapter Refinement

## Goal
Refine every chapter/page of the in-app `User Brain Architecture` book so the
book reads like a clear, human-understandable architecture guide rather than a
raw technical memo.

## Success Criteria
- One subagent is assigned to each chapter, 18 total.
- Agents work read-only and return polished chapter-level recommendations or
  replacement markdown.
- Final integration keeps the book consistent, source-backed, and easy to read.
- The old technical substance is preserved unless it is unclear, repetitive, or
  overclaimed.
- `npm run lint`, `npm run build`, and a reader smoke test pass after integration.

## Current Context
- Repo: `/Users/mfuad16/Documents/LearningAI`.
- Book source: `src/lib/userBrainArchitectureBook.ts`.
- Current book has chapters 0 through 17.
- Graphify query points the reader flow through `RevisionView`; the newer book
  module is not directly represented, so reads stay narrow around the book file.

## Constraints
- Do not let chapter agents edit the shared book file directly.
- Keep citations as clickable markdown links.
- Keep the book readable for non-engineers while preserving implementation truth.
- Avoid deleting important caveats: app-native interaction model, evidence-gated
  mastery, Postgres authority, projections, privacy, and safety.
- ASCII-only edits unless existing source requires otherwise.

## Risks
- Eighteen agents editing one source file would conflict, so integration remains
  centralized.
- Over-simplification could remove important launch gates.
- Some chapters depend on shared terms; final integration must normalize naming.

## Approval Required
User explicitly requested chapter subagents. No extra approval required for
read-only agents and local source edits. Ask before destructive or external
actions.

## Work Packets
- C00: Chapter 0, What We Are Building.
- C01: Chapter 1, What This Is And Is Not.
- C02: Chapter 2, The Simple Mental Model.
- C03: Chapter 3, Why We Are Not Continuously Fine-Tuning.
- C04: Chapter 4, The Learner Brain Ledger.
- C05: Chapter 5, Knowledge Tracing Strategy.
- C06: Chapter 6, Interaction Model Strategy.
- C07: Chapter 7, Continuous Tutor Loop.
- C08: Chapter 8, Teaching And Evaluation States.
- C09: Chapter 9, Tool-Using Background Worker Layer.
- C10: Chapter 10, Runtime Contracts.
- C11: Chapter 11, Voice And Human Timing.
- C12: Chapter 12, From Dexie To AWS.
- C13: Chapter 13, Cloud Data Model.
- C14: Chapter 14, Isolation, Privacy, And Safety.
- C15: Chapter 15, Beta Gates And Roadmap.
- C16: Chapter 16, Final Deep Evaluation.
- C17: Chapter 17, Glossary And Sources.

## Integration Policy
Accept rewrites that improve clarity, chapter flow, definitions, transitions,
and human readability without weakening architecture constraints. Reject rewrites
that remove source links, turn research-track items into production truth, or
make background workers sound unlimited.

## Verification
- Workflow verifier.
- `npm run lint`.
- `npm run build`.
- Browser smoke at `http://localhost:3100/`, open Revision and User Brain
  Architecture, confirm the book renders.

## Reusable Artifacts
- Chapter-by-chapter refinement results under `results/`.
- Final integration report for future book editing passes.
