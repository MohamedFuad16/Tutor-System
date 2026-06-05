# QA03 Source And Citation Result

## Verdict

The architecture is generally well-caveated. It correctly treats Thinking Machines as an app-runtime analogy, keeps BKT/logistic KT as the beta core, and separates LoRA/fine-tuning from learner memory.

## Accepted Fixes

- Changed the appendix from "Validated" to "Source list assembled and locally reviewed" until final verification evidence is written.
- Softened date-sensitive OpenAI-doc wording and added a refresh-before-release caveat.
- Marked advanced KT and memory papers as research or arXiv preprints where appropriate.
- Added a retrieval caveat in Chapter 5: retrieval helps recall relevant context but does not prove truth.
- Changed AWS compute language to LearningAI's initial default rather than a universal AWS best practice.
- Removed wording that could imply background workers update mastery without validated evidence and KT contracts.

## Remaining Watch

URLs were not live-browsed in this QA pass. Treat current source freshness as locally reviewed until a dedicated live citation audit is run.
