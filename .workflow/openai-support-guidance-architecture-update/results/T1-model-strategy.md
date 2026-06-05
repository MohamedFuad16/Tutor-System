# Team 1 Result: OpenAI Model Strategy, Fine-Tuning, RAG, Evals

## Accepted
- Treat OpenAI as a layered tutoring intelligence stack, not one continually
  fine-tuned tutor.
- Use Responses API as the target reference path for tutor turns, tools,
  structured outputs, and migration planning.
- Use RAG/file search/vector stores and local retrieval for book knowledge,
  source grounding, learner memory, and prior summaries.
- Use structured outputs for graph updates, flashcards, learning-book updates,
  misconceptions, learner-state deltas, and eval traces.
- Use Evals/graders before any model migration, fine-tuning, or prompt
  optimization decision.
- Use Batch for offline evals, embeddings, summarization, and dataset labeling.
- Do not continuously fine-tune from beta interactions.
- Fine-tuning is only a later option for stable style/framework/format
  behavior after evals prove prompt/RAG/schema approaches are insufficient.

## Key URLs
- https://developers.openai.com/api/docs/guides/model-selection
- https://developers.openai.com/api/docs/guides/latest-model
- https://developers.openai.com/api/docs/models
- https://developers.openai.com/api/docs/guides/model-optimization
- https://developers.openai.com/api/docs/guides/supervised-fine-tuning
- https://developers.openai.com/api/docs/guides/retrieval
- https://developers.openai.com/api/docs/guides/tools-file-search
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/guides/evals
- https://developers.openai.com/api/docs/guides/graders
- https://developers.openai.com/api/docs/guides/conversation-state
- https://developers.openai.com/api/docs/guides/prompt-engineering
- https://developers.openai.com/api/docs/guides/prompt-caching

## Integration Notes
- Public docs are volatile; re-check model names, fine-tuning availability, and
  pricing before implementation.
- Support emails align with public docs on RAG/context before fine-tuning, but
  support emails are not public citations.
