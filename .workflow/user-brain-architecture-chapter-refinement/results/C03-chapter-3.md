# C03 Chapter 3 Result

## Clarity Score
Before: 7.5/10
After: 9/10

## Integration Notes
Clarify that fine-tuning changes model behavior, while learner memory changes
runtime context and audited state. Keep LoRA/QLoRA/PEFT on the adaptation side
of the line, not the learner-memory side.

## Recommended Shape
- Open decisively: do not fine-tune after each beta session.
- Explain why: learner state must be inspectable, reversible, private, and
  evidence-updated.
- Keep the six-step first-line approach: store evidence, retrieve, summarize,
  inject, evaluate, write typed records.
- Use adapters later only for stable behavior: tone, formatting, rubric
  following, classification, domain-specific small models.

## Caveats
Preserve OpenAI fine-tuning caveat as date-sensitive. Preserve retrieval,
summaries, KT updates, typed records, audit logs, and evals as learner-memory
path.

## Plain-English Sentence
LearningAI should remember the learner in data it can inspect and audit, not by
quietly changing model weights after every session.
