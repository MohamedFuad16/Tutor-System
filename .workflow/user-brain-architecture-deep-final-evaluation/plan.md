# User Brain Architecture Deep Final Evaluation

## Goal
Remove the stale generated image from the in-app **User Brain Architecture**
book/runtime output and run one deeper source-backed architecture evaluation.
The evaluation must look beyond OpenAI docs into research papers, official
cloud/database/browser docs, security guidance, PEFT/LoRA material, and
event/queue/observability references.

## Success Criteria
- The old generated tutor-runtime image no longer appears in the running app.
- `src/lib/userBrainArchitectureBook.ts` is tightened where source-backed gaps
  or overclaims are found.
- The final report separates accepted gaps, rejected overclaims, concrete edits,
  source URLs, and remaining risks.
- Verification covers workflow completeness, lint, build, and a browser smoke
  of the reader.

## Current Context
- The book is registered in `src/views/RevisionView.tsx`.
- The book content lives in `src/lib/userBrainArchitectureBook.ts`.
- The current architecture already frames the design as app-native continuous
  orchestration, not native interaction-model training.
- The stale generated visual existed in built output under `dist/user-brain/`.

## Constraints
- Follow `AGENTS.md`: use Graphify before file inspection and keep reads narrow.
- Do not rebuild Graphify locally.
- The P1 evaluator packet is read-only.
- Prefer trusted sources: official documentation, primary research, standards,
  and mature vendor docs.

## Risks
- Architecture overclaims around newest KT papers, RAG-KT, LLM-KT, LoRA, and
  agent autonomy.
- Documentation drift in OpenAI/AWS docs.
- Stale built assets causing the browser to show removed content.
- Complex cloud diagrams hiding unclear ownership boundaries.

## Approval Required
None for the current local edits. The user explicitly requested image removal.

## Work Packets
- `P1-deep-final-evaluator`: background read-only architecture evaluation using
  Graphify first, broad trusted sources, and concrete book-edit suggestions.
- Local integration: independently verify sources, remove stale visual output,
  and apply only high-confidence book edits.

## Integration Policy
Accept changes when they are supported by a primary source or directly reduce
overclaim risk. Reject speculative claims that cannot be verified or that would
add complexity without a beta product need.

## Verification
- `python3 /Users/mfuad16/.codex/skills/codex-dynamic-workflows/scripts/verify_workflow.py .workflow/user-brain-architecture-deep-final-evaluation`
- `npm run lint`
- `npm run build`
- Browser smoke at `http://127.0.0.1:3100/`

## Reusable Artifacts
- `.workflow/user-brain-architecture-deep-final-evaluation/final-report.md`
- `.workflow/user-brain-architecture-deep-final-evaluation/results/P1-deep-final-evaluator.md`
