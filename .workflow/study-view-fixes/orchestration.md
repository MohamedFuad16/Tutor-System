# Orchestration: study view fixes

## Execution Rules

- Keep the original objective intact.
- Ask for approval before risky, expensive, external, or destructive actions.
- Keep immediate blocking work local.
- Delegate only bounded, disjoint, materially useful packets.
- Integrate packet results before final verification.

## Branching Rules

## Packet Prompts

## Completion Audit
# study view fixes orchestration

## Sequence
1. Use Graphify query/path to constrain source inspection.
2. Scaffold workflow artifacts and lane packets.
3. Spawn bounded subagents for packet-level audits; nested subagents may be used
   inside a lane only when the lane owner can keep the work disjoint.
4. Main agent inspects connected source files and integrates the smallest
   coherent implementation.
5. Run focused verification, then lint/build, then live browser QA.
6. Update README and `final-report.md`.
7. Commit and push if verification succeeds and branch/remote state is normal.

## Branching Rules
- If Dexie migration risk is higher than expected, add a focused migration test
  before browser QA.
- If existing dirty changes conflict with the implementation, adapt to them and
  document the conflict; do not revert.
- If Graphify output appears stale, verify against the live source before
  editing. Do not regenerate graph artifacts unless explicitly required.
- If browser QA finds runtime regressions, fix and rerun the narrow affected
  checks before the final broad gates.
- If push requires a branch choice, force push, credentials, or remote changes,
  stop and report.

## Packet Prompts
- A: Data model and persistence audit.
- B: Chat/runtime audit.
- C: Study/PDF workflow audit.
- D: Revision/library synchronization audit.
- E: QA/docs/git checklist and README draft.

## Integration Checklist
- Stable default General Study book ID exists.
- Active book ID is the single source of truth across Study, Revision, and Chat.
- Conversation lookup creates or reuses exactly one conversation per book.
- Messages are loaded and saved by the active book conversation.
- PDF records are linked to book IDs, with selected PDF persisted per book.
- Chat and memory orchestrator receive book context plus active book documents.
- UI transitions do not leak old messages or stale PDF titles.
- README and final report reflect the shipped behavior and evidence.
