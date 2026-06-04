# Packet ACX: Book Readiness Contract

## Objective

Align the human-readable system architecture, user-brain architecture, and Tutor
book copy with the current MisoTTS/read-aloud implementation while guarding the
existing Admin intro and chapter-audio requirements.

## Scope

- `TUTOR_ARCHITECTURE.md`
- `src/lib/tutorBook.json`
- `src/lib/userBrainArchitectureBook.ts`
- `tests/book-readiness-contract.test.mjs`
- `.workflow/brain-architecture-implementation-program/packets/phase77-book-readiness-browser-qa.mjs`
- `.workflow/brain-architecture-implementation-program/results/phase77-*`
- `graphify-out/*`

## Out Of Scope

- Claiming MisoTTS 8B live audio proof before the remote model is loaded.
- Changing stored chapter audio assets.
- AWS/cloud synchronization.
- Marking the full brain architecture program complete.

## Acceptance

- Built-in architecture book chapter order stays reader-first.
- Admin Center intro remains short and plain.
- Tutor System Architecture, User Brain Architecture, and the built-in Tutor
  book explain that MisoTTS is Read Aloud, not realtime Deepgram voice.
- Chapter audio overview UI still has one visible player with hidden retry
  fallback only.
- Existing 3-4 minute audio guide manifest duration/content guard remains
  covered.
- Focused tests, full tests, format, lint, build, browser QA, and clean
  Graphify refresh pass before commit.
