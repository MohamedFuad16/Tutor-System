# P4 Learning Models And Knowledge Tracing

Agent: Lagrange  
Agent ID: `019e7ec6-ee30-7290-b96b-3413cd4a8e00`  
Status: completed

## Findings

LearningAI should not choose one “latest” KT model as the product brain. It should layer an auditable production model with semantic research upgrades.

Recommended path:

- V1: BKT + Logistic KT + evidence ledger.
- V2: LLM Analyst extracts structured learner evidence; deterministic KT Predictor updates mastery.
- V3: graph/RAG KT brain over Neptune, Postgres, pgvector, and S3 after LearningAI has its own eval set.

## Model Comparison

| Model | Fit |
| --- | --- |
| BKT | Best auditable v1 core; already aligns with local code. |
| Logistic KT | Best beta upgrade because it is interpretable and can include timing, hints, spacing, difficulty, confidence, and attempt type. |
| DKT | Useful benchmark, but less transparent as source of truth. |
| Language-model KT | Good cold-start layer for uploaded books and new concepts. |
| LLM-KT / CIKT | Useful architecture patterns for analyst/predictor workflows. |
| RAG-KT / L-HAKT | Strong research direction for cloud-scale persistent brain, not first beta core. |

## Accepted Into Book

- Clarified that “LKT” can mean Logistic KT or Language-model-based KT.
- Added Logistic KT citation.
- Recommended BKT plus logistic features for beta, then semantic LLM/graph/RAG extensions after evaluation.
