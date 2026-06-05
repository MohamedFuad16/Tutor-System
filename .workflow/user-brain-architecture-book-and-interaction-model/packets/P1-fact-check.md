Packet ID: P1-fact-check

Objective:
Verify factual claims in `.workflow/openai-support-guidance-architecture-update/final-report.md` against user-provided support emails, previous workflow artifacts, and local app source where relevant.

Context:
The user wants this final report completely verified before consolidation into an in-app book named "User Brain Architecture".

Files / sources:
- `.workflow/openai-support-guidance-architecture-update/final-report.md`
- `.workflow/openai-support-guidance-architecture-update/orchestration.md`
- `.workflow/adaptive-learning-brain-architecture/final-report.md`
- User-provided OpenAI Support email text in the conversation
- Connected app files only if needed after Graphify context

Ownership:
Read-only fact checking. Do not edit source files.

Do:
- Identify claims that are well-supported, ambiguous, stale, or contradicted.
- Pay special attention to fine-tuning vs retrieval, learner-state summaries, weakness detection, model choice, voice architecture, and cross-customer context isolation.
- Note any claims that need wording changes in the consolidated book.

Do not:
- Do not spawn additional subagents.
- Do not rewrite the report.
- Do not perform repo-wide scans.

Expected output:
A concise findings report with severity, claim, evidence, and recommended wording.

Verification:
Ground each finding in a local path, user email quote/paraphrase, or source URL.
