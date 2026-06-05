# P1 Cognitive Modeling Fit Result

## Summary
LearningAI is strongest when it behaves like a cognitive tutor with an LLM
interface, not like a chatbot with memory. The user brain should predict, test,
schedule, and revise learner hypotheses from delayed evidence.

## Accepted Strengths
- The user brain as evidence ledger is cognitively sound.
- BKT/logistic KT, misconceptions, confidence, transfer tasks, and asynchronous
  tutor/background work fit the intelligent tutoring tradition better than
  continuous fine-tuning.
- Existing implementation skeleton includes BKT updates, learner snapshots,
  misconception records, scaffold levels, and cognitive-load heuristics.
- Thinking Machines is a valid runtime-pattern analogy only: foreground
  interaction plus asynchronous background intelligence.

## Gaps And Overclaims
- Mastery updates need delayed evidence; one correct answer, fluent chat, or a
  generated summary should not increase durable mastery alone.
- Confidence requires calibration. High confidence plus later failure should
  create an illusion-of-knowing flag.
- Misconceptions need lifecycle states: elicited belief, evidence,
  contradiction/counterexample, repair explanation, retest, delayed retest.
- Recall, comprehension, near transfer, and far transfer must be tracked
  separately.
- Cognitive load should drive adaptive control, scaffold fading, worked examples,
  and chunking.

## Recommended Refinements
1. Add an EvidenceEvent schema with task type, concept ID, response,
   correctness, confidence before/after, latency, hint level, source span,
   feedback, retry result, and delayed retest result.
2. Make Revision mode retrieval-first: ask before showing notes, then reveal,
   then schedule delayed retest.
3. Add spaced scheduling per concept and misconception.
4. Split mastery into recall_mastery, explanation_mastery, procedure_mastery,
   near_transfer_mastery, far_transfer_mastery, and calibration_score.
5. Treat language-model KT as semantic cold-start support, with BKT/logistic KT
   as beta source of truth.

## Sources
- Thinking Machines interaction models: https://thinkingmachines.ai/blog/interaction-models/
- Corbett and Anderson, Knowledge Tracing: https://doi.org/10.1007/bf01099821
- Anderson, Corbett, Koedinger and Pelletier, Cognitive Tutors: https://doi.org/10.1207/s15327809jls0402_2
- Logistic Knowledge Tracing: https://arxiv.org/abs/2005.00869
- Language Model Can Do Knowledge Tracing: https://arxiv.org/abs/2406.02893
- Dunlosky et al. 2013: https://doi.org/10.1177/1529100612453266
- Roediger and Karpicke 2006: https://doi.org/10.1111/j.1467-9280.2006.01693.x
- Cepeda et al. 2006: https://doi.org/10.1037/0033-2909.132.3.354
- Sweller 1988: https://doi.org/10.1016/0364-0213(88)90023-7
- Posner et al. 1982: https://doi.org/10.1002/sce.3730660207
- Aleven et al. 2006: https://doi.org/10.3233/IRG-2006-16(2)02

## Debate Position
Graphs, summaries, confidence, and conversation history are useful signals, but
retrieval and transfer evidence should sit on the throne.
