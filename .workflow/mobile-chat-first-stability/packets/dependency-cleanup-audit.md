# Packet: dependency-cleanup-audit

## Objective

Find correctness, performance, cleanup, and deprecated-code issues in the
Graphify-connected Study/chat/provider surface.

## Ownership

- Read-only source/package audit.
- `.workflow/mobile-chat-first-stability/results/dependency-cleanup-audit.md`

## Do

- Report only actionable, source-backed findings.
- Separate dependency-update suggestions from safe local code fixes.
- Prioritize correctness and performance regressions.

## Do Not

- Do not edit source, package files, or lockfiles.
