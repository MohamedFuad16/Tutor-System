# P2 Interaction And Background-Agent Architecture

Agent: Meitner  
Agent ID: `019e7ec6-ec1c-7980-a207-480f2e7d6ccc`  
Status: completed

## Findings

LearningAI should implement the interaction-model strategy as a runtime architecture rather than a new trained native interaction model.

The practical split is:

- foreground tutor: stays present, listens, speaks, pauses, teaches, interrupts, and shows artifacts;
- background workers: retrieve, call tools, generate charts/code/images/web snippets, evaluate answers, update memory, and update KT state;
- shared context package: learner state, source context, teaching phase, interaction timing, and tool jobs.

## Current App Fit

- `src/lib/interactionModel.ts` already tracks coarse interaction modes.
- `src/components/ChatPanel.tsx` injects Interaction Model Context into chat requests.
- Existing chat/server tooling can stream status/tool events and memory updates.

## Accepted Into Book

- Reframed the caveat as: “LearningAI should not train a native interaction model now. Instead, it should implement the same architecture pattern at runtime.”
- Added chapters for continuous tutor loop, teaching/evaluation states, tool-using background agent, and voice timing.
- Tied Thinking Machines’ foreground/background split to LearningAI’s tutor + worker architecture.
