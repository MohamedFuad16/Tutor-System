# Orchestration: User Brain Architecture Deep Final Evaluation

## Execution Rules

- Keep the original objective intact.
- Ask for approval before risky, expensive, external, or destructive actions.
- Keep immediate blocking work local.
- Delegate only bounded, disjoint, materially useful packets.
- Integrate packet results before final verification.

## Branching Rules
- If P1 confirms a claim is source-backed, keep it but make the wording precise.
- If P1 finds a weak claim, downgrade it to research-track/watchlist wording.
- If a source cannot be verified, remove or qualify the claim.
- If the browser still shows the old image after source removal, clear stale
  built output and rebuild before concluding.

## Packet Prompts
### P1-deep-final-evaluator

Read-only. Use Graphify before file inspection. Take time to scan broad trusted
sources over the internet, not only OpenAI docs. Evaluate
`src/lib/userBrainArchitectureBook.ts` and the learner brain architecture
claims.

Sources should include: Thinking Machines interaction models, official OpenAI
docs, AWS docs, PostgreSQL/pgvector docs, Dexie/IndexedDB/MDN guidance,
OWASP/NIST/privacy/security guidance, KT papers (BKT, DKT, AKT, LPKT, LKT,
LLM-KT, RAG-KT), LoRA/QLoRA/PEFT papers or Hugging Face docs, and
event/queue/observability docs.

Return accepted architecture gaps, rejected/overclaimed ideas, a source table
with URLs, concrete book edits, and remaining risks. Do not edit files; do not
rebuild Graphify.

## Completion Audit
- Workflow artifacts are complete.
- Stale generated image is absent from built output and the browser reader.
- Accepted architecture/source edits are applied.
- Lint/build/browser checks pass.
