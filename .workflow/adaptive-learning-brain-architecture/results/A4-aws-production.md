# A4 Result: AWS Production Architecture

Sources cited by agent include AWS PrivateLink, Bedrock VPC endpoints,
Fargate and Lambda pricing, Aurora pgvector, ElastiCache pricing, Pinecone
pricing, S3 prefix policy examples, EventBridge DLQs, ECS network security,
Container Insights, and SQS pricing.

## Accepted Points
- Edge: CloudFront + WAF + Cognito/OIDC, static app on S3, ALB/API Gateway
  WebSocket edge.
- Private compute/data tiers should have no direct internet route; use VPC
  endpoints/PrivateLink for AWS services and Bedrock runtime.
- FastAPI/Brain Manager: ECS Fargate.
- Context Builder: Lambda for small chunks, Fargate for heavy PDF/book context.
- Learning Engine/Brain Updater/Book Generator/WebSocket Handler: Fargate.
- Memory Consolidation: scheduled Fargate, Lambda at small scale.
- Primary data store: Aurora PostgreSQL for tenants, users, books, sessions,
  jobs, audit, and pgvector.
- Neptune Serverless for concept graph once traversal is product-critical.
- Redis/Valkey ElastiCache for hot context, rate limits, presence, and locks.
- Start with pgvector; defer Pinecone until vector QPS/recall/private-networking
  needs justify it.
- Eventing: EventBridge custom bus to SQS queues and per-target DLQs; events
  are metadata-only, never raw PDF text.
- Observability includes ALB/API/ECS/SQS/DLQ/EventBridge/Aurora/Neptune/Redis/
  model/WebSocket/book-job metrics, X-Ray/OpenTelemetry traces, and content
  redaction.
- Directional monthly cost estimate:
  1K MAU $2.2K-$4.2K, 10K MAU $11K-$22K, 100K MAU $90K-$177K, assuming 10
  sessions/user/month, 8 turns/session, pgvector first, Neptune Serverless, no
  Pinecone, no NAT, and mixed model use.

## Integration Notes
- The final roadmap should allow Phase 1 to start without Neptune if traversal
  is not yet necessary, but keep Neptune in the target architecture.
- Bedrock vs direct OpenAI should be a policy/cost decision; Bedrock is cleaner
  for no-internet VPC operation while direct model APIs may win on model/cost.
- Book generation can exceed Lambda comfort; use Fargate/Step Functions.
