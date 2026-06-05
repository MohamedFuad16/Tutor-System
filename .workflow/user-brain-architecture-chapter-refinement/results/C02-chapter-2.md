# C02 Chapter 2 Result

## Clarity Score
Before: 7.5/10
After: 9/10

## Audience Notes
This chapter is for contributors who need the mental model before reading
implementation details. The rewrite makes the "one tutor, many helpers" idea
more memorable and separates learner-facing experience from app internals.

## Proposed Replacement Markdown
```markdown
# The Simple Mental Model

Think of LearningAI as one tutor supported by two hidden layers.

| Layer | Plain meaning | What it does |
| --- | --- | --- |
| Foreground tutor | The learner-facing teacher | Talks, listens, explains, pauses, asks checks, and keeps the session feeling coherent. |
| Learner brain | The memory of the learner | Tracks what the learner knows, where they struggle, what changed, and why mastery moved. |
| Background workers | Specialist helpers behind the tutor | Retrieve sources, generate artifacts, grade answers, update books, and propose mastery changes. |

The learner should not feel like they are talking to separate systems. They should feel like one tutor is paying attention.

The key is the shared context package. It keeps the foreground tutor, learner brain, and background workers aligned around the same facts: what the learner is doing, what source they are reading, what they already know, which teaching phase is active, which tool jobs are running, and what should happen next.

This mirrors the public architecture shape described in [Thinking Machines interaction models](https://thinkingmachines.ai/blog/interaction-models/): continuous foreground interaction plus asynchronous background intelligence that shares context. The important difference is that Thinking Machines describes a model-native system, while LearningAI implements an app-native runtime around existing models.

~~~mermaid
flowchart TB
  Learner["Learner"]
  Tutor["Foreground Tutor"]
  Context["Shared Context Package"]
  Background["Async Background Worker Layer"]
  Artifacts["Charts, Images, Code, Sources"]
  Brain["Learner Brain Ledger"]

  Learner --> Tutor
  Tutor <--> Context
  Context <--> Background
  Background --> Artifacts
  Background --> Brain
  Artifacts --> Tutor
  Brain --> Context
~~~

_Figure 1: The learner experiences one attentive tutor, while LearningAI keeps tools, context, artifacts, and memory synchronized behind the scenes._
```

## Caveats To Preserve
- Keep the foreground experience unified.
- Preserve the distinction between learner-facing brain graph and runtime machinery.
- Do not imply LearningAI is model-native in the Thinking Machines sense.
- Keep the shared context package as the bridge between tutor, workers,
  artifacts, and learner memory.

## Plain-English Sentence
LearningAI feels like one tutor because the visible teacher and hidden helpers
all work from the same shared context.
