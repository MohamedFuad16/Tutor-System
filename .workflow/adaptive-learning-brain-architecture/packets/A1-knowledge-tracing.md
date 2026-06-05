# Packet A1: Knowledge Tracing and Learning Engine

## Objective
Research BKT, DKT, and LLM-KT and recommend a production-ready mastery model
for LearningAI's six behavioral signals.

## Context
LearningAI needs a persistent per-user Brain where the Learning Engine is the
competitive moat. Updates are async and non-blocking.

## Ownership
Research and spec only. No source edits.

## Do
- Compare BKT, DKT variants, and LLM-KT.
- Recommend MVP and production model strategy.
- Design a mastery formula with recency, forgetting, response quality, hints,
  problem-solving, and revision frequency.
- Provide PostgreSQL `knowledge_state` DDL.
- Design a 5-10 question cold-start diagnostic and priors.
- Cite external sources.

## Do Not
- Edit repository files.
- Assume a trained DKT model exists for MVP.
- Ignore interpretability.

## Expected Output
Markdown result saved or returned for synthesis.

## Verification
Deliverables cover all checklist items and include source links for research
claims.
