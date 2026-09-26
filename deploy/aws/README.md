# Deploying Tutor on AWS

One command in AWS CloudShell deploys Tutor v2 into your own AWS account. The
result is a production-hardened single-node host. It needs no local tools and
no AWS keys on your laptop, and the API keys never touch the repository.

```text
                     learners (browser: HTTPS + WSS voice)
                                   │
                         Elastic IP  :443 / :80
┌──────────────────────── VPC 10.42.0.0/16 · public subnet ────────────────────────┐
│  Security group: 80, 443/tcp, 443/udp in; no SSH (Session Manager only)          │
│  ┌──────────── EC2 t4g.small · Ubuntu 24.04 arm64 · IMDSv2 ─────────────────┐    │
│  │  Caddy 2.11 ── automatic TLS (Let's Encrypt), HTTP/3, HSTS               │    │
│  │     │ reverse_proxy (WebSocket + streaming passthrough)                  │    │
│  │  tutor container (non-root, no capabilities) :3000                       │    │
│  │     ├─ /data → EBS gp3 data volume (SQLite, PDFs)  ── DLM daily snapshots│    │
│  │     ├─ env ← SSM Parameter Store /tutor/<stack>/* (SecureString)         │    │
│  │     └─ logs → CloudWatch Logs /tutor/<stack> (30-day retention)          │    │
│  └──────────────────────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────────────────────┘
        outbound: Z.AI GLM (HTTPS) · Deepgram STT/TTS (WSS) · Wikipedia/Commons
```

## Why this shape

Tutor is a stateful Node service. It keeps SQLite and uploaded PDFs on local
disk and holds live voice sessions over WebSockets. It also keeps its
per-process state (voice tickets, rate limits, model queues) in memory. That
calls for one long-running instance with a durable disk. More instances would
need the phase-2 changes described below.

| Choice                              | Why                                                                                                  | Trade-off                                                                                    |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| EC2 + Caddy (no ALB, no CloudFront) | About $20/month. End-to-end TLS. No idle timeouts on voice sockets                                   | No WAF or CDN. Add ALB/CloudFront when traffic justifies it (phase 1b)                       |
| Graviton `t4g`                      | About 20% cheaper than x86. Free Tier eligible (`t4g.small`) for new accounts                        | Burstable: long builds spend CPU credits (unlimited mode bills any surplus, usually cents)   |
| Separate data EBS volume            | The instance is disposable and learner data is not. Daily snapshots, plus a final snapshot on delete | You restore by hand (see the restore section below)                                          |
| SSM Parameter Store                 | Free, KMS-encrypted, IAM path-scoped to this stack                                                   | No automatic rotation (use `deploy.sh secrets`)                                              |
| Build on the host from Git          | No registry or CI to set up. Rollback is instant (the previous image is kept)                        | About 5–10 minutes per release on `t4g.small`. Phase 1b moves builds to GitHub Actions → ECR |
| `<ip>.sslip.io` by default          | A real certificate within minutes of launch, before you own a domain                                 | Use `--domain` for a branded URL                                                             |

## Before you start

- An AWS account. New accounts get $100–200 in Free Tier credits, and
  `t4g.small` is free-plan eligible.
- A **Z.AI pay-as-you-go** API key. GLM Coding Plan keys are for supported
  coding tools and one user, so they are not for a site other people use.
- Optionally, a **Deepgram** key for server-side voice. Without it, voice uses
  the browser's speech engine.

## Deploy (about 15 minutes, mostly waiting)

1. In the AWS console, pick the Region nearest your learners (for Japan:
   **Asia Pacific (Tokyo) ap-northeast-1**). Then open **CloudShell** (the
   `>_` icon in the top bar).
2. Clone the repository:

   ```bash
   git clone https://github.com/MohamedFuad16/Tutor-System.git && cd Tutor-System
   git checkout claude/zealous-galileo-fmhpib   # until v2 is merged into main
   ```

3. Deploy. Add `--email` to get budget alerts at 80% and at the forecast 100%
   of $30/month:

   ```bash
   ./deploy/aws/deploy.sh up --email you@example.com
   ```

   You will be asked for the Z.AI key, the endpoint, the Deepgram key and an
   access code (press Enter to generate one). Typed keys are hidden and are
   stored straight into SSM Parameter Store.

4. When it prints `Tutor is live: https://…sslip.io`, open the URL and enter
   the access code. Share both with your testers.

If CloudShell times out while you wait, nothing is lost. The stack keeps
building. Run `./deploy/aws/deploy.sh status` later.

## Operating it

