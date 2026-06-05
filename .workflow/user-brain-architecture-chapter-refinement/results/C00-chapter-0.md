# C00 Chapter 0 Result

## Clarity Score
Before: 8/10
After: 9/10

## Audience Notes
The chapter is already strong for technical readers, but it can be warmer and
easier for product, design, or learning-science collaborators to enter. The main
improvement is to say the system shape plainly before naming inspirations,
contracts, and consensus.

## Proposed Replacement Markdown
```markdown
# What We Are Building

We are building a tutor that feels simple to the learner, even though a lot of intelligence is working behind the scenes.

The learner should experience one calm tutor that knows what they are reading, what concept they are working on, what page or source matters, and what kind of help is useful right now.

Behind that tutor, the system runs slower background work: retrieving sources, using tools, making study artifacts, checking understanding, and updating the learner's long-term learning brain.

The important rule is that durable memory changes must be earned. A mastery score should change because the system found evidence, checked sources, and passed typed contracts, not because a model merely had a confident impression.

This architecture is inspired by the Thinking Machines interaction-model strategy as a product pattern, OpenAI guidance for models, tools, and retrieval, and knowledge-tracing research for learner-state design.

We are not training a custom foundation model. We are building an app-native learning runtime: a fast foreground tutor, careful background intelligence, shared state, and continuous teaching context.

## Five-Agent Consensus

The tighter strategy is:

- give the learner one calm foreground tutor;
- run retrieval, tool use, artifact generation, evaluation, and memory updates in background lanes;
- let soft signals adjust the teaching style quickly;
- let only validated evidence update durable mastery;
- use typed contracts, event IDs, job states, source checks, and audit rows so the system can be trusted, debugged, and improved.
```

## Caveats To Preserve
Keep the distinction between user-facing learner brain and technical
architecture. Preserve that Thinking Machines is an analogy, not a literal
model-training plan. Keep the rule that durable learner-state updates require
evidence, source checks, and typed contracts.

## Plain-English Sentence
We are building one calm tutor for the learner, powered by careful background
systems that only update long-term understanding when there is real evidence.
