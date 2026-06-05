# Packet A2: Dual-Layer Interaction

## Objective
Design a concrete real-time Interaction Layer plus async Background Layer for
LearningAI's text/voice tutor.

## Context
The system adapts the Thinking Machines interaction model to tutoring, with
shared full context and non-blocking deep work.

## Ownership
Interaction protocol and pedagogy spec only. No source edits.

## Do
- Research and cite the Thinking Machines interaction model.
- Define student states, transitions, detection heuristics, and actions.
- Create 10+ proactive interjection rules.
- Design response format selection.
- Specify four background jobs.
- Specify client/server WebSocket events and context package.
- Map Socratic, scaffolding, spaced repetition, interleaving, and
  metacognitive cues to components.

## Do Not
- Edit repository files.
- Leave dual-layer behavior abstract.

## Expected Output
Markdown result saved or returned for synthesis.

## Verification
Every state/event/job name is concrete and can be mapped into the final
architecture.
