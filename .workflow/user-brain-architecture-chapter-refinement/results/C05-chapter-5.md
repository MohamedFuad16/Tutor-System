# C05 Chapter 5 Result

## Clarity Score
Before: 7.4/10
After: 9/10

## Integration Notes
Make the hierarchy clearer: BKT plus logistic KT is the beta core; LLMs extract
and explain; advanced KT stays evaluation-only until LearningAI has enough
evidence.

## Recommended Shape
- Define knowledge tracing as estimating what a learner knows from evidence over
  time.
- Use a table with beta role and why.
- Make LLM roles explicit: map turns to concepts, extract structured evidence,
  explain next teaching move.
- Keep predictor deterministic and reviewable.
- Keep bad updates to reject.

## Caveats
Keep BKT/logistic KT as beta core. Keep confidence as feature/calibration signal,
not direct mastery. Do not imply full evidence ledger is already wired
everywhere. Avoid newest-paper claims unless scan date is explicit.

## Plain-English Sentence
LearningAI should let AI collect and explain the evidence, but let a small
transparent tracing engine decide what the learner actually knows.