| Task                            | Command                                                                                                                                 |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Ship new code                   | `deploy.sh release` (the stack's branch) or `deploy.sh release <branch/tag/sha>`                                                        |
| Roll back                       | `deploy.sh release <previous sha>`. It is instant when that image is still on the host, and a failed health check rolls back on its own |
| Rotate keys or the access code  | `deploy.sh secrets`. Changes apply immediately without a rebuild                                                                        |
| Change any server setting       | `deploy.sh set USER_REQUESTS_PER_MINUTE` (any name from `.env.example`)                                                                 |
| Follow logs                     | `deploy.sh logs` (app stream; `--since 2h` etc. are passed through)                                                                     |
| Health and settings at a glance | `deploy.sh status`                                                                                                                      |
| First-boot log                  | `deploy.sh bootlog`                                                                                                                     |
| Root shell (no SSH, audited)    | `deploy.sh shell`                                                                                                                       |
| Custom domain                   | `deploy.sh up --domain tutor.example.com`, point an A record at the Elastic IP, then `deploy.sh apply`                                  |
| Bigger instance                 | `deploy.sh up --size t4g.medium` (a stop/start, about 1 minute)                                                                         |
| More disk                       | `deploy.sh up --disk 50`, then over `deploy.sh shell`: `resize2fs /dev/disk/by-label/tutor-data`                                        |
| Tear down                       | `deploy.sh down` (keeps a final snapshot of the data volume and asks before deleting the keys)                                          |

Use `STACK=tutor-staging ./deploy/aws/deploy.sh up --ref <branch>` to run a
second, fully isolated stack (for example, staging).

### Restoring learner data

Snapshots run every day at 18:00 UTC (03:00 JST) and the last 7 are kept.
Deleting the stack leaves a final snapshot.

1. EC2 console → Snapshots: create a volume from the snapshot, in the stack's
   Availability Zone.
2. Over `deploy.sh shell`:
   - `docker compose -p tutor -f /opt/tutor/src/deploy/aws/compose.yml down`
   - `umount /srv/tutor-data`
3. Detach the current data volume and attach the restored one as `/dev/sdf`.
4. Run `mount /srv/tutor-data` (the filesystem label is preserved), then
   `deploy.sh apply`.

## Security posture

- **Network:** only 80 (redirect), 443/tcp and 443/udp are open. There is no
  SSH port. Shell access goes through Session Manager, which is IAM-authorized
  and logged in CloudTrail.
- **Instance role (least privilege):** Session Manager core, read access to
  `/tutor/<stack>/*` only, and writes to its own log group only. IMDSv2 is
  required with hop limit 1, so containers cannot reach the role credentials.
- **Secrets:**
  - They are SecureString parameters encrypted with KMS.
  - They are rendered to a root-only env file at release time.
  - They are never in the template, the repository, stack parameters or shell
    history.
- **Containers:** the app runs as a non-root user, with every Linux capability
  dropped and `no-new-privileges`.
- **Patching:** Ubuntu unattended security upgrades are on. Docker runs with
  `live-restore`, so daemon upgrades don't restart the app.
- **Encryption at rest:** the root and data volumes are EBS-encrypted.
- **Transport:** TLS 1.2+/1.3 from Caddy, with HSTS.
- **App-level:** the `ACCESS_CODE` gate, per-user rate limits (`USER_REQUESTS_PER_MINUTE`)
  and origin checks on the voice socket.

## Cost (on-demand, approximate)

| Item                                        | Tokyo (ap-northeast-1) | N. Virginia (us-east-1) |
| ------------------------------------------- | ---------------------- | ----------------------- |
| EC2 `t4g.small` (24×7)                      | ~$15.8                 | ~$12.3                  |
| EBS gp3: 20 GiB root + 20 GiB data          | ~$3.8                  | ~$3.2                   |
| Public IPv4 (Elastic IP)                    | ~$3.6                  | ~$3.6                   |
| Snapshots, CloudWatch Logs, SSM             | < $1                   | < $1                    |
| Data transfer out (first 100 GB/month free) | usually $0             | usually $0              |
| **Total**                                   | **~$23/month**         | **~$19/month**          |

New accounts' Free Tier credits cover this for months. A 1-year Compute Savings
Plan cuts the EC2 line by about 30–40%. Model, speech-to-text and text-to-speech
usage (Z.AI, Deepgram) usually outweighs the hosting bill: watch those
dashboards too.

## Limits and the path to scale

One `t4g.small` comfortably serves a class-sized cohort: dozens of
simultaneous learners and a handful of live voice sessions. Voice is mostly
I/O. What runs out first is model and speech quota, then the CPU during
releases.

- **Phase 1b (same app code).**
  - Move builds to GitHub Actions (OIDC → ECR, arm64). Releases then just pull
    an image.
  - Put CloudFront and AWS WAF in front for caching, rate-based rules and
    DDoS absorption.
  - Or move up to `t4g.medium` or `t4g.large`.
- **Phase 2 (horizontal).** This is ECS Fargate behind an ALB, and it needs the
  code changes in [docs/ARCHITECTURE.md §8](../../docs/ARCHITECTURE.md):
  - SQLite → RDS Postgres
  - PDFs → S3
  - Events → ElastiCache Redis
  - Queues → SQS
  - In-memory voice tickets → signed tickets or Redis, because the ticket
    request and the WebSocket can land on different tasks.

## Troubleshooting

- **The site never comes up.** Run `deploy.sh bootlog`. The first boot
  installs Docker, clones the repo and builds, which takes 10–15 minutes.
  If the build is killed for memory, use `--size t4g.medium`.
- **Certificate errors on a custom domain.** The A record must resolve to the
  Elastic IP, and port 80 must be reachable. Caddy retries on its own; then
  run `deploy.sh apply`.
- **Answers come from the mock model.** `ZAI_API_KEY` is missing or wrong.
  Fix it with `deploy.sh secrets`.
- **`CREATE_FAILED` or `ROLLBACK_COMPLETE`.** Check the stack's Events tab in
  the CloudFormation console, run `deploy.sh down`, then run `up` again. The
  usual cause is Free-plan instance limits or capacity in the chosen zone.
