Packet ID: P2-source-verification

Objective:
Verify URL and citation quality for the prior report and the new book source list.

Context:
The final in-app book must include proper citations and avoid broken or misleading references.

Files / sources:
- `.workflow/openai-support-guidance-architecture-update/final-report.md`
- `.workflow/adaptive-learning-brain-architecture/final-report.md`
- `https://thinkingmachines.ai/blog/interaction-models/`
- Official OpenAI docs where relevant for fine-tuning, evals, retrieval/file search, realtime, and voice prompting.

Ownership:
Read-only source verification. Do not edit source files.

Do:
- Check whether cited URLs resolve.
- Prefer official OpenAI sources for OpenAI API/model claims.
- Flag stale, unavailable, marketing-only, or weak sources.
- Provide a clean citation appendix list for the final book.

Do not:
- Do not spawn additional subagents.
- Do not cite unsupported claims.
- Do not rely on Reddit or secondary sources for OpenAI product behavior unless explicitly marked as non-authoritative.

Expected output:
A citation-health report and recommended citation appendix.

Verification:
Each recommended source should include title, URL, and why it is valid.
