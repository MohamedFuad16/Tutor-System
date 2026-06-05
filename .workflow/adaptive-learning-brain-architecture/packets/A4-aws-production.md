# Packet A4: AWS Production Architecture

## Objective
Refine the AWS production architecture from a single EC2 sketch to a secure,
observable, multi-tenant path from 1K to 100K active users.

## Context
Prefer managed AWS services for MVP. Compute/data tiers should avoid direct
internet access. Multi-user isolation is mandatory.

## Ownership
Infrastructure spec only. No source edits.

## Do
- Create ASCII architecture diagram.
- Classify services as ECS Fargate, Lambda, or EC2 with rationale.
- Compare pgvector and Pinecone.
- Design async Brain Updater pipeline, DLQs, and EventBridge schedules.
- Specify VPC topology, IAM roles, encryption, API Gateway/WAF, and isolation.
- Specify observability metrics, traces, and alarms.
- Estimate monthly costs at 1K, 10K, and 100K active users with assumptions.
- Provide Terraform module checklist.

## Do Not
- Edit repository files.
- Present exact costs without assumptions and date.

## Expected Output
Markdown result saved or returned for synthesis.

## Verification
Architecture covers all background jobs and has a scaling path to 100K users.
