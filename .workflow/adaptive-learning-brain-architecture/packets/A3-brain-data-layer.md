# Packet A3: Brain Data Layer

## Objective
Design the per-user Brain data model across Neptune, PostgreSQL, pgvector, S3,
and the Context Builder.

## Context
Every store is user-owned and user-isolated. Books/artifacts are first-class
outputs.

## Ownership
Data architecture spec only. No source edits.

## Do
- Define Neptune node/edge schemas and five query designs with `user_id` as
  the first filter.
- Provide PostgreSQL DDL for semantic memory, episodic memory, learning
  profiles, books/artifacts, and related state.
- Specify pgvector HNSW indexes and filtering strategy.
- Specify S3 key conventions and lifecycle policies.
- Design Context Builder pseudocode and 128K token budget.
- Specify memory consolidation Lambda.

## Do Not
- Edit repository files.
- Produce schemas without tenant isolation fields.

## Expected Output
Markdown result saved or returned for synthesis.

## Verification
DDL references resolve and each query/schema includes tenant isolation.
