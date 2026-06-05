# P1 Citation And Source-Link Audit

Agent: Hume  
Agent ID: `019e7ec6-eb87-7032-b5fe-35f94ea8e827`  
Status: completed

## Findings

- The book needed inline Markdown citations, not only a source appendix.
- The key interaction-model source is [Thinking Machines interaction models](https://thinkingmachines.ai/blog/interaction-models/).
- OpenAI implementation citations should use official docs for [tools](https://developers.openai.com/api/docs/guides/tools), [function calling](https://developers.openai.com/api/docs/guides/function-calling), [background mode](https://developers.openai.com/api/docs/guides/background), [Realtime](https://developers.openai.com/api/docs/guides/realtime), [Realtime WebRTC](https://developers.openai.com/api/docs/guides/realtime-webrtc), [voice agents](https://developers.openai.com/api/docs/guides/voice-agents), [retrieval](https://developers.openai.com/api/docs/guides/retrieval), [conversation state](https://developers.openai.com/api/docs/guides/conversation-state), [structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), and [evals](https://developers.openai.com/api/docs/guides/evals).
- AWS cloud citations should include [EC2](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/concepts.html), [ECS Fargate](https://docs.aws.amazon.com/AmazonECS/latest/developerguide/AWS_Fargate.html), [Neptune](https://docs.aws.amazon.com/neptune/latest/userguide/graph-get-started.html), [Aurora PostgreSQL with pgvector](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/AuroraPostgreSQL.VectorDB.html), [S3 object keys](https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html), [EventBridge](https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-what-is.html), [SQS](https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/welcome.html), [CloudWatch](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/WhatIsCloudWatch.html), and [PostgreSQL row security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).
- Knowledge tracing needs a clear distinction between [Logistic Knowledge Tracing](https://arxiv.org/abs/2005.00869) and [Language Model-based Knowledge Tracing](https://arxiv.org/abs/2406.02893).

## Accepted Into Book

- Added inline chapter citations for the core claims.
- Added an access-date note for volatile OpenAI/AWS docs.
- Added Logistic KT and AWS compute/eventing/observability citations.

## Rejected Or Avoided

- Avoided relying on `https://developers.openai.com/api/docs/guides/realtime-with-tools`.
- Avoided claiming “LKT is latest/best” without qualification.
