# A2 Result: Dual-Layer Interaction

Source cited by agent: Thinking Machines interaction model
https://thinkingmachines.ai/blog/interaction-models/ and MDN WebSocket API
https://developer.mozilla.org/en-US/docs/Web/API/WebSocket

## Accepted Points
- Use a real-time Interaction Layer for typing, pauses, PDF selections, voice
  partials, interruption handling, lightweight backchannels, response format
  selection, and live state changes.
- Use an async Background Layer for source-grounded synthesis, misconception
  diagnosis, quiz generation, Brain updates, and recall scheduling.
- Share a versioned context package between layers; Interaction receives live
  deltas, Background receives frozen snapshots plus append-only deltas.
- Student states: `IDLE`, `TYPING`, `THINKING_PAUSE`, `SUBMITTED`,
  `AWAITING`, `CONFUSED`, `STRUGGLING`, `BREAKTHROUGH`.
- Key transitions include pause-to-confusion, submitted-to-awaiting,
  awaiting-to-typing interruption, confused-to-struggling, and
  struggling-to-breakthrough.
- Proactive interjection rules prioritize not interrupting productive work,
  preventing compounding errors, source-grounded help on PDF selections,
  format negotiation for broad questions, misconception repair, and buffering
  background retrieval while the student types.
- Response formats: `text`, `code`, `diagram`, `quiz`, `socratic`,
  `worked_example`, `summary`, `analogy`.
- Background jobs: `source_grounded_answer_job`,
  `misconception_diagnosis_job`, `brain_update_job`,
  `recall_scheduler_job`.
- WebSocket event envelope includes id/type/direction/sessionId/userId/
  timestamp/seq/ack/contextVersion.
- Client events include presence, input deltas/submits, pauses, interrupts,
  PDF selection/viewport, quiz answers, voice partials, and flow control.
- Server events include state changes, backchannels, response start/delta/
  patch/done, background job progress, Brain update queued/done, and
  recoverable errors.

## Integration Notes
- Rename background jobs to match final AWS pipeline where needed:
  `brain_update_job` maps to `brain-update-queue` and
  `brain-update-processor`.
- Expand the proactive table to at least 10 rows in final doc and add priority,
  trigger condition, action, and example message.
- Align state/event names with final `episodic_memory.event_type` values.
